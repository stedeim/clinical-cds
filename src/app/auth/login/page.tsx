import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm space-y-5">
      <div className="space-y-6 rounded-2xl bg-white p-6 shadow-[0_6px_22px_-14px_rgba(50,42,26,.35)]">
        <div>
          <h1 className="font-serif text-xl font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-[#6b665a]">
            Notes that write themselves honestly, and a safety net that checks every dose.
          </p>
        </div>
        <AuthForm mode="login" />
        <p className="text-center text-sm text-[#6b665a]">
          Need an account?{" "}
          <a href="/auth/signup" className="text-clinical underline">
            Sign up
          </a>
        </p>
      </div>
      {/* Value before the wall: the full product on a synthetic patient. */}
      <a
        href="/sample"
        className="block rounded-2xl border border-[#CFDCD2] bg-[#EEF2EE] px-5 py-4 text-center text-sm font-semibold text-[#3c5646]"
      >
        New here? Explore a sample encounter — no account needed →
      </a>
    </div>
  );
}
