/**
 * Statut d'une table (`RestaurantTable.TableStatus`).
 */
export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'BLOCKED' | 'MERGED';

/**
 * Informations publiques d'une table pour le scan QR Code (Dine-in).
 */
export interface PublicTableResponse {
  id: string;
  restaurantId: string;
  /** Entier côté backend (et non chaîne). */
  tableNumber: number;
  name?: string;
  capacity: number;
  status: TableStatus;
  shape?: string;
  floorId?: string;
  isActive: boolean;
  /** Jeton à transmettre lors d'une commande dine-in. */
  tableSessionToken?: string;
}

