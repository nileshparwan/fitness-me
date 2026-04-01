"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  listAssignmentsAction,
  listSupplementCatalogAction,
  listSupplementPeopleAction,
  listSupplementProgramOptionsAction,
  listSupplementSubjectsAction,
  type SupplementSubject,
} from "@/app/actions/supplements";
import { supplementKeys } from "@/lib/query-keys-supplements";

export type { SupplementSubject };

export function useSupplementCatalog(params?: {
  search?: string;
  category?: string;
  enabled?: boolean;
}) {
  const search = params?.search?.trim() || undefined;
  const category = params?.category || undefined;

  return useQuery({
    queryKey: supplementKeys.catalog({ search, category }),
    queryFn: () =>
      listSupplementCatalogAction({
        search,
        category_filter: category as
          | "vitamin"
          | "mineral"
          | "omega"
          | "protein"
          | "electrolyte"
          | "herbal"
          | "other"
          | undefined,
      }),
    staleTime: 120_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    enabled: params?.enabled ?? true,
  });
}

export function useSupplementPeople() {
  return useQuery({
    queryKey: supplementKeys.people(),
    queryFn: listSupplementPeopleAction,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useSupplementProgramOptions(subject: SupplementSubject, enabled = true) {
  return useQuery({
    queryKey: supplementKeys.programs(subject),
    queryFn: () => listSupplementProgramOptionsAction({ subject }),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    enabled,
  });
}

export function useSupplementSubjects() {
  return useQuery({
    queryKey: supplementKeys.subjects(),
    queryFn: listSupplementSubjectsAction,
    staleTime: 45_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useSupplementAssignments(subject: SupplementSubject, profileId?: string, enabled = true) {
  return useQuery({
    queryKey: profileId
      ? supplementKeys.assignmentsByProfile(subject, profileId)
      : supplementKeys.assignments(subject),
    queryFn: () => listAssignmentsAction({ subject, profile_id: profileId }),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    enabled,
  });
}
