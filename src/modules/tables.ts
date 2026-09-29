import { HttpClient } from '../http/http-client';
import { PublicTableResponse } from '../types/tables';

export class TablesModule {
  constructor(private http: HttpClient) {}

  /**
   * Récupère les informations d'une table scannée par QR Code (Dine-in).
   */
  public async getTableInfo(tableId: string, restaurantId?: string): Promise<PublicTableResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<PublicTableResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/tables/${encodeURIComponent(tableId)}`, {
      method: 'GET'
    });
  }
}
