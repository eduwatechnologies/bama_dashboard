/**
 * Shared types that mirror the admin API contract documented in
 * `dashboard/admin.md`. Kept central so every page picks up the same
 * shapes and so we can swap a mock implementation without touching screens.
 */

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'EDITOR';

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type CategoryStatus = 'ACTIVE' | 'INACTIVE';
export type ContributionStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
export type ContributionType = 'WORD' | 'PHRASE' | 'TRANSLATION' | 'CORRECTION' | 'AUDIO';
export type ContentType = 'WORD' | 'PHRASE';
export type ContributionContentType = 'word' | 'phrase';

export interface AudioMeta {
  url: string;
  storageKey?: string;
  mimeType?: string;
  size?: number;
  duration?: number;
}

export interface CategoryRef {
  _id: string;
  name: string;
  slug: string;
}

export interface Category extends CategoryRef {
  description?: string;
  icon?: string;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ExampleSentence {
  english?: string;
  hausa?: string;
}

export interface Word {
  _id: string;
  english: string;
  hausa: string;
  description?: string;
  categoryId: CategoryRef;
  exampleSentence?: ExampleSentence;
  audio?: AudioMeta;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Phrase {
  _id: string;
  english: string;
  hausa: string;
  categoryId: CategoryRef;
  audio?: AudioMeta;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Installation {
  _id: string;
  installationId: string;
  appVersion: string;
  platform: 'android' | 'ios' | 'web' | 'unknown';
  deviceLanguage?: string;
  contentVersion: number;
  firstSeenAt: string;
  lastSeenAt: string;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  totalWords: number;
  totalPhrases: number;
  totalCategories: number;
  totalInstallations: number;
  contentVersion: number;
}

export interface Contribution {
  _id: string;
  type: ContributionType;
  status: ContributionStatus;
  contentType?: ContributionContentType;
  contentId?: string;
  english?: string;
  hausa?: string;
  suggestedEnglish?: string;
  suggestedHausa?: string;
  reason?: string;
  notes?: string;
  categoryId?: CategoryRef | string;
  audio?: AudioMeta;
  installationId: string;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  resultContentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: { page: number; limit: number; total?: number };
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'DUPLICATE_KEY_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'INTERNAL_ERROR';

export interface Paginated<T> {
  items: T[];
  total: number;
}
