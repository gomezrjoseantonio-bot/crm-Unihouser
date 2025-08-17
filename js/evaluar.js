(function(){
"use strict";

/* ====== Utils comunes ====== */
const $ = id => document.getElementById(id);
const fmtE0 = new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const fmtN0 = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0});
const fmtN1 = new Intl.NumberFormat('es-ES',{maximumFractionDigits:1});
const e0 = v => fmtE0.format(Number(v||0));
const pct1 = v => fmtN1.format(Number(v||0))+' %';
const parseEs = s => Number(String(s??'').trim().replace(/\./g,'').replace(',', '.'))||0;
const once = (el,ev,fn)=>{ el.addEventListener(ev,fn,{once:true}); };

/* ====== Store (localStorage) ====== */
const Store={
  get cfg(){ try{return JSON.parse(localStorage.getItem('cfg')||'{}')}catch(_){return{}} },
  set cfg(v){ localStorage.setItem('cfg', JSON.stringify(v)); },
  get evals(){ try{return JSON.parse(localStorage.getItem('evals')||'[]')}catch(_){return[]} },
  set evals(v){ localStorage.setItem('evals', JSON.stringify(v)); },
  get pros(){ try{return JSON.parse(localStorage.getItem('pros')||'[]')}catch(_){return[]} },
  set pros(v){ localStorage.setItem('pros', JSON.stringify(v)); }
};

/* ====== Config por defecto (fallback si no existe) ====== */
const DEF = {
  itp_pct: 8,
  notaria_eur: 1500,
  psi_eur: 4235, // con IVA
  hogar_pct: 3,  // % sobre alquiler anual
  impago_trad_pct: 5,
  impago_hab_pct: 7,
  gestion_trad_pct: 5,
  gestion_hab_pct: 10,
  objetivo_bruta_trad_pct: 10,
  objetivo_bruta_hab_pct: 12
};
function CFG(){
  const c = {...DEF, ...(Store.cfg||{})};
  // Normaliza nombres posibles de configuración antigua
  if(c.psi_total_eur) c.psi_eur = c.psi_total_eur;
  if(c.obj_bruta_trad) c.objetivo_bruta_trad_pct = c.obj_bruta_trad;
  if(c.obj_bruta_hab)  c.objetivo_bruta_hab_pct  = c.obj_bruta_hab;
  return c;
}

/* ====== Formato miles en inputs con data-money ====== */
function bindMoney(){
  document.querySelectorAll('input[data-money]').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      const digits = (inp.value||'').replace(/[^\d]/g,'');
      if(!digits){ inp.value=''; return; }
      inp.value = fmtN0.format(Number(digits));
    });
    inp.addEventListener('blur', ()=>{
      const n = parseEs(inp.value);
      inp.value = n? fmtN0.format(Math.round(n)) : '';
    });
  });
}

/* ====== Autocálculos ====== */
function autoITP_Notaria(){
  const c = CFG();
  const precio = parseEs($('e_precio').value);
  $('e_itp_eur').value = fmtN0.format(Math.round(precio * (c.itp_pct/100)));
  $('e_notaria').value = fmtN0.format(Math.round(c.notaria_eur||0));
}
function autoGastosSobreAlquiler(){
  const c = CFG();
  const tipo = ($('e_tipo').value||'Tradicional').toLowerCase();
  const alq_m = parseEs($('e_alq').value);
  const anual = alq_m*12;
  const impago_pct = (tipo.startsWith('habit')? c.impago_hab_pct : c.impago_trad_pct)||0;
  const gest_pct   = (tipo.startsWith('habit')? c.gestion_hab_pct : c.gestion_trad_pct)||0;
  const hogar_pct  = c.hogar_pct||0;

  if($('e_hogar'))  $('e_hogar').value  = fmtN0.format(Math.round(anual*hogar_pct/100));
  if($('e_impago')) $('e_impago').value = fmtN0.format(Math.round(anual*impago_pct/100));
  if($('e_gestion'))$('e_gestion').value= fmtN0.format(Math.round(anual*gest_pct/100));
}

/* ====== Precio máximo para cumplir BRUTA objetivo ====== */
function calcPMaxPorObjetivo(){
  const c = CFG();
  const tipo = ($('e_tipo').value||'Tradicional').toLowerCase();
  const objetivo = (tipo.startsWith('habit')? c.objetivo_bruta_hab_pct : c.objetivo_bruta_trad_pct)||10;

  const alq_m = parseEs($('e_alq').value);
  if(!alq_m){ $('e_pmax').value = ''; return; }
  const R = alq_m*12; // ingreso anual

  const itp = (c.itp_pct||0)/100;
  const notaria = c.notaria_eur||0;
  const psiIncluida = String(($('e_honor')?.value||'si')).toLowerCase()==='si';
  const psi = psiIncluida? (c.psi_eur||0) : 0;
  const reforma = parseEs($('e_reforma')?.value)||0;

  const T = (objetivo||10)/100;
  // P * (1+itp) + notaria + psi + reforma = R / T
  let pmax = (R/T) - (notaria + psi + reforma);
  pmax = pmax / (1+itp);
  pmax = Math.max(0, Math.floor(pmax));
  $('e_pmax').value = fmtN0.format(pmax);
  return pmax;
}

/* ====== Cálculo KPI + semáforos ====== */
function colorDot(v, target){
  if(!Number.isFinite(v)) return '⚪';
  if(target==null) target = v; // si no hay objetivo, verde si existe
  const diff = v - target;
  if(diff >= 0.5) return '🟢';
  if(diff >= -0.5) return '🟡';
  return '🔴';
}
function calcular(){
  const c = CFG();

  // Lectura
  const precio = parseEs($('e_precio').value);
  const itp_eur= parseEs($('e_itp_eur').value);
  const notaria= parseEs($('e_notaria').value);
  const reforma= parseEs($('e_reforma').value);
  const honorSi= String(($('e_honor')?.value||'si')).toLowerCase()==='si';
  const psi = honorSi? (c.psi_eur||0) : 0;

  const comunidad = parseEs($('e_comunidad').value);
  const ibi       = parseEs($('e_ibi').value);
  const hogar     = parseEs($('e_hogar').value);
  const impago    = parseEs($('e_impago').value);
  const gestion   = parseEs($('e_gestion').value);

  const alq_m     = parseEs($('e_alq').value);
  const tipo      = ($('e_tipo').value||'Tradicional').toLowerCase();

  // Inversión total (capex)
  const inv_total = precio + itp_eur + notaria + reforma + psi;

  // Ingresos y gastos anuales (opex)
  const ingreso_anual = alq_m*12;
  const gastos_anual  = comunidad + ibi + hogar + impago + gestion;

  // KPIs
  const kpi_bruta = inv_total>0 ? (ingreso_anual / inv_total) * 100 : 0;
  const kpi_neta  = inv_total>0 ? ((ingreso_anual - gastos_anual) / inv_total) * 100 : 0;
  const kpi_flujo = (ingreso_anual - gastos_anual);

  // Objetivos config
  const obj_bruta = (tipo.startsWith('habit')? c.objetivo_bruta_hab_pct : c.objetivo_bruta_trad_pct)||10;

  // Render resultados
  if($('e_result')) $('e_result').hidden = false;
  if($('r_inv')) $('r_inv').textContent = e0(inv_total);
  if($('r_bruta')) $('r_bruta').textContent = pct1(kpi_bruta);
  if($('r_neta')) $('r_neta').textContent = pct1(kpi_neta);
  if($('r_flujo')) $('r_flujo').textContent = e0(kpi_flujo);
  if($('r_pmax')){
    const pmax = calcPMaxPorObjetivo() ?? 0;
    $('r_pmax').textContent = e0(pmax);
  }

  if($('r_bruta_diff')){
    const diffB = kpi_bruta - obj_bruta;
    $('r_bruta_diff').textContent = (diffB>=0? '(+' : '(') + fmtN1.format(diffB) + ' %)';
  }
  if($('r_neta_diff')) $('r_neta_diff').textContent = ''; // sin objetivo neta por ahora

  if($('sb')) $('sb').textContent = colorDot(kpi_bruta, obj_bruta);
  if($('sn')) $('sn').textContent = colorDot(kpi_neta, kpi_neta); // si existe → verde
  if($('sf')) $('sf').textContent = colorDot(kpi_flujo, kpi_flujo>0?0:1); // verde si >0

  // Prepara match básico de prospects (muy simple)
  pintarMatches();
}

/* ====== Guardar evaluación ====== */
function recolectarDTO(){
  const dto = {
    id: 'ev_'+Date.now(),
    ts: Date.now(),
    // inmueble
    loc: $('e_loc')?.value || '',
    calle: $('e_calle')?.value || '',
    url: $('e_url')?.value || '',
    anio: $('e_anio')?.value || '',
    m2: $('e_m2')?.value || '',
    asc: $('e_asc')?.value || '',
    alt: $('e_alt')?.value || '',
    bajo:$('e_bajo')?.value || '',
    habs:$('e_habs')?.value || '',
    banos:$('e_banos')?.value || '',
    // adquisición
    precio: parseEs($('e_precio')?.value),
    itp_eur: parseEs($('e_itp_eur')?.value),
    notaria: parseEs($('e_notaria')?.value),
    reforma: parseEs($('e_reforma')?.value),
    honor: $('e_honor')?.value || 'si',
    pmax: parseEs($('e_pmax')?.value),
    // mantenimiento
    comunidad: parseEs($('e_comunidad')?.value),
    ibi: parseEs($('e_ibi')?.value),
    hogar: parseEs($('e_hogar')?.value),
    impago: parseEs($('e_impago')?.value),
    gestion: parseEs($('e_gestion')?.value),
    // explotación
    tipo: $('e_tipo')?.value || 'Tradicional',
    alq: parseEs($('e_alq')?.value),
    // KPIs mostrados
    inv_total: parseEs(($('r_inv')?.textContent||'').replace(/[^\d,.]/g,'')),
    kpi_bruta: Number(String(($('r_bruta')?.textContent||'')).replace(/[^\d,.-]/g,'').replace(',', '.'))||0,
    kpi_neta: Number(String(($('r_neta')?.textContent||'')).replace(/[^\d,.-]/g,'').replace(',', '.'))||0,
    kpi_flujo: parseEs(($('r_flujo')?.textContent||'').replace(/[^\d,.]/g,'')),
    prospect_ids:[]
  };
  return dto;
}

function guardarEvaluacion(asignar){
  const dto = recolectarDTO();
  if(!dto.alq || !dto.precio){
    alert('Completa al menos Precio y Alquiler y pulsa Calcular antes de guardar.');
    return;
  }
  const list = Store.evals||[];
  list.push(dto);
  Store.evals = list;

  // si asignar, añade el elegido en <select id="assign_cli"> (opcional)
  if(asignar && $('assign_cli')){
    const v = $('assign_cli').value;
    if(v) {
      const idx = list.findIndex(x=>x.id===dto.id);
      if(idx>=0) { list[idx].prospect_ids=[v]; Store.evals=list; }
    }
  }
  alert('Evaluación guardada');
}

/* ====== Matches muy básicos ====== */
function pintarMatches(){
  const box = $('matchList'); if(!box) return;
  const pros = Store.pros||[];
  if(!pros.length){ box.textContent='Sin clientes potenciales.'; return; }
  // listado plano (criterio mínimo: muestra todos; el refinado lo haremos en otra iteración)
  const html = pros.map(p => (p.nombre||p.email||'Cliente') + (p.pref_tipo? ' · '+p.pref_tipo:'')).join(' · ');
  box.textContent = html || '—';

  const sel = $('assign_cli');
  if(sel){
    sel.innerHTML = '';
    pros.forEach(p=>{
      const op=document.createElement('option');
      op.value = p.id||p.email||p.nombre||('c_'+Math.random().toString(36).slice(2));
      op.textContent = (p.nombre||'—') + (p.email? ' · '+p.email:'');
      sel.appendChild(op);
    });
  }
}

/* ====== Prefill desde Evaluaciones (?id=... o last_eval_id) ====== */
function prefillDesdeUrl(){
  try{
    const sp=new URLSearchParams(location.search);
    const target = sp.get('id') || localStorage.getItem('last_eval_id');
    if(!target) return;
    const e = (Store.evals||[]).find(x=>x.id===target);
    if(!e) return;

    // Vuelca campos principales
    const set = (id,val)=>{ const el=$(id); if(!el) return; el.value = (val==null?'':val); };
    set('e_loc',   e.loc);    set('e_calle', e.calle); set('e_url', e.url);
    set('e_anio',  e.anio);   set('e_m2', e.m2);       set('e_alt', e.alt);
    set('e_asc',   e.asc);    set('e_bajo', e.bajo);   set('e_habs', e.habs); set('e_banos', e.banos);
    set('e_precio',fmtN0.format(e.precio||0));
    set('e_itp_eur',fmtN0.format(e.itp_eur||0));
    set('e_notaria',fmtN0.format(e.notaria||0));
    set('e_reforma',fmtN0.format(e.reforma||0));
    set('e_honor', e.honor||'si');
    set('e_pmax', fmtN0.format(e.pmax||0));
    set('e_comunidad',fmtN0.format(e.comunidad||0));
    set('e_ibi',fmtN0.format(e.ibi||0));
    set('e_hogar',fmtN0.format(e.hogar||0));
    set('e_impago',fmtN0.format(e.impago||0));
    set('e_gestion',fmtN0.format(e.gestion||0));
    set('e_tipo', e.tipo||'Tradicional');
    set('e_alq', fmtN0.format(e.alq||0));

    // recalcula
    calcular();
  }catch(_){}
}

/* ====== Limpieza ====== */
function limpiar(){
  document.querySelectorAll('input').forEach(i=>{ if(i.type!=='button') i.value='';});
  document.querySelectorAll('select').forEach(s=>{ s.selectedIndex=0; });
  if($('e_result')) $('e_result').hidden = true;
}

/* ====== Eventos ====== */
function attach(){
  bindMoney();

  // Cuando cambian precio o tipo / alquiler → autocalcular
  $('e_precio')?.addEventListener('input', ()=>{ autoITP_Notaria(); calcPMaxPorObjetivo(); });
  $('e_alq')?.addEventListener('input', ()=>{ autoGastosSobreAlquiler(); calcPMaxPorObjetivo(); });
  $('e_tipo')?.addEventListener('change', ()=>{ autoGastosSobreAlquiler(); calcPMaxPorObjetivo(); });
  $('e_honor')?.addEventListener('change', ()=>{ calcPMaxPorObjetivo(); });

  $('e_calc')?.addEventListener('click', calcular);
  $('e_clean')?.addEventListener('click', limpiar);

  $('save_only')?.addEventListener('click', ()=>guardarEvaluacion(false));
  $('save_assign')?.addEventListener('click', ()=>guardarEvaluacion(true));

  // Prefill si venimos desde Evaluaciones
  prefillDesdeUrl();

  // Primera pasada de ITP/notaría si ya hay precio
  autoITP_Notaria();
  autoGastosSobreAlquiler();
}

document.addEventListener('DOMContentLoaded', attach);
})();
