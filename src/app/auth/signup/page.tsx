import { AuthForm } from "@/components/auth/AuthForm";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-sm space-y-6 rounded-lg border border-[#E6E4DB] bg-white p-6">
      <div>
        <h1 className="text-xl font-semibold">Create clinician account</h1>
        <p className="text-sm text-[#6b665a]">Must be verified before CDS output is shown.</p>
      </div>
      <AuthForm mode="signup" />
      <p className="text-center text-sm text-[#6b665a]">
        Already have an account?{" "}
        <a href="/auth/login" className="text-clinical underline">
          Sign in
        </a>
      </p>
    </div>
  );
}
