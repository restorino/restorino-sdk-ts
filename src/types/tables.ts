/**
 * Informations publiques d'une table pour le scan QR Code (Dine-in).
 */
export interface PublicTableResponse {
  id: string;
  tableNumber: string;
  capacity: number;
  zoneName?: string;
  isAvailable: boolean;
  activeSessionId?: string;
  restaurantId: string;
  restaurantName: string;
}

/**
 * Données d'affichage dynamique pour écran TV / Kiosk restaurant.
 */
export interface TvPublicScreenDataResponse {
  screenCode: string;
  restaurantName: string;
  preparingOrders: string[];
  readyOrders: string[];
  promotions?: {
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
  }[];
  updatedAt: string;
}
