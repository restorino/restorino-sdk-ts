import { HttpClient, RestorinoApiError } from '../http/http-client';
import {
  LiveAgentAudioMeta,
  LiveAgentSessionConfig,
  LiveAgentStatus,
  LiveAgentClientAction,
  LiveAgentEvent,
  LiveAgentEventListener
} from '../types/live-agent';

/** Cadres de contrôle : jamais des actions, même si leur message contient
 *  `ACTION_…` (ex. `{"type":"ERROR","message":"ACTION_EXPIRED"}`). */
const NON_ACTION_FRAMES = new Set([
  'ERROR',
  'AUDIO_META',
  'TRANSCRIPT',
  'STATUS',
  'INTERRUPTED',
  'SESSION_ENDED'
]);

function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Le backend émet ses actions sous la forme
 * `{"type":"ACTION_CART_ADD","payload":{…}}`, sans `action` de premier niveau.
 */
function isActionFrame(data: any): boolean {
  return (
    typeof data.type === 'string' &&
    data.type.startsWith('ACTION_') &&
    !NON_ACTION_FRAMES.has(data.type)
  );
}

/**
 * Copie de surface sans clés de pollution de prototype. `JSON.parse` crée une
 * propriété propre `__proto__` (contrairement à la syntaxe objet) : la recopier
 * dans un objet littéral écraserait son prototype.
 */
function sanitizeRecord(source: Record<string, any>): Record<string, any> {
  const safe: Record<string, any> = {};
  for (const [key, value] of Object.entries(source)) {
    if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
      safe[key] = value;
    }
  }
  return safe;
}

/**
 * Les actions en attente portent leur identifiant dans `payload.actionId`
 * (`ACTION_RESERVATION_PENDING` / `ACTION_ORDER_PENDING`) ; les cadres
 * historiques le portent à la racine. `confirmAction()` exige cet identifiant.
 */
function pickActionId(data: Record<string, any>): string | undefined {
  if (isRecord(data.payload) && typeof data.payload.actionId === 'string') {
    return data.payload.actionId;
  }
  return typeof data.actionId === 'string' ? data.actionId : undefined;
}

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
            } else if (isActionFrame(data)) {
              // Sans cette branche, aucune action n'atteignait le consommateur :
              // le serveur n'envoie pas de `action` de premier niveau, donc
              // `confirmAction(actionId)` était inutilisable.
              const actionPayload: LiveAgentClientAction = {
                action: data.type,
                payload: isRecord(data.payload) ? sanitizeRecord(data.payload) : sanitizeRecord(data),
                actionId: pickActionId(data)
              };
              if (this.config.onClientAction) this.config.onClientAction(actionPayload);
              this.emit('action', actionPayload);
            } else if (data.action && typeof data.action === 'string') {
              // Compatibilité : cadres historiques `{ action, actionId }`.
              const actionPayload: LiveAgentClientAction = {
                action: data.action,
                payload: sanitizeRecord(data),
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
   * Sans `grant`, le SDK demande d'abord un jeton au backend : `connect()`
   * retourne alors une promesse qui **rejette** si le grant est refusé (le
   * backend est *fail-closed* : `SESSION_GRANT_REQUIRED`, close 1008, aucun
   * socket utile sans grant). Fournir `grant` garde `connect()` synchrone.
   */
  public connect(config: LiveAgentSessionConfig & { grant: string }): LiveAgentSession;
  public connect(config: LiveAgentSessionConfig): Promise<LiveAgentSession>;
  public connect(config: LiveAgentSessionConfig): LiveAgentSession | Promise<LiveAgentSession> {
    const rawSlug = config.restaurantSlug || this.http.getConfig().restaurantId || '';
    const slug = rawSlug.replace(/[\r\n\x00-\x1F\x7F\u2028\u2029]/g, '').trim();

    if (!slug) {
      throw new Error('restaurantSlug est requis pour ouvrir une session Live Agent.');
    }

    const explicitWsUrl = config.wsUrl;
    if (explicitWsUrl && !/^wss?:\/\//i.test(explicitWsUrl.trim())) {
      throw new Error("L'URL WebSocket doit obligatoirement commencer par 'ws://' ou 'wss://'.");
    }

    // Un `grant` fourni par l'appelant évite l'aller-retour HTTP et garde
    // `connect()` synchrone (utile en SSR/test et pour les jetons pré-obtenus).
    if (config.grant) {
      const url = this.appendQuery(explicitWsUrl || this.buildDefaultWsUrl(), {
        restaurantSlug: slug,
        grant: config.grant
      });
      return new LiveAgentSession(config, url);
    }

    return this.openSession(config, slug, explicitWsUrl);
  }

  /** Obtient le grant **avant** d'ouvrir le socket, et propage l'échec. */
  private async openSession(
    config: LiveAgentSessionConfig,
    slug: string,
    explicitWsUrl?: string
  ): Promise<LiveAgentSession> {
    const grant = await this.requestSessionGrant(slug);
    const url = this.appendQuery(explicitWsUrl || this.buildDefaultWsUrl(), {
      restaurantSlug: slug,
      grant
    });
    return new LiveAgentSession(config, url);
  }

  /**
   * Obtient un jeton de session à usage unique.
   * Tout refus est propagé avec son statut HTTP : ouvrir le socket sans grant
   * ne produisait qu'une fermeture 1008 côté serveur, sans explication.
   */
  private async requestSessionGrant(slug: string): Promise<string> {
    let response: { grant?: string } | null;
    try {
      response = await this.http.request<{ grant?: string }>(
        `/api/public/live-agent/${encodeURIComponent(slug)}/session`,
        { method: 'POST', skipAuthRefresh: true, retries: 0 }
      );
    } catch (err) {
      if (err instanceof RestorinoApiError) {
        const denied = new RestorinoApiError(
          err.status,
          `Live Agent : grant de session refusé (HTTP ${err.status}). Le serveur rejette toute connexion sans grant (SESSION_GRANT_REQUIRED).`,
          'SESSION_GRANT_FAILED',
          err.field,
          err
        );
        // Conserve les métadonnées utiles au backoff et au support.
        denied.requestId = err.requestId;
        denied.retryAfterMs = err.retryAfterMs;
        throw denied;
      }
      throw err;
    }

    if (!response || typeof response.grant !== 'string' || response.grant.length === 0) {
      throw new RestorinoApiError(
        200,
        'Live Agent : la réponse du serveur ne contient aucun grant de session.',
        'INVALID_RESPONSE',
        undefined,
        response
      );
    }
    return response.grant;
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
