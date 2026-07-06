import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm space-y-6 rounded-lg border border-[#E6E4DB] bg-white p-6">
      <div>
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-[#8b8779]">Clinician access only.</p>
      </div>
      <AuthForm mode="login" />
      <p className="text-center text-sm text-[#8b8779]">
        Need an account?{" "}
        <a href="/auth/signup" className="text-clinical underline">
          Sign up
        </a>
      </p>
    </div>
  );
}
