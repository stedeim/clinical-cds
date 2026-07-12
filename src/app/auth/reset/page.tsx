import { RequestResetForm } from "@/components/auth/ResetForms";

export const metadata = { title: "Reset password — Pabaid" };

export default async function ResetRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const { err } = await searchParams;
  return (
    <div className="mx-auto max-w-sm space-y-5 px-6 py-14">
      <div className="space-y-6 rounded-2xl bg-white p-6 shadow-[0_6px_22px_-14px_rgba(50,42,26,.35)]">
        <div>
          <h1 className="font-serif text-xl font-semibold text-ink">Reset your password</h1>
          <p className="mt-1 text-sm text-[#6b665a]">
            We&rsquo;ll email you a one-time link. It expires after an hour.
          </p>
        </div>
        {err && (
          <p className="rounded-lg bg-[#FBEEEB] px-3 py-2 text-sm text-danger">
            That reset link was invalid or expired — request a fresh one below.
          </p>
        )}
        <RequestResetForm />
        <p className="text-center text-sm text-[#6b665a]">
          Remembered it?{" "}
          <a href="/auth/login" className="text-clinical underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
