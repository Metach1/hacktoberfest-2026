/**
 * Pure, DOM-free logic for the header account menu (the profile-circle
 * dropdown). Kept in one small module so the behavioral rules can be unit
 * tested with `node --test` without mounting React — matching how the payment
 * menu and receipt viewer rules are tested in this repo.
 *
 * Decision recorded here: both demo roles ("athlete" and "supporter") have an
 * editable account at /dashboard/edit, so the Edit profile option is always
 * offered. There is no admin role in the demo, so no role is sent elsewhere or
 * hidden. If an admin-style role without a profile is ever added, extend
 * `profileMenuItems` to drop (or redirect) its "edit-profile" entry.
 */

/** Where "Edit profile" navigates. Shared by the component and tests. */
export const EDIT_PROFILE_HREF = "/dashboard/edit";

/** Where "Log out" lands after ending the session. */
export const LOGOUT_HREF = "/";

/**
 * The menu options shown for a given role, in order. `null` (logged out) yields
 * no options — the component renders no profile menu at all in that case.
 *
 * Each option is `{ id, label, href? }`. "logout" has no href because it ends
 * the session first, then navigates to LOGOUT_HREF.
 */
export function profileMenuItems(role) {
  if (role !== "athlete" && role !== "supporter") return [];
  return [
    { id: "edit-profile", label: "Edit profile", href: EDIT_PROFILE_HREF },
    { id: "logout", label: "Log out" },
  ];
}

/** True when the profile circle/menu should render at all (signed-in only). */
export function showProfileMenu(role) {
  return role === "athlete" || role === "supporter";
}

/** The two-letter avatar initials for a role (athlete uses their name). */
export function avatarInitials(role, athleteName) {
  if (role === "athlete" && athleteName) {
    return athleteName
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  return "JD";
}

/** Keys that dismiss the open menu (outside-click is handled separately). */
export function isDismissKey(key) {
  return key === "Escape";
}
