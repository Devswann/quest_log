"use client";

import { ChangeEvent, useRef, useState } from "react";
import { decodeQuests, encodeQuests, localDate, mergeQuests, Quest } from "./quests";

function download(quests: Quest[]) {
  const url = URL.createObjectURL(new Blob([encodeQuests(quests)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `quest-log-${localDate()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function QuestBackup({ quests, loading, onImport, onAnnouncement }: {
  quests: Quest[]; loading: boolean; onImport: (quests: Quest[]) => void; onAnnouncement: (text: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const importButton = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState<Quest[] | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [replace, setReplace] = useState(false);
  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setReading(true); setError(""); setPending(null); setReplace(false);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("File is too large");
      setPending(decodeQuests(await file.text()));
    } catch { setError("Could not import this file. Choose a valid Quest Log JSON backup under 5 MB. Your journal has not changed."); }
    finally { setReading(false); }
  }
  const duplicateCount = pending?.filter(item => quests.some(quest => quest.id === item.id)).length ?? 0;
  return <section className="backup-tools" aria-label="Journal backup">
    <div className="backup-actions"><button disabled={loading} onClick={() => { download(quests); onAnnouncement("Backup download started, including archived quests."); }}>Export backup</button>
      <button ref={importButton} disabled={loading || reading} onClick={() => input.current?.click()}>{reading ? "Reading backup…" : "Import backup"}</button>
      <input className="visually-hidden" ref={input} type="file" tabIndex={-1} accept=".json,application/json" aria-label="Choose quest backup" onChange={readFile} />
    </div>
    {error && <p role="alert">{error}</p>}
    {pending !== null && <div className="import-preview" role="group" aria-label="Review backup import">
      <h2>Review import</h2><p>{pending.length} quests: {pending.filter(q => !q.isArchived && !q.isComplete).length} active, {pending.filter(q => !q.isArchived && q.isComplete).length} completed, {pending.filter(q => q.isArchived).length} archived.</p>
      <p>{duplicateCount} matching IDs. Merge keeps your existing quests and skips those matching IDs.</p>
      <label><input type="checkbox" checked={replace} onChange={event => setReplace(event.target.checked)} /> Replace my entire journal instead of merging</label>
      {replace && <p>This replaces all {quests.length} current quests. Export a backup first if you want to keep them.</p>}
      <div className="actions"><button className="red-button" onClick={() => {
        const imported = replace ? pending : mergeQuests(quests, pending);
        if (imported.length > 10000) { setError("The merged journal exceeds 10,000 quests. Choose a smaller backup or replace the journal."); return; }
        onImport(imported);
        onAnnouncement(replace ? "Journal replaced. Undo import is available until another import or a refresh." : `Imported ${pending.length - duplicateCount} quests; kept existing quests. Undo import is available.`);
        setPending(null); importButton.current?.focus();
      }}>Confirm {replace ? "replacement" : "merge"}</button><button onClick={() => { setPending(null); importButton.current?.focus(); }}>Cancel import</button></div>
    </div>}
  </section>;
}
