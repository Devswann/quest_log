# Codex Handoff: Quest Log

## Project

Next.js 15 + React 19 TypeScript application. It is a browser-local quest tracker; all data is stored in `localStorage` under `quest-log:v1`.

## Current Feature Set

- Create, edit, complete, reopen, archive and restore quests, with archive undo.
- Create optional objectives within each quest and mark them complete.
- A quest cannot be completed while any of its objectives are unfinished. The completion button is disabled and explains the remaining objective count.
- Add an optional quest date with an in-theme date picker.
- Choose from a compact set of local Unicode quest icons.
- Open the toolbar's `Calendar` view to see dated quests on their assigned days. Selecting an entry returns to that quest's detail view.
- The date picker is rendered inline in the form, rather than as an absolute popup, to avoid being cut off by the quest window.
- Objective counts/progress bars appear in the quest index.
- Today, Upcoming, Overdue and Archive views join Active/Completed.
- Search includes objectives; section/icon/priority filters and sorting are derived.
- Priority is low, normal or high.
- Daily, weekly and monthly recurrence keeps completed history and generates one future occurrence on completion.
- Export/import uses versioned JSON with preview, merge or explicit replacement, and import undo.

## Key Files

- `src/app/QuestSection.tsx`: client-side quest state, localStorage lifecycle, create/edit form, quest detail actions, and calendar view wiring.
- `src/app/QuestCalendar.tsx`: reusable calendar module.
  - `QuestDatePicker`: inline date picker used by the quest form.
  - `QuestCalendar`: full calendar view listing dated quests.
  - `formatQuestDate`: shared user-facing date formatter.
- `src/app/QuestIndex.tsx`: date views, combined filters, section groups and progress.
- `src/app/QuestBackup.tsx`: local download, file validation, import preview and confirmation.
- `src/app/quests.ts`: `Quest` and `Objective` types, starter data, and validated storage decoding.
- `src/app/globals.css`: WoW-inspired parchment, brass, and red calendar styling.
- `tests/storage.test.mjs`: persistence and migration tests.

## Storage Compatibility

Storage format remains `{ version: 1, quests }` deliberately. Existing saved quests that lack either recently added field are migrated in memory:

- Missing `objectives` becomes `[]`.
- Missing `dueDate` becomes `null`.
- Missing `icon` becomes the default crossed-swords icon.
- Missing `priority`, `isArchived`, `recurrence`, `nextOccurrenceId` becomes `normal`, `false`, `none`, `null`, respectively.

New data is validated during decode:

- At most 50 objectives per quest.
- Objective IDs must be unique per quest.
- Objective descriptions must be non-empty and at most 200 characters.
- `dueDate` must be `null` or a valid `YYYY-MM-DD` calendar date.

Do not bump the storage version unless an incompatible migration is actually required.

## Important Implementation Notes

- The app is a client component because it uses browser storage.
- `createQuestId()` in `QuestSection.tsx` uses `crypto.randomUUID()` when available, then `crypto.getRandomValues()`, with a final random-byte fallback for old WebViews.
- `QuestCalendar.tsx` parses persisted dates as `YYYY-MM-DDT00:00:00` to avoid UTC date shifts in local display.
- The calendar's dated quest buttons call `onSelectQuest`, which changes the active/completed filter as needed and closes the calendar.
- The calendar view intentionally shows only quests with dates. Its empty state directs users to add dates through quest editing.
- Calendar excludes archived quests. Date views exclude completed and archived quests.
- Date validation uses UTC exclusively; displayed dates and Today use local calendar dates.
- Recurrence advances from the later of due date or completion day. Monthly dates clamp to month-end and later intervals use the clamped day. No automatic backlog or browser timer creates occurrences.
- `nextOccurrenceId` prevents creating a second successor when old history is reopened. To stop a series, edit/archive its active occurrence.
- Merge keeps current records on ID conflicts. Replacement requires a preview confirmation. Undo import is an in-memory snapshot and replaces subsequent edits; it is lost on refresh or the next import.
- Undo archive stores only an ID; Archive/Restore remain persistent. Completed quests automatically reopen if an objective is unchecked or an unfinished objective is added through editing.

## Validation

Run:

```powershell
npm test
npm run typecheck
npm run lint
```

The expanded iteration passes 14 tests, typecheck, lint and production build. Browser verification and remaining manual checks are recorded in `docs/TRACKER_TESTING.md`.

## Local Development

```powershell
npm run dev
```

A separate production preview for the expanded iteration runs at `http://localhost:3010`. Every port is a separate storage origin; use backup export/import to transfer a journal from an older preview. Normal development chooses an available port.

## Sensible Next Work

- Add component-level interaction tests for date selection, calendar navigation, and objective-gated completion.
- Consider an explicit calendar/list toggle only if the calendar becomes a frequently used primary workflow.
- Consider allowing multiple quest entries per date to be expanded or summarized on smaller mobile screens if real usage produces crowded days.
