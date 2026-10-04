import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = readFileSync(resolve(process.cwd(), 'public/verbs.json'), 'utf8');
const verbs = JSON.parse(file);

assert.ok(Array.isArray(verbs), 'verbs must be an array');
assert.ok(verbs.length >= 400, 'should include at least 400 verbs');
assert.ok(
  verbs.every((item) => item.verb && item.meaning && item.exampleEn && item.exampleVi),
  'each verb should have verb, meaning, exampleEn and exampleVi'
);

const ids = new Set(verbs.map((item) => item.id));
assert.equal(ids.size, verbs.length, 'ids must be unique');

const withAudio = verbs.filter((item) => item.audioUs).length;
assert.ok(withAudio > verbs.length * 0.5, 'most verbs should have real pronunciation audio');

console.log(`Loaded ${verbs.length} verbs from built-in dataset (${withAudio} with audio).`);
