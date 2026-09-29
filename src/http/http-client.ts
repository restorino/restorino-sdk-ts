import { RestorinoClientConfig, ApiError } from '../types/common';

/**
 * Classe d'erreur spécialisée pour les retours API Restorino.
 */
export class RestorinoApiError extends Error {
  public status: number;
  public error: string;
  public field?: string;
  public raw: unknown;

  constructor(status: number, message: string, error = 'ApiError', field?: string, raw?: unknown) {
    super(message);
    this.name = 'RestorinoApiError';
    this.status = status;
    this.error = error;
    this.field = field;
    this.raw = raw;
  }
}

/**
 * Options configurables par requête HTTP.
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  isFormData?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Client HTTP optimisé sans dépendance (Fetch natif du navigateur / Node.js).
 */
export class HttpClient {
  private config: RestorinoClientConfig;
  private token: string | null = null;
  private tokenStorageKey: string;

  constructor(config: RestorinoClientConfig) {
    this.config = config;
    this.tokenStorageKey = config.tokenStorageKey || 'restorino_customer_token';
    this.token = this.loadToken();
  }

  /**
   * Récupère le token JWT en mémoire ou dans le stockage.
   */
  public getToken(): string | null {
    return this.token;
  }

  /**
   * Enregistre un nouveau token JWT client.
   */
  public setToken(token: string | null): void {
    this.token = token;
    if (typeof window === 'undefined') return;

    try {
      if (this.config.storageType === 'sessionStorage') {
        if (token) sessionStorage.setItem(this.tokenStorageKey, token);
        else sessionStorage.removeItem(this.tokenStorageKey);
      } else if (this.config.storageType !== 'memory') {
        if (token) localStorage.setItem(this.tokenStorageKey, token);
        else localStorage.removeItem(this.tokenStorageKey);
      }
    } catch {
      // Ignorer si localStorage/sessionStorage est bloqué
    }
  }

  /**
   * Supprime le token de session.
   */
  public clearToken(): void {
    this.setToken(null);
  }

  /**
   * Met à jour dynamiquement la configuration du client (ex: changement de restaurantId).
   */
  public updateConfig(newConfig: Partial<RestorinoClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Retourne la configuration active.
   */
  public getConfig(): RestorinoClientConfig {
    return this.config;
  }

  private loadToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      let raw: string | null = null;
      if (this.config.storageType === 'sessionStorage') {
        raw = sessionStorage.getItem(this.tokenStorageKey);
      } else if (this.config.storageType !== 'memory') {
        raw = localStorage.getItem(this.tokenStorageKey);
      }
      if (raw && typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined') {
          return trimmed;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Nettoie les valeurs d'en-tête contre l'injection CRLF et caractères de contrôle.
   */
  private sanitizeHeaderValue(val: string): string {
    return val.replace(/[\r\n\x00-\x1F\x7F]/g, '').trim();
  }

  /**
   * Effectue un appel HTTP générique avec gestion du timeout et annulation (AbortController).
   */
  public async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      params,
      headers: customHeaders = {},
      requiresAuth = false,
      isFormData = false,
      timeoutMs,
      signal: callerSignal
    } = options;

    const controller = new AbortController();
    const effectiveTimeout = timeoutMs !== undefined ? timeoutMs : (this.config.timeoutMs ?? 30000);
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (effectiveTimeout > 0) {
      timer = setTimeout(() => {
        controller.abort(new Error(`Délai d'attente dépassé (${effectiveTimeout}ms).`));
      }, effectiveTimeout);
    }

    if (callerSignal) {
      if (callerSignal.aborted) {
        controller.abort(callerSignal.reason);
      } else {
        callerSignal.addEventListener('abort', () => {
          controller.abort(callerSignal.reason);
        }, { once: true });
      }
    }

    let url = this.buildUrl(endpoint, params);

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...this.config.defaultHeaders,
      ...customHeaders
    };

    if (!isFormData && body && method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }

    if (this.config.tenantId) {
      headers['x-tenant-id'] = this.sanitizeHeaderValue(this.config.tenantId);
    }

    if (this.config.restaurantId) {
      headers['x-restaurant-id'] = this.sanitizeHeaderValue(this.config.restaurantId);
    }

    if (this.config.apiKey) {
      headers['x-api-key'] = this.sanitizeHeaderValue(this.config.apiKey);
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.sanitizeHeaderValue(this.token)}`;
    } else if (requiresAuth) {
      if (timer) clearTimeout(timer);
      throw new RestorinoApiError(401, 'Authentification requise pour cette action.', 'UNAUTHORIZED');
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
      credentials: 'omit',
      signal: controller.signal
    };

    let response: Response;
    try {
      response = await fetch(url, fetchOptions);
    } catch (networkError: any) {
      if (networkError?.name === 'AbortError' || controller.signal.aborted) {
        throw new RestorinoApiError(408, networkError?.message || 'La requête a expiré (timeout).', 'REQUEST_TIMEOUT');
      }
      throw new RestorinoApiError(0, networkError?.message || 'Impossible de contacter le serveur.', 'NETWORK_ERROR');
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }

    if (response.status === 401) {
      this.clearToken();
      if (this.config.onTokenExpired) {
        this.config.onTokenExpired();
      }
    }

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    // Gestion des réponses vides (ex: 204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }

    return (await response.text()) as unknown as T;
  }

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const base = this.config.baseUrl.replace(/\/+$/, '');
    let cleanEndpoint = endpoint.trim();
    if (!cleanEndpoint.startsWith('/')) {
      cleanEndpoint = '/' + cleanEndpoint;
    }
    // Prevent protocol-relative redirects (e.g. "//evil.com")
    cleanEndpoint = cleanEndpoint.replace(/^\/+/, '/');

    let fullUrl = `${base}${cleanEndpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
      }
    }

    return fullUrl;
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any = {};
    try {
      const parsed = await response.json();
      if (parsed && typeof parsed === 'object') {
        errorData = parsed;
      } else {
        errorData = { message: String(parsed) };
      }
    } catch {
      try {
        errorData = { message: await response.text() };
      } catch {
        errorData = { message: response.statusText || 'Erreur inconnue' };
      }
    }

    const message =
      (errorData && typeof errorData.message === 'string' && errorData.message) ||
      (errorData && typeof errorData.error === 'string' && errorData.error) ||
      `Erreur serveur (${response.status})`;
    const errorType =
      (errorData && typeof errorData.error === 'string' && errorData.error) || 'API_ERROR';
    const field = errorData && typeof errorData.field === 'string' ? errorData.field : undefined;

    throw new RestorinoApiError(response.status, message, errorType, field, errorData);
  }
}
