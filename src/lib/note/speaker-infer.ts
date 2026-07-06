// Speaker inference for dictated utterances — no manual toggle needed.
//
// In a clinical encounter the language itself says who is talking:
//   clinician — questions ("Any chest pain?"), instructions ("Take one twice
//               daily"), plans ("Let's order a BMP", "I'll prescribe…")
//   patient   — first-person symptom reports ("I've had this cough…",
//               "my knee hurts"), worries, short answers to questions
// This is a deterministic heuristic over TEXT (the browser speech engine
// gives no voice identity); when no signal fires, turns alternate — the
// natural rhythm of an interview. Inference can be wrong, so the DR:/PT:
// prefixes it produces stay hand-editable in the transcript box, and the
// grounding pipeline believes the text, not the inference. True voice
// diarization arrives with a medical STT provider.

export type InferredSpeaker = "DR" | "PT";

// Clinician signals: interrogatives, exam/plan language, prescriber phrasing.
const CLINICIAN_PATTERNS: RegExp[] = [
  /\?\s*$/,
  /^(any|how|what|when|where|does|do you|did you|have you|are you|is there|can you|tell me|describe)\b/i,
  /\b(let's|let us|we'll|we will|i'll order|i'll prescribe|i'll refer|i'm going to (order|prescribe|refer|start))\b/i,
  /\b(i recommend|i suggest|i want you to|you should|make sure you|try taking|take (one|two|it|this))\b/i,
  /\b(follow[- ]?up|come back|schedule|recheck|we need to|on exam|sounds like|looks like)\b/i,
  /\b(deep breath|breathe in|say ah|lie back|sit up|roll up your sleeve)\b/i,
];

// Patient signals: first-person experience, symptoms, worry.
const PATIENT_PATTERNS: RegExp[] = [
  /\b(i've been|i've had|i have been|i keep|i noticed|i started|i can't|i cannot|i couldn't)\b/i,
  /\b(my (head|chest|back|knee|stomach|throat|arm|leg|hip|shoulder|neck|ear|eye|skin|heart|breathing))\b/i,
  /\b(it hurts|it aches|the pain|i feel|i felt|i'm feeling|makes me|wakes me|keeps me up)\b/i,
  /\b(i'm worried|i am worried|i'm scared|i'm afraid|worries me|scares me)\b/i,
  /\b(since (last|about|around)|for about|a few (days|weeks|months)|(days|weeks|months) ago)\b/i,
  /\b(i took|i've been taking|i stopped taking|i ran out)\b/i,
];

function score(text: string, patterns: RegExp[]): number {
  return patterns.reduce((n, p) => n + (p.test(text) ? 1 : 0), 0);
}

export function inferSpeaker(text: string, previous: InferredSpeaker | null): InferredSpeaker {
  const t = text.trim();
  const clinician = score(t, CLINICIAN_PATTERNS);
  const patient = score(t, PATIENT_PATTERNS);

  if (clinician > patient) return "DR";
  if (patient > clinician) return "PT";

  // No signal (or a tie): conversations alternate — an interview's natural
  // rhythm. First utterance with no signal defaults to the patient (visits
  // open with the complaint more often than not).
  if (previous === "DR") return "PT";
  if (previous === "PT") return "DR";
  return "PT";
}
