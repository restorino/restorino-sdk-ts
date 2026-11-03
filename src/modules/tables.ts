import { HttpClient, RestorinoApiError } from '../http/http-client';
import { PublicTableResponse } from '../types/tables';

const TABLE_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class TablesModule {
  constructor(private http: HttpClient) {}

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

  /**
   * Récupère les informations d'une table scannée par QR Code (Dine-in).
   *
   * Le backend attend un UUID : passer un numéro de table produisait un 400
   * sans corps de réponse impossible à diagnostiquer côté client.
   */
  public async getTableInfo(tableId: string, restaurantId?: string): Promise<PublicTableResponse> {
    const target = this.resolveRestaurantId(restaurantId);
    if (!TABLE_UUID_PATTERN.test(tableId)) {
      throw new RestorinoApiError(
        400,
        'tableId doit être un UUID (le numéro affiché sur la table ne suffit pas).',
        'INVALID_TABLE_ID'
      );
    }

    return this.http.request<PublicTableResponse>(
      `/api/public/restaurants/${encodeURIComponent(target)}/tables/${encodeURIComponent(tableId)}`,
      { method: 'GET' }
    );
  }
}
