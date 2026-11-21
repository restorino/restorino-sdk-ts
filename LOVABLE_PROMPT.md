# Restorino SDK — One-Shot Frontend Build Guide

> **Audience: an AI coding agent.** This file is a contract, not a tutorial.
> Follow it literally. Every method listed here exists in the shipped SDK; every
> method *not* listed here does not. Read §0 before writing a single line.

Verified against `@restorino/sdk@1.1.0` declarations (`dist/index.d.ts`).

---

## 0. Hard rules (violating one of these breaks the build)

1. **Never invent a method.** The complete list is §4. If an operation is not
   there, it is not supported by this SDK.
2. **Authentication is cookie-based.** `auth.login()` returns the customer
   profile, **not** a token. Do **not** read `response.token`, and do **not**
   write tokens to `localStorage`. Check the session with `api.auth.getMe()`.
3. **Never send authoritative totals.** The server recomputes every amount and
   rejects a mismatch with HTTP 500. Send item prices and let the server decide.
4. **`restaurantId` must be the restaurant UUID** (from onboarding), not a slug,
   not a table number. Slugs are only accepted by `getRestaurant`,
   `getCategoryBySlug`, `getProductBySlug`, `getSeoMeta`, `getPublicConfig` and
   `getSchemaOrg`.
5. **Do not set `storageType`.** The default is `memory`, which is correct in a
   browser. Opting into `localStorage` exposes the refresh token to XSS.
6. **Storefront scope only.** The client can call `/api/public/**`,
   `/api/auth/customers/**`, `/api/customers/**` and
   `/api/notifications/customers/**`, plus the public vitrine reads. Any other
   path throws `OUT_OF_SCOPE_ENDPOINT` **before** the request leaves the browser.
   There is **no API-key support**: the only credential is the customer cookie.
7. **Money is `number`** in the restaurant currency. **Dates are ISO-8601
   strings** returned by the server.
8. **Any 2xx that is not JSON throws `INVALID_RESPONSE`.** If you see that error,
   the proxy/base URL is wrong — do not retry in a loop, fix the URL.

---

## 1. Install

```bash
npm install @restorino/sdk
```

No-code editor (Lovable / v0 / Bolt): copy `dist-bundle/restorino-sdk.ts` into
`src/lib/restorino-sdk.ts` and import it from there. The bundle has zero
dependencies and is self-contained.

---

## 2. Initialize (copy-paste, do not modify)

```ts
// src/lib/api.ts
import { RestorinoClient } from '@restorino/sdk';

export const api = new RestorinoClient({
  baseUrl: import.meta.env.VITE_RESTORINO_API_URL ?? '',
  restaurantId: import.meta.env.VITE_RESTAURANT_ID, // restaurant UUID
  credentials: 'include',   // required: the backend authenticates via cookies
  // storageType intentionally omitted (memory); no tokens are persisted
  retries: 2,
  onTokenExpired: () => {
    window.location.href = '/login?expired=true';
  },
});
```

`baseUrl: ''` means "same origin" — correct when the storefront proxies `/api`
to the backend. For custom domains this proxy is mandatory: the backend does not
grant credentialed CORS to tenant subdomains.

Vite env:

```bash
VITE_RESTORINO_API_URL=https://api.restorino.com
VITE_RESTAURANT_ID=9b2f5f2a-1c3d-4e5f-8a9b-0c1d2e3f4a5b
```

---

## 3. Auth model

```
login / register / loginWithGoogle  →  Set-Cookie: customer_token (HttpOnly)
                                    →  body: { customer, loyalty }   ← no token
getMe()                             →  { customer, loyalty } | 401
logout()                            →  revokes the cookie session
```

- Protected calls (`getMe`, `getProfile`, `getOrders`, `loyalty.*`, …) rely on
  the cookie. Calling them while logged out yields `401`.
- `api.isAuthenticated()` only reflects a legacy in-memory Bearer token. In
  cookie mode it returns `false` even when the session is valid — **use
  `getMe()`**.
- CSRF is automatic (`XSRF-TOKEN` → `X-XSRF-TOKEN` on mutations). Do not add it
  manually.
- Route protection in the SPA is a UX convenience, never a security boundary.

---

## 4. API reference (exhaustive)

Only these exist.

### 4.1 `api.auth`
```ts
login(data: CustomerLoginRequest): Promise<CustomerAuthResponse>
register(data: CustomerRegisterRequest): Promise<CustomerAuthResponse>
loginWithGoogle(data: { googleToken: string; restaurantId?: string }): Promise<CustomerAuthResponse>
refreshToken(refreshToken?: string): Promise<CustomerRefreshTokenResponse>
logout(): Promise<void>
getMe(): Promise<CustomerAuthResponse>
changePassword(data: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<void>
requestEmailVerification(): Promise<MessageResponse>
verifyEmail(token: string): Promise<MessageResponse>
requestPasswordReset(email: string, restaurantId?: string): Promise<MessageResponse>
confirmPasswordReset(data: { email: string; resetCode: string; newPassword: string; restaurantId?: string }): Promise<MessageResponse>
```

```ts
// CustomerLoginRequest
{ email: string; password: string; restaurantId?: string; captchaToken?: string }

// CustomerRegisterRequest — all of firstName/lastName/phone are REQUIRED
{ email: string; password: string; firstName: string; lastName: string;
  phone: string; restaurantId?: string; referralCode?: string; captchaToken?: string }

// CustomerAuthResponse
{ customer: CustomerDto; token?: string | null; refreshToken?: string | null;
  expiresAt?: string; loyalty?: { totalPoints: number; availablePoints: number; tier: string; totalVisits?: number } }
```

### 4.2 `api.vitrine` (public discovery, no auth)
```ts
search(filter: RestaurantSearchRequest): Promise<Page<RestaurantSearchResponse>>
getPopular(): Promise<RestaurantSearchResponse[]>
getCuisines(): Promise<string[]>
getRestaurant(identifier?: string): Promise<PublicVitrineResponse>
checkDeliveryZone(latitude: number, longitude: number, restaurantId?: string): Promise<DeliveryZoneCheckResponse>
getStatus(restaurantId?: string): Promise<RestaurantStatusResponse>
getReviews(restaurantId?: string, page?: number, size?: number): Promise<RestaurantReviewsResponse>
getMenu(restaurantId?: string): Promise<PublicMenuResponse>
getCategoryBySlug(categorySlug: string, tenantOrSlug?: string): Promise<PublicCategory>
getProductBySlug(categorySlug: string, productSlug: string, tenantOrSlug?: string): Promise<PublicProduct>
getSeoMeta(tenantOrSlug?: string): Promise<SeoMetaTagsResponse>
getCategorySeoMeta(categorySlug: string, tenantOrSlug?: string): Promise<SeoMetaTagsResponse>
getProductSeoMeta(productSlug: string, tenantOrSlug?: string): Promise<SeoMetaTagsResponse>
getTestimonialsBySubdomain(subdomain: string, page?: number, size?: number): Promise<Page<TestimonialResponse>>
getTestimonials(restaurantId?: string, page?: number, size?: number): Promise<Page<TestimonialResponse>>
getPublicConfig(tenantIdOrSubdomain?: string): Promise<VitrineConfigResponse>
resolveCustomDomain(domain: string): Promise<DomainResolutionResponse>
getSchemaOrg(tenantIdOrSubdomain?: string): Promise<Record<string, any>>
```

```ts
// RestaurantSearchRequest — these are the ONLY honoured filter names
{ searchTerm?: string; cuisineType?: string; city?: string; latitude?: number;
  longitude?: number; radiusKm?: number; priceRange?: number; minRating?: number }
```

### 4.3 `api.orders` (public ordering + reservations)
```ts
placeOrder(order: VitrineOrderRequest, restaurantId?: string): Promise<OrderResponse>
estimateDelivery(location: EstimateDeliveryRequest, restaurantId?: string): Promise<DeliveryEstimateResponse>
trackOrder(orderId: string, verification: OrderTrackingVerification, restaurantId?: string): Promise<OrderTrackingResponse>
cancelOrder(orderId: string, verification: CancelOrderRequest, restaurantId?: string): Promise<OrderResponse>
trackOrderByToken(token: string, restaurantId?: string): Promise<OrderTrackingResponse>
getOrderingMenu(restaurantId?: string): Promise<PublicMenuResponse>
getSettings(restaurantId?: string): Promise<PublicRestaurantSettingsResponse>
createReservation(reservation: CreateReservationRequest, restaurantId?: string): Promise<ReservationResponse>
trackReservation(reservationNumber: string, verification: ReservationTrackingVerification, restaurantId?: string): Promise<ReservationResponse>
cancelReservation(reservationNumber: string, verification: CancelReservationRequest, restaurantId?: string): Promise<ReservationResponse>
watchOrder(orderId: string, verification: OrderTrackingVerification, callback: (t: OrderTrackingResponse) => void,
           options?: { intervalMs?: number; onError?: (e: Error) => void; restaurantId?: string;
                       maxDurationMs?: number; maxConsecutiveErrors?: number }): () => void
```

```ts
// VitrineOrderRequest — exact wire shape
{
  customerName: string;
  customerEmail: string;          // required
  customerPhone: string;          // required
  deliveryMethod: 'delivery' | 'takeout' | 'dine-in';   // lowercase!
  paymentMethod: 'card' | 'cash' | 'paypal' | 'stripe' | 'mobile';
  items: Array<{
    productId: string; productName: string;
    quantity: number; unitPrice: number;
    totalPrice: number;                                   // REQUIRED: unitPrice*qty + extras
    categoryId?: string; categoryName?: string;
    specialInstructions?: string;
    supplements?: Array<{ supplementId: string; supplementName: string; price: number; quantity: number }>;
    garnish?: { garnishId: string; garnishName: string; price: number };
  }>;
  customerLocation?: { latitude: number; longitude: number; address?: string; city?: string; postalCode?: string };
  deliveryAddress?: string;        // alternative to GPS for 'delivery'
  deliveryInstructions?: string;
  preferredDeliveryTime?: string;
  tableNumber?: string; tableToken?: string;
  paymentToken?: string;
  promoCode?: string; pointsToRedeem?: number;
  orderNotes?: string; marketingConsent?: boolean;
  subtotal?: number; tax?: number; deliveryFee?: number; discount?: number; total?: number;
  website?: string; formTimestamp?: number;   // anti-spam: leave empty
  idempotencyKey?: string;                    // sent as header, never in the body
}

// EstimateDeliveryRequest
{ latitude: number; longitude: number; address: string; preferredTime?: string; orderValue?: number }

// OrderTrackingVerification / CancelOrderRequest
{ customerEmail: string; customerPhone: string; reason?: string }

// CreateReservationRequest
{ customerName: string; customerPhone: string; customerEmail: string;
  numberOfGuests: number;                    // 1..50
  reservationDate: string;                   // ISO date-time: '2026-12-24T20:30:00'
  specialRequests?: string; tableId?: string; tableNumber?: string;
  customerLatitude?: number; customerLongitude?: number; customerGpsAccuracyMeters?: number;
  website?: string; formTimestamp?: number }
```

### 4.4 `api.tables`
```ts
getTableInfo(tableId: string, restaurantId?: string): Promise<PublicTableResponse>
```
`tableId` must be a **UUID**. The printed table number is not an id.

### 4.5 `api.customer` (authenticated)
```ts
getProfile(): Promise<CustomerDto>
updateProfile(data: { firstName?: string; lastName?: string; phone?: string }): Promise<CustomerDto>
getOrders(page?: number, size?: number): Promise<Page<CustomerOrder>>
getOrderDetails(orderId: string): Promise<CustomerOrder>
rateOrder(orderId: string, rating: OrderRatingRequest): Promise<OrderRatingDTO>
getMyRatings(page?: number, size?: number): Promise<Page<OrderRatingDTO>>
getReferralCode(): Promise<ReferralCodeResponse>
applyReferralCode(code: string): Promise<MessageResponse>
getReferrals(): Promise<ReferralDashboardResponse>
getNotifications(page?: number, size?: number): Promise<Page<CustomerNotification>>
getUnreadNotificationCount(): Promise<{ unreadCount: number }>
markNotificationRead(notificationId: string): Promise<void>
markAllNotificationsRead(): Promise<void>
getMenuCategories(): Promise<PublicCategory[]>
getMenuProducts(categoryId?: string): Promise<PublicProduct[]>
getMenuProduct(productId: string): Promise<PublicProduct>
getMenuSupplements(productId?: string): Promise<ProductOption[]>
getMenuGarnishes(category?: string): Promise<ProductOption[]>
getMenuBeverages(filters?: { type?: string; size?: string; alcoholic?: boolean }): Promise<ProductOption[]>
submitTestimonial(data: { rating: number; content: string }): Promise<TestimonialResponse>
getMyTestimonials(): Promise<TestimonialResponse[]>
validatePromoCode(promoCode: string, orderAmount: number): Promise<PromoValidationResponse>
```

```ts
// OrderRatingRequest
{ foodQualityRating: number; deliverySpeedRating: number; serviceRating: number; reviewText?: string }
```

### 4.6 `api.loyalty` (mostly authenticated)
```ts
getStatus(): Promise<CustomerLoyalty>
getRewards(): Promise<LoyaltyReward[]>
redeemReward(rewardId: string): Promise<RedemptionResult>
getGoogleReviewInfo(restaurantId?: string): Promise<GoogleReviewInfoResponse>   // restaurant UUID required
getGoogleReviewStatus(): Promise<GoogleReviewStatusResponse>
claimGoogleReview(data: GoogleReviewClaimRequest): Promise<GoogleReviewClaimDTO>
uploadGoogleReviewProof(file: File | Blob): Promise<{ url: string }>
```

### 4.7 `api.delivery` (public tracking)
```ts
track(trackingNumber: string): Promise<PublicTrackingResponse>
watchDelivery(trackingNumber: string, callback: (d: PublicTrackingResponse) => void,
              options?: { intervalMs?: number; onError?: (e: Error) => void;
                          maxDurationMs?: number; maxConsecutiveErrors?: number }): () => void
```

### 4.8 `api.liveAgent`
```ts
connect(config: LiveAgentSessionConfig): LiveAgentSession
```
```ts
// LiveAgentSessionConfig
{ restaurantSlug: string; wsUrl?: string; grant?: string;
  onTranscript?: (role: 'user' | 'assistant', text: string) => void;
  onAudioMeta?: (m: { encoding?: string; sampleRate: number; channels?: number }) => void;
  onAudio?: (chunk: Uint8Array) => void;
  onClientAction?: (a: { action: string; payload: Record<string, any>; actionId?: string }) => void;
  onStatusChange?: (s: LiveAgentStatus) => void;
  onInterrupted?: () => void;
  onSessionEnded?: (reason?: string) => void;
  onError?: (e: Error) => void;
  onClose?: () => void }

// LiveAgentSession
on(event, listener): () => void
off(event, listener): void
sendText(text: string): void
sendAudio(pcm: Uint8Array | ArrayBuffer | Blob): void
confirmAction(actionId: string): void      // REQUIRED to apply an agent action
interrupt(): void
getAudioMeta(): { encoding?: string; sampleRate: number; channels?: number } | null
getStatus(): LiveAgentStatus
disconnect(): void
```

The session connects asynchronously (it first mints a one-shot `grant`). Wait
for `onStatusChange('CONNECTED')` before `sendText`. Play back audio at
`getAudioMeta().sampleRate` — do not hardcode 16 kHz.

### 4.9 Client helpers
```ts
configure(newConfig: Partial<RestorinoClientConfig>): void
getToken(): string | null
getRefreshToken(): string | null
setToken(token: string | null, refreshToken?: string | null): void
setRefreshToken(refreshToken: string | null): void
setAuthTokens(token: string | null, refreshToken?: string | null): void
isAuthenticated(): boolean          // legacy Bearer only; see §3
logoutLocal(): void
formatCurrency(amount: number, currency?: string, locale?: string): string
formatDate(isoDate: string, options?: Intl.DateTimeFormatOptions, locale?: string): string
calculateCart(items: OrderItemRequest[], options?: CartCalculationOptions): CartCalculationResult
checkAllergens(dishAllergens: string[] | string, customerAllergens: string[]): { hasConflict: boolean; conflictingAllergens: string[] }
```
```ts
// CartCalculationOptions — display estimate only, never submitted as truth
{ deliveryFee?: number; discountAmount?: number; discountPercent?: number;
  maxDiscountAmount?: number; taxRate?: number; minimumOrderAmount?: number;
  freeDeliveryThreshold?: number; enforceMinimumOrder?: boolean }
// CartCalculationResult
{ subtotal: number; tax: number; deliveryFee: number; discount: number;
  total: number; itemCount: number; meetsMinimumOrder: boolean }
```

### 4.10 Observability & diagnostics

```ts
type RestorinoRequestEvent  = { method: string; path: string };
type RestorinoResponseEvent = RestorinoRequestEvent & {
  status: number; durationMs: number; requestId?: string;
};

// Optional client config
onRequest?:  (event: RestorinoRequestEvent) => void;
onResponse?: (event: RestorinoResponseEvent) => void;
```

Events never include headers or query strings (a query string can carry a
one-click tracking token). Hook exceptions are swallowed and can never break a
request.

`RestorinoApiError` exposes `status`, `error`, `field`, `requestId`,
`retryAfterMs` and `raw`. `retryAfterMs` is populated from the `Retry-After`
header and is honoured automatically when retrying.

### 4.11 Reference implementation

`examples/vanilla/` contains a runnable, type-checked funnel
(menu → cart → checkout → tracking). Use it as the skeleton: it demonstrates the
correct call *order* and cleanup, not styling.

---

## 5. Enumerations (exact values)

```ts
type DeliveryMethod   = 'delivery' | 'takeout' | 'dine-in';           // request
type OrderType        = 'DELIVERY' | 'TAKEOUT' | 'DINE_IN';           // response
type PaymentMethod    = 'card' | 'cash' | 'paypal' | 'stripe' | 'mobile';

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY'
                 | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'REFUSED'
                 | 'REFUNDED' | 'PENDING_VERIFICATION';

type DeliveryStatus = 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT'
                    | 'DELIVERED' | 'FAILED' | 'CANCELLED';

type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'BLOCKED' | 'MERGED';

type RewardType = 'DISCOUNT' | 'PERCENTAGE' | 'FREE_ITEM' | 'CASHBACK' | 'CUSTOM';

type ReferralStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
```

`PENDING_VERIFICATION` is the normal state of a first cash-on-delivery order — it
is **not** an error and **not** terminal.

---

## 6. Response shapes you will actually render

```ts
CustomerDto:          { id, restaurantId, email, firstName?, lastName?, phone?,
                        isActive, emailVerified, lastLoginAt?, avatar?, createdAt }

OrderResponse:        { id, restaurantId, orderNumber, customerName, customerPhone,
                        customerEmail, customerAddress?, tableNumber?, items,
                        subtotal, tax, deliveryFee, total, currency, status,
                        paymentMethod, paymentStatus, orderType, deliveryMethod?,
                        deliveryAddress?, deliveryInstructions?, cancellationReason?,
                        trackingUrl?, estimatedTime?, estimatedDeliveryTime?,
                        actualDeliveryTime?, source?, createdAt, updatedAt? }

OrderItemResponse:    { id, productId?, productName, quantity, unitPrice, totalPrice,
                        specialInstructions? }

OrderTrackingResponse:{ orderId, orderNumber, status, statusDescription?, orderTime?,
                        estimatedDeliveryTime?, actualDeliveryTime?, totalAmount?,
                        deliveryMethod?, deliveryAddress?, canBeCancelled?,
                        restaurant?: { name, phone?, address? },
                        progress?: Array<{ step, description?, timestamp?, completed? }>,
                        deliveryTracking?: { driverName?, driverPhone?,
                                             currentLatitude?, currentLongitude?, etaMinutes? },
                        contactInfo?: { restaurantPhone?, supportEmail?, supportPhone? } }

PublicTrackingResponse:{ trackingNumber, orderNumber, deliveryStatus, statusDisplayName?,
                         statusDescription?, orderPlacedTime?, estimatedDeliveryTime?,
                         actualDeliveryTime?, deliveryAddress?, driverName?,
                         driverLatitude?, driverLongitude?, restaurantName,
                         restaurantPhone?, restaurantAddress?, totalAmount?, currency?,
                         progressSteps?: Array<{ key, label, completed, current, timestamp? }> }

PublicMenuResponse:   { restaurantId, restaurantName, currency, categories,
                        minimumOrderValue?, deliveryFee?, freeDeliveryThreshold?,
                        paymentMethods?, acceptsOrders? }

PublicCategory:       { id?, categoryId?, slug?, name, description?, displayOrder?,
                        imageUrl?, url?, isActive?, available?, updatedAt?, products? }

PublicProduct:        { id?, categoryId?, slug?, name, description?, url?, price,
                        currency?, imageUrl?, images?, isAvailable?, isFeatured?,
                        isPopular?, preparationTimeMinutes?, allergenInfo?, allergens?,
                        supplements?, garnishes?, sizes?, updatedAt? }

ProductOption:        { id, name, price, isActive? }

RestaurantSearchResponse: { restaurantId, name, description?, cuisineType?, logoUrl?,
                        coverImageUrl?, address?, city?, latitude?, longitude?,
                        distanceKm?, rating?, reviewCount?, priceRange?,
                        minimumOrderAmount?, deliveryFee?, estimatedDeliveryMinutes?,
                        deliveryMethods?, isOpen?, acceptingOrders?, featured?,
                        specialOffer?, openingHours?, phone?, urlSlug?,
                        preparationTimeMinutes?, popularDishes?, paymentMethods?,
                        canDeliver?, nextAvailableSlot? }

PublicVitrineResponse: { restaurantId, name, description?, cuisineType?, logoUrl?,
                        coverImageUrl?, galleryImages?, address?, city?, phone?, email?,
                        location?, menu?, deliveryMethods?, minimumOrderAmount?,
                        deliveryFee?, freeDeliveryThreshold?, estimatedDeliveryMinutes?,
                        preparationTimeMinutes?, isOpen?, acceptingOrders?,
                        openingHours?, specialHours?, averageRating?, totalReviews?,
                        priceRange?, canDeliverToCustomer?, distanceFromCustomer?,
                        deliveryTimeToCustomer?, deliveryFeeToCustomer?, urlSlug?,
                        metaTitle?, metaDescription? }

DeliveryZoneCheckResponse: { canDeliver, deliveryFee, restaurantId?, customerLocation?,
                        estimatedDeliveryTime?, minimumOrderAmount? }

DeliveryEstimateResponse:  { estimatedDeliveryMinutes, deliveryFee, withinDeliveryZone,
                        estimatedDeliveryTime?, distanceKm?, minimumOrderValue?,
                        freeDeliveryApplies?, nextAvailableSlot?, additionalInfo? }

RestaurantStatusResponse:  { isOpen, acceptingOrders, restaurantId?, operatingStatus? }

RestaurantReviewsResponse: { restaurantId, totalReviews, averageRating, reviews[],
                        totalPages, currentPage }   // NOT a Spring Page

SeoMetaTagsResponse:  { tenantId?, baseUrl?, tags: { title?, description?, canonical?,
                        'og:title'?, 'og:description'?, 'og:image'?, 'twitter:card'?,
                        robots?, 'theme-color'?, [key: string]: string | undefined } }

TestimonialResponse:  { id, restaurantId, customerId?, customerName, content, rating,
                        status?, createdAt, approvedAt?, pointsAwarded? }

CustomerOrder:        { id, orderNumber, customerName, customerEmail, customerPhone,
                        customerAddress?, status, orderType, paymentMethod,
                        paymentStatus, total, subtotal, tax, deliveryFee, currency,
                        createdAt, updatedAt?, items: Array<{ id, productId?,
                        productName, quantity, price, totalPrice, specialInstructions? }> }

CustomerNotification: { id, orderId?, title, message, notificationType, isRead,
                        actionButtonText?, actionButtonUrl?, sentAt?, createdAt }

CustomerLoyalty:      { id, totalPoints, availablePoints, lifetimePoints, tier,
                        customerId?, restaurantId?, totalVisits?, totalSpent?,
                        currency?, lastVisit?, tierConfig?, nextTierPointsNeeded?,
                        tierProgressPercentage? }

LoyaltyReward:        { id, name, pointsRequired, rewardType, isActive,
                        restaurantId?, description?, discountAmount?, discountPercentage?,
                        freeProductId?, minOrderAmount?, requiredTier?,
                        maxRedemptionsPerCustomer?, totalAvailable?, totalRedeemed?,
                        validFrom?, validUntil?, imageUrl? }

RedemptionResult:     { rewardId, rewardName, rewardType, discountAmount?,
                        discountPercentage?, freeProductId?, remainingPoints }

CustomerOrderRating:  { id, orderId, customerId, restaurantId, foodQualityRating,
                        deliverySpeedRating, serviceRating, overallRating,
                        reviewText?, restaurantResponse?, respondedAt?, isPublic?,
                        isApproved?, helpfulCount?, createdAt }

ReferralCodeResponse: { referralCode: string; shareUrl: string }
ReferralDashboardResponse: { referrals: ReferralTrackingItem[]; totalReferrals?;
                        completedReferrals?; pendingReferrals?; completedCount?; pendingCount? }
ReferralTrackingItem: { id, referralCode, status, referrerCustomerId?,
                        referredCustomerId?, referrerRewardPoints?,
                        referredRewardPoints?, createdAt?, completedAt? }

PromoValidationResponse: { valid, discount, message?, promoId? }

GoogleReviewInfoResponse:   { enabled, pointsAmount, cooldownDays?, googlePlaceUrl?,
                              minRating?, requirePriorVisit?, maxPointsPerClaim? }
GoogleReviewStatusResponse: { enabled, pointsAmount, canClaim, cooldownDays?,
                              googlePlaceUrl?, reasonCannotClaim?,
                              cooldownDaysRemaining?, activeClaim? }

PublicTableResponse:  { id, restaurantId, tableNumber: number, name?, capacity,
                        status: TableStatus, shape?, floorId?, isActive,
                        tableSessionToken? }

ReservationResponse:  { id, reservationNumber, restaurantId, customerName,
                        customerEmail, customerPhone, numberOfGuests,
                        reservationDate, status: ReservationStatus, specialRequests?,
                        tableId?, tableNumber?, confirmedAt?, cancelledAt?,
                        cancellationReason?, notes?, customerLatitude?,
                        customerLongitude?, customerDistanceMeters?, gpsVerifiedAt?,
                        createdAt, updatedAt? }

Page<T>:              { content: T[]; totalElements; totalPages; size; number;
                        first; last; empty }
```

---

## 7. Recipes

### 7.1 Render the menu
```ts
const menu = await api.orders.getOrderingMenu();       // includes pricing metadata
const categories = menu.categories ?? [];
categories.forEach((c) => (c.products ?? []).forEach(renderProduct));

// `slug` may be undefined on this endpoint (it exposes `categoryId`).
// Only build deep links from `api.vitrine.getCategoryBySlug()` results.
```

### 7.2 Cart + checkout
```ts
const cart = api.calculateCart(items, {
  taxRate: settings.taxRate,
  deliveryFee: estimate?.deliveryFee ?? 0,
  freeDeliveryThreshold: menu.freeDeliveryThreshold,
  minimumOrderAmount: menu.minimumOrderValue,
  enforceMinimumOrder: method !== 'dine-in',
});

if (!cart.meetsMinimumOrder) showError('Minimum de commande non atteint');

const order = await api.orders.placeOrder({
  customerName, customerEmail, customerPhone,
  deliveryMethod: 'delivery',            // 'delivery' | 'takeout' | 'dine-in'
  paymentMethod: 'cash',
  customerLocation: { latitude, longitude, address },
  items: cartItems.map((i) => ({
    productId: i.product.id,
    productName: i.product.name,
    quantity: i.quantity,
    unitPrice: i.product.price,
    totalPrice: i.product.price * i.quantity
      + (i.supplements ?? []).reduce((s, x) => s + x.price * x.quantity, 0),
    supplements: i.supplements,
    specialInstructions: i.notes,
  })),
  orderNotes: notes,
});
// Do NOT send `total`/`tax`: the server recomputes and rejects drift.
```

Dine-in: read `tableSessionToken` from `api.tables.getTableInfo(<uuid>)` and send
`tableNumber` + `tableToken` with `deliveryMethod: 'dine-in'`.

### 7.3 Track an order
```ts
const stop = api.orders.watchOrder(
  order.id,
  { customerEmail, customerPhone },
  (t) => setStatus(t.status),
  { intervalMs: 5000, maxDurationMs: 30 * 60 * 1000 }
);
// call stop() on unmount
```
Terminal statuses: `DELIVERED`, `COMPLETED`, `CANCELLED`, `REFUSED`, `REFUNDED`
(handled internally).

### 7.4 Track a courier
```ts
const stop = api.delivery.watchDelivery(trackingNumber, (d) => {
  setMarker(d.driverLatitude, d.driverLongitude);
  setLabel(d.statusDisplayName ?? d.deliveryStatus);
});
// uses `deliveryStatus`, not `status`
```

### 7.5 Reserve a table
```ts
await api.orders.createReservation({
  customerName, customerPhone, customerEmail,
  numberOfGuests: 4,
  reservationDate: new Date(isoLocal).toISOString().slice(0, 19), // no trailing Z
  customerLatitude: coords?.latitude,
  customerLongitude: coords?.longitude,
});
```

### 7.6 Customer account
```ts
await api.auth.login({ email, password });        // no token returned
const me = await api.auth.getMe();                // source of truth
const orders = await api.customer.getOrders(0, 10);
await api.customer.submitTestimonial({ rating: 5, content: 'Excellent repas…' });
```

### 7.7 Loyalty
```ts
const status = await api.loyalty.getStatus();
const rewards = await api.loyalty.getRewards();    // reward.pointsRequired
const result = await api.loyalty.redeemReward(rewards[0].id);
setPoints(result.remainingPoints);                 // 2xx == success
```

### 7.8 Voice agent
```ts
import { createPcmPlayer } from '@restorino/sdk';

const player = createPcmPlayer();            // mono, 24 kHz by default

const session = await api.liveAgent.connect({
  restaurantSlug: slug,
  onStatusChange: setAgentStatus,
  onTranscript: (role, text) => appendMessage(role, text),
  onClientAction: (action) => setPendingAction(action),
  onAudioMeta: (meta) => player.updateSampleRate(meta.sampleRate),
  onAudio: (chunk) => player.enqueue(chunk),
});

// when the user accepts a proposed action:
session.confirmAction(pendingAction.actionId!);

// cleanup
session.disconnect();
player.close();   // libère l'AudioContext (les navigateurs en plafonnent ~6)
```

### 7.9 SEO head tags
```ts
const seo = await api.vitrine.getSeoMeta(slug);
const tags = seo.tags ?? {};
document.title = tags.title ?? restaurant.name;
setMeta('description', tags.description);
setLink('canonical', tags.canonical);
setMeta('og:image', tags['og:image'], 'property');
```

---

## 8. Error handling

```ts
import { RestorinoApiError } from '@restorino/sdk';

try {
  await api.orders.placeOrder(payload);
} catch (err) {
  if (err instanceof RestorinoApiError) {
    switch (err.status) {
      case 400: return showFieldErrors(err.field, err.message);
      case 401: return redirectToLogin();
      case 402: return showPlanRequired();
      case 403: return showForbidden();
      case 404: return showNotFound();
      case 409: return showConflict(err.message);   // duplicate / already terminal
      case 429: return showTooManyRequests();       // back off, do not auto-retry
      default:  return showGenericError(err.message);
    }
  }
  throw err;
}
```

SDK-local errors worth handling explicitly: `MISSING_RESTAURANT_ID`,
`INVALID_TABLE_ID`, `INVALID_RESTAURANT_ID`, `MISSING_ADDRESS`,
`REFRESH_FAILED`, `INVALID_RESPONSE`, `NETWORK_ERROR`, `REQUEST_TIMEOUT`.

Include `err.requestId` in the user-facing message when present — it maps
directly to a backend log line and is the fastest path to support.

---

## 9. Names that DO NOT exist (common hallucinations)

If you are about to write the left column, write the right one instead.

| ❌ Do not use | ✅ Use |
|---|---|
| `order.orderType` in a request | `order.deliveryMethod` (`'delivery' \| 'takeout' \| 'dine-in'`) |
| `paymentMethod: 'CASH' / 'CARD_ONLINE'` | `'cash' / 'card'` |
| `deliveryLocation`, `street` | `customerLocation`, `address` |
| item `supplementIds: string[]` | `supplements: [{ supplementId, supplementName, price, quantity }]` |
| item without `totalPrice` | `totalPrice` is mandatory |
| `order.totalAmount`, `subtotalAmount`, `discountAmount` | `total`, `subtotal`, `discount` |
| `order.trackingToken` | parse the token from `order.trackingUrl` |
| `order.status === 'REJECTED'` (reservation) | `'NO_SHOW' / 'COMPLETED'` |
| delivery `tracking.status` | `tracking.deliveryStatus` |
| delivery `status: 'ACCEPTED' / 'OUT_FOR_DELIVERY'` | `'ASSIGNED' / 'IN_TRANSIT'` |
| `restaurant.id` (vitrine) | `restaurant.restaurantId` |
| `restaurant.cuisines[]` | `restaurant.cuisineType` |
| `restaurant.bannerUrl` | `restaurant.coverImageUrl` |
| `seo.ogImage`, `seo.canonicalUrl` | `seo.tags['og:image']`, `seo.tags.canonical` |
| `search({ query, cuisine })` | `search({ searchTerm, cuisineType })` |
| `reviews.content` (Page) | `reviews.reviews` (array) |
| `rating.averageRating` | `rating.overallRating` |
| `reward.pointsCost`, `reward.discountValue` | `reward.pointsRequired`, `discountAmount`/`discountPercentage` |
| `RewardType 'DISCOUNT_FIXED' / 'GIFT'` | `'DISCOUNT' / 'CASHBACK' / 'CUSTOM'` |
| `redemption.success`, `redemption.promoCode` | HTTP 2xx + `remainingPoints` |
| `testimonial.comment` | `testimonial.content` |
| `notification.type / read / actionUrl` | `notificationType / isRead / actionButtonUrl` |
| `table.tableNumber === '5'` | `table.tableNumber === 5` (number) |
| `reservation.partySize` / `reservationTime` | `numberOfGuests` / ISO `reservationDate` |
| `loyalty.getLoyaltyAccount()` | `api.loyalty.getStatus()` |
| `orders.validatePromo()` | `api.customer.validatePromoCode()` |
| `vitrine.getConfig()` (admin, RESTAURANT_ADMIN) | `api.vitrine.getPublicConfig()` |
| `vitrine.getTemplates()` (site builder) | — removed, out of scope |
| `vitrine.validateApiKey()` (key management) | — removed, out of scope |
| `apiKey` / `X-API-Key` in config | — removed, cookie auth only |
| `confirmPasswordReset(token, newPassword)` | `confirmPasswordReset({ email, resetCode, newPassword })` |
| `login().token` | cookie session; call `getMe()` |
| `storageType: 'localStorage'` | omit it |
| `liveAgent.connect()` then `session.sendText()` immediately | wait for `CONNECTED` |

---

## 10. Definition of done

Before shipping the generated app, verify every line:

- [ ] `new RestorinoClient` has `credentials: 'include'` and **no** API key.
- [ ] Every call targets the storefront/customer surface (§0 rule 6); nothing
      reaches admin, POS, driver or staff.
- [ ] Login flow never reads `response.token`; session checks use `getMe()`.
- [ ] No token is written to `localStorage` / `sessionStorage`.
- [ ] Every call is on the §4 list; `grep` the code for the §9 left column and remove all hits.
- [ ] Order payload uses `deliveryMethod`, lowercase `paymentMethod`, and item `totalPrice`.
- [ ] No `total` / `tax` is sent on order creation.
- [ ] `restaurantId` is a UUID everywhere.
- [ ] Terminal order/delivery statuses match §5; `PENDING_VERIFICATION` is shown as "awaiting confirmation", not an error.
- [ ] Polling watchers are stopped on unmount.
- [ ] `RestorinoApiError` is handled for 400/401/403/409/429.
- [ ] Live Agent waits for `CONNECTED`, calls `confirmAction(actionId)`, and
      plays audio through `createPcmPlayer()` (never a hardcoded 16 kHz).
- [ ] `examples/vanilla/` was used as the structural skeleton.
- [ ] Errors display `err.requestId` when present.

If a checklist item cannot be satisfied with the §4 API, the feature is not
supported — surface that to the user instead of inventing an endpoint.
