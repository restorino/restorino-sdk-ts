/**
 * Requête de connexion client.
 */
export interface CustomerLoginRequest {
  email: string;
  password: string;
  restaurantId?: string;
  captchaToken?: string;
}

/**
 * Requête d'inscription d'un nouveau compte client.
 */
export interface CustomerRegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  restaurantId?: string;
  referralCode?: string;
}

/**
 * Requête d'authentification client via Google Sign-In.
 */
export interface CustomerGoogleAuthRequest {
  googleToken: string;
  restaurantId?: string;
}

/**
 * Informations de fidélité synthétiques retournées lors de la connexion.
 */
export interface CustomerLoyaltySummary {
  totalPoints: number;
  availablePoints: number;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
}

/**
 * DTO du profil client.
 */
export interface CustomerDto {
  id: string;
  restaurantId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: string;
  avatar?: string;
  createdAt: string;
}

/**
 * Réponse d'authentification client (Login / Register / Me).
 */
export interface CustomerAuthResponse {
  token: string;
  refreshToken?: string;
  customer: CustomerDto;
  loyalty?: CustomerLoyaltySummary;
}

/**
 * Requête de rafraîchissement de token.
 */
export interface CustomerRefreshTokenRequest {
  refreshToken?: string;
  restaurantId?: string;
}

/**
 * Réponse de rafraîchissement de token.
 */
export interface CustomerRefreshTokenResponse {
  token: string;
  refreshToken?: string;
  expiresIn?: number;
  success?: boolean;
}

/**
 * Requête de modification de mot de passe.
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Requête de demande de réinitialisation de mot de passe.
 */
export interface PasswordResetRequest {
  email: string;
  restaurantId: string;
}

/**
 * Requête de confirmation de réinitialisation de mot de passe.
 */
export interface PasswordResetConfirmRequest {
  email: string;
  code: string;
  newPassword: string;
  restaurantId: string;
}
