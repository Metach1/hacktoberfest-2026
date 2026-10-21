"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/src/app/shared/ui";
import { useStarlete } from "@/src/app/store";

export function EditProfileScreen() {
  const { role, athletes, mounted } = useStarlete();
  const router = useRouter();

  const demoAthlete = athletes[0];
  // Controlled funding-goal input so we can validate it. Stored as the raw
  // string the user types, then validated as a positive number on submit.
  const [goal, setGoal] = useState<string>(() => String(demoAthlete?.goal ?? ""));

  useEffect(() => {
    if (mounted && !role) router.replace("/login");
  }, [mounted, role, router]);

  if (!role) return null;

  const athleteInitials = demoAthlete.name.split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase();

  // A funding goal must be a positive number; reject empty, zero, and negatives.
  const goalValue = Number(goal);
  const goalError =
    role === "athlete" && (goal.trim() === "" || !Number.isFinite(goalValue) || goalValue <= 0)
      ? "Funding goal must be greater than zero."
      : null;

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (goalError) return; // block submit on an invalid goal
    router.push("/dashboard");
  };

  return (
    <main className="settings page-shell">
      <div className="settings-head"><span className="eyebrow">Account settings</span><h1>Edit your profile</h1><p>Keep your information current for the Startlete community.</p></div>
      <div className="settings-card">
        <div className="profile-avatar">{role === "athlete" ? athleteInitials : "JD"}<button type="button"><Icon name="plus" size={16} /></button></div>
        <form onSubmit={save}>
          <div className="field-row"><label>Full name<input defaultValue={role === "athlete" ? demoAthlete.name : "Jamie Dela Cruz"} /></label><label>Location<input defaultValue={role === "athlete" ? demoAthlete.location : "Makati City"} /></label></div>
          <label>Bio<textarea defaultValue={role === "athlete" ? demoAthlete.bio : "Proud supporter of Filipino athletes."} /></label>
          {role === "athlete" && <div className="field-row"><label>Sport<input defaultValue={demoAthlete.sport} /></label><label>Funding goal (₱)<input type="number" min="1" step="1" inputMode="numeric" value={goal} onChange={e => setGoal(e.target.value)} aria-invalid={goalError ? true : undefined} />{goalError && <small className="field-error">{goalError}</small>}</label></div>}
          <div className="form-actions"><button type="button" className="button secondary" onClick={() => router.push("/dashboard")}>Cancel</button><button className="button" disabled={!!goalError}>Save changes</button></div>
        </form>
      </div>
    </main>
  );
}
