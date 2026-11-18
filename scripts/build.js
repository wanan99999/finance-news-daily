// 每日财经要闻 —— 新版页面（预览用）。读取 data/*.json，输出到 OUT（默认仓库根目录）
// 用法：node build.js [数据仓库目录] [输出目录]
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const OUT = path.resolve(process.argv[3] || REPO);
const DATA = path.join(REPO, 'data');
const OUT_D = path.join(OUT, 'd');
const VER = Date.now().toString(36);
const WD = ['日', '一', '二', '三', '四', '五', '六'];
const PRI = { H: '高', M: '中', L: '低' };

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const weekday = (date) => '周' + WD[new Date(date + 'T12:00:00Z').getUTCDay()];
const cnDate = (date) => { const [y, m, d] = date.split('-').map(Number); return `${y}年${m}月${d}日`; };
const stripNum = (t) => t.replace(/^\d+\.\s*/, '');
const levelOf = (t) => (t.match(/（(高|中|低)）\s*$/) || [])[1] || '';
const cleanTitle = (t) => stripNum(t).replace(/（(高|中|低)）\s*$/, '');
const trimColon = (t) => t.replace(/[：:]\s*$/, '');
const countsOf = (D) => { const c = { H: 0, M: 0, L: 0 }; D.sectors.forEach(([, rows]) => rows.forEach((r) => c[r[0]]++)); return c; };
const priBar = (c, cls = '') => { const t = c.H + c.M + c.L || 1;
  return `<span class="pbar ${cls}" role="img" aria-label="高 ${c.H} 条，中 ${c.M} 条，低 ${c.L} 条">${['H', 'M', 'L'].map((k) => c[k] ? `<i class="b${k}" style="width:${(c[k] / t * 100).toFixed(1)}%"></i>` : '').join('')}</span>`; };
const priChips = (c) => ['H', 'M', 'L'].map((k) => `<span class="pc p${k}"><i></i>${PRI[k]} <b>${c[k]}</b></span>`).join('');

const days = fs.readdirSync(DATA).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')));

const head = (title, desc, rel) => `<!doctype html>
<html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@500;600;700&family=Noto+Sans+SC:wght@400;500;700;900&display=swap">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%231f3864'/><path d='M7 22l6-7 5 4 7-9' stroke='%23fff' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>">
<link rel="stylesheet" href="${rel}style.css?v=${VER}">
</head><body>`;

// 与「收盘复盘」网站互跳：首页→首页；单日页→同一天的复盘（那天没有复盘时，脚本把链接改回复盘首页）
const MR = 'https://wanan99999.github.io/market-review/';
const cross = (date) => date
  ? `<a class="xsite" id="xsite" href="${MR}d/${date}.html" data-date="${date}"><span class="xs-k">当日收盘复盘</span><span class="xs-a" aria-hidden="true">›</span></a>
<script>fetch('${MR}days.json',{cache:'no-store'}).then(r=>r.json()).then(l=>{if(!l.some(x=>x.date==='${date}')){const a=document.getElementById('xsite');a.href='${MR}';a.querySelector('.xs-k').textContent='收盘复盘';}}).catch(()=>{});</script>`
  : `<a class="xsite" href="${MR}"><span class="xs-k">收盘复盘</span><span class="xs-a" aria-hidden="true">›</span></a>`;
const topbar = (rel, date) => `<header class="top"><div class="top-in"><a class="brand" href="${rel}index.html"><span class="logo"></span>每日财经要闻</a>
<span class="tag">影响股价的新闻 · 按板块分类 · 按优先级排序</span>${cross(date)}</div></header>`;

const toTop = `<button class="totop" id="totop" type="button" aria-label="回到顶部" title="回到顶部"><span aria-hidden="true"></span>顶部</button>
<script>(function(){const b=document.getElementById('totop');const f=()=>b.classList.toggle('on',scrollY>500);addEventListener('scroll',f,{passive:true});f();
b.onclick=()=>scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});})();</script>`;

// ---------- 单日页 ----------
fs.mkdirSync(OUT_D, { recursive: true });
days.forEach((D, i) => {
  const prev = days[i - 1], next = days[i + 1], c = countsOf(D), total = c.H + c.M + c.L;
  const nav = `<nav class="pn">
${prev ? `<a class="pn-a" href="${prev.date}.html"><small>‹ 上一期</small><b>${prev.date.slice(5).replace('-', '/')} ${weekday(prev.date)}</b></a>` : '<span></span>'}
${next ? `<a class="pn-a next" href="${next.date}.html"><small>下一期 ›</small><b>${next.date.slice(5).replace('-', '/')} ${weekday(next.date)}</b></a>` : '<span></span>'}
</nav>`;
  const sectors = D.sectors.map(([title, rows], si) => {
    const lv = levelOf(title), sc = { H: 0, M: 0, L: 0 }; rows.forEach((r) => sc[r[0]]++);
    return `
<section class="sector" id="s${si + 1}">
<div class="sh"><h3>${esc(cleanTitle(title))}</h3>${lv ? `<span class="lv lv-${lv}">${lv}</span>` : ''}<span class="sh-n">${rows.length} 条</span>${priBar(sc, 'sm')}</div>
<div class="rows">
${rows.map(([p, time, news, impact]) => `<article class="row p${p}">
<span class="pri">${PRI[p]}</span><time class="time">${esc(time)}</time>
<div class="news">${esc(news)}</div><div class="impact"><span>影响</span>${esc(impact)}</div>
</article>`).join('\n')}
</div></section>`; }).join('\n');

  const html = head(`${cnDate(D.date)} 财经要闻`, D.conclusions.map((x) => x[0]).join(' '), '../') + topbar('../', D.date) + `
<main class="wrap">
<a class="back" href="../index.html">返回全部日期</a>
<header class="dhead">
  <div class="dh-date"><span class="dh-d">${Number(D.date.slice(8))}</span><span class="dh-my">${Number(D.date.slice(0, 4))} 年 ${Number(D.date.slice(5, 7))} 月<br>${weekday(D.date)}</span></div>
  <div class="dh-main"><h1>${cnDate(D.date)} 财经要闻</h1>
    <div class="dh-stats"><span class="dh-total"><b>${total}</b> 条新闻</span>${priChips(c)}</div>${priBar(c)}
  </div>
  <a class="btn" href="../docx/${D.date}.docx" download>下载 Word</a>
</header>
<p class="meta">${esc(D.source)}</p>

<section class="block"><h2><span class="h2n">01</span>今日核心结论</h2>
<ol class="concl">${D.conclusions.map(([b, r], k) => `<li><span class="cn">${k + 1}</span><div><b>${esc(trimColon(b))}</b><p>${esc(r)}</p></div></li>`).join('')}</ol></section>

<section class="block"><h2><span class="h2n">02</span>重点事件日历</h2>
<ol class="cal">${D.calendar.map(([t, e, f], k) => `<li class="ev${k < 3 ? ' hot' : ''}"><span class="t">${esc(t)}</span><span class="e">${esc(e)}</span><span class="f">${esc(f)}</span></li>`).join('')}</ol></section>

<section class="block"><h2><span class="h2n">03</span>分板块新闻</h2>
<div class="toolbar">
<div class="filter" role="group" aria-label="优先级筛选">
<button type="button" data-f="all" aria-pressed="true">全部 <small>${total}</small></button><button type="button" data-f="H" aria-pressed="false">只看高 <small>${c.H}</small></button><button type="button" data-f="HM" aria-pressed="false">高 + 中 <small>${c.H + c.M}</small></button>
</div>
<nav class="toc" aria-label="板块目录">${D.sectors.map(([t], si) => `<a href="#s${si + 1}">${esc(cleanTitle(t).split(/[ /（(]/)[0])}</a>`).join('')}</nav>
</div>
${sectors}
</section>
<p class="note">说明：本页根据富途牛牛快讯整理，“影响 / 涉及标的”一栏为整理者的归纳判断，仅供参考，不构成任何投资建议。</p>
${nav}
</main>
${toTop}
<script>
document.querySelectorAll('.filter button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.filter button').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));
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
const months = Object.keys(byMonth);
const searchIndex = days.map((D) => ({
  d: D.date,
  t: [D.conclusions.map((c) => c.join('')).join(' '), D.sectors.map(([t, rows]) => t + rows.map((r) => r[2] + r[3]).join(' ')).join(' ')].join(' '),
}));
fs.writeFileSync(path.join(OUT, 'search.json'), JSON.stringify(searchIndex));
fs.writeFileSync(path.join(OUT, 'days.json'), JSON.stringify(days.map((D) => ({ date: D.date }))));  // 供收盘复盘网站互跳时查询
// 供「市场看板」小程序首页使用：每期的前三条结论标题 + 优先级条数
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(days.map((D) => ({ date: D.date, concl: D.conclusions.slice(0, 3).map((x) => trimColon(x[0])), c: countsOf(D) }))));

const latest = days[days.length - 1], lc = countsOf(latest), lt = lc.H + lc.M + lc.L;
const card = (D) => { const c = countsOf(D);
  return `<a class="card" data-d="${D.date}" href="d/${D.date}.html">
<div class="cd"><span class="day">${Number(D.date.slice(8))}</span><span class="w">${weekday(D.date)}</span></div>
<div class="cb"><ul>${D.conclusions.slice(0, 3).map((x) => `<li>${esc(trimColon(x[0]))}</li>`).join('')}</ul>
<div class="cf">${priBar(c, 'sm')}<span>${c.H + c.M + c.L} 条 · 高 ${c.H}</span></div></div></a>`; };

const index = head('每日财经要闻', '按日期整理的A股、港股、美股影响股价的新闻，按板块分类、按优先级排序。', '') + topbar('') + `
<main class="wrap">
<section class="hero">
  <div class="hero-date"><span class="kicker"><i></i>最新一期</span><span class="hd">${Number(latest.date.slice(8))}</span>
    <span class="hm">${Number(latest.date.slice(0, 4))} 年 ${Number(latest.date.slice(5, 7))} 月 · ${weekday(latest.date)}</span>
    <div class="hero-cnt"><span><b>${lt}</b> 条新闻</span>${priChips(lc)}</div>${priBar(lc)}
    <div class="hero-btns"><a class="btn" href="d/${latest.date}.html">阅读全文</a><a class="btn ghost" href="docx/${latest.date}.docx" download>下载 Word</a></div>
  </div>
  <div class="hero-main"><h2>今日核心结论</h2>
    <ol class="hl">${latest.conclusions.map(([b, r], k) => `<li><span class="cn">${k + 1}</span><div><b>${esc(trimColon(b))}</b><p>${esc(r)}</p></div></li>`).join('')}</ol>
  </div>
</section>

<section class="archive" id="archive">
<div class="ar-h"><h2>往期要闻 <small>共 ${days.length} 期</small></h2>
<label class="search"><span class="si" aria-hidden="true"></span><input id="q" type="search" placeholder="搜索全部日期：英伟达、降准、光模块…" autocomplete="off" aria-label="搜索全部日期的新闻"></label></div>
<nav class="mnav" id="mnav" aria-label="选择月份">${months.map((m, k) => `<button type="button" class="mchip" data-m="${m}" aria-pressed="${k === 0}">${Number(m.slice(0, 4))} 年 ${Number(m.slice(5))} 月<small>${byMonth[m].length}</small></button>`).join('')}</nav>
<p class="qn" id="qn" aria-live="polite"></p>
<div id="list">
${months.map((m, k) => `<section class="mg" data-m="${m}"${k ? ' hidden' : ''}><h3 class="month">${Number(m.slice(0, 4))} 年 ${Number(m.slice(5))} 月<small>${byMonth[m].length} 期</small></h3>
<div class="cards">${byMonth[m].map(card).join('')}</div></section>`).join('\n')}
</div>
</section>
<p class="note">每期覆盖北京时间当日 00:00 至午后收盘前后 · 数据来源：富途牛牛 7×24 快讯 · 仅供参考，不构成投资建议</p>
</main>
${toTop}
<script>
(function(){
const bs=[...document.querySelectorAll('.mchip')],gs=[...document.querySelectorAll('.mg')],q=document.getElementById('q'),qn=document.getElementById('qn');
let cur=bs.length?bs[0].dataset.m:'',idx=null;
function month(m,save){if(!gs.some(g=>g.dataset.m===m))return;cur=m;bs.forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));apply();
  if(save)history.replaceState(null,'',location.pathname+location.search+'#m-'+m);}
function apply(hit){
  if(hit){let n=0;gs.forEach(g=>{let k=0;g.querySelectorAll('.card').forEach(c=>{const ok=hit.has(c.dataset.d);c.hidden=!ok;if(ok)k++;});g.hidden=!k;g.classList.add('searching');n+=k;});
    document.getElementById('mnav').hidden=true;qn.textContent=n?n+' 期包含“'+q.value.trim()+'”':'没有找到包含“'+q.value.trim()+'”的日期';return;}
  document.getElementById('mnav').hidden=false;qn.textContent='';
  gs.forEach(g=>{g.classList.remove('searching');g.hidden=g.dataset.m!==cur;g.querySelectorAll('.card').forEach(c=>c.hidden=false);});
}
bs.forEach(b=>b.onclick=()=>month(b.dataset.m,true));
q.addEventListener('input',async()=>{const v=q.value.trim().toLowerCase();
  if(!v){apply();return;}
  if(!idx){try{idx=await (await fetch('search.json?v=${VER}')).json();}catch(e){idx=[];}}
  apply(new Set(idx.filter(x=>x.t.toLowerCase().includes(v)).map(x=>x.d)));});
const h=location.hash.match(/^#m-([0-9]{4}-[0-9]{2})$/);if(h)month(h[1],false);
})();
</script>
</body></html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), index);
console.log(`built ${days.length} days, latest ${latest.date} -> ${OUT}`);
