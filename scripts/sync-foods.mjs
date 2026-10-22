#!/usr/bin/env node
/* Loads the shared `foods` table in Neon from USDA FoodData Central (public domain, no API key).
   Run once to fill the table, then monthly to pick up new USDA releases:  npm run foods:sync
   Needs DATABASE_URL (the Pulse project's connection string) in mobile/.env.local.
   Rows are upserted by id, so re-running only adds or refreshes foods; products users added are untouched. */
import { neon } from '@neondatabase/serverless';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const envFile = new URL('../.env.local', import.meta.url);
if (!process.env.DATABASE_URL && existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
    if (m) process.env.DATABASE_URL = m[1].trim();
  }
}
if (!process.env.DATABASE_URL) { console.error('Add DATABASE_URL=<Neon connection string> to mobile/.env.local'); process.exit(1); }
const sql = neon(process.env.DATABASE_URL);

/* Indian staples USDA lacks: per 100 g, typical home-style values (shown in the app as estimates). */
const EXTRA = [
  ['roti', 'Roti / chapati, whole wheat', 300, 8.5, 46, 8.5, [['1 roti', 40], ['1 large roti', 60]]],
  ['phulka', 'Phulka (no oil)', 270, 9, 52, 2.5, [['1 phulka', 30]]],
  ['chole', 'Chole (chickpea curry)', 140, 6.5, 18, 5, [['1 bowl', 200], ['1 cup', 240]]],
  ['rajma', 'Rajma (kidney bean curry)', 120, 5.5, 16, 4, [['1 bowl', 200], ['1 cup', 240]]],
  ['khichdi', 'Khichdi', 120, 4.5, 20, 2.5, [['1 bowl', 250], ['1 plate', 350]]],
  ['poha', 'Poha', 130, 2.5, 23, 3.5, [['1 plate', 180], ['1 bowl', 150]]],
  ['curd', 'Curd / dahi, whole milk', 61, 3.5, 4.7, 3.3, [['1 bowl', 150], ['1 cup', 245]]],
  ['raita', 'Raita', 60, 3, 5, 3, [['1 bowl', 150], ['1 tbsp', 15]]],
  ['lassi', 'Lassi, sweet', 90, 3, 14, 2.5, [['1 glass', 250]]],
  ['chaas', 'Buttermilk / chaas', 25, 1.5, 2.5, 1, [['1 glass', 250]]],
  ['paneer-tikka', 'Paneer tikka', 260, 16, 6, 19, [['1 piece', 30], ['1 plate', 200]]],
  ['chicken-tikka', 'Chicken tikka', 150, 25, 3, 4.5, [['1 piece', 35], ['1 plate', 200]]],
  ['butter-chicken', 'Butter chicken', 150, 13, 5, 9, [['1 bowl', 200], ['1 cup', 240]]],
  ['aloo-sabzi', 'Aloo sabzi (potato curry)', 110, 2, 15, 5, [['1 bowl', 150]]],
  ['veg-sabzi', 'Mixed vegetable sabzi', 90, 2.5, 9, 5, [['1 bowl', 150]]],
  ['jeera-rice', 'Jeera rice', 160, 3, 28, 4, [['1 cup', 160], ['1 plate', 250]]],
  ['chai', 'Masala chai with milk and sugar', 60, 2, 9, 2, [['1 cup', 150]]],
];

const SKIP = /infant formula|baby food|babyfood|baby toddler|human milk|milk, human|breast milk/i;
// Drop USDA's survey jargon so names read naturally.
const clean = (n) => n.replace(/,?\s*\bNS as to [^,]*/gi, '').replace(/,?\s*\bNFS\b/g, '').replace(/\s+,/g, ',').replace(/,\s*$/, '').trim();
const r1 = (x) => Math.round((x || 0) * 10) / 10;
const nut = (f, nums) => { for (const n of f.foodNutrients ?? []) if (nums.includes(n?.nutrient?.number) && n.amount != null) return +n.amount; return null; };
const portionsOf = (list) => {
  const out = [], seen = new Set();
  for (const [raw, g] of list) {
    const label = String(raw || '').replace(/\s*\([^)]*\)/g, '').trim();
    if (!(g > 0) || !label || /not specified|\bRACC\b|guideline/i.test(label) || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase()); out.push({ label: label.slice(0, 40), g: r1(g) });
    if (out.length >= 6) break;
  }
  return out;
};
const row = (id, name, f, portions) => {
  const kcal = nut(f, ['208']) ?? nut(f, ['957', '958']);
  if (!kcal || SKIP.test(name)) return null;
  return { id, name: clean(name), brand: '', source: 'usda', kcal: Math.round(kcal), protein: r1(nut(f, ['203'])), carbs: r1(nut(f, ['205'])), fat: r1(nut(f, ['204'])), portions };
};

/** Newest FNDDS (survey) and Foundation JSON releases listed on the USDA download page. */
async function latestReleases() {
  const html = await (await fetch('https://fdc.nal.usda.gov/download-datasets/')).text();
  const pick = (kind) => [...new Set(html.match(new RegExp(`/fdc-datasets/FoodData_Central_${kind}_food_json_[0-9-]+\\.zip`, 'g')) ?? [])].sort().pop();
  return [pick('survey'), pick('foundation')].filter(Boolean);
}

async function main() {
  const dir = mkdtempSync(join(tmpdir(), 'pulse-foods-'));
  try {
    const rows = new Map();
    for (const path of await latestReleases()) {
      console.log('Downloading', path.split('/').pop());
      const zip = join(dir, 'data.zip');
      writeFileSync(zip, Buffer.from(await (await fetch(`https://fdc.nal.usda.gov${path}`)).arrayBuffer()));
      execFileSync('unzip', ['-o', '-q', zip, '-d', dir]);
      for (const file of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
        const data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
        for (const f of data.SurveyFoods ?? []) {
          if (!f) continue;
          const r = row(`usda:${f.fdcId}`, f.description, f, portionsOf((f.foodPortions ?? []).map((p) => [p.portionDescription, p.gramWeight])));
          if (r) rows.set(r.id, r);
        }
        for (const f of data.FoundationFoods ?? []) {
          if (!f) continue;
          const ps = (f.foodPortions ?? []).map((p) => {
            const unit = ['undetermined', 'RACC'].includes(p.measureUnit?.name) ? '' : p.measureUnit?.name ?? '';
            return [[p.amount ? String(+p.amount) : '', unit, p.modifier ?? ''].filter(Boolean).join(' '), p.gramWeight];
          });
          const r = row(`usda:${f.fdcId}`, f.description, f, portionsOf(ps));
          if (r) rows.set(r.id, r);
        }
        rmSync(join(dir, file));
      }
    }
    for (const [slug, name, kcal, protein, carbs, fat, ps] of EXTRA) {
      rows.set(`est:${slug}`, { id: `est:${slug}`, name, brand: 'Estimate', source: 'est', kcal, protein, carbs, fat, portions: ps.map(([label, g]) => ({ label, g })) });
    }
    const all = [...rows.values()];
    console.log(`Upserting ${all.length} foods…`);
    for (let i = 0; i < all.length; i += 500) {
      const chunk = all.slice(i, i + 500);
      await sql.query(
        `insert into public.foods (id, name, brand, source, kcal, protein, carbs, fat, portions, added_by, updated_at)
         select id, name, brand, source, kcal, protein, carbs, fat, portions, null, now() from jsonb_to_recordset($1::jsonb)
           as x(id text, name text, brand text, source text, kcal real, protein real, carbs real, fat real, portions jsonb)
         on conflict (id) do update set name = excluded.name, brand = excluded.brand, kcal = excluded.kcal, protein = excluded.protein,
           carbs = excluded.carbs, fat = excluded.fat, portions = excluded.portions, updated_at = now()`,
        [JSON.stringify(chunk)],
      );
      process.stdout.write(`  ${Math.min(i + 500, all.length)}/${all.length}\r`);
    }
    const [{ n }] = await sql.query('select count(*)::int as n from public.foods');
    console.log(`\nDone. The foods table now has ${n} foods.`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
main().catch((e) => { console.error(e.message); process.exit(1); });
