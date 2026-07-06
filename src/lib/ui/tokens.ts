// Pabaid design tokens — single source of truth for the warm-paper visual
// system (Deimira's v2 design merged with the redesign mockups; her palette
// wins conflicts). Components import T instead of declaring local copies.
//
// Fonts are loaded globally in app/layout.tsx via next/font; the family
// strings here must match the CSS variables assigned there.

export const T = {
  // surfaces
  canvas: "#F1F0EB",
  card: "#ffffff",
  panelBg: "#FBFAF6",

  // text — muted/faint kept warm but dark enough to actually read
  // (the first cut of the redesign failed legibility here).
  ink: "#211f19",
  body: "#2c2a25",
  muted: "#6b665a",
  faint: "#948d7c",

  // borders
  line: "#E6E4DB", // card/control borders
  hairline: "#EEEDE6", // interior dividers

  // accent — deep green
  accent: "#4E6B57",
  accentInk: "#3c5646",
  accentBg: "#EEF2EE",
  accentBg2: "#F5F7F4",
  accentLine: "#CFDCD2",

  // inferred / caution — warm amber
  amberInk: "#6f5410",
  amberBg: "#F6EACB",
  amberLine: "#D9B85E",

  // alerts — warm red
  redInk: "#8f3325",
  redBg: "#FBEEEB",
  redLine: "#E7B8AC",

  // recording indicator — burnt orange
  rec: "#c1502a",
  recBg: "#F4EEE7",

  // exam-guard placeholder (dashed "left blank" box)
  guardInk: "#7a715a",
  guardBg: "#FCFAF3",
  guardLine: "#D6CFBE",

  // type
  serif: "var(--font-serif),'Newsreader',ui-serif,Georgia,serif",
  sans: "var(--font-sans),'Hanken Grotesk',system-ui,sans-serif",
  mono: "var(--font-mono),'IBM Plex Mono',ui-monospace,monospace",

  // elevation
  shadow: "0 6px 22px -14px rgba(50,42,26,.35)",
} as const;
