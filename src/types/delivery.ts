/**
 * Statuts de livraison (`DeliveryStatus` backend).
 * `ACCEPTED`/`OUT_FOR_DELIVERY` n'existent pas côté serveur.
 */
export type DeliveryStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export interface TrackingProgressStep {
  key: string;
  label: string;
  completed: boolean;
  current: boolean;
  timestamp?: string;
}

/**
 * Suivi public de livraison (`PublicTrackingResponse`).
 *
 * ⚠️ Les coordonnées livreur sont aplaties (`driverLatitude` /
 * `driverLongitude`) et ne sont présentes qu'en `PICKED_UP` / `IN_TRANSIT`.
 */
export interface PublicTrackingResponse {
  trackingNumber: string;
  orderNumber: string;
  deliveryStatus: DeliveryStatus;
  statusDisplayName?: string;
  statusDescription?: string;
  orderPlacedTime?: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  deliveryAddress?: string;
  driverName?: string;
  driverLatitude?: number;
  driverLongitude?: number;
  restaurantName: string;
  restaurantPhone?: string;
  restaurantAddress?: string;
  restaurantLatitude?: number;
  restaurantLongitude?: number;
  totalAmount?: number;
  currency?: string;
  progressSteps?: TrackingProgressStep[];
}
