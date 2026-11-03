# @restorino/sdk — TypeScript SDK pour Storefront & Espace Client

SDK officiel TypeScript pour intégrer l'API **Restorino Restaurant SaaS** dans vos applications frontend (**Lovable.dev**, **v0**, **Bolt**, **Next.js**, **Vite / React**).

---

## ⚡ Prise en main ultra-rapide avec Lovable.dev

Le SDK est disponible en **fichier unique autonome** (Zero-Dependency) :
👉 [`dist-bundle/restorino-sdk.ts`](./dist-bundle/restorino-sdk.ts)

---

## 🎯 Périmètre Exclusif : Vitrines & Sites Storefront

Ce SDK est **strictement conçu et limité** aux sites vitrines publics, tunnels de commande en ligne et espaces clients finaux :
- ✅ **Visiteurs anonymes** : Découverte du restaurant, consultation des cartes & menus, vérification de zone de livraison, SEO & réseaux sociaux.
- ✅ **Clients en ligne** : Passage de commande (Livraison, À emporter, À table via QR code), estimation des frais, réservation de table.
- ✅ **Comptes clients (`ROLE_CUSTOMER`)** : Connexion classique ou Google, suivi des commandes, solde fidélité, parrainage, avis.
- 🚫 **Exclusion totale du Backoffice** : Ce SDK ne contient **aucun** endpoint d'administration, de gestion du personnel, de caisse (POS), de gestion des stocks ou de comptabilité. Ces fonctions sont réservées à l'API interne du dashboard restaurateur.

---

### 1. Copier le fichier dans Lovable
Copiez le contenu de `dist-bundle/restorino-sdk.ts` directement dans votre projet Lovable dans le fichier :
`src/lib/restorino-sdk.ts`

### 2. Initialiser le client
Créez `src/lib/api.ts` :
```typescript
import { RestorinoClient } from './restorino-sdk';

export const api = new RestorinoClient({
  baseUrl: import.meta.env.VITE_RESTORINO_API_URL || 'http://localhost:8080',
  restaurantId: import.meta.env.VITE_RESTAURANT_ID,
  tenantId: import.meta.env.VITE_TENANT_ID,
  // Authentification : cookies HttpOnly côté backend. `credentials: 'include'`
  // est le défaut. L'origine du storefront doit être autorisée par le CORS du
  // backend (ou servir l'API via votre propre proxy same-origin).
  credentials: 'include',
  storageType: 'memory',       // Aucun jeton n'est lisible en JS en mode cookies
  autoRefreshToken: true,      // Renouvellement transparent sur expiration 401
  retries: 2,                  // Retry automatique avec backoff exponentiel sur requêtes GET
  retryDelayMs: 300,           // Délai initial de réessai
  onTokenExpired: () => {
    window.location.href = '/login?expired=true';
  },
});
```

> ⚠️ **Périmètre storefront uniquement.** Le SDK ne peut appeler que
> `/api/public/**`, `/api/auth/customers/**`, `/api/customers/**`,
> `/api/notifications/customers/**` et les lectures publiques de la vitrine.
> Toute autre route (admin, POS, livreur, staff) lève
> `OUT_OF_SCOPE_ENDPOINT` **avant** l'appel réseau. Aucune clé API n'est
> supportée : le seul identifiant est le cookie client.

### 🔒 Garanties de sécurité

| Contrôle | Comportement par défaut |
|---|---|
| Jetons | Cookies `HttpOnly` gérés par le backend ; **aucun jeton écrit dans `localStorage`** (`storageType` par défaut : `memory`) |
| `baseUrl` | Seuls `https://…` et les chemins `/…` sont acceptés ; `javascript:`, `data:`, `file:`, `//evil.com` et `user:pass@host` sont rejetés |
| CSRF | Double-submit automatique : cookie `XSRF-TOKEN` → en-tête `X-XSRF-TOKEN` sur les mutations |
| Périmètre | Allowlist storefront dans le transport : admin/POS/livreur/staff refusés **avant** tout appel réseau (`OUT_OF_SCOPE_ENDPOINT`) |
| Réponses | Une réponse 2xx non-JSON est rejetée (`INVALID_RESPONSE`) au lieu d'être typée en succès |
| Erreurs | Corps d'erreur borné (8 Ko) et champs de pollution de prototype filtrés |
| Déconnexion | Annule un rafraîchissement en vol : une session fermée ne peut pas être ressuscitée |
| Polling | Borné en durée (30 min) et en erreurs consécutives (5) |

### 3. Prompt Lovable prêt à l'emploi (1-Shot)
Deux formats de prompt sont disponibles et prêts à copier-coller directement :
- 👉 **Fichier texte brut 1-Shot** : [`LOVABLE_1SHOT_PROMPT.txt`](./LOVABLE_1SHOT_PROMPT.txt) ou [`prompt.txt`](./prompt.txt)
- 👉 **Guide Markdown** : [`LOVABLE_PROMPT.md`](./LOVABLE_PROMPT.md)

Collez ce prompt directement dans Lovable / v0 / Bolt pour générer toute l'application :
- Vitrine restaurant & menu interactif (catégories, suppléments, allergènes)
- Panier & tunnel de commande en 3 modes (Livraison, À emporter, À table QR Code)
- Suivi de commande et livreur en direct (coordonnées GPS en temps réel)
- Espace client (Historique, avis, parrainage, notifications)
- Programme de fidélité (Points, paliers Bronze/Silver/Gold/Platinum, récompenses, avis Google)
- Conseiller culinaire vocal interactif (Gemini Live WebSocket)

---

##  Architecture des Modules

| Module | Namespace | Description | Authentification requise ? |
| :--- | :--- | :--- | :--- |
| **Vitrine & Menus** | `api.vitrine.*` | Découverte resto, carte des menus, plats, catégories, horaires | ❌ Non (Public) |
| **Commandes Publiques** | `api.orders.*` | Estimation livraison, réservation, suivi | ❌ Non (Public) |
| **Suivi Livreur** | `api.delivery.*` | Suivi GPS et statut de livraison par numéro de tracking | ❌ Non (Public) |
| **Commande à Table (QR)** | `api.tables.*` | Scan QR code de table pour commande sur place | ❌ Non (Public) |
| **Agent Vocal & Chat (AI)** | `api.liveAgent.*` | Conseiller culinaire interactif en temps réel (Gemini Live) | ❌ Non (Public) |
| **Auth Client** | `api.auth.*` | Inscription, connexion, mot de passe oublié, vérification email | ❌ Non / 🔐 Oui |
| **Espace Client** | `api.customer.*` | Profil, historique commandes, notation des plats, parrainage | 🔐 Cookie client (HttpOnly) |
| **Fidélité** | `api.loyalty.*` | Points, paliers, catalogue récompenses, points avis Google | 🔐 Cookie client (HttpOnly) |

---

## 💻 Exemples d'Utilisation

### Charger le menu d'un restaurant
```typescript
const menu = await api.vitrine.getMenu('pizza-palace');
console.log(menu.restaurantName, menu.categories);
```

### Passer une commande en livraison
```typescript
const order = await api.orders.placeOrder({
  customerName: 'Sarah Connor',
  customerPhone: '+33612345678',
  customerEmail: 'sarah@example.com',
  orderType: 'DELIVERY',
  paymentMethod: 'CARD_ONLINE',
  deliveryLocation: {
    street: '12 Rue de la Paix',
    city: 'Paris',
    postalCode: '75002',
    latitude: 48.868,
    longitude: 2.331,
  },
  items: [
    {
      productId: 'uuid-pizza-margherita',
      productName: 'Pizza Margherita',
      quantity: 2,
      unitPrice: 12.50,
      supplementIds: ['uuid-extra-mozza'],
    },
  ],
});

console.log('Numéro de commande :', order.orderNumber);
```

### Connexion et consultation des points de fidélité
```typescript
// Connexion classique (sauvegarde automatiquement le token JWT)
await api.auth.login({
  email: 'client@example.com',
  password: 'MonMotDePasseSecurise123!',
});

// Ou connexion via Google Sign-In
await api.auth.loginWithGoogle({
  googleToken: 'google-id-token-xyz',
});

// Récupérer le solde de points et le palier
const loyalty = await api.loyalty.getStatus();
console.log(`Palier : ${loyalty.tier}, Points : ${loyalty.availablePoints}`);
```

### Validation d'un code promo sur le panier
```typescript
const promo = await api.customer.validatePromoCode('BIENVENUE10', 45.0);
if (promo.valid) {
  console.log(`Réduction : -${promo.discount}€ (${promo.message})`);
}
```

### Agent Vocal & Conseiller Culinaire Interactif (Gemini Live)
```typescript
const session = api.liveAgent.connect({
  restaurantSlug: 'pizza-palace',
  onTranscript: (role, text) => {
    console.log(`${role === 'user' ? 'Client' : 'Conseiller'}: ${text}`);
  },
  onAudio: (audioPcmChunk) => {
    // Lecture audio du flux de réponse (PCM 16kHz)
    playPcmAudio(audioPcmChunk);
  },
  onClientAction: (action) => {
    if (action.action === 'ADD_TO_CART') {
      console.log('Plat ajouté au panier vocalement :', action.payload);
    }
  },
  onStatusChange: (status) => console.log('État agent :', status),
  onInterrupted: () => stopAudioPlayback(),
});

// Envoi d'une question ou flux micro
session.sendText('Quels sont vos plats sans gluten ?');
// session.sendAudio(microphonePcmChunk);
```

---

## 🔨 Commandes de Build & Test

```bash
# Compilation TypeScript (double build : CJS dans dist/, ESM dans dist/esm/)
npm run build

# Type-check des sources et de l'exemple de référence
npm run typecheck && npm run typecheck:examples

# Suite complète : client + contrat backend + sécurité + docs + packaging
npm test

# Rafraîchir le snapshot de contrat depuis l'OpenAPI du backend
npm run contract:snapshot -- --url http://localhost:8080/v3/api-docs

# Régénération du bundle standalone mono-fichier (Lovable.dev / v0)
npm run bundle:single

# Vérification du paquet avant publication
npm pack --dry-run
```

### Implémentation de référence

[`examples/vanilla/`](./examples/vanilla) contient un tunnel de commande
complet et typé (menu → panier → checkout → suivi) : `npm run typecheck:examples`
vérifie qu'il compile, et il constitue le squelette à copier pour une app générée.

---

## 📄 Licence

MIT © [Restorino](https://restorino.com)
