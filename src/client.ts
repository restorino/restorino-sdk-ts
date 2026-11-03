import { HttpClient } from './http/http-client';
import { RestorinoClientConfig } from './types/common';
import { AuthModule } from './modules/auth';
import { CustomerModule } from './modules/customer';
import { LoyaltyModule } from './modules/loyalty';
import { VitrineModule } from './modules/vitrine';
import { OrdersModule } from './modules/orders';
import { DeliveryModule } from './modules/delivery';
import { TablesModule } from './modules/tables';
import { LiveAgentModule } from './modules/live-agent';
import { formatCurrency, formatDate } from './utils/format';
import {
  calculateCart,
  checkAllergensConflict,
  CartCalculationResult,
  CartCalculationOptions
} from './utils/cart';
import { OrderItemRequest } from './types/orders';

/**
 * Client SDK unifié Restorino pour Lovable.dev et applications Frontend.
 */
export class RestorinoClient {
  public http: HttpClient;

  /**
   * Module d'authentification client (Login, Register, Logout, Reset Password).
   */
  public auth: AuthModule;

  /**
   * Module de gestion du profil, historique commandes, parrainage et avis du client.
   */
  public customer: CustomerModule;

  /**
   * Module du programme de fidélité, récompenses et claims d'avis Google.
   */
  public loyalty: LoyaltyModule;

  /**
   * Module vitrine publique, découverte de restaurants, menus et SEO.
   */
  public vitrine: VitrineModule;

  /**
   * Module de commande publique en ligne et réservation de table.
   */
  public orders: OrdersModule;

  /**
   * Module de suivi de livraison en temps réel pour le client.
   */
  public delivery: DeliveryModule;

  /**
   * Module de scan QR code pour commande à table (Dine-in).
   */
  public tables: TablesModule;

  /**
   * Module d'agent vocal et conseiller culinaire interactif (Gemini Live).
   */
  public liveAgent: LiveAgentModule;

  constructor(config: RestorinoClientConfig) {
    this.http = new HttpClient(config);
    this.auth = new AuthModule(this.http);
    this.customer = new CustomerModule(this.http);
    this.loyalty = new LoyaltyModule(this.http);
    this.vitrine = new VitrineModule(this.http);
    this.orders = new OrdersModule(this.http);
    this.delivery = new DeliveryModule(this.http);
    this.tables = new TablesModule(this.http);
    this.liveAgent = new LiveAgentModule(this.http);
  }

  /**
   * Met à jour dynamiquement la configuration du client (ex: changement de restaurant).
   */
  public configure(newConfig: Partial<RestorinoClientConfig>): void {
    this.http.updateConfig(newConfig);
  }

  /**
   * Récupère le token JWT actuellement actif.
   */
  public getToken(): string | null {
    return this.http.getToken();
  }

  /**
   * Récupère le refresh token actuellement actif.
   */
  public getRefreshToken(): string | null {
    return this.http.getRefreshToken();
  }


  /**
   * Définit manuellement le token JWT client (et optionnellement son refresh token).
   */
  public setToken(token: string | null, refreshToken?: string | null): void {
    this.http.setAuthTokens(token, refreshToken);
  }

  /**
   * Définit manuellement le refresh token client.
   */
  public setRefreshToken(refreshToken: string | null): void {
    this.http.setRefreshToken(refreshToken);
  }

  /**
   * Définit simultanément le token d'accès et le refresh token.
   * Omettre `refreshToken` conserve celui déjà stocké.
   */
  public setAuthTokens(token: string | null, refreshToken?: string | null): void {
    this.http.setAuthTokens(token, refreshToken);
  }

  /**
   * Vrai si un JWT est mémorisé côté client.
   *
   * En mode cookies (défaut), l'absence de token local ne signifie **pas** que
   * la session est fermée : appeler `auth.getMe()` pour connaître l'état réel.
   */
  public isAuthenticated(): boolean {
    return !!this.http.getToken();
  }

  /**
   * Déconnexion locale rapide (vide les tokens en mémoire et stockage).
   */
  public logoutLocal(): void {
    this.http.clearTokens();
  }

  /**
   * Formate un montant dans la devise du restaurant (ex: 15.50 -> "15,50 €").
   */
  public formatCurrency(amount: number, currency = 'EUR', locale = 'fr-FR'): string {
    return formatCurrency(amount, currency, locale);
  }

  /**
   * Formate une date ISO en chaîne lisible.
   */
  public formatDate(isoDate: string, options?: Intl.DateTimeFormatOptions, locale = 'fr-FR'): string {
    return formatDate(isoDate, options, locale);
  }

  /**
   * Calcule les totaux, remises et frais d'un panier d'articles.
   */
  public calculateCart(items: OrderItemRequest[], options?: CartCalculationOptions): CartCalculationResult {
    return calculateCart(items, options);
  }

  /**
   * Vérifie les conflits d'allergènes entre un plat et les allergies du client.
   */
  public checkAllergens(dishAllergens: string[] | string, customerAllergens: string[]) {
    return checkAllergensConflict(dishAllergens, customerAllergens);
  }
}

