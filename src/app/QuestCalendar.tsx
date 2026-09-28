"use client";

import { useState } from "react";
import { Quest } from "./quests";

function toDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatQuestDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(toDate(value));
}

function CalendarGrid({ month, selectedDate, quests = [], onSelectDate, onSelectQuest }: { month: Date; selectedDate?: string | null; quests?: Quest[]; onSelectDate?: (date: string) => void; onSelectQuest?: (quest: Quest) => void }) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  return <div className="calendar-grid" role="grid" aria-label={new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(month)}>
    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <span className="calendar-weekday" role="columnheader" key={day}>{day}</span>)}
    {Array.from({ length: firstWeekday + daysInMonth }, (_, index) => {
      if (index < firstWeekday) return <span aria-hidden="true" key={`blank-${index}`} />;
      const date = new Date(year, monthIndex, index - firstWeekday + 1);
      const dateValue = formatDate(date);
      const questsForDate = quests.filter(quest => quest.dueDate === dateValue);
      if (onSelectQuest && questsForDate.length > 0) return <div className="calendar-day calendar-day-has-quests" role="gridcell" key={dateValue}><span>{date.getDate()}</span>{questsForDate.map(quest => <button type="button" key={quest.id} onClick={() => onSelectQuest(quest)}><span aria-hidden="true">{quest.icon} </span>{quest.questName}</button>)}</div>;
      return <button type="button" key={dateValue} aria-pressed={selectedDate === dateValue} onClick={() => onSelectDate?.(dateValue)}>{date.getDate()}</button>;
    })}
  </div>;
}

function CalendarHeader({ month, onChange }: { month: Date; onChange: (month: Date) => void }) {
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(month);
  return <div className="calendar-header"><button type="button" aria-label="Previous month" onClick={() => onChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button><strong>{monthLabel}</strong><button type="button" aria-label="Next month" onClick={() => onChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button></div>;
}

export function QuestDatePicker({ value, onChange }: { value: string | null; onChange: (date: string | null) => void }) {
  const selectedDate = value ? toDate(value) : null;
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(selectedDate?.getFullYear() ?? new Date().getFullYear(), selectedDate?.getMonth() ?? new Date().getMonth(), 1));
  const selectedLabel = value ? formatQuestDate(value) : "No date chosen";

  return <div className="quest-date-picker">
    <button type="button" className="calendar-trigger" aria-expanded={isOpen} onClick={() => setIsOpen(open => !open)}>{selectedLabel}</button>
    {isOpen && <div className="calendar-panel" role="dialog" aria-label="Choose quest date"><CalendarHeader month={visibleMonth} onChange={setVisibleMonth} /><CalendarGrid month={visibleMonth} selectedDate={value} onSelectDate={date => { onChange(date); setIsOpen(false); }} />{value && <button type="button" className="calendar-clear" onClick={() => { onChange(null); setIsOpen(false); }}>Clear date</button>}</div>}
  </div>;
}

export function QuestCalendar({ quests, onSelectQuest, onClose }: { quests: Quest[]; onSelectQuest: (quest: Quest) => void; onClose: () => void }) {
  const datedQuests = quests.filter(quest => quest.dueDate);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const firstDatedQuest = datedQuests.find(quest => quest.dueDate);
    const date = firstDatedQuest?.dueDate ? toDate(firstDatedQuest.dueDate) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  return <section className="quest-calendar-view" aria-labelledby="calendar-title"><header><div><p className="eyebrow">Campaign schedule</p><h2 id="calendar-title">Quest calendar</h2></div><button type="button" className="quiet-button" onClick={onClose}>Close calendar</button></header>{datedQuests.length > 0 ? <><CalendarHeader month={visibleMonth} onChange={setVisibleMonth} /><CalendarGrid month={visibleMonth} quests={datedQuests} onSelectQuest={onSelectQuest} /></> : <p className="calendar-empty">No quests have a date yet. Add one from a quest&apos;s edit screen.</p>}</section>;
}
