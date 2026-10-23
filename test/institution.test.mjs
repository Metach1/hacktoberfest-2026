import test from "node:test";
import assert from "node:assert/strict";
import {
  INSTITUTION_MAX,
  normalizeInstitution,
  validateInstitution,
  institutionSuggestions,
} from "../src/app/lib/institution.mjs";

test("a valid institution is accepted and returned normalized", () => {
  const r = validateInstitution("  University of the Philippines Cebu  ");
  assert.equal(r.ok, true);
  assert.equal(r.value, "University of the Philippines Cebu");
});

test("normalize trims ends and collapses internal whitespace", () => {
  assert.equal(normalizeInstitution("UP   Cebu "), "UP Cebu");
  assert.equal(normalizeInstitution("\tCebu City  Sports  Club\n"), "Cebu City Sports Club");
});

test("an empty value is rejected with a clear message", () => {
  const r = validateInstitution("");
  assert.equal(r.ok, false);
  assert.match(r.error, /school, university, club, or team/i);
});

test("a whitespace-only value is rejected (not just empty strings)", () => {
  assert.equal(validateInstitution("   ").ok, false);
  assert.equal(validateInstitution("\t\n ").ok, false);
});

test("a too-long value is rejected at the max length boundary", () => {
  const atMax = "a".repeat(INSTITUTION_MAX);
  assert.equal(validateInstitution(atMax).ok, true);
  const tooLong = "a".repeat(INSTITUTION_MAX + 1);
  const r = validateInstitution(tooLong);
  assert.equal(r.ok, false);
  assert.match(r.error, new RegExp(String(INSTITUTION_MAX)));
});

test("autocomplete suggestions are distinct, non-empty, and sorted", () => {
  const athletes = [
    { institution: "University of the Philippines Cebu" },
    { institution: "Cebu City Sports Club" },
    { institution: "" },
    { institution: "  University of the Philippines Cebu  " }, // dup after normalize
    { institution: "up cebu" }, // different name, kept
    {}, // no institution
  ];
  assert.deepEqual(institutionSuggestions(athletes), [
    "Cebu City Sports Club",
    "University of the Philippines Cebu",
    "up cebu",
  ]);
});

test("case-insensitive de-duplication keeps the first-seen spelling", () => {
  const athletes = [
    { institution: "Ateneo de Manila" },
    { institution: "ATENEO DE MANILA" },
  ];
  assert.deepEqual(institutionSuggestions(athletes), ["Ateneo de Manila"]);
});

test("suggestions handle non-array input defensively", () => {
  assert.deepEqual(institutionSuggestions(null), []);
  assert.deepEqual(institutionSuggestions(undefined), []);
});
