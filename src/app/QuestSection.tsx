"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { formatQuestDate, QuestCalendar, QuestDatePicker } from "./QuestCalendar";
import QuestIndex from "./QuestIndex";
import QuestBackup from "./QuestBackup";
import { completeQuest, decodeQuests, encodeQuests, filterQuests, INITIAL_FILTERS, localDate, Objective, Priority, Quest, QuestFilters, QuestIcon, QUEST_ICONS, Recurrence, starterQuests, STORAGE_KEY } from "./quests";

type Editor = { kind: "new" } | { kind: "edit"; quest: Quest };
type QuestFields = Pick<Quest, "questName" | "description" | "section" | "icon" | "objectives" | "dueDate" | "priority" | "recurrence">;

function createQuestId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") globalThis.crypto.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function QuestForm({ editor, onSave, onCancel }: { editor: Editor; onSave: (fields: QuestFields) => void; onCancel: () => void }) {
  const quest = editor.kind === "edit" ? editor.quest : undefined;
  const [error, setError] = useState("");
  const [objectives, setObjectives] = useState<Objective[]>(quest?.objectives ?? []);
  const [objectiveDescription, setObjectiveDescription] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(quest?.dueDate ?? null);
  const [icon, setIcon] = useState<QuestIcon>(quest?.icon ?? "⚔️");
  const [priority, setPriority] = useState<Priority>(quest?.priority ?? "normal");
  const [recurrence, setRecurrence] = useState<Recurrence>(quest?.recurrence ?? "none");
  function addObjective() {
    const description = objectiveDescription.trim();
    if (!description || objectives.length >= 50) return;
    setObjectives(current => [...current, { id: createQuestId(), description, isComplete: false }]);
    setObjectiveDescription("");
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const questName = String(data.get("questName") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    const section = String(data.get("section") ?? "").trim() || "Personal";
    if (!questName || !description) { setError("Enter a quest name and description. Spaces alone do not count."); return; }
    if (recurrence !== "none" && !dueDate) { setError("Choose a due date for a repeating quest."); return; }
    if (objectiveDescription.trim() && objectives.length >= 50) { setError("A quest can have at most 50 objectives."); return; }
    const savedObjectives = objectiveDescription.trim() ? [...objectives, { id: createQuestId(), description: objectiveDescription.trim(), isComplete: false }] : objectives;
    onSave({ questName, description, section, icon, objectives: savedObjectives, dueDate, priority, recurrence });
  }
  return <form onSubmit={submit} className="quest-form">
    <p className="eyebrow">Write your next chapter</p>
    <h2>{quest ? "Edit quest" : "A new adventure"}</h2>
    <label htmlFor="quest-name">Quest name <span>(required)</span></label>
    <input autoFocus id="quest-name" name="questName" required maxLength={100} defaultValue={quest?.questName} placeholder="What will you accomplish?" aria-describedby={error ? "form-error" : undefined} />
    <label htmlFor="quest-description">Description <span>(required)</span></label>
    <textarea id="quest-description" name="description" required maxLength={5000} rows={7} defaultValue={quest?.description} placeholder="Describe your goal and what it takes to complete it." aria-describedby={error ? "form-error" : undefined} />
    <label htmlFor="quest-section">Section <span>(optional)</span></label>
    <input id="quest-section" name="section" maxLength={50} defaultValue={quest?.section} placeholder="Personal" />
    <label htmlFor="quest-priority">Priority</label>
    <select id="quest-priority" value={priority} onChange={event => setPriority(event.target.value as Priority)}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select>
    <fieldset className="icon-picker">
      <legend>Quest icon <span>(choose one)</span></legend>
      <div role="group" aria-label="Quest icon">
        {QUEST_ICONS.map(option => <button key={option.value} type="button" className="icon-choice" aria-label={option.label} aria-pressed={icon === option.value} onClick={() => setIcon(option.value)}>{option.value}</button>)}
      </div>
    </fieldset>
    <fieldset className="objective-editor">
      <legend>Objectives <span>(optional)</span></legend>
      <label htmlFor="objective-description">New objective</label>
      <div className="objective-add"><input id="objective-description" value={objectiveDescription} maxLength={200} placeholder="Add an objective" onChange={event => setObjectiveDescription(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addObjective(); } }} /><button type="button" disabled={!objectiveDescription.trim() || objectives.length >= 50} onClick={addObjective}>Add</button></div>
      {objectives.length > 0 && <ul className="objective-editor-list">{objectives.map(objective => <li key={objective.id}><label><input type="checkbox" checked={objective.isComplete} onChange={() => setObjectives(current => current.map(item => item.id === objective.id ? { ...item, isComplete: !item.isComplete } : item))} /><span>{objective.description}</span></label><button type="button" className="quiet-button" onClick={() => setObjectives(current => current.filter(item => item.id !== objective.id))}>Remove</button></li>)}</ul>}
    </fieldset>
    <fieldset className="quest-date-editor"><legend>Quest date <span>(optional)</span></legend><QuestDatePicker value={dueDate} onChange={setDueDate} /></fieldset>
    <label htmlFor="quest-recurrence">Repeat</label>
    <select id="quest-recurrence" value={recurrence} onChange={event => setRecurrence(event.target.value as Recurrence)}><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select>
    <p className="form-help">Repeating quests require a date. Completing one keeps its history and creates one future quest with fresh objectives. Missed dates do not create a backlog.</p>
    {error && <p id="form-error" role="alert">{error}</p>}
    <div className="actions"><button className="red-button" type="submit">{quest ? "Save changes" : "Accept quest"}</button><button type="button" onClick={onCancel}>Cancel</button></div>
  </form>;
}

export default function QuestSection() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<QuestFilters>(INITIAL_FILTERS);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [storage, setStorage] = useState<"loading" | "ready" | "blocked">("loading");
  const [storageMessage, setStorageMessage] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [undoArchive, setUndoArchive] = useState<string | null>(null);
  const [undoImport, setUndoImport] = useState<Quest[] | null>(null);
  const [today, setToday] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const newButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const updateDay = () => setToday(localDate());
    updateDay();
    const timer = setInterval(updateDay, 30000);
    window.addEventListener("focus", updateDay);
    return () => { clearInterval(timer); window.removeEventListener("focus", updateDay); };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setQuests(saved === null ? starterQuests : decodeQuests(saved));
      setStorage("ready");
    } catch {
      setStorage("blocked");
      setStorageMessage("Saved quests could not be read. Existing storage has been left untouched. Changes in this session will not be saved. Check browser storage permissions or back up the stored data before resetting it.");
    }
  }, []);

  useEffect(() => {
    if (storage !== "ready") return;
    try { localStorage.setItem(STORAGE_KEY, encodeQuests(quests)); }
    catch { setStorage("blocked"); setStorageMessage("Your browser could not save these quests. Changes remain available in this session, but may be lost on refresh. Check browser storage permissions and available space."); }
  }, [quests, storage]);

  const completedCount = quests.filter(q => q.isComplete && !q.isArchived).length;
  const activeCount = quests.filter(q => !q.isComplete && !q.isArchived).length;
  const visibleQuests = filterQuests(quests, filters, today);
  const selected = visibleQuests.find(q => q.id === selectedId) ?? visibleQuests[0];
  const unfinishedObjectiveCount = selected?.objectives.filter(objective => !objective.isComplete).length ?? 0;

  function focusDetails() { requestAnimationFrame(() => detailHeading.current?.focus()); }
  function save(fields: QuestFields) {
    const existing = editor?.kind === "edit" ? editor.quest : undefined;
    const remainsComplete = Boolean(existing?.isComplete && fields.objectives.every(item => item.isComplete));
    const quest: Quest = existing ? { ...existing, ...fields, isComplete: remainsComplete } : { ...fields, id: createQuestId(), isComplete: false, isArchived: false, nextOccurrenceId: null };
    setQuests(prev => existing ? prev.map(q => q.id === quest.id ? quest : q) : [...prev, quest]);
    setFilters({ ...INITIAL_FILTERS, view: quest.isArchived ? "archived" : quest.isComplete ? "completed" : "active" }); setSelectedId(quest.id); setEditor(null);
    setAnnouncement(existing ? "Quest updated." : "Quest accepted."); focusDetails();
  }
  function changeFilters(next: QuestFilters) { setFilters(next); setSelectedId(null); setEditor(null); setCalendarOpen(false); }
  function selectCalendarQuest(quest: Quest) { setFilters({ ...INITIAL_FILTERS, view: quest.isComplete ? "completed" : "active" }); setSelectedId(quest.id); setEditor(null); setCalendarOpen(false); focusDetails(); }
  function toggleComplete(quest: Quest) {
    try {
      if (quest.isComplete) {
        setQuests(current => current.map(item => item.id === quest.id ? { ...item, isComplete: false } : item));
        setAnnouncement("Quest reopened. Find it in Active. Any existing next occurrence is kept.");
      } else {
        const updated = completeQuest(quests, quest.id, createQuestId(), today);
        if (updated === quests) return;
        setQuests(updated);
        setAnnouncement(updated.length > quests.length ? "Quest completed. A new recurring quest is ready in Active." : "Quest completed. Find it in Completed.");
      }
      focusDetails();
    } catch { setAnnouncement("Could not schedule the next occurrence. Choose an earlier date, then try again."); }
  }

  return <main id="main-content" className="app-shell">
    <section className="quest-window" aria-labelledby="log-title">
      <header className="window-header"><span className="book-emblem" aria-hidden="true">✦</span><div><p className="eyebrow">The adventurer’s journal</p><h1 id="log-title">Quest Log</h1></div><span className="edition">VOLUME I</span></header>
      <div className="toolbar"><p><strong>{activeCount}</strong> active <span aria-hidden="true">·</span> <strong>{completedCount}</strong> completed</p><div className="toolbar-actions"><button type="button" disabled={storage === "loading"} onClick={() => { setCalendarOpen(true); setEditor(null); }}>Calendar</button><button ref={newButton} className="red-button" disabled={storage === "loading"} onClick={() => { setEditor({ kind: "new" }); setCalendarOpen(false); }}>＋ New quest</button></div></div>
      <QuestBackup quests={quests} loading={storage === "loading"} onAnnouncement={setAnnouncement} onImport={imported => { setUndoImport(quests); setQuests(imported); setEditor(null); setCalendarOpen(false); setSelectedId(null); setFilters(INITIAL_FILTERS); setUndoArchive(null); }} />
      {undoImport && <div className="undo-notice"><p>Previous journal available until another import or refresh. Undo will replace the current journal, including edits made since import.</p><button onClick={() => { setQuests(undoImport); setUndoImport(null); setUndoArchive(null); setEditor(null); setCalendarOpen(false); setSelectedId(null); setAnnouncement("Import undone. Previous journal restored."); }}>Undo import</button><button onClick={() => setUndoImport(null)}>Dismiss</button></div>}
      {undoArchive && <div className="undo-notice"><p>Quest moved to Archive. Restore it any time from Archive.</p><button onClick={() => { setQuests(current => current.map(q => q.id === undoArchive ? { ...q, isArchived: false } : q)); setUndoArchive(null); setAnnouncement("Archive undone."); }}>Undo archive</button><button onClick={() => setUndoArchive(null)}>Dismiss</button></div>}
      {storageMessage && <p className="storage-warning" role="alert">{storageMessage}</p>}
      <div className="quest-layout">
        <QuestIndex quests={quests} filters={filters} today={today} loading={storage === "loading"} selectedId={!editor && !calendarOpen ? selected?.id : undefined} onFilters={changeFilters} onSelect={quest => { setSelectedId(quest.id); setEditor(null); setCalendarOpen(false); focusDetails(); }} />
        <section className="parchment" aria-label={calendarOpen ? "Quest calendar" : "Quest details"}>
          {calendarOpen ? <QuestCalendar quests={quests.filter(quest => !quest.isArchived)} onSelectQuest={selectCalendarQuest} onClose={() => { setCalendarOpen(false); if (selected) focusDetails(); else newButton.current?.focus(); }} /> : editor ? <QuestForm key={editor.kind === "edit" ? editor.quest.id : "new"} editor={editor} onSave={save} onCancel={() => { setEditor(null); if (selected) focusDetails(); else newButton.current?.focus(); }} /> : selected ? <>
            <p className="eyebrow">{selected.section} <span aria-hidden="true"> / </span> {selected.isArchived ? "Archived" : selected.isComplete ? "Completed" : "In progress"} · {selected.priority} priority</p>
            <h2 ref={detailHeading} tabIndex={-1}><span className="detail-icon" aria-hidden="true">{selected.icon}</span>{selected.questName}</h2>
            <div className="ornament" aria-hidden="true">◆</div>
            <h3>Description</h3><p className="description">{selected.description}</p>
            {selected.dueDate && <p className="quest-date"><span aria-hidden="true">◆</span> Quest date: <time dateTime={selected.dueDate}>{formatQuestDate(selected.dueDate)}</time></p>}
            {!selected.isComplete && !selected.isArchived && selected.dueDate && selected.dueDate < today && <p className="overdue-label">Overdue — this quest is still waiting for you.</p>}
            {selected.recurrence !== "none" && <p className="form-help">Repeats {selected.recurrence}.{selected.nextOccurrenceId ? " Its next occurrence has already been created." : " Completing this occurrence schedules the next one."}</p>}
            {selected.objectives.length > 0 && <section className="objectives" aria-labelledby="objectives-heading"><h3 id="objectives-heading">Objectives <span>{selected.objectives.filter(objective => objective.isComplete).length}/{selected.objectives.length}</span></h3><ul>{selected.objectives.map(objective => <li key={objective.id}><label><input type="checkbox" checked={objective.isComplete} disabled={selected.isArchived} onChange={() => { setQuests(current => current.map(quest => quest.id === selected.id ? { ...quest, isComplete: objective.isComplete ? false : quest.isComplete, objectives: quest.objectives.map(item => item.id === objective.id ? { ...item, isComplete: !item.isComplete } : item) } : quest)); setAnnouncement(objective.isComplete ? "Objective reopened; quest is active again." : "Objective completed."); }} /><span>{objective.description}</span></label></li>)}</ul></section>}
            <div className="reward"><h3>{selected.isComplete ? "Quest complete" : "Your reward"}</h3><p>{selected.isComplete ? "Another step forward. Take a moment to appreciate your progress." : "The satisfaction of a promise kept to yourself."}</p></div>
            {!selected.isComplete && unfinishedObjectiveCount > 0 && <p className="objective-requirement">Complete {unfinishedObjectiveCount} remaining objective{unfinishedObjectiveCount === 1 ? "" : "s"} to finish this quest.</p>}
            <div className="actions">{selected.isArchived ? <button className="red-button" onClick={() => { setQuests(current => current.map(q => q.id === selected.id ? { ...q, isArchived: false } : q)); setUndoArchive(null); setAnnouncement("Quest restored. Find it in Active or Completed."); newButton.current?.focus(); }}>Restore quest</button> : <><button className="red-button" disabled={!selected.isComplete && unfinishedObjectiveCount > 0} onClick={() => toggleComplete(selected)}>{selected.isComplete ? "Reopen quest" : "Complete quest"}</button><button onClick={() => setEditor({ kind: "edit", quest: selected })}>Edit</button><button className="quiet-button" onClick={() => { setQuests(current => current.map(q => q.id === selected.id ? { ...q, isArchived: true } : q)); setUndoArchive(selected.id); setAnnouncement("Quest archived. Undo or restore it from Archive."); newButton.current?.focus(); }}>Archive quest</button></>}</div>
          </> : <div className="empty-detail"><span aria-hidden="true">✦</span><p className="eyebrow">The next chapter is yours</p><h2 ref={detailHeading} tabIndex={-1}>{storage === "loading" ? "Opening your journal" : "No matching quests"}</h2><p>Choose another view, reset your filters, or start a new adventure.</p>{storage !== "loading" && <button className="red-button" onClick={() => setEditor({ kind: "new" })}>Create a quest</button>}</div>}
        </section>
      </div>
      <footer className="window-footer"><span>{storage === "ready" ? "● Saved in this browser" : storage === "loading" ? "Loading local quests" : "○ Session only — saving unavailable"}</span></footer>
    </section>
    <p role="status" className="announcement">{announcement}</p>
    <p className="page-note">Your journal stays on this device and browser. Clearing site data clears your quests.</p>
  </main>;
}
