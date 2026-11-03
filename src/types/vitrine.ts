/**
 * Informations publiques de vitrine d'un restaurant (`PublicVitrineResponse`).
 *
 * La clé d'identité est `restaurantId` : il n'existe pas de champ `id`.
 */
export interface PublicVitrineResponse {
  restaurantId: string;
  name: string;
  description?: string;
  /** Chaîne unique (ex. « Italien »), pas un tableau. */
  cuisineType?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  galleryImages?: string[];
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  location?: { latitude: number; longitude: number; address?: string; city?: string; postalCode?: string };
  menu?: PublicCategory[];
  /** `delivery | takeout | dine-in` (valeurs serveur). */
  deliveryMethods?: string[];
  minimumOrderAmount?: number;
  deliveryFee?: number;
  freeDeliveryThreshold?: number;
  estimatedDeliveryMinutes?: number;
  preparationTimeMinutes?: number;
  isOpen?: boolean;
  acceptingOrders?: boolean;
  openingHours?: Record<string, string>;
  specialHours?: string[];
  averageRating?: number;
  totalReviews?: number;
  priceRange?: number;
  canDeliverToCustomer?: boolean;
  distanceFromCustomer?: number;
  deliveryTimeToCustomer?: number;
  deliveryFeeToCustomer?: number;
  urlSlug?: string;
  metaTitle?: string;
  metaDescription?: string;
}

/**
 * Critères de recherche (`RestaurantSearchRequest`).
 * Les noms sont ceux du backend : `searchTerm` / `cuisineType`. Les anciens
 * `query` / `cuisine` étaient ignorés silencieusement par Jackson.
 */
export interface RestaurantSearchRequest {
  searchTerm?: string;
  cuisineType?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  priceRange?: number;
  minRating?: number;
}

/**
 * Résultat de recherche (`RestaurantSearchResponse`).
 */
export interface RestaurantSearchResponse {
  restaurantId: string;
  name: string;
  description?: string;
  cuisineType?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  rating?: number;
  reviewCount?: number;
  priceRange?: number;
  minimumOrderAmount?: number;
  deliveryFee?: number;
  estimatedDeliveryMinutes?: number;
  deliveryMethods?: string[];
  isOpen?: boolean;
  acceptingOrders?: boolean;
  featured?: boolean;
  specialOffer?: string;
  openingHours?: string;
  phone?: string;
  urlSlug?: string;
  preparationTimeMinutes?: number;
  popularDishes?: string[];
  paymentMethods?: string[];
  canDeliver?: boolean;
  nextAvailableSlot?: string;
}

/**
 * Option ou supplément d'un plat (sauce, taille, extra).
 * Le backend expose `isActive` (entités Supplement/Garnish/Beverage).
 */
export interface ProductOption {
  id: string;
  name: string;
  price: number;
  isActive?: boolean;
}

/**
 * Produit / plat public d'un menu.
 *
 * La forme dépend de l'endpoint : `/api/public/menu/**` renvoie le DTO
 * (`slug`, `allergenInfo`, `images`) tandis que `/api/customers/menu/**`
 * renvoie l'entité (`id`, `categoryId`, `allergens`). Les deux variantes sont
 * donc optionnelles ici plutôt que promises à tort.
 */
export interface PublicProduct {
  id?: string;
  categoryId?: string;
  slug?: string;
  name: string;
  description?: string;
  url?: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  images?: string[];
  isAvailable?: boolean;
  isFeatured?: boolean;
  isPopular?: boolean;
  preparationTimeMinutes?: number;
  /** Chaîne sérialisée par le DTO public. */
  allergenInfo?: string;
  /** Tableau tel que renvoyé par l'entité interne. */
  allergens?: string[];
  supplements?: ProductOption[];
  garnishes?: ProductOption[];
  sizes?: { name: string; price: number }[];
  updatedAt?: string;
}

/**
 * Catégorie publique du menu.
 * `/orders/menu` fournit `categoryId` ; les endpoints SEO fournissent `slug`.
 */
export interface PublicCategory {
  id?: string;
  categoryId?: string;
  slug?: string;
  name: string;
  description?: string;
  displayOrder?: number;
  imageUrl?: string;
  url?: string;
  isActive?: boolean;
  available?: boolean;
  updatedAt?: string;
  products?: PublicProduct[];
}

/**
 * Carte / Menu public complet du restaurant (`/orders/menu`).
 */
export interface PublicMenuResponse {
  restaurantId: string;
  restaurantName: string;
  currency: string;
  categories: PublicCategory[];
  minimumOrderValue?: number;
  deliveryFee?: number;
  freeDeliveryThreshold?: number;
  paymentMethods?: string[];
  acceptsOrders?: boolean;
}

/**
 * Résultat de vérification d'éligibilité de livraison (`delivery-check`).
 */
export interface DeliveryZoneCheckResponse {
  canDeliver: boolean;
  restaurantId?: string;
  customerLocation?: { latitude: number; longitude: number; address?: string };
  estimatedDeliveryTime?: number;
  deliveryFee: number;
  minimumOrderAmount?: number;
}

/**
 * Statut d'ouverture temps réel d'un restaurant.
 */
export interface RestaurantStatusResponse {
  restaurantId?: string;
  isOpen: boolean;
  acceptingOrders: boolean;
  operatingStatus?: string;
}

/**
 * Enveloppe SEO renvoyée par `/api/public/seo/**`.
 * Les balises sont imbriquées sous `tags` et utilisent les noms OpenGraph
 * (`og:title`, `og:image`, `twitter:card`).
 */
export interface SeoMetaTagsResponse {
  tenantId?: string;
  baseUrl?: string;
  tags: {
    title?: string;
    description?: string;
    canonical?: string;
    'og:title'?: string;
    'og:description'?: string;
    'og:image'?: string;
    'twitter:card'?: string;
    robots?: string;
    'theme-color'?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Avis public d'un restaurant.
 */
export interface PublicReview {
  id: string;
  customerName?: string;
  rating?: number;
  overallRating?: number;
  content?: string;
  reviewText?: string;
  createdAt?: string;
  [key: string]: unknown;
}

/**
 * Réponse de `/api/public/restaurants/{id}/reviews` (objet dédié, pas un `Page`).
 */
export interface RestaurantReviewsResponse {
  restaurantId: string;
  totalReviews: number;
  averageRating: number;
  reviews: PublicReview[];
  totalPages: number;
  currentPage: number;
}

/**
 * Résultat de résolution de domaine personnalisé (GET /api/vitrine/resolve-domain).
 */
export interface DomainResolutionResponse {
  found: boolean;
  tenantId?: string;
  restaurantName?: string;
  subdomainName?: string;
  customDomain?: string;
  isPublished?: boolean;
  domain?: string;
  message?: string;
}

/**
 * Configuration complète de la vitrine (GET /api/vitrine/{tenantId}/config ou /public).
 */
export interface VitrineConfigResponse {
  id?: string;
  tenantId?: string;
  restaurantId?: string;
  restaurantName?: string;
  slogan?: string;
  description?: string;
  cuisineType?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  contactCity?: string;
  contactPostalCode?: string;
  contactLatitude?: number;
  contactLongitude?: number;
  brandingPrimaryColor?: string;
  brandingSecondaryColor?: string;
  brandingLogoUrl?: string;
  brandingCoverImageUrl?: string;
  brandingFaviconUrl?: string;
  templateId?: string;
  subdomainName?: string;
  subdomainCustomDomain?: string;
  settingsIsPublished?: boolean;
  [key: string]: any;
}



