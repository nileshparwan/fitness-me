/**
 * Escapes SQL LIKE/ILIKE special characters (%, _, \\) in user input
 * to prevent unintended wildcard matching.
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}
