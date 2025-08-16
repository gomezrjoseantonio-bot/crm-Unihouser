// js/app.js — reemplazo completo (formatos ES y Store)

// ---------- Store (cfg, pros, evals) ----------
window.Store = {
  get cfg(){ try{return JSON.parse(localStorage.getItem('cfg')||'{}')}catch(_){return{}} },
  set cfg(v){ localStorage.setItem('cfg', JSON.stringify(v)); },

  get pros(){ try{return JSON.parse(localStorage.getItem('pros')||'[]')}catch(_){return[]} },
  set pros(v){ localStorage.setItem('pros', JSON.stringify(v)); },

  get evals(){ try{return JSON.parse(localStorage.getItem('evals')||'[]')}catch(_){return[]} },
  set evals(v){ localStorage.setItem('evals', JSON.stringify(v)); }
};

// ---------- Formateadores ES ----------
const fmtE0 = new Intl.NumberFormat('es-ES', { style:'currency', currency:'EUR', maximumFractionDigits:0 });
const fmtN0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits:0 });
const fmtN1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits:1 });

function e0(v){ return fmtE0.format(Number(v)||0); }
function n0(v){ return fmtN0.format(Number(v)||0); }
function n1(v){ return fmtN1.format(Number(v)||0); }

// Convierte textos ES a número JS (quita puntos de miles y convierte coma a punto)
function parseEs(str){
  if(str==null) return NaN;
  const s = String(str).trim();
  if(!s) return NaN;
  // Si viene “1.234.567,8” -> “1234567.8”
  const normalized = s.replace(/\./g,'').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

// ---------- EURO: formateo en vivo (miles con punto, 0 decimales) ----------
function setupMoneyLive(){
  document.querySelectorAll('input[data-money]').forEach(inp=>{
    // Al escribir: solo dígitos, formateo en miles
    inp.addEventListener('input', ()=>{
      const digits = (inp.value||'').replace(/[^\d]/g,'');
      if(!digits){ inp.value=''; return; }
      const n = Number(digits);
      inp.value = fmtN0.format(n);
    });

    // Al perder foco: normalizar por si quedó raro
    inp.addEventListener('blur', ()=>{
      const n = parseEs(inp.value);
      inp.value = Number.isFinite(n) ? fmtN0.format(Math.round(n)) : '';
    });
  });
}

// ---------- PORCENTAJE: coma decimal, 1 decimal máx, [0,100] ----------
function setupPercentLive(){
  document.querySelectorAll('input[data-percent]').forEach(inp=>{
    // Al escribir: permitir dígitos y una sola coma
    inp.addEventListener('input', ()=>{
      let v = (inp.value||'').replace(/[^0-9,]/g,'');
      const parts = v.split(',');
      if(parts.length>2){
        v = parts[0] + ',' + parts.slice(1).join('').replace(/,/g,'');
      }
      // Limitar a 1 decimal tras la coma
      const m = v.match(/^(\d{0,3})(?:,(\d{0,1}))?/); // hasta 3 enteros y 1 decimal
      if(m){
        const entero = m[1]||'';
        const dec = m[2]!=null ? ','+m[2] : '';
        v = entero + dec;
      }
      // Límite [0,100]
      const num = parseEs(v.replace(',', '.'));
      if(Number.isFinite(num)){
        if(num>100) v='100';
        if(num<0) v='0';
      }
      inp.value = v;
    });

    // Al perder foco: normalizar a 1 decimal con coma
    inp.addEventListener('blur', ()=>{
      const n = parseEs(inp.value);
      if(!Number.isFinite(n)){ inp.value=''; return; }
      const clamped = Math.max(0, Math.min(100, n));
      // 1 decimal con coma
      const s = clamped.toFixed(1).replace('.', ',');
      inp.value = s;
    });
  });
}

// ---------- Helpers de formateo “a demanda” (por si los usas en otros JS) ----------
window.e0 = e0;
window.n0 = n0;
window.n1 = n1;
window.parseEs = parseEs;
window.setupMoneyLive = setupMoneyLive;
window.setupPercentLive = setupPercentLive;

// ---------- Auto-inicialización ----------
document.addEventListener('DOMContentLoaded', ()=>{
  setupMoneyLive();
  setupPercentLive();
});
