import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/server-user";
import { CaseIntakeForm } from "@/components/cases/CaseIntakeForm";

export default async function NewCasePage() {
  // Don't let an anonymous visitor fill a whole form only to bounce at
  // submit — send them to sign in first, and bring them back after.
  const user = await getServerUser();
  if (!user) redirect("/auth/login?next=/cases/new");
  return (
    <div className="mx-auto max-w-[720px]">
      <p className="mb-5 text-xs text-[#6b665a]">
        <a href="/" className="text-[#3c5646]">
          Your cases
        </a>{" "}
        / New case
      </p>
      <h1 className="font-serif text-[26px] font-semibold leading-tight tracking-tight text-ink">
        New case
      </h1>
      <p className="mb-[18px] mt-1 text-[14px] text-[#6b665a]">
        Three quick steps — everything else the encounter screen figures out on its own.
      </p>
      <CaseIntakeForm />
    </div>
  );
}
