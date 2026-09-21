'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type {
  Category,
  CategoryStatus,
  ContentStatus,
  ContentType,
  Contribution,
  ContributionStatus,
  ContributionType,
  DashboardSummary,
  Ad,
  AdStatus,
  AdType,
  GoogleAdPayload,
  Installation,
  Paginated,
  PersonalAdPayload,
  Phrase,
  Word,
} from './types';

interface ListParams {
  page?: number;
  limit?: number;
  status?: ContentStatus;
  category?: string;
}

function withParams(path: string, params: object = {}) {
  const search = new URLSearchParams();
  Object.entries(params as Record<string, string | number | undefined>).forEach(([k, v]) => {
    if (v !== undefined && v !== '') search.append(k, String(v));
  });
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: DashboardSummary }>('/dashboard');
      return data.data;
    },
  });
}

export function useInstallations(params: ListParams) {
  return useQuery({
    queryKey: ['installations', params],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: Paginated<Installation> }>(
        withParams('/installations', params),
      );
      return data.data;
    },
  });
}

export function useWords(params: ListParams) {
  return useQuery({
    queryKey: ['words', params],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: Paginated<Word> }>(
        withParams('/words', params),
      );
      return data.data;
    },
  });
}

export function useWord(id: string | null) {
  return useQuery({
    queryKey: ['words', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: Word }>(`/words/${id}`);
      return data.data;
    },
  });
}

export type WordInput = {
  english: string;
  hausa: string;
  description?: string;
  categoryId: string;
  exampleSentence?: { english?: string; hausa?: string };
  audio?: { url?: string; storageKey?: string; duration?: number; mimeType?: string };
  status?: ContentStatus;
};

export function useCreateWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: WordInput) => {
      const { data } = await api.post<{ success: true; data: Word }>('/words', input);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['words'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}

export function useUpdateWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<WordInput> }) => {
      const { data } = await api.patch<{ success: true; data: Word }>(`/words/${id}`, input);
      return data.data;
    },
    onSuccess: (word) => {
      qc.invalidateQueries({ queryKey: ['words'] });
      qc.invalidateQueries({ queryKey: ['words', word._id] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}

export function useDeleteWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ success: true; data: Word }>(`/words/${id}`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['words'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}

export function usePhrases(params: ListParams) {
  return useQuery({
    queryKey: ['phrases', params],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: Paginated<Phrase> }>(
        withParams('/phrases', params),
      );
      return data.data;
    },
  });
}

export function usePhrase(id: string | null) {
  return useQuery({
    queryKey: ['phrases', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: Phrase }>(`/phrases/${id}`);
      return data.data;
    },
  });
}

export type PhraseInput = {
  english: string;
  hausa: string;
  categoryId: string;
  audio?: { url?: string; storageKey?: string; duration?: number; mimeType?: string };
  status?: ContentStatus;
};

export function useCreatePhrase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PhraseInput) => {
      const { data } = await api.post<{ success: true; data: Phrase }>('/phrases', input);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['phrases'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}

export function useUpdatePhrase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<PhraseInput> }) => {
      const { data } = await api.patch<{ success: true; data: Phrase }>(`/phrases/${id}`, input);
      return data.data;
    },
    onSuccess: (phrase) => {
      qc.invalidateQueries({ queryKey: ['phrases'] });
      qc.invalidateQueries({ queryKey: ['phrases', phrase._id] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}

export function useDeletePhrase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ success: true; data: Phrase }>(`/phrases/${id}`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['phrases'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}

export interface AdsParams {
  page?: number;
  limit?: number;
  type?: AdType;
  status?: AdStatus;
  placement?: string;
  q?: string;
}

export function useAds(params: AdsParams) {
  return useQuery({
    queryKey: ['ads', params],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: Paginated<Ad> }>(
        withParams('/ads', params),
      );
      return data.data;
    },
  });
}

export type AdInput = {
  name: string;
  type: AdType;
  placement: string;
  status: AdStatus;
  priority: number;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
  google?: GoogleAdPayload;
  personal?: PersonalAdPayload;
};

export function useCreateAd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdInput) => {
      const { data } = await api.post<{ success: true; data: Ad }>('/ads', input);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ads'] });
    },
  });
}

export function useUpdateAd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<AdInput> }) => {
      const { data } = await api.patch<{ success: true; data: Ad }>(`/ads/${id}`, input);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ads'] });
    },
  });
}

export function useArchiveAd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ success: true; data: Ad }>(`/ads/${id}`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ads'] });
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: Category[] }>('/categories');
      return data.data;
    },
  });
}

export type CategoryInput = {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  status?: CategoryStatus;
};

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CategoryInput) => {
      const { data } = await api.post<{ success: true; data: Category }>('/categories', input);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CategoryInput> }) => {
      const { data } = await api.patch<{ success: true; data: Category }>(`/categories/${id}`, input);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export interface ContributionsParams {
  page?: number;
  limit?: number;
  status?: ContributionStatus;
  type?: ContributionType;
}

export function useContributions(params: ContributionsParams) {
  return useQuery({
    queryKey: ['contributions', params],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: Paginated<Contribution> }>(
        withParams('/contributions', params),
      );
      return data.data;
    },
  });
}

export function useContribution(id: string | null) {
  return useQuery({
    queryKey: ['contributions', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: Contribution }>(`/contributions/${id}`);
      return data.data;
    },
  });
}

export function useReferencedContent(type: ContentType | null, id: string | null) {
  return useQuery({
    queryKey: ['referenced', type, id],
    enabled: Boolean(type && id),
    queryFn: async () => {
      const path = type === 'WORD' ? `/words/${id}` : `/phrases/${id}`;
      const { data } = await api.get<{ success: true; data: Word | Phrase }>(path);
      return data.data;
    },
  });
}

export function useMarkUnderReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<{ success: true; data: Contribution }>(
        `/contributions/${id}/review`,
      );
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contributions'] }),
  });
}

export function useApproveContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, overrides }: { id: string; overrides?: Record<string, unknown> }) => {
      const { data } = await api.patch<{ success: true; data: { contribution: Contribution; content: Word | Phrase } }>(
        `/contributions/${id}/approve`,
        overrides ?? {},
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contributions'] });
      qc.invalidateQueries({ queryKey: ['words'] });
      qc.invalidateQueries({ queryKey: ['phrases'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}

export function useRejectContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reviewNotes }: { id: string; reviewNotes: string }) => {
      const { data } = await api.patch<{ success: true; data: Contribution }>(
        `/contributions/${id}/reject`,
        { reviewNotes },
      );
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contributions'] }),
  });
}
