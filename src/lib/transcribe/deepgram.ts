import { inferSpeaker, type InferredSpeaker } from "@/lib/note/speaker-infer";

// Deepgram medical transcription (nova-3-medical) with diarization.
//
// Identity assignment: diarization clusters WHO spoke (speaker 0, 1, …) but
// not which one is the clinician. We reuse the deterministic text heuristic
// (speaker-infer) as a VOTE across each diarized cluster — every utterance a
// voice produced gets scored, and the cluster's majority label (DR/PT) names
// it. Clustering from audio + identity from language beats either alone.
//
// Graceful degradation: no DEEPGRAM_API_KEY → the dictation UI falls back to
// the browser speech engine, exactly as before this integration existed.

export function isDeepgramConfigured(): boolean {
  return !!process.env.DEEPGRAM_API_KEY;
}

export interface DeepgramUtterance {
  speaker: number;
  transcript: string;
}

// Map diarized utterances to "DR:"/"PT:" transcript lines.
export function utterancesToLines(utterances: DeepgramUtterance[]): string[] {
  if (utterances.length === 0) return [];

  // Vote per speaker cluster using the text heuristic. Alternation context is
  // deliberately not fed in here — votes must be independent of line order.
  const votes = new Map<number, { dr: number; pt: number }>();
  for (const u of utterances) {
    const v = votes.get(u.speaker) ?? { dr: 0, pt: 0 };
    // Split multi-sentence utterances so each sentence votes once.
    for (const sentence of u.transcript.split(/(?<=[.?!])\s+/).filter(Boolean)) {
      const label = inferSpeaker(sentence, null);
      if (label === "DR") v.dr += 1;
      else v.pt += 1;
    }
    votes.set(u.speaker, v);
  }

  // Resolve each cluster; break ties toward the majority label of the OTHER
  // cluster's complement so two clusters don't both become DR in a 2-speaker
  // conversation. With >2 speakers (rare), each cluster resolves alone.
  const speakers = [...votes.keys()];
  const labels = new Map<number, InferredSpeaker>();
  for (const s of speakers) {
    const v = votes.get(s)!;
    labels.set(s, v.dr >= v.pt ? "DR" : "PT");
  }
  if (speakers.length === 2) {
    const [a, b] = speakers;
    if (labels.get(a) === labels.get(b)) {
      const va = votes.get(a)!;
      const vb = votes.get(b)!;
      // The cluster with the stronger clinician signal keeps DR.
      const aScore = va.dr - va.pt;
      const bScore = vb.dr - vb.pt;
      if (labels.get(a) === "DR") {
        labels.set(aScore >= bScore ? b : a, "PT");
      } else {
        labels.set(aScore >= bScore ? a : b, "DR");
      }
    }
  }

  return utterances.map((u) => `${labels.get(u.speaker)}: ${u.transcript.trim()}`);
}

// Send audio to Deepgram and return DR:/PT: transcript lines. Throws on any
// provider failure — the route degrades to an honest error and the client
// keeps its browser-speech fallback.
export async function transcribeAudio(audio: ArrayBuffer, mimeType: string): Promise<string[]> {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error("Deepgram is not configured.");

  const params = new URLSearchParams({
    model: "nova-3-medical",
    diarize: "true",
    punctuate: "true",
    smart_format: "true",
    utterances: "true",
  });

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: { Authorization: `Token ${key}`, "Content-Type": mimeType },
    body: audio,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Deepgram error ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    results?: { utterances?: Array<{ speaker: number; transcript: string }> };
  };
  const utterances = (data.results?.utterances ?? []).filter((u) => u.transcript?.trim());
  return utterancesToLines(utterances);
}
