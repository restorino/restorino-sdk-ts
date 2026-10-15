# @restorino/sdk — TypeScript SDK pour Storefront & Espace Client

SDK officiel TypeScript pour intégrer l'API **Restorino Restaurant SaaS** dans vos applications frontend (**Lovable.dev**, **v0**, **Bolt**, **Next.js**, **Vite / React**).

---

## ⚡ Prise en main ultra-rapide avec Lovable.dev

Le SDK est disponible en **fichier unique autonome** (Zero-Dependency) :
👉 [`dist-bundle/restorino-sdk.ts`](./dist-bundle/restorino-sdk.ts) (74.1 KB)

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
  apiKey: import.meta.env.VITE_RESTORINO_API_KEY, // Clé API Vitrine (obligatoire pour /api/vitrine/*)
  storageType: 'localStorage', // Sauvegarde automatique du JWT client & refresh token
  autoRefreshToken: true,      // Renouvellement transparent sur expiration 401
  retries: 2,                  // Retry automatique avec backoff exponentiel sur requêtes GET
  retryDelayMs: 300,           // Délai initial de réessai
  onTokenExpired: () => {
    window.location.href = '/login?expired=true';
  },
});
```

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

## 🚀 Déploiement en 1 Clic sur Vercel ou Netlify

Le projet généré est nativement optimisé pour un déploiement instantané sur **Vercel** et **Netlify** :

### A. Déploiement Vercel
1. Directement depuis Lovable.dev : cliquez sur **"Publish"** puis exportez vers GitHub.
2. Sur [Vercel](https://vercel.com/new), importez le dépôt.
3. Le fichier pré-configuré [`vercel.json`](./vercel.json) gère automatiquement les réécritures SPA (évite les erreurs 404 lors du rafraîchissement d'une sous-page `/menu` ou `/tracking`) et les headers de sécurité HTTP.
4. Renseignez vos variables d'environnement (`VITE_RESTORINO_API_URL`, `VITE_RESTAURANT_ID`, `VITE_TENANT_ID`, `VITE_RESTORINO_API_KEY`) et cliquez sur **Deploy**.

### B. Déploiement Netlify
1. Directement depuis Lovable.dev : cliquez sur le bouton natif **"Deploy to Netlify"** ou connectez votre repo GitHub sur [Netlify](https://app.netlify.com/start).
2. Le fichier pré-configuré [`netlify.toml`](./netlify.toml) assure automatiquement :
   - Commande de build : `npm run build`
   - Dossier de publication : `dist`
   - Redirections SPA 200 (`/* -> /index.html 200`)
   - En-têtes de sécurité HTTP stricts.
3. Configurez vos variables d'environnement dans le panneau Netlify et déployez en 1 clic.

---

## 📦 Architecture des Modules

| Module | Namespace | Description | Authentification requise ? |
| :--- | :--- | :--- | :--- |
| **Vitrine & Menus** | `api.vitrine.*` | Découverte resto, carte des menus, plats, catégories, horaires | ❌ Non (Public) |
| **Commandes Publiques** | `api.orders.*` | Validation panier, estimation livraison, calcul promo, réservation | ❌ Non (Public) |
| **Suivi Livreur** | `api.delivery.*` | Suivi GPS et statut de livraison par numéro de tracking | ❌ Non (Public) |
| **Commande à Table (QR)** | `api.tables.*` | Scan QR code de table pour commande sur place | ❌ Non (Public) |
| **Agent Vocal & Chat (AI)** | `api.liveAgent.*` | Conseiller culinaire interactif en temps réel (Gemini Live) | ❌ Non (Public) |
| **Auth Client** | `api.auth.*` | Inscription, connexion, mot de passe oublié, vérification email | ❌ Non / 🔐 Oui |
| **Espace Client** | `api.customer.*` | Profil, historique commandes, notation des plats, parrainage | 🔐 Oui (Token JWT) |
| **Fidélité** | `api.loyalty.*` | Points, paliers, catalogue récompenses, points avis Google | 🔐 Oui (Token JWT) |

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
# Compilation TypeScript vers dist/
npm run build

# Exécution des tests automatisés (15 tests natifs Node.js)
npm test

# Régénération du bundle standalone mono-fichier (Lovable.dev / v0)
npm run bundle:single

# Cycle complet pré-publication
npm run prepublishOnly
```

---

## 📄 Licence

MIT © [Restorino](https://restorino.com)
