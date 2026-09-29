# 🚀 Lovable.dev Master Prompt & Implementation Blueprint

Ce guide contient le **Prompt Maître prêt à copier-coller** dans [Lovable.dev](https://lovable.dev) (ou v0 / Bolt / Claude Artifacts) pour générer instantanément une application frontend complète, moderne et responsive pour le Storefront et l'Espace Client Restorino.

---

## 📋 Étape 1 : Intégration du SDK dans Lovable

1. Créez un nouveau projet dans **Lovable.dev**.
2. Créez un fichier `src/lib/restorino-sdk.ts`.
3. Copiez-collez l'intégralité du contenu du fichier bundle généré :  
   `sdk-ts/dist-bundle/restorino-sdk.ts`
4. Créez le fichier de configuration `src/lib/api.ts` suivant :

```typescript
// src/lib/api.ts
import { RestorinoClient } from './restorino-sdk';

export const api = new RestorinoClient({
  baseUrl: import.meta.env.VITE_RESTORINO_API_URL || 'http://localhost:8080',
  restaurantId: import.meta.env.VITE_RESTAURANT_ID,
  tenantId: import.meta.env.VITE_TENANT_ID,
  storageType: 'localStorage',
  onTokenExpired: () => {
    // Redirection automatique vers la page de connexion si la session expire
    window.location.href = '/login?expired=true';
  },
});
```

Configurez votre `.env` :
```env
VITE_RESTORINO_API_URL=http://localhost:8080
VITE_RESTAURANT_ID=00000000-0000-0000-0000-000000000001
VITE_TENANT_ID=00000000-0000-0000-0000-000000000001
```

---

## 🤖 Étape 2 : Le Master Prompt Lovable (À copier-coller)

Copiez le texte ci-dessous et collez-le directement dans le chat de Lovable.dev :

```markdown
Build a world-class, ultra-modern, responsive Restaurant Storefront & Customer Dashboard web application in React, TypeScript, Tailwind CSS, Lucide Icons, and shadcn/ui components.

### 📦 Backend & Data Layer Integration
The backend is already implemented and exposed via a local TypeScript SDK located at `@/lib/api` (instance of `RestorinoClient`).
DO NOT mock network calls. Always import `api` from `@/lib/api` to fetch and mutate real data.

The SDK exposes:
- `api.vitrine`:
  - `getRestaurant(restaurantId)`: Info, logo, banner, cuisines, opening hours, currencies.
  - `getMenu(restaurantId)`: Full categories and products with supplements, garnishes, allergens.
  - `checkDeliveryZone(lat, lng)`: Real-time GPS eligibility for delivery.
  - `getStatus(restaurantId)`: Open/closed status badge.
  - `getReviews(restaurantId)`: Verified customer ratings.
  - `search(filter)`: Multi-criteria restaurant search.
  - `getPopular()`: Popular restaurants.
  - `getCuisines()`: Available cuisine types.
  - `getCategoryBySlug(slug)`: Category by SEO slug.
  - `getProductBySlug(categorySlug, productSlug)`: Product by SEO slug.
  - `getSeoMeta()`: Homepage SEO meta tags.
  - `getCategorySeoMeta(categorySlug)`: Category SEO meta tags.
  - `getProductSeoMeta(productSlug)`: Product SEO meta tags.
  - `getTestimonialsBySubdomain(subdomain)`: Testimonials by vitrine subdomain.
- `api.orders`:
  - `placeOrder(orderPayload)`: Supports DELIVERY, TAKEAWAY, and DINE_IN.
  - `estimateDelivery(customerLocation)`: Calculates delivery fee and ETA.
  - `trackOrder(orderId, { customerEmail, customerPhone })`: Real-time order preparation and status (with 2-factor anti-IDOR verification).
  - `trackOrderByToken(token)`: One-click tracking via signed SMS/email link.
  - `getOrderingMenu(restaurantId)`: Menu for order placement page.
  - `getSettings(restaurantId)`: Public restaurant settings (tax, colors, currency).
  - `cancelOrder(orderId, { customerEmail, customerPhone, reason })`: Cancel pending order with verification.
  - `createReservation(reservation)`: Online table reservations.
  - `trackReservation(reservationNumber, { customerEmail, customerPhone })`: Reservation status tracking with verification.
  - `cancelReservation(reservationNumber, { customerEmail, customerPhone, reason })`: Cancel a reservation with verification.
- `api.delivery`:
  - `track(trackingNumber)`: Live tracking of courier with GPS, phone, and ETA.
- `api.auth`:
  - `login({ email, password })`: Authenticates customer and stores JWT.
  - `loginWithGoogle({ googleToken })`: Google Sign-In authentication and auto-registration.
  - `register({ email, password, firstName, lastName, phone, referralCode })`: Account creation.
  - `getMe()`: Current customer info & loyalty tier summary.
  - `logout()`: Clears session.
  - `changePassword({ currentPassword, newPassword })`: Update password.
  - `requestEmailVerification()`: Send verification email.
  - `verifyEmail(token)`: Verify email address.
  - `requestPasswordReset(email)`: Forgot password flow.
  - `confirmPasswordReset(token, newPassword)`: Confirm password reset.
- `api.customer`:
  - `getProfile()`, `updateProfile()`: Personal customer info.
  - `getOrders()`: Order history with reorder action and rating modal.
  - `rateOrder(orderId, rating)`: 1-5 stars for food quality, delivery speed, service + review text.
  - `getMyRatings()`: Past ratings.
  - `getReferralCode()`, `getReferrals()`: Unique referral code, share link, list of referred friends and points earned.
  - `applyReferralCode(code)`: Apply a friend's referral code.
  - `submitTestimonial(data)`: Submit restaurant reviews.
  - `getMyTestimonials()`: Customer's own testimonials.
  - `validatePromoCode(code, cartTotal)`: Validate promo code.
  - `getNotifications()`: In-app notifications inbox.
  - `getUnreadNotificationCount()`: Unread badge count.
  - `markNotificationRead(id)`: Mark single notification read.
  - `markAllNotificationsRead()`: Mark all as read.
  - `getMenuCategories()`: Menu categories for authenticated customer's restaurant.
  - `getMenuProducts(categoryId?)`: Menu products list.
  - `getMenuProduct(productId)`: Single product details.
  - `getMenuSupplements()`, `getMenuGarnishes()`, `getMenuBeverages()`: Supplements, garnishes, and drinks.
- `api.loyalty`:
  - `getStatus()`: Points balance, current tier (`BRONZE` / `SILVER` / `GOLD` / `PLATINUM`), and progress percentage to the next tier.
  - `getRewards()`: Redeemable rewards catalog.
  - `redeemReward(rewardId)`: Redeem reward for a discount code.
  - `getGoogleReviewInfo()`: Reward points offered for leaving a Google review.
  - `getGoogleReviewStatus()`: Check if customer is eligible to claim points for a review.
  - `claimGoogleReview({ reviewerName, rating, reviewComment })`: Claim points.
  - `uploadGoogleReviewProof(file)`: Upload review screenshot proof.
- `api.tables`:
  - `getTableInfo(tableId)`: Table number, capacity, and active session from QR code.
- `api.tv`:
  - `getScreenData(screenCode)`: Kitchen display orders (preparing / ready) and banners.
  - `ping(screenCode)`: Display heartbeat.
- `api.liveAgent`:
  - `connect({ restaurantSlug, onTranscript, onAudio, onClientAction, onStatusChange, onInterrupted })`: Interactive bidirectional voice/chat culinary assistant powered by Gemini Live. Supports voice ordering (`ADD_TO_CART` client actions) and dish recommendations directly on the storefront. categories (authenticated, scoped to customer's restaurant).
  - `getMenuProducts(categoryId?)`: Menu products with optional category filter.
  - `getMenuProduct(productId)`: Single product details.
- `api.loyalty`:
  - `getLoyaltyAccount()`: Available points, current tier (Bronze, Silver, Gold, Platinum), progress bar to next tier.
  - `getRewards()`: Catalog of redeemable rewards (free dishes, discounts).
  - `redeemReward(rewardId)`: Exchange points for instant coupon code.
  - `getGoogleReviewInfo()`: Check review reward eligibility and points value.
  - `getGoogleReviewStatus()`: Check existing review claim status.
  - `submitGoogleReviewClaim(proofUrl)`: Claim bonus loyalty points for leaving a Google review.
  - `uploadGoogleReviewProof(file)`: Upload screenshot proof of Google review.
- `api.tables`:
  - `getTableInfo(restaurantId, tableId)`: For QR code Dine-in ordering.
- `api.tv`:
  - `getScreenData(screenCode)`: Get dynamic display data for a restaurant TV/Kiosk screen.
  - `ping(screenCode)`: Keepalive signal for active TV screens.

---

### 🎨 Design & UX Aesthetics
- **Theme**: Premium gastronomic modern design. Warm culinary colors (slate-900 background or clean white with rich amber/emerald accents, soft borders, subtle glassmorphism).
- **Typography**: Clean modern sans-serif (Inter / Plus Jakarta Sans) with generous line heights.
- **States**: Skeleton loaders for menus, error states with retry buttons, optimistic toast notifications (Sonner).
- **Mobile First**: Fully responsive with sticky bottom cart drawer on mobile.

---

### 📱 Pages & User Flows to Build

1. **Top Navigation Bar**:
   - Restaurant Name & Logo.
   - Status Badge (🟢 Open now / 🔴 Closed).
   - Search bar with live autocomplete on dishes.
   - Order Type Switcher (Delivery 🛵 / Takeaway 🥡 / Dine-in 🍽️).
   - Cart Trigger with item count and subtotal badge.
   - Auth Button (Login / Register modal or Customer Avatar dropdown if logged in).

2. **Storefront Home (`/`)**:
   - Hero banner with restaurant presentation, average rating stars, tags (cuisines), address, and operating hours.
   - Sticky Category Navigation Bar (e.g., Burgers, Pizzas, Drinks, Desserts) with smooth scrolling.
   - Product Grid:
     - High quality food cards with image, price, allergen chips, "Popular" badges.
     - "Add to cart" button opening the **Product Customization Modal** (selection of size, paid supplements/garnishes checkboxes, special instructions textarea, quantity stepper).

3. **Cart & Slide-over Checkout Drawer**:
   - Itemized cart list with customization summaries and quantity +/- controls.
   - Delivery Method Selector:
     - **Delivery**: Address input with autocomplete, apartment/floor details, and GPS delivery zone check.
     - **Takeaway**: Pickup time estimation.
     - **Dine-In**: Table number input (automatically filled if arrived from QR code).
   - Promo Code Input with instant discount feedback (`api.orders.validatePromo`).
   - Price Breakdown: Subtotal, Delivery Fee, Discount, Total.
   - Payment Selector (Cash on delivery / Card online / Meal vouchers).
   - "Confirm & Place Order" button -> Redirects to Order Tracking.

4. **Live Order Tracking Page (`/order/:orderId/track`)**:
   - Step progress bar: *Order Placed* ➔ *In the Kitchen* ➔ *Out for Delivery* ➔ *Delivered*.
   - Live Delivery Courier card (Courier name, phone number, vehicle, live GPS marker representation, and dynamic ETA in minutes).
   - Full order receipt recap and customer support contact.

5. **Customer Dashboard (`/account`)**:
   - Protected route (redirects to `/login` if not authenticated).
   - Sidebar tabs:
     - **Profile**: Edit first name, last name, phone, and change password.
     - **Orders History**: Past orders list with status, date, item summary, "Reorder" quick action, and "Rate Order" button (triggering 3-criteria rating modal).
     - **Loyalty & Rewards**:
       - Big visual loyalty card with customer tier (BRONZE / SILVER / GOLD / PLATINUM), total points balance, and animated progress bar to the next tier.
       - Rewards catalog grid with "Redeem" button (confirms and deducts points).
       - "Earn +50 Points with Google Review" banner with direct link and claim form.
     - **Referrals**:
       - Personalized referral code and "Copy Link" button.
       - Stats summary: Total friends referred, points earned.
       - Table of referred contacts and reward statuses.
     - **Notifications Inbox**:
       - Unread badge counter, promotion broadcasts, order updates with "Mark as read" option.

6. **QR Code Dine-In Mode (`/table/:tableId`)**:
   - Pre-configures the checkout session in `DINE_IN` mode with the scanned `tableNumber`.
   - Displays a welcoming banner: "Welcome to Table #X! Order directly from your phone".

7. **Floating AI Culinary Voice Assistant Widget (`api.liveAgent`)**:
   - Floating microphone button in the bottom right corner of the storefront.
   - Click to start a live voice conversation (`api.liveAgent.connect({ restaurantSlug })`).
   - Displays an animated audio pulse wave indicating status (*Listening* 🎙️ / *Thinking* 🧠 / *Speaking* 🔊).
   - Live speech transcript captions showing user voice input and assistant culinary advice.
   - Automatically handles `onClientAction` events (e.g. `ADD_TO_CART`) to automatically populate the cart drawer when the user orders vocally.

Ensure zero TypeScript errors, clean modular components in `src/components/`, and graceful handling of empty or error states.
```

---

## 🛠️ Exemples de Composants Prêts pour Lovable

### 1. Initialiser le Panier et Passer Commande

```tsx
// src/components/checkout/CheckoutButton.tsx
import React, { useState } from 'react';
import { api } from '@/lib/api';
import { VitrineOrderRequest } from '@/lib/restorino-sdk';
import { toast } from 'sonner';

export const CheckoutButton = ({ orderPayload }: { orderPayload: VitrineOrderRequest }) => {
  const [loading, setLoading] = useState(false);

  const handlePlaceOrder = async () => {
    try {
      setLoading(true);
      const order = await api.orders.placeOrder(orderPayload);
      toast.success(`Commande #${order.orderNumber} confirmée avec succès !`);
      window.location.href = `/order/${order.id}/track`;
    } catch (err: any) {
      toast.error(err.message || 'Impossible de valider la commande');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePlaceOrder}
      disabled={loading}
      className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition"
    >
      {loading ? 'Validation en cours...' : 'Confirmer la commande'}
    </button>
  );
};
```

### 2. Afficher la Carte de Fidélité Client

```tsx
// src/components/loyalty/LoyaltyCard.tsx
import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { CustomerLoyalty } from '@/lib/restorino-sdk';

export const LoyaltyCard = () => {
  const [loyalty, setLoyalty] = useState<CustomerLoyalty | null>(null);

  useEffect(() => {
    api.loyalty.getLoyaltyAccount()
      .then(setLoyalty)
      .catch(console.error);
  }, []);

  if (!loyalty) return <div className="animate-pulse h-48 bg-slate-800 rounded-2xl" />;

  return (
    <div className="bg-gradient-to-tr from-amber-600 to-amber-900 text-white p-6 rounded-2xl shadow-xl">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs uppercase tracking-wider text-amber-200">Statut Client</span>
          <h3 className="text-2xl font-bold">{loyalty.tier}</h3>
        </div>
        <div className="text-right">
          <span className="text-3xl font-extrabold">{loyalty.availablePoints}</span>
          <p className="text-xs text-amber-200">Points disponibles</p>
        </div>
      </div>
      <div className="mt-6">
        <div className="flex justify-between text-xs mb-1">
          <span>Progression</span>
          <span>{loyalty.tierProgressPercentage || 0}%</span>
        </div>
        <div className="w-full bg-black/30 h-2 rounded-full overflow-hidden">
          <div
            className="bg-white h-full transition-all duration-500"
            style={{ width: `${loyalty.tierProgressPercentage || 0}%` }}
          />
        </div>
      </div>
    </div>
  );
};
```
