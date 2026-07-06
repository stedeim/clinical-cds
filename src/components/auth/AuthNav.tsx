"use client";

import { useEffect, useState } from "react";

type User = { id: string; email?: string } | null;

export function AuthNav() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/auth/login";
  }

  if (loading) return <span className="text-xs text-[#bcb7a9]">Loading…</span>;

  if (!user) {
    return (
      <a href="/auth/login" className="text-sm font-medium text-clinical">
        Sign in
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-[#8b8779]">{user.email}</span>
      <button onClick={logout} className="font-medium text-clinical hover:underline">
        Sign out
      </button>
    </div>
  );
}
