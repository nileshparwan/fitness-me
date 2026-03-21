export type SupplementSubject =
  | { type: "me" }
  | { type: "client"; id: string };

export type SupplementCatalogQuery = {
  search?: string;
  category?: string;
};

export function supplementSubjectKey(subject: SupplementSubject) {
  return subject.type === "me" ? "me" : `client:${subject.id}`;
}

export const supplementKeys = {
  all: ["supplements"] as const,
  subjects: () => [...supplementKeys.all, "subjects"] as const,
  assignmentScope: (subject: SupplementSubject) =>
    [...supplementKeys.all, "assignments", supplementSubjectKey(subject)] as const,
  assignments: (subject: SupplementSubject) =>
    [...supplementKeys.assignmentScope(subject), "all"] as const,
  assignmentsByProfile: (subject: SupplementSubject, profileId: string) =>
    [...supplementKeys.assignmentScope(subject), profileId] as const,
  catalog: (query?: SupplementCatalogQuery) =>
    [
      ...supplementKeys.all,
      "catalog",
      {
        search: query?.search?.trim() || "",
        category: query?.category || "all",
      },
    ] as const,
  people: () => [...supplementKeys.all, "people"] as const,
  programs: (subject: SupplementSubject) =>
    [...supplementKeys.all, "programs", supplementSubjectKey(subject)] as const,
};
