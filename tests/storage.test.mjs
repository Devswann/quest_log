import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const output = ts.transpileModule(fs.readFileSync('src/app/quests.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const context = { exports: {} };
vm.runInNewContext(output, context);
const { decodeQuests, starterQuests, INITIAL_FILTERS, filterQuests, completeQuest, nextQuestDate, mergeQuests, isValidDate, objectiveProgress } = context.exports;
const encode = quests => JSON.stringify({ version: 1, quests });
test('restores quest content and completion without changing identity', () => {
  const quest = { ...starterQuests[0], isComplete: true };
  assert.equal(JSON.stringify(decodeQuests(encode([quest]))), JSON.stringify([quest]));
});
test('preserves an intentionally empty journal', () => {
  assert.equal(decodeQuests(encode([])).length, 0);
});
test('restores objectives and adds an empty list to existing saved quests', () => {
  const objective = { id: 'first-step', description: 'Begin the work', isComplete: false };
  const quest = { ...starterQuests[0], objectives: [objective] };
  assert.equal(JSON.stringify(decodeQuests(encode([quest]))[0].objectives), JSON.stringify([objective]));
  const legacyQuest = { ...quest };
  delete legacyQuest.objectives;
  assert.equal(JSON.stringify(decodeQuests(encode([legacyQuest]))[0].objectives), '[]');
});
test('restores valid quest dates and adds no date to existing saved quests', () => {
  const quest = { ...starterQuests[0], dueDate: '2026-10-31' };
  assert.equal(decodeQuests(encode([quest]))[0].dueDate, '2026-10-31');
  const legacyQuest = { ...quest };
  delete legacyQuest.dueDate;
  assert.equal(decodeQuests(encode([legacyQuest]))[0].dueDate, null);
});
test('restores quest icons and adds the default icon to existing saved quests', () => {
  const quest = { ...starterQuests[0], icon: '🧭' };
  assert.equal(decodeQuests(encode([quest]))[0].icon, '🧭');
  const legacyQuest = { ...quest };
  delete legacyQuest.icon;
  assert.equal(decodeQuests(encode([legacyQuest]))[0].icon, '⚔️');
});
test('rejects damaged JSON, unsupported versions, duplicate IDs and malformed fields', () => {
  const q = starterQuests[0];
  for (const raw of ['{', 'null', JSON.stringify({ version: 2, quests: [] }), encode([q,q]), encode([{ ...q, isComplete: 'yes' }]), encode([{ ...q, questName: '  ' }]), encode([{ ...q, description: 'x'.repeat(5001) }]), encode([{ ...q, id: 0 }]), encode([{ ...q, icon: '🚀' }]), encode([{ ...q, dueDate: '2026-02-30' }]), encode([{ ...q, objectives: [{ id: 'one', description: '  ', isComplete: false }] }]), encode([{ ...q, objectives: [{ id: 'one', description: 'Valid' }, { id: 'one', description: 'Different', isComplete: false }] }])]) {
    assert.throws(() => decodeQuests(raw));
  }
});

test('migrates older journals with priority, archive and recurrence defaults', () => {
  const legacy = { ...starterQuests[0] };
  delete legacy.priority; delete legacy.isArchived; delete legacy.recurrence; delete legacy.nextOccurrenceId;
  const restored = decodeQuests(encode([legacy]))[0];
  assert.equal(restored.priority, 'normal');
  assert.equal(restored.isArchived, false);
  assert.equal(restored.recurrence, 'none');
  assert.equal(restored.nextOccurrenceId, null);
});

test('round-trips archived recurring quests and validates new fields', () => {
  const quest = { ...starterQuests[0], priority: 'high', isArchived: true, recurrence: 'weekly', dueDate: '2026-10-10', nextOccurrenceId: 'successor' };
  assert.equal(JSON.stringify(decodeQuests(encode([quest]))[0]), JSON.stringify(quest));
  for (const changes of [{ priority: 'urgent' }, { isArchived: 1 }, { recurrence: 'yearly' }, { recurrence: 'daily' }, { nextOccurrenceId: 4 }, { nextOccurrenceId: quest.id }]) {
    assert.throws(() => decodeQuests(encode([{ ...starterQuests[0], ...changes }])));
  }
});

test('date views exclude completed and archived quests; upcoming means any future date', () => {
  const base = starterQuests[0];
  const quests = [
    { ...base, id: 'today', dueDate: '2026-09-27' },
    { ...base, id: 'late', dueDate: '2026-09-26' },
    { ...base, id: 'future', dueDate: '2027-01-01' },
    { ...base, id: 'done', dueDate: '2026-09-26', isComplete: true },
    { ...base, id: 'archive', dueDate: '2026-09-27', isArchived: true },
    { ...base, id: 'undated' },
  ];
  const ids = view => Array.from(filterQuests(quests, { ...INITIAL_FILTERS, view }, '2026-09-27'), q => q.id);
  assert.deepEqual(ids('today'), ['today']);
  assert.deepEqual(ids('overdue'), ['late']);
  assert.deepEqual(ids('upcoming'), ['future']);
  assert.deepEqual(ids('archived'), ['archive']);
  assert.deepEqual(ids('completed'), ['done']);
  assert.equal(ids('active').length, 4);
});

test('search, section, icon and priority combine; sorting does not mutate source', () => {
  const base = starterQuests[0];
  const quests = [
    { ...base, id: 'low', priority: 'low', section: 'Learning', icon: '🧭', objectives: [{ id: 'step', description: 'Read a chapter', isComplete: false }] },
    { ...base, id: 'high', priority: 'high', dueDate: '2026-10-01' },
  ];
  assert.equal(filterQuests(quests, { ...INITIAL_FILTERS, search: ' CHAPTER ', section: 'Learning', icon: '🧭', priority: 'low' }, '2026-09-27')[0].id, 'low');
  assert.equal(filterQuests(quests, { ...INITIAL_FILTERS, sort: 'priority' }, '2026-09-27')[0].id, 'high');
  assert.equal(filterQuests(quests, { ...INITIAL_FILTERS, sort: 'date' }, '2026-09-27')[0].id, 'high');
  assert.equal(quests[0].id, 'low');
});

test('recurrence clamps month ends, handles leap years and advances late completions', () => {
  assert.equal(nextQuestDate('2026-01-31', 'monthly', '2026-01-31'), '2026-02-28');
  assert.equal(nextQuestDate('2028-01-31', 'monthly', '2028-01-31'), '2028-02-29');
  assert.equal(nextQuestDate('2026-12-31', 'daily', '2026-12-31'), '2027-01-01');
  assert.equal(nextQuestDate('2026-09-01', 'weekly', '2026-09-27'), '2026-10-04');
  assert.equal(nextQuestDate('2026-10-10', 'daily', '2026-09-27'), '2026-10-11');
  assert.equal(isValidDate('2026-02-30'), false);
});

test('completion preserves history, resets next objectives and generates only once', () => {
  const quest = { ...starterQuests[0], recurrence: 'daily', dueDate: '2026-09-27', objectives: [{ id: 'step', description: 'Finish', isComplete: true }] };
  const source = [quest];
  const updated = completeQuest(source, quest.id, 'next', '2026-09-27');
  assert.equal(updated.length, 2);
  assert.equal(updated[0].isComplete, true);
  assert.equal(updated[0].nextOccurrenceId, 'next');
  assert.equal(updated[1].isComplete, false);
  assert.equal(updated[1].objectives[0].isComplete, false);
  assert.equal(updated[1].dueDate, '2026-09-28');
  assert.equal(source[0].isComplete, false);
  assert.equal(completeQuest(updated, quest.id, 'duplicate', '2026-09-27'), updated);
  const reopened = updated.map(q => q.id === quest.id ? { ...q, isComplete: false } : q);
  assert.equal(completeQuest(reopened, quest.id, 'duplicate', '2026-09-27').length, 2);
  assert.equal(objectiveProgress(quest).complete, 1);
});

test('unfinished objectives and archived quests cannot generate recurrences', () => {
  const quest = { ...starterQuests[0], recurrence: 'daily', dueDate: '2026-09-27', objectives: [{ id: 'step', description: 'Finish', isComplete: false }] };
  const source = [quest];
  assert.equal(completeQuest(source, quest.id, 'next', '2026-09-27'), source);
  const archived = [{ ...quest, isArchived: true, objectives: [] }];
  assert.equal(completeQuest(archived, quest.id, 'next', '2026-09-27'), archived);
});

test('merge keeps matching IDs and imports new quests including archive history', () => {
  const source = [starterQuests[0]];
  const imported = [{ ...source[0], questName: 'Conflict' }, { ...source[0], id: 'new', isArchived: true }];
  const merged = mergeQuests(source, imported);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].questName, source[0].questName);
  assert.equal(merged[1].isArchived, true);
});
