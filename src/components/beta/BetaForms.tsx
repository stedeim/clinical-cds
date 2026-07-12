"use client";

import { useState, FormEvent } from "react";

// Two client islands for the beta page: redeem a founding code (→ signup with
// the code prefilled) and join the waitlist (email capture).

export function ClaimSeatForm() {
  const [code, setCode] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const c = code.trim().toUpperCase();
        window.location.href = c ? `/auth/signup?code=${encodeURIComponent(c)}` : "/auth/signup";
      }}
      className="flex flex-col gap-2 sm:flex-row"
    >
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="PABAID-XXXXX"
        aria-label="Founding beta code"
        className="flex-1 rounded-[10px] border border-[#E6E4DB] bg-white px-4 py-3 font-mono text-[14px] uppercase tracking-wide text-ink outline-none focus:border-[#CFDCD2]"
      />
      <button
        type="submit"
        className="rounded-[10px] bg-clinical px-5 py-3 text-[14px] font-bold text-white shadow-[0_6px_16px_-8px_rgba(78,107,87,.55)]"
      >
        Claim my seat →
      </button>
    </form>
  );
}

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role: role || undefined }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Something went wrong — try again.");
      setLoading(false);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className="rounded-[12px] bg-[#EEF2EE] px-4 py-3 text-[14px] leading-relaxed text-[#3c5646]">
        You&rsquo;re on the list. When a founding seat opens or Pabaid goes wide, you&rsquo;ll be
        among the first we email — no spam in between.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@yourpractice.com"
        aria-label="Email"
        className="w-full rounded-[10px] border border-[#E6E4DB] bg-white px-4 py-3 text-[14px] text-ink outline-none focus:border-[#CFDCD2]"
      />
      <input
        value={role}
        onChange={(e) => setRole(e.target.value)}
        placeholder="Optional: specialty & region (e.g. Family medicine, Ontario)"
        aria-label="Specialty and region"
        className="w-full rounded-[10px] border border-[#E6E4DB] bg-white px-4 py-3 text-[14px] text-ink outline-none focus:border-[#CFDCD2]"
      />
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-[10px] border border-ink bg-white px-5 py-3 text-[14px] font-semibold text-ink disabled:opacity-50"
      >
        {loading ? "Adding you…" : "Join the waitlist"}
      </button>
    </form>
  );
}
