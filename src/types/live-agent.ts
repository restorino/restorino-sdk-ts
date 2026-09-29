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
   * Callback déclenché lors de la réception d'un événement textuel ou transcript.
   */
  onTranscript?: (role: 'user' | 'assistant', text: string) => void;

  /**
   * Callback déclenché lors de la réception d'un chunk audio brut (PCM 16kHz).
   */
  onAudio?: (audioChunk: Uint8Array) => void;

  /**
   * Callback déclenché lorsque l'agent vocal exécute une action storefront en direct
   * (ex: ajout automatique d'un plat au panier, redirection vers réservation).
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
   * Callback d'erreur.
   */
  onError?: (error: Error) => void;

  /**
   * Callback de déconnexion.
   */
  onClose?: () => void;
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
}
