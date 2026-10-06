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

// The plotted total must equal bias² + variance + noise at every complexity.
// SVG y coordinates run downward from the horizontal zero axis.
const graph = fs.readFileSync(path.join(publicRoot, 'assets', 'figures', 'bias-variance.svg'), 'utf8');
const paths = [...graph.matchAll(/<path d="M([\d.]+) ([\d.]+) Q([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)" fill="none" stroke="(#[\da-f]+)"/g)];
const curve = color => {
  const match = paths.find(p => p[7] === color);
  if (!match) throw new Error(`Missing bias-variance graph curve: ${color}`);
  return match.slice(1, 7).map(Number);
};
const [bias, variance, sum] = ['#356185', '#b46e29', '#146d70'].map(curve);
const zero = Number(graph.match(/<line x1="95" y1="([\d.]+)" x2="760" y2="\1"/)?.[1]);
const noise = Number(graph.match(/<line x1="100" y1="([\d.]+)" x2="750" y2="\1" stroke="#a4b3be"/)?.[1]);
if (!Number.isFinite(zero) || !Number.isFinite(noise)) throw new Error('Missing bias-variance graph baseline');
const point = (p, t) => [
  (1-t)**2*p[0] + 2*t*(1-t)*p[2] + t**2*p[4],
  (1-t)**2*p[1] + 2*t*(1-t)*p[3] + t**2*p[5],
];
const errorY = t => point(sum, t)[1];
let previousBias = -Infinity;
let previousVariance = Infinity;
for (let i = 0; i <= 100; i++) {
  const t = i / 100;
  const [bx, by] = point(bias, t);
  const [vx, vy] = point(variance, t);
  const [sx, sy] = point(sum, t);
  if (Math.abs(bx-vx) > 0.01 || Math.abs(bx-sx) > 0.01 ||
      Math.abs(sy - (by + vy + noise - 2*zero)) > 0.02 ||
      sy > by || sy > vy || sy > noise ||
      by < previousBias - 0.02 || vy > previousVariance + 0.02 ||
      by > zero || vy > zero || noise > zero) {
    throw new Error(`Bias-variance graph contradicts the decomposition at t=${t}`);
  }
  previousBias = by;
  previousVariance = vy;
}
if (!(errorY(.52) > errorY(0) && errorY(.52) > errorY(1))) {
  throw new Error('Bias-variance graph does not have an interior minimum error');
}
const minimumMarker = graph.match(/<circle cx="([\d.]+)" cy="([\d.]+)" r="6" fill="#146d70"/);
const [minimumX, minimumY] = point(sum, .52);
if (!minimumMarker || Math.abs(Number(minimumMarker[1]) - minimumX) > .1 ||
    Math.abs(Number(minimumMarker[2]) - minimumY) > .1) {
  throw new Error('Bias-variance graph minimum marker is misplaced');
}
console.log(`Verified ${chapters.length} lectures, ${total} slide sections, images, question boxes and graph decomposition; no source files in docs/.`);
