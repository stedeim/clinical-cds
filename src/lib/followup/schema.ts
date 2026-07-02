import { z } from "zod";

// Follow-up reminders contract.
//
// A follow-up is a patient-action-and-report-back item ("recheck K⁺/Cr in
// 2 weeks") tied to an encounter. The CLINICIAN chooses who gets reminded —
// patient, themselves, their assistant, or any combination — so recipient
// routing is data the doctor controls, not an app default.
//
// Sending honesty: in stub mode (and until a BAA-covered messaging provider is
// wired) "sending" records an auditable dispatch event and marks the follow-up
// sent — it never pretends a real SMS/email went out. The dispatch seam in
// dispatch.ts is where a real provider plugs in later.

export const FollowUpRecipient = z.enum(["patient", "clinician", "assistant"]);

export const FollowUpStatus = z.enum(["pending", "sent", "completed", "cancelled"]);

export const FollowUpCreate = z.object({
  encounterId: z.string().min(1),
  // What the patient (or office) needs to do, in the clinician's words.
  action: z.string().min(3).max(300),
  // Due date, ISO (date or datetime).
  dueAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "invalid date"),
  // Who gets the reminder — the doctor's choice, at least one.
  recipients: z.array(FollowUpRecipient).min(1),
});

export interface FollowUp {
  id: string;
  encounterId: string;
  clinicianId: string;
  action: string;
  dueAt: string;
  recipients: FollowUpRecipientT[];
  status: FollowUpStatusT;
  createdAt: string;
}

export type FollowUpRecipientT = z.infer<typeof FollowUpRecipient>;
export type FollowUpStatusT = z.infer<typeof FollowUpStatus>;
export type FollowUpCreateT = z.infer<typeof FollowUpCreate>;
