"use client";

import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";

import {
  clientLoginAction,
  clientLogoutAction,
  coachBlockClientAccessAction,
  coachChangeClientUsernameAction,
  coachRemoveClientAccessAction,
  coachResetClientPasswordAction,
  coachSetClientCredentialsAction,
  coachUpdateClientModuleAccessAction,
  listClientPortalSettingsAction,
} from "@/app/actions/client-portal-auth";
import {
  addClientMealItemAction,
  copyClientMealsFromDateAction,
  createClientPortalCheckinAction,
  createClientTaskAction,
  createClientWorkoutLogAction,
  createCoachNoteForClientAction,
  getClientGoalsAction,
  getClientPortalDashboardAction,
  getClientPortalMealDiaryAction,
  getClientPortalMealPlanAction,
  getClientPortalTrainingPlanAction,
  getClientStepsLogAction,
  listClientFavoriteMealItemsAction,
  listClientPortalCheckinsAction,
  listClientPortalNotesAction,
  listClientPortalTasksAction,
  listClientPortalWorkoutsAction,
  listCoachClientTasksAction,
  listClientRecentMealItemsAction,
  markClientTaskCompleteAction,
  removeClientMealItemAction,
  toggleClientFavoriteMealItemAction,
  updateClientGoalsAction,
  updateClientTaskAction,
  updateCoachNoteVisibilityAction,
  upsertClientStepsLogAction,
} from "@/app/actions/client-portal";
import { clientPortalKeys } from "@/lib/query-keys-client-portal";

export function useCoachClientPortalSettings(clientId: string) {
  return useQuery({
    queryKey: clientPortalKeys.coachClientSettings(clientId),
    queryFn: () => listClientPortalSettingsAction(clientId),
    enabled: Boolean(clientId),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}

export function useCoachClientTasks(clientId: string) {
  return useQuery({
    queryKey: [...clientPortalKeys.coachClientSettings(clientId), "tasks"] as QueryKey,
    queryFn: () => listCoachClientTasksAction(clientId),
    enabled: Boolean(clientId),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useCoachClientPortalMutations(clientId: string) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: clientPortalKeys.coachClientSettings(clientId) }),
      queryClient.invalidateQueries({ queryKey: clientPortalKeys.dashboard() }),
      queryClient.invalidateQueries({ queryKey: clientPortalKeys.tasks() }),
      queryClient.invalidateQueries({ queryKey: clientPortalKeys.notes() }),
      queryClient.invalidateQueries({ queryKey: clientPortalKeys.trainingPlan() }),
    ]);
  };

  return {
    setCredentials: useMutation({
      mutationFn: coachSetClientCredentialsAction,
      onSuccess: invalidate,
    }),
    resetPassword: useMutation({
      mutationFn: coachResetClientPasswordAction,
      onSuccess: invalidate,
    }),
    changeUsername: useMutation({
      mutationFn: coachChangeClientUsernameAction,
      onSuccess: invalidate,
    }),
    blockAccess: useMutation({
      mutationFn: coachBlockClientAccessAction,
      onSuccess: invalidate,
    }),
    removeAccess: useMutation({
      mutationFn: coachRemoveClientAccessAction,
      onSuccess: invalidate,
    }),
    updateModuleAccess: useMutation({
      mutationFn: coachUpdateClientModuleAccessAction,
      onSuccess: invalidate,
    }),
    createTask: useMutation({
      mutationFn: createClientTaskAction,
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: clientPortalKeys.tasks() }),
          queryClient.invalidateQueries({ queryKey: [...clientPortalKeys.coachClientSettings(clientId), "tasks"] as QueryKey }),
        ]);
      },
    }),
    updateTask: useMutation({
      mutationFn: updateClientTaskAction,
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: clientPortalKeys.tasks() }),
          queryClient.invalidateQueries({ queryKey: [...clientPortalKeys.coachClientSettings(clientId), "tasks"] as QueryKey }),
        ]);
      },
    }),
    createNote: useMutation({
      mutationFn: createCoachNoteForClientAction,
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: clientPortalKeys.notes() });
      },
    }),
    updateNoteVisibility: useMutation({
      mutationFn: updateCoachNoteVisibilityAction,
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: clientPortalKeys.notes() });
      },
    }),
  };
}

export function useClientPortalDashboard() {
  return useQuery({
    queryKey: clientPortalKeys.dashboard(),
    queryFn: getClientPortalDashboardAction,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientPortalTasks() {
  return useQuery({
    queryKey: clientPortalKeys.tasks(),
    queryFn: listClientPortalTasksAction,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientPortalNotes() {
  return useQuery({
    queryKey: clientPortalKeys.notes(),
    queryFn: listClientPortalNotesAction,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientPortalWorkouts(performedOn: string) {
  return useQuery({
    queryKey: clientPortalKeys.workouts(performedOn),
    queryFn: () => listClientPortalWorkoutsAction(performedOn),
    enabled: Boolean(performedOn),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientPortalTrainingPlan() {
  return useQuery({
    queryKey: clientPortalKeys.trainingPlan(),
    queryFn: getClientPortalTrainingPlanAction,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientPortalMealPlan(performedOn: string) {
  return useQuery({
    queryKey: clientPortalKeys.mealPlan(performedOn),
    queryFn: () => getClientPortalMealPlanAction(performedOn),
    enabled: Boolean(performedOn),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientPortalMealDiary(performedOn: string) {
  return useQuery({
    queryKey: clientPortalKeys.mealDiary(performedOn),
    queryFn: () => getClientPortalMealDiaryAction(performedOn),
    enabled: Boolean(performedOn),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientPortalRecentMeals(limit = 30) {
  return useQuery({
    queryKey: clientPortalKeys.mealRecent(limit),
    queryFn: () => listClientRecentMealItemsAction({ limit }),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientPortalFavoriteMeals(limit = 30) {
  return useQuery({
    queryKey: clientPortalKeys.mealFavorites(limit),
    queryFn: () => listClientFavoriteMealItemsAction({ limit }),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientPortalSteps(performedOn: string) {
  return useQuery({
    queryKey: clientPortalKeys.steps(performedOn),
    queryFn: () => getClientStepsLogAction(performedOn),
    enabled: Boolean(performedOn),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientPortalCheckins() {
  return useQuery({
    queryKey: clientPortalKeys.checkins(),
    queryFn: listClientPortalCheckinsAction,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientPortalGoals() {
  return useQuery({
    queryKey: clientPortalKeys.goals(),
    queryFn: getClientGoalsAction,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientPortalMutations(performedOn: string) {
  const queryClient = useQueryClient();
  const mealDiaryKey = clientPortalKeys.mealDiary(performedOn) as QueryKey;

  const invalidateDaily = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: clientPortalKeys.dashboard() }),
      queryClient.invalidateQueries({ queryKey: clientPortalKeys.tasks() }),
      queryClient.invalidateQueries({ queryKey: clientPortalKeys.trainingPlan() }),
      queryClient.invalidateQueries({ queryKey: clientPortalKeys.workouts(performedOn) }),
      queryClient.invalidateQueries({ queryKey: mealDiaryKey }),
      queryClient.invalidateQueries({ queryKey: clientPortalKeys.mealRecentRoot() }),
      queryClient.invalidateQueries({ queryKey: clientPortalKeys.mealFavoritesRoot() }),
      queryClient.invalidateQueries({ queryKey: clientPortalKeys.steps(performedOn) }),
      queryClient.invalidateQueries({ queryKey: clientPortalKeys.checkins() }),
      queryClient.invalidateQueries({ queryKey: clientPortalKeys.goals() }),
    ]);
  };

  return {
    clientLogin: useMutation({
      mutationFn: clientLoginAction,
    }),
    clientLogout: useMutation({
      mutationFn: clientLogoutAction,
    }),
    completeTask: useMutation({
      mutationFn: markClientTaskCompleteAction,
      onSuccess: invalidateDaily,
    }),
    createWorkout: useMutation({
      mutationFn: createClientWorkoutLogAction,
      onSuccess: invalidateDaily,
    }),
    addMealItem: useMutation({
      mutationFn: addClientMealItemAction,
      onSuccess: invalidateDaily,
    }),
    removeMealItem: useMutation({
      mutationFn: removeClientMealItemAction,
      onSuccess: invalidateDaily,
    }),
    copyMeals: useMutation({
      mutationFn: copyClientMealsFromDateAction,
      onSuccess: invalidateDaily,
    }),
    toggleMealFavorite: useMutation({
      mutationFn: toggleClientFavoriteMealItemAction,
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: clientPortalKeys.mealFavoritesRoot() }),
          queryClient.invalidateQueries({ queryKey: clientPortalKeys.mealRecentRoot() }),
        ]);
      },
    }),
    upsertSteps: useMutation({
      mutationFn: upsertClientStepsLogAction,
      onSuccess: invalidateDaily,
    }),
    createCheckin: useMutation({
      mutationFn: createClientPortalCheckinAction,
      onSuccess: invalidateDaily,
    }),
    updateGoals: useMutation({
      mutationFn: updateClientGoalsAction,
      onSuccess: invalidateDaily,
    }),
  };
}
