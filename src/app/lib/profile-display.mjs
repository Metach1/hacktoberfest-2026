/**
 * @param {string | null | undefined} firstName
 * @param {string | null | undefined} lastName
 * @param {string | null} [fallback]
 * @returns {string | null}
 */
export function resolveDisplayName(firstName, lastName, fallback = null) {
  const profileName = [firstName, lastName]
    .filter((name) => typeof name === "string" && name.trim())
    .map((name) => name.trim())
    .join(" ");
  return profileName || fallback;
}

/** @param {string | null | undefined} name */
export function getInitials(name) {
  return (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}
