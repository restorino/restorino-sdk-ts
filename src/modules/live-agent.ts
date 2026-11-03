import { HttpClient, RestorinoApiError } from '../http/http-client';
import {
  LiveAgentAudioMeta,
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
  private audioMeta: LiveAgentAudioMeta | null = null;
  private closed = false;

  constructor(
    private config: LiveAgentSessionConfig,
    source: string | (() => Promise<string>)
  ) {
    if (typeof source === 'string') {
      // Le jeton est déjà connu : ouverture immédiate, comportement synchrone.
      this.initWebSocket(source);
    } else {
      void this.bootstrap(source);
    }
  }

  /**
   * Le jeton de session doit être obtenu par HTTP avant l'ouverture du socket :
   * le backend refuse (`SESSION_GRANT_REQUIRED`, close 1008) tout socket sans
   * `?grant=` valide.
   */
  private async bootstrap(source: string | (() => Promise<string>)): Promise<void> {
    try {
      const url = typeof source === 'function' ? await source() : source;
      if (this.closed) return;
      this.initWebSocket(url);
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (this.config.onError) this.config.onError(err);
      this.emit('error', err);
      this.updateStatus('ERROR');
    }
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

            if (data.type === 'AUDIO_META') {
              // Le backend annonce la fréquence réelle (24 kHz par défaut) :
              // la supposer à 16 kHz produisait une lecture accélérée.
              const meta: LiveAgentAudioMeta = {
                encoding: typeof data.encoding === 'string' ? data.encoding : undefined,
                sampleRate: Number(data.sampleRate) || 24000,
                channels: Number(data.channels) || 1
              };
              this.audioMeta = meta;
              if (this.config.onAudioMeta) this.config.onAudioMeta(meta);
              this.emit('audioMeta', meta);
            } else if (data.type === 'TRANSCRIPT') {
              // Le backend alterne `agent` et `assistant` : on normalise.
              const role: 'user' | 'assistant' = data.role === 'user' ? 'user' : 'assistant';
              if (this.config.onTranscript) this.config.onTranscript(role, data.text);
              this.emit('transcript', role, data.text);
            } else if (data.type === 'STATUS' && data.message) {
              this.updateStatus(data.message as LiveAgentStatus);
            } else if (data.type === 'INTERRUPTED') {
              if (this.config.onInterrupted) this.config.onInterrupted();
              this.emit('interrupted');
              this.updateStatus('INTERRUPTED');
            } else if (data.type === 'SESSION_ENDED') {
              const reason = typeof data.reason === 'string' ? data.reason : undefined;
              if (this.config.onSessionEnded) this.config.onSessionEnded(reason);
              this.emit('sessionEnded', reason);
              this.updateStatus('DISCONNECTED');
            } else if (data.type === 'ERROR' || data.error) {
              // Les erreurs serveur (`{"error":"SESSION_GRANT_REQUIRED"}`) n'ont
              // ni `type` ni `action` : sans cette branche elles étaient ignorées.
              const err = new Error(String(data.message || data.error || 'Erreur du Live Agent.'));
              if (this.config.onError) this.config.onError(err);
              this.emit('error', err);
              this.updateStatus('ERROR');
            } else if (data.action && typeof data.action === 'string') {
              const safePayload: Record<string, any> = {};
              for (const [k, v] of Object.entries(data)) {
                if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') {
                  safePayload[k] = v;
                }
              }
              const actionPayload: LiveAgentClientAction = {
                action: data.action,
                payload: safePayload,
                actionId: typeof data.actionId === 'string' ? data.actionId : undefined
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

      this.ws.onclose = (event: CloseEvent) => {
        if (!this.closed && event && event.code === 4001) {
          const reason = event.reason || undefined;
          if (this.config.onSessionEnded) this.config.onSessionEnded(reason);
          this.emit('sessionEnded', reason);
        }
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

  private sendJson(payload: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Impossible d'envoyer le message : WebSocket non connecté.");
    }
    this.ws.send(JSON.stringify(payload));
  }

  /**
   * Envoie une invite textuelle à l'agent vocal.
   */
  public sendText(text: string): void {
    this.updateStatus('THINKING');
    this.sendJson({ type: 'TEXT', text });
  }

  /**
   * Envoie un flux de données audio brutes issues du micro du client
   * (PCM 16 kHz pour l'uplink, conformément au backend).
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
   * Confirme une action proposée par l'agent (ajout au panier, réservation).
   * Sans cette confirmation, l'action reste en attente puis expire (5 min).
   */
  public confirmAction(actionId: string): void {
    this.sendJson({ type: 'CONFIRM_ACTION', actionId });
  }

  /**
   * Interrompt la prise de parole de l'agent.
   */
  public interrupt(): void {
    this.sendJson({ type: 'INTERRUPT' });
  }

  /**
   * Métadonnées audio annoncées par le serveur (`null` avant `AUDIO_META`).
   */
  public getAudioMeta(): LiveAgentAudioMeta | null {
    return this.audioMeta;
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
    this.closed = true;
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
   *
   * Le jeton de session est demandé de façon asynchrone ; la poignée retournée
   * expose l'état via `getStatus()` et les callbacks de configuration.
   */
  public connect(config: LiveAgentSessionConfig): LiveAgentSession {
    const rawSlug = config.restaurantSlug || this.http.getConfig().restaurantId || '';
    const slug = rawSlug.replace(/[\r\n\x00-\x1F\x7F\u2028\u2029]/g, '').trim();

    if (!slug) {
      throw new Error('restaurantSlug est requis pour ouvrir une session Live Agent.');
    }

    const explicitWsUrl = config.wsUrl;
    if (explicitWsUrl && !/^wss?:\/\//i.test(explicitWsUrl.trim())) {
      throw new Error("L'URL WebSocket doit obligatoirement commencer par 'ws://' ou 'wss://'.");
    }

    const urlProvider = async (): Promise<string> => {
      const grant = await this.requestSessionGrant(slug);
      return this.appendQuery(explicitWsUrl || this.buildDefaultWsUrl(), {
        restaurantSlug: slug,
        grant: grant || undefined
      });
    };

    // Un `grant` fourni par l'appelant évite l'aller-retour HTTP et garde
    // `connect()` synchrone (utile en SSR/test et pour les jetons pré-obtenus).
    if (config.grant) {
      const url = this.appendQuery(explicitWsUrl || this.buildDefaultWsUrl(), {
        restaurantSlug: slug,
        grant: config.grant
      });
      return new LiveAgentSession(config, url);
    }

    return new LiveAgentSession(config, urlProvider);
  }

  /**
   * Obtient un jeton de session à usage unique.
   * Retourne `null` si l'environnement ne l'exige pas (dev sans secret).
   */
  private async requestSessionGrant(slug: string): Promise<string | null> {
    try {
      const response = await this.http.request<{ grant?: string }>(
        `/api/public/live-agent/${encodeURIComponent(slug)}/session`,
        { method: 'POST', skipAuthRefresh: true, retries: 0 }
      );
      return response && typeof response.grant === 'string' ? response.grant : null;
    } catch (err) {
      if (err instanceof RestorinoApiError && [401, 403, 404, 429].includes(err.status)) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Déduit l'URL WebSocket depuis `baseUrl` en conservant un éventuel
   * préfixe de chemin (proxy `/api`, version `/v1`…).
   */
  private buildDefaultWsUrl(): string {
    const base = (this.http.getConfig().baseUrl || '').trim();

    if (!/^https?:\/\//i.test(base)) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
      const wsProtocol = origin.startsWith('https') ? 'wss' : 'ws';
      const host = origin.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      const path = base.replace(/^\/+/, '').replace(/\/+$/, '');
      return `${wsProtocol}://${host}${path ? `/${path}` : ''}`;
    }

    const url = new URL(base);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/+$/, '');
  }

  private appendQuery(url: string, params: Record<string, string | undefined>): string {
    const wsBase = url.replace(/\/+$/, '');
    const resource = '/ws/public/live-agent';
    const target = wsBase.includes('/ws/') ? wsBase : `${wsBase}${resource}`;

    try {
      const parsed = new URL(target);
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === '') parsed.searchParams.delete(key);
        else parsed.searchParams.set(key, value);
      }
      return parsed.toString();
    } catch {
      const separator = target.includes('?') ? '&' : '?';
      const query = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== '')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&');
      return query ? `${target}${separator}${query}` : target;
    }
  }
}
