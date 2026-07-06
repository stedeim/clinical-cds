import type { Metadata } from "next";
import { Newsreader, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthNav } from "@/components/auth/AuthNav";

const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif" });
const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Pabaid — Clinical Decision Support",
  description:
    "Encounter-native, explainable clinical decision support for independent clinicians.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <header className="border-b border-[#E6E4DB] bg-white/60">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-3">
            <a
              href="/"
              className="flex items-center gap-2 font-serif text-lg font-semibold tracking-tight text-ink"
            >
              <span
                aria-hidden
                className="inline-block h-[15px] w-[15px] rounded-full"
                style={{ background: "conic-gradient(#4E6B57 0 50%, #211f19 0 100%)" }}
              />
              Pabaid
            </a>
            <div className="flex items-center gap-4">
              <AuthNav />
              <span className="rounded-full bg-clinical/10 px-3 py-1 text-xs font-medium text-clinical">
                Decision support · not a diagnosis
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1280px] px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
