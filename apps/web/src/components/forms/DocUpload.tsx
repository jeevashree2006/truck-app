import { useState } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { fileToDataUrl, isImageUrl } from "@/lib/files";

/** Upload 1–2 pages (image or PDF) for a document. Stores data URLs. */
export function DocUpload({
  urls,
  onChange,
  max = 2,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, max - urls.length);
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    try {
      const added = await Promise.all(files.map((f) => fileToDataUrl(f)));
      onChange([...urls, ...added].slice(0, max));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {urls.map((u, i) => (
        <div key={i} className="group relative">
          <a
            href={u}
            target="_blank"
            rel="noreferrer"
            className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-ink-600 dark:bg-ink-800"
            title={`Page ${i + 1} — tap to view`}
          >
            {isImageUrl(u) ? (
              <img src={u} alt={`page ${i + 1}`} className="h-full w-full object-cover" />
            ) : (
              <FileText size={20} className="text-brand-600" />
            )}
          </a>
          <button
            type="button"
            onClick={() => onChange(urls.filter((_, idx) => idx !== i))}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-status-expired text-white shadow"
            aria-label="Remove page"
          >
            <X size={12} strokeWidth={3} />
          </button>
        </div>
      ))}

      {urls.length < max && (
        <label className="flex h-14 cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-200 px-3 text-xs font-semibold text-slate-500 transition hover:border-brand-300 hover:text-brand-600 dark:border-ink-600">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {urls.length === 0 ? "Upload document" : "Add page"}
          <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={onPick} disabled={busy} />
        </label>
      )}
    </div>
  );
}
