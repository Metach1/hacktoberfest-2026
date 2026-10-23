/**
 * Pure, DOM-free logic for the header account menu (the profile-circle
 * dropdown). Kept in one small module so the behavioral rules can be unit
 * tested with `node --test` without mounting React — matching how the payment
 * menu and receipt viewer rules are tested in this repo.
 *
 * Decision recorded here: both demo roles ("athlete" and "supporter") have an
 * editable account at /dashboard/edit, so the Edit profile option is always
 * offered. Only an athlete has a public profile, so "View profile" is shown to
 * athletes only. There is no admin role in the demo.
 */

/** Where "Edit profile" navigates. Shared by the component and tests. */
export const EDIT_PROFILE_HREF = "/dashboard/edit";

/** Where "Log out" lands after ending the session. */
export const LOGOUT_HREF = "/";

/**
 * The menu options shown for a given role, in order. `null` (logged out) yields
 * no options — the component renders no profile menu at all in that case.
 *
 * Each option is `{ id, label, href? }`. Items without an href are resolved by
 * the component: "logout" ends the session then navigates to LOGOUT_HREF, and
 * "view-profile" goes to the athlete's own /athletes/<id> (only an athlete has
 * a public profile, so supporters don't get this option).
 */
export function profileMenuItems(role) {
  if (role !== "athlete" && role !== "supporter") return [];
  const items = [];
  if (role === "athlete") {
    items.push({ id: "view-profile", label: "View profile" });
  }
  items.push({ id: "edit-profile", label: "Edit profile", href: EDIT_PROFILE_HREF });
  items.push({ id: "logout", label: "Log out" });
  return items;
}

/** True when the profile circle/menu should render at all (signed-in only). */
export function showProfileMenu(role) {
  return role === "athlete" || role === "supporter";
}

/** Keys that dismiss the open menu (outside-click is handled separately). */
export function isDismissKey(key) {
  return key === "Escape";
}
