import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/server-user";
import { CompleteResetForm } from "@/components/auth/ResetForms";

export const metadata = { title: "Set new password — Pabaid" };

export default async function ResetSetPage() {
  // Only reachable with the session the recovery link established.
  const user = await getServerUser();
  if (!user) redirect("/auth/reset?err=1");

  return (
    <div className="mx-auto max-w-sm space-y-5 px-6 py-14">
      <div className="space-y-6 rounded-2xl bg-white p-6 shadow-[0_6px_22px_-14px_rgba(50,42,26,.35)]">
        <div>
          <h1 className="font-serif text-xl font-semibold text-ink">Choose a new password</h1>
          <p className="mt-1 text-sm text-[#6b665a]">You&rsquo;ll be signed in right after.</p>
        </div>
        <CompleteResetForm />
      </div>
    </div>
  );
}
