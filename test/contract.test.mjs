/**
 * Contract tests: these assert the SDK speaks the backend's actual wire format.
 *
 * The existing suite mocks responses generically, so it happily passes against
 * a completely different API. Every assertion below encodes a field name,
 * enumeration value or transport behaviour taken from the Spring DTOs.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RestorinoClient, calculateCart, checkAllergensConflict } from '../dist/index.js';

const RESTAURANT_UUID = '9b2f5f2a-1c3d-4e5f-8a9b-0c1d2e3f4a5b';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function newClient(overrides = {}) {
  return new RestorinoClient({
    baseUrl: 'https://api.restorino.com',
    restaurantId: RESTAURANT_UUID,
    storageType: 'memory',
    ...overrides
  });
}

function captureFetch(payload = {}) {
  const calls = [];
  const original = globalThis.fetch;

  globalThis.fetch = async (url, options = {}) => {
    let parsedBody;
    if (typeof options.body === 'string') {
      try {
        parsedBody = JSON.parse(options.body);
      } catch {
        parsedBody = options.body;
      }
    }
    calls.push({ url: String(url), options, body: parsedBody });
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => payload
    };
  };

  return { calls, restore: () => { globalThis.fetch = original; } };
}

// ─── Orders ──────────────────────────────────────────────────────────────────

test('Contract: placeOrder sends deliveryMethod (not orderType) and totalPrice per item', async () => {
  const client = newClient();
  const { calls, restore } = captureFetch({ id: 'order-1', status: 'PENDING' });

  try {
    await client.orders.placeOrder({
      customerName: 'Ada Lovelace',
      customerEmail: 'ada@example.com',
      customerPhone: '0600000000',
      deliveryMethod: 'delivery',
      paymentMethod: 'cash',
      customerLocation: { latitude: 48.8566, longitude: 2.3522, address: '1 rue de Paris' },
      items: [
        { productId: 'p1', productName: 'Pizza', quantity: 2, unitPrice: 10, totalPrice: 20 }
      ]
    });

    const body = calls[0].body;
    assert.equal(body.deliveryMethod, 'delivery');
    assert.equal(body.orderType, undefined, 'orderType is not a backend field');
    assert.equal(body.paymentMethod, 'cash');
    assert.equal(body.items[0].totalPrice, 20, 'totalPrice is @NotNull server-side');
    assert.ok(calls[0].options.headers['Idempotency-Key'], 'order creation must be idempotent');
  } finally {
    restore();
  }
});

test('Contract: estimateDelivery sends address/latitude/longitude and rejects a short address', async () => {
  const client = newClient();
  const { calls, restore } = captureFetch({ estimatedDeliveryMinutes: 30, deliveryFee: 3, withinDeliveryZone: true });

  try {
    await client.orders.estimateDelivery({
      latitude: 48.8566,
      longitude: 2.3522,
      address: '1 rue de Paris, 75001'
    });

    assert.equal(calls[0].body.address, '1 rue de Paris, 75001');
    assert.equal(calls[0].body.street, undefined);

    await assert.rejects(
      async () => client.orders.estimateDelivery({ latitude: 1, longitude: 2, address: 'short' }),
      (err) => err.error === 'MISSING_ADDRESS'
    );
  } finally {
    restore();
  }
});

test('Contract: createReservation sends numberOfGuests and an ISO reservationDate', async () => {
  const client = newClient();
  const { calls, restore } = captureFetch({ id: 'r1', reservationNumber: 'R-1' });

  try {
    await client.orders.createReservation({
      customerName: 'Ada Lovelace',
      customerEmail: 'ada@example.com',
      customerPhone: '0600000000',
      numberOfGuests: 4,
      reservationDate: '2026-12-24T20:30:00',
      customerLatitude: 48.8566,
      customerLongitude: 2.3522
    });

    const body = calls[0].body;
    assert.equal(body.numberOfGuests, 4);
    assert.equal(body.partySize, undefined, 'partySize was rejected by the backend');
    assert.equal(body.reservationTime, undefined);
    assert.equal(body.reservationDate, '2026-12-24T20:30:00');
  } finally {
    restore();
  }
});

test('Contract: watchOrder stops on COMPLETED (a terminal state the old union omitted)', async () => {
  const client = newClient();
  const { restore, calls } = captureFetch({
    orderId: 'o1',
    orderNumber: 'O-1',
    status: 'COMPLETED',
    canBeCancelled: false
  });

  try {
    let received = 0;
    const stop = client.orders.watchOrder(
      'o1',
      { customerEmail: 'ada@example.com', customerPhone: '0600000000' },
      () => { received++; },
      { intervalMs: 20 }
    );

    await sleep(120);
    stop();

    assert.equal(received, 1, 'COMPLETED must terminate polling');
    assert.equal(calls.length, 1);
  } finally {
    restore();
  }
});

// ─── Delivery ────────────────────────────────────────────────────────────────

test('Contract: watchDelivery reads deliveryStatus and stops on DELIVERED', async () => {
  const client = newClient();
  const { restore, calls } = captureFetch({
    trackingNumber: 'T-1',
    orderNumber: 'O-1',
    deliveryStatus: 'DELIVERED',
    restaurantName: 'Bella Vita'
  });

  try {
    let seen = null;
    const stop = client.delivery.watchDelivery('T-1', (d) => { seen = d.deliveryStatus; }, { intervalMs: 20 });

    await sleep(120);
    stop();

    assert.equal(seen, 'DELIVERED');
    assert.equal(calls.length, 1, 'terminal status must stop the 4s polling loop');
  } finally {
    restore();
  }
});

// ─── Vitrine ─────────────────────────────────────────────────────────────────

test('Contract: checkDeliveryZone uses latitude/longitude query params', async () => {
  const client = newClient();
  const { calls, restore } = captureFetch({ canDeliver: true, deliveryFee: 0 });

  try {
    await client.vitrine.checkDeliveryZone(48.8566, 2.3522);
    const url = calls[0].url;
    assert.ok(url.includes('latitude=48.8566'), `expected latitude param, got ${url}`);
    assert.ok(url.includes('longitude=2.3522'), `expected longitude param, got ${url}`);
    assert.ok(!url.includes('lat=') && !url.includes('lng='), 'lat/lng caused a 400');
  } finally {
    restore();
  }
});

test('Contract: getReviews returns the bespoke reviews object, not a Page', async () => {
  const client = newClient();
  const { restore } = captureFetch({
    restaurantId: RESTAURANT_UUID,
    totalReviews: 2,
    averageRating: 4.5,
    reviews: [{ id: '1', overallRating: 5, reviewText: 'Top' }],
    totalPages: 1,
    currentPage: 0
  });

  try {
    const res = await client.vitrine.getReviews();
    assert.ok(Array.isArray(res.reviews));
    assert.equal(res.totalReviews, 2);
    assert.equal(res.content, undefined, 'this endpoint does not return a Spring Page');
  } finally {
    restore();
  }
});

test('Contract: resolveCustomDomain translates 404 into { found: false }', async () => {
  const client = newClient();
  const original = globalThis.fetch;

  globalThis.fetch = async () => ({
    ok: false,
    status: 404,
    statusText: 'Not Found',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({ found: false, message: 'Unknown domain' })
  });

  try {
    const res = await client.vitrine.resolveCustomDomain('unknown.example');
    assert.equal(res.found, false);
  } finally {
    globalThis.fetch = original;
  }
});

test('Contract: search sends searchTerm/cuisineType, not query/cuisine', async () => {
  const client = newClient();
  const { calls, restore } = captureFetch({ content: [], totalElements: 0 });

  try {
    await client.vitrine.search({ searchTerm: 'pizza', cuisineType: 'Italien' });
    assert.equal(calls[0].body.searchTerm, 'pizza');
    assert.equal(calls[0].body.cuisineType, 'Italien');
    assert.equal(calls[0].body.query, undefined);
  } finally {
    restore();
  }
});

// ─── Customer ────────────────────────────────────────────────────────────────

test('Contract: submitTestimonial sends content (the backend field), not comment', async () => {
  const client = newClient();
  const { calls, restore } = captureFetch({ id: 't1', content: 'Excellent repas, service impeccable' });

  try {
    await client.customer.submitTestimonial({ rating: 5, content: 'Excellent repas, service impeccable' });
    assert.equal(calls[0].body.content, 'Excellent repas, service impeccable');
    assert.equal(calls[0].body.comment, undefined);
  } finally {
    restore();
  }
});

// ─── Transport ───────────────────────────────────────────────────────────────

test('Transport: defaults to cookie credentials so HttpOnly auth can work', async () => {
  const client = newClient();
  const { calls, restore } = captureFetch({});

  try {
    await client.vitrine.getPopular();
    assert.equal(calls[0].options.credentials, 'include');
  } finally {
    restore();
  }
});

test('Transport: sends X-XSRF-TOKEN on mutations only, read from the XSRF-TOKEN cookie', async () => {
  const client = newClient();
  const { calls, restore } = captureFetch({ valid: true });

  globalThis.document = { cookie: 'XSRF-TOKEN=csrf-token-abc' };

  try {
    await client.customer.validatePromoCode('SUMMER20', 40);
    assert.equal(calls[0].options.headers['X-XSRF-TOKEN'], 'csrf-token-abc');

    await client.vitrine.getPopular();
    assert.equal(calls[1].options.headers['X-XSRF-TOKEN'], undefined, 'GET must not carry CSRF');
  } finally {
    restore();
    delete globalThis.document;
  }
});

test('Transport: setToken preserves an existing refresh token', () => {
  const client = newClient();
  client.http.setAuthTokens('access-1', 'refresh-1');
  client.http.setToken('access-2');

  assert.equal(client.http.getToken(), 'access-2');
  assert.equal(client.http.getRefreshToken(), 'refresh-1');
});

test('Transport: non-UUID restaurantId is routed to x-tenant-slug', async () => {
  const client = newClient({ restaurantId: 'bella-vita', tenantId: undefined });
  const { calls, restore } = captureFetch({});

  try {
    await client.vitrine.getPopular();
    assert.equal(calls[0].options.headers['x-tenant-slug'], 'bella-vita');
    assert.equal(calls[0].options.headers['x-restaurant-id'], undefined);
  } finally {
    restore();
  }
});

test('Transport: switching tenant clears the previous session tokens', () => {
  const client = newClient();
  client.http.setAuthTokens('access-1', 'refresh-1');

  client.configure({ restaurantId: '11111111-1111-4111-8111-111111111111' });

  assert.equal(client.http.getToken(), null);
  assert.equal(client.http.getRefreshToken(), null);
});

test('Transport: application/ld+json is parsed as JSON', async () => {
  const client = newClient();
  const original = globalThis.fetch;

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/ld+json; charset=utf-8' }),
    json: async () => ({ '@context': 'https://schema.org' })
  });

  try {
    const schema = await client.vitrine.getSchemaOrg();
    assert.equal(schema['@context'], 'https://schema.org');
  } finally {
    globalThis.fetch = original;
  }
});

// ─── Live agent ──────────────────────────────────────────────────────────────

test('Contract: liveAgent mints a session grant before opening the socket', async () => {
  const client = newClient();
  const originalWs = globalThis.WebSocket;
  let createdUrl = null;

  class MockWebSocket {
    constructor(url) {
      createdUrl = url;
      this.readyState = 1;
    }
    send() {}
    close() {}
  }

  globalThis.WebSocket = MockWebSocket;
  const { calls, restore } = captureFetch({ grant: 'grant-xyz' });

  try {
    const session = client.liveAgent.connect({ restaurantSlug: 'bella-vita' });
    assert.ok(session);

    await sleep(50);

    assert.ok(
      calls[0].url.endsWith('/api/public/live-agent/bella-vita/session'),
      `expected grant endpoint, got ${calls[0].url}`
    );
    assert.equal(calls[0].options.method, 'POST');
    assert.ok(createdUrl.includes('grant=grant-xyz'), `grant missing from ${createdUrl}`);
    assert.ok(createdUrl.includes('restaurantSlug=bella-vita'));
  } finally {
    restore();
    globalThis.WebSocket = originalWs;
  }
});

// ─── Cart ────────────────────────────────────────────────────────────────────

test('Contract: a 200 answer with { success: false } is not treated as a refresh', async () => {
  const client = newClient();
  client.http.setAuthTokens('access-1', 'refresh-1');

  const original = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({ success: false, message: 'session not renewable' })
  });

  try {
    const refreshed = await client.http.tryRefreshToken();
    assert.equal(refreshed, false, 'success:false must not count as renewed');
  } finally {
    globalThis.fetch = original;
  }
});

test('Contract: calculateCart matches the server formula (tax, delivery, total)', () => {
  const result = calculateCart(
    [{ productId: 'p1', productName: 'Pizza', quantity: 2, unitPrice: 10, totalPrice: 20 }],
    { taxRate: 10, deliveryFee: 3, minimumOrderAmount: 25 }
  );

  assert.equal(result.subtotal, 20);
  assert.equal(result.tax, 2);
  assert.equal(result.deliveryFee, 3);
  assert.equal(result.total, 25);
  assert.equal(result.meetsMinimumOrder, false);
});

test('Contract: calculateCart includes item extras via totalPrice and waives delivery above threshold', () => {
  const result = calculateCart(
    [{ productId: 'p1', productName: 'Pizza', quantity: 1, unitPrice: 10, totalPrice: 14 }],
    { deliveryFee: 5, freeDeliveryThreshold: 10 }
  );

  assert.equal(result.subtotal, 14, 'extras must count toward the subtotal');
  assert.equal(result.deliveryFee, 0);
});

test('Contract: checkAllergensConflict accepts the backend String allergenInfo', () => {
  const result = checkAllergensConflict('gluten, lait, oeuf', ['Lait']);
  assert.equal(result.hasConflict, true);
  assert.deepEqual(result.conflictingAllergens, ['lait']);
});
