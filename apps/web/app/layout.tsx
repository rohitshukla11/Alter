import type { Metadata } from "next";
import { DM_Mono, Syne } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { AppFrame } from "@/components/shell/AppFrame";

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-mono",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
});

export const metadata: Metadata = {
  title: "Alter — AI advisors powered by real professionals",
  description:
    "Create your AI advisor, explore professionals on-chain, and consult with verifiable memory on 0G. OpenClaw, ENS, iNFT.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmMono.variable} ${syne.variable} h-[100dvh] overflow-hidden`}>
      <body
        className={`${dmMono.className} h-full max-h-[100dvh] overflow-hidden bg-[var(--bg-0)] font-mono text-[var(--text-0)] antialiased`}
      >
        <AppProviders>
          <AppFrame>{children}</AppFrame>
        </AppProviders>
      </body>
    </html>
  );
}
