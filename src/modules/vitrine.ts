import { HttpClient } from '../http/http-client';
import {
  PublicVitrineResponse,
  RestaurantSearchRequest,
  PublicMenuResponse,
  PublicCategory,
  PublicProduct,
  DeliveryZoneCheckResponse,
  RestaurantStatusResponse,
  SeoMetaTagsResponse
} from '../types/vitrine';
import { TestimonialResponse } from '../types/customer';
import { Page } from '../types/common';

export class VitrineModule {
  constructor(private http: HttpClient) {}

  /**
   * Recherche multicritère de restaurants (proximité GPS, spécialité, ville).
   */
  public async search(filter: RestaurantSearchRequest): Promise<Page<PublicVitrineResponse>> {
    return this.http.request<Page<PublicVitrineResponse>>('/api/public/restaurants/search', {
      method: 'POST',
      body: filter
    });
  }

  /**
   * Liste des restaurants les plus populaires de la plateforme.
   */
  public async getPopular(): Promise<PublicVitrineResponse[]> {
    return this.http.request<PublicVitrineResponse[]>('/api/public/restaurants/popular', {
      method: 'GET'
    });
  }

  /**
   * Liste des types de cuisine disponibles.
   */
  public async getCuisines(): Promise<string[]> {
    return this.http.request<string[]>('/api/public/restaurants/cuisines', {
      method: 'GET'
    });
  }

  /**
   * Fiche vitrine complète d'un restaurant (par son UUID ou son sous-domaine).
   */
  public async getRestaurant(identifier?: string): Promise<PublicVitrineResponse> {
    const target = identifier || this.http.getConfig().restaurantId;
    return this.http.request<PublicVitrineResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}`, {
      method: 'GET'
    });
  }

  /**
   * Vérifie si des coordonnées GPS se situent dans la zone de livraison du restaurant.
   */
  public async checkDeliveryZone(latitude: number, longitude: number, restaurantId?: string): Promise<DeliveryZoneCheckResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<DeliveryZoneCheckResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/delivery-check`, {
      method: 'GET',
      params: { lat: latitude, lng: longitude }
    });
  }

  /**
   * Statut d'ouverture temps réel du restaurant.
   */
  public async getStatus(restaurantId?: string): Promise<RestaurantStatusResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<RestaurantStatusResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/status`, {
      method: 'GET'
    });
  }

  /**
   * Avis clients publics du restaurant.
   */
  public async getReviews(restaurantId?: string, page = 0, size = 10): Promise<Page<TestimonialResponse>> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<Page<TestimonialResponse>>(`/api/public/restaurants/${encodeURIComponent(target || '')}/reviews`, {
      method: 'GET',
      params: { page, size }
    });
  }

  /**
   * Carte / Menu public complet du restaurant.
   */
  public async getMenu(restaurantId?: string): Promise<PublicMenuResponse> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<PublicMenuResponse>(`/api/public/restaurants/${encodeURIComponent(target || '')}/menu`, {
      method: 'GET'
    });
  }

  /**
   * Récupère une catégorie et ses plats par slug SEO (ex: 'burgers').
   */
  public async getCategoryBySlug(categorySlug: string, tenantOrSlug?: string): Promise<PublicCategory> {
    const tenant = tenantOrSlug || this.http.getConfig().restaurantId;
    return this.http.request<PublicCategory>(`/api/public/menu/${encodeURIComponent(tenant || '')}/${encodeURIComponent(categorySlug)}`, {
      method: 'GET'
    });
  }

  /**
   * Récupère la fiche détaillée d'un plat par slug SEO (ex: 'double-cheese-burger').
   */
  public async getProductBySlug(categorySlug: string, productSlug: string, tenantOrSlug?: string): Promise<PublicProduct> {
    const tenant = tenantOrSlug || this.http.getConfig().restaurantId;
    return this.http.request<PublicProduct>(`/api/public/menu/${encodeURIComponent(tenant || '')}/${encodeURIComponent(categorySlug)}/${encodeURIComponent(productSlug)}`, {
      method: 'GET'
    });
  }

  /**
   * Récupère les métadonnées SEO pour l'accueil de la vitrine.
   */
  public async getSeoMeta(tenantOrSlug?: string): Promise<SeoMetaTagsResponse> {
    const tenant = tenantOrSlug || this.http.getConfig().restaurantId;
    return this.http.request<SeoMetaTagsResponse>(`/api/public/seo/${encodeURIComponent(tenant || '')}/meta`, {
      method: 'GET'
    });
  }

  /**
   * Métadonnées SEO d'une catégorie du menu (par slug).
   */
  public async getCategorySeoMeta(categorySlug: string, tenantOrSlug?: string): Promise<SeoMetaTagsResponse> {
    const tenant = tenantOrSlug || this.http.getConfig().restaurantId;
    return this.http.request<SeoMetaTagsResponse>(`/api/public/seo/${encodeURIComponent(tenant || '')}/meta/category/${encodeURIComponent(categorySlug)}`, {
      method: 'GET'
    });
  }

  /**
   * Métadonnées SEO d'un produit du menu (par slug).
   */
  public async getProductSeoMeta(productSlug: string, tenantOrSlug?: string): Promise<SeoMetaTagsResponse> {
    const tenant = tenantOrSlug || this.http.getConfig().restaurantId;
    return this.http.request<SeoMetaTagsResponse>(`/api/public/seo/${encodeURIComponent(tenant || '')}/meta/product/${encodeURIComponent(productSlug)}`, {
      method: 'GET'
    });
  }

  /**
   * Récupère les témoignages validés par sous-domaine vitrine.
   */
  public async getTestimonialsBySubdomain(subdomain: string, page = 0, size = 10): Promise<Page<TestimonialResponse>> {
    return this.http.request<Page<TestimonialResponse>>(`/api/public/testimonials/subdomain/${encodeURIComponent(subdomain)}`, {
      method: 'GET',
      params: { page, size }
    });
  }
}
