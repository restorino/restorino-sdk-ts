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
 */
export type LiveAgentStatus =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'INTERRUPTED'
  | 'UPSTREAM_DISCONNECTED'
  | 'DISCONNECTED'
  | 'ERROR';

/**
 * Action déclenchée par l'agent vocal sur le panier ou l'interface du client.
 */
export interface LiveAgentClientAction {
  action: 'ADD_TO_CART' | 'NAVIGATE' | 'SELECT_ITEM' | string;
  payload: Record<string, any>;
  /** Identifiant à renvoyer via `confirmAction()` pour appliquer l'action. */
  actionId?: string;
}

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

