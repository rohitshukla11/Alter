import { Suspense } from "react";
import { MarketplaceExplore } from "@/components/agents/MarketplaceExplore";

export const dynamic = "force-dynamic";

function MarketplaceFallback() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center font-mono text-[13px] text-tertiary">
      Loading…
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<MarketplaceFallback />}>
      <MarketplaceExplore />
    </Suspense>
  );
}
