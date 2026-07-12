"use client";

import { useState, FormEvent } from "react";

// Client islands for the two password-reset steps.

export function RequestResetForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/reset-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong — try again.");
      setLoading(false);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className="text-sm leading-relaxed text-[#3c5646]">
        If an account exists for <b className="font-semibold">{email}</b>, a reset link is on
        its way. Check your inbox (and spam) — the link works once and expires after an hour.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-[#E6E4DB] px-3 py-2 text-sm focus:border-clinical focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-clinical px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        {loading ? "Sending…" : "Email me a reset link"}
      </button>
    </form>
  );
}

export function CompleteResetForm() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/reset-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not set the new password.");
      setLoading(false);
      return;
    }
    setDone(true);
    setTimeout(() => (window.location.href = "/"), 1500);
  }

  if (done) {
    return <p className="text-sm text-[#3c5646]">Password updated — taking you to your cases…</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink">New password</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-[#E6E4DB] px-3 py-2 text-sm focus:border-clinical focus:outline-none"
        />
        <p className="mt-1 text-xs text-[#6b665a]">At least 8 characters.</p>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-clinical px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        {loading ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
