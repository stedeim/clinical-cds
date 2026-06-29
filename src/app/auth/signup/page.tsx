import { AuthForm } from "@/components/auth/AuthForm";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-sm space-y-6 rounded-lg border border-slate-200 bg-white p-6">
      <div>
        <h1 className="text-xl font-semibold">Create clinician account</h1>
        <p className="text-sm text-slate-600">Must be verified before CDS output is shown.</p>
      </div>
      <AuthForm mode="signup" />
      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <a href="/auth/login" className="text-clinical underline">
          Sign in
        </a>
      </p>
    </div>
  );
}
