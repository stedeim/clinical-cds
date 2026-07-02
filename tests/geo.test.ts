import { describe, it, expect } from "vitest";
import { detectFramework, frameworkForCountry, countryFromAcceptLanguage } from "@/lib/geo";

// Geo-detection picks only the DEFAULT framework — the clinician can always
// override manually. Priority: edge country header, then Accept-Language
// region, then the long-standing "US" default. Unknown countries map to WHO
// (the honest global baseline), never silently to US.

function h(entries: Record<string, string>): Headers {
  return new Headers(entries);
}

describe("frameworkForCountry", () => {
  it("maps every supported jurisdiction", () => {
    expect(frameworkForCountry("US")).toBe("US");
    expect(frameworkForCountry("GB")).toBe("UK_NICE");
    expect(frameworkForCountry("CA")).toBe("CA");
    expect(frameworkForCountry("AU")).toBe("AU");
    expect(frameworkForCountry("NZ")).toBe("NZ");
    expect(frameworkForCountry("IE")).toBe("IE");
    expect(frameworkForCountry("ca")).toBe("CA"); // case-insensitive
  });

  it("maps an unsupported country to WHO, and no/invalid input to null", () => {
    expect(frameworkForCountry("DE")).toBe("WHO");
    expect(frameworkForCountry("BR")).toBe("WHO");
    expect(frameworkForCountry(null)).toBeNull();
    expect(frameworkForCountry("")).toBeNull();
    expect(frameworkForCountry("USA")).toBeNull(); // not ISO-3166 alpha-2
  });
});

describe("countryFromAcceptLanguage", () => {
  it("extracts the first locale's region subtag", () => {
    expect(countryFromAcceptLanguage("en-AU,en;q=0.9")).toBe("AU");
    expect(countryFromAcceptLanguage("en-ca")).toBe("CA");
    expect(countryFromAcceptLanguage("fr-CA,fr;q=0.8,en;q=0.5")).toBe("CA");
  });

  it("returns null when there is no region subtag", () => {
    expect(countryFromAcceptLanguage("en")).toBeNull();
    expect(countryFromAcceptLanguage(null)).toBeNull();
    expect(countryFromAcceptLanguage("")).toBeNull();
  });
});

describe("detectFramework", () => {
  it("prefers the edge country header (Vercel)", () => {
    expect(detectFramework(h({ "x-vercel-ip-country": "AU", "accept-language": "en-US" }))).toBe("AU");
  });

  it("supports the Cloudflare header", () => {
    expect(detectFramework(h({ "cf-ipcountry": "NZ" }))).toBe("NZ");
  });

  it("falls back to Accept-Language region", () => {
    expect(detectFramework(h({ "accept-language": "en-CA,en;q=0.9" }))).toBe("CA");
  });

  it("maps an unknown country to WHO", () => {
    expect(detectFramework(h({ "x-vercel-ip-country": "JP" }))).toBe("WHO");
  });

  it("defaults to US with no signal at all", () => {
    expect(detectFramework(h({}))).toBe("US");
    expect(detectFramework(h({ "accept-language": "en" }))).toBe("US");
  });
});
