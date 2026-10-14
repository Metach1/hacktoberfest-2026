"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { LoginCredentials } from "../model/login";

export function LoginScreen() {
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const credentials: LoginCredentials = {
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    };

    if (!credentials.email || !credentials.password) {
      setMessage("Enter your email and password to continue.");
      return;
    }

    setMessage("Sign-in is not connected yet.");
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#173746] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
        <Link href="/" className="text-2xl font-extrabold">
          Startletes<span className="text-[#75d5b2]">.</span>
        </Link>
        <div className="relative z-10 max-w-lg pb-14">
          <p className="mb-5 text-sm font-semibold uppercase text-[#8edbc2]">
            The next great story starts here
          </p>
          <h1 className="text-5xl font-bold leading-[1.08] xl:text-6xl">
            Back the work behind every win.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-white/75">
            Find local talent, follow their progress, and help athletes reach their next milestone.
          </p>
        </div>
        <div aria-hidden="true" className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute -bottom-16 -right-8 h-64 w-64 rounded-full border border-[#75d5b2]/25" />
        <p className="text-sm text-white/55">Athletes grow stronger together.</p>
      </section>

      <section className="flex min-h-screen flex-col px-6 py-8 sm:px-12 lg:px-16 xl:px-24">
        <div className="mb-16 flex items-center justify-between lg:mb-0">
          <Link href="/" className="text-xl font-extrabold text-[#173746] lg:hidden">
            Startletes<span className="text-[#16866c]">.</span>
          </Link>
          <Link href="/" className="ml-auto text-sm font-semibold text-slate-600 transition hover:text-[#16866c]">
            Back to home
          </Link>
        </div>

        <div className="mx-auto my-auto w-full max-w-md pb-12">
          <p className="text-sm font-semibold uppercase text-[#16866c]">Welcome back</p>
          <h2 className="mt-3 text-4xl font-bold text-slate-900">Sign in to Startletes</h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Continue supporting the athletes and communities you care about.
          </p>

          <form className="mt-9 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-800">
                Email address
              </label>
              <input
                autoComplete="email"
                className="h-12 w-full rounded-md border border-slate-300 px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#16866c] focus:ring-2 focus:ring-[#16866c]/15"
                id="email"
                name="email"
                placeholder="you@example.com"
                type="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-800">
                Password
              </label>
              <input
                autoComplete="current-password"
                className="h-12 w-full rounded-md border border-slate-300 px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#16866c] focus:ring-2 focus:ring-[#16866c]/15"
                id="password"
                name="password"
                placeholder="Enter your password"
                type="password"
              />
            </div>
            <button
              className="h-12 w-full rounded-md bg-[#173746] px-5 text-base font-semibold text-white transition hover:bg-[#205263] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16866c]"
              type="submit"
            >
              Sign in
            </button>
            <p aria-live="polite" className="min-h-5 text-sm text-slate-600">
              {message}
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}