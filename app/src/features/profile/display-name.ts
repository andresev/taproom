/** Mirrors the `profiles.display_name` check constraint (supabase/migrations). */
export const DISPLAY_NAME_MIN = 3;
export const DISPLAY_NAME_MAX = 32;

/** Returns a problem to show the user, or null if the trimmed name can be saved. */
export function displayNameProblem(name: string): string | null {
  const length = name.trim().length;
  if (length < DISPLAY_NAME_MIN) return `Name must be at least ${DISPLAY_NAME_MIN} characters.`;
  if (length > DISPLAY_NAME_MAX) return `Name must be at most ${DISPLAY_NAME_MAX} characters.`;
  return null;
}
