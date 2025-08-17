/* === Unihouser — evaluar.js (persistencia + cálculos + look&feel coherente) === */
(function(){
"use strict";

/* ---------- Utils ---------- */
const fmtE0 = new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const fmtN1 = new Intl.NumberFormat('es-ES',{maximumFractionDigits:1});
function id(x){return document.getElementById(x);}
function parseEs(v){return Number(String(v??'').replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',', '.'))||0;}
function e0(n){return fmtE0.format(n||0);}
function pct(n){return fmtN1.format(n||0)+' %';}
function dot(el,cls){el.classList.remove('g','y','r');el.classList.add(cls);}
function moneyifyInputs(){
  document.querySelectorAll('input[data-money]').forEach(inp=>{
    inp.addEventListener('input',()=>{
      const digits=(inp.value||'').replace(/[^\d]/g,'');
      if(!digits){inp.value='';return;}
      inp.value=new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(Number(digits));
    });
  });
}

/* ---------- Store ---------- */
const Store={
  get cfg(){try{return JSON.parse(localStorage.getItem('cfg')||'{}')}catch(_){return{}} },
  set cfg(v){localStorage.setItem('cfg',JSON.stringify(v));},
  get evals(){try{return JSON.parse(localStorage.getItem('evals')||'[]')}catch(_){return[]} },
  set evals(v){localStorage.setItem('evals',JSON.stringify(v));}
};

/* ---------- Localidades Asturias (select) ---------- */
const AST = ["Allande","Aller","Amieva","Avilés","Belmonte de Miranda","Bimenes","Boal","Cabrales","Cabranes","Candamo","Cangas de Onís","Cangas del Narcea","Caravia","Carreño","Caso","Castrillón","Castropol","Coaña","Colunga","Corvera de Asturias","Cudillero","Degaña","Franco","Gijón","Gozón","Grado","Grandas de Salime","Ibias","Illano","Illas","Langreo","Laviana","Lena","Llanera","Llanes","Mieres","Morcín","Muros de Nalón","Nava","Navia","Noreña","Onís","Oviedo","Parres","Pesoz","Piloña","Ponga","Pravia","Proaza","Quirós","Ribadedeva","Ribadesella","Ribera de Arriba","Riosa","Salas","San Martín del Rey Aurelio","San Tirso de Abres","Santa Eulalia de Oscos","Santo Adriano","Sariego","Siero","Sobrescobio","Somiedo","SS de los Oscos","Tapia de Casariego","Taramundi","Teverga","Tineo","Valdés","Vegadeo","Villanueva de Oscos","Villaviciosa"];
function fillLocs(){
  const sel=id('e_loc'); if(!sel) return;
  sel.innerHTML = AST.map(x=><option>${x}</option>).join('');
}

/* ---------- Cálculos ---------- */
function getCfg(){
  const c=Store.cfg||{};
  return {
    itp_pct: Number(c.itp_pct ?? 8)/100,         // % ITP
    notaria: Number(c.notaria ?? 1500),          // €
    psi_eur: Number(c.psi_eur ?? 4235),          // € (con IVA)
    gest_trad_pct: Number(c.gest_trad_pct ?? 15)/100,
    gest_habs_pct: Number(c.gest_habs_pct ?? 25)/100,
    impago_pct: Number(c.impago_pct ?? 4)/100,
    hogar_pct: Number(c.hogar_pct ?? 3.5)/100,
    obj_bruta_trad: Number(c.obj_bruta_trad ?? 10)/100,
    obj_bruta_habs: Number(c.obj_bruta_habs ?? 12)/100,
  };
}

/* pmax que cumple objetivo bruto (alquiler anual / inversión = objetivo),
   despejando precio: inv = p*(1+itp) + notaría + reforma + (honor si aplica)  */
function calcPmax(alqAnual, objetivo, itp_pct, notaria, reforma, honorIncluido){
  const otros = notaria + (reforma||0) + (honorIncluido ? 0 : 0); // honor se añade en inversión solo si se incluye; aquí buscamos P de compra
  // Si el presupuesto final debe incluir honorarios, éstos van en inversión total.
  // Para resolver Pmax con honor incluido en inversión, lo restamos del lado derecho:
  const honor = honorIncluido ? (Store.cfg?.psi_eur ?? 4235) : 0;
  // inv objetivo
  const invTarget = alqAnual / (objetivo || 0.000001);
  // Pmax = (inv - notaría - reforma - honor) / (1+itp)
  return Math.max(0, (invTarget - notaria - (reforma||0) - honor) / (1+itp_pct));
}

/* ---------- Acciones ---------- */
function autocalcITP_Notaria(){
  const cfg=getCfg();
  const precio = parseEs(id('e_precio').value);
  id('e_itp_eur').value = new Intl.NumberFormat('es-ES').format(Math.round(precio * cfg.itp_pct));
  id('e_notaria').value = new Intl.NumberFormat('es-ES').format(Math.round(cfg.notaria));
}

function autocalcOperativos(){
  const cfg=getCfg();
  const tipo = id('e_tipo').value;
  const alqMes = parseEs(id('e_alq').value);
  const alqAnual = alqMes*12;

  const hogar = alqAnual * cfg.hogar_pct;
  const impago = alqAnual * cfg.impago_pct;
  const gest = alqAnual * (tipo==='Habitaciones'?cfg.gest_habs_pct:cfg.gest_trad_pct);

  id('e_hogar').value   = new Intl.NumberFormat('es-ES').format(Math.round(hogar));
  id('e_impago').value  = new Intl.NumberFormat('es-ES').format(Math.round(impago));
  id('e_gestion').value = new Intl.NumberFormat('es-ES').format(Math.round(gest));
}

function calcular(){
  const cfg = getCfg();
  const precio   = parseEs(id('e_precio').value);
  const itpEur   = Math.round(precio * cfg.itp_pct);
  const notaria  = cfg.notaria;
  const reforma  = parseEs(id('e_reforma').value);
  const honorSi  = id('e_honor').value==='si';
  const honorEUR = honorSi ? (Store.cfg?.psi_eur ?? 4235) : 0;

  const alqMes   = parseEs(id('e_alq').value);
  const alqAnual = alqMes*12;

  const comunidad= parseEs(id('e_comunidad').value);
  const ibi      = parseEs(id('e_ibi').value);
  const hogar    = parseEs(id('e_hogar').value);
  const impago   = parseEs(id('e_impago').value);
  const gestion  = parseEs(id('e_gestion').value);

  const gastosAnuales = comunidad + ibi + hogar + impago + gestion;
  const inversionTotal = precio + itpEur + notaria + reforma + honorEUR;

  const bruta = inversionTotal>0 ? (alqAnual / inversionTotal) * 100 : 0;
  const neta  = inversionTotal>0 ? ((alqAnual - gastosAnuales) / inversionTotal) * 100 : 0;
  const flujo = (alqAnual - gastosAnuales);

  // objetivo bruto según tipo
  const tipo = id('e_tipo').value;
  const objBruta = (tipo==='Habitaciones'?cfg.obj_bruta_habs:cfg.obj_bruta_trad); // en fracción
  const pmax = calcPmax(alqAnual, objBruta, cfg.itp_pct, notaria, reforma, honorSi);

  // pintar
  id('r_inv').textContent   = e0(inversionTotal);
  id('r_bruta').textContent = pct(bruta);
  id('r_neta').textContent  = pct(neta);
  id('r_flujo').textContent = e0(flujo);
  id('r_pmax').textContent  = e0(pmax);
  id('e_pmax').value        = new Intl.NumberFormat('es-ES').format(Math.round(pmax));

  // semáforos vs objetivo bruto (principal)
  const diffB = bruta - (objBruta*100);
  id('r_bruta_diff').textContent = (diffB>=0?'+':'') + fmtN1.format(diffB) + ' pts';
  dot(id('sb'), diffB>=0 ? 'g' : (diffB>-1 ? 'y' : 'r'));

  const diffN = 0; // si más adelante marcas objetivo neto, aquí el cálculo
  id('r_neta_diff').textContent = '';
  dot(id('sn'),'g');
  dot(id('sf'),'g');

  id('e_result').hidden = false;

  // guarda “último cálculo” en memoria para poder persistir con el botón Guardar
  window.__lastEval = {
    id: 'ev_'+Date.now(),
    ts: new Date().toISOString(),
    tipo,
    loc: id('e_loc').value,
    calle: id('e_calle').value,
    url: id('e_url').value,
    anio: id('e_anio').value,
    m2: id('e_m2').value,
    reforma_tip: id('e_ref_nec').value,
    alt: id('e_alt').value,
    asc: id('e_asc').value,
    bajo: id('e_bajo').value,
    habs: id('e_habs').value,
    banos: id('e_banos').value,
    precio, itp: itpEur, notaria, reforma, honor: honorEUR,
    comunidad, ibi, hogar, impago, gestion,
    alq: alqMes,
    inv_total: inversionTotal,
    kpi_bruta: bruta,
    kpi_neta:  neta,
    kpi_flujo: flujo,
    pmax
  };
}

function guardar(){
  if(!window.__lastEval){ alert('Calcula primero para poder guardar.'); return; }
  const list = Store.evals || [];
  list.unshift(window.__lastEval);
  Store.evals = list;
  // reseteo del flag
  window.__lastEval = null;
  alert('Evaluación guardada. La verás en "Evaluaciones".');
}

/* ---------- Eventos ---------- */
function clean(){
  document.querySelectorAll('input').forEach(i=>{ if(!i.readOnly) i.value=''; });
  id('e_result').hidden = true;
  window.__lastEval=null;
  autocalcITP_Notaria();
}

function attach(){
  fillLocs();
  moneyifyInputs();
  autocalcITP_Notaria();

  id('e_precio').addEventListener('input', autocalcITP_Notaria);
  id('e_alq').addEventListener('input', autocalcOperativos);
  id('e_tipo').addEventListener('change', autocalcOperativos);

  id('e_calc').addEventListener('click', calcular);
  id('e_save').addEventListener('click', guardar);
  id('e_clean').addEventListener('click', clean);
}

document.addEventListener('DOMContentLoaded', attach);
})();
