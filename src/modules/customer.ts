import { HttpClient } from '../http/http-client';
import { CustomerDto } from '../types/auth';
import {
  CustomerOrder,
  UpdateCustomerProfileRequest,
  OrderRatingRequest,
  OrderRatingDTO,
  ReferralCodeResponse,
  ReferralDashboardResponse,
  CustomerNotification,
  CreateTestimonialRequest,
  TestimonialResponse,
  PromoValidationResponse
} from '../types/customer';
import { PublicCategory, PublicProduct, ProductOption } from '../types/vitrine';
import { Page, MessageResponse } from '../types/common';

export class CustomerModule {
  constructor(private http: HttpClient) {}

  /**
   * Récupère le profil du client connecté.
   */
  public async getProfile(): Promise<CustomerDto> {
    return this.http.request<CustomerDto>('/api/customers/me', {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Met à jour les informations du profil client.
   */
  public async updateProfile(data: UpdateCustomerProfileRequest): Promise<CustomerDto> {
    return this.http.request<CustomerDto>('/api/customers/me', {
      method: 'PUT',
      body: data,
      requiresAuth: true
    });
  }

  /**
   * Récupère l'historique paginé des commandes du client.
   */
  public async getOrders(page = 0, size = 10): Promise<Page<CustomerOrder>> {
    return this.http.request<Page<CustomerOrder>>('/api/customers/orders', {
      method: 'GET',
      params: { page, size },
      requiresAuth: true
    });
  }

  /**
   * Récupère le détail d'une commande passée par le client.
   */
  public async getOrderDetails(orderId: string): Promise<CustomerOrder> {
    return this.http.request<CustomerOrder>(`/api/customers/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Évalue une commande terminée (qualité, rapidité, service, commentaire).
   */
  public async rateOrder(orderId: string, rating: OrderRatingRequest): Promise<OrderRatingDTO> {
    return this.http.request<OrderRatingDTO>(`/api/customers/orders/${encodeURIComponent(orderId)}/rate`, {
      method: 'POST',
      body: rating,
      requiresAuth: true
    });
  }

  /**
   * Récupère les évaluations soumises par le client.
   */
  public async getMyRatings(page = 0, size = 10): Promise<Page<OrderRatingDTO>> {
    return this.http.request<Page<OrderRatingDTO>>('/api/customers/ratings', {
      method: 'GET',
      params: { page, size },
      requiresAuth: true
    });
  }

  /**
   * Obtient ou génère le code de parrainage et le lien de partage du client.
   */
  public async getReferralCode(): Promise<ReferralCodeResponse> {
    return this.http.request<ReferralCodeResponse>('/api/customers/referral-code', {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Applique le code de parrainage d'un ami.
   */
  public async applyReferralCode(code: string): Promise<MessageResponse> {
    return this.http.request<MessageResponse>('/api/customers/apply-referral', {
      method: 'POST',
      params: { code },
      requiresAuth: true
    });
  }

  /**
   * Tableau de bord des parrainages (filleuls, récompenses débloquées).
   */
  public async getReferrals(): Promise<ReferralDashboardResponse> {
    return this.http.request<ReferralDashboardResponse>('/api/customers/referrals', {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Boîte de réception in-app du client.
   */
  public async getNotifications(page = 0, size = 20): Promise<Page<CustomerNotification>> {
    return this.http.request<Page<CustomerNotification>>('/api/notifications/customers/my-inbox', {
      method: 'GET',
      params: { page, size },
      requiresAuth: true
    });
  }

  /**
   * Nombre de notifications non lues (badge header).
   */
  public async getUnreadNotificationCount(): Promise<{ unreadCount: number }> {
    return this.http.request<{ unreadCount: number }>('/api/notifications/customers/my-inbox/unread-count', {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Marque une notification comme lue.
   */
  public async markNotificationRead(notificationId: string): Promise<void> {
    return this.http.request<void>(`/api/notifications/customers/my-inbox/${encodeURIComponent(notificationId)}/read`, {
      method: 'PUT',
      requiresAuth: true
    });
  }

  /**
   * Marque toutes les notifications comme lues.
   */
  public async markAllNotificationsRead(): Promise<void> {
    return this.http.request<void>('/api/notifications/customers/my-inbox/read-all', {
      method: 'PUT',
      requiresAuth: true
    });
  }

  // ==================== MENU ====================

  /**
   * Catégories du menu du restaurant (authentifié, scopé au restaurant du JWT).
   */
  public async getMenuCategories(): Promise<PublicCategory[]> {
    return this.http.request<PublicCategory[]>('/api/customers/menu/categories', {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Produits du menu (optionnel: filtre par catégorie).
   */
  public async getMenuProducts(categoryId?: string): Promise<PublicProduct[]> {
    return this.http.request<PublicProduct[]>('/api/customers/menu/products', {
      method: 'GET',
      params: categoryId ? { categoryId } : undefined,
      requiresAuth: true
    });
  }

  /**
   * Détail d'un produit du menu.
   */
  public async getMenuProduct(productId: string): Promise<PublicProduct> {
    return this.http.request<PublicProduct>(`/api/customers/menu/products/${encodeURIComponent(productId)}`, {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Suppléments commandables (sauces, extras) du menu du restaurant.
   * Le backend accepte un filtre optionnel `productId`.
   */
  public async getMenuSupplements(productId?: string): Promise<ProductOption[]> {
    return this.http.request<ProductOption[]>('/api/customers/menu/supplements', {
      method: 'GET',
      params: productId ? { productId } : undefined,
      requiresAuth: true
    });
  }

  /**
   * Garnitures d'accompagnement du restaurant (optionnel: filtre par catégorie).
   */
  public async getMenuGarnishes(category?: string): Promise<ProductOption[]> {
    return this.http.request<ProductOption[]>('/api/customers/menu/garnishes', {
      method: 'GET',
      params: category ? { category } : undefined,
      requiresAuth: true
    });
  }

  /**
   * Carte des boissons du restaurant.
   */
  public async getMenuBeverages(
    filters?: { type?: string; size?: string; alcoholic?: boolean }
  ): Promise<ProductOption[]> {
    return this.http.request<ProductOption[]>('/api/customers/menu/beverages', {
      method: 'GET',
      params: filters,
      requiresAuth: true
    });
  }

  // ==================== TESTIMONIALS ====================

  /**
   * Soumission d'un témoignage / avis sur le restaurant.
   */
  public async submitTestimonial(data: CreateTestimonialRequest): Promise<TestimonialResponse> {
    return this.http.request<TestimonialResponse>('/api/customers/testimonials', {
      method: 'POST',
      body: data,
      requiresAuth: true
    });
  }

  /**
   * Liste des avis laissés par le client connecté.
   */
  public async getMyTestimonials(): Promise<TestimonialResponse[]> {
    return this.http.request<TestimonialResponse[]>('/api/customers/testimonials', {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Valide un code promotionnel pour le panier du client.
   */
  public async validatePromoCode(promoCode: string, orderAmount: number): Promise<PromoValidationResponse> {
    return this.http.request<PromoValidationResponse>('/api/customers/promo/validate', {
      method: 'POST',
      body: { promoCode, orderAmount },
      requiresAuth: true
    });
  }
}
