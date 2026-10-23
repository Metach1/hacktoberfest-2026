import test from "node:test";
import assert from "node:assert/strict";
import {
  EDIT_PROFILE_HREF,
  LOGOUT_HREF,
  avatarInitials,
  isDismissKey,
  profileMenuItems,
  showProfileMenu,
} from "../src/app/lib/profile-menu.mjs";

/**
 * The header account menu replaces the old standalone logout button: the
 * profile circle opens a dropdown with "Edit profile" and "Log out". These
 * tests cover the pure rules the component relies on — the DOM wiring (toggle,
 * outside-click, focus) is a thin shell over them, as with the payment-menu
 * and receipt-viewer tests in this repo.
 */

test("signed-in roles show the profile menu; logged out shows none", () => {
  assert.equal(showProfileMenu("athlete"), true);
  assert.equal(showProfileMenu("supporter"), true);
  assert.equal(showProfileMenu(null), false);
  assert.equal(showProfileMenu(undefined), false);
});

test("logged-out navbar exposes no profile menu options", () => {
  assert.deepEqual(profileMenuItems(null), []);
  assert.deepEqual(profileMenuItems(undefined), []);
});

test("athlete menu offers View profile, Edit profile, then Log out, in order", () => {
  const items = profileMenuItems("athlete");
  assert.deepEqual(
    items.map((i) => i.id),
    ["view-profile", "edit-profile", "logout"],
  );
  assert.deepEqual(
    items.map((i) => i.label),
    ["View profile", "Edit profile", "Log out"],
  );
});

test("supporter menu offers Edit profile and Log out but no View profile", () => {
  assert.deepEqual(
    profileMenuItems("supporter").map((i) => i.id),
    ["edit-profile", "logout"],
  );
});

test("only an athlete gets a View profile option (supporters have no public profile)", () => {
  assert.ok(profileMenuItems("athlete").some((i) => i.id === "view-profile"));
  assert.ok(!profileMenuItems("supporter").some((i) => i.id === "view-profile"));
});

test("Edit profile navigates to the shared edit route for both roles", () => {
  for (const role of ["athlete", "supporter"]) {
    const edit = profileMenuItems(role).find((i) => i.id === "edit-profile");
    assert.equal(edit.href, EDIT_PROFILE_HREF);
    assert.equal(edit.href, "/dashboard/edit");
  }
});

test("Log out has no href; it ends the session then lands on the home page", () => {
  const logout = profileMenuItems("athlete").find((i) => i.id === "logout");
  assert.equal(logout.href, undefined);
  assert.equal(LOGOUT_HREF, "/");
});

test("Escape dismisses the menu; other keys do not", () => {
  assert.equal(isDismissKey("Escape"), true);
  for (const key of ["Enter", " ", "Tab", "a", "ArrowDown"]) {
    assert.equal(isDismissKey(key), false, `${key} should not dismiss`);
  }
});

test("avatar initials use the athlete name, else the supporter fallback", () => {
  assert.equal(avatarInitials("athlete", "Jamie Dela Cruz"), "JD");
  assert.equal(avatarInitials("athlete", "Maria"), "M");
  assert.equal(avatarInitials("supporter", undefined), "JD");
  assert.equal(avatarInitials("athlete", undefined), "JD");
});
