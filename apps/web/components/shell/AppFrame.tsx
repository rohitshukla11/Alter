"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/") {
    return <>{children}</>;
  }
  return (
    <div className="min-h-screen bg-void text-primary">
      <header className="border-b border-dim px-6 py-4 font-mono text-[12px]">
        <Link href="/" className="text-secondary no-underline transition-colors hover:text-primary">
          ← Onboarding
        </Link>
        <span className="mx-3 text-tertiary">/</span>
        <Link href="/marketplace" className="text-secondary no-underline transition-colors hover:text-primary">
          Marketplace
        </Link>
        <span className="mx-3 text-tertiary">/</span>
        <Link href="/console" className="text-secondary no-underline transition-colors hover:text-primary">
          Interaction
        </Link>
        <span className="mx-3 text-tertiary">/</span>
        <Link href="/chain" className="text-secondary no-underline transition-colors hover:text-primary">
          Chain
        </Link>
        <span className="mx-3 text-tertiary">/</span>
        <Link href="/verify" className="text-secondary no-underline transition-colors hover:text-primary">
          Verify
        </Link>
      </header>
      <div className="px-6 py-10">{children}</div>
    </div>
  );
}
