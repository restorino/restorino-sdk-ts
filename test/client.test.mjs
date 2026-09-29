import test from 'node:test';
import assert from 'node:assert/strict';
import { RestorinoClient, RestorinoApiError, HttpClient } from '../dist/index.js';

test('RestorinoClient: initializes with all 8 modules and HTTP client', () => {
  const client = new RestorinoClient({
    baseUrl: 'https://api.restorino.com',
    restaurantId: 'rest-uuid-123',
    tenantId: 'tenant-uuid-456',
    apiKey: 'sk-storefront-789',
    storageType: 'memory'
  });

  assert.ok(client.http instanceof HttpClient);
  assert.ok(client.auth);
  assert.ok(client.customer);
  assert.ok(client.loyalty);
  assert.ok(client.vitrine);
  assert.ok(client.orders);
  assert.ok(client.delivery);
  assert.ok(client.tables);
  assert.ok(client.tv);
  assert.equal(client.http.getConfig().baseUrl, 'https://api.restorino.com');
  assert.equal(client.http.getConfig().restaurantId, 'rest-uuid-123');
  assert.equal(client.http.getConfig().tenantId, 'tenant-uuid-456');
  assert.equal(client.http.getConfig().apiKey, 'sk-storefront-789');
});

test('HttpClient: manages token in memory storage', () => {
  const http = new HttpClient({
    baseUrl: 'https://api.restorino.com',
    storageType: 'memory'
  });

  assert.equal(http.getToken(), null);
  http.setToken('sample-jwt-token');
  assert.equal(http.getToken(), 'sample-jwt-token');
  http.clearToken();
  assert.equal(http.getToken(), null);
});

test('HttpClient: manages token in localStorage (browser persistence & reload)', () => {
  const store = {};
  const mockLocalStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; }
  };
  globalThis.window = {};
  globalThis.localStorage = mockLocalStorage;

  try {
    const http = new HttpClient({
      baseUrl: 'https://api.restorino.com',
      storageType: 'localStorage',
      tokenStorageKey: 'test_token_key'
    });

    assert.equal(http.getToken(), null);
    http.setToken('persisted-jwt-token');
    assert.equal(store['test_token_key'], 'persisted-jwt-token');
    assert.equal(http.getToken(), 'persisted-jwt-token');

    // A second instance simulating page refresh loads the token from localStorage
    const httpAfterReload = new HttpClient({
      baseUrl: 'https://api.restorino.com',
      storageType: 'localStorage',
      tokenStorageKey: 'test_token_key'
    });
    assert.equal(httpAfterReload.getToken(), 'persisted-jwt-token');

    httpAfterReload.clearToken();
    assert.equal(store['test_token_key'], undefined);
    assert.equal(httpAfterReload.getToken(), null);
  } finally {
    delete globalThis.window;
    delete globalThis.localStorage;
  }
});

test('HttpClient: throws RestorinoApiError(401) when requiresAuth=true and token is missing', async () => {
  const http = new HttpClient({
    baseUrl: 'https://api.restorino.com',
    storageType: 'memory'
  });

  await assert.rejects(
    async () => {
      await http.request('/api/customers/me', { requiresAuth: true });
    },
    (err) => {
      assert.ok(err instanceof RestorinoApiError);
      assert.equal(err.status, 401);
      assert.equal(err.error, 'UNAUTHORIZED');
      return true;
    }
  );
});

test('HttpClient: aborts and returns 408 on timeout', async () => {
  const originalFetch = globalThis.fetch;
  // Mock fetch that hangs until aborted
  globalThis.fetch = (url, options) => {
    return new Promise((_, reject) => {
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          const abortErr = new Error('The operation was aborted');
          abortErr.name = 'AbortError';
          reject(abortErr);
        });
      }
    });
  };

  try {
    const http = new HttpClient({
      baseUrl: 'https://api.restorino.com',
      timeoutMs: 50, // 50ms timeout
      storageType: 'memory'
    });

    await assert.rejects(
      async () => {
        await http.request('/api/public/restaurants/popular');
      },
      (err) => {
        assert.ok(err instanceof RestorinoApiError);
        assert.equal(err.status, 408);
        assert.equal(err.error, 'REQUEST_TIMEOUT');
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('HttpClient: respects external AbortSignal cancellation', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (url, options) => {
    return new Promise((_, reject) => {
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          const abortErr = new Error('Caller aborted request');
          abortErr.name = 'AbortError';
          reject(abortErr);
        });
      }
    });
  };

  try {
    const http = new HttpClient({
      baseUrl: 'https://api.restorino.com',
      storageType: 'memory'
    });

    const controller = new AbortController();
    const promise = http.request('/api/public/restaurants/test', {
      signal: controller.signal
    });
    controller.abort();

    await assert.rejects(
      promise,
      (err) => {
        assert.ok(err instanceof RestorinoApiError);
        assert.equal(err.status, 408);
        assert.equal(err.error, 'REQUEST_TIMEOUT');
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AuthModule: login stores token and sends proper headers', async () => {
  const originalFetch = globalThis.fetch;
  let interceptedRequest = null;

  globalThis.fetch = async (url, options) => {
    interceptedRequest = { url, options };
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        token: 'signed-customer-jwt-token',
        customer: { id: 'cust-1', email: 'test@example.com' }
      })
    };
  };

  try {
    const client = new RestorinoClient({
      baseUrl: 'https://api.restorino.com',
      restaurantId: 'rest-uuid-1',
      tenantId: 'tenant-uuid-1',
      storageType: 'memory'
    });

    const authRes = await client.auth.login({
      email: 'test@example.com',
      password: 'password123'
    });

    assert.equal(authRes.token, 'signed-customer-jwt-token');
    assert.equal(client.http.getToken(), 'signed-customer-jwt-token');
    assert.equal(interceptedRequest.url, 'https://api.restorino.com/api/auth/customers/login');
    assert.equal(interceptedRequest.options.headers['x-restaurant-id'], 'rest-uuid-1');
    assert.equal(interceptedRequest.options.headers['x-tenant-id'], 'tenant-uuid-1');
    const sentBody = JSON.parse(interceptedRequest.options.body);
    assert.equal(sentBody.email, 'test@example.com');
    assert.equal(sentBody.restaurantId, 'rest-uuid-1');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AuthModule: loginWithGoogle sends googleToken and scopes restaurantId', async () => {
  const originalFetch = globalThis.fetch;
  let interceptedRequest = null;

  globalThis.fetch = async (url, options) => {
    interceptedRequest = { url, options };
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        token: 'google-auth-customer-jwt',
        customer: { id: 'cust-google-1', email: 'google@example.com' }
      })
    };
  };

  try {
    const client = new RestorinoClient({
      baseUrl: 'https://api.restorino.com',
      restaurantId: 'rest-uuid-2',
      storageType: 'memory'
    });

    const res = await client.auth.loginWithGoogle({
      googleToken: 'google-id-token-abc'
    });

    assert.equal(res.token, 'google-auth-customer-jwt');
    assert.equal(client.http.getToken(), 'google-auth-customer-jwt');
    assert.equal(interceptedRequest.url, 'https://api.restorino.com/api/auth/customers/google');
    const sentBody = JSON.parse(interceptedRequest.options.body);
    assert.equal(sentBody.googleToken, 'google-id-token-abc');
    assert.equal(sentBody.restaurantId, 'rest-uuid-2');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('CustomerModule: validatePromoCode formats promoCode and orderAmount accurately', async () => {
  const originalFetch = globalThis.fetch;
  let interceptedRequest = null;

  globalThis.fetch = async (url, options) => {
    interceptedRequest = { url, options };
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        valid: true,
        discount: 5.5,
        message: 'Réduction de 5.50€ appliquée',
        promoId: 'promo-123'
      })
    };
  };

  try {
    const client = new RestorinoClient({
      baseUrl: 'https://api.restorino.com',
      restaurantId: 'rest-uuid-1',
      storageType: 'memory'
    });
    client.http.setToken('auth-token');

    const result = await client.customer.validatePromoCode('SUMMER2026', 42.50);

    assert.equal(result.valid, true);
    assert.equal(result.discount, 5.5);
    assert.equal(result.promoId, 'promo-123');
    assert.equal(interceptedRequest.url, 'https://api.restorino.com/api/customers/promo/validate');
    const sentBody = JSON.parse(interceptedRequest.options.body);
    assert.equal(sentBody.promoCode, 'SUMMER2026');
    assert.equal(sentBody.orderAmount, 42.50);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OrdersModule: placeOrder routes to /api/public/restaurants/{id}/orders', async () => {
  const originalFetch = globalThis.fetch;
  let interceptedRequest = null;

  globalThis.fetch = async (url, options) => {
    interceptedRequest = { url, options };
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        id: 'order-999',
        orderNumber: 'CMD-2026-001',
        totalAmount: 35.0,
        status: 'PENDING'
      })
    };
  };

  try {
    const client = new RestorinoClient({
      baseUrl: 'https://api.restorino.com',
      restaurantId: 'rest-uuid-9',
      storageType: 'memory'
    });

    const res = await client.orders.placeOrder({
      customerName: 'Alice Dupont',
      customerPhone: '0601020304',
      orderType: 'DELIVERY',
      paymentMethod: 'CARD_ONLINE',
      items: [{
        productId: 'prod-1',
        productName: 'Pizza Margherita',
        quantity: 2,
        unitPrice: 12.50
      }]
    });

    assert.equal(res.id, 'order-999');
    assert.equal(res.orderNumber, 'CMD-2026-001');
    assert.equal(interceptedRequest.url, 'https://api.restorino.com/api/public/restaurants/rest-uuid-9/orders');
    assert.equal(interceptedRequest.options.method, 'POST');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('DeliveryModule: track routes to /api/public/deliveries/track/{trackingNumber}', async () => {
  const originalFetch = globalThis.fetch;
  let interceptedUrl = null;

  globalThis.fetch = async (url) => {
    interceptedUrl = url;
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        trackingNumber: 'TRK-123456',
        orderNumber: 'CMD-101',
        status: 'OUT_FOR_DELIVERY',
        etaMinutes: 12,
        restaurantName: 'La Bella Vita'
      })
    };
  };

  try {
    const client = new RestorinoClient({
      baseUrl: 'https://api.restorino.com',
      storageType: 'memory'
    });

    const tracking = await client.delivery.track('TRK-123456');
    assert.equal(tracking.trackingNumber, 'TRK-123456');
    assert.equal(tracking.etaMinutes, 12);
    assert.equal(interceptedUrl, 'https://api.restorino.com/api/public/deliveries/track/TRK-123456');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OrdersModule: trackOrder enforces 2-factor anti-IDOR params (email + phone)', async () => {
  const originalFetch = globalThis.fetch;
  let interceptedRequest = null;

  globalThis.fetch = async (url, options) => {
    interceptedRequest = { url, options };
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        orderId: 'order-123',
        status: 'PREPARING',
        customerName: 'Sarah C.'
      })
    };
  };

  try {
    const client = new RestorinoClient({
      baseUrl: 'https://api.restorino.com',
      restaurantId: 'rest-uuid-5',
      storageType: 'memory'
    });

    const tracking = await client.orders.trackOrder('order-123', {
      customerEmail: 'sarah@example.com',
      customerPhone: '+33612345678'
    });

    assert.equal(tracking.orderId, 'order-123');
    assert.ok(interceptedRequest.url.includes('/api/public/restaurants/rest-uuid-5/orders/order-123/track'));
    assert.ok(interceptedRequest.url.includes('customerEmail=sarah%40example.com'));
    assert.ok(interceptedRequest.url.includes('customerPhone=%2B33612345678'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Security: Header sanitization prevents CRLF injection', async () => {
  const originalFetch = globalThis.fetch;
  let interceptedRequest = null;

  globalThis.fetch = async (url, options) => {
    interceptedRequest = { url, options };
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({})
    };
  };

  try {
    const client = new RestorinoClient({
      baseUrl: 'https://api.restorino.com',
      tenantId: 'tenant-123\r\nInjected-Header: evil',
      restaurantId: 'rest-456\nAnother: bad',
      storageType: 'memory'
    });
    client.http.setToken('jwt-token\r\nX-Injected: value');

    await client.vitrine.getPopular();

    assert.equal(interceptedRequest.options.headers['x-tenant-id'], 'tenant-123Injected-Header: evil');
    assert.equal(interceptedRequest.options.headers['x-restaurant-id'], 'rest-456Another: bad');
    assert.equal(interceptedRequest.options.headers['Authorization'], 'Bearer jwt-tokenX-Injected: value');
    assert.equal(interceptedRequest.options.headers['Injected-Header'], undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Security: Path traversal characters are encoded in URL paths', async () => {
  const originalFetch = globalThis.fetch;
  let interceptedUrl = null;

  globalThis.fetch = async (url) => {
    interceptedUrl = url;
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({})
    };
  };

  try {
    const client = new RestorinoClient({
      baseUrl: 'https://api.restorino.com',
      storageType: 'memory'
    });

    // Attempting path traversal in delivery tracking
    await client.delivery.track('../../admin/secret');
    assert.ok(interceptedUrl.includes('%2F..%2F..%2Fadmin%2Fsecret') || interceptedUrl.includes('..%2F..%2Fadmin%2Fsecret'));
    assert.ok(!interceptedUrl.includes('/api/public/deliveries/track/../../admin/secret'));

    // Attempting path traversal in tableId
    await client.tables.getTableInfo('../../etc/passwd', 'rest-1');
    assert.ok(!interceptedUrl.includes('/api/public/restaurants/rest-1/tables/../../etc/passwd'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Security: Prevents protocol-relative URL redirects in buildUrl', async () => {
  const originalFetch = globalThis.fetch;
  let interceptedUrl = null;

  globalThis.fetch = async (url) => {
    interceptedUrl = url;
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({})
    };
  };

  try {
    const client = new RestorinoClient({
      baseUrl: 'https://api.restorino.com',
      storageType: 'memory'
    });

    // Calling request with leading double slash must not become protocol-relative
    await client.http.request('//evil.com/phish');
    assert.equal(interceptedUrl, 'https://api.restorino.com/evil.com/phish');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('LiveAgentModule: connect resolves secure wss/ws URL and scopes restaurantSlug', () => {
  const originalWebSocket = globalThis.WebSocket;
  let createdUrl = null;

  class MockWebSocket {
    constructor(url) {
      createdUrl = url;
      this.readyState = 1; // OPEN
    }
    send() {}
    close() {}
  }
  globalThis.WebSocket = MockWebSocket;

  try {
    const client = new RestorinoClient({
      baseUrl: 'https://api.restorino.com',
      restaurantId: 'bella-vita',
      storageType: 'memory'
    });

    assert.ok(client.liveAgent);

    const session = client.liveAgent.connect({
      restaurantSlug: 'bella-vita',
      onTranscript: () => {},
      onStatusChange: () => {}
    });

    assert.ok(session);
    assert.equal(createdUrl, 'wss://api.restorino.com/ws/public/live-agent?restaurantSlug=bella-vita');
  } finally {
    globalThis.WebSocket = originalWebSocket;
  }
});
