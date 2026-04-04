"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiBase, apiPostFormData } from "@/lib/api";
import { getStoredToken } from "@/lib/session";
import type { TrainingDocument } from "@/lib/agentTypes";
import { shortenRoot } from "@/lib/formatRoot";

type Props = {
  agentId: string;
  agentName: string;
  onUploadComplete?: (doc: TrainingDocument) => void;
};

function mimeBadge(mime: string): { label: string; className: string } {
  if (mime === "application/pdf") return { label: "PDF", className: "bg-red-500/20 text-red-300 border-red-500/35" };
  if (mime === "text/plain") return { label: "TXT", className: "bg-sky-500/15 text-sky-200 border-sky-500/30" };
  if (mime === "text/markdown") return { label: "MD", className: "bg-violet-500/15 text-violet-200 border-violet-500/30" };
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return { label: "DOCX", className: "bg-blue-500/15 text-blue-200 border-blue-500/30" };
  }
  return { label: "FILE", className: "bg-white/10 text-secondary border-mid" };
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function relTime(ts: number | null | undefined): string {
  if (!ts) return "—";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function TrainingDataUploader({ agentId, agentName, onUploadComplete }: Props) {
  const [docs, setDocs] = useState<TrainingDocument[]>([]);
  const [manifestRoot, setManifestRoot] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const enc = encodeURIComponent(agentId);
    const r = await fetch(`${apiBase}/agents/${enc}/training`, { cache: "no-store" });
    if (!r.ok) return;
    const j = (await r.json()) as {
      docs: TrainingDocument[];
      trainingRoot?: string;
      updatedAt?: number;
    };
    setDocs(j.docs ?? []);
    setManifestRoot(j.trainingRoot ?? null);
    setUpdatedAt(j.updatedAt ?? null);
  }, [agentId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  async function uploadDoc(file: File, desc: string) {
    const jwt = getStoredToken();
    if (!jwt) {
      setUploadError("Sign in with World ID (onboarding) to upload training documents.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    const form = new FormData();
    form.append("file", file);
    if (desc.trim()) form.append("description", desc.trim());
    try {
      const res = await apiPostFormData<{ doc: TrainingDocument; manifestRoot?: string; docCount?: number }>(
        `/agents/${encodeURIComponent(agentId)}/training`,
        form,
        jwt
      );
      onUploadComplete?.(res.doc);
      setToast(`Uploaded · hash ${shortenRoot(res.doc.hash, 4, 4)}`);
      setPendingFile(null);
      setDescription("");
      await load();
      if (res.manifestRoot) setManifestRoot(res.manifestRoot);
    } catch (e) {
      setUploadError(String(e));
    } finally {
      setUploading(false);
    }
  }

  async function removeDoc(docId: string) {
    const jwt = getStoredToken();
    if (!jwt) return;
    await fetch(`${apiBase}/agents/${encodeURIComponent(agentId)}/training/${encodeURIComponent(docId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${jwt}` },
    });
    setConfirmDeleteId(null);
    await load();
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setPendingFile(f);
  }

  return (
    <section className="rounded-ui border border-dim bg-raised p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-tertiary">Training corpus</p>
        <span className="rounded-full border border-mid px-2 py-0.5 font-mono text-[10px] text-secondary">
          {docs.length} doc{docs.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="mt-1 font-mono text-[12px] text-secondary">
        Upload verifiable documents for <span className="text-primary">{agentName}</span>. Each file is stored on 0G with a
        content root; the manifest updates automatically.
      </p>

      <div
        className="mt-5 rounded-ui border border-dashed border-mid px-4 py-8 text-center transition-colors hover:border-strong"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,.docx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setPendingFile(f);
          }}
        />
        <p className="font-mono text-[13px] text-primary">Drop training documents here</p>
        <p className="mt-1 font-mono text-[11px] text-tertiary">PDF, TXT, MD, DOCX · Max 10MB</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 rounded-control border border-mid px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-secondary hover:border-accent hover:text-primary"
        >
          Browse files
        </button>
      </div>

      {pendingFile ? (
        <div className="mt-4 rounded-control border border-mid bg-black/30 p-4">
          <p className="font-mono text-[11px] text-secondary">Selected: {pendingFile.name}</p>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. SEC Howey Test analysis 2024"
            className="mt-2 h-9 w-full rounded-control border border-dim bg-black/40 px-3 font-mono text-[12px] text-primary placeholder:text-tertiary focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => uploadDoc(pendingFile, description)}
            className="mt-3 h-9 w-full rounded-control bg-accent font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-void hover:bg-[#F0FF70] disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload to 0G"}
          </button>
        </div>
      ) : null}

      {uploading ? (
        <p className="mt-3 font-mono text-[11px] text-pending">Uploading to 0G Storage… Writing blob · generating root hash…</p>
      ) : null}
      {uploadError ? <p className="mt-2 font-mono text-[11px] text-error">{uploadError}</p> : null}
      {toast ? <p className="mt-2 font-mono text-[11px] text-success">{toast}</p> : null}

      <ul className="mt-6 space-y-2">
        {docs.map((d) => (
          <li
            key={d.id}
            className="group flex flex-wrap items-center gap-2 rounded-control border border-dim bg-black/25 px-3 py-2 font-mono text-[11px]"
          >
            <span className={`rounded border px-1.5 py-0.5 text-[9px] uppercase ${mimeBadge(d.mimeType).className}`}>
              {mimeBadge(d.mimeType).label}
            </span>
            <span className="text-primary">{d.filename}</span>
            <span className="text-tertiary">{formatBytes(d.sizeBytes)}</span>
            <button
              type="button"
              title="Copy hash"
              onClick={() => navigator.clipboard.writeText(d.hash)}
              className="break-all text-tertiary hover:text-accent"
            >
              {shortenRoot(d.hash, 6, 4)}
            </button>
            <span className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {confirmDeleteId === d.id ? (
                <>
                  <span className="text-tertiary">Remove?</span>
                  <button type="button" className="text-tertiary hover:text-primary" onClick={() => setConfirmDeleteId(null)}>
                    Cancel
                  </button>
                  <button type="button" className="text-error hover:underline" onClick={() => removeDoc(d.id)}>
                    Remove
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="text-tertiary hover:text-error"
                  aria-label="Delete document"
                  onClick={() => setConfirmDeleteId(d.id)}
                >
                  ×
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 border-t border-dim pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-tertiary">Manifest root</p>
        {manifestRoot ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="break-all text-[11px] text-secondary">{manifestRoot}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(manifestRoot)}
              className="shrink-0 rounded border border-mid px-2 py-0.5 text-[10px] text-tertiary hover:text-primary"
            >
              Copy
            </button>
          </div>
        ) : (
          <p className="mt-2 font-mono text-[11px] text-tertiary">No manifest yet — upload a document.</p>
        )}
        <p className="mt-2 font-mono text-[10px] text-tertiary">Updated: {relTime(updatedAt)}</p>
      </div>
    </section>
  );
}
