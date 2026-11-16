// 由 data/*.json 生成静态站点：index.html + d/YYYY-MM-DD.html
// 用法：node scripts/build.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const OUT_D = path.join(ROOT, 'd');
const VER = Date.now().toString(36); // 静态资源缓存版本号
const WD = ['日', '一', '二', '三', '四', '五', '六'];
const PRI = { H: '高', M: '中', L: '低' };

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const weekday = (date) => '周' + WD[new Date(date + 'T12:00:00Z').getUTCDay()];
const cnDate = (date) => { const [y, m, d] = date.split('-').map(Number); return `${y}年${m}月${d}日`; };
const stripNum = (t) => t.replace(/^\d+\.\s*/, '');
const levelOf = (t) => (t.match(/（(高|中|低)）\s*$/) || [])[1] || '';
const cleanTitle = (t) => stripNum(t).replace(/（(高|中|低)）\s*$/, '');

const days = fs.readdirSync(DATA).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')));

const head = (title, desc, rel) => `<!doctype html>
<html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%231f3864'/><path d='M7 22l6-7 5 4 7-9' stroke='%23fff' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>">
<link rel="stylesheet" href="${rel}style.css?v=${VER}">
</head><body>`;

const topbar = (rel) => `<header class="top"><a class="brand" href="${rel}index.html"><span class="logo"></span>每日财经要闻</a>
<span class="tag">影响股价的新闻 · 按板块分类 · 按优先级排序</span></header>`;

// ---------- 单日页 ----------
fs.mkdirSync(OUT_D, { recursive: true });
days.forEach((D, i) => {
  const prev = days[i - 1], next = days[i + 1];
  const nav = `<nav class="pn">
${prev ? `<a href="${prev.date}.html">‹ ${prev.date.slice(5)} ${weekday(prev.date)}</a>` : '<span></span>'}
<a class="all" href="../index.html">全部日期</a>
${next ? `<a href="${next.date}.html">${next.date.slice(5)} ${weekday(next.date)} ›</a>` : '<span></span>'}
</nav>`;
  const counts = { H: 0, M: 0, L: 0 };
  D.sectors.forEach(([, rows]) => rows.forEach((r) => counts[r[0]]++));
  const sectors = D.sectors.map(([title, rows], si) => `
<section class="sector" id="s${si + 1}">
<h3>${esc(cleanTitle(title))}${levelOf(title) ? `<span class="lv lv-${levelOf(title)}">${levelOf(title)}</span>` : ''}<small>${rows.length} 条</small></h3>
<div class="rows">
${rows.map(([p, time, news, impact]) => `<div class="row p${p}">
<span class="pri">${PRI[p]}</span><span class="time">${esc(time)}</span>
<div class="news">${esc(news)}</div><div class="impact">${esc(impact)}</div>
</div>`).join('\n')}
</div></section>`).join('\n');

  const html = head(`${cnDate(D.date)} 财经要闻`, D.conclusions.map((c) => c[0]).join(' '), '../') + topbar('../') + `
<main class="wrap">
${nav}
<h1>${cnDate(D.date)}<span class="wd">${weekday(D.date)}</span></h1>
<p class="meta">${esc(D.source)}</p>
<div class="actions"><a class="btn" href="../docx/${D.date}.docx" download>下载 Word</a>
<span class="cnt">共 ${counts.H + counts.M + counts.L} 条：高 ${counts.H} · 中 ${counts.M} · 低 ${counts.L}</span></div>

<h2>今日核心结论</h2>
<ol class="concl">${D.conclusions.map(([b, r]) => `<li><b>${esc(b)}</b>${esc(r)}</li>`).join('')}</ol>

<h2>重点事件日历</h2>
<div class="cal">${D.calendar.map(([t, e, f], k) => `<div class="ev${k < 3 ? ' hot' : ''}"><div class="t">${esc(t)}</div><div class="e">${esc(e)}</div><div class="f">${esc(f)}</div></div>`).join('')}</div>

<h2>分板块新闻</h2>
<div class="toolbar">
<div class="filter" role="group" aria-label="优先级筛选">
<button data-f="all" class="on">全部</button><button data-f="H">只看高</button><button data-f="HM">高 + 中</button>
</div>
<div class="toc">${D.sectors.map(([t], si) => `<a href="#s${si + 1}">${esc(cleanTitle(t).split(/[ /（(]/)[0])}</a>`).join('')}</div>
</div>
${sectors}
<p class="note">说明：本页根据富途牛牛快讯整理，“影响 / 涉及标的”一栏为整理者的归纳判断，仅供参考，不构成任何投资建议。</p>
${nav}
</main>
<script>
document.querySelectorAll('.filter button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.filter button').forEach(x=>x.classList.toggle('on',x===b));
  const f=b.dataset.f;
  document.querySelectorAll('.row').forEach(r=>{const p=r.className.match(/p([HML])/)[1];r.hidden=!(f==='all'||f.includes(p));});
  document.querySelectorAll('.sector').forEach(s=>s.hidden=!s.querySelector('.row:not([hidden])'));
});
</script>
</body></html>`;
  fs.writeFileSync(path.join(OUT_D, D.date + '.html'), html);
});

// ---------- 首页 ----------
const byMonth = {};
[...days].reverse().forEach((D) => { const m = D.date.slice(0, 7); (byMonth[m] = byMonth[m] || []).push(D); });
const searchIndex = days.map((D) => ({
  d: D.date,
  t: [D.conclusions.map((c) => c.join('')).join(' '), D.sectors.map(([t, rows]) => t + rows.map((r) => r[2] + r[3]).join(' ')).join(' ')].join(' '),
}));
fs.writeFileSync(path.join(ROOT, 'search.json'), JSON.stringify(searchIndex));

const latest = days[days.length - 1];
const index = head('每日财经要闻', '按日期整理的A股、港股、美股影响股价的新闻，按板块分类、按优先级排序。', '') + topbar('') + `
<main class="wrap">
<section class="hero">
<div><div class="kicker">最新 · ${cnDate(latest.date)} ${weekday(latest.date)}</div>
<ol class="concl small">${latest.conclusions.map(([b, r]) => `<li><b>${esc(b)}</b>${esc(r.length > 90 ? r.slice(0, 90) + '…' : r)}</li>`).join('')}</ol>
<a class="btn" href="d/${latest.date}.html">阅读全文 ›</a></div>
</section>
<div class="search"><input id="q" type="search" placeholder="搜索全部日期的新闻，如：英伟达、降准、光模块" autocomplete="off"><span id="qn"></span></div>
<div id="list">
${Object.entries(byMonth).map(([m, list]) => `<h2 class="month">${Number(m.slice(0, 4))}年${Number(m.slice(5))}月<small>${list.length} 期</small></h2>
<div class="cards">${list.map((D) => `<a class="card" data-d="${D.date}" href="d/${D.date}.html">
<div class="cd"><span class="day">${Number(D.date.slice(8))}</span><span class="w">${weekday(D.date)}</span></div>
<ul>${D.conclusions.slice(0, 3).map((c) => `<li>${esc(c[0].replace(/[：:]\s*$/, ''))}</li>`).join('')}</ul></a>`).join('')}</div>`).join('\n')}
</div>
<p class="note">共 ${days.length} 期 · 每期覆盖北京时间当日 00:00 至午后收盘前后 · 数据来源：富途牛牛 7×24 快讯 · 仅供参考，不构成投资建议</p>
</main>
<script>
let idx=null;const q=document.getElementById('q'),qn=document.getElementById('qn');
q.addEventListener('input',async()=>{
  const v=q.value.trim().toLowerCase();
  if(v&&!idx){try{idx=await (await fetch('search.json?v=${VER}')).json();}catch(e){idx=[];}}
  const hit=v?new Set(idx.filter(x=>x.t.toLowerCase().includes(v)).map(x=>x.d)):null;
  let n=0;document.querySelectorAll('.card').forEach(c=>{const ok=!hit||hit.has(c.dataset.d);c.hidden=!ok;if(ok)n++;});
  document.querySelectorAll('.month').forEach(h=>{const g=h.nextElementSibling;h.hidden=g.hidden=!g.querySelector('.card:not([hidden])');});
  qn.textContent=v?n+' 期包含“'+q.value.trim()+'”':'';
});
</script>
</body></html>`;
fs.writeFileSync(path.join(ROOT, 'index.html'), index);
console.log(`built ${days.length} days, latest ${latest.date}`);
