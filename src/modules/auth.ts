import { HttpClient } from '../http/http-client';
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
   * Connexion d'un compte client (Email + Mot de passe).
   */
  public async login(data: CustomerLoginRequest): Promise<CustomerAuthResponse> {
    const restaurantId = data.restaurantId || this.http.getConfig().restaurantId;
    const response = await this.http.request<CustomerAuthResponse>('/api/auth/customers/login', {
      method: 'POST',
      body: { ...data, restaurantId }
    });

    if (response && response.token) {
      this.http.setAuthTokens(response.token, response.refreshToken);
    }

    return response;
  }

  /**
   * Inscription d'un nouveau compte client pour le restaurant.
   */
  public async register(data: CustomerRegisterRequest): Promise<CustomerAuthResponse> {
    const restaurantId = data.restaurantId || this.http.getConfig().restaurantId;
    const response = await this.http.request<CustomerAuthResponse>('/api/auth/customers/register', {
      method: 'POST',
      body: { ...data, restaurantId }
    });

    if (response && response.token) {
      this.http.setAuthTokens(response.token, response.refreshToken);
    }

    return response;
  }

  /**
   * Connexion ou auto-inscription d'un client via Google Sign-In (Token ID Google).
   */
  public async loginWithGoogle(data: CustomerGoogleAuthRequest): Promise<CustomerAuthResponse> {
    const restaurantId = data.restaurantId || this.http.getConfig().restaurantId;
    const response = await this.http.request<CustomerAuthResponse>('/api/auth/customers/google', {
      method: 'POST',
      body: { ...data, restaurantId }
    });

    if (response && response.token) {
      this.http.setAuthTokens(response.token, response.refreshToken);
    }

    return response;
  }

  /**
   * Rafraîchissement explicite du token d'authentification client.
   */
  public async refreshToken(refreshToken?: string): Promise<CustomerRefreshTokenResponse> {
    const tokenToRefresh = refreshToken || this.http.getRefreshToken();
    const response = await this.http.request<CustomerRefreshTokenResponse>('/api/auth/refresh', {
      method: 'POST',
      body: tokenToRefresh ? { refreshToken: tokenToRefresh } : undefined,
      headers: tokenToRefresh ? { 'x-refresh-token': tokenToRefresh } : {},
      skipAuthRefresh: true,
      retries: 0
    });

    if (response && response.token) {
      this.http.setAuthTokens(response.token, response.refreshToken || tokenToRefresh);
    }

    return response;
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
    const targetRestaurantId = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<MessageResponse>('/api/customers/password/reset-request', {
      method: 'POST',
      body: { email, restaurantId: targetRestaurantId } as PasswordResetRequest
    });
  }

  /**
   * Confirmation de réinitialisation de mot de passe avec code OTP / token.
   */
  public async confirmPasswordReset(data: PasswordResetConfirmRequest): Promise<MessageResponse> {
    const restaurantId = data.restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<MessageResponse>('/api/customers/password/reset-confirm', {
      method: 'POST',
      body: { ...data, restaurantId }
    });
  }
}
