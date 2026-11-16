import { HttpClient, RestorinoApiError } from '../http/http-client';
import {
  VitrineOrderRequest,
  OrderResponse,
  OrderStatus,
  OrderTrackingResponse,
  OrderTrackingVerification,
  CancelOrderRequest,
  DeliveryEstimateResponse,
  EstimateDeliveryRequest,
  CustomerLocation,
  CreateReservationRequest,
  ReservationResponse,
  ReservationTrackingVerification,
  CancelReservationRequest,
  PublicRestaurantSettingsResponse
} from '../types/orders';
import { PublicMenuResponse } from '../types/vitrine';

export class OrdersModule {
  constructor(private http: HttpClient) {}

  /**
   * Un `restaurantId` vide produit une URL `//orders` et un 404 opaque.
   */
  private resolveRestaurantId(override?: string): string {
    const target = override || this.http.getConfig().restaurantId;
    if (!target) {
      throw new RestorinoApiError(
        400,
        'restaurantId est requis : fournissez-le à la configuration du client ou à l’appel.',
        'MISSING_RESTAURANT_ID'
      );
    }
    return target;
  }

  private generateIdempotencyKey(): string {
    return this.http.createIdempotencyKey();
  }

  /**
   * Passage d'une commande publique depuis la vitrine.
   */
  public async placeOrder(order: VitrineOrderRequest, restaurantId?: string): Promise<OrderResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    // `idempotencyKey` est un détail de transport : il ne part pas dans le corps.
    const { idempotencyKey, ...payload } = order;

    return this.http.request<OrderResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/orders`,
      {
        method: 'POST',
        body: payload,
        // Rejouer une création de commande sans clé peut la dupliquer.
        idempotencyKey: idempotencyKey ?? this.generateIdempotencyKey()
      }
    );
  }

  /**
   * Estimation des frais et délais de livraison.
   *
   * L'API attend `{ latitude, longitude, address }`. L'ancienne forme
   * `CustomerLocation` (`street`) reste acceptée et convertie.
   */
  public async estimateDelivery(
    location: EstimateDeliveryRequest | CustomerLocation,
    restaurantId?: string
  ): Promise<DeliveryEstimateResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    return this.http.request<DeliveryEstimateResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/orders/estimate-delivery`,
      { method: 'POST', body: this.toEstimateRequest(location) }
    );
  }

  private toEstimateRequest(location: EstimateDeliveryRequest | CustomerLocation): EstimateDeliveryRequest {
    const legacy = location as CustomerLocation & { street?: string };
    const address = (location as EstimateDeliveryRequest).address || legacy.street || '';

    if (!address || address.trim().length < 10) {
      throw new RestorinoApiError(
        400,
        'Une adresse complète (10 caractères minimum) est requise pour estimer la livraison.',
        'MISSING_ADDRESS'
      );
    }

    return {
      latitude: legacy.latitude,
      longitude: legacy.longitude,
      address,
      preferredTime: (location as EstimateDeliveryRequest).preferredTime,
      orderValue: (location as EstimateDeliveryRequest).orderValue
    };
  }

  /**
   * Suivi public d'une commande par son ID avec vérification 2 facteurs (anti-IDOR: email + phone).
   */
  public async trackOrder(
    orderId: string,
    verification: OrderTrackingVerification,
    restaurantId?: string
  ): Promise<OrderTrackingResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    return this.http.request<OrderTrackingResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/orders/${encodeURIComponent(orderId)}/track`,
      {
        method: 'GET',
        params: {
          customerEmail: verification.customerEmail,
          customerPhone: verification.customerPhone
        }
      }
    );
  }

  /**
   * Annulation de commande par le client avec vérification 2 facteurs (anti-IDOR: email + phone).
   */
  public async cancelOrder(
    orderId: string,
    verification: CancelOrderRequest,
    restaurantId?: string
  ): Promise<OrderResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    return this.http.request<OrderResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/orders/${encodeURIComponent(orderId)}/cancel`,
      {
        method: 'POST',
        params: {
          customerEmail: verification.customerEmail,
          customerPhone: verification.customerPhone,
          reason: verification.reason
        }
      }
    );
  }

  /**
   * Suivi one-click via token signé (lien SMS/email).
   */
  public async trackOrderByToken(token: string, restaurantId?: string): Promise<OrderTrackingResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    return this.http.request<OrderTrackingResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/orders/track-link`,
      { method: 'GET', params: { token } }
    );
  }

  /**
   * Menu du restaurant pour la page de commande.
   */
  public async getOrderingMenu(restaurantId?: string): Promise<PublicMenuResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    return this.http.request<PublicMenuResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/orders/menu`,
      { method: 'GET' }
    );
  }

  /**
   * Paramètres publics du restaurant (taxe, couleurs, devise, logo).
   */
  public async getSettings(restaurantId?: string): Promise<PublicRestaurantSettingsResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    return this.http.request<PublicRestaurantSettingsResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/orders/settings`,
      { method: 'GET' }
    );
  }

  /**
   * Réservation de table publique en ligne.
   */
  public async createReservation(
    reservation: CreateReservationRequest,
    restaurantId?: string
  ): Promise<ReservationResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    return this.http.request<ReservationResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/orders/reservations`,
      {
        method: 'POST',
        body: reservation,
        idempotencyKey: this.generateIdempotencyKey()
      }
    );
  }

  /**
   * Suivi d'une réservation de table par son numéro (email + phone).
   */
  public async trackReservation(
    reservationNumber: string,
    verification: ReservationTrackingVerification,
    restaurantId?: string
  ): Promise<ReservationResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    return this.http.request<ReservationResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/orders/reservations/${encodeURIComponent(reservationNumber)}/track`,
      {
        method: 'GET',
        params: {
          customerEmail: verification.customerEmail,
          customerPhone: verification.customerPhone
        }
      }
    );
  }

  /**
   * Annulation d'une réservation de table par le client (email + phone).
   */
  public async cancelReservation(
    reservationNumber: string,
    verification: CancelReservationRequest,
    restaurantId?: string
  ): Promise<ReservationResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    return this.http.request<ReservationResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/orders/reservations/${encodeURIComponent(reservationNumber)}/cancel`,
      {
        method: 'POST',
        params: {
          customerEmail: verification.customerEmail,
          customerPhone: verification.customerPhone,
          reason: verification.reason
        }
      }
    );
  }

  /**
   * Surveille l'avancement d'une commande (polling avec arrêt automatique).
   *
   * Le backend n'expose pas `isDelivered` : l'arrêt se fait sur le statut réel.
   * `PENDING_VERIFICATION` (paiement cash à confirmer) est un état d'attente
   * légitime, pas un état terminal.
   */
  public watchOrder(
    orderId: string,
    verification: OrderTrackingVerification,
    callback: (status: OrderTrackingResponse) => void,
    options: {
      intervalMs?: number;
      onError?: (err: Error) => void;
      restaurantId?: string;
      /** Durée maximale de surveillance (défaut : 30 min). */
      maxDurationMs?: number;
      /** Nombre d'erreurs consécutives avant abandon (défaut : 5). */
      maxConsecutiveErrors?: number;
      /** Sous Node, ne pas retenir la boucle d'événements (défaut : false). */
      unrefTimers?: boolean;
    } = {}
  ): () => void {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let consecutiveErrors = 0;
    const interval = Math.max(options.intervalMs ?? 5000, 50);
    const maxDuration = options.maxDurationMs ?? 30 * 60 * 1000;
    const maxErrors = Math.max(1, options.maxConsecutiveErrors ?? 5);
    const startedAt = Date.now();
    const terminalStatuses: OrderStatus[] = ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUSED', 'REFUNDED'];

    const schedule = (delayMs: number): void => {
      timer = setTimeout(poll, delayMs);
      // Sous Node, un timer armé retient la boucle d'événements : sans unref,
      // un script qui surveille une commande ne se termine jamais.
      if (options.unrefTimers) {
        (timer as unknown as { unref?: () => void }).unref?.();
      }
    };

    const poll = async () => {
      if (stopped) return;
      try {
        const tracking = await this.trackOrder(orderId, verification, options.restaurantId);
        if (stopped) return;
        consecutiveErrors = 0;
        callback(tracking);
        if (terminalStatuses.includes(tracking.status)) {
          return;
        }
      } catch (err: any) {
        consecutiveErrors++;
        if (!stopped && options.onError) {
          options.onError(err instanceof Error ? err : new Error(String(err)));
        }
        // Abandonner après N échecs : continuer ne fait que marteler un
        // endpoint protégé par rate limiting.
        if (stopped || consecutiveErrors >= maxErrors) {
          return;
        }
      }
      // Borne la durée totale : sans elle, un statut jamais terminal fait
      // tourner le polling indéfiniment (batterie, réseau, quota).
      if (!stopped && Date.now() - startedAt < maxDuration) {
        schedule(interval);
      }
    };

    schedule(0);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }
}

