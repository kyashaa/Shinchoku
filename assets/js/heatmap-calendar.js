// Minimal SVG Heatmap + Click-to-view entries/YYYY-MM-DD.md
(function () {
  const DAY = 86400000;
  const COLORS = getColors();

  function getColors() {
    const dark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
    return dark
      ? ['#161b22','#0e4429','#006d32','#26a641','#39d353'] // dark
      : ['#ebedf0','#c6e48b','#7bc96f','#239a3b','#196127']; // light
  }
  const pad2 = n => String(n).padStart(2,'0');
  const fmt  = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  const startSun = d => { const x=new Date(d); x.setDate(x.getDate()-x.getDay()); return x; };
  const endSat   = d => { const x=new Date(d); x.setDate(x.getDate()+(6-x.getDay())); return x; };

  function buckets(values, maxUser) {
    const max = Math.max(1, maxUser ?? Math.max(1, ...values));
    const s = max/4; return [0, s, 2*s, 3*s, 4*s];
  }
  function level(v,b){ if(v<=0)return 0; if(v<=b[1])return 1; if(v<=b[2])return 2; if(v<=b[3])return 3; return 4; }

  async function mount(el){
    const src = el.getAttribute('data-src') || 'data/data.json';
    let obj = {};
    try{
      const res = await fetch(src, {cache:'no-cache'});
      obj = await res.json();
    }catch(e){
      el.textContent = 'data.jsonの読み込みに失敗しました'; return;
    }
    const data = new Map(Object.entries(obj).map(([k,v])=>[k, Number(v)||0]));
    if (data.size === 0){ el.textContent='データが空です'; return; }

    // 表示する年（最小の年）
    const years = [...data.keys()].map(k=>+k.slice(0,4));
    const year = Math.min(...years);

    // 値配列（スケール用）
    const y1 = new Date(year,0,1), y2 = new Date(year,11,31);
    const values = []; for(let t=y1; t<=y2; t=new Date(+t+DAY)) values.push(data.get(fmt(t))||0);
    const b = buckets(values);

    // SVGサイズ計算
    const CELL=14, GAP=3, R=3, LEFT=60, TOP=20;
    const gridStart = startSun(y1), gridEnd = endSat(y2);
    const weeks = Math.round((gridEnd-gridStart)/(DAY*7)) + 1;
    const width = weeks*(CELL+GAP) - GAP + LEFT;
    const height = 7*(CELL+GAP) - GAP + TOP;

    // SVG描画
    const NS='http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS,'svg');
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    svg.setAttribute('width',width); svg.setAttribute('height',height);

    // 月ラベル
    const monthsG = document.createElementNS(NS,'g');
    const months = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    for (let m=0;m<12;m++){
      const first = new Date(year,m,1);
      const col = Math.floor((startSun(first)-gridStart)/(DAY*7));
      const t = document.createElementNS(NS,'text');
      t.setAttribute('x', String(LEFT + col*(CELL+GAP)));
      t.setAttribute('y', '10');
      t.setAttribute('fill', '#94a3b8'); t.setAttribute('font-size','10');
      t.textContent = months[m];
      monthsG.appendChild(t);
    }
    svg.appendChild(monthsG);

    // 曜日ラベル（月・水・金）
    const wdG = document.createElementNS(NS,'g');
    const wnames = ['So','Mo','Di','Mi','Do','Fr','Sa'];
    [1,3,5].forEach(r=>{
      const t = document.createElementNS(NS,'text');
      t.setAttribute('x', String(LEFT-16));
      t.setAttribute('y', String(TOP + r*(CELL+GAP) + CELL/1.4));
      t.setAttribute('text-anchor','end');
      t.setAttribute('fill','#94a3b8'); t.setAttribute('font-size','10');
      t.textContent = wnames[r];
      wdG.appendChild(t);
    });
    svg.appendChild(wdG);

    // セル
// セル
const g = document.createElementNS(NS,'g');
for (let t = gridStart; t <= gridEnd; t = new Date(+t + DAY)) {
  if (t < y1 || t > y2) continue;

  const col = Math.floor((startSun(t) - gridStart) / (DAY * 7));
  const row = t.getDay();
  const x = LEFT + col * (CELL + GAP), y = TOP + row * (CELL + GAP);
  const dateStr = fmt(t);

  // data.json に該当キーがあるかどうかで分岐
	const hasValue = data.has(dateStr);
	const v = hasValue ? data.get(dateStr) : null;

	const rect = document.createElementNS(NS, 'rect');
	rect.setAttribute('x', x);
	rect.setAttribute('y', y);
	rect.setAttribute('width', CELL);
	rect.setAttribute('height', CELL);
	rect.setAttribute('rx', R);

	if (hasValue) {
		// 値がある日だけ色分け＆クリック有効
		rect.setAttribute('fill', COLORS[level(v, b)]);
		rect.setAttribute('title', `${dateStr} : ${v}`);
		rect.dataset.date = dateStr;
		rect.style.cursor = 'pointer';

		rect.addEventListener('click', (ev) => {
		ev.preventDefault();
		openEntry(dateStr);
		});
	} else {
		// 値がない日: 黒くしない。白地＋薄い枠、クリック無効
		rect.setAttribute('fill', '#ffffff00');   // 完全透明にしたいなら '#ffffff00'
		rect.setAttribute('stroke', '#626366ff'); // ライトグレーの枠
		rect.setAttribute('title', `${dateStr} : no entry`);
		// クリックや pointer は付けない
	}

	g.appendChild(rect);
	}
	svg.appendChild(g);


    // レジェンド
    const legend = document.createElement('div');
    legend.style.cssText='display:flex;gap:6px;align-items:center;margin:8px 0;font-size:12px;color:#94a3b8';
    legend.innerHTML = `レジェンド:` +
      COLORS.map(c=>`<span style="width:12px;height:12px;border-radius:3px;display:inline-block;background:${c};margin-left:6px"></span>`).join('');
    el.innerHTML=''; el.appendChild(legend); el.appendChild(svg);

    // URL ハッシュで直接開く（例: #2025-08-28）
    if (location.hash && /^\#\d{4}-\d{2}-\d{2}$/.test(location.hash)) {
      const h = location.hash.slice(1);
      openEntry(h);
    }
  }

  // YAML front-matter を剥がす
  function stripFrontMatter(md){
    const m = md.match(/^---\s*([\s\S]*?)\s*---\s*/);
    return m ? md.slice(m[0].length) : md;
  }

  // 相対リンク/画像の URL を entries/<date>/ 起点に補正
  function rewriteRelativeUrls(container, basePath){
    container.querySelectorAll('a[href]').forEach(a=>{
      const href = a.getAttribute('href');
      if (!href) return;
      if (/^[a-z]+:|^\/|^#/.test(href)) return; // 絶対/アンカーはそのまま
      a.setAttribute('href', basePath + href);
    });
    container.querySelectorAll('img[src]').forEach(img=>{
      const src = img.getAttribute('src');
      if (!src) return;
      if (/^[a-z]+:|^\/|^data:/.test(src)) return;
      img.setAttribute('src', basePath + src);
    });
  }

  async function openEntry(dateStr){
    const box   = document.getElementById('entry-viewer');
    const title = document.getElementById('entry-title');
    const body  = document.getElementById('entry-body');
    const close = document.getElementById('entry-close');
    if (!box || !title || !body || !close) return;

    title.textContent = dateStr;
    body.innerHTML = '読み込み中…';
    box.hidden = false;
    location.hash = dateStr; // ディープリンク

    const path = `entries/${dateStr}.md`;
    try{
      const res = await fetch(path, {cache:'no-cache'});
      if (!res.ok) throw new Error(res.statusText);
      let md = await res.text();
      md = stripFrontMatter(md);

      // Markdown → HTML（marked は <script src="assets/js/marked.min.js"> で読み込み済み）
      const html = (window.marked ? window.marked.parse(md) : `<pre>${escapeHtml(md)}</pre>`);
      body.innerHTML = html;

      // 相対 URL を entries/ を起点に補正（同じ日付内の相対パスに対応）
      rewriteRelativeUrls(body, `entries/`);

    }catch(e){
      body.textContent = `読み込みに失敗しました: ${path}`;
    }

    const onEsc = (ev)=>{ if(ev.key==='Escape'){ box.hidden = true; remove(); location.hash=''; } };
    const onClose = ()=>{ box.hidden = true; remove(); location.hash=''; };

    function remove(){
      document.removeEventListener('keydown', onEsc);
      close.removeEventListener('click', onClose);
    }
    document.addEventListener('keydown', onEsc);
    close.addEventListener('click', onClose);
  }

  function escapeHtml(s){
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    document.querySelectorAll('#heatmap').forEach(mount);
  });
})();
