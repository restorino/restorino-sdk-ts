import { HttpClient } from '../http/http-client';
import { DeliveryStatus, PublicTrackingResponse } from '../types/delivery';

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
   *
   * Le backend renvoie `deliveryStatus` (et non `status`) : le test d'arrêt
   * lisait un champ toujours `undefined` et bouclait indéfiniment.
   * Retourne une fonction de désabonnement / arrêt du flux.
   */
  public watchDelivery(
    trackingNumber: string,
    callback: (delivery: PublicTrackingResponse) => void,
    options: {
      intervalMs?: number;
      onError?: (err: Error) => void;
      /** Durée maximale de surveillance (défaut : 30 min). */
      maxDurationMs?: number;
      /** Nombre d'erreurs consécutives avant abandon (défaut : 5). */
      maxConsecutiveErrors?: number;
      /** Sous Node, ne pas retenir la boucle d'événements (défaut : false). */
      unrefTimers?: boolean;
    } = {}
  ): () => void {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let consecutiveErrors = 0;
    const interval = Math.max(options.intervalMs ?? 4000, 50);
    const maxDuration = options.maxDurationMs ?? 30 * 60 * 1000;
    const maxErrors = Math.max(1, options.maxConsecutiveErrors ?? 5);
    const startedAt = Date.now();
    const terminalStatuses: DeliveryStatus[] = ['DELIVERED', 'FAILED', 'CANCELLED'];

    const schedule = (delayMs: number): void => {
      timer = setTimeout(poll, delayMs);
      if (options.unrefTimers) {
        (timer as unknown as { unref?: () => void }).unref?.();
      }
    };

    const poll = async () => {
      if (stopped) return;
      try {
        const data = await this.track(trackingNumber);
        if (stopped) return;
        consecutiveErrors = 0;
        callback(data);
        if (terminalStatuses.includes(data.deliveryStatus)) {
          return;
        }
      } catch (err: any) {
        consecutiveErrors++;
        if (!stopped && options.onError) {
          options.onError(err instanceof Error ? err : new Error(String(err)));
        }
        if (stopped || consecutiveErrors >= maxErrors) {
          return;
        }
      }
      if (!stopped && Date.now() - startedAt < maxDuration) {
        schedule(interval);
      }
    };

    schedule(0);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }
}
