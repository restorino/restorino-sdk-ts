import { HttpClient, RestorinoApiError } from '../http/http-client';
import {
  CustomerLoyalty,
  LoyaltyReward,
  RedemptionResult,
  GoogleReviewInfoResponse,
  GoogleReviewStatusResponse,
  GoogleReviewClaimRequest,
  GoogleReviewClaimDTO,
  UploadReviewProofResponse
} from '../types/loyalty';

const RESTAURANT_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class LoyaltyModule {
  constructor(private http: HttpClient) {}

  /**
   * Récupère le statut fidélité (solde de points, palier courant et progression).
   */
  public async getStatus(): Promise<CustomerLoyalty> {
    return this.http.request<CustomerLoyalty>('/api/customers/loyalty', {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Récupère la liste des récompenses échangeables.
   */
  public async getRewards(): Promise<LoyaltyReward[]> {
    return this.http.request<LoyaltyReward[]>('/api/customers/loyalty/rewards', {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Échange des points contre une récompense.
   *
   * `Idempotency-Key` : le backend marque l'endpoint `@Idempotent`, mais
   * n'applique la garde que si l'en-tête est présent. Une clé est donc générée
   * par défaut (et reste stable à travers les réessais internes) ; l'appelant
   * peut fournir la sienne pour rendre un réessai applicatif sûr.
   */
  public async redeemReward(rewardId: string, idempotencyKey?: string): Promise<RedemptionResult> {
    return this.http.request<RedemptionResult>(`/api/customers/loyalty/rewards/${encodeURIComponent(rewardId)}/redeem`, {
      method: 'POST',
      requiresAuth: true,
      idempotencyKey: idempotencyKey ?? this.http.createIdempotencyKey()
    });
  }

  /**
   * Récupère les informations publiques de la campagne d'avis Google du restaurant.
   * Le paramètre de chemin doit être un UUID (un slug produit un 400).
   */
  public async getGoogleReviewInfo(restaurantId?: string): Promise<GoogleReviewInfoResponse> {
    const targetId = restaurantId || this.http.getConfig().restaurantId;
    if (!targetId || !RESTAURANT_UUID_PATTERN.test(targetId)) {
      throw new RestorinoApiError(
        400,
        'restaurantId (UUID) est requis pour consulter la campagne d’avis Google.',
        'INVALID_RESTAURANT_ID'
      );
    }

    return this.http.request<GoogleReviewInfoResponse>(
      `/api/public/restaurants/${encodeURIComponent(targetId)}/google-review-info`,
      { method: 'GET' }
    );
  }

  /**
   * Vérifie si le client connecté est éligible pour réclamer des points pour un avis Google.
   */
  public async getGoogleReviewStatus(): Promise<GoogleReviewStatusResponse> {
    return this.http.request<GoogleReviewStatusResponse>('/api/customers/google-review/status', {
      method: 'GET',
      requiresAuth: true
    });
  }

  /**
   * Soumet une réclamation de points pour un avis Google rédigé.
   * Une clé d'idempotence est générée par défaut pour éviter un double crédit
   * si la requête est rejouée.
   */
  public async claimGoogleReview(data: GoogleReviewClaimRequest, idempotencyKey?: string): Promise<GoogleReviewClaimDTO> {
    const payload = {
      reviewerName: data.reviewerName || data.googleReviewerName || '',
      rating: data.rating ?? data.starRating ?? 5,
      reviewComment: data.reviewComment || data.commentSnippet,
      proofImageUrl: data.proofImageUrl
    };
    return this.http.request<GoogleReviewClaimDTO>('/api/customers/google-review/claim', {
      method: 'POST',
      body: payload,
      requiresAuth: true,
      idempotencyKey: idempotencyKey ?? this.http.createIdempotencyKey()
    });
  }

  /**
   * Téléverse une capture d'écran de preuve pour la réclamation d'avis Google (max 5 Mo).
   */
  public async uploadGoogleReviewProof(file: File | Blob): Promise<UploadReviewProofResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.request<UploadReviewProofResponse>('/api/customers/google-review/upload-proof', {
      method: 'POST',
      body: formData,
      isFormData: true,
      requiresAuth: true
    });
  }
}
