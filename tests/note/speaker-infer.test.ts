import { describe, it, expect } from "vitest";
import { inferSpeaker } from "@/lib/note/speaker-infer";

// Content-based speaker inference: questions/instructions read as the
// clinician, first-person symptom language as the patient, and signal-free
// utterances alternate. The inference feeds an EDITABLE prefix — these tests
// pin the strong signals, not perfection.

describe("inferSpeaker — clinician signals", () => {
  it("questions are the doctor", () => {
    expect(inferSpeaker("Any chest pain or coughing up blood?", null)).toBe("DR");
    expect(inferSpeaker("How long has this been going on?", "PT")).toBe("DR");
    expect(inferSpeaker("Have you had a fever?", "PT")).toBe("DR");
  });

  it("plans and instructions are the doctor", () => {
    expect(inferSpeaker("Let's order a basic metabolic panel and recheck in two weeks", "PT")).toBe("DR");
    expect(inferSpeaker("I'll prescribe something for the cough", "PT")).toBe("DR");
    expect(inferSpeaker("Take one twice daily with food", "PT")).toBe("DR");
    expect(inferSpeaker("Take a deep breath for me", "PT")).toBe("DR");
  });
});

describe("inferSpeaker — patient signals", () => {
  it("first-person symptom reports are the patient", () => {
    expect(inferSpeaker("I've been coughing for about five days, mostly at night", null)).toBe("PT");
    expect(inferSpeaker("My knee hurts when I go up the stairs", "DR")).toBe("PT");
    expect(inferSpeaker("It hurts right here and the pain wakes me up", "DR")).toBe("PT");
  });

  it("worry language is the patient", () => {
    expect(inferSpeaker("I'm worried it could be something serious", "DR")).toBe("PT");
  });

  it("medication experience is the patient", () => {
    expect(inferSpeaker("I stopped taking the water pill because of the cramps", "DR")).toBe("PT");
  });
});

describe("inferSpeaker — alternation prior", () => {
  it("signal-free utterances alternate from the previous speaker", () => {
    expect(inferSpeaker("Yes, about three weeks", "DR")).toBe("PT");
    expect(inferSpeaker("Okay", "PT")).toBe("DR");
  });

  it("a signal-free opener defaults to the patient", () => {
    expect(inferSpeaker("Well, it started around Christmas", null)).toBe("PT");
  });
});
