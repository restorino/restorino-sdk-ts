import { HttpClient } from '../http/http-client';
import {
  PublicVitrineResponse,
  RestaurantSearchRequest,
  PublicMenuResponse,
  PublicCategory,
  PublicProduct,
  DeliveryZoneCheckResponse,
  RestaurantStatusResponse,
  SeoMetaTagsResponse,
  ValidateApiKeyResponse,
  VitrineConfigResponse,
  TemplateResponse,
  DomainResolutionResponse
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

  /**
   * Récupère les témoignages validés par identifiant UUID du restaurant.
   */
  public async getTestimonials(restaurantId?: string): Promise<TestimonialResponse[]> {
    const target = restaurantId || this.http.getConfig().restaurantId;
    return this.http.request<TestimonialResponse[]>(`/api/public/testimonials/${encodeURIComponent(target || '')}`, {
      method: 'GET'
    });
  }

  /**
   * Valide la clé API Vitrine via le backend Restorino (POST /api/vitrine/api-keys/validate).
   * Vérifie la validité, l'expiration, l'état actif et les permissions (READ, WRITE, etc.).
   */
  public async validateApiKey(apiKey?: string): Promise<ValidateApiKeyResponse> {
    const key = apiKey || this.http.getConfig().apiKey;
    const customHeaders: Record<string, string> = {};
    if (apiKey && apiKey !== this.http.getConfig().apiKey) {
      customHeaders['X-API-Key'] = apiKey;
    }
    return this.http.request<ValidateApiKeyResponse>('/api/vitrine/api-keys/validate', {
      method: 'POST',
      body: key ? { apiKey: key } : undefined,
      headers: Object.keys(customHeaders).length > 0 ? customHeaders : undefined,
      skipAuthRefresh: true,
      retries: 0
    });
  }

  /**
   * Récupère la configuration vitrine complète authentifiée par clé API (GET /api/vitrine/{tenantId}/config).
   * L'en-tête X-API-Key est obligatoire pour les applications storefront externes (Lovable, React, Next.js).
   */
  public async getConfig(tenantIdOrSubdomain?: string): Promise<VitrineConfigResponse> {
    const target = tenantIdOrSubdomain || this.http.getConfig().tenantId || this.http.getConfig().restaurantId;
    return this.http.request<VitrineConfigResponse>(`/api/vitrine/${encodeURIComponent(target || '')}/config`, {
      method: 'GET'
    });
  }

  /**
   * Récupère la configuration vitrine publique publiée (GET /api/vitrine/{tenantIdOrSubdomain}/public).
   * Endpoint public direct sans clé API requise.
   */
  public async getPublicConfig(tenantIdOrSubdomain?: string): Promise<VitrineConfigResponse> {
    const target = tenantIdOrSubdomain || this.http.getConfig().tenantId || this.http.getConfig().restaurantId;
    return this.http.request<VitrineConfigResponse>(`/api/vitrine/${encodeURIComponent(target || '')}/public`, {
      method: 'GET'
    });
  }

  /**
   * Liste des templates de vitrine disponibles (GET /api/vitrine/templates).
   */
  public async getTemplates(): Promise<TemplateResponse[]> {
    return this.http.request<TemplateResponse[]>('/api/vitrine/templates', {
      method: 'GET'
    });
  }

  /**
   * Résout un nom de domaine ou sous-domaine vers son tenantId (GET /api/vitrine/resolve-domain?domain=...).
   */
  public async resolveCustomDomain(domain: string): Promise<DomainResolutionResponse> {
    return this.http.request<DomainResolutionResponse>('/api/vitrine/resolve-domain', {
      method: 'GET',
      params: { domain }
    });
  }

  /**
   * Récupère le bundle JSON-LD Schema.org (@graph) officiel du site vitrine pour Google Rich Results.
   */
  public async getSchemaOrg(tenantIdOrSubdomain?: string): Promise<Record<string, any>> {
    const target = tenantIdOrSubdomain || this.http.getConfig().tenantId || this.http.getConfig().restaurantId;
    return this.http.request<Record<string, any>>(`/api/vitrine/${encodeURIComponent(target || '')}/schema.json`, {
      method: 'GET'
    });
  }
}


