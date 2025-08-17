/* === Unihouser — evaluaciones.js === */
(function(){
"use strict";

/* Utils */
const fmtE0 = new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const fmtN0 = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0});
const fmtN1 = new Intl.NumberFormat('es-ES',{maximumFractionDigits:1});
const id = x=>document.getElementById(x);
const parseNum = v => Number(String(v??'').replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',', '.'))||0;
const e0 = v => fmtE0.format(Number(v||0));
const toPct = v => Number(v||0);
const pct = v => fmtN1.format(Number(v||0))+' %';

const Store={
  get evals(){try{return JSON.parse(localStorage.getItem('evals')||'[]')}catch(_){return[]}},
  set evals(v){localStorage.setItem('evals',JSON.stringify(v))}
};

let data=[], view=[], sortKey='ts', sortAsc=false;

/* Carga + métricas */
function load(){
  data = (Store.evals||[]).map(x=>{
    // normaliza valores numéricos y porcentaje con 1 decimal en UI
    x.kpi_bruta = Number(x.kpi_bruta||0);
    x.kpi_neta  = Number(x.kpi_neta||0);
    x.kpi_flujo = Number(x.kpi_flujo||0);
    x.pmax      = Number(x.pmax||0);
    return x;
  });
  applyFilters();
  updateKpis();
}

function updateKpis(){
  id('k_total').textContent = data.length;
  const asig = data.filter(e=>Array.isArray(e.prospect_ids)&&e.prospect_ids.length).length;
  id('k_asig').textContent = asig;
  const br = avg(data.map(e=>e.kpi_bruta));
  const nt = avg(data.map(e=>e.kpi_neta));
  id('k_bruta').textContent = pct(br);
  id('k_neta').textContent  = pct(nt);
}
const avg = arr => arr.length? arr.reduce((a,b)=>a+Number(b||0),0)/arr.length : 0;

/* Filtros */
function applyFilters(){
  const q = (id('f_text').value||'').toLowerCase().trim();
  const tipo = id('f_tipo').value||'';
  const d1 = id('f_desde').value? new Date(id('f_desde').value) : null;
  const d2 = id('f_hasta').value? new Date(id('f_hasta').value) : null;

  view = data.filter(e=>{
    const txt = ((e.loc||'')+' '+(e.calle||'')).toLowerCase();
    if(q && !txt.includes(q)) return false;
    if(tipo && e.tipo!==tipo) return false;
    const dt = new Date(e.ts||e.id?.slice(3));
    if(d1 && dt<d1) return false;
    if(d2 && dt>d2) return false;
    return true;
  });
  sort();
  render();
}

/* Ordenación */
function sort(){
  const k=sortKey, asc=sortAsc?1:-1;
  view.sort((a,b)=>{
    const va = k==='asig' ? (a.prospect_ids||[]).length
      : k==='ts' ? new Date(a.ts||a.id?.slice(3)).getTime()
      : a[k];
    const vb = k==='asig' ? (b.prospect_ids||[]).length
      : k==='ts' ? new Date(b.ts||b.id?.slice(3)).getTime()
      : b[k];
    return (va>vb?1:va<vb?-1:0)*asc;
  });
}

/* Pintado */
function render(){
  const tb=id('tbody');
  tb.innerHTML = view.map(e=>{
    const fecha = new Date(e.ts||e.id?.slice(3)).toLocaleDateString('es-ES');
    const asig  = (e.prospect_ids||[]).length;
    return `<tr data-id="${e.id}">
      <td>${fecha}</td>
      <td>${esc(e.loc)}</td>
      <td>${esc(e.calle||'')}</td>
      <td><span class="pill">${esc(e.tipo)}</span></td>
      <td>${e0(e.precio)}</td>
      <td>${e0(Number(e.alq||0))}</td>
      <td>${pct(toPct(e.kpi_bruta))}</td>
      <td>${pct(toPct(e.kpi_neta))}</td>
      <td>${e0(e.kpi_flujo)}</td>
      <td>${e0(e.pmax)}</td>
      <td style="text-align:center">${asig}</td>
      <td>
        <button class="btn sm" data-act="open">Abrir</button>
        <button class="btn sm" data-act="del">Borrar</button>
      </td>
    </tr>`;
  }).join('');
}
function esc(s){return (s??'').toString().replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]))}

/* Acciones tabla */
function onTableClick(ev){
  const b = ev.target.closest('button[data-act]'); if(!b) return;
  const tr = ev.target.closest('tr'); if(!tr) return;
  const id = tr.dataset.id;
  const act = b.dataset.act;
  if(act==='del'){
    if(confirm('¿Borrar esta evaluación?')){
      Store.evals = (Store.evals||[]).filter(x=>x.id!==id);
      load();
    }
  }else if(act==='open'){
    // abrir Evaluar (sin pre-rellenado complejo por ahora)
    window.location.href = 'evaluar.html';
  }
}

/* Export CSV */
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
function numfmt(v){return fmtN0.format(Number(parseNum(v)||v||0))}
function pctfmt(v){return fmtN1.format(Number(v||0))}
function safe(s){return (s??'').toString().replace(/;/g,',')}
function download(name,content){
  const blob=new Blob([content],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download=name;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove()},0);
}

/* Bindings */
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
    id('f_text').value='';
    id('f_tipo').value='';
    id('f_desde').value='';
    id('f_hasta').value='';
    applyFilters();
  });
  id('b_export').addEventListener('click',()=>{
    if(!view.length){alert('Nada que exportar');return;}
    download('evaluaciones.csv',toCSV(view));
  });
  id('tbody').addEventListener('click',onTableClick);
  bindSort();
  load();
}

document.addEventListener('DOMContentLoaded',attach);
})();
