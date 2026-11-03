/**
 * Reference implementation — the smallest complete ordering funnel.
 *
 * The point of this file is *sequencing*, not styling:
 *   load menu → build cart → estimate → place order → track → stop tracking.
 *
 * Every call below exists in the SDK. Copy this structure into React and you
 * get the same app with components instead of DOM calls.
 */
import {
  RestorinoClient,
  RestorinoApiError,
  formatCurrency,
  type OrderStatus,
  type PublicProduct
} from '@restorino/sdk';

// `import.meta.env` is provided by Vite; in Next.js use
// process.env.NEXT_PUBLIC_RESTORINO_API_URL instead.
const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};

const api = new RestorinoClient({
  // '' = same origin (recommended: serve /api through your own proxy).
  baseUrl: env.VITE_RESTORINO_API_URL ?? '',
  restaurantId: env.VITE_RESTAURANT_ID ?? '',
  credentials: 'include',
  retries: 2,
  onResponse: ({ path, status, durationMs, requestId }) => {
    // Safe by design: no headers, no query string (it can carry a tracking token).
    console.debug(`[sdk] ${path} → ${status} (${durationMs}ms)${requestId ? ` req=${requestId}` : ''}`);
  }
});

type CartLine = { product: PublicProduct; quantity: number };

const cart = new Map<string, CartLine>();
let stopTracking: (() => void) | null = null;

const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element as T;
};

function showError(error: unknown): void {
  const target = $('error');
  if (error instanceof RestorinoApiError) {
    target.textContent = error.requestId
      ? `${error.message} (réf. ${error.requestId})`
      : error.message;
  } else {
    target.textContent = error instanceof Error ? error.message : String(error);
  }
}

function clearError(): void {
  $('error').textContent = '';
}

// ── Menu ────────────────────────────────────────────────────────────────────

async function loadMenu(): Promise<void> {
  const status = $('menu-status');
  const list = $('menu');

  try {
    const menu = await api.orders.getOrderingMenu();
    const categories = menu.categories ?? [];
    const products = categories.flatMap((category) => category.products ?? []);

    if (products.length === 0) {
      status.textContent = 'Aucun plat disponible.';
      return;
    }

    status.textContent = `${products.length} plat(s) · ${menu.currency}`;
    list.replaceChildren();

    for (const product of products) {
      const item = document.createElement('li');

      const label = document.createElement('span');
      label.textContent = `${product.name} — ${formatCurrency(product.price, menu.currency)}`;
      if (product.allergenInfo) {
        const note = document.createElement('span');
        note.className = 'muted';
        note.textContent = ` · ${product.allergenInfo}`;
        label.append(note);
      }

      const add = document.createElement('button');
      add.textContent = 'Ajouter';
      add.addEventListener('click', () => {
        addToCart(product);
        add.disabled = true;
        add.textContent = 'Ajouté';
      });

      item.append(label, add);
      list.append(item);
    }
  } catch (error) {
    status.textContent = '';
    showError(error);
  }
}

// ── Cart ────────────────────────────────────────────────────────────────────

function addToCart(product: PublicProduct): void {
  const key = product.id ?? `${product.name}:${product.price}`;
  const line = cart.get(key) ?? { product, quantity: 0 };
  line.quantity += 1;
  cart.set(key, line);
  renderCart();
}

function renderCart(): void {
  const list = $('cart');
  const lines = [...cart.values()];

  if (lines.length === 0) {
    list.replaceChildren(Object.assign(document.createElement('li'), {
      className: 'muted',
      textContent: 'Panier vide'
    }));
    $('cart-total').textContent = '';
    $('checkout').toggleAttribute('disabled', true);
    return;
  }

  list.replaceChildren();
  for (const { product, quantity } of lines) {
    const item = document.createElement('li');
    item.append(
      Object.assign(document.createElement('span'), {
        textContent: `${quantity} × ${product.name}`
      }),
      Object.assign(document.createElement('span'), {
        textContent: formatCurrency(product.price * quantity)
      })
    );
    list.append(item);
  }

  // Display estimate only — the server recomputes and owns the final total.
  const total = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  $('cart-total').textContent = `Estimation : ${formatCurrency(total)} (hors taxes/frais)`;
  $('checkout').toggleAttribute('disabled', false);
}

// ── Checkout ────────────────────────────────────────────────────────────────

async function checkout(): Promise<void> {
  clearError();

  const customerName = $<HTMLInputElement>('name').value.trim();
  const customerEmail = $<HTMLInputElement>('email').value.trim();
  const customerPhone = $<HTMLInputElement>('phone').value.trim();

  if (!customerName || !customerEmail || !customerPhone) {
    showError(new Error('Nom, email et téléphone sont requis.'));
    return;
  }

  const button = $<HTMLButtonElement>('checkout');
  button.disabled = true;

  try {
    const order = await api.orders.placeOrder({
      customerName,
      customerEmail,
      customerPhone,
      deliveryMethod: 'takeout',   // 'delivery' | 'takeout' | 'dine-in'
      paymentMethod: 'cash',       // 'card' | 'cash' | 'paypal' | 'stripe' | 'mobile'
      items: [...cart.values()].map(({ product, quantity }) => ({
        productId: product.id ?? '',
        productName: product.name,
        quantity,
        unitPrice: product.price,
        // Required by the API. The server revalidates this amount.
        totalPrice: product.price * quantity
      }))
      // Deliberately no `total`/`tax`: sending them can cause a 500 mismatch.
    });

    cart.clear();
    renderCart();
    button.disabled = false;
    startTracking(order.id, { customerEmail, customerPhone });
  } catch (error) {
    button.disabled = false;
    showError(error);
  }
}

// ── Tracking ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'En attente de confirmation',
  CONFIRMED: 'Confirmée',
  PREPARING: 'En préparation',
  READY: 'Prête',
  OUT_FOR_DELIVERY: 'En livraison',
  DELIVERED: 'Livrée',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
  REFUSED: 'Refusée',
  REFUNDED: 'Remboursée',
  // Normal for a first cash order — not an error.
  PENDING_VERIFICATION: 'En attente de vérification'
};

function startTracking(
  orderId: string,
  verification: { customerEmail: string; customerPhone: string }
): void {
  stopTracking?.();

  stopTracking = api.orders.watchOrder(
    orderId,
    verification,
    (tracking) => {
      $('status').textContent = STATUS_LABELS[tracking.status] ?? tracking.status;
    },
    {
      intervalMs: 5000,
      onError: (error) => showError(error),
      maxDurationMs: 30 * 60 * 1000
    }
  );
}

// ── Bootstrap ───────────────────────────────────────────────────────────────

$('checkout').addEventListener('click', () => {
  void checkout();
});

// Stop polling when the tab is hidden for good (avoids a background leak).
window.addEventListener('pagehide', () => {
  stopTracking?.();
  stopTracking = null;
});

void loadMenu();
