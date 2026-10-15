import { HttpClient } from '../http/http-client';
import {
  LiveAgentSessionConfig,
  LiveAgentStatus,
  LiveAgentClientAction,
  LiveAgentEvent,
  LiveAgentEventListener
} from '../types/live-agent';

/**
 * Handle d'une session active avec l'agent vocal interactif Gemini Live.
 */
export class LiveAgentSession {
  private ws: WebSocket | null = null;
  private status: LiveAgentStatus = 'CONNECTING';
  private listeners: Map<LiveAgentEvent, Set<Function>> = new Map();

  constructor(
    private config: LiveAgentSessionConfig,
    resolvedWsUrl: string
  ) {
    this.initWebSocket(resolvedWsUrl);
  }

  /**
   * Enregistre un écouteur d'événement typé.
   * Retourne une fonction de désabonnement pour les cycles de vie React (useEffect).
   */
  public on<E extends LiveAgentEvent>(event: E, listener: LiveAgentEventListener<E>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  /**
   * Supprime un écouteur d'événement précédemment enregistré.
   */
  public off<E extends LiveAgentEvent>(event: E, listener: LiveAgentEventListener<E>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
    }
  }

  private emit<E extends LiveAgentEvent>(event: E, ...args: any[]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of set) {
        try {
          (listener as any)(...args);
        } catch {
          // Isoler les erreurs des callbacks abonnés
        }
      }
    }
  }

  private initWebSocket(url: string): void {
    if (typeof WebSocket === 'undefined') {
      const err = new Error("L'API WebSocket n'est pas disponible dans cet environnement.");
      if (this.config.onError) this.config.onError(err);
      this.emit('error', err);
      this.updateStatus('ERROR');
      return;
    }

    try {
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.updateStatus('CONNECTED');
      };

      this.ws.onmessage = (event: MessageEvent) => {
        if (typeof event.data === 'string') {
          try {
            const data = JSON.parse(event.data);
            if (!data || typeof data !== 'object' || Array.isArray(data)) return;
            // Protection contre la pollution de prototype
            if (data.type === '__proto__' || data.action === '__proto__') return;

            if (data.type === 'TRANSCRIPT') {
              if (this.config.onTranscript) this.config.onTranscript(data.role, data.text);
              this.emit('transcript', data.role, data.text);
            } else if (data.type === 'STATUS' && data.message) {
              this.updateStatus(data.message as LiveAgentStatus);
            } else if (data.type === 'INTERRUPTED') {
              if (this.config.onInterrupted) this.config.onInterrupted();
              this.emit('interrupted');
              this.updateStatus('INTERRUPTED');
            } else if (data.action && typeof data.action === 'string') {
              const safePayload: Record<string, any> = {};
              for (const [k, v] of Object.entries(data)) {
                if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') {
                  safePayload[k] = v;
                }
              }
              const actionPayload: LiveAgentClientAction = {
                action: data.action,
                payload: safePayload
              };
              if (this.config.onClientAction) this.config.onClientAction(actionPayload);
              this.emit('action', actionPayload);
            }
          } catch {
            // Message texte brut
            if (this.config.onTranscript) {
              this.config.onTranscript('assistant', event.data);
            }
            this.emit('transcript', 'assistant', event.data);
          }
        } else if (event.data instanceof ArrayBuffer) {
          const uint8 = new Uint8Array(event.data);
          if (this.config.onAudio) {
            this.config.onAudio(uint8);
          }
          this.emit('audio', uint8);
          this.updateStatus('SPEAKING');
        }
      };

      this.ws.onerror = () => {
        const error = new Error('Erreur de connexion WebSocket avec le Live Agent.');
        if (this.config.onError) this.config.onError(error);
        this.emit('error', error);
        this.updateStatus('ERROR');
      };

      this.ws.onclose = () => {
        this.updateStatus('DISCONNECTED');
        if (this.config.onClose) this.config.onClose();
        this.emit('close');
        this.ws = null;
      };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (this.config.onError) this.config.onError(err);
      this.emit('error', err);
      this.updateStatus('ERROR');
    }
  }

  private updateStatus(newStatus: LiveAgentStatus): void {
    this.status = newStatus;
    if (this.config.onStatusChange) {
      this.config.onStatusChange(newStatus);
    }
    this.emit('status', newStatus);
  }

  /**
   * Envoie une invite textuelle à l'agent vocal.
   */
  public sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Impossible d'envoyer le message : WebSocket non connecté.");
    }
    this.updateStatus('THINKING');
    this.ws.send(JSON.stringify({ type: 'TEXT', text }));
  }

  /**
   * Envoie un flux de données audio brutes (PCM 16kHz) issues du micro du client.
   */
  public sendAudio(pcmData: Uint8Array | ArrayBuffer | Blob): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    if (pcmData instanceof Uint8Array) {
      this.ws.send(pcmData.buffer as ArrayBuffer);
    } else {
      this.ws.send(pcmData);
    }
  }

  /**
   * Retourne l'état courant de l'agent.
   */
  public getStatus(): LiveAgentStatus {
    return this.status;
  }

  /**
   * Ferme la session avec l'agent vocal.
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateStatus('DISCONNECTED');
  }
}

/**
 * Module pour l'Agent Vocal & Conseiller Culinaire interactif (Gemini Live).
 * Permet aux visiteurs de la vitrine de dialoguer à la voix avec le restaurant,
 * de se faire conseiller un plat selon leurs goûts/allergies et d'ajouter au panier vocalement.
 */
export class LiveAgentModule {
  constructor(private http: HttpClient) {}

  /**
   * Démarre une session vocale interactive avec le conseiller virtuel du restaurant.
   */
  public connect(config: LiveAgentSessionConfig): LiveAgentSession {
    const rawSlug = config.restaurantSlug || this.http.getConfig().restaurantId || '';
    const slug = rawSlug.replace(/[\r\n\x00-\x1F\x7F\u2028\u2029]/g, '').trim();
    let wsUrl = config.wsUrl;

    if (!wsUrl) {
      const base = this.http.getConfig().baseUrl;
      const wsProtocol = base.startsWith('https') ? 'wss' : 'ws';
      const host = base.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      wsUrl = `${wsProtocol}://${host}/ws/public/live-agent?restaurantSlug=${encodeURIComponent(slug)}`;
    } else {
      if (!/^wss?:\/\//i.test(wsUrl.trim())) {
        throw new Error("L'URL WebSocket doit obligatoirement commencer par 'ws://' ou 'wss://'.");
      }
      if (!wsUrl.includes('restaurantSlug=')) {
        const separator = wsUrl.includes('?') ? '&' : '?';
        wsUrl = `${wsUrl}${separator}restaurantSlug=${encodeURIComponent(slug)}`;
      }
    }

    return new LiveAgentSession(config, wsUrl);
  }
}
