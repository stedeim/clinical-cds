import { CaseIntakeForm } from "@/components/cases/CaseIntakeForm";

export default function NewCasePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">New case</h1>
      <CaseIntakeForm />
    </div>
  );
}
