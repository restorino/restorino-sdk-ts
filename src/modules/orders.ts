import { HttpClient } from '../http/http-client';
import {
  VitrineOrderRequest,
  OrderResponse,
  OrderTrackingResponse,
  OrderTrackingVerification,
  CancelOrderRequest,
  DeliveryEstimateResponse,
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
   * Passage d'une commande publique depuis la vitrine.
   */
  public async placeOrder(order: VitrineOrderRequest, restaurantId?: string): Promise<OrderResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<OrderResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/orders`, {
      method: 'POST',
      body: order
    });
  }

  /**
   * Estimation des frais et délais de livraison pour une adresse donnée.
   */
  public async estimateDelivery(location: CustomerLocation, restaurantId?: string): Promise<DeliveryEstimateResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<DeliveryEstimateResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/orders/estimate-delivery`, {
      method: 'POST',
      body: location
    });
  }

  /**
   * Suivi public d'une commande par son ID avec vérification 2 facteurs (anti-IDOR: email + phone).
   */
  public async trackOrder(
    orderId: string,
    verification: OrderTrackingVerification,
    restaurantId?: string
  ): Promise<OrderTrackingResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<OrderTrackingResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/orders/${encodeURIComponent(orderId)}/track`, {
      method: 'GET',
      params: {
        customerEmail: verification.customerEmail,
        customerPhone: verification.customerPhone
      }
    });
  }

  /**
   * Annulation de commande par le client avec vérification 2 facteurs (anti-IDOR: email + phone).
   */
  public async cancelOrder(
    orderId: string,
    verification: CancelOrderRequest,
    restaurantId?: string
  ): Promise<OrderResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<OrderResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: 'POST',
      params: {
        customerEmail: verification.customerEmail,
        customerPhone: verification.customerPhone,
        reason: verification.reason
      }
    });
  }

  /**
   * Suivi one-click via token signé (lien SMS/email).
   */
  public async trackOrderByToken(token: string, restaurantId?: string): Promise<OrderTrackingResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<OrderTrackingResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/orders/track-link`, {
      method: 'GET',
      params: { token }
    });
  }

  /**
   * Menu du restaurant pour la page de commande.
   */
  public async getOrderingMenu(restaurantId?: string): Promise<PublicMenuResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<PublicMenuResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/orders/menu`, {
      method: 'GET'
    });
  }

  /**
   * Paramètres publics du restaurant (taxe, couleurs, devise, logo).
   */
  public async getSettings(restaurantId?: string): Promise<PublicRestaurantSettingsResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<PublicRestaurantSettingsResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/orders/settings`, {
      method: 'GET'
    });
  }

  /**
   * Réservation de table publique en ligne.
   */
  public async createReservation(reservation: CreateReservationRequest, restaurantId?: string): Promise<ReservationResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<ReservationResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/orders/reservations`, {
      method: 'POST',
      body: reservation
    });
  }

  /**
   * Suivi d'une réservation de table par son numéro avec vérification 2 facteurs (email + phone).
   */
  public async trackReservation(
    reservationNumber: string,
    verification: ReservationTrackingVerification,
    restaurantId?: string
  ): Promise<ReservationResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<ReservationResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/orders/reservations/${encodeURIComponent(reservationNumber)}/track`, {
      method: 'GET',
      params: {
        customerEmail: verification.customerEmail,
        customerPhone: verification.customerPhone
      }
    });
  }

  /**
   * Annulation d'une réservation de table par le client avec vérification 2 facteurs (email + phone).
   */
  public async cancelReservation(
    reservationNumber: string,
    verification: CancelReservationRequest,
    restaurantId?: string
  ): Promise<ReservationResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<ReservationResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/orders/reservations/${encodeURIComponent(reservationNumber)}/cancel`, {
      method: 'POST',
      params: {
        customerEmail: verification.customerEmail,
        customerPhone: verification.customerPhone,
        reason: verification.reason
      }
    });
  }

  /**
   * Surveille en direct l'état d'avancement d'une commande (polling intelligent avec arrêt automatique).
   * Retourne une fonction de désabonnement / arrêt du flux.
   */
  public watchOrder(
    orderId: string,
    verification: OrderTrackingVerification,
    callback: (status: OrderTrackingResponse) => void,
    options: { intervalMs?: number; onError?: (err: Error) => void; restaurantId?: string } = {}
  ): () => void {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const interval = Math.max(options.intervalMs ?? 5000, 50);

    const poll = async () => {
      if (stopped) return;
      try {
        const tracking = await this.trackOrder(orderId, verification, options.restaurantId);
        if (stopped) return;
        callback(tracking);
        if (tracking.isDelivered || tracking.status === 'DELIVERED' || tracking.status === 'CANCELLED') {
          return;
        }
      } catch (err: any) {
        if (!stopped && options.onError) {
          options.onError(err instanceof Error ? err : new Error(String(err)));
        }
      }
      if (!stopped) {
        timer = setTimeout(poll, interval);
      }
    };

    timer = setTimeout(poll, 0);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }
}

