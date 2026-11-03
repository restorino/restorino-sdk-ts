import { HttpClient, RestorinoApiError } from '../http/http-client';
import {
  CustomerLoginRequest,
  CustomerRegisterRequest,
  CustomerGoogleAuthRequest,
  CustomerAuthResponse,
  CustomerRefreshTokenResponse,
  ChangePasswordRequest,
  PasswordResetRequest,
  PasswordResetConfirmRequest
} from '../types/auth';
import { MessageResponse } from '../types/common';

export class AuthModule {
  constructor(private http: HttpClient) {}

  /**
   * `restaurantId` est `@NotBlank` côté backend : échouer localement avec un
   * message clair évite de transformer une erreur de configuration en 400 opaque.
   */
  private resolveRestaurantId(override?: string): string {
    const restaurantId = override || this.http.getConfig().restaurantId;
    if (!restaurantId) {
      throw new RestorinoApiError(
        400,
        'restaurantId est requis : fournissez-le à la configuration du client ou à l’appel.',
        'MISSING_RESTAURANT_ID'
      );
    }
    return restaurantId;
  }

  /**
   * En mode cookies (défaut) le backend ne renvoie aucun token dans le corps :
   * son absence n'est pas un échec. On ne stocke que si un jeton est présent
   * (compatibilité avec les backends en mode Bearer).
   */
  private adoptSession(response?: CustomerAuthResponse | null): void {
    if (response && response.token) {
      this.http.setAuthTokens(response.token, response.refreshToken ?? undefined);
    }
  }

  /**
   * Connexion d'un compte client (Email + Mot de passe).
   */
  public async login(data: CustomerLoginRequest): Promise<CustomerAuthResponse> {
    const restaurantId = this.resolveRestaurantId(data.restaurantId);
    const response = await this.http.request<CustomerAuthResponse>('/api/auth/customers/login', {
      method: 'POST',
      body: { ...data, restaurantId }
    });

    this.adoptSession(response);
    return response;
  }

  /**
   * Inscription d'un nouveau compte client pour le restaurant.
   */
  public async register(data: CustomerRegisterRequest): Promise<CustomerAuthResponse> {
    const restaurantId = this.resolveRestaurantId(data.restaurantId);
    const response = await this.http.request<CustomerAuthResponse>('/api/auth/customers/register', {
      method: 'POST',
      body: { ...data, restaurantId }
    });

    this.adoptSession(response);
    return response;
  }

  /**
   * Connexion ou auto-inscription d'un client via Google Sign-In (Token ID Google).
   */
  public async loginWithGoogle(data: CustomerGoogleAuthRequest): Promise<CustomerAuthResponse> {
    const restaurantId = this.resolveRestaurantId(data.restaurantId);
    const response = await this.http.request<CustomerAuthResponse>('/api/auth/customers/google', {
      method: 'POST',
      body: { ...data, restaurantId }
    });

    this.adoptSession(response);
    return response;
  }

  /**
   * Rafraîchissement explicite de la session client.
   *
   * Délègue au transport : le backend renouvelle à partir des cookies HttpOnly
   * et répond `{ success: true }` sans token. Le paramètre n'est conservé que
   * pour les backends exigeant un refresh token dans le corps.
   */
  public async refreshToken(refreshToken?: string): Promise<CustomerRefreshTokenResponse> {
    const previousRefreshToken = refreshToken || this.http.getRefreshToken();
    if (previousRefreshToken && !this.http.getRefreshToken()) {
      this.http.setRefreshToken(previousRefreshToken);
    }

    const refreshed = await this.http.tryRefreshToken();
    if (!refreshed) {
      throw new RestorinoApiError(
        401,
        'Session expirée : impossible de rafraîchir le jeton.',
        'REFRESH_FAILED'
      );
    }

    return {
      success: true,
      token: this.http.getToken() ?? undefined,
      refreshToken: this.http.getRefreshToken() ?? undefined
    };
  }

  /**
   * Déconnexion du client et invalidation de session côté serveur.
   */
  public async logout(): Promise<void> {
    try {
      await this.http.request<void>('/api/auth/customers/logout', {
        method: 'POST',
        skipAuthRefresh: true,
        retries: 0
      });
    } catch {
      // Ignorer l'erreur réseau ou 401 lors de la déconnexion
    } finally {
      this.http.clearTokens();
    }
  }

  /**
   * Récupère le profil du client connecté avec son statut fidélité.
   */
  public async getMe(): Promise<CustomerAuthResponse> {
    return this.http.request<CustomerAuthResponse>('/api/auth/customers/me', {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Modification du mot de passe du client connecté.
   */
  public async changePassword(data: ChangePasswordRequest): Promise<void> {
    return this.http.request<void>('/api/auth/customers/change-password', {
      method: 'POST',
      body: data,
      requiresAuth: true
    });
  }

  /**
   * Envoi d'une demande de vérification de l'adresse email.
   */
  public async requestEmailVerification(): Promise<MessageResponse> {
    return this.http.request<MessageResponse>('/api/customers/verify-email/request', {
      method: 'POST',
      requiresAuth: true
    });
  }

  /**
   * Validation du token de vérification d'email reçu par lien.
   */
  public async verifyEmail(token: string): Promise<MessageResponse> {
    return this.http.request<MessageResponse>('/api/customers/verify-email', {
      method: 'GET',
      params: { token }
    });
  }

  /**
   * Demande de réinitialisation de mot de passe (Anti-énumération).
   */
  public async requestPasswordReset(email: string, restaurantId?: string): Promise<MessageResponse> {
    const targetRestaurantId = this.resolveRestaurantId(restaurantId);
    return this.http.request<MessageResponse>('/api/customers/password/reset-request', {
      method: 'POST',
      body: { email, restaurantId: targetRestaurantId } as PasswordResetRequest
    });
  }

  /**
   * Confirmation de réinitialisation de mot de passe avec le code OTP à 6 chiffres.
   */
  public async confirmPasswordReset(data: PasswordResetConfirmRequest): Promise<MessageResponse> {
    const restaurantId = this.resolveRestaurantId(data.restaurantId);
    return this.http.request<MessageResponse>('/api/customers/password/reset-confirm', {
      method: 'POST',
      body: { ...data, restaurantId }
    });
  }
}
