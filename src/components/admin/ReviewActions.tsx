"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Approve / reject buttons for one pending clinician in the review queue.

export function ReviewActions({ clinicianId }: { clinicianId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "verified" | "rejected") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clinicianId, decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => decide("verified")}
        disabled={busy}
        className="rounded-[8px] bg-clinical px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-40"
      >
        Approve
      </button>
      <button
        onClick={() => decide("rejected")}
        disabled={busy}
        className="rounded-[8px] border border-[#E7B8AC] px-3 py-1.5 text-[12.5px] font-semibold text-danger disabled:opacity-40"
      >
        Reject
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
