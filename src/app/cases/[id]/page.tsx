import { notFound, redirect } from "next/navigation";
import { getCase } from "@/lib/store";
import { getServerUser } from "@/lib/server-user";
import { SAMPLE_ENCOUNTER_ID } from "@/lib/sample-case";
import { EncounterView } from "@/components/encounter/EncounterView";

// Encounter-native view (Moat 2): the visit note and the Q&A live side by side,
// so the clinician never leaves the patient context to ask a question. Rendered
// in the synthesized design direction (see /design/best), fed by real case data.
export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getServerUser();
  const { id } = await params;
  // Real cases need a signed-in clinician (the sample id resolves for anyone).
  if (!user && id !== SAMPLE_ENCOUNTER_ID) redirect("/auth/login");
  const record = await getCase(id, user?.id);
  if (!record) notFound();

  return <EncounterView record={record} />;
}
