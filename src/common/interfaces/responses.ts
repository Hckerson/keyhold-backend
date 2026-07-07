/**
 * Response DTOs and shaped types matching Prisma query returns
 * These replace generic `any`, `unknown`, `object`, `Record<string, unknown>`
 * with properly typed interfaces based on actual repo query shapes
 */

// ============================================================================
// USER TYPES (reusable across responses)
// ============================================================================

export interface UserBasicInfo {
    id: string;
    fullName: string;
    email: string;
}

export interface UserWithPhone extends UserBasicInfo {
    phoneNumber?: string | null;
}

// ============================================================================
// CONNECTION RESPONSE TYPES
// ============================================================================

export interface ConnectionNotificationContext {
    id: string;
    buyer: UserBasicInfo;
    seller: UserWithPhone;
    property: {
        id: string;
        title: string;
    };
    status: string;
}

export interface ConnectionDetailResponse extends ConnectionNotificationContext {
    messages: Array<{
        id: string;
        content: string;
        senderId: string;
        createdAt: Date;
    }>;
    viewings: Array<{
        id: string;
        status: string;
        confirmedTime?: Date;
    }>;
    offers: Array<{
        id: string;
        offeredPrice: number;
        status: string;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

export interface ConnectionCreatedResponse {
    id: string;
    buyerId: string;
    sellerId: string;
    propertyId: string;
    status: string;
    createdAt: Date;
}

export interface ConnectionBuyerListResponse {
    id: string;
    property: {
        id: string;
        title: string;
        price: number;
    };
    seller: {
        id: string;
        fullName: string;
    };
    status: string;
    createdAt: Date;
}

export interface ConnectionSellerListResponse {
    id: string;
    buyer: UserBasicInfo;
    property: {
        id: string;
        title: string;
        price: number;
    };
    status: string;
    createdAt: Date;
}

// ============================================================================
// VIEWING RESPONSE TYPES
// ============================================================================

export interface ViewingNotificationContext {
    id: string;
    requestedBy: UserBasicInfo;
    proposedBy: UserBasicInfo;
    property: {
        id: string;
        title: string;
    };
    status: string;
    confirmedTime?: Date | null;
    proposedTimes: string[];
}

export interface ViewingDetailResponse extends ViewingNotificationContext {
    connection: ConnectionNotificationContext;
    notes?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ViewingCreatedResponse {
    id: string;
    connectionId: string;
    status: string;
    proposedTimes: string[];
    createdAt: Date;
}

export interface ViewingConfirmedResponse extends ViewingNotificationContext {
    connection: ConnectionNotificationContext;
}

// ============================================================================
// OFFER RESPONSE TYPES
// ============================================================================

export interface OfferNotificationContext {
    id: string;
    offerer: UserBasicInfo;
    property: {
        id: string;
        title: string;
    };
    offeredPrice: number;
    status: string;
    responsePrice?: number | null;
    responseFeedback?: string | null;
}

export interface OfferCreatedNotificationContext {
    offerer: UserBasicInfo;
    offeredPrice: number;
}

export interface OfferDetailResponse extends OfferNotificationContext {
    offeredTerms: string;
    expiresAt: Date;
    respondedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface OfferCreatedResponse {
    id: string;
    connectionId: string;
    offeredPrice: number;
    status: string;
    expiresAt: Date;
    createdAt: Date;
}

export interface OfferRespondedResponse {
    id: string;
    status: string;
    responsePrice?: number | null;
    respondedAt: Date;
}

// ============================================================================
// TRANSACTION RESPONSE TYPES
// ============================================================================

export interface TransactionNotificationContext {
    id: string;
    buyer: UserBasicInfo;
    seller: UserBasicInfo;
    property: {
        id: string;
        title: string;
    };
    finalPrice: number;
    status: string;
}

export interface TransactionDetailResponse extends TransactionNotificationContext {
    terms: string;
    stripePaymentIntentId?: string | null;
    agreementDocUrl?: string | null;
    completedAt?: Date | null;
    reviews: Array<{
        id: string;
        reviewer: UserBasicInfo;
        reviewee: UserBasicInfo;
        rating: number;
        comment?: string;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

export interface TransactionCreatedResponse {
    id: string;
    connectionId: string;
    status: string;
    finalPrice: number;
    createdAt: Date;
}

export interface TransactionListResponse {
    id: string;
    property: {
        id: string;
        title: string;
    };
    otherParty: UserBasicInfo;
    finalPrice: number;
    status: string;
    completedAt?: Date | null;
    createdAt: Date;
}

// ============================================================================
// PROPERTY RESPONSE TYPES
// ============================================================================

export interface PropertyImageResponse {
    id: string;
    propertyId: string;
    url: string;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Generic shape for metric-builder utility function
 * Ensures type safety when building aggregated metrics
 */
export interface MetricDataShape extends Record<string, unknown> {
    [key: string]: unknown;
}

export interface SendGridEmailMessage {
    to: string | string[];
    from: string;
    subject: string;
    html?: string;
    text?: string;
    attachments?: Array<{
        filename: string;
        content: string;
        type?: string;
        disposition?: string;
    }>;
}
