# Learn the first iteration

This explains the original foundation. For the expanded tracker, recurrence, archive and backup flows, use [the current testing and implementation guide](TRACKER_TESTING.md).

## 1. Understand the page boundary

`src/app/layout.tsx` supplies the document language, metadata, global CSS and skip link. `page.tsx` renders the journal on `/`. It does not need browser state. `QuestSection.tsx` declares `"use client"` because it handles interactions and browser storage. Client components can still be pre-rendered by Next.js; this is why storage reads belong in an effect rather than during server rendering.

Teach it: “We have one URL. Clicking a quest changes what React renders within that page.”

## 2. Define the data before the interface

`quests.ts` defines a Quest with a stable ID, name, description, section and completion flag. New quests use `crypto.randomUUID()`. An ID represents identity, not an array position: deleting or filtering another quest does not change which quest an action targets.

The old completion handler changed an object directly and used an ID as an array index. The new handler uses `map` to replace only the matching quest with a copied object.

```ts
setQuests(previous => previous.map(quest =>
  quest.id === selectedId ? { ...quest, isComplete: true } : quest
));
```

Teach it: “React gets a new array and a new object for the changed quest. Other quests retain their identities.”

## 3. Distinguish source data from derived data

There is one authoritative `quests` array. Visible quests, completed counts, section names and the selected quest are calculated during rendering. They are not separate state variables that can drift out of sync.

Other state represents actual interface choices: selected ID, active/completed filter, editor mode, pending deletion, storage status and announcements. The editor temporarily holds its starting quest when editing; saved lists still come from the authoritative array.

If selection is missing from the visible list, the first visible quest becomes the detail view. No extra synchronization effect is needed.

Teach it: “Store what the user changes. Calculate what follows from it.”

## 4. Follow a form submission

The form uses native inputs and FormData, so each keystroke does not need a top-level React state update. Default values populate an edit form. Required attributes and length limits provide native validation; the submit handler also trims text and rejects whitespace-only names/descriptions. A blank section becomes Personal.

On submit: prevent navigation → read fields → trim and validate → create or replace a quest → select it → close the editor → focus the detail heading and announce success.

The form component has a key so switching between creating and editing remounts it with the appropriate defaults. Switching away discards an unsaved draft; draft preservation is not part of iteration one.

## 5. Follow local persistence

1. Initial render shows a loading state with writes disabled.
2. The mount effect reads `quest-log:v1`.
3. A missing key supplies a welcome quest. An empty saved journal remains empty.
4. `decodeQuests` parses JSON and checks the version, array, field types, limits and unique IDs.
5. Only successful loading enables the saving effect.
6. Changes to the quest array are serialized back into the versioned envelope.
7. Read or write failures show a warning and block further writes for that session.

A TypeScript type cannot validate JSON at runtime. That is the reason for the decoder. The loading gate prevents an empty initial array from overwriting saved quests before they are read. Versioning gives a future migration a clear starting point; no migration is currently implemented.

Teach it: “React state is the working copy; localStorage is the saved copy. We validate the saved copy before trusting it.”

## 6. Explain the styling and accessibility

`globals.css` defines the palette and layout. CSS gradients create parchment and dark panel textures without image downloads. Georgia and Times New Roman supply local serif typography, with small capitals for headings and fantasy-style framing. The appearance follows the supplied references without claiming pixel-exact reproduction.

CSS Grid provides two desktop columns. Below 700px it becomes one column, and the index has a bounded scroll area. Descriptions preserve line breaks and long text wraps. Buttons have 44px minimum height, labels point to actual input IDs, focus outlines are visible, and status messages use a live region. Selection uses `aria-current`; the two status filters use `aria-pressed`.

Keyboard focus moves to the new form or selected details so users do not have to search for the changed content. Deletion has an inline confirmation. Text explains status in addition to color.

Teach it: “Accessibility is in the HTML and interaction behavior as well as the colors.”

## 7. Validate behavior, not just compilation

Lint catches suspicious code; TypeScript checks type relationships; the production build checks framework compilation. `npm test` exercises storage decoding, including empty journals, duplicate IDs, unsupported versions and malformed values. Those tests use the installed TypeScript compiler and Node test runner without adding a test framework.

Browser checks performed during implementation: desktop visual inspection, 375px responsive layout, creation, completion, reload persistence, editing a completed quest, reopening and the empty completed state. This is not a full screen-reader or device-lab audit.

Hands-on checklist for teaching or release review:

- Create a quest, leave section blank, and explain why it appears under Personal.
- Submit whitespace-only text and confirm the error is understandable.
- Edit a name and section; verify that the quest remains the same quest.
- Complete it, view Completed, reopen it, and explain how filtering works.
- Reload and confirm both content and completion survive.
- Exercise deletion using a disposable quest; cancel first, then confirm.
- Test 320px width, 200% browser zoom and a long unbroken word.
- Navigate using Tab, Shift+Tab, Enter and Space. Verify focus stays understandable.
- In a disposable browser profile, test malformed storage and blocked storage. Confirm old data is not overwritten.
- Explain why two tabs can currently overwrite each other and why backup/export comes next.

## 8. Teach the full loop

Ask someone to create “Read a chapter” in Learning, then trace it through FormData, validation, the quest array, the derived index, the detail panel and localStorage. Have them complete it and predict which values change. If they can explain why there is no separate completed-quests state, they understand the central design.

Start future changes with a user problem and an acceptance example. For objective checklists, the example could be: “A three-step quest shows 2/3 after two objectives are checked, including after reload.” Define the data and behavior, implement the smallest useful interface, and verify the example.
