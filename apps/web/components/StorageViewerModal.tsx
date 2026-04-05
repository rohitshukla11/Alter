"use client";

export interface StorageViewerModalProps {
  rootHash: string;
  content: string | object | null;
  error: string | null;
  onClose: () => void;
  sizeBytes?: number | null;
  storageScanUrl?: string | null;
}

export function StorageViewerModal({
  rootHash,
  content,
  error,
  onClose,
  sizeBytes,
  storageScanUrl,
}: StorageViewerModalProps) {
  const titleShort = `${rootHash.slice(0, 8)}...${rootHash.slice(-4)}`;
  const hashPath = rootHash.startsWith("0x") ? rootHash : `0x${rootHash}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="storage-viewer-title"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="relative mt-10 max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-700">
          <div className="min-w-0">
            <h2 id="storage-viewer-title" className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">
              0G Storage · {titleShort}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] text-zinc-500">
              {storageScanUrl ? (
                <a
                  href={`${storageScanUrl.replace(/\/$/, "")}/submission/${hashPath}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-600 underline hover:no-underline dark:text-amber-400"
                  onClick={(e) => e.stopPropagation()}
                >
                  StorageScan ↗
                </a>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 font-mono text-lg leading-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="max-h-96 overflow-auto py-4">
          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : content !== null && typeof content === "object" ? (
            <pre className="whitespace-pre-wrap break-words font-mono text-xs text-zinc-800 dark:text-zinc-200">
              {JSON.stringify(content, null, 2)}
            </pre>
          ) : content !== null && typeof content === "string" ? (
            <pre className="whitespace-pre-wrap break-words font-mono text-xs text-zinc-800 dark:text-zinc-200">
              {content}
            </pre>
          ) : (
            <p className="text-sm text-zinc-500">No content.</p>
          )}
        </div>

        {sizeBytes != null && sizeBytes >= 0 ? (
          <p className="border-t border-zinc-200 pt-3 font-mono text-[10px] text-zinc-400 dark:border-zinc-700">
            Fetched from 0G Turbo · {sizeBytes} bytes
          </p>
        ) : null}
      </div>
    </div>
  );
}
