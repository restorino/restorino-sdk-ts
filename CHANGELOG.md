# Changelog

All notable changes to `@restorino/sdk`.

## 1.2.0 — 2026-11-03

### Removed (out of scope)

The SDK is now **storefront-only**, and the boundary is enforced at runtime
rather than documented.

- `vitrine.getConfig()` — the backend endpoint is restricted to administrative
  roles and API keys. Use `vitrine.getPublicConfig()`.
- `vitrine.getTemplates()` — site-builder catalogue, a backoffice concern.
- `vitrine.validateApiKey()`, `client.getApiKey()`, `client.setApiKey()` and the
  `apiKey` / `allowApiKeyHeader` config — a browser storefront never holds an
  API key.
- Types `ValidateApiKeyResponse`, `TemplateResponse`, `CustomerRefreshTokenRequest`
  and `DriverGpsLocation` (all described shapes that no longer exist).
- The `vercel.json` / `netlify.toml` deploy configs: this is a library, not a site.

### Added

- `scope: 'storefront' | 'all'` (default `'storefront'`), enforced in the
  transport. Any path outside `/api/public/**`, `/api/auth/customers/**`,
  `/api/customers/**`, `/api/notifications/customers/**` and the public vitrine
  reads throws `OUT_OF_SCOPE_ENDPOINT` (HTTP 403) **before** the network call —
  including through the generic `http.request()` escape hatch.
- `isStorefrontEndpoint()` and `normalizeEndpointPath()` are exported.
- `test/scope.test.mjs`: scans every endpoint literal in `src/`, proves the
  privileged surfaces are refused, blocks `..` and encoded separators, and fails
  if a backoffice method is re-introduced.

### Fixed

- `RestorinoApiError` identity across the dual build: the CJS and ESM entries
  create two class objects, so `instanceof` failed in one direction and a
  consumer's error switch fell through to `default`. Identity now uses a
  `Symbol.for` brand shared by both builds (a look-alike object is rejected).
- `scope` can no longer be widened after construction: `configure({ scope })` is
  ignored, so application code cannot opt into privileged routes at runtime.
- A `200 { success: false }` answer no longer counts as a token refresh — it
  replayed the request with the same credentials and surfaced a secondary 401
  instead of the real cause.
- `createPcmPlayer()` now exposes `close()` to release its `AudioContext`;
  browsers cap simultaneous contexts (~6), so a player per session silently
  stopped working after a few calls.
- `getPublicConfig`, `getSchemaOrg`, `getSeoMeta*`, `getCategoryBySlug` and
  `getProductBySlug` now throw `MISSING_TENANT_ID` instead of building an empty
  path segment (`/api/vitrine//public`).

## 1.1.0 — 2026-11-03

The client was aligned with the backend's actual wire format. **This release
contains breaking changes**; the 1.0.0 types described an API that never existed.

### Breaking

- **Authentication is cookie-based.** `credentials` now defaults to `'include'`.
  `login()`/`register()` return `{ customer, loyalty }` with **no token**
  (`CustomerAuthResponse.token` is now optional). Use `auth.getMe()` to check
  the session.
- **Token storage defaults to `memory`.** `storageType: 'localStorage'` is now an
  explicit opt-in; it was previously the implicit default.
- **Order creation payloads:** `orderType` → `deliveryMethod`
  (`'delivery' | 'takeout' | 'dine-in'`); `paymentMethod` values are lowercase;
  `deliveryLocation`/`street` → `customerLocation`/`address`; each item requires
  `totalPrice`; supplements are objects, not id arrays.
- **Order responses:** `totalAmount`/`subtotalAmount`/`discountAmount` →
  `total`/`subtotal`/`discount`; `trackingToken` removed (parse `trackingUrl`).
- **Enumerations:** `OrderStatus` gained `COMPLETED`, `REFUSED`, `REFUNDED`,
  `PENDING_VERIFICATION`. `DeliveryStatus` is now
  `PENDING|ASSIGNED|PICKED_UP|IN_TRANSIT|DELIVERED|FAILED|CANCELLED`.
  `RewardType` is now `DISCOUNT|PERCENTAGE|FREE_ITEM|CASHBACK|CUSTOM`.
- **Field renames:** `restaurant.id` → `restaurantId`; `cuisines[]` →
  `cuisineType`; `rating.averageRating` → `overallRating`; `reward.pointsCost` →
  `pointsRequired`; `testimonial.comment` → `content`; notification
  `type`/`read`/`actionUrl` → `notificationType`/`isRead`/`actionButtonUrl`;
  `partySize`/`reservationTime` → `numberOfGuests` + ISO `reservationDate`;
  `confirmPasswordReset({ code })` → `{ resetCode }`;
  `changePassword` now requires `confirmPassword`.
- **Return shapes:** `vitrine.getReviews()` returns
  `{ reviews, totalReviews, averageRating, ... }` (not a `Page`);
  `vitrine.getTestimonials()` returns a `Page`; `vitrine.search()` resolves to
  `Page<RestaurantSearchResponse>`; `customer.getOrders()` resolves to
  `Page<CustomerOrder>`.
- **`resolveCustomDomain()`** returns `{ found: false }` on 404 instead of throwing.
- **Live Agent** mints a session grant before connecting; adds
  `confirmAction()`, `interrupt()`, `getAudioMeta()`; transcript roles are
  normalised to `'user' | 'assistant'`.
- **Packaging:** the phantom `module` field (it pointed at a file `tsc` never
  built) and the non-importable `./bundle` export were removed. The package now
  ships a real dual build — ESM in `dist/esm` (`type: module`, explicit
  extensions) and CommonJS in `dist` — with `main`/`module`/`types`/`exports`
  all pointing at files that exist.

### Added

- `onRequest` / `onResponse` observability hooks (no headers, no query string).
- `RestorinoApiError.requestId` (from `x-request-id`) and `retryAfterMs`
  (honoured for 429/503 backoff).
- `createPcmPlayer()` — Web Audio player for the Live Agent PCM stream, with
  sample-rate updates from `AUDIO_META`.
- `Idempotency-Key` on order and reservation creation.
- CSRF double-submit (`XSRF-TOKEN` → `X-XSRF-TOKEN`) and
  `X-Device-Fingerprint` handling.
- `examples/vanilla/` — a runnable, type-checked reference funnel.
- `test/contract-drift.test.mjs` + `contract/contract.snapshot.json`, generated
  from the backend OpenAPI document.
- Dual ESM/CJS build (`dist/esm` + `dist`), guarded by `test/packaging.test.mjs`.
- `unrefTimers` option on `watchOrder` / `watchDelivery` so a Node process can
  exit while a watcher is armed.
- Contract drift now asserts field **types**, not only names, for the money,
  status, quantity and boolean fields the SDK renders.
- CI workflow running type-checks, all tests, `npm audit`, and an opt-in
  backend contract-drift job.

### Fixed

- `watchOrder` / `watchDelivery` never terminated (polled a field that does not
  exist). Both now stop on real terminal statuses and are bounded by
  `maxDurationMs` and `maxConsecutiveErrors`.
- `setToken(token)` silently wiped the refresh token.
- `charge` of a 409 was retried up to twice even with `retries: 0`, and
  non-idempotent POSTs were replayed without a key.
- A 401 on a public endpoint (e.g. a failed login) cleared the active session.
- A completed logout could be undone by an in-flight token refresh.
- Non-JSON 2xx responses were cast to the expected type; they now throw
  `INVALID_RESPONSE`.
- `AbortSignal` listeners leaked on every request sharing a signal.
- Local cart math ignored tax, extras, minimum order and the free-delivery
  threshold.

### Security

- Tokens are no longer written to `localStorage` by default.
- `baseUrl` is validated (rejects `javascript:`, `data:`, `file:`,
  protocol-relative URLs and embedded credentials) on both construction and
  reconfiguration.
- `getConfig()` returns a copy, so callers cannot mutate `baseUrl`/`apiKey`.
- Error bodies are capped at 8 KB before being retained.

## 1.0.0 — Initial release

First published shape of the client. Not compatible with the backend: it assumed
a Bearer-token API and field names that do not exist server-side.
