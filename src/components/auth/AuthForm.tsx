"use client";

import { useState, FormEvent } from "react";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [credential, setCredential] = useState("MD");
  const [npi, setNpi] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        fullName,
        credential,
        ...(mode === "signup" && npi.trim() ? { npi: npi.trim() } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Request failed.");
      setLoading(false);
      return;
    }

    if (mode === "login") {
      setMessage("Signed in.");
      window.location.href = "/";
      return;
    }

    // Signup: surface the verification outcome honestly before redirecting —
    // an instantly verified clinician should know it, and a pending one
    // should know why.
    if (data.verification?.status === "verified") {
      setMessage("Account created — verified against the NPPES registry. Redirecting…");
    } else {
      setMessage(`Account created. ${data.verification?.reason ?? "Verification pending."} Redirecting…`);
    }
    setTimeout(() => {
      window.location.href = "/";
    }, 2500);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === "signup" && (
        <>
          <Field label="Full name" value={fullName} onChange={setFullName} required />
          <Field label="Credential" value={credential} onChange={setCredential} required />
          <div>
            <Field label="NPI (US clinicians — optional)" value={npi} onChange={setNpi} />
            <p className="mt-1 text-xs text-slate-500">
              10-digit NPI enables instant verification against the public NPPES registry. Without one
              (or outside the US), your account is verified by manual review.
            </p>
          </div>
        </>
      )}
      <Field label="Email" type="email" value={email} onChange={setEmail} required />
      <Field label="Password" type="password" value={password} onChange={setPassword} required />

      {error && <p className="text-sm text-danger">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-clinical px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-clinical focus:outline-none"
      />
    </div>
  );
}
