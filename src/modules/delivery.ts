import { HttpClient } from '../http/http-client';
import { PublicTrackingResponse } from '../types/delivery';

export class DeliveryModule {
  constructor(private http: HttpClient) {}

  /**
   * Suivi temps réel d'un livreur par numéro de suivi sans authentification.
   */
  public async track(trackingNumber: string): Promise<PublicTrackingResponse> {
    return this.http.request<PublicTrackingResponse>(`/api/public/deliveries/track/${encodeURIComponent(trackingNumber)}`, {
      method: 'GET'
    });
  }

  /**
   * Surveille en direct la position GPS et l'état d'avancement du coursier.
   * Retourne une fonction de désabonnement / arrêt du flux.
   */
  public watchDelivery(
    trackingNumber: string,
    callback: (delivery: PublicTrackingResponse) => void,
    options: { intervalMs?: number; onError?: (err: Error) => void } = {}
  ): () => void {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const interval = Math.max(options.intervalMs ?? 4000, 50);

    const poll = async () => {
      if (stopped) return;
      try {
        const data = await this.track(trackingNumber);
        if (stopped) return;
        callback(data);
        if (data.status === 'DELIVERED' || data.status === 'FAILED') {
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
