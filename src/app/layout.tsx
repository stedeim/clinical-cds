import type { Metadata } from "next";
import "./globals.css";
import { AuthNav } from "@/components/auth/AuthNav";

export const metadata: Metadata = {
  title: "Pabaid — Clinical Decision Support",
  description:
    "Encounter-native, explainable clinical decision support for independent clinicians.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
            <a href="/" className="font-semibold tracking-tight text-ink">
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
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
