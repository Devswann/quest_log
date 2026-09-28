export type Objective = {
  id: string;
  description: string;
  isComplete: boolean;
};

export const QUEST_ICONS = [
  { value: "⚔️", label: "Crossed swords" },
  { value: "🛡️", label: "Shield" },
  { value: "📜", label: "Scroll" },
  { value: "🗺️", label: "Map" },
  { value: "🧭", label: "Compass" },
  { value: "🧪", label: "Potion" },
  { value: "🔮", label: "Crystal ball" },
  { value: "🐉", label: "Dragon" },
  { value: "⛏️", label: "Pickaxe" },
  { value: "🌿", label: "Herb" },
] as const;

export type QuestIcon = (typeof QUEST_ICONS)[number]["value"];
export type Priority = "low" | "normal" | "high";
export type Recurrence = "none" | "daily" | "weekly" | "monthly";
export type QuestView = "active" | "completed" | "archived" | "today" | "upcoming" | "overdue";
export type QuestFilters = {
  view: QuestView;
  search: string;
  section: string;
  icon: string;
  priority: string;
  sort: "manual" | "date" | "priority" | "name";
};
export const INITIAL_FILTERS: QuestFilters = { view: "active", search: "", section: "", icon: "", priority: "", sort: "manual" };
export const DEFAULT_QUEST_ICON: QuestIcon = "⚔️";
const questIconValues = new Set<string>(QUEST_ICONS.map(icon => icon.value));

export type Quest = {
  id: string;
  questName: string;
  description: string;
  section: string;
  icon: QuestIcon;
  isComplete: boolean;
  objectives: Objective[];
  dueDate: string | null;
  priority: Priority;
  isArchived: boolean;
  recurrence: Recurrence;
  nextOccurrenceId: string | null;
};

export const STORAGE_KEY = "quest-log:v1";
export const starterQuests: Quest[] = [{
  id: "welcome",
  questName: "Your adventure begins",
  description: "Every great adventure starts with a single step.\n\nCreate your first quest: choose a goal, describe what success looks like, and give it a section such as Home, Work, or Learning.\n\nWhen you finish, mark it complete. Your progress will be kept in this browser.",
  section: "Getting started",
  icon: DEFAULT_QUEST_ICON,
  isComplete: false,
  objectives: [],
  dueDate: null,
  priority: "normal",
  isArchived: false,
  recurrence: "none",
  nextOccurrenceId: null,
}];

export function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function encodeQuests(quests: Quest[]) {
  return JSON.stringify({ version: 1, quests }, null, 2);
}

export function objectiveProgress(quest: Quest) {
  return { complete: quest.objectives.filter(item => item.isComplete).length, total: quest.objectives.length };
}

export function matchesView(quest: Quest, view: QuestView, today: string) {
  if (view === "archived") return quest.isArchived;
  if (quest.isArchived) return false;
  if (view === "completed") return quest.isComplete;
  if (quest.isComplete) return false;
  if (view === "active") return true;
  if (!quest.dueDate) return false;
  if (view === "today") return quest.dueDate === today;
  if (view === "overdue") return quest.dueDate < today;
  return quest.dueDate > today;
}

export function filterQuests(quests: Quest[], filters: QuestFilters, today: string) {
  const search = filters.search.trim().toLocaleLowerCase();
  const result = quests.filter(quest => matchesView(quest, filters.view, today)
    && (!filters.section || quest.section === filters.section)
    && (!filters.icon || quest.icon === filters.icon)
    && (!filters.priority || quest.priority === filters.priority)
    && (!search || [quest.questName, quest.description, quest.section, ...quest.objectives.map(item => item.description)].some(text => text.toLocaleLowerCase().includes(search))));
  const rank = { high: 0, normal: 1, low: 2 };
  if (filters.sort === "date") result.sort((a, b) => (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31"));
  if (filters.sort === "priority") result.sort((a, b) => rank[a.priority] - rank[b.priority]);
  if (filters.sort === "name") result.sort((a, b) => a.questName.localeCompare(b.questName));
  return result;
}

// A completed repeating quest produces one future occurrence, never a backlog.
// Monthly dates clamp to the last valid day (Jan 31 → Feb 28).
export function nextQuestDate(date: string, recurrence: Recurrence, today: string): string {
  const base = date > today ? date : today;
  const next = new Date(`${base}T12:00:00Z`);
  if (recurrence === "monthly") {
    const day = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(day, lastDay));
  } else next.setUTCDate(next.getUTCDate() + (recurrence === "weekly" ? 7 : 1));
  const value = next.toISOString().slice(0, 10);
  if (!isValidDate(value)) throw new Error("Next date exceeds the supported calendar range");
  return value;
}

export function completeQuest(quests: Quest[], id: string, nextId: string, today: string): Quest[] {
  const quest = quests.find(item => item.id === id);
  if (!quest || quest.isArchived || quest.isComplete || quest.objectives.some(item => !item.isComplete)) return quests;
  const next = quest.recurrence !== "none" && !quest.nextOccurrenceId
    ? { ...quest, id: nextId, isComplete: false, nextOccurrenceId: null, dueDate: nextQuestDate(quest.dueDate ?? today, quest.recurrence, today), objectives: quest.objectives.map(item => ({ ...item, isComplete: false })) }
    : null;
  return [...quests.map(item => item.id === id ? { ...item, isComplete: true, nextOccurrenceId: next?.id ?? item.nextOccurrenceId } : item), ...(next ? [next] : [])];
}

export function mergeQuests(current: Quest[], imported: Quest[]) {
  const ids = new Set(current.map(quest => quest.id));
  return [...current, ...imported.filter(quest => !ids.has(quest.id))];
}

// Treat browser storage as external input, rather than trusting a TypeScript cast.
export function decodeQuests(raw: string): Quest[] {
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object" || !("version" in data) || data.version !== 1 || !("quests" in data) || !Array.isArray(data.quests)) {
    throw new Error("Unsupported saved quest data");
  }
  if (data.quests.length > 10000) throw new Error("Too many saved quests");
  const ids = new Set<string>();
  const quests: Quest[] = [];
  for (const quest of data.quests) {
    if (!quest || typeof quest !== "object" || typeof quest.id !== "string" || !quest.id || ids.has(quest.id) || typeof quest.questName !== "string" || !quest.questName.trim() || quest.questName.length > 100 || typeof quest.description !== "string" || !quest.description.trim() || quest.description.length > 5000 || typeof quest.section !== "string" || !quest.section.trim() || quest.section.length > 50 || typeof quest.isComplete !== "boolean") {
      throw new Error("Invalid saved quest data");
    }
    const objectives = "objectives" in quest ? quest.objectives : [];
    const dueDate = "dueDate" in quest ? quest.dueDate : null;
    const icon = "icon" in quest ? quest.icon : DEFAULT_QUEST_ICON;
    const priority = "priority" in quest ? quest.priority : "normal";
    const isArchived = "isArchived" in quest ? quest.isArchived : false;
    const recurrence = "recurrence" in quest ? quest.recurrence : "none";
    const nextOccurrenceId = "nextOccurrenceId" in quest ? quest.nextOccurrenceId : null;
    if (!Array.isArray(objectives) || objectives.length > 50) throw new Error("Invalid saved quest objectives");
    if (dueDate !== null && (typeof dueDate !== "string" || !isValidDate(dueDate))) throw new Error("Invalid saved quest date");
    if (typeof icon !== "string" || !questIconValues.has(icon)) throw new Error("Invalid saved quest icon");
    if (priority !== "low" && priority !== "normal" && priority !== "high") throw new Error("Invalid quest priority");
    if (typeof isArchived !== "boolean") throw new Error("Invalid archive status");
    if (recurrence !== "none" && recurrence !== "daily" && recurrence !== "weekly" && recurrence !== "monthly") throw new Error("Invalid recurrence");
    if (recurrence !== "none" && !dueDate) throw new Error("Repeating quests require a date");
    if (nextOccurrenceId !== null && (typeof nextOccurrenceId !== "string" || !nextOccurrenceId || nextOccurrenceId === quest.id)) throw new Error("Invalid next occurrence");
    const objectiveIds = new Set<string>();
    for (const objective of objectives) {
      if (!objective || typeof objective !== "object" || typeof objective.id !== "string" || !objective.id || objectiveIds.has(objective.id) || typeof objective.description !== "string" || !objective.description.trim() || objective.description.length > 200 || typeof objective.isComplete !== "boolean") {
        throw new Error("Invalid saved quest objectives");
      }
      objectiveIds.add(objective.id);
    }
    ids.add(quest.id);
    quests.push({ id: quest.id, questName: quest.questName, description: quest.description, section: quest.section, icon: icon as QuestIcon, isComplete: quest.isComplete, objectives, dueDate, priority, isArchived, recurrence, nextOccurrenceId });
  }
  return quests;
}
