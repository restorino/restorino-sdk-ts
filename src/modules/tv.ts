import { HttpClient } from '../http/http-client';
import { TvPublicScreenDataResponse } from '../types/tables';

export class TvModule {
  constructor(private http: HttpClient) {}

  /**
   * Récupère les données d'affichage dynamique pour un écran TV / Kiosk restaurant.
   */
  public async getScreenData(screenCode: string): Promise<TvPublicScreenDataResponse> {
    return this.http.request<TvPublicScreenDataResponse>(`/api/public/tv/${encodeURIComponent(screenCode)}`, {
      method: 'GET'
    });
  }

  /**
   * Ping keepalive pour signaler qu'un écran TV est toujours actif.
   */
  public async ping(screenCode: string): Promise<void> {
    return this.http.request<void>(`/api/public/tv/${encodeURIComponent(screenCode)}/ping`, {
      method: 'POST'
    });
  }
}
