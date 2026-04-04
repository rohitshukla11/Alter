import { Suspense } from "react";
import { MarketplaceExplore } from "@/components/agents/MarketplaceExplore";

export const dynamic = "force-dynamic";

function AgentsFallback() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center font-mono text-[13px] text-tertiary">
      Loading…
    </div>
  );
}

/** Alias URL for Explore Agents (`/marketplace` and `/agents` share the same UI). */
export default function AgentsPage() {
  return (
    <Suspense fallback={<AgentsFallback />}>
      <MarketplaceExplore />
    </Suspense>
  );
}
