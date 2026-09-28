# Test the expanded Quest Log

Use `npm run dev` for development, or `npm run build` followed by `npm start` for production. The review preview created during implementation uses http://localhost:3010. Different ports have separate localStorage, so your existing journal on port 3001 does not automatically appear on 3010. Export/import moves journals between them.

## A useful testing sequence

1. Create a high-priority quest with two objectives, a compass icon and today's date. Give it a section such as Learning. Check one objective: the index should show 1/2 and a half-filled bar. Completion should remain disabled until both objectives are done.
2. Create separate quests dated yesterday and tomorrow. Today, Overdue and Upcoming should show only their unfinished, unarchived matches. Overdue uses text as well as color. Completed quests should leave all three date views.
3. Search for text found only in an objective. Combine it with section, icon and priority filters. Try each sort order and Reset search & filters. Sorting stays grouped by section.
4. Archive a quest, then use Undo archive. Archive it again, refresh, open Archive and Restore quest. Its objectives, due date, priority and completion status should survive.
5. Export a backup and inspect the downloaded JSON. Import it back: the preview should report matching IDs, and merge should leave your existing quests intact. Import `tests/fixtures/quest-backup.json` to check older-format migration; it adds one sample Testing quest.
6. Export before testing replacement. Choose Replace my entire journal in the import preview, confirm it, and check Undo import before refreshing. Undo restores the previous whole journal, including replacing any edits made since import. A bad JSON file should show an error and make no changes.
7. Create a daily quest with a date and an objective. Complete it: one completed occurrence should remain, and one future quest should appear with its objective unchecked. Reopen and recomplete the old occurrence: no extra successor should be created.
8. Try weekly and monthly repeats. January 31 advances to February 28 (29 in a leap year); subsequent monthly dates use that clamped day. Completing an overdue quest advances from today's date, producing one future occurrence rather than a backlog. To stop repeating, edit the active occurrence to Does not repeat.
9. Reload and verify content, archive status, priority, recurrence and objective progress. Filters intentionally reset after refresh. Try keyboard-only navigation, narrow mobile width and large text zoom.

## How the implementation works

`quests.ts` owns the data model, migration/validation, date views, search/sort logic and recurrence transition. This allows automated tests to cover the rules without needing a browser.

`QuestIndex.tsx` derives grouped results and progress from the quest array. All related filter choices live in one small filters object. Counts, percentages, date categories and grouped arrays are calculated instead of stored separately.

`QuestSection.tsx` still owns the single authoritative quest array. Archiving changes `isArchived`; restoring clears it. Priority and recurrence are saved fields, while the editor and undo choices remain temporary interface state. Undo archive stores only the most recent quest ID. Undo import needs one temporary previous-array snapshot to recover replacement.

`QuestBackup.tsx` validates the selected file before previewing it. Merge preserves current IDs; replacement is an explicit checkbox and confirmation. Export serializes the same versioned structure used by localStorage. No network upload occurs.

Recurring completion keeps history and records the successor ID on the completed quest. That stored link prevents duplicates when an old occurrence is reopened. The successor resets its own link and objective checkboxes, so it can continue the series.

## Verification recorded during implementation

Automated coverage includes storage compatibility, invalid fields, date views, combined filters, sorting, recurrence across year boundaries/leap years/month ends, duplicate successor prevention, objective gating, archive exclusion and merge behavior. Browser checks cover a new recurring quest, high priority, an objective saved from the draft input, completion gating, next occurrence/date, Upcoming, objective-text search, archive/undo, import preview/merge, and persistence after refresh. Export activation was observed; automated capture of the downloaded file timed out in the in-app browser, so check the actual download in your normal browser. Narrow browser layout was inspected with no horizontal overflow. Full screen-reader validation remains a separate review.
