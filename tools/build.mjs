import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

const root = path.resolve(import.meta.dirname, '..');
const docs = path.join(root, 'docs');
const lectures = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'lectures.json'), 'utf8'));
const esc = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

function parseLecture(meta) {
  const source = fs.readFileSync(path.join(root, 'content', meta.file), 'utf8').replaceAll('\r\n','\n');
  const matches = [...source.matchAll(/^## 슬라이드 (\d{2}) · (.+)$/gm)];
  if (matches.length !== meta.count) throw new Error(`${meta.file}: expected ${meta.count} slide headings, found ${matches.length}`);
  const titleMatch = source.match(/^# (.+)$/m);
  if (!titleMatch || titleMatch[1] !== `${meta.label} · ${meta.title}`) throw new Error(`${meta.file}: chapter heading must match source label and title`);
  const intro = source.slice(titleMatch.index + titleMatch[0].length, matches[0].index).trim();
  const slides = matches.map((match, i) => ({
    number: match[1], title: match[2].trim(),
    markdown: source.slice(match.index + match[0].length, matches[i+1]?.index ?? source.length).trim(),
  }));
  slides.forEach((slide, i) => {
    if (Number(slide.number) !== i+1) throw new Error(`${meta.file}: slide ${i+1} missing`);
    if (slide.markdown.length < 100) throw new Error(`${meta.file}: slide ${slide.number} is too short`);
  });
  return {...meta, intro, slides};
}
const chapters = lectures.map(parseLecture);

function htmlWithMath(markdown) {
  const tokens = [];
  let prepared = markdown.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (_, tex) => {
    const index = tokens.push({kind:'display', tex})-1;
    return `\n\n@@MATHBLOCK${index}@@\n\n`;
  });
  prepared = prepared.replace(/(?<!\\)\$((?:\\\$|[^$\n])+?)\$/g, (_, tex) => {
    const index = tokens.push({kind:'inline', tex})-1;
    return `@@MATHINLINE${index}@@`;
  });
  let html = marked.parse(prepared, {gfm:true, breaks:false});
  html = html.replace(/<p>@@MATHBLOCK(\d+)@@<\/p>/g, (_, n) => `<div class="equation">\\[${esc(tokens[Number(n)].tex)}\\]</div>`);
  html = html.replace(/@@MATHINLINE(\d+)@@/g, (_, n) => `<span class="math-inline">\\(${esc(tokens[Number(n)].tex)}\\)</span>`);
  if (/@@MATH(?:BLOCK|INLINE)\d+@@/.test(html)) throw new Error('Unreplaced math token');
  return html;
}

function texEscape(text) {
  return text.replace(/[\\{}%&#_^~]/g, c => ({'\\':'\\textbackslash{}','{':'\\{','}':'\\}','%':'\\%','&':'\\&','#':'\\#','_':'\\_','^':'\\^{}','~':'\\~{}'}[c]));
}
function inlineTex(source) {
  let out = '';
  let i = 0;
  while (i < source.length) {
    if (source[i] === '$' && source[i-1] !== '\\') {
      let j = i+1;
      while (j < source.length && !(source[j] === '$' && source[j-1] !== '\\')) j++;
      if (j < source.length) { out += `$${source.slice(i+1,j)}$`; i=j+1; continue; }
    }
    if (source.startsWith('**',i)) {
      const j=source.indexOf('**',i+2);
      if (j>=0) { out += `\\textbf{${inlineTex(source.slice(i+2,j))}}`; i=j+2; continue; }
    }
    if (source[i] === '`') {
      const j=source.indexOf('`',i+1);
      if (j>=0) { out += `\\texttt{${texEscape(source.slice(i+1,j))}}`; i=j+1; continue; }
    }
    if (source[i] === '[') {
      const link=source.slice(i).match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
      if (link) { out += `\\href{${link[2]}}{${texEscape(link[1])}}`; i+=link[0].length; continue; }
    }
    let j=i+1;
    while (j<source.length && !['$','*','`','['].includes(source[j])) j++;
    out += texEscape(source.slice(i,j));
    i=j;
  }
  return out;
}
function markdownToTex(markdown) {
  const lines = markdown.replaceAll('\r\n','\n').split('\n');
  const output = [];
  for (let i=0; i<lines.length; i++) {
    let line=lines[i].trim();
    if (!line) { output.push(''); continue; }
    if (line === '$$') {
      const block=[];
      i++;
      while (i<lines.length && lines[i].trim() !== '$$') { block.push(lines[i]); i++; }
      if (i>=lines.length) throw new Error('Unclosed display math');
      output.push('\\[', ...block, '\\]');
      continue;
    }
    if (line.startsWith('<details>')) {
      const m=line.match(/^<details><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>$/);
      if (!m) throw new Error(`Unsupported details format: ${line.slice(0,80)}`);
      output.push(`\\begin{samepage}\\par\\medskip\\noindent\\textbf{질문: ${inlineTex(m[1])}}\\quad ${inlineTex(m[2])}\\par\\end{samepage}`);
      continue;
    }
    if (line.startsWith('|')) {
      const rows=[];
      while (i<lines.length && lines[i].trim().startsWith('|')) {
        const cells=lines[i].trim().slice(1,-1).split('|').map(s=>s.trim());
        if (!cells.every(c=>/^:?-{3,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      i--;
      const count=rows[0].length;
      if (![3,6].includes(count) || rows.some(row=>row.length!==count)) throw new Error(`Unsupported table width: ${count}`);
      const widths=count===3
        ? 'p{0.22\\linewidth}p{0.32\\linewidth}p{0.32\\linewidth}'
        : 'p{0.13\\linewidth}p{0.12\\linewidth}p{0.15\\linewidth}p{0.19\\linewidth}p{0.14\\linewidth}p{0.18\\linewidth}';
      const size=count===3 ? '\\small' : '\\footnotesize\\setlength{\\tabcolsep}{3pt}';
      output.push(`\\begin{center}${size}\\begin{longtable}{${widths}}\\hline`);
      rows.forEach((row,n)=>output.push(`${row.map(inlineTex).join(' & ')} \\\\${n===0?' \\hline':''}`));
      output.push('\\hline\\end{longtable}\\end{center}\\normalsize');
      continue;
    }
    if (line.startsWith('- ')) { output.push(`\\noindent\\textbullet\ ${inlineTex(line.slice(2))}\\par`); continue; }
    output.push(`${inlineTex(line)}\\par`);
  }
  return output.join('\n');
}

function writeTex() {
  const preamble = String.raw`\documentclass[11pt,a4paper]{article}
\usepackage{fontspec}
\setmainfont{Malgun Gothic}
\setlength{\oddsidemargin}{0pt}
\setlength{\evensidemargin}{0pt}
\setlength{\textwidth}{6.4in}
\setlength{\topmargin}{-0.35in}
\setlength{\textheight}{9.5in}
\XeTeXlinebreaklocale "ko"
\XeTeXlinebreakskip=0pt plus 1pt
\usepackage{amsmath,amssymb}
\usepackage{longtable,array}
\usepackage{needspace}
\usepackage{xcolor}
\newcommand{\href}[2]{#2\footnote{\texttt{\detokenize{#1}}}}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0.55em}
\emergencystretch=3em
\setcounter{tocdepth}{2}
\setcounter{secnumdepth}{0}
\renewcommand{\contentsname}{목차}
\makeatletter\renewcommand{\@pnumwidth}{2em}\makeatother
\renewcommand{\arraystretch}{1.25}
\begin{document}
\begin{titlepage}
\centering
\vspace*{3cm}
{\Large AI 금융경제\par}
\vspace{1.2cm}
{\Huge\bfseries 슬라이드별 학습 가이드\par}
\vspace{1.2cm}
{\large 값싼 예측에서 채권 위험프리미엄까지\par}
\vfill
{\large 2026년 2학기\par}
\end{titlepage}
\tableofcontents
\clearpage
`;
  let body='';
  for (const chapter of chapters) {
    body += `\n\\Needspace{14\\baselineskip}\n\\section{${texEscape(`${chapter.label} · ${chapter.title}`)}}\n`;
    body += markdownToTex(chapter.intro)+'\n';
    for (const slide of chapter.slides) {
      body += `\n\\Needspace{6\\baselineskip}\n\\subsection{${texEscape(`슬라이드 ${slide.number} · ${slide.title}`)}}\n`;
      body += markdownToTex(slide.markdown)+'\n';
    }
  }
  fs.mkdirSync(path.join(root,'guide'),{recursive:true});
  fs.writeFileSync(path.join(root,'guide','main.tex'), preamble+body+'\n\\end{document}\n','utf8');
}

const diagramMap = {'01-07':'decision-value.svg','03-24':'bias-variance.svg','04-49':'multiple-testing.svg'};
const navCards = current => chapters.map(c => `<a class="chapter-link ${current===c.slug?'is-current':''}" href="${current?'../':''}lecture/${c.slug}.html" title="${esc(c.title)}"${current===c.slug?' aria-current="page"':''}>${esc(c.label)}</a>`).join('');
const mathjax = `<script>window.MathJax={tex:{inlineMath:[['\\\\(','\\\\)']],displayMath:[['\\\\[','\\\\]']]},options:{skipHtmlTags:['script','noscript','style','textarea','pre','code']}};</script><script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>`;
function shell(title, body, {prefix='', current=''}={}) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="AI 금융경제 — 슬라이드별 한국어 학습 가이드"><title>${esc(title)} · AI 금융경제</title><link rel="stylesheet" href="${prefix}assets/site.css">${mathjax}</head><body data-prefix="${prefix}"><div class="reading-progress" aria-hidden="true"></div><header class="site-header"><a class="brand" href="${prefix}index.html"><span class="brand-mark">ƒ</span><span>AI 금융경제</span></a><span class="header-divider"></span><span class="header-subtitle">슬라이드별 학습 가이드</span><a class="pdf-link" href="${prefix}study-guide.pdf" download>PDF 가이드 ↓</a><button type="button" class="search-trigger" data-search-trigger aria-label="전체 검색 열기"><span>⌕</span> 검색 <kbd>/</kbd></button></header>${body}<dialog id="slide-dialog" class="slide-dialog" aria-label="슬라이드 이미지 확대"><button type="button" class="dialog-close" data-dialog-close aria-label="이미지 닫기">×</button><img alt=""><div class="slide-dialog-bar"><button type="button" data-dialog-prev aria-label="이전 슬라이드">← 이전</button><p aria-live="polite"></p><button type="button" data-dialog-next aria-label="다음 슬라이드">다음 →</button></div></dialog><dialog id="search-dialog" class="search-dialog"><div class="search-panel"><div class="search-input-row"><span>⌕</span><input type="search" id="search-input" placeholder="개념, 사례, 수식 검색" aria-label="전체 내용 검색"><button type="button" data-search-close aria-label="검색 닫기">×</button></div><div id="search-results" class="search-results"></div><p class="search-hint">슬라이드 제목과 설명을 함께 검색합니다. Esc로 닫기</p></div></dialog><script src="${prefix}assets/search-index.js"></script><script src="${prefix}assets/site.js"></script></body></html>`;
}

function writeIndex() {
  const cards=chapters.map(c=>`<a class="overview-card card-${c.color}" href="lecture/${c.slug}.html"><div class="overview-card-top"><span>${c.label}</span><span>${c.count}개 슬라이드</span></div><h3>${esc(c.title)}</h3><p>${esc(c.short)}</p><div class="card-arrow">학습하기 <span>↗</span></div></a>`).join('');
  const body=`<main class="home-main"><section class="home-hero"><div class="eyebrow">AI 금융경제</div><h1>값싼 예측에서<br><em>금융시장의 작동</em>까지</h1><p>AI가 바꾸는 의사결정의 경제학에서 출발해 금융 텍스트, 수익률 예측과 종목 간 차이를 읽는다. 레버리지 ETF의 가격과 일일 리밸런싱을 살핀 뒤, 머신러닝의 주식 수익률 예측과 채권 위험프리미엄으로 이어진다.</p><div class="hero-actions"><a class="primary-button" href="lecture/session-1a.html">처음부터 읽기 <span>→</span></a><a class="pdf-link" href="study-guide.pdf" download>PDF 내려받기 ↓</a><span>${chapters.length}개 장 · ${chapters.reduce((n,c)=>n+c.count,0)}개 슬라이드</span></div><div class="hero-formula" aria-label="표본외 결정계수">\\[R^2_{\\mathrm{OOS}}=1-\\frac{\\mathrm{SSE}_{\\mathrm{model}}}{\\mathrm{SSE}_{\\mathrm{benchmark}}}\\]</div></section><section class="learning-path"><div class="section-kicker">학습 경로</div><h2>예측에서 금융상품과 채권까지</h2><div class="path-line"><span>예측의 가치</span><b>→</b><span>언어모형</span><b>→</b><span>정규화와 검증</span><b>→</b><span>자산가격의 횡단면</span><b>→</b><span>레버리지 ETF</span><b>→</b><span>머신러닝 실증</span><b>→</b><span>채권 위험프리미엄</span></div><div class="overview-grid">${cards}</div></section><section class="home-note"><h2>읽는 방법</h2><p>각 슬라이드 이미지를 먼저 보고 오른쪽 해설을 따라가세요. 수식은 가정과 단위를 확인한 뒤 각 등호가 왜 성립하는지 읽고, 핵심 개념에 붙은 추가 질문은 필요할 때 펼쳐 보세요.</p></section><footer class="site-footer">AI 금융경제 · 2026-2</footer></main>`;
  fs.writeFileSync(path.join(docs,'index.html'),shell('전체 목차',body));
}
function writeLecture(chapter,index) {
  const sidebar=`<aside class="sidebar"><a class="sidebar-home" href="../index.html">← 전체 목차</a><div class="sidebar-label">강의</div><nav aria-label="강의 목록" class="chapter-nav">${navCards(chapter.slug)}</nav><div class="sidebar-label sidebar-label-slides">이 장의 슬라이드</div><nav aria-label="슬라이드 목차" class="slide-nav">${chapter.slides.map(s=>`<a href="#s${s.number}" data-slide-link="${s.number}"><span>${s.number}</span>${esc(s.title)}</a>`).join('')}</nav></aside>`;
  const sections=chapter.slides.map(s=>{
    const image=`../assets/slides/${chapter.id}/${s.number}.webp`;
    const diagram=diagramMap[`${chapter.id}-${s.number}`];
    const diagramHtml=diagram?`<figure class="concept-figure"><img src="../assets/figures/${diagram}" alt="${esc(s.title)} 관련 개념 도식" loading="lazy"></figure>`:'';
    return `<section class="slide" id="s${s.number}" data-slide="${s.number}"><div class="slide-heading"><span class="slide-index">${chapter.label} · ${s.number}</span><h2>${esc(s.title)}</h2></div><div class="slide-grid"><figure class="slide-figure"><button type="button" class="slide-image-button" data-zoom-src="${image}" data-zoom-label="${chapter.label} 슬라이드 ${s.number}: ${esc(s.title)}" aria-label="슬라이드 ${s.number} 이미지 확대"><img src="${image}" alt="${chapter.label} 슬라이드 ${s.number}: ${esc(s.title)}" width="1600" height="901" loading="lazy" decoding="async"><span class="zoom-hint">확대해서 보기 ↗</span></button><figcaption>${chapter.label} · 슬라이드 ${s.number}</figcaption></figure><div class="explanation">${htmlWithMath(s.markdown)}${diagramHtml}</div></div></section>`;
  }).join('');
  const previous=chapters[index-1]; const next=chapters[index+1];
  const pager=`<nav class="chapter-pager" aria-label="이전·다음 장">${previous?`<a href="${previous.slug}.html"><small>이전 장</small><strong>← ${esc(previous.label)} · ${esc(previous.title)}</strong></a>`:'<span></span>'}${next?`<a href="${next.slug}.html"><small>다음 장</small><strong>${esc(next.label)} · ${esc(next.title)} →</strong></a>`:'<span></span>'}</nav>`;
  const main=`<div class="layout">${sidebar}<main class="lecture-main"><section class="lecture-hero"><div class="eyebrow">${chapter.label} · ${chapter.count}개 슬라이드</div><h1>${esc(chapter.title)}</h1><div class="lecture-intro">${htmlWithMath(chapter.intro)}</div><div class="lecture-start"><a href="#s01">첫 슬라이드로 내려가기 ↓</a><span>슬라이드 01–${chapter.count}</span></div></section>${sections}${pager}<footer class="site-footer">AI 금융경제 · 2026-2</footer></main></div>`;
  fs.writeFileSync(path.join(docs,'lecture',`${chapter.slug}.html`),shell(`${chapter.label} · ${chapter.title}`,main,{prefix:'../',current:chapter.slug}));
}

fs.mkdirSync(path.join(docs,'lecture'),{recursive:true});
fs.mkdirSync(path.join(docs,'assets'),{recursive:true});
writeTex();
writeIndex();
chapters.forEach(writeLecture);
for (const chapter of chapters) {
  if (chapter.legacy === false) continue;
  const target = `${chapter.slug}.html`;
  const redirect = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="canonical" href="${target}"><title>${chapter.label} · AI 금융경제</title></head><body><script>location.replace(${JSON.stringify(target)}+location.search+location.hash)</script><a href="${target}">${chapter.label} 열기</a></body></html>`;
  fs.writeFileSync(path.join(docs,'lecture',`${chapter.id}.html`),redirect,'utf8');
}
const search=chapters.flatMap(c=>c.slides.map(s=>({chapter:c.slug, chapterLabel:c.label, chapterTitle:c.title, slide:s.number, title:s.title, text:s.markdown.replace(/<[^>]+>|\$\$?/g,' ').replace(/[*_`#|\\]/g,' ').replace(/\s+/g,' ')})));
fs.writeFileSync(path.join(docs,'assets','search-index.js'),`window.GUIDE_SEARCH=${JSON.stringify(search)};\n`);
console.log(`Built ${chapters.length} lecture pages, ${chapters.reduce((n,c)=>n+c.count,0)} slide sections, and guide/main.tex`);
