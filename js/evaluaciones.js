/* === Unihouser — evaluaciones.js === */
(function(){
"use strict";

/* ---------- Utils & Store ---------- */
const fmtN0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const fmtN1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
const fmtE0 = new Intl.NumberFormat('es-ES', { style:'currency', currency:'EUR', maximumFractionDigits: 0 });

function id(x){ return document.getElementById(x); }
function el(t,cls){ const n=document.createElement(t); if(cls) n.className=cls; return n; }
function text(n,t){ const e=id(n); if(e) e.textContent=t; }
function esc(s){ return (s??'').toString().replace(/[<>&]/g, m => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[m])); }
function safeCSV(s){ return (s??'').toString().replace(/;/g, ','); }
function parseNum(t){
return Number(String(t??'').replace(/[^\d.,-]/g,'').replace(/\./g,'').replace(',', '.')) || 0;
}
function toast(msg, kind){
const wrap = id('toasts'); if(!wrap) return;
const d = el('div', 'toast ' + (kind||''));
d.textContent = msg;
wrap.appendChild(d);
setTimeout(()=>d.style.opacity='0',1600);
setTimeout(()=>{try{wrap.removeChild(d);}catch(_){}} ,2200);
}

const Store = {
get evals(){ try{ return JSON.parse(localStorage.getItem('evals') || '[]'); } catch(_){ return []; } },
set evals(v){ localStorage.setItem('evals', JSON.stringify(v)); },
get pros(){ try{ return JSON.parse(localStorage.getItem('pros') || '[]'); } catch(_){ return []; } },
set pros(v){ localStorage.setItem('pros', JSON.stringify(v)); },
};

/* ---------- % robusto ---------- */
/* Acepta "11,3 %", 0.113, 113 y normaliza a 11.3 */
function toPct(vRaw){
const str = (vRaw==null ? '' : String(vRaw));
let v = parseNum(str);
if(v===0 && typeof vRaw==='number') v = vRaw;

// fracción (0-1) -> %
if(v>0 && v<=1) v = v*100;

// desbocado (≥100) -> normaliza (113 -> 11.3, 1130 -> 11.3, etc.)
while(v>=100) v = v/10;

return v;
}

/* ---------- Estado tabla & filtros ---------- */
let data = [], view = [], sortKey = 'ts', sortAsc = false, openId = null;

function load(){
data = (Store.evals || []).slice().map(e => ({
...e,
asig: (e.prospect_ids || []).length,
}));
applyFilters();
}

function applyFilters(){
const q = (id('f_text')?.value || '').toLowerCase().trim();
const t = id('f_tipo')?.value || '';
const d = id('f_desde')?.value ? new Date(id('f_desde').value + 'T00:00:00Z').getTime() : 0;
const h = id('f_hasta')?.value ? new Date(id('f_hasta').value + 'T23:59:59Z').getTime() : Infinity;

view = data.filter(e=>{
const l = String(e.loc||'').toLowerCase();
const c = String(e.calle||'').toLowerCase();
const hitQ = !q || l.includes(q) || c.includes(q);
const hitT = !t || e.tipo === t;
const ts = new Date(e.ts || (e.id? e.id.slice(3): Date.now())).getTime();
const hitF = ts>=d && ts<=h;
return hitQ && hitT && hitF;
});

sort();
render();
kpis();
}

function sort(){
view.sort((a,b)=>{
const va = get(a,sortKey), vb = get(b,sortKey);
if(va<vb) return sortAsc ? -1 : 1;
if(va>vb) return sortAsc ? 1 : -1;
return 0;
});
}

function get(o,k){
if(k==='ts') return new Date(o.ts || (o.id? o.id.slice(3): Date.now())).getTime();
if(k==='precio') return Number(o.precio||0);
if(k==='alq') return Number(o.alq||0);
if(k==='kpi_bruta')return toPct(o.kpi_bruta);
if(k==='kpi_neta') return toPct(o.kpi_neta);
if(k==='kpi_flujo')return Number(parseNum(o.kpi_flujo));
if(k==='pmax') return Number(o.pmax||0);
if(k==='asig') return Number(o.asig||0);
if(k==='calle') return (o.calle||'').toString().toLowerCase();
return (o[k]||'').toString().toLowerCase();
}

/* ---------- Render ---------- */
function render(){
const tb = id('tbody'); if(!tb) return;
tb.innerHTML = '';
view.forEach(e=>{
const tr = el('tr');
const f = new Date(e.ts || (e.id? e.id.slice(3): Date.now()));
const fstr = f.toLocaleDateString('es-ES',{year:'numeric',month:'2-digit',day:'2-digit'});
const pBru = toPct(e.kpi_bruta);
const pNet = toPct(e.kpi_neta);

tr.innerHTML = `
<td>${fstr}</td>
<td>${esc(e.loc)}</td>
<td>${esc(e.calle||'')}</td>
<td><span class="badge">${esc(e.tipo||'-')}</span></td>
<td style="text-align:right">${fmtE0.format(e.precio||0)}</td>
<td style="text-align:right">${fmtE0.format(e.alq||0)}</td>
<td style="text-align:right">${fmtN1.format(pBru)} %</td>
<td style="text-align:right">${fmtN1.format(pNet)} %</td>
<td style="text-align:right">${fmtE0.format(Number(parseNum(e.kpi_flujo)))}</td>
<td style="text-align:right">${fmtE0.format(e.pmax||0)}</td>
<td style="text-align:center">${(e.prospect_ids||[]).length}</td>
<td>
<button class="btn" data-a="open" data-id="${e.id}">Abrir</button>
<button class="btn" data-a="goeval" data-id="${e.id}">Editar</button>
<button class="btn" data-a="pdf" data-id="${e.id}">PDF</button>
<button class="btn" data-a="dup" data-id="${e.id}">Duplicar</button>
<button class="btn" data-a="del" data-id="${e.id}">Eliminar</button>
</td>`;
tb.appendChild(tr);
});
}

/* ---------- KPIs ---------- */
function kpis(){
text('k_total', String(data.length));
const asig = data.reduce((a,b)=>a+(b.asig||0),0);
text('k_asig', String(asig));
const bru = avg(data.map(x=>toPct(x.kpi_bruta)));
const net = avg(data.map(x=>toPct(x.kpi_neta)));
text('k_bru', fmtN1.format(bru)+' %');
text('k_net', fmtN1.format(net)+' %');
}
function avg(arr){ if(!arr.length) return 0; return arr.reduce((a,b)=>a+(b||0),0)/arr.length; }

/* ---------- Drawer detalle & asignación ---------- */
function openDrawer(idEv){
openId = idEv;
const e = (Store.evals||[]).find(x=>x.id===idEv); if(!e) return;

text('d_fecha', new Date(e.ts || e.id?.slice(3)).toLocaleString('es-ES'));
text('d_tipo', e.tipo||'-');
text('d_loc', e.loc||'-');
text('d_calle', e.calle||'-');
text('d_precio',fmtE0.format(e.precio||0));
text('d_alq', fmtE0.format(e.alq||0));
text('d_bruta', fmtN1.format(toPct(e.kpi_bruta))+' %');
text('d_neta', fmtN1.format(toPct(e.kpi_neta))+' %');
text('d_flujo', fmtE0.format(Number(parseNum(e.kpi_flujo))));
text('d_pmax', fmtE0.format(e.pmax||0));
text('d_inv', fmtE0.format(e.inv_total||0));
id('d_url').innerHTML = e.url ? `<a href="${e.url}" target="_blank" rel="noopener">Abrir</a>` : '—';

// prospects
const wrap = id('p_list'); if(!wrap) return;
wrap.innerHTML='';
const pros = Store.pros || [];
const set = new Set(e.prospect_ids||[]);
if(!pros.length){
wrap.textContent = 'No hay prospects guardados.';
}else{
pros.forEach(p=>{
const line = el('label'); line.style.display='flex'; line.style.gap='8px'; line.style.alignItems='center';
const cb = el('input'); cb.type='checkbox'; cb.value=p.id||p.email||p.nombre; cb.checked=set.has(cb.value);
const span = el('span'); span.textContent = `${p.nombre||'—'} · ${p.pref_tipo||'-'} · ${p.locs_text||''}`;
line.appendChild(cb); line.appendChild(span); wrap.appendChild(line);
});
}

id('drawer')?.classList.add('open');
}
function closeDrawer(){ id('drawer')?.classList.remove('open'); openId=null; }

function saveAssign(){
if(!openId) return;
const list = Store.evals || [];
const idx = list.findIndex(x=>x.id===openId); if(idx<0) return;
const ch = Array.from(id('p_list').querySelectorAll('input[type=checkbox]'));
list[idx].prospect_ids = ch.filter(c=>c.checked).map(c=>c.value);
Store.evals = list;
toast('Asignación guardada','ok');
closeDrawer();
load();
}

/* ---------- Acciones tabla ---------- */
function onTableClick(e){
const b=e.target.closest('button'); if(!b) return;
const idEv = b.dataset.id, act = b.dataset.a;
if(act==='open') openDrawer(idEv);
if(act==='del') delEval(idEv);
if(act==='dup') dupEval(idEv);
if(act==='goeval') goEvaluar(idEv);
if(act==='pdf') quickPDF(idEv);
}

function delEval(idEv){
const list = Store.evals || [];
const idx = list.findIndex(x=>x.id===idEv);
if(idx<0) return;
list.splice(idx,1);
Store.evals = list;
toast('Eliminado','ok');
load();
}

function dupEval(idEv){
const list = Store.evals || [];
const it = list.find(x=>x.id===idEv); if(!it) return;
const cp = JSON.parse(JSON.stringify(it));
cp.id = 'ev_'+Date.now(); cp.ts = new Date().toISOString();
list.unshift(cp);
Store.evals = list;
toast('Duplicado','ok');
load();
}

/* ---------- Editar en Evaluar ---------- */
function goEvaluar(idEv){
const it = (Store.evals||[]).find(x=>x.id===idEv); if(!it){ toast('No encontrado','bad'); return; }
try{ sessionStorage.setItem('edit_eval', JSON.stringify(it)); }catch(_){}
location.href = 'evaluar.html?edit=' + encodeURIComponent(idEv);
}

/* ---------- PDF rápido (print window) ---------- */
function quickPDF(idEv){
const e = (Store.evals||[]).find(x=>x.id===idEv); if(!e){ toast('No encontrado','bad'); return; }
const fecha = new Date(e.ts || e.id?.slice(3)).toLocaleString('es-ES');
const html = `
<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Informe — ${esc(e.loc||'')}</title>
<style>
body{font-family:Inter,Arial; color:#101828; margin:24px}
h1{font-size:22px;margin:0 0 6px}
h2{font-size:16px;margin:16px 0 8px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.box{border:1px solid #e5e7eb;border-radius:10px;padding:10px}
.lab{font-size:12px;color:#667085}
.val{font-weight:800}
.foot{margin-top:16px;font-size:12px;color:#667085;text-align:center}
</style></head><body>
<h1>Informe BuyBox — Unihouser</h1>
<div class="lab">${fecha}</div>

<h2>Resumen financiero</h2>
<div class="grid">
<div class="box"><div class="lab">Bruta</div><div class="val">${fmtN1.format(toPct(e.kpi_bruta))} %</div></div>
<div class="box"><div class="lab">Neta</div><div class="val">${fmtN1.format(toPct(e.kpi_neta))} %</div></div>
<div class="box"><div class="lab">Flujo anual</div><div class="val">${fmtE0.format(Number(parseNum(e.kpi_flujo)))}</div></div>
<div class="box"><div class="lab">P. máx compra</div><div class="val">${fmtE0.format(e.pmax||0)}</div></div>
</div>

<h2>Datos del inmueble</h2>
<div class="grid">
<div class="box"><div class="lab">Localidad</div><div class="val">${esc(e.loc||'-')}</div></div>
<div class="box"><div class="lab">Calle</div><div class="val">${esc(e.calle||'-')}</div></div>
<div class="box"><div class="lab">Tipo</div><div class="val">${esc(e.tipo||'-')}</div></div>
<div class="box"><div class="lab">Alquiler</div><div class="val">${fmtE0.format(e.alq||0)}</div></div>
<div class="box"><div class="lab">Precio</div><div class="val">${fmtE0.format(e.precio||0)}</div></div>
<div class="box"><div class="lab">Inversión total</div><div class="val">${fmtE0.format(e.inv_total||0)}</div></div>
</div>

<div class="foot">© 2025 Unihouser · unihouser.es · info@unihouser.es · 644 300 200</div>
<script>window.onload=()=>window.print()</script>
</body></html>`;
const w = window.open('', '_blank');
w.document.open(); w.document.write(html); w.document.close();
}

/* ---------- Export CSV ---------- */
function toCSV(rows){
const headers = ["Fecha","Localidad","Calle","Tipo","Precio","Alquiler","Bruta%","Neta%","Flujo","Pmax","Asignados"];
const lines = [headers.join(';')];
rows.forEach(e=>{
const f = new Date(e.ts || e.id?.slice(3)).toLocaleDateString('es-ES');
lines.push([
f,
safeCSV(e.loc),
safeCSV(e.calle),
safeCSV(e.tipo),
numfmt(e.precio),
numfmt(e.alq),
pctfmt(toPct(e.kpi_bruta)),
pctfmt(toPct(e.kpi_neta)),
numfmt(e.kpi_flujo),
numfmt(e.pmax),
(e.prospect_ids||[]).length
].join(';'));
});
return lines.join('\n');
}
function numfmt(v){ return fmtN0.format(Number(parseNum(v)||v||0)); }
function pctfmt(v){ return fmtN1.format(Number(v||0)); }
function download(name,content){
const blob = new Blob([content],{type:'text/csv;charset=utf-8;'});
const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
document.body.appendChild(a); a.click();
setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

/* ---------- Sort binding ---------- */
function bindSort(){
const tbl = id('tbl'); if(!tbl) return;
tbl.querySelectorAll('th[data-k]').forEach(th=>{
th.addEventListener('click', ()=>{
const k = th.dataset.k;
if(sortKey===k) sortAsc = !sortAsc; else { sortKey = k; sortAsc = true; }
sort(); render();
});
});
}

/* ---------- Eventos ---------- */
function attach(){
id('b_filtrar')?.addEventListener('click', applyFilters);
id('b_limpiar')?.addEventListener('click', ()=>{
if(id('f_text')) id('f_text').value='';
if(id('f_tipo')) id('f_tipo').value='';
if(id('f_desde')) id('f_desde').value='';
if(id('f_hasta')) id('f_hasta').value='';
applyFilters();
});
id('b_export')?.addEventListener('click', ()=>{
if(!view.length){ toast('Nada que exportar','warn'); return; }
download('evaluaciones.csv', toCSV(view));
});
id('tbody')?.addEventListener('click', onTableClick);
id('d_cerrar')?.addEventListener('click', closeDrawer);
id('d_guardar')?.addEventListener('click', saveAssign);
bindSort();
load();
}

/* ---------- Start ---------- */
document.addEventListener('DOMContentLoaded', attach);

})();
