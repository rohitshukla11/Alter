"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { AgentConsole } from "@/components/agents/AgentConsole";

function InteractInner() {
  const params = useParams();
  const raw = typeof params.id === "string" ? params.id : "";
  const id = useMemo(() => decodeURIComponent(raw), [raw]);

  const fromPath = useMemo(() => {
    if (id.startsWith("ens:")) return id.slice(4);
    if (id.includes(".eth")) return id;
    return "";
  }, [id]);

  const [resolvedEns, setResolvedEns] = useState(fromPath);

  useEffect(() => {
    setResolvedEns(fromPath);
  }, [fromPath]);

  useEffect(() => {
    if (fromPath) return;
    if (!id) return;
    let cancelled = false;
    apiGet<{ agent: { ensFullName: string } }>(`/agents/${encodeURIComponent(id)}`)
      .then((r) => {
        if (!cancelled) setResolvedEns(r.agent.ensFullName);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id, fromPath]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center gap-3 font-mono text-[12px]">
        <Link href="/marketplace" className="text-tertiary no-underline hover:text-secondary">
          ← Explore
        </Link>
        <span className="text-tertiary">/</span>
        <Link
          href={`/agent/${encodeURIComponent(id)}`}
          className="text-tertiary no-underline hover:text-secondary"
        >
          Profile
        </Link>
      </div>
      <header className="shrink-0">
        <h1 className="font-display text-2xl font-extrabold leading-tight text-primary sm:text-3xl">
          Consultation
        </h1>
      </header>
      <div className="min-h-0 flex-1">
        <AgentConsole initialEns={resolvedEns} />
      </div>
    </div>
  );
}

export default function AgentInteractPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 flex-1 items-center justify-center font-mono text-[13px] text-tertiary">
          Loading…
        </div>
      }
    >
      <InteractInner />
    </Suspense>
  );
}
