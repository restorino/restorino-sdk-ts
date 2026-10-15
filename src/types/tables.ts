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

