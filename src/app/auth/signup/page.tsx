import { AuthForm } from "@/components/auth/AuthForm";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-sm space-y-5">
      <div className="space-y-6 rounded-2xl bg-white p-6 shadow-[0_6px_22px_-14px_rgba(50,42,26,.35)]">
        <div>
          <h1 className="font-serif text-xl font-semibold text-ink">Create clinician account</h1>
          <p className="mt-1 text-sm text-[#6b665a]">
            Verification against the NPPES registry unlocks CDS output — usually instant with
            an NPI.
          </p>
        </div>
        <AuthForm mode="signup" />
        <p className="text-center text-sm text-[#6b665a]">
          Already have an account?{" "}
          <a href="/auth/login" className="text-clinical underline">
            Sign in
          </a>
        </p>
      </div>
      <a
        href="/sample"
        className="block rounded-2xl border border-[#CFDCD2] bg-[#EEF2EE] px-5 py-4 text-center text-sm font-semibold text-[#3c5646]"
      >
        Not sure yet? Explore a sample encounter first — no account needed →
      </a>
    </div>
  );
}
