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
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
  body?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  isFormData?: boolean;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  skipAuthRefresh?: boolean;
  signal?: AbortSignal;
}

/**
 * Client HTTP optimisé sans dépendance (Fetch natif du navigateur / Node.js).
 */
export class HttpClient {
  private config: RestorinoClientConfig;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private tokenStorageKey: string;
  private refreshTokenStorageKey: string;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(config: RestorinoClientConfig) {
    this.config = config;
    this.tokenStorageKey = config.tokenStorageKey || 'restorino_customer_token';
    this.refreshTokenStorageKey = config.refreshTokenStorageKey || 'restorino_customer_refresh_token';
    this.token = this.loadToken();
    this.refreshToken = this.loadRefreshToken();
  }

  /**
   * Récupère le token JWT en mémoire ou dans le stockage.
   */
  public getToken(): string | null {
    return this.token;
  }

  /**
   * Récupère le refresh token en mémoire ou dans le stockage.
   */
  public getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /**
   * Récupère la clé API configurée.
   */
  public getApiKey(): string | null {
    return this.config.apiKey || null;
  }

  /**
   * Définit dynamiquement la clé API Vitrine.
   */
  public setApiKey(apiKey: string | null): void {
    this.config.apiKey = apiKey || undefined;
  }

  /**
   * Enregistre un nouveau token JWT client.
   */
  public setToken(token: string | null): void {
    this.token = token;
    this.persistValue(this.tokenStorageKey, token);
  }

  /**
   * Enregistre un nouveau refresh token client.
   */
  public setRefreshToken(refreshToken: string | null): void {
    this.refreshToken = refreshToken;
    this.persistValue(this.refreshTokenStorageKey, refreshToken);
  }

  /**
   * Enregistre simultanément le token d'accès et le refresh token.
   */
  public setAuthTokens(token: string | null, refreshToken: string | null = null): void {
    this.setToken(token);
    if (refreshToken !== undefined) {
      this.setRefreshToken(refreshToken);
    }
  }

  /**
   * Supprime le token de session.
   */
  public clearToken(): void {
    this.setToken(null);
  }

  /**
   * Supprime l'ensemble des tokens (accès et rafraîchissement).
   */
  public clearTokens(): void {
    this.setToken(null);
    this.setRefreshToken(null);
  }

  /**
   * Met à jour dynamiquement la configuration du client (ex: changement de restaurantId).
   */
  public updateConfig(newConfig: Partial<RestorinoClientConfig>): void {
    if (!newConfig || typeof newConfig !== 'object') return;
    const safeConfig: Partial<RestorinoClientConfig> = {};
    for (const [key, value] of Object.entries(newConfig)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      (safeConfig as any)[key] = value;
    }
    this.config = { ...this.config, ...safeConfig };
  }

  /**
   * Retourne la configuration active.
   */
  public getConfig(): RestorinoClientConfig {
    return this.config;
  }

  private persistValue(key: string, value: string | null): void {
    if (typeof window === 'undefined') return;
    try {
      if (this.config.storageType === 'sessionStorage') {
        if (value) sessionStorage.setItem(key, value);
        else sessionStorage.removeItem(key);
      } else if (this.config.storageType !== 'memory') {
        if (value) localStorage.setItem(key, value);
        else localStorage.removeItem(key);
      }
    } catch {
      // Ignorer si stockage inaccessible
    }
  }

  private loadStoredValue(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      let raw: string | null = null;
      if (this.config.storageType === 'sessionStorage') {
        raw = sessionStorage.getItem(key);
      } else if (this.config.storageType !== 'memory') {
        raw = localStorage.getItem(key);
      }
      if (raw && typeof raw === 'string') {
        const trimmed = raw.trim();
        // Prévention contre les tokens empoisonnés contenant CRLF, caractères de contrôle ou séparateurs Unicode
        if (
          trimmed !== '' &&
          trimmed !== 'null' &&
          trimmed !== 'undefined' &&
          !/[\r\n\x00-\x1F\x7F\u2028\u2029]/.test(trimmed)
        ) {
          return trimmed;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private loadToken(): string | null {
    return this.loadStoredValue(this.tokenStorageKey);
  }

  private loadRefreshToken(): string | null {
    return this.loadStoredValue(this.refreshTokenStorageKey);
  }

  /**
   * Tente de rafraîchir le token JWT via l'endpoint de refresh du backend.
   * Utilise une promesse partagée pour mutualiser les requêtes concurrentes.
   */
  public async tryRefreshToken(): Promise<boolean> {
    const currentRefreshToken = this.refreshToken;
    if (!currentRefreshToken) {
      return false;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshResponse = await this.executeSingleRequest<{
          token?: string;
          refreshToken?: string;
          success?: boolean;
        }>('/api/auth/refresh', {
          method: 'POST',
          body: { refreshToken: currentRefreshToken },
          headers: {
            'x-refresh-token': this.sanitizeHeaderValue(currentRefreshToken)
          },
          skipAuthRefresh: true,
          retries: 0
        });

        if (refreshResponse && refreshResponse.token) {
          this.setToken(refreshResponse.token);
          if (refreshResponse.refreshToken) {
            this.setRefreshToken(refreshResponse.refreshToken);
          }
          return true;
        } else if (refreshResponse && refreshResponse.success) {
          return true;
        }
        return false;
      } catch {
        if (this.config.onRefreshTokenFailed) {
          this.config.onRefreshTokenFailed();
        }
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Nettoie les valeurs d'en-tête contre l'injection CRLF, injection de sauts de ligne Unicode et caractères de contrôle.
   */
  private sanitizeHeaderValue(val: unknown): string {
    if (val === null || val === undefined) return '';
    return String(val).replace(/[\r\n\x00-\x1F\x7F\u2028\u2029]/g, '').trim();
  }

  /**
   * Effectue un appel HTTP avec gestion de retry exponentiel et annulation.
   */
  public async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const method = options.method || 'GET';
    const isIdempotent = method === 'GET' || method === 'HEAD';
    const maxRetries = options.retries !== undefined
      ? options.retries
      : (isIdempotent ? (this.config.retries ?? 0) : 0);
    const baseRetryDelay = options.retryDelayMs !== undefined
      ? options.retryDelayMs
      : (this.config.retryDelayMs ?? 300);

    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (options.signal?.aborted) {
        throw new RestorinoApiError(0, 'Requête annulée.', 'REQUEST_ABORTED');
      }

      if (attempt > 0) {
        // Backoff exponentiel avec jitter
        const delay = Math.min(baseRetryDelay * Math.pow(2, attempt - 1) + Math.random() * 50, 10000);
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, delay);
          if (options.signal) {
            options.signal.addEventListener('abort', () => {
              clearTimeout(timer);
              reject(new RestorinoApiError(0, 'Requête annulée pendant le réessai.', 'REQUEST_ABORTED'));
            }, { once: true });
          }
        });
      }

      try {
        return await this.executeSingleRequest<T>(endpoint, options);
      } catch (err: any) {
        lastError = err;

        if (options.signal?.aborted || err?.error === 'REQUEST_ABORTED') {
          throw err;
        }

        // Déterminer si l'erreur est transitoire (éligible au retry)
        // 409 Conflict: optimistic lock failure / race condition auto-retryable (1-2 attempts)
        const isConflict = err instanceof RestorinoApiError && err.status === 409;
        const isTransient =
          err instanceof RestorinoApiError &&
          (err.status === 0 || err.status === 408 || err.status === 429 || err.status === 502 || err.status === 503 || err.status === 504);

        const canRetryConflict = isConflict && attempt < 2;

        if ((!isTransient && !canRetryConflict) || (!canRetryConflict && attempt >= maxRetries)) {
          throw err;
        }
      }
    }

    throw lastError;
  }

  /**
   * Effectue une exécution unitaire de requête HTTP.
   */
  private async executeSingleRequest<T>(
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
      skipAuthRefresh = false,
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

    if (this.config.apiKey && this.config.allowApiKeyHeader === true) {
      headers['X-API-Key'] = this.sanitizeHeaderValue(this.config.apiKey);
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
      credentials: this.config.credentials || 'omit',
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
      const autoRefreshEnabled = this.config.autoRefreshToken !== false;
      if (autoRefreshEnabled && !skipAuthRefresh && this.refreshToken) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          // Rejouer la requête protégée avec le nouveau token
          return this.executeSingleRequest<T>(endpoint, {
            ...options,
            skipAuthRefresh: true
          });
        }
      }

      this.clearTokens();
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
    let cleanEndpoint = (typeof endpoint === 'string' ? endpoint : '').trim();

    // Nettoyer les backslashes (\) et caractères de contrôle pour prévenir les contournements de protocole (SSRF / Open Redirect)
    cleanEndpoint = cleanEndpoint.replace(/\\/g, '/');
    cleanEndpoint = cleanEndpoint.replace(/[\r\n\x00-\x1F\x7F\u2028\u2029]/g, '');

    // Supprimer le schéma & l'autorité si un endpoint absolu est accidentellement injecté
    cleanEndpoint = cleanEndpoint.replace(/^https?:\/\/[^\/]+/i, '');

    if (!cleanEndpoint.startsWith('/')) {
      cleanEndpoint = '/' + cleanEndpoint;
    }
    // Empêcher les URL protocol-relative (ex: "//evil.com")
    cleanEndpoint = cleanEndpoint.replace(/^\/+/, '/');

    let fullUrl = `${base}${cleanEndpoint}`;

    if (params && typeof params === 'object') {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        // Protection contre la pollution de prototype
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          continue;
        }
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      }
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
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        errorData = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') {
            errorData[k] = v;
          }
        }
      } else {
        errorData = { message: String(parsed) };
      }
    } catch {
      try {
        const text = await response.text();
        // Borner la taille maximale du message d'erreur pour éviter l'épuisement mémoire
        errorData = { message: text.slice(0, 2048) };
      } catch {
        errorData = { message: response.statusText || 'Erreur inconnue' };
      }
    }

    const rawMessage =
      (errorData && typeof errorData.message === 'string' && errorData.message) ||
      (errorData && typeof errorData.error === 'string' && errorData.error) ||
      `Erreur serveur (${response.status})`;
    const message = rawMessage.slice(0, 1000);
    const errorType =
      (errorData && typeof errorData.error === 'string' && errorData.error) || 'API_ERROR';
    const field = errorData && typeof errorData.field === 'string' ? errorData.field : undefined;

    throw new RestorinoApiError(response.status, message, errorType, field, errorData);
  }
}
