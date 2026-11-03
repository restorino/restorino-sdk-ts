# Reference implementation — vanilla TypeScript

The smallest complete ordering funnel, using only methods that exist in the SDK:

```
load menu → add to cart → checkout → watch order status
```

It is deliberately framework-free: the *sequencing* is what transfers to React,
Vue or Svelte, not the DOM code.

## Run it

```bash
cd sdk-ts

VITE_RESTORINO_API_URL=http://localhost:8080 \
VITE_RESTAURANT_ID=<restaurant-uuid> \
npx vite examples/vanilla
```

## Type-check it

```bash
npm run typecheck:examples
```

## What to copy into a generated app

| Concern | File / section | Rule |
|---|---|---|
| Client setup | top of `main.ts` | `credentials: 'include'`, no `apiKey`, no `storageType` |
| Menu | `loadMenu()` | `orders.getOrderingMenu()`; `category.slug` may be `undefined` |
| Cart | `renderCart()` | local math is an **estimate**; never submit `total`/`tax` |
| Checkout | `checkout()` | `deliveryMethod` lowercase; item `totalPrice` required |
| Tracking | `startTracking()` | returns a stop function — call it on unmount |
| Errors | `showError()` | surface `error.requestId` for support |
| Cleanup | `pagehide` listener | stop polling; it is bounded anyway (30 min / 5 errors) |

## What this example deliberately does NOT do

- No auth flow (see `LOVABLE_PROMPT.md` §3/§7.6 — login returns **no token**).
- No live agent (`§7.8`) — it needs microphone permission and a confirm step.
- No payment capture — `paymentMethod: 'cash'` keeps the funnel single-step.
