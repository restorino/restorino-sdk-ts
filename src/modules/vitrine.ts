import { HttpClient, RestorinoApiError } from '../http/http-client';
import {
  PublicVitrineResponse,
  RestaurantSearchRequest,
  RestaurantSearchResponse,
  RestaurantReviewsResponse,
  PublicMenuResponse,
  PublicCategory,
  PublicProduct,
  DeliveryZoneCheckResponse,
  RestaurantStatusResponse,
  SeoMetaTagsResponse,
  VitrineConfigResponse,
  DomainResolutionResponse
} from '../types/vitrine';
import { TestimonialResponse } from '../types/customer';
import { Page } from '../types/common';

export class VitrineModule {
  constructor(private http: HttpClient) {}

  private resolveIdentifier(override?: string): string {
    const target = override || this.http.getConfig().restaurantId;
    if (!target) {
      throw new RestorinoApiError(
        400,
        'restaurantId est requis : fournissez-le à la configuration du client ou à l’appel.',
        'MISSING_RESTAURANT_ID'
      );
    }
    return target;
  }

  /**
   * Identifiant de vitrine (tenant, slug ou restaurant) obligatoire : sans lui
   * le chemin contient un segment vide et échoue en 404 opaque.
   */
  private resolveTenantTarget(override?: string): string {
    const target = override || this.http.getConfig().tenantId || this.http.getConfig().restaurantId;
    if (!target) {
      throw new RestorinoApiError(
        400,
        'tenantId (ou restaurantId) est requis pour identifier la vitrine.',
        'MISSING_TENANT_ID'
      );
    }
    return target;
  }

  /**
   * Recherche multicritère de restaurants (proximité GPS, spécialité, ville).
   */
  public async search(filter: RestaurantSearchRequest): Promise<Page<RestaurantSearchResponse>> {
    return this.http.request<Page<RestaurantSearchResponse>>('/api/public/restaurants/search', {
      method: 'POST',
      body: filter
    });
  }

  /**
   * Liste des restaurants les plus populaires de la plateforme.
   */
  public async getPopular(): Promise<RestaurantSearchResponse[]> {
    return this.http.request<RestaurantSearchResponse[]>('/api/public/restaurants/popular', {
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
   * Le backend attend `latitude` / `longitude` (les noms `lat`/`lng` produisaient un 400).
   */
  public async checkDeliveryZone(latitude: number, longitude: number, restaurantId?: string): Promise<DeliveryZoneCheckResponse> {
    const target = this.resolveIdentifier(restaurantId);
    return this.http.request<DeliveryZoneCheckResponse>(`/api/public/restaurants/${encodeURIComponent(target)}/delivery-check`, {
      method: 'GET',
      params: { latitude, longitude }
    });
  }

  /**
   * Statut d'ouverture temps réel du restaurant.
   */
  public async getStatus(restaurantId?: string): Promise<RestaurantStatusResponse> {
    const target = this.resolveIdentifier(restaurantId);
    return this.http.request<RestaurantStatusResponse>(`/api/public/restaurants/${encodeURIComponent(target)}/status`, {
      method: 'GET'
    });
  }

  /**
   * Avis clients publics du restaurant.
   * Le backend renvoie un objet `{reviews, totalReviews, averageRating, ...}`,
   * pas une `Page` Spring.
   */
  public async getReviews(restaurantId?: string, page = 0, size = 10): Promise<RestaurantReviewsResponse> {
    const target = this.resolveIdentifier(restaurantId);
    return this.http.request<RestaurantReviewsResponse>(`/api/public/restaurants/${encodeURIComponent(target)}/reviews`, {
      method: 'GET',
      params: { page, size }
    });
  }

  /**
   * Carte / Menu public complet du restaurant.
   */
  public async getMenu(restaurantId?: string): Promise<PublicMenuResponse> {
    const target = this.resolveIdentifier(restaurantId);
    return this.http.request<PublicMenuResponse>(`/api/public/restaurants/${encodeURIComponent(target)}/menu`, {
      method: 'GET'
    });
  }

  /**
   * Récupère une catégorie et ses plats par slug SEO (ex: 'burgers').
   */
  public async getCategoryBySlug(categorySlug: string, tenantOrSlug?: string): Promise<PublicCategory> {
    const tenant = this.resolveTenantTarget(tenantOrSlug);
    return this.http.request<PublicCategory>(`/api/public/menu/${encodeURIComponent(tenant)}/${encodeURIComponent(categorySlug)}`, {
      method: 'GET'
    });
  }

  /**
   * Récupère la fiche détaillée d'un plat par slug SEO (ex: 'double-cheese-burger').
   */
  public async getProductBySlug(categorySlug: string, productSlug: string, tenantOrSlug?: string): Promise<PublicProduct> {
    const tenant = this.resolveTenantTarget(tenantOrSlug);
    return this.http.request<PublicProduct>(`/api/public/menu/${encodeURIComponent(tenant)}/${encodeURIComponent(categorySlug)}/${encodeURIComponent(productSlug)}`, {
      method: 'GET'
    });
  }

  /**
   * Récupère les métadonnées SEO pour l'accueil de la vitrine.
   */
  public async getSeoMeta(tenantOrSlug?: string): Promise<SeoMetaTagsResponse> {
    const tenant = this.resolveTenantTarget(tenantOrSlug);
    return this.http.request<SeoMetaTagsResponse>(`/api/public/seo/${encodeURIComponent(tenant)}/meta`, {
      method: 'GET'
    });
  }

  /**
   * Métadonnées SEO d'une catégorie du menu (par slug).
   */
  public async getCategorySeoMeta(categorySlug: string, tenantOrSlug?: string): Promise<SeoMetaTagsResponse> {
    const tenant = this.resolveTenantTarget(tenantOrSlug);
    return this.http.request<SeoMetaTagsResponse>(`/api/public/seo/${encodeURIComponent(tenant)}/meta/category/${encodeURIComponent(categorySlug)}`, {
      method: 'GET'
    });
  }

  /**
   * Métadonnées SEO d'un produit du menu (par slug).
   */
  public async getProductSeoMeta(productSlug: string, tenantOrSlug?: string): Promise<SeoMetaTagsResponse> {
    const tenant = this.resolveTenantTarget(tenantOrSlug);
    return this.http.request<SeoMetaTagsResponse>(`/api/public/seo/${encodeURIComponent(tenant)}/meta/product/${encodeURIComponent(productSlug)}`, {
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
   * Le backend renvoie une `Page` Spring, pas un tableau.
   */
  public async getTestimonials(restaurantId?: string, page = 0, size = 10): Promise<Page<TestimonialResponse>> {
    const target = this.resolveIdentifier(restaurantId);
    return this.http.request<Page<TestimonialResponse>>(`/api/public/testimonials/${encodeURIComponent(target)}`, {
      method: 'GET',
      params: { page, size }
    });
  }

  /**
   * Récupère la configuration vitrine publique publiée (GET /api/vitrine/{tenantIdOrSubdomain}/public).
   * Endpoint public direct, sans clé API ni session.
   */
  public async getPublicConfig(tenantIdOrSubdomain?: string): Promise<VitrineConfigResponse> {
    const target = this.resolveTenantTarget(tenantIdOrSubdomain);
    return this.http.request<VitrineConfigResponse>(`/api/vitrine/${encodeURIComponent(target)}/public`, {
      method: 'GET'
    });
  }

  /**
   * Résout un nom de domaine ou sous-domaine vers son tenantId.
   * Le backend répond 404 pour un domaine inconnu : on le traduit en
   * `{ found: false }` plutôt que de lever une exception.
   */
  public async resolveCustomDomain(domain: string): Promise<DomainResolutionResponse> {
    try {
      return await this.http.request<DomainResolutionResponse>('/api/vitrine/resolve-domain', {
        method: 'GET',
        params: { domain }
      });
    } catch (err) {
      if (err instanceof RestorinoApiError && err.status === 404) {
        return { found: false, domain };
      }
      throw err;
    }
  }

  /**
   * Récupère le bundle JSON-LD Schema.org (@graph) officiel du site vitrine pour Google Rich Results.
   */
  public async getSchemaOrg(tenantIdOrSubdomain?: string): Promise<Record<string, any>> {
    const target = this.resolveTenantTarget(tenantIdOrSubdomain);
    return this.http.request<Record<string, any>>(`/api/vitrine/${encodeURIComponent(target)}/schema.json`, {
      method: 'GET'
    });
  }
}


