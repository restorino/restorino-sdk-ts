/**
 * Informations publiques de vitrine d'un restaurant.
 */
export interface PublicVitrineResponse {
  id: string;
  name: string;
  slug?: string;
  subdomain?: string;
  customDomain?: string;
  description?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  bannerUrl?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  cuisines: string[];
  deliveryEnabled: boolean;
  takeawayEnabled: boolean;
  dineInEnabled: boolean;
  averageRating?: number;
  reviewCount?: number;
  currency?: string;
}

/**
 * Critères de recherche multicritère de restaurants.
 */
export interface RestaurantSearchRequest {
  query?: string;
  cuisine?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  deliveryOnly?: boolean;
}

/**
 * Option ou supplément d'un plat (sauce, taille, extra).
 */
export interface ProductOption {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

/**
 * Produit / plat public d'un menu.
 */
export interface PublicProduct {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  isAvailable: boolean;
  isPopular?: boolean;
  categoryId: string;
  allergens?: string[];
  supplements?: ProductOption[];
  garnishes?: ProductOption[];
  sizes?: { name: string; price: number }[];
}

/**
 * Catégorie publique du menu.
 */
export interface PublicCategory {
  id: string;
  name: string;
  description?: string;
  slug: string;
  displayOrder: number;
  imageUrl?: string;
  products?: PublicProduct[];
}

/**
 * Carte / Menu public complet d'un restaurant.
 */
export interface PublicMenuResponse {
  restaurantId: string;
  restaurantName: string;
  currency: string;
  categories: PublicCategory[];
}

/**
 * Résultat de vérification d'éligibilité de livraison par géolocalisation.
 */
export interface DeliveryZoneCheckResponse {
  isEligible: boolean;
  deliveryFee: number;
  minimumOrderAmount: number;
  estimatedDeliveryMinutes: number;
  zoneName?: string;
  message?: string;
}

/**
 * Statut d'ouverture temps réel d'un restaurant.
 */
export interface RestaurantStatusResponse {
  isOpen: boolean;
  acceptingOrders: boolean;
  currentShift?: string;
  nextOpeningTime?: string;
  message?: string;
}

/**
 * Métadonnées SEO et balises OpenGraph.
 */
export interface SeoMetaTagsResponse {
  title: string;
  description: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage?: string;
  twitterCard?: string;
}
