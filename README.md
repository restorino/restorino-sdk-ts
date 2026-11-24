# Restorino TypeScript SDK (`@restorino/sdk`)

[![npm version](https://img.shields.io/npm/v/@restorino/sdk.svg?style=flat-square&color=0070F3)](https://www.npmjs.com/package/@restorino/sdk)
[![npm downloads](https://img.shields.io/npm/dm/@restorino/sdk.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/@restorino/sdk)
[![license](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24.22.3-green.svg?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Lovable Ready](https://img.shields.io/badge/Lovable.dev-Ready-ff4081.svg?style=flat-square)](https://lovable.dev)
[![Provenance: Sigstore](https://img.shields.io/badge/Provenance-Sigstore%20Verified-informational.svg?style=flat-square)](https://search.sigstore.dev)

> **The Official TypeScript & JavaScript SDK for the Restorino Restaurant SaaS Platform.**
> Build high-conversion restaurant storefronts, digital QR menus, food delivery ordering flows, table booking, loyalty portals, and interactive AI voice assistants with Next.js, React, Vite, or Lovable.dev.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Quick Installation](#-quick-installation)
- [Architecture & Modules](#-architecture--modules)
- [Code Examples](#-code-examples)
  - [1. Initialize Client](#1-initialize-client)
  - [2. Fetch Digital Menus & Categories](#2-fetch-digital-menus--categories)
  - [3. Online Food Ordering (Delivery, Takeaway, Dine-in QR)](#3-online-food-ordering)
  - [4. Customer Authentication & Profile](#4-customer-authentication--profile)
  - [5. Loyalty Rewards & Points](#5-loyalty-rewards--points)
  - [6. Real-Time Courier Tracking](#6-real-time-courier-tracking)
  - [7. AI Live Culinary Assistant (Gemini Voice & Chat)](#7-ai-live-culinary-assistant-gemini-voice--chat)
- [Zero-Dependency Standalone Bundle (Lovable.dev / v0 / Bolt)](#-zero-dependency-standalone-bundle)
- [Security & Scope Boundary](#-security--scope-boundary)
- [TypeScript Support](#-typescript-support)
- [Contributing & Testing](#-contributing--testing)
- [License](#-license)

---

## 🚀 Overview

**`@restorino/sdk`** provides a complete, strongly-typed interface to connect any modern web or mobile app to Restorino's restaurant backend API. Designed with a strict focus on public storefronts, customer self-service portals, and headless restaurant experiences, it handles:

- 🍕 **Digital Menus & Items**: Catalogs, categories, modifiers, allergens, and daypart pricing.
- 🛵 **Multi-Channel Ordering**: Delivery, Takeaway (Click & Collect), and In-restaurant QR Ordering.
- 📅 **Table Reservations**: Real-time table booking and capacity estimation.
- ⭐ **Loyalty & Referral Programs**: Automated point rewards, tiers (Bronze/Silver/Gold/Platinum), and Google Review incentives.
- 📍 **Live Courier Telemetry**: Real-time GPS driver tracking and delivery status transitions.
- 🎙️ **Interactive AI Voice Agent**: Low-latency bidirectional voice and action dispatch powered by Google Gemini Live WebSockets.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| **Fully Typed (TypeScript)** | Autocomplete, strict input/output DTOs, and compile-time contract safety. |
| **Dual Build (ESM + CJS)** | Compatible with Next.js (App & Pages Router), Vite, Remix, Astro, Node.js, and browser environments. |
| **Zero External Runtime Dependencies** | Lightweight footprint (`160 kB` packaged) with zero bloated third-party dependencies. |
| **1-File Standalone Bundle** | Single-file zero-install export (`dist-bundle/restorino-sdk.ts`) for AI visual site builders (**Lovable.dev**, **v0.dev**, **Bolt.new**). |
| **Built-in Resilience** | Exponential backoff, jittered retries on 503/network failure, and automatic 401 token refresh. |
| **Enterprise Security Sandbox** | Client-side allowlist preventing path traversal, SSRF, CRLF header injection, and unauthorized admin API calls. |

---

## 📦 Quick Installation

Install via your preferred package manager:

```bash
# pnpm (recommended)
pnpm add @restorino/sdk

# npm
npm install @restorino/sdk

# yarn
yarn add @restorino/sdk

# bun
bun add @restorino/sdk
```

---

## 🏛️ Architecture & Modules

The SDK is organized into intuitive, strongly-typed namespaces accessible from the root client instance:

| Module | Namespace | Purpose | Auth Required |
| :--- | :--- | :--- | :---: |
| **Vitrine & Menus** | `client.vitrine.*` | Restaurant discovery, menus, categories, dishes, testimonials, hours | ❌ Public |
| **Orders** | `client.orders.*` | Online orders (Delivery, Takeaway, Dine-in), delivery fee estimates, table reservations | ❌ Public |
| **Delivery & Tracking**| `client.delivery.*` | Real-time driver GPS tracking, ETA calculation, delivery milestone events | ❌ Public |
| **QR Code Dine-In** | `client.tables.*` | QR table scan, on-site ordering, waiter call triggers | ❌ Public |
| **Customer Auth** | `client.auth.*` | Registration, login, Google Sign-In, password recovery, session handling | ❌ Public / 🔐 Session |
| **Customer Portal** | `client.customer.*` | Order history, profile management, coupon validation, favorite items, reviews | 🔐 Customer Session |
| **Loyalty & Rewards** | `client.loyalty.*` | Point balance, tier milestones, reward catalog redemption, Google review rewards | 🔐 Customer Session |
| **AI Voice Assistant** | `client.liveAgent.*` | Real-time interactive culinary advisor via Gemini Live WebSocket audio | ❌ Public |

---

## 💻 Code Examples

### 1. Initialize Client

```typescript
import { RestorinoClient } from '@restorino/sdk';

export const restorino = new RestorinoClient({
  baseUrl: process.env.NEXT_PUBLIC_RESTORINO_API_URL || 'https://api.restorino.com',
  restaurantId: '1b9081bd-738a-4dbe-8089-0f3726741618',
  tenantId: '58853078-566b-4729-b9a5-1290f93fccec',
  credentials: 'include',     // Uses secure HttpOnly cookies by default
  autoRefreshToken: true,    // Transparently refreshes access tokens on 401
  retries: 2,                // Retries transient 503 or network errors
});
```

---

### 2. Fetch Digital Menus & Categories

```typescript
// Fetch full menu by restaurant slug
const menu = await restorino.vitrine.getMenu('le-bistro-gourmet');

console.log(`Restaurant: ${menu.restaurantName}`);
menu.categories.forEach((category) => {
  console.log(`\n--- ${category.name} ---`);
  category.products.forEach((product) => {
    console.log(`${product.name} - ${product.price}€`);
    if (product.allergens?.length) {
      console.log(`  Allergens: ${product.allergens.join(', ')}`);
    }
  });
});
```

---

### 3. Online Food Ordering

Supports **Delivery**, **Takeaway**, and **Dine-in (QR Code)**:

```typescript
const order = await restorino.orders.placeOrder({
  customerName: 'Alexandre Dumas',
  customerPhone: '+33612345678',
  customerEmail: 'alexandre@example.com',
  orderType: 'DELIVERY',
  paymentMethod: 'CARD_ONLINE',
  deliveryLocation: {
    street: '15 Boulevard Saint-Germain',
    city: 'Paris',
    postalCode: '75005',
    latitude: 48.8512,
    longitude: 2.3518,
  },
  items: [
    {
      productId: 'prod-truffle-burger-id',
      productName: 'Truffle Angus Burger',
      quantity: 2,
      unitPrice: 18.50,
      supplementIds: ['supp-extra-cheddar-id'],
      notes: 'No pickles please',
    },
  ],
});

console.log(`Order confirmed! Tracking Code: ${order.orderNumber}`);
```

---

### 4. Customer Authentication & Profile

```typescript
// Email & Password login
await restorino.auth.login({
  email: 'customer@example.com',
  password: 'SecurePassword123!',
});

// Or 1-Click Google Sign-In
await restorino.auth.loginWithGoogle({
  googleToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
});

// Fetch customer order history
const orders = await restorino.customer.getOrderHistory();
console.log(`Total orders placed: ${orders.length}`);
```

---

### 5. Loyalty Rewards & Points

```typescript
// Check loyalty status and rewards
const status = await restorino.loyalty.getStatus();

console.log(`Current Tier: ${status.tier}`); // 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
console.log(`Available Points: ${status.availablePoints}`);

// Redeem a reward
if (status.availablePoints >= 100) {
  await restorino.loyalty.redeemReward('reward-free-dessert-id');
  console.log('Reward successfully redeemed!');
}
```

---

### 6. Real-Time Courier Tracking

```typescript
// Track courier GPS coordinates and delivery status
const tracking = await restorino.delivery.track('TRK-987654');

console.log(`Status: ${tracking.status}`); // 'PENDING' | 'PREPARING' | 'IN_TRANSIT' | 'DELIVERED'
console.log(`Courier Coordinates: ${tracking.driverLocation.latitude}, ${tracking.driverLocation.longitude}`);
console.log(`Estimated Arrival: ${tracking.estimatedDeliveryMinutes} mins`);
```

---

### 7. AI Live Culinary Assistant (Gemini Voice & Chat)

Connect a real-time conversational AI sommelier and voice waiter directly to your frontend:

```typescript
const liveSession = await restorino.liveAgent.connect({
  restaurantSlug: 'le-bistro-gourmet',
  onTranscript: (role, text) => {
    console.log(`${role === 'user' ? 'Guest' : 'Chef AI'}: ${text}`);
  },
  onAudio: (pcmAudioChunk) => {
    // Stream output audio to web AudioContext (16kHz PCM)
    audioPlayer.feed(pcmAudioChunk);
  },
  onClientAction: (action) => {
    // AI autonomously adds recommended items to the cart
    if (action.action === 'ACTION_CART_ADD' || action.action === 'ADD_TO_CART') {
      cartStore.addItem(action.payload);
    }
  },
});

// Ask natural questions
liveSession.sendText("What vegetarian wine pairings do you recommend for tonight's dinner?");
```

---

## ⚡ Zero-Dependency Standalone Bundle

Building with visual AI web builders (**Lovable.dev**, **v0.dev**, **Bolt.new**)? 

You do **not** even need `npm install`. Use our bundled standalone file:
👉 **[`dist-bundle/restorino-sdk.ts`](./dist-bundle/restorino-sdk.ts)**

Copy this single file into your project at `src/lib/restorino-sdk.ts` and import directly:
```typescript
import { RestorinoClient } from './lib/restorino-sdk';
```

- Complete 1-Shot Lovable Prompt: [`LOVABLE_1SHOT_PROMPT.txt`](./LOVABLE_1SHOT_PROMPT.txt)
- LLM API Specification: [`llms.txt`](./llms.txt)

---

## 🔒 Security & Scope Boundary

Restorino SDK enforces strict runtime sandboxing to prevent security vulnerabilities:

1. **HttpOnly Cookie Architecture**: Tokens are stored in browser `HttpOnly; Secure; SameSite=Strict` cookies by default, preventing XSS token theft.
2. **Double-Submit CSRF Protection**: Automatically converts `XSRF-TOKEN` cookie into `X-XSRF-TOKEN` request header for mutating calls.
3. **SSRF & Path Traversal Prevention**: Sanitizes all query parameters and validates `baseUrl` against dangerous schemes (`javascript:`, `data:`, `file:`, `//evil.com`).
4. **Strict Scope Allowlist**: Administrative, Cashier (POS), and Staff endpoints are blocked client-side (`OUT_OF_SCOPE_ENDPOINT`) to safeguard platform isolation.

---

## 🛠️ TypeScript Support

Written in strict TypeScript 5.6. All request and response structures are fully exported:

```typescript
import type {
  MenuItem,
  Category,
  CreateOrderRequest,
  OrderResponse,
  LoyaltyStatus,
  DeliveryTrackingResponse,
  LiveAgentAction,
} from '@restorino/sdk';
```

---

## 🧪 Contributing & Development

```bash
# Clone the repository
git clone https://github.com/restorino/restorino-sdk-ts.git
cd restorino-sdk-ts

# Install dependencies
pnpm install

# Run TypeScript typechecks
pnpm run typecheck

# Run test suite (unit, contract, security, packaging)
pnpm test

# Build CJS, ESM and Single-file bundles
pnpm run build
```

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for more information.

Maintained with ❤️ by the **[Restorino Team](https://restorino.com)**.

