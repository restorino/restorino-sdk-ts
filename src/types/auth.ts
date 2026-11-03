/**
 * Requête de connexion client.
 */
export interface CustomerLoginRequest {
  email: string;
  password: string;
  /** Requis par le backend ; à défaut la valeur de `config.restaurantId` est utilisée. */
  restaurantId?: string;
  captchaToken?: string;
}

/**
 * Requête d'inscription d'un nouveau compte client.
 *
 * `firstName`, `lastName` et `phone` sont `@NotBlank` côté backend : les
 * marquer optionnels ne faisait que déplacer l'erreur du compilateur vers un
 * HTTP 400 à l'exécution.
 */
export interface CustomerRegisterRequest {
  email: string;
  /** Minimum 8 caractères (contrainte backend). */
  password: string;
  /** 2 à 100 caractères. */
  firstName: string;
  /** 2 à 100 caractères. */
  lastName: string;
  /** Format `^[+0-9][0-9 .\-()]{5,19}$`. */
  phone: string;
  restaurantId?: string;
  referralCode?: string;
  captchaToken?: string;
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
  /** `BRONZE | SILVER | GOLD | PLATINUM` (sérialisé en chaîne par le backend). */
  tier: string;
  totalVisits?: number;
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
 * Réponse d'authentification client (Login / Register / Google).
 *
 * En mode cookies (défaut), le backend place les jetons dans des cookies
 * HttpOnly et renvoie `token`/`refreshToken` à `null` — ces champs sont donc
 * optionnels. Ne jamais supposer leur présence pour décider si la session est
 * ouverte : la source de vérité est le cookie, et `getMe()` pour le profil.
 */
export interface CustomerAuthResponse {
  customer: CustomerDto;
  token?: string | null;
  refreshToken?: string | null;
  expiresAt?: string;
  loyalty?: CustomerLoyaltySummary;
}

/**
 * Réponse de rafraîchissement de token.
 *
 * Le backend répond `{ success: true, message }` et renouvelle via le cookie
 * `customer_refresh_token` : aucun token n'est renvoyé dans le corps.
 */
export interface CustomerRefreshTokenResponse {
  success?: boolean;
  message?: string;
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
}

/**
 * Requête de modification de mot de passe.
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  /** Minimum 8 caractères (contrainte backend). */
  newPassword: string;
  /** Doit être identique à `newPassword` (`@NotBlank` côté backend). */
  confirmPassword: string;
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
 *
 * Le champ s'appelle `resetCode` côté backend (et doit contenir 6 chiffres) :
 * l'ancien `code` provoquait un HTTP 400 systématique.
 */
export interface PasswordResetConfirmRequest {
  email: string;
  /** Code OTP à 6 chiffres. */
  resetCode: string;
  /** Minimum 8 caractères (contrainte backend). */
  newPassword: string;
  restaurantId?: string;
}
