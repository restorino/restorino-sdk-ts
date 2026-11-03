import { RestorinoClientConfig } from '../types/common';
import { isStorefrontEndpoint } from '../security/scope';

/**
 * Marque partagée par les builds CJS et ESM (registre global des symboles).
 * Elle évite qu'un simple objet `{ name: 'RestorinoApiError' }` soit pris pour
 * une vraie erreur du SDK.
 */
const RESTORINO_ERROR_BRAND: unique symbol = Symbol.for('restorino.sdk.apiError');

/**
 * Classe d'erreur spécialisée pour les retours API Restorino.
 */
export class RestorinoApiError extends Error {
  public status: number;
  public error: string;
  public field?: string;
  public raw: unknown;
  /** En-tête `x-request-id` de la réponse (utile au support). */
  public requestId?: string;
  /** Délai demandé par `Retry-After`, en millisecondes. */
  public retryAfterMs?: number;
  /** @internal Marque d'identité inter-builds. */
  public readonly [RESTORINO_ERROR_BRAND] = true;

  /**
   * Rend `instanceof` fiable entre les builds CJS (`dist/`) et ESM (`dist/esm/`).
   *
   * Le paquet expose deux entrées ; sans ce garde, une erreur levée par l'une
   * n'est pas reconnue par l'autre et le `switch` de gestion d'erreur
   * recommandé tombe silencieusement dans `default`.
   */
  static [Symbol.hasInstance](value: unknown): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      (value as Record<symbol, unknown>)[RESTORINO_ERROR_BRAND] === true
    );
  }

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
  /** En-tête `Idempotency-Key` (création de commande, réservation, paiement). */
  idempotencyKey?: string;
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
  private deviceFingerprintStorageKey: string;
  private ephemeralFingerprint: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;
  /** Incrémenté à chaque fermeture de session (voir `clearTokens`). */
  private sessionGeneration = 0;

  /**
   * Valide `baseUrl` : seuls les absolus http(s) et les chemins racine
   * relatifs sont acceptés. Bloque `javascript:`, `data:`, `file:`, les URL
   * protocol-relative (`//evil.com`) et les identifiants embarqués
   * (`https://user:pass@host`).
   */
  private static normalizeBaseUrl(raw?: string): string {
    const value = typeof raw === 'string' ? raw.trim() : '';

    // Chaîne vide = même origine (le storefront sert de proxy/BFF).
    if (value === '') return '';

    if (value.startsWith('//')) {
      throw new Error('baseUrl protocol-relative interdit : précisez https://… ou un chemin relatif.');
    }

    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
      if (!/^https?:\/\//i.test(value)) {
        throw new Error('baseUrl doit utiliser le protocole http(s).');
      }
      let parsed: URL;
      try {
        parsed = new URL(value);
      } catch {
        throw new Error('baseUrl invalide.');
      }
      if (parsed.username || parsed.password) {
        throw new Error('baseUrl ne doit pas embarquer d’identifiants.');
      }
      return value.replace(/\/+$/, '');
    }

    if (!value.startsWith('/')) {
      throw new Error('baseUrl doit être absolu (https://…) ou commencer par /.');
    }

    return value.replace(/\/+$/, '');
  }

  constructor(config: RestorinoClientConfig) {
    this.config = {
      ...config,
      baseUrl: HttpClient.normalizeBaseUrl(config && config.baseUrl),
      // Défaut explicite : le contrat storefront ne peut pas être désactivé par omission.
      scope: config?.scope === 'all' ? 'all' : 'storefront'
    };
    this.tokenStorageKey = config.tokenStorageKey || 'restorino_customer_token';
    this.refreshTokenStorageKey = config.refreshTokenStorageKey || 'restorino_customer_refresh_token';
    this.deviceFingerprintStorageKey = config.deviceFingerprintStorageKey || 'restorino_device_fingerprint';
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
  public setAuthTokens(token: string | null, refreshToken?: string | null): void {
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
   *
   * Incrémente la génération de session : un rafraîchissement en vol ne peut
   * plus réinstaller des jetons après une déconnexion.
   */
  public clearTokens(): void {
    this.sessionGeneration++;
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

    if (typeof safeConfig.baseUrl === 'string') {
      safeConfig.baseUrl = HttpClient.normalizeBaseUrl(safeConfig.baseUrl);
    }

    // Le périmètre ne peut pas être élargi après construction : sinon du code
    // applicatif (ou une XSS) pourrait passer en 'all' puis appeler des routes
    // privilégiées. Il se fixe à la création du client, pas à l'exécution.
    delete (safeConfig as Record<string, unknown>).scope;

    const previousTenant = this.config.tenantId;
    const previousRestaurant = this.config.restaurantId;
    this.config = { ...this.config, ...safeConfig };

    // Changer de contexte tenant/restaurant sans invalider la session laisse
    // en place un JWT appartenant à l'ancien tenant (fuite inter-tenant côté UI,
    // requêtes rejetées par le backend).
    if (
      (safeConfig.tenantId !== undefined && safeConfig.tenantId !== previousTenant) ||
      (safeConfig.restaurantId !== undefined && safeConfig.restaurantId !== previousRestaurant)
    ) {
      this.clearTokens();
    }
  }

  /**
   * Retourne la configuration active.
   */
  public getConfig(): RestorinoClientConfig {
    return {
      ...this.config,
      defaultHeaders: this.config.defaultHeaders ? { ...this.config.defaultHeaders } : undefined
    };
  }

  /**
   * Mode de stockage effectif.
   *
   * Défaut = mémoire : un refresh token en `localStorage` est lisible par tout
   * XSS. Le backend a délibérément déplacé les jetons en cookies HttpOnly ;
   * persister un jeton en JS annulerait cette protection. Le stockage navigateur
   * doit donc être demandé explicitement.
   */
  private storageMode(): 'local' | 'session' | 'memory' {
    if (this.config.storageType === 'localStorage') return 'local';
    if (this.config.storageType === 'sessionStorage') return 'session';
    return 'memory';
  }

  private persistValue(key: string, value: string | null): void {
    if (typeof window === 'undefined') return;
    const mode = this.storageMode();
    if (mode === 'memory') return;

    try {
      const store = mode === 'session' ? sessionStorage : localStorage;
      if (value) store.setItem(key, value);
      else store.removeItem(key);
    } catch {
      // Ignorer si stockage inaccessible
    }
  }

  private loadStoredValue(key: string): string | null {
    if (typeof window === 'undefined') return null;
    const mode = this.storageMode();
    if (mode === 'memory') return null;

    try {
      const store = mode === 'session' ? sessionStorage : localStorage;
      const raw = store.getItem(key);
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
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const currentRefreshToken = this.refreshToken;
    const cookieMode = this.credentialsMode() !== 'omit';

    if (!currentRefreshToken && !cookieMode) {
      return false;
    }

    this.refreshPromise = (async () => {
      const generation = this.sessionGeneration;
      try {
        const refreshResponse = await this.executeSingleRequest<{
          token?: string;
          refreshToken?: string;
          success?: boolean;
        }>('/api/auth/refresh', {
          method: 'POST',
          body: currentRefreshToken ? { refreshToken: currentRefreshToken } : undefined,
          headers: {
            'X-Auth-Scope': 'customer',
            ...(currentRefreshToken
              ? { 'x-refresh-token': this.sanitizeHeaderValue(currentRefreshToken) }
              : {})
          },
          skipAuthRefresh: true,
          retries: 0
        });

        // Déconnexion pendant le rafraîchissement : ne pas ressusciter les jetons.
        if (generation !== this.sessionGeneration) {
          return false;
        }

        // Un 200 explicite `{success:false}` n'est pas un renouvellement :
        // le prendre pour tel rejouerait la requête avec les mêmes jetons et
        // masquerait la vraie cause derrière un 401 secondaire.
        if (refreshResponse && refreshResponse.success === false) {
          return false;
        }

        if (refreshResponse && refreshResponse.token) {
          this.setToken(refreshResponse.token);
          if (refreshResponse.refreshToken) {
            this.setRefreshToken(refreshResponse.refreshToken);
          }
        }

        // Le backend rafraîchit à partir des cookies HttpOnly et répond
        // `{success:true}` sans renvoyer de token : un 2xx = session renouvelée.
        return true;
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
        // Backoff exponentiel avec jitter, borné par `Retry-After` quand le
        // serveur en fournit un (429 / 503).
        const backoff = baseRetryDelay * Math.pow(2, attempt - 1) + Math.random() * 50;
        const retryAfterMs = lastError instanceof RestorinoApiError ? lastError.retryAfterMs : undefined;
        const delay = Math.min(
          retryAfterMs !== undefined ? Math.max(backoff, retryAfterMs) : backoff,
          retryAfterMs !== undefined ? 60000 : 10000
        );
        await new Promise<void>((resolve, reject) => {
          const signal = options.signal;
          if (signal?.aborted) {
            reject(new RestorinoApiError(0, 'Requête annulée pendant le réessai.', 'REQUEST_ABORTED'));
            return;
          }

          let settled = false;
          const onAbort = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            reject(new RestorinoApiError(0, 'Requête annulée pendant le réessai.', 'REQUEST_ABORTED'));
          };
          const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            signal?.removeEventListener('abort', onAbort);
            resolve();
          }, delay);

          signal?.addEventListener('abort', onAbort, { once: true });
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
        const isTransient =
          err instanceof RestorinoApiError &&
          (err.status === 0 || err.status === 408 || err.status === 429 || err.status === 502 || err.status === 503 || err.status === 504);

        // 409 Conflict = verrou optimiste / course. On ne le rejoue que lorsque
        // le rejeu est sûr : requête idempotente ou `Idempotency-Key` fournie.
        // Rejouer un POST sans clé peut dupliquer une écriture partiellement appliquée.
        const isConflict = err instanceof RestorinoApiError && err.status === 409;
        const conflictReplaySafe = isIdempotent || Boolean(options.idempotencyKey);
        const canRetryConflict = isConflict && conflictReplaySafe && attempt < 2;

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

    // Périmètre : le SDK storefront ne peut appeler que la surface publique et
    // l'espace client. Tout le reste est refusé AVANT quel appel réseau, y
    // compris via l'échappatoire `http.request()`.
    if (this.config.scope !== 'all' && !isStorefrontEndpoint(endpoint)) {
      throw new RestorinoApiError(
        403,
        `Endpoint hors périmètre storefront : ${endpoint}`,
        'OUT_OF_SCOPE_ENDPOINT'
      );
    }

    const controller = new AbortController();
    const effectiveTimeout = timeoutMs !== undefined ? timeoutMs : (this.config.timeoutMs ?? 30000);
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (effectiveTimeout > 0) {
      timer = setTimeout(() => {
        controller.abort(new Error(`Délai d'attente dépassé (${effectiveTimeout}ms).`));
      }, effectiveTimeout);
    }

    let onCallerAbort: (() => void) | null = null;
    if (callerSignal) {
      if (callerSignal.aborted) {
        controller.abort(callerSignal.reason);
      } else {
        onCallerAbort = () => controller.abort(callerSignal.reason);
        callerSignal.addEventListener('abort', onCallerAbort, { once: true });
      }
    }

    const url = this.buildUrl(endpoint, params);
    const isIdempotentMethod = method === 'GET' || method === 'HEAD';

    const headers: Record<string, string> = { Accept: 'application/json' };
    this.mergeHeaders(headers, this.config.defaultHeaders);
    this.mergeHeaders(headers, customHeaders);

    if (!isFormData && body && method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }

    this.applyTenantHeaders(headers);

    const deviceFingerprint = this.getDeviceFingerprint();
    if (deviceFingerprint) {
      headers['X-Device-Fingerprint'] = deviceFingerprint;
    }

    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = this.sanitizeHeaderValue(options.idempotencyKey);
    }

    // Double-submit CSRF : le backend publie le jeton dans le cookie lisible
    // `XSRF-TOKEN` et exige `X-XSRF-TOKEN` sur toute mutation non exemptée.
    if (!isIdempotentMethod && this.config.csrf !== false) {
      const csrfToken = this.readCookie('XSRF-TOKEN');
      if (csrfToken) {
        headers['X-XSRF-TOKEN'] = this.sanitizeHeaderValue(csrfToken);
      }
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.sanitizeHeaderValue(this.token)}`;
    } else if (requiresAuth && this.credentialsMode() === 'omit') {
      // Sans token et sans cookies, aucun moyen de s'authentifier : on échoue
      // localement plutôt que d'émettre un appel voué au 401.
      if (timer) clearTimeout(timer);
      throw new RestorinoApiError(401, 'Authentification requise pour cette action.', 'UNAUTHORIZED');
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
      credentials: this.credentialsMode(),
      signal: controller.signal
    };

    let response: Response;
    const startedAt = Date.now();
    this.emitHook(() => this.config.onRequest?.({ method, path: endpoint }));

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
      // Sans ce retrait, un AbortSignal longue durée (partagé entre requêtes)
      // accumule un listener par appel : fuite mémoire et avertissements
      // MaxListeners sous Node.
      if (callerSignal && onCallerAbort) {
        callerSignal.removeEventListener('abort', onCallerAbort);
      }
    }

    const requestId = response.headers.get('x-request-id') || undefined;
    this.emitHook(() => this.config.onResponse?.({
      method,
      path: endpoint,
      status: response.status,
      durationMs: Date.now() - startedAt,
      requestId
    }));

    // Un 401 sur un endpoint public (login, reset…) ne doit jamais détruire
    // la session en cours : on ne réagit que sur les appels authentifiés.
    if (response.status === 401 && requiresAuth) {
      const autoRefreshEnabled = this.config.autoRefreshToken !== false;
      const canRefresh = this.refreshToken !== null || this.credentialsMode() !== 'omit';

      if (autoRefreshEnabled && !skipAuthRefresh && canRefresh) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          // Rejouer une seule fois la requête protégée
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
      await this.handleErrorResponse(response, requestId);
    }

    // Gestion des réponses vides (ex: 204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('json')) {
      // Couvre `application/json`, `application/ld+json`, `application/problem+json`.
      return (await response.json()) as T;
    }

    const text = await response.text();

    // 200 sans corps : rien à désérialiser.
    if (text.trim() === '') {
      return {} as T;
    }

    // Tous les endpoints de ce SDK répondent en JSON. Un 2xx non-JSON vient
    // d'un proxy mal configuré ou d'une page de capture : le typer en `T`
    // produisait des `undefined` impossibles à tracer (et masquait un éventuel
    // détournement de trafic).
    throw new RestorinoApiError(
      response.status,
      `Réponse non-JSON inattendue (${contentType || 'content-type absent'}) : vérifiez la baseUrl et le proxy.`,
      'INVALID_RESPONSE',
      undefined,
      text.slice(0, 2048)
    );
  }

  private credentialsMode(): RequestCredentials {
    return this.config.credentials || 'include';
  }

  private mergeHeaders(target: Record<string, string>, source?: Record<string, string>): void {
    if (!source) return;
    for (const [key, value] of Object.entries(source)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      if (value === undefined || value === null) continue;
      const cleanKey = this.sanitizeHeaderValue(key);
      if (!cleanKey) continue;
      target[cleanKey] = this.sanitizeHeaderValue(value);
    }
  }

  private static readonly UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  /**
   * Le backend refuse (403 TENANT_HEADER_CONFLICT) un `x-restaurant-id` qui
   * n'est pas un UUID ou qui contredit le JWT. Les slugs partent donc dans
   * `x-tenant-slug`, les UUID dans leur en-tête dédié.
   */
  private applyTenantHeaders(headers: Record<string, string>): void {
    const tenant = this.sanitizeHeaderValue(this.config.tenantId);
    const restaurant = this.sanitizeHeaderValue(this.config.restaurantId);

    if (tenant) {
      if (HttpClient.UUID_PATTERN.test(tenant)) headers['x-tenant-id'] = tenant;
      else headers['x-tenant-slug'] = tenant;
    }

    if (restaurant) {
      if (HttpClient.UUID_PATTERN.test(restaurant)) headers['x-restaurant-id'] = restaurant;
      else if (!headers['x-tenant-slug']) headers['x-tenant-slug'] = restaurant;
    }
  }

  private readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    try {
      const prefix = `${name}=`;
      for (const part of document.cookie.split(';')) {
        const trimmed = part.trim();
        if (trimmed.startsWith(prefix)) {
          return decodeURIComponent(trimmed.slice(prefix.length));
        }
      }
    } catch {
      // Cookie inaccessible (sandbox, iframe) : on continue sans CSRF header.
    }
    return null;
  }

  /**
   * Identifiant d'appareil stable, requis pour que le refresh token reste
   * lié à ce navigateur (le backend révoque toute la famille de tokens en cas
   * de mismatch, y compris quand il retombe sur IP + User-Agent).
   */
  private getDeviceFingerprint(): string | null {
    const configured = this.sanitizeHeaderValue(this.config.deviceFingerprint);
    if (configured) return configured;

    if (this.ephemeralFingerprint) return this.ephemeralFingerprint;
    if (typeof window === 'undefined') return null;

    const stored = this.loadStoredValue(this.deviceFingerprintStorageKey);
    if (stored) return stored;

    const generated = this.generateDeviceFingerprint();
    this.persistValue(this.deviceFingerprintStorageKey, generated);
    this.ephemeralFingerprint = generated;
    return generated;
  }

  private generateDeviceFingerprint(): string {
    const cryptoObj = (globalThis as any)?.crypto;
    if (cryptoObj?.randomUUID) {
      return cryptoObj.randomUUID();
    }
    if (cryptoObj?.getRandomValues) {
      const bytes = new Uint8Array(16);
      cryptoObj.getRandomValues(bytes);
      return Array.from(bytes, (b: number) => b.toString(16).padStart(2, '0')).join('');
    }
    return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
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

    // Éviter /api/api/... quand la baseUrl porte déjà le préfixe du proxy Next.js.
    if (/\/api$/i.test(base) && /^\/api\//i.test(cleanEndpoint)) {
      cleanEndpoint = cleanEndpoint.replace(/^\/api/i, '');
    }

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

  private emitHook(run: () => void): void {
    try {
      run();
    } catch {
      // Un hook d'observation ne doit jamais casser une requête.
    }
  }

  private parseRetryAfter(response: Response): number | undefined {
    const raw = response.headers.get('retry-after');
    if (!raw) return undefined;

    const seconds = Number(raw);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, 60000);
    }

    const date = Date.parse(raw);
    if (Number.isFinite(date)) {
      return Math.min(Math.max(date - Date.now(), 0), 60000);
    }

    return undefined;
  }

  private async handleErrorResponse(response: Response, requestId?: string): Promise<never> {
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

    // Borner le corps d'erreur conservé en mémoire : une réponse volumineuse
    // (ou piégée) ne doit pas saturer la heap du client.
    let rawPayload: unknown = errorData;
    try {
      if (JSON.stringify(errorData).length > 8192) {
        rawPayload = { message };
      }
    } catch {
      rawPayload = { message };
    }

    const error = new RestorinoApiError(response.status, message, errorType, field, rawPayload);
    error.requestId = requestId;

    const retryAfterMs = this.parseRetryAfter(response);
    if (retryAfterMs !== undefined) {
      error.retryAfterMs = retryAfterMs;
    }

    throw error;
  }
}
