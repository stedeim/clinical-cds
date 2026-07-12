"use client";

import { useState } from "react";

// Client island for billing actions: start a checkout for a plan, or open
// the Stripe portal. Both endpoints return a URL we hand the browser to.

export function StartTrialButton({
  plan,
  label,
  dark,
  interval = "month",
}: {
  plan: "solo" | "clinic";
  label: string;
  dark?: boolean;
  interval?: "month" | "year";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Could not start checkout.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={go}
        disabled={busy}
        className={
          dark
            ? "w-full rounded-[11px] bg-[#F5F4EF] px-5 py-3 text-[14.5px] font-semibold text-ink disabled:opacity-50"
            : "w-full rounded-[11px] border border-ink bg-white px-5 py-3 text-[14.5px] font-semibold text-ink disabled:opacity-50"
        }
      >
        {busy ? "Opening secure checkout…" : label}
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}

export function ManageBillingButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Could not open the portal.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the portal.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={go}
        disabled={busy}
        className="rounded-[10px] border border-[#E6E4DB] bg-white px-4 py-[10px] text-[13.5px] font-semibold text-[#5c574a] disabled:opacity-50"
      >
        {busy ? "Opening…" : "Manage billing"}
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
