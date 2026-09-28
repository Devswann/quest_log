# Quest Log

A one-page personal quest journal inspired by classic fantasy game interfaces: a dark quest index, gold accents, red buttons and parchment details. Built with Next.js, React and TypeScript. Styling is original CSS; Georgia/Times New Roman are local font fallbacks, not the exact World of Warcraft font. No Blizzard artwork or font files are bundled.

## Run locally

Use Node.js 22 or 24 and npm. This iteration was checked with Node 24.

```sh
npm ci
npm run dev
```

Visit http://localhost:3000. For a production preview, run `npm run build`, then `npm start`.

## Features

- Create, select, edit, complete, reopen, archive and restore quests on one route.
- Group by section; blank sections default to Personal.
- Choose a local quest icon (swords, shield, scroll, map, compass, potion, crystal, dragon, pickaxe, or herb) to distinguish each quest.
- Active, Completed, Today, Upcoming, Overdue and Archive views.
- Objective checklists with derived counts and gold progress bars in the quest index.
- Search names, descriptions, sections and objective text; filter by section, icon and priority.
- Sort by added order, due date, priority or name within section groups.
- Low, normal and high priority, with visible text labels.
- Daily, weekly and monthly recurrence, with completed history and one future occurrence at a time.
- Archive undo and persistent restore; no permanent deletion action.
- JSON backup export and validated import, with merge/replacement preview and import undo.
- Inline date picker, calendar view and form validation.
- Responsive two-column layout that stacks below 700px.
- Semantic labels, focus indicators, keyboard controls and live status messages.
- Versioned browser persistence with validated reads and visible storage-failure warnings.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

See [the learning walkthrough](docs/WALKTHROUGH.md) for the implementation and a hands-on acceptance checklist.

## Storage and limitations

Quests are stored under `quest-log:v1` as `{ "version": 1, "quests": [...] }` in localStorage. Only a missing key creates the welcome quest; a saved empty array stays empty. Browser reads happen after mounting, and writes remain disabled until loading succeeds. Invalid data or unsupported versions block writes for the session, preserving the original stored value.

The icon picker deliberately uses Unicode emoji rather than World of Warcraft image files. It keeps the project self-contained and avoids redistributing Blizzard-owned artwork. Existing saved quests without an icon are migrated to the crossed-swords default.

Storage belongs to the exact browser profile and origin (including port). Clearing site data removes quests. Private browsing may discard data when the session ends. There is no account, cloud sync, encryption layer or multi-tab conflict resolution. Use one tab when editing. Storage failures leave changes in memory with a warning. Unsaved form drafts are discarded when leaving the editor. The form limits names to 100, descriptions to 5,000 and sections to 50 characters. Import accepts JSON backups up to 5 MB and journals of at most 10,000 quests. Export includes archived and completed quests.

Older data receives defaults: `priority: "normal"`, `isArchived: false`, `recurrence: "none"`, and `nextOccurrenceId: null`. Storage remains version 1. Archive preserves content and status across reloads. Undo archive is a convenience for the latest archive action; Restore works for every archived quest. Undo import holds the previous journal in memory until dismissed, another import or a refresh, and replaces any edits since the import when used.

Date views use the browser's local date: Today is equal, Overdue is earlier, and Upcoming is any later date. Only unfinished, unarchived quests appear in these views. Undated quests remain in Active. Date comparisons update every 30 seconds and on window focus.

Recurring quests require a due date. Completion creates one new quest with a new ID, the same fields and unchecked objectives; the completed occurrence remains in history. The next date advances from the later of the current due date or completion day. Monthly dates clamp to the end of shorter months, and subsequent repeats use that clamped date. Reopening and recompleting a past occurrence never creates another successor. To stop a series, edit the active occurrence to Does not repeat or archive it. Changing an old completed occurrence does not edit its successor. This is completion-driven recurrence, without background jobs or notifications.

This is a local first iteration, not a claim of formal accessibility conformance. Screen-reader testing and additional real-device testing remain release follow-ups. The inherited dependency set is retained; the build reports an outdated Browserslist dataset. Before public deployment, review dependency security and align framework/lint package versions as a separate maintenance change.

## Repository preparation

The starter metadata and README were replaced, lint now runs ESLint directly and ignores generated output, and typecheck/test commands were added. The pre-existing package-lock.json edits were preserved. No commit, remote push or deployment is performed by this iteration.

Before committing, inspect `git diff` and `git status`, including the existing lockfile changes. Commit only the changes you intend to include. No environment variables or backend services are required.

## Try this iteration

See [the tracker testing checklist](docs/TRACKER_TESTING.md) for a short sequence covering all seven additions, including a sample older-format backup. The updated handoff lists code responsibilities and recurrence rules. Further feature work should follow feedback from this iteration.

Try the current journal for a week before expanding its scope. Record where you hesitate, lose work, or avoid a workflow. Prioritize changes that remove those problems over adding XP, streaks or elaborate reward systems.
