/**
 * Coordonnées GPS pour le tracking livreur.
 */
export interface DriverGpsLocation {
  latitude: number;
  longitude: number;
  updatedAt?: string;
}

/**
 * Réponse du suivi public de livraison sans authentification.
 */
export interface PublicTrackingResponse {
  trackingNumber: string;
  orderNumber: string;
  status: 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED';
  driverName?: string;
  driverPhone?: string;
  driverLocation?: DriverGpsLocation;
  etaMinutes?: number;
  estimatedDeliveryTime?: string;
  restaurantName: string;
  deliveryAddressSummary?: string;
}
