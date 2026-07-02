import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getHandouts, parseConnectResponse, _resetHandoutCache } from "@/lib/medlineplus/handouts";

// MedlinePlus Connect handouts: coded problems in → vetted NIH education
// links out. Uncoded problems are skipped, failures are silent gaps, codes
// are deduped and cached.

const CONNECT_PAYLOAD = {
  feed: {
    entry: [
      {
        title: { _value: "High Blood Pressure" },
        link: [{ href: "https://medlineplus.gov/highbloodpressure.html" }],
      },
      { title: { _value: "Hypertension (genetics)" }, link: [{ href: "https://medlineplus.gov/genetics" }] },
    ],
  },
};

beforeEach(() => _resetHandoutCache());
afterEach(() => vi.unstubAllGlobals());

describe("parseConnectResponse", () => {
  it("takes the first entry's title and link", () => {
    expect(parseConnectResponse(CONNECT_PAYLOAD)).toEqual({
      title: "High Blood Pressure",
      url: "https://medlineplus.gov/highbloodpressure.html",
    });
  });

  it("returns null for empty or malformed feeds", () => {
    expect(parseConnectResponse({ feed: { entry: [] } })).toBeNull();
    expect(parseConnectResponse({})).toBeNull();
    expect(parseConnectResponse(null)).toBeNull();
  });
});

describe("getHandouts", () => {
  it("fetches handouts for coded problems only, deduped", async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true, json: async () => CONNECT_PAYLOAD }));
    vi.stubGlobal("fetch", fetchSpy);

    const handouts = await getHandouts([
      { label: "Essential hypertension", code: "I10" },
      { label: "Hypertensive urgency", code: "I10" }, // duplicate code
      { label: "Knee pain" }, // uncoded — skipped
    ]);

    expect(handouts).toHaveLength(1);
    expect(handouts[0]).toMatchObject({
      code: "I10",
      problemLabel: "Essential hypertension",
      title: "High Blood Pressure",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("silently yields a gap on API failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("down");
      }),
    );
    expect(await getHandouts([{ label: "HTN", code: "I10" }])).toEqual([]);
  });

  it("caches by code across calls", async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true, json: async () => CONNECT_PAYLOAD }));
    vi.stubGlobal("fetch", fetchSpy);
    await getHandouts([{ label: "HTN", code: "I10" }]);
    await getHandouts([{ label: "HTN again", code: "i10" }]); // case-insensitive
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
