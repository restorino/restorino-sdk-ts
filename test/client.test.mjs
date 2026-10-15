import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RestorinoClient,
  RestorinoApiError,
  HttpClient,
  formatCurrency,
  formatDate,
  calculateCart,
  checkAllergensConflict
} from '../dist/index.js';

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
  assert.ok(client.liveAgent);
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

test('HttpClient: manages refresh token storage, getters, and clearTokens', () => {
  const http = new HttpClient({
    baseUrl: 'https://api.restorino.com',
    storageType: 'memory'
  });

  assert.equal(http.getToken(), null);
  assert.equal(http.getRefreshToken(), null);

  http.setAuthTokens('access-token-1', 'refresh-token-1');
  assert.equal(http.getToken(), 'access-token-1');
  assert.equal(http.getRefreshToken(), 'refresh-token-1');

  http.setRefreshToken('refresh-token-2');
  assert.equal(http.getRefreshToken(), 'refresh-token-2');

  http.clearTokens();
  assert.equal(http.getToken(), null);
  assert.equal(http.getRefreshToken(), null);
});

test('HttpClient: performs automatic retry on transient 503 error and succeeds', async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;

  globalThis.fetch = async (url) => {
    attempts++;
    if (attempts === 1) {
      return {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'SERVICE_UNAVAILABLE', message: 'Backend warming up' })
      };
    }
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true, attempt: attempts })
    };
  };

  try {
    const http = new HttpClient({
      baseUrl: 'https://api.restorino.com',
      storageType: 'memory',
      retries: 2,
      retryDelayMs: 10
    });

    const res = await http.request('/api/public/restaurants/test', { method: 'GET' });
    assert.equal(attempts, 2);
    assert.equal(res.success, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('HttpClient: transparently auto-refreshes token on 401 and replays request', async () => {
  const originalFetch = globalThis.fetch;
  let calls = [];

  globalThis.fetch = async (url, options) => {
    calls.push({ url, headers: options.headers });

    // 1st call: request to protected endpoint fails with 401
    if (url.includes('/api/customers/me')) {
      if (options.headers?.Authorization === 'Bearer expired-token') {
        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ error: 'UNAUTHORIZED', message: 'Token expired' })
        };
      }
      // Replayed call with new token succeeds
      if (options.headers?.Authorization === 'Bearer fresh-access-token') {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ id: 'cust-123', email: 'test@example.com' })
        };
      }
    }

    // Refresh endpoint
    if (url.includes('/api/auth/refresh')) {
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ token: 'fresh-access-token', refreshToken: 'fresh-refresh-token' })
      };
    }

    return {
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({})
    };
  };

  try {
    const http = new HttpClient({
      baseUrl: 'https://api.restorino.com',
      storageType: 'memory',
      autoRefreshToken: true
    });

    http.setAuthTokens('expired-token', 'valid-refresh-token');

    const result = await http.request('/api/customers/me', {
      method: 'GET',
      requiresAuth: true
    });

    assert.equal(result.id, 'cust-123');
    assert.equal(http.getToken(), 'fresh-access-token');
    assert.equal(http.getRefreshToken(), 'fresh-refresh-token');
    assert.equal(calls.length, 3); // /me (401) -> /refresh (200) -> /me (200)
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('LiveAgentSession: supports EventEmitter .on(), .off(), and unsubscribe callback', () => {
  const originalWebSocket = globalThis.WebSocket;
  let mockWsInstance = null;

  class MockWebSocket {
    constructor(url) {
      this.readyState = 1;
      mockWsInstance = this;
    }
    send() {}
    close() {}
  }
  globalThis.WebSocket = MockWebSocket;

  try {
    const client = new RestorinoClient({
      baseUrl: 'https://api.restorino.com',
      restaurantId: 'test-rest',
      storageType: 'memory'
    });

    const session = client.liveAgent.connect({
      restaurantSlug: 'test-rest'
    });

    let transcriptCount = 0;
    let lastText = '';
    const unsubscribe = session.on('transcript', (role, text) => {
      transcriptCount++;
      lastText = text;
    });

    // Simulate incoming transcript message
    mockWsInstance.onmessage({
      data: JSON.stringify({ type: 'TRANSCRIPT', role: 'assistant', text: 'Bienvenue chez Restorino !' })
    });

    assert.equal(transcriptCount, 1);
    assert.equal(lastText, 'Bienvenue chez Restorino !');

    // Test unsubscribe
    unsubscribe();

    mockWsInstance.onmessage({
      data: JSON.stringify({ type: 'TRANSCRIPT', role: 'assistant', text: 'Second message' })
    });

    assert.equal(transcriptCount, 1); // Unsubscribed, must not increment
  } finally {
    globalThis.WebSocket = originalWebSocket;
  }
});

test('AuthModule: refreshToken invokes /api/auth/refresh and updates tokens', async () => {
  const originalFetch = globalThis.fetch;
  let refreshBody = null;

  globalThis.fetch = async (url, options) => {
    refreshBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        token: 'new-token-abc',
        refreshToken: 'new-refresh-xyz',
        expiresIn: 3600
      })
    };
  };

  try {
    const client = new RestorinoClient({
      baseUrl: 'https://api.restorino.com',
      storageType: 'memory'
    });

    client.setAuthTokens('old-token', 'my-refresh-token');

    const res = await client.auth.refreshToken();
    assert.equal(res.token, 'new-token-abc');
    assert.equal(res.refreshToken, 'new-refresh-xyz');
    assert.equal(client.getToken(), 'new-token-abc');
    assert.equal(client.getRefreshToken(), 'new-refresh-xyz');
    assert.equal(refreshBody.refreshToken, 'my-refresh-token');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('VitrineModule: getTestimonials routes to /api/public/testimonials/{id}', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';

  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ([
        { id: 'test-1', customerName: 'Alice', rating: 5, comment: 'Plats délicieux !' }
      ])
    };
  };

  try {
    const client = new RestorinoClient({
      baseUrl: 'https://api.restorino.com',
      restaurantId: 'rest-uuid-123',
      storageType: 'memory'
    });

    const reviews = await client.vitrine.getTestimonials();
    assert.equal(reviews.length, 1);
    assert.equal(reviews[0].customerName, 'Alice');
    assert.ok(requestedUrl.includes('/api/public/testimonials/rest-uuid-123'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('VitrineModule: validateApiKey sends X-API-Key to /api/vitrine/api-keys/validate', async () => {
  const originalFetch = globalThis.fetch;
  let interceptedHeaders = null;
  let interceptedUrl = '';

  globalThis.fetch = async (url, options) => {
    interceptedUrl = url;
    interceptedHeaders = options.headers;
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        valid: true,
        keyId: 'key-123',
        restaurantId: 'rest-456',
        permissions: ['READ', 'WRITE']
      })
    };
  };

  try {
    const client = new RestorinoClient({
      baseUrl: 'https://api.restorino.com',
      apiKey: 'vit_live_testkey123',
      allowApiKeyHeader: true,
      storageType: 'memory'
    });

    const res = await client.vitrine.validateApiKey();
    assert.equal(res.valid, true);
    assert.equal(res.keyId, 'key-123');
    assert.equal(interceptedHeaders['X-API-Key'], 'vit_live_testkey123');
    assert.ok(interceptedUrl.includes('/api/vitrine/api-keys/validate'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('HttpClient: does not send configured API keys without explicit server-only opt-in', async () => {
  const originalFetch = globalThis.fetch;
  let interceptedHeaders = null;

  globalThis.fetch = async (_url, options) => {
    interceptedHeaders = options.headers;
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true })
    };
  };

  try {
    const client = new RestorinoClient({
      baseUrl: 'https://api.restorino.com',
      apiKey: 'vit_live_browser_secret',
      storageType: 'memory'
    });

    await client.http.request('/api/public/restaurants/search', { method: 'GET' });
    assert.equal(interceptedHeaders['X-API-Key'], undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('VitrineModule: getConfig routes to /api/vitrine/{tenantId}/config with X-API-Key', async () => {
  const originalFetch = globalThis.fetch;
  let interceptedUrl = '';
  let interceptedHeaders = null;

  globalThis.fetch = async (url, options) => {
    interceptedUrl = url;
    interceptedHeaders = options.headers;
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        tenantId: 'tenant-123',
        restaurantName: 'Bella Vita',
        brandingPrimaryColor: '#ff5500',
        settingsIsPublished: true
      })
    };
  };

  try {
    const client = new RestorinoClient({
      baseUrl: 'https://api.restorino.com',
      tenantId: 'tenant-123',
      apiKey: 'vit_live_secretkey',
      allowApiKeyHeader: true,
      storageType: 'memory'
    });

    const config = await client.vitrine.getConfig();
    assert.equal(config.restaurantName, 'Bella Vita');
    assert.equal(config.brandingPrimaryColor, '#ff5500');
    assert.equal(interceptedHeaders['X-API-Key'], 'vit_live_secretkey');
    assert.ok(interceptedUrl.includes('/api/vitrine/tenant-123/config'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('VitrineModule: getPublicConfig routes to /api/vitrine/{tenant}/public without requiring auth', async () => {
  const originalFetch = globalThis.fetch;
  let interceptedUrl = '';

  globalThis.fetch = async (url) => {
    interceptedUrl = url;
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        tenantId: 'tenant-123',
        restaurantName: 'Bella Vita',
        settingsIsPublished: true
      })
    };
  };

  try {
    const client = new RestorinoClient({
      baseUrl: 'https://api.restorino.com',
      tenantId: 'tenant-123',
      storageType: 'memory'
    });

    const res = await client.vitrine.getPublicConfig();
    assert.equal(res.restaurantName, 'Bella Vita');
    assert.ok(interceptedUrl.includes('/api/vitrine/tenant-123/public'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('VitrineModule: resolveCustomDomain routes to /api/vitrine/resolve-domain', async () => {
  const originalFetch = globalThis.fetch;
  let interceptedUrl = '';

  globalThis.fetch = async (url) => {
    interceptedUrl = url;
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        found: true,
        tenantId: 'tenant-abc',
        restaurantName: 'Chez Luigi'
      })
    };
  };

  try {
    const client = new RestorinoClient({
      baseUrl: 'https://api.restorino.com',
      storageType: 'memory'
    });

    const res = await client.vitrine.resolveCustomDomain('chez-luigi.com');
    assert.equal(res.found, true);
    assert.equal(res.restaurantName, 'Chez Luigi');
    assert.ok(interceptedUrl.includes('/api/vitrine/resolve-domain?domain=chez-luigi.com'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('RestorinoClient: manages apiKey dynamically with getApiKey and setApiKey', () => {
  const client = new RestorinoClient({
    baseUrl: 'https://api.restorino.com',
    apiKey: 'vit_live_initial',
    storageType: 'memory'
  });

  assert.equal(client.getApiKey(), 'vit_live_initial');
  client.setApiKey('vit_live_updated');
  assert.equal(client.getApiKey(), 'vit_live_updated');
  client.setApiKey(null);
  assert.equal(client.getApiKey(), null);
});

test('Security: Header sanitization blocks Unicode line separators (\\u2028, \\u2029)', async () => {
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
      tenantId: 'tenant-123\u2028Injected: bad',
      apiKey: 'key-abc\u2029Other: evil',
      allowApiKeyHeader: true,
      storageType: 'memory'
    });

    await client.vitrine.getPopular();

    assert.equal(interceptedRequest.options.headers['x-tenant-id'], 'tenant-123Injected: bad');
    assert.equal(interceptedRequest.options.headers['X-API-Key'], 'key-abcOther: evil');
    assert.equal(interceptedRequest.options.headers['Injected'], undefined);
    assert.equal(interceptedRequest.options.headers['Other'], undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Security: buildUrl cleans backslashes and prevents SSRF absolute URL overrides', async () => {
  const originalFetch = globalThis.fetch;
  let interceptedUrls = [];

  globalThis.fetch = async (url) => {
    interceptedUrls.push(url);
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

    // Backslash path that could resolve as protocol-relative
    await client.http.request('\\\\attacker.com\\phish');
    assert.equal(interceptedUrls[0], 'https://api.restorino.com/attacker.com/phish');

    // Absolute URL passed into endpoint must not override baseUrl
    await client.http.request('https://evil.com/leak/data');
    assert.equal(interceptedUrls[1], 'https://api.restorino.com/leak/data');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Security: buildUrl and updateConfig ignore __proto__ and prototype pollution', async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = '';

  globalThis.fetch = async (url) => {
    capturedUrl = url;
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

    // Parameter pollution payload with __proto__
    const payload = JSON.parse('{"valid":"123","__proto__":{"polluted":true}}');
    await client.http.request('/api/test', { params: payload });

    assert.ok(capturedUrl.includes('valid=123'));
    assert.ok(!capturedUrl.includes('polluted'));

    // Config update with __proto__
    const pollutedConfig = JSON.parse('{"restaurantId":"safe-resto","__proto__":{"admin":true}}');
    client.configure(pollutedConfig);
    assert.equal(client.http.getConfig().restaurantId, 'safe-resto');
    assert.equal(({})['admin'], undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Security: LiveAgentModule rejects non-ws/wss protocols (e.g. javascript:)', () => {
  const client = new RestorinoClient({
    baseUrl: 'https://api.restorino.com',
    storageType: 'memory'
  });

  assert.throws(() => {
    client.liveAgent.connect({
      restaurantSlug: 'safe-rest',
      wsUrl: 'javascript:alert(1)'
    });
  }, /ws:\/\/|wss:\/\//);
});

test('Security: loadStoredValue rejects poisoned tokens containing CRLF or control chars', () => {
  const store = {};
  const mockLocalStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; }
  };
  globalThis.window = {};
  globalThis.localStorage = mockLocalStorage;

  try {
    // Poison storage with a token containing CRLF injection
    mockLocalStorage.setItem('restorino_customer_token', 'jwt-token\r\nInjected-Header: evil');

    const http = new HttpClient({
      baseUrl: 'https://api.restorino.com',
      storageType: 'localStorage'
    });

    // Must be rejected and treated as null
    assert.equal(http.getToken(), null);
  } finally {
    delete globalThis.window;
    delete globalThis.localStorage;
  }
});

test('Utils: formatCurrency formats EUR and other currencies properly', () => {
  const formatted = formatCurrency(18.5, 'EUR', 'fr-FR');
  assert.ok(formatted.includes('18,50') || formatted.includes('18.50'));
  assert.ok(formatted.includes('€') || formatted.includes('EUR'));
});

test('Utils: calculateCart computes subtotal, discount, delivery fee and item count', () => {
  const items = [
    { productId: 'p1', productName: 'Pizza', quantity: 2, unitPrice: 12.0 },
    { productId: 'p2', productName: 'Soda', quantity: 1, unitPrice: 3.5 }
  ];

  const res = calculateCart(items, { deliveryFee: 2.5, discountPercent: 10 });
  assert.equal(res.subtotal, 27.5);
  assert.equal(res.deliveryFee, 2.5);
  assert.equal(res.discount, 2.75);
  assert.equal(res.total, 27.25);
  assert.equal(res.itemCount, 3);
});

test('Utils: checkAllergensConflict detects conflicting allergens', () => {
  const dishAllergens = ['Gluten', 'Lactose', 'Arachides'];
  const customerAllergies = ['lactose', 'soja'];

  const result = checkAllergensConflict(dishAllergens, customerAllergies);
  assert.equal(result.hasConflict, true);
  assert.equal(result.conflictingAllergens.length, 1);
  assert.equal(result.conflictingAllergens[0], 'Lactose');
});

test('OrdersModule: watchOrder polls tracking and stops automatically upon DELIVERED', async () => {
  const originalFetch = globalThis.fetch;
  let pollCalls = 0;

  globalThis.fetch = async () => {
    pollCalls++;
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        orderId: 'ord-1',
        status: pollCalls >= 2 ? 'DELIVERED' : 'PREPARING',
        isDelivered: pollCalls >= 2
      })
    };
  };

  try {
    const client = new RestorinoClient({
      baseUrl: 'https://api.restorino.com',
      storageType: 'memory'
    });

    let receivedCount = 0;
    let finalStatus = '';

    const stopWatching = client.orders.watchOrder(
      'ord-1',
      { customerEmail: 'test@example.com', customerPhone: '0600000000' },
      (tracking) => {
        receivedCount++;
        finalStatus = tracking.status;
      },
      { intervalMs: 50 }
    );

    await new Promise((resolve) => setTimeout(resolve, 200));
    stopWatching();

    assert.ok(receivedCount >= 2);
    assert.equal(finalStatus, 'DELIVERED');
  } finally {
    globalThis.fetch = originalFetch;
  }
});


