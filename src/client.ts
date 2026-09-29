import { HttpClient } from './http/http-client';
import { RestorinoClientConfig } from './types/common';
import { AuthModule } from './modules/auth';
import { CustomerModule } from './modules/customer';
import { LoyaltyModule } from './modules/loyalty';
import { VitrineModule } from './modules/vitrine';
import { OrdersModule } from './modules/orders';
import { DeliveryModule } from './modules/delivery';
import { TablesModule } from './modules/tables';
import { TvModule } from './modules/tv';
import { LiveAgentModule } from './modules/live-agent';

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
   * Module d'affichage dynamique sur écran TV / Kiosk.
   */
  public tv: TvModule;

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
    this.tv = new TvModule(this.http);
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
   * Définit manuellement le token JWT client.
   */
  public setToken(token: string | null): void {
    this.http.setToken(token);
  }

  /**
   * Vérifie si un token client est présent.
   */
  public isAuthenticated(): boolean {
    return !!this.http.getToken();
  }

  /**
   * Déconnexion locale rapide.
   */
  public logoutLocal(): void {
    this.http.clearToken();
  }
}
