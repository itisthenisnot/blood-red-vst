#!/usr/bin/env node
// Validates the catalog data: required fields, unique ids, known categories, sane values.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const categories = new Set(load('data/categories.json').map((c) => c.id));
const REQUIRED = ['id', 'name', 'developer', 'category', 'price', 'url', 'description', 'whyUnique', 'bitwigTips', 'uniqueness'];
const PRICES = new Set(['free', 'freemium', 'paid']);
const FORMATS = new Set(['VST3', 'CLAP']);

const errors = [];
const seen = new Set();

for (const [file, needsFormats] of [['data/vst.json', true], ['data/android.json', false]]) {
  for (const [i, item] of load(file).entries()) {
    const where = `${file}[${i}] ${item.id ?? '?'}`;
    for (const key of REQUIRED) if (item[key] == null || item[key] === '') errors.push(`${where}: missing ${key}`);
    if (seen.has(item.id)) errors.push(`${where}: duplicate id`);
    seen.add(item.id);
    if (!/^[a-z0-9-]+$/.test(item.id ?? '')) errors.push(`${where}: id must be kebab-case`);
    if (!Array.isArray(item.category) || !item.category.length) errors.push(`${where}: category must be a non-empty array`);
    else for (const c of item.category) if (!categories.has(c)) errors.push(`${where}: unknown category "${c}"`);
    if (!PRICES.has(item.price)) errors.push(`${where}: bad price "${item.price}"`);
    if (!Number.isInteger(item.uniqueness) || item.uniqueness < 1 || item.uniqueness > 5) errors.push(`${where}: uniqueness must be 1-5`);
    if (!/^https:\/\//.test(item.url ?? '')) errors.push(`${where}: url must be https`);
    if (needsFormats) {
      if (!Array.isArray(item.formats) || !item.formats.length) errors.push(`${where}: formats required`);
      else for (const f of item.formats) if (!FORMATS.has(f)) errors.push(`${where}: unknown format "${f}"`);
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`OK: ${seen.size} entries valid.`);
