const prefix=document.body.dataset.prefix||'';
const searchDialog=document.getElementById('search-dialog');
const searchInput=document.getElementById('search-input');
const searchResults=document.getElementById('search-results');
function openSearch(){searchDialog.showModal();searchInput.focus();renderSearch('')}
document.querySelectorAll('[data-search-trigger]').forEach(b=>b.addEventListener('click',openSearch));
document.querySelectorAll('[data-search-close]').forEach(b=>b.addEventListener('click',()=>searchDialog.close()));
document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();openSearch()}});
function renderSearch(query){
  const q=query.trim().toLocaleLowerCase('ko');
  if(!q){searchResults.innerHTML='<p>찾고 싶은 개념이나 사례를 입력하세요.</p>';return}
  const words=q.split(/\s+/).filter(Boolean);
  const found=(window.GUIDE_SEARCH||[]).filter(x=>words.every(w=>`${x.title} ${x.chapterTitle} ${x.text}`.toLocaleLowerCase('ko').includes(w))).slice(0,14);
  searchResults.innerHTML=found.length?found.map(x=>`<a href="${prefix}lecture/${x.chapter}.html#s${x.slide}"><small>${x.chapter}장 · 슬라이드 ${x.slide}</small><strong>${escapeHtml(x.title)}</strong><span>${escapeHtml(searchSnippet(x.text,words))}</span></a>`).join(''):'<p>일치하는 슬라이드가 없습니다.</p>';
}
function searchSnippet(source,words){
  const lower=source.toLocaleLowerCase('ko');
  const at=lower.indexOf(words[0]);
  const start=Math.max(0,at-45);
  const end=Math.min(source.length,start+140);
  return `${start?'…':''}${source.slice(start,end)}${end<source.length?'…':''}`;
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
searchInput.addEventListener('input',()=>renderSearch(searchInput.value));
searchDialog.addEventListener('click',e=>{if(e.target===searchDialog)searchDialog.close()});

const slideDialog=document.getElementById('slide-dialog');
document.querySelectorAll('[data-zoom-src]').forEach(button=>button.addEventListener('click',()=>{
  slideDialog.querySelector('img').src=button.dataset.zoomSrc;
  slideDialog.querySelector('img').alt=button.dataset.zoomLabel;
  slideDialog.querySelector('p').textContent=button.dataset.zoomLabel;
  slideDialog.showModal();
}));
document.querySelectorAll('[data-dialog-close]').forEach(b=>b.addEventListener('click',()=>slideDialog.close()));
slideDialog.addEventListener('click',e=>{if(e.target===slideDialog)slideDialog.close()});

const sections=[...document.querySelectorAll('.slide')];
const links=[...document.querySelectorAll('[data-slide-link]')];
if(sections.length&&links.length){
  const observer=new IntersectionObserver(entries=>{
    const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
    if(!visible.length)return;
    links.forEach(a=>a.classList.toggle('is-active',a.dataset.slideLink===visible[0].target.dataset.slide));
  },{rootMargin:'-90px 0px -68% 0px'});
  sections.forEach(s=>observer.observe(s));
}
const progress=document.querySelector('.reading-progress');
function updateProgress(){const max=document.documentElement.scrollHeight-innerHeight;progress.style.width=`${max>0?Math.max(0,Math.min(100,scrollY/max*100)):0}%`}
addEventListener('scroll',updateProgress,{passive:true});updateProgress();
