import { filterQuests, matchesView, objectiveProgress, Quest, QuestFilters, QUEST_ICONS, QuestView } from "./quests";

const views: { value: QuestView; label: string }[] = [
  { value: "active", label: "Active" }, { value: "completed", label: "Completed" },
  { value: "today", label: "Today" }, { value: "upcoming", label: "Upcoming" },
  { value: "overdue", label: "Overdue" }, { value: "archived", label: "Archive" },
];

export default function QuestIndex({ quests, filters, today, selectedId, loading, onFilters, onSelect }: {
  quests: Quest[]; filters: QuestFilters; today: string; selectedId?: string; loading: boolean;
  onFilters: (filters: QuestFilters) => void; onSelect: (quest: Quest) => void;
}) {
  const visible = filterQuests(quests, filters, today);
  const sections = Array.from(new Set(quests.map(quest => quest.section))).sort();
  const groups = Array.from(new Set(visible.map(quest => quest.section)));
  return <aside className="quest-index" aria-label="Quest index">
    <div className="filters view-filters" aria-label="Quest views">
      {views.map(view => <button key={view.value} aria-pressed={filters.view === view.value} onClick={() => onFilters({ ...filters, view: view.value })}>
        {view.label} <span>{quests.filter(quest => matchesView(quest, view.value, today)).length}</span>
      </button>)}
    </div>
    <div className="search-tools">
      <label htmlFor="quest-search">Search quests</label>
      <input id="quest-search" type="search" value={filters.search} placeholder="Name, description, or objective" onChange={event => onFilters({ ...filters, search: event.target.value })} />
      <div className="filter-selects">
        <label>Section<select value={filters.section} onChange={event => onFilters({ ...filters, section: event.target.value })}><option value="">All sections</option>{sections.map(section => <option key={section}>{section}</option>)}</select></label>
        <label>Icon<select value={filters.icon} onChange={event => onFilters({ ...filters, icon: event.target.value })}><option value="">All icons</option>{QUEST_ICONS.map(icon => <option key={icon.value} value={icon.value}>{icon.value} {icon.label}</option>)}</select></label>
        <label>Priority<select value={filters.priority} onChange={event => onFilters({ ...filters, priority: event.target.value })}><option value="">All priorities</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></label>
        <label>Sort by<select value={filters.sort} onChange={event => onFilters({ ...filters, sort: event.target.value as QuestFilters["sort"] })}><option value="manual">Added order</option><option value="date">Due date</option><option value="priority">Priority</option><option value="name">Name</option></select></label>
      </div>
      <button className="reset-filters" onClick={() => onFilters({ ...filters, search: "", section: "", icon: "", priority: "", sort: "manual" })}>Reset search &amp; filters</button>
      <p className="result-count" role="status">{visible.length} matching quest{visible.length === 1 ? "" : "s"}</p>
    </div>
    <div className="quest-groups">
      {loading ? <p role="status">Opening your journal…</p> : groups.length ? groups.map(section => <section className="quest-group" key={section}>
        <h2><span aria-hidden="true">◆</span> {section}</h2>
        <ul>{visible.filter(quest => quest.section === section).map(quest => {
          const progress = objectiveProgress(quest);
          const overdue = !quest.isComplete && !quest.isArchived && quest.dueDate && quest.dueDate < today;
          return <li key={quest.id}><button className="quest-item" aria-current={selectedId === quest.id ? "true" : undefined} onClick={() => onSelect(quest)}>
            <span className="quest-icon" aria-hidden="true">{quest.icon}</span>
            <span className="quest-row-content"><span>{quest.questName}</span>
              <span className="quest-row-meta">{quest.priority} priority{quest.dueDate ? ` · ${overdue ? "Overdue: " : "Due: "}${quest.dueDate}` : ""}{quest.recurrence !== "none" ? ` · ${quest.recurrence}` : ""}</span>
              {progress.total > 0 && <span className="row-progress"><span>{progress.complete}/{progress.total} objectives</span><progress aria-label={`${quest.questName} objectives`} max={progress.total} value={progress.complete} /></span>}
            </span><span className="quest-arrow" aria-hidden="true">›</span>
          </button></li>;
        })}</ul>
      </section>) : <p className="index-empty">No quests match this view. Try resetting your filters or create a quest.</p>}
    </div>
  </aside>;
}
