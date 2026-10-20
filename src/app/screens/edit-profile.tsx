"use client";

import { FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon, peso } from "@/src/app/shared/ui";
import { useStarlete } from "@/src/app/store";

export function EditProfileScreen() {
  const { role, athletes, mounted } = useStarlete();
  const router = useRouter();

  useEffect(() => {
    if (mounted && !role) router.replace("/login");
  }, [mounted, role, router]);

  if (!role) return null;

  const demoAthlete = athletes[0];
  const athleteInitials = demoAthlete.name.split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase();

  const save = (e: FormEvent) => {
    e.preventDefault();
    router.push("/dashboard");
  };

  return (
    <main className="settings page-shell">
      <div className="settings-head"><span className="eyebrow">Account settings</span><h1>Edit your profile</h1><p>Keep your information current for the Starlete community.</p></div>
      <div className="settings-card">
        <div className="profile-avatar">{role === "athlete" ? athleteInitials : "JD"}<button type="button"><Icon name="plus" size={16} /></button></div>
        <form onSubmit={save}>
          <div className="field-row"><label>Full name<input defaultValue={role === "athlete" ? demoAthlete.name : "Jamie Dela Cruz"} /></label><label>Location<input defaultValue={role === "athlete" ? demoAthlete.location : "Makati City"} /></label></div>
          <label>Bio<textarea defaultValue={role === "athlete" ? demoAthlete.bio : "Proud supporter of Filipino athletes."} /></label>
          {role === "athlete" && <div className="field-row"><label>Sport<input defaultValue={demoAthlete.sport} /></label><label>Funding goal<input defaultValue={peso(demoAthlete.goal)} /></label></div>}
          <div className="form-actions"><button type="button" className="button secondary" onClick={() => router.push("/dashboard")}>Cancel</button><button className="button">Save changes</button></div>
        </form>
      </div>
    </main>
  );
}
