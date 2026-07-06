import type { MetadataRoute } from "next";

// PWA manifest — makes Pabaid installable to a phone home screen (the
// near-term mobile story). No service worker yet: offline behavior for a
// clinical tool needs deliberate design, not a cached-by-default app shell.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pabaid — Clinical Decision Support",
    short_name: "Pabaid",
    description:
      "Encounter-native, explainable clinical decision support for independent clinicians.",
    start_url: "/",
    display: "standalone",
    background_color: "#F1F0EB",
    theme_color: "#F1F0EB",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
