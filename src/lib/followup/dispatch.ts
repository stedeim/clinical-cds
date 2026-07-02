import type { FollowUp, FollowUpRecipientT } from "./schema";
import { setFollowUpStatus } from "./store";
import { recordAudit } from "../audit";

// Reminder dispatch seam.
//
// A ReminderChannel is the one interface a real messaging provider implements
// later (e.g. Twilio/SendGrid under a signed BAA, or an EHR portal message).
// Until then the stub channel is HONEST: it records an auditable dispatch
// event naming the recipients the clinician chose, marks the follow-up
// "sent", and its result says plainly that no real message left the system.
// It never fabricates delivery.
//
// Note what real sending additionally requires (all deliberately absent
// today): patient contact info + consent (patients are pseudonymized by
// design), an assistant contact on the clinician profile, and a BAA-covered
// provider. Adding those is a data-model + vendor decision, not a code seam.

export interface ReminderDispatch {
  followUp: FollowUp;
  recipients: FollowUpRecipientT[];
  channel: string; // e.g. "stub", "sms", "email"
  delivered: boolean; // stub: always false — nothing actually left
  detail: string;
}

export interface ReminderChannel {
  name: string;
  send(followUp: FollowUp): Promise<ReminderDispatch>;
}

export const stubChannel: ReminderChannel = {
  name: "stub",
  async send(followUp) {
    return {
      followUp,
      recipients: followUp.recipients,
      channel: "stub",
      delivered: false,
      detail:
        "Recorded for audit — no real message sent. Connect a BAA-covered " +
        "messaging provider to deliver reminders.",
    };
  },
};

// Dispatch one follow-up through the given channel (stub by default), write
// the audit row, and mark it sent. Returns the dispatch record for the UI.
export async function dispatchReminder(
  followUp: FollowUp,
  channel: ReminderChannel = stubChannel,
): Promise<ReminderDispatch> {
  const dispatch = await channel.send(followUp);
  await recordAudit({
    clinicianId: followUp.clinicianId,
    action: "reminder_send",
    encounterId: followUp.encounterId,
    detail: {
      followUpId: followUp.id,
      recipients: followUp.recipients,
      channel: dispatch.channel,
      delivered: dispatch.delivered,
    },
  });
  setFollowUpStatus(followUp.id, followUp.clinicianId, "sent");
  return dispatch;
}
