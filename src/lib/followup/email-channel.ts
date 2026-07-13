import type { ReminderChannel } from "./dispatch";

// Real reminder delivery via Paubox (HIPAA email — BAA included on every
// plan). Env-gated like every other provider in this app: without
// PAUBOX_API_KEY + PAUBOX_DOMAIN the stub channel keeps its honest
// audit-only behavior, so dev/CI/e2e are unchanged.
//
// Delivery reality: patient records are pseudonymous by design (no contact
// info stored) and assistant contacts don't exist on the clinician profile
// yet, so the only deliverable recipient today is the clinician themselves —
// their login email. The dispatch detail states exactly who was emailed and
// who couldn't be; it never claims delivery that didn't happen.

export function emailConfigured(): boolean {
  return Boolean(process.env.PAUBOX_API_KEY && process.env.PAUBOX_DOMAIN);
}

export function emailChannel(clinicianEmail: string): ReminderChannel {
  return {
    name: "email",
    async send(followUp) {
      const undeliverable = followUp.recipients.filter((r) => r !== "clinician");
      const base = {
        followUp,
        recipients: followUp.recipients,
        channel: "email",
      };
      const undeliverableNote = undeliverable.length
        ? ` ${undeliverable.join(" and ")} reminders can't be delivered yet — no contact on file (records are pseudonymous); recorded for audit.`
        : "";

      if (!followUp.recipients.includes("clinician")) {
        return {
          ...base,
          delivered: false,
          detail: `Recorded for audit — no message sent.${undeliverableNote}`,
        };
      }

      const dueDate = followUp.dueAt.slice(0, 10);
      const domain = process.env.PAUBOX_DOMAIN as string;
      try {
        const res = await fetch(`https://api.paubox.net/v1/${domain}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token token=${process.env.PAUBOX_API_KEY}`,
          },
          body: JSON.stringify({
            data: {
              message: {
                recipients: [clinicianEmail],
                headers: {
                  // Subject stays PHI-free — it can surface in lock-screen
                  // notifications outside the encrypted body.
                  subject: `Pabaid follow-up reminder — due ${dueDate}`,
                  from: process.env.PAUBOX_FROM ?? `reminders@${domain}`,
                },
                content: {
                  "text/plain":
                    `Follow-up due ${dueDate}:\n\n${followUp.action}\n\n` +
                    `Open the encounter to mark it complete:\n` +
                    `https://pabaid.com/cases/${followUp.encounterId}\n`,
                },
              },
            },
          }),
        });
        if (!res.ok) {
          console.error("[followup email] provider rejected", res.status, await res.text().catch(() => ""));
          return {
            ...base,
            delivered: false,
            detail: "The email provider rejected the message — recorded for audit only. Please retry.",
          };
        }
        return {
          ...base,
          delivered: true,
          detail: `Reminder emailed to ${clinicianEmail}.${undeliverableNote}`,
        };
      } catch (err) {
        console.error("[followup email] send failed", err);
        return {
          ...base,
          delivered: false,
          detail: "The email provider couldn't be reached — recorded for audit only. Please retry.",
        };
      }
    },
  };
}
