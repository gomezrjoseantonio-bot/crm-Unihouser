/* === Unihouser — evaluaciones.js (drawer con asignación) === */
(function(){
"use strict";

/* ----- Utils ----- */
const id = x=>document.getElementById(x);
const fmtE0 = new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const fmtN0 = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0});
const fmtN1 = new Intl.NumberFormat('es-ES',{maximumFractionDigits:1});
const e0 = v=>fmtE0.format(Number(v||0));
const pct = v=>fmtN1.format(Number(v||0))+' %';
const parseNum = v=>Number(String(v??'').replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',', '.'))||0;
const esc = s=>(s??'').toString().replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
function toast(msg,kind){
  const wrap=id('toasts'); if(!wrap) return;
  const el=document.createElement('div'); el.className='toast '+(kind||'');
  el.textContent=msg; wrap.appendChild(el);
  setTimeout(()=>el.style.opacity='0',1600);
  setTimeout(()=>{try{wrap.removeChild(el)}catch(_){}} ,2200);
}
function toPct(raw){
  let v = Number(raw||0);
  if(v>0 && v<=1) v=v*100;
  while(v>=100) v/=10;
  return v;
}

/* ----- Store ----- */
const Store={
  get evals(){try{return JSON.parse(localStorage.getItem('evals')||'[]')}catch(_){return[]}},
  set evals(v){localStorage.setItem('evals',JSON.stringify(v))},
  get pros(){try{return JSON.parse(localStorage.getItem('pros')||'[]')}catch(_){return[]}},
  set pros(v){localStorage.setItem('pros',JSON.stringify(v))}
};

/* ----- Estado ----- */
let data=[], view=[], sortKey='ts', sortAsc=true, openId=null;

/* ----- Carga y KPIs ----- */
function load(){
  data=(Store.evals||[]).map(e=>({...e, asig:(e.prospect_ids||[]).length}));
  applyFilters();
  kpis();
}
function kpis(){
  id('k_total').textContent = data.length;
  id('k_asig').textContent  = data.reduce((a,b)=>a+(b.asig||0),0);
  id('k_bruta').textContent = pct(avg(data.map(x=>toPct(x.kpi_bruta))));
  id('k_neta').textContent  = pct(avg(data.map(x=>toPct(x.kpi_neta))));
}
const avg = arr => arr.length? arr.reduce((a,b)=>a+Number(b||0),0)/arr.length : 0;

/* ----- Filtros/orden ----- */
function applyFilters(){
  const q=(id('f_text').value||'').toLowerCase().trim();
  const t=id('f_tipo').value||'';
  const d=id('f_desde').value? new Date(id('f_desde').value+'T00:00:00Z').getTime():0;
  const h=id('f_hasta').value? new Date(id('f_hasta').value+'T23:59:59Z').getTime():Infinity;

  view=data.filter(e=>{
    const ts=new Date(e.ts||e.id?.slice(3)).getTime();
    const txt=((e.loc||'')+' '+(e.calle||'')).toLowerCase();
    return (!q || txt.includes(q)) && (!t || e.tipo===t) && ts>=d && ts<=h;
  });
  sort(); render();
}
function sort(){
  view.sort((a,b)=>{
    const va=get(a,sortKey), vb=get(b,sortKey);
    return (va<vb? -1: va>vb? 1: 0) * (sortAsc?1:-1);
  });
}
function get(o,k){
  if(k==='ts') return new Date(o.ts||o.id?.slice(3)).getTime();
  if(k==='asig') return (o.prospect_ids||[]).length;
  if(k==='kpi_bruta') return toPct(o.kpi_bruta);
  if(k==='kpi_neta')  return toPct(o.kpi_neta);
  if(k==='kpi_flujo') return Number(parseNum(o.kpi_flujo));
  if(k==='pmax')      return Number(o.pmax||0);
  if(k==='precio')    return Number(o.precio||0);
  if(k==='alq')       return Number(o.alq||0);
  if(k==='calle')     return (o.calle||'').toLowerCase();
  return (o[k]||'').toString().toLowerCase();
}

/* ----- Render tabla ----- */
function render(){
  const tb=id('tbody'); tb.innerHTML='';
  view.forEach(e=>{
    const tr=document.createElement('tr'); tr.dataset.id=e.id;
    const f=new Date(e.ts||e.id?.slice(3)).toLocaleDateString('es-ES');
    tr.innerHTML=`
      <td>${f}</td>
      <td>${esc(e.loc||'')}</td>
      <td>${esc(e.calle||'')}</td>
      <td><span class="pill">${esc(e.tipo||'-')}</span></td>
      <td style="text-align:right">${e0(e.precio)}</td>
      <td style="text-align:right">${e0(e.alq)}</td>
      <td style="text-align:right">${fmtN1.format(toPct(e.kpi_bruta))} %</td>
      <td style="text-align:right">${fmtN1.format(toPct(e.kpi_neta))} %</td>
      <td style="text-align:right">${e0(e.kpi_flujo)}</td>
      <td style="text-align:right">${e0(e.pmax)}</td>
      <td style="text-align:center">${(e.prospect_ids||[]).length}</td>
      <td>
        <button class="btn sm" data-act="ver">Ver</button>
        <button class="btn sm" data-act="del">Borrar</button>
      </td>`;
    tb.appendChild(tr);
  });
}

/* ----- Drawer detalle + asignación ----- */
function openDrawer(idEv){
  openId=idEv;
  const e=(Store.evals||[]).find(x=>x.id===idEv); if(!e) return;

  id('d_fecha').textContent=new Date(e.ts||e.id?.slice(3)).toLocaleString('es-ES');
  id('d_loc').textContent  =e.loc||'—';
  id('d_calle').textContent=e.calle||'—';
  id('d_tipo').textContent =e.tipo||'—';
  id('d_precio').textContent=e0(e.precio);
  id('d_alq').textContent   =e0(e.alq);
  id('d_bruta').textContent =fmtN1.format(toPct(e.kpi_bruta))+' %';
  id('d_neta').textContent  =fmtN1.format(toPct(e.kpi_neta))+' %';
  id('d_flujo').textContent =e0(e.kpi_flujo);
  id('d_pmax').textContent  =e0(e.pmax);
  id('d_inv').textContent   =e0(e.inv_total);
  id('d_url').innerHTML     =e.url? <a href="${e.url}" target="_blank" rel="noopener">Abrir</a>:'—';

  // listar prospects (desde localStorage.pros)
  const wrap=id('p_list'); wrap.innerHTML='';
  const pros=Store.pros||[]; const set=new Set(e.prospect_ids||[]);
  if(!pros.length){ wrap.textContent='No hay prospects guardados.'; }
  else{
    pros.forEach(p=>{
      const row=document.createElement('label');
      const cb=document.createElement('input'); cb.type='checkbox';
      cb.value=p.id||p.email||p.nombre; cb.checked=set.has(cb.value);
      const sp=document.createElement('span');
      sp.textContent=${p.nombre||'—'} · ${p.pref_tipo||'-'} · ${(p.locs_text||'')};
      row.appendChild(cb); row.appendChild(sp);
      wrap.appendChild(row);
    });
  }

  id('overlay').classList.add('open');
  id('drawer').classList.add('open');

  // acciones drawer
  id('d_guardar').onclick = saveAssign;
  id('d_pdf').onclick     = ()=>quickPDF(e.id);
  id('d_editar').onclick  = ()=>goEvaluar(e.id);
}
function closeDrawer(){
  id('overlay').classList.remove('open');
  id('drawer').classList.remove('open');
  openId=null;
}
function saveAssign(){
  if(!openId) return;
  const list=Store.evals||[];
  const idx=list.findIndex(x=>x.id===openId); if(idx<0) return;
  const choices=[...id('p_list').querySelectorAll('input[type=checkbox]')];
  list[idx].prospect_ids = choices.filter(c=>c.checked).map(c=>c.value);
  Store.evals=list;
  toast('Asignación guardada','ok');
  closeDrawer();
  load();
}

/* ----- PDF rápido ----- */
function quickPDF(idEv){
  const e=(Store.evals||[]).find(x=>x.id===idEv); if(!e){toast('No encontrado','bad');return;}
  const fecha=new Date(e.ts||e.id?.slice(3)).toLocaleString('es-ES');
  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Informe — ${esc(e.loc||'')}</title>
<style>
  body{font-family:Inter,Arial; color:#101828; margin:24px}
  h1{font-size:22px;margin:0 0 6px}
  h2{font-size:16px;margin:16px 0 8px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .box{border:1px solid #e5e7eb;border-radius:10px;padding:10px}
  .lab{font-size:12px;color:#667085}.val{font-weight:800}
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
  const w=window.open('','_blank'); w.document.open(); w.document.write(html); w.document.close();
}

/* ----- Export CSV ----- */
function toCSV(rows){
  const headers=["Fecha","Localidad","Calle","Tipo","Precio","Alquiler","Bruta%","Neta%","Flujo","Pmax","Asignados"];
  const lines=[headers.join(';')];
  rows.forEach(e=>{
    const f=new Date(e.ts||e.id?.slice(3)).toLocaleDateString('es-ES');
    lines.push([
      f, safe(e.loc), safe(e.calle), safe(e.tipo),
      numfmt(e.precio), numfmt(e.alq),
      pctfmt(toPct(e.kpi_bruta)), pctfmt(toPct(e.kpi_neta)),
      numfmt(e.kpi_flujo), numfmt(e.pmax),
      (e.prospect_ids||[]).length
    ].join(';'));
  });
  return lines.join('\n');
}
const numfmt=v=>fmtN0.format(Number(parseNum(v)||v||0));
const pctfmt=v=>fmtN1.format(Number(v||0));
const safe=s=>(s??'').toString().replace(/;/g,',');

function download(name,content){
  const blob=new Blob([content],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},0);
}

/* ----- Eventos tabla y UI ----- */
function onTableClick(ev){
  const btn=ev.target.closest('button[data-act]'); const tr=ev.target.closest('tr');
  if(!tr) return;
  const idEv=tr.dataset.id;
  if(btn){
    const act=btn.dataset.act;
    if(act==='ver') openDrawer(idEv);
    if(act==='del'){
      if(confirm('¿Borrar esta evaluación?')){
        Store.evals=(Store.evals||[]).filter(x=>x.id!==idEv);
        load();
      }
    }
  }else{
    // clic en fila -> abrir detalle
    openDrawer(idEv);
  }
}

function bindSort(){
  id('tbl').querySelectorAll('th[data-k]').forEach(th=>{
    th.addEventListener('click',()=>{
      const k=th.dataset.k;
      if(sortKey===k) sortAsc=!sortAsc; else{sortKey=k; sortAsc=true;}
      sort(); render();
    });
  });
}

function attach(){
  id('b_filtrar').addEventListener('click',applyFilters);
  id('b_limpiar').addEventListener('click',()=>{
    id('f_text').value=''; id('f_tipo').value='';
    id('f_desde').value=''; id('f_hasta').value='';
    applyFilters();
  });
  id('b_export').addEventListener('click',()=>{
    if(!view.length){toast('Nada que exportar','warn');return;}
    download('evaluaciones.csv',toCSV(view));
  });
  id('tbody').addEventListener('click',onTableClick);
  id('d_cerrar').addEventListener('click',closeDrawer);
  id('overlay').addEventListener('click',closeDrawer);
  bindSort();
  load();
}

document.addEventListener('DOMContentLoaded',attach);
})();
