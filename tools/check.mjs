import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const chapters = [
  ['01-foundations.md', 33],
  ['02-language-models.md', 30],
  ['03-regularization.md', 62],
  ['04-cross-section.md', 65],
];
let total = 0;
for (const [file, expected] of chapters) {
  const id = file.slice(0, 2);
  const source = fs.readFileSync(path.join(root, 'content', file), 'utf8');
  const numbers = [...source.matchAll(/^## 슬라이드 (\d{2}) · /gm)].map(m => Number(m[1]));
  const wanted = Array.from({length: expected}, (_, i) => i + 1);
  if (JSON.stringify(numbers) !== JSON.stringify(wanted)) {
    throw new Error(`${file}: section sequence is ${numbers.join(',')}`);
  }
  const sections = source.split(/(?=^## 슬라이드 \d{2} · )/m).slice(1);
  sections.forEach((section, index) => {
    if (!/<details><summary>[^<]+<\/summary><p>[^<]+<\/p><\/details>/.test(section)) {
      throw new Error(`${file}: missing question and example for slide ${index + 1}`);
    }
  });
  for (const page of wanted) {
    const target = path.join(root, 'docs', 'assets', 'slides', id, `${String(page).padStart(2, '0')}.webp`);
    if (!fs.existsSync(target) || fs.statSync(target).size < 1000) {
      throw new Error(`Missing or empty slide image: ${target}`);
    }
  }
  const lecturePage = path.join(root, 'docs', 'lecture', `${id}.html`);
  if (!fs.existsSync(lecturePage)) {
    throw new Error(`Missing lecture page: ${id}`);
  }
  const rendered = fs.readFileSync(lecturePage, 'utf8');
  if ([...rendered.matchAll(/<details>/g)].length !== expected) {
    throw new Error(`Lecture ${id}: expected ${expected} question boxes`);
  }
  total += expected;
}
const publicRoot = path.join(root, 'docs');
function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(d => {
    const entry = path.join(dir, d.name);
    return d.isDirectory() ? walk(entry) : [entry];
  });
}
const guidePdf = path.join(publicRoot, 'study-guide.pdf');
if (!fs.existsSync(guidePdf) || fs.statSync(guidePdf).size < 50000 ||
    fs.readFileSync(guidePdf).subarray(0, 5).toString() !== '%PDF-') {
  throw new Error('Missing or invalid study-guide.pdf');
}
const forbidden = walk(publicRoot).filter(p => p !== guidePdf && /\.(pdf|txt|tex|jpg|jpeg|png)$/i.test(p));
if (forbidden.length) throw new Error(`Unexpected source-like files in docs/: ${forbidden.join(', ')}`);
if (!fs.existsSync(path.join(root, 'guide', 'main.tex'))) throw new Error('Missing guide/main.tex');
console.log(`Verified ${chapters.length} lectures, ${total} slide sections, images and question boxes; no source files in docs/.`);
