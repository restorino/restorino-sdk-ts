/**
 * Configuration pour la session de l'Agent Vocal & Chat Storefront.
 */
export interface LiveAgentSessionConfig {
  /**
   * Slug sous-domaine ou identifiant du restaurant (ex: 'bella-vita').
   */
  restaurantSlug: string;

  /**
   * URL de base WebSocket optionnelle (ex: 'wss://api.restorino.com' ou 'ws://localhost:8080').
   * Si non fourni, déduit automatiquement à partir du baseUrl du client.
   */
  wsUrl?: string;

  /**
   * Jeton de session déjà obtenu (`POST /api/public/live-agent/{slug}/session`).
   * S'il est omis, le SDK le demande automatiquement avant d'ouvrir le socket.
   */
  grant?: string;

  /**
   * Callback déclenché lors de la réception d'un événement textuel ou transcript.
   * Le backend émet parfois `agent` : le SDK normalise en `assistant`.
   */
  onTranscript?: (role: 'user' | 'assistant', text: string) => void;

  /**
   * Callback déclenché à la réception du cadre `AUDIO_META`
   * (fréquence d'échantillonnage réelle du flux, 24 kHz par défaut).
   */
  onAudioMeta?: (meta: LiveAgentAudioMeta) => void;

  /**
   * Callback déclenché lors de la réception d'un chunk audio brut.
   * La fréquence réelle est fournie par `onAudioMeta` : ne pas la supposer.
   */
  onAudio?: (audioChunk: Uint8Array) => void;

  /**
   * Callback déclenché lorsque l'agent vocal propose une action storefront
   * (ajout au panier, réservation). L'action reste **en attente** jusqu'à
   * `session.confirmAction(actionId)`.
   */
  onClientAction?: (action: LiveAgentClientAction) => void;

  /**
   * Callback déclenché lors du changement d'état de l'agent.
   */
  onStatusChange?: (status: LiveAgentStatus) => void;

  /**
   * Callback déclenché si la parole de l'agent est interrompue par l'utilisateur.
   */
  onInterrupted?: () => void;

  /**
   * Callback déclenché lorsque le serveur termine la session (code 4001).
   * Le SDK ne doit pas se reconnecter automatiquement.
   */
  onSessionEnded?: (reason?: string) => void;

  /**
   * Callback d'erreur.
   */
  onError?: (error: Error) => void;

  /**
   * Callback de déconnexion.
   */
  onClose?: () => void;
}

/**
 * Métadonnées du flux audio descendant.
 */
export interface LiveAgentAudioMeta {
  encoding?: string;
  sampleRate: number;
  channels?: number;
}

/**
 * Statuts possibles de l'agent vocal en temps réel.
 *
 * Le backend émet `{"type":"STATUS","message":"READY"|"LISTENING"|"THINKING"}` :
 * `READY` fait donc partie du contrat. `UPSTREAM_DISCONNECTED` a été retiré,
 * il n'est émis par aucune branche du serveur.
 */
export type LiveAgentStatus =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'READY'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'INTERRUPTED'
  | 'DISCONNECTED'
  | 'ERROR';

/**
 * Action émise par l'agent vocal à destination de la vitrine.
 *
 * Le backend envoie `{"type":"ACTION_CART_ADD","payload":{…}}` : `action`
 * reprend le vocabulaire serveur (`ACTION_*`) pour ne rien perdre. Les cadres
 * historiques portant un `action` de premier niveau conservent `ADD_TO_CART`,
 * `NAVIGATE` et `SELECT_ITEM`.
 */
export interface LiveAgentClientAction {
  action: LiveAgentClientActionType;
  /**
   * Corps de l'action. Pour `ACTION_RESERVATION_PENDING` / `ACTION_ORDER_PENDING`
   * il contient `actionId` et `action` (nom de l'outil serveur).
   */
  payload: Record<string, any>;
  /** Identifiant à renvoyer via `confirmAction()` pour appliquer l'action. */
  actionId?: string;
}

/**
 * Vocabulaire des actions : types `ACTION_*` émis par le backend, plus les
 * alias historiques (`ADD_TO_CART`, `NAVIGATE`, `SELECT_ITEM`).
 */
export type LiveAgentClientActionType =
  | 'ADD_TO_CART'
  | 'NAVIGATE'
  | 'SELECT_ITEM'
  | 'ACTION_CART_ADD'
  | 'ACTION_RESERVATION_PENDING'
  | 'ACTION_RESERVATION_CREATED'
  | 'ACTION_ORDER_PENDING'
  | 'ACTION_ORDER_PLACED'
  | 'ACTION_ORDER_TRACKING'
  | 'ACTION_AVAILABILITY_CONFIRMED'
  | 'ACTION_AVAILABILITY_UNAVAILABLE'
  | 'ACTION_NAVIGATE_CATEGORY'
  | 'ACTION_DISH_RECOMMENDATION'
  | string;

/**
 * Noms d'événements supportés par la session de l'agent vocal en temps réel.
 */
export type LiveAgentEvent =
  | 'transcript'
  | 'audio'
  | 'audioMeta'
  | 'action'
  | 'status'
  | 'interrupted'
  | 'sessionEnded'
  | 'error'
  | 'close';

/**
 * Signature des écouteurs selon le type d'événement.
 */
export type LiveAgentEventListener<E extends LiveAgentEvent> =
  E extends 'transcript' ? (role: 'user' | 'assistant', text: string) => void :
  E extends 'audio' ? (audioChunk: Uint8Array) => void :
  E extends 'audioMeta' ? (meta: LiveAgentAudioMeta) => void :
  E extends 'action' ? (action: LiveAgentClientAction) => void :
  E extends 'status' ? (status: LiveAgentStatus) => void :
  E extends 'interrupted' ? () => void :
  E extends 'sessionEnded' ? (reason?: string) => void :
  E extends 'error' ? (error: Error) => void :
  E extends 'close' ? () => void :
  never;

