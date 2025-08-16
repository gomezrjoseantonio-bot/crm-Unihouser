document.addEventListener('DOMContentLoaded', ()=>{
// Formateo en vivo y al salir del input
setupMoneyFormatting();
setupMoneyLive();

// ====== Localidades (Asturias) ======
const locSel=document.getElementById('e_loc');
fetch('data/asturias.json')
.then(r=>r.json())
.then(list=>{ locSel.innerHTML=list.map(n=>`<option>${n}</option>`).join(''); })
.catch(_=>{ locSel.innerHTML='<option>Oviedo</option>'; });

// ====== Autorrellenos desde Config ======
const cfg = Store.cfg || {};
// Notaría/Registro por defecto (con puntos de miles)
const elNot = document.getElementById('e_notaria');
if(elNot){
const defNot = Number.isFinite(cfg.c_notaria)? cfg.c_notaria : 1500;
elNot.value = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(defNot);
}

// ITP en €
const precioInp = document.getElementById('e_precio');
const itpOut = document.getElementById('e_itp_eur');
const itpPct = (Number.isFinite(cfg.c_itp)?cfg.c_itp:8)/100;
function updateITP(){
const p = parseEs(precioInp.value)||0;
if(itpOut){
itpOut.value = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(Math.round(p*itpPct));
}
}
if(precioInp){ precioInp.addEventListener('input', updateITP); updateITP(); }

// ====== Operativos autocalculados (Hogar/Impago/Gestión) ======
const alqInp = document.getElementById('e_alq');
const otrosInp = document.getElementById('e_otros');
const tipoSel = document.getElementById('e_tipo');

const hogarInp = document.getElementById('e_hogar');
const impagoInp = document.getElementById('e_impago');
const gestInp = document.getElementById('e_gestion');

function updateOperativos(){
const alq = parseEs(alqInp.value)||0;
const otros = parseEs(otrosInp.value)||0;
const alqA = (alq+otros)*12;

const pct_h = ((cfg.c_pct_hogar ?? 3.5)/100);

// >>> PUNTO 4: Impago diferente según tipo de alquiler <<<
const pct_i = (document.getElementById('e_tipo').value === 'Habitaciones'
? (Store.cfg.c_pct_impago_hab  ?? 4.0)
: (Store.cfg.c_pct_impago_trad ?? 4.0)) / 100;

const pct_g = (tipoSel.value === 'Habitaciones'
? (cfg.c_pct_g_hab ?? 25.0)
: (cfg.c_pct_g_trad ?? 15.0)) / 100;

// Solo autocompletar si el usuario NO ha tocado el campo (para permitir edición manual)
if(hogarInp && !hogarInp.dataset.touched){
hogarInp.value = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(Math.round(alqA*pct_h));
}
if(impagoInp && !impagoInp.dataset.touched){
impagoInp.value = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(Math.round(alqA*pct_i));
}
if(gestInp && !gestInp.dataset.touched){
gestInp.value = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(Math.round(alqA*pct_g));
}
}
[alqInp, otrosInp, tipoSel].forEach(el=> el && el.addEventListener('input', updateOperativos));
// Marcar como "tocado" cuando el usuario edite manualmente
[hogarInp, impagoInp, gestInp].forEach(el=> el && el.addEventListener('input', ()=> el.dataset.touched = '1'));
updateOperativos();

// ====== Precio Máximo según objetivo ======
function precioMaximo({alqA,gastos,notaria,reforma,honor,itp_pct,objTipo,objValor}){
const fix = (notaria||0)+(reforma||0)+(honor||0);
const k = 1 + (itp_pct||0);
if(objTipo==='bruta'){
// Inv = (Alquiler Anual * 100) / ObjBruta
const Inv = (alqA*100)/(objValor||6);
return Math.max(0, (Inv - fix)/k);
} else if(objTipo==='neta'){
// Inv = ((Alquiler Anual - Gastos) * 100) / ObjNeta
const Inv = ((alqA - (gastos||0))*100)/(objValor||4.5);
return Math.max(0, (Inv - fix)/k);
} else {
// Objetivo por Flujo → aproximamos usando objetivo de Neta para inversión target
const t = (cfg.c_obj_neta||4.5);
const Inv = ((alqA - (gastos||0))*100)/t;
return Math.max(0, (Inv - fix)/k);
}
}

// ====== Espejo de cliente seleccionado ======
function fillClientMirror(cli, bruta, neta, flujo){
const cm=document.getElementById('clientMirror');
if(!cm) return;
document.getElementById('cm_nombre').textContent = cli?.nombre || '—';
let label='—', real='—', goal='—', gap='—';
if(cli){
if(cli.obj_tipo==='bruta'){
label='Bruta (%)';
real = fmtN1.format(bruta)+' %';
goal = fmtN1.format(cli.obj_raw)+' %';
gap = (bruta-cli.obj_raw);
}else if(cli.obj_tipo==='neta'){
label='Neta (%)';
real = fmtN1.format(neta)+' %';
goal = fmtN1.format(cli.obj_raw)+' %';
gap = (neta-cli.obj_raw);
}else{
label='Flujo (€/mes)';
real = fmtN0.format(flujo/12)+' €';
goal = fmtN0.format(cli.obj_raw)+' €';
gap = ((flujo/12)-cli.obj_raw);
}
document.getElementById('cm_obj').textContent = label;
document.getElementById('cm_real').textContent = real;
document.getElementById('cm_goal').textContent = goal;
document.getElementById('cm_gap').textContent = (gap>=0?'+':'')+(cli.obj_tipo==='flujo'?fmtN0.format(gap):fmtN1.format(gap))+(cli.obj_tipo==='flujo'?' €':' pp');
cm.hidden=false;
} else {
cm.hidden=true;
}
}

// ====== Calcular ======
document.getElementById('e_calc').onclick=()=>{
const c = Store.cfg || {};

// Entradas base
const precio = parseEs(precioInp.value)||0;
const e_itp = (parseEs(document.getElementById('e_itp_eur').value) || (precio * ((c.c_itp??8)/100)));
const inclHonor= (document.getElementById('e_honor').value || c.c_incl_honor || 'si')==='si';
const notaria = parseEs(document.getElementById('e_notaria').value) || (c.c_notaria??1500);
const reforma = parseEs(document.getElementById('e_reforma').value)||0;
const honor = inclHonor ? 3500*1.21 : 0;

const comunidad= parseEs(document.getElementById('e_comunidad').value)||0;
const ibi = parseEs(document.getElementById('e_ibi').value)||0;
const hogar = parseEs(document.getElementById('e_hogar').value)||0;
const impago = parseEs(document.getElementById('e_impago').value)||0;
const gestion = parseEs(document.getElementById('e_gestion').value)||0;

const alq = parseEs(alqInp.value)||0;
const otros = parseEs(otrosInp.value)||0;
const alqA = (alq+otros)*12;

// Cálculos
const inversion = precio + e_itp + notaria + reforma + honor;
const gastos = comunidad + ibi + hogar + impago + gestion;
const bruta = inversion ? (alqA/inversion*100) : 0;
const neta = inversion ? ((alqA-gastos)/inversion*100) : 0;
const flujo = alqA - gastos;

// Objetivo: cliente seleccionado o Config
let objTipo='neta', objValor = (c.c_obj_neta ?? 4.5);
const sel = document.getElementById('assign_cli');
const selectedIdx = sel && sel.value ? parseInt(sel.value,10) : -1;
const cli = (selectedIdx>=0)? (Store.pros[selectedIdx]||null) : null;
if(cli){ objTipo=cli.obj_tipo; objValor=cli.obj_raw; }

// Precio máximo (en input y en resultados)
const pmax = precioMaximo({
alqA, gastos, notaria, reforma, honor,
itp_pct: (c.c_itp??8)/100, objTipo, objValor
});
const pmaxFmt = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(Math.round(pmax));
const e_pmax_inp = document.getElementById('e_pmax');
if(e_pmax_inp) e_pmax_inp.value = pmaxFmt;

// Mostrar resultados
document.getElementById('e_result').hidden=false;
document.getElementById('r_inv').textContent = e0(inversion);
document.getElementById('r_bruta').textContent = fmtN1.format(bruta)+' %';
document.getElementById('r_neta').textContent = fmtN1.format(neta)+' %';
document.getElementById('r_flujo').textContent = e0(flujo);
document.getElementById('r_pmax').textContent = e0(pmax);

// Diferenciales vs objetivos por defecto (no del cliente)
const dB = bruta - (c.c_obj_bruta ?? 6);
const dN = neta - (c.c_obj_neta ?? 4.5);
const sgn = v => (v>=0?'+':'') + fmtN1.format(v).replace('.',',') + ' pp';
document.getElementById('r_bruta_diff').textContent = '('+ sgn(dB) +')';
document.getElementById('r_neta_diff').textContent = '('+ sgn(dN) +')';

// Semáforos inline (bruta / neta / flujo)
const score=(val,obj)=>{ const diff=val-obj; const pct=obj?diff/obj*100:0; return pct>=0?'green':(pct<-5?'red':'amber'); };
document.getElementById('sb').className='dot '+score(bruta, (c.c_obj_bruta??6));
document.getElementById('sn').className='dot '+score(neta, (c.c_obj_neta ??4.5));
document.getElementById('sf').className='dot '+score(flujo, ((c.c_obj_flujo??150)*12));

// Gráfico KPI principal (Real vs Objetivo del cliente o de la Config)
const goal = (objTipo==='bruta') ? (c.c_obj_bruta ?? 6)
: (objTipo==='neta') ? (c.c_obj_neta ?? 4.5)
: (c.c_obj_flujo ?? 150);
const real = (objTipo==='bruta') ? bruta
: (objTipo==='neta') ? neta
: (flujo/12);
renderBars('chartKPI', [
{label:'Real', v:Math.max(0,real), color:'#ff6600'},
{label:'Obj', v:Math.max(0,goal), color:'#9ca3af'}
]);

// Candidatos (prospectos) filtrados por tipología y localidades objetivo
const tipoAlq = tipoSel.value;
const loc = (document.getElementById('e_loc').value||'').toLowerCase();
const candidatos=(Store.pros||[])
.filter(p=> ((p.sub||'').toLowerCase().includes('contrat')) || (['F2','F3','F4','F5'].includes(p.fase)) )
.filter(p=>{
const locs=String(p.locs_text||'').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
return locs.length===0 || locs.includes(loc);
})
.filter(p=> (p.pref_tipo||'Tradicional')===tipoAlq);

const matchBox=document.getElementById('matchList');
const selAssign=document.getElementById('assign_cli');
if(selAssign) selAssign.innerHTML='';
if(!candidatos.length){
if(matchBox) matchBox.textContent='Sin clientes potenciales';
}else{
if(matchBox) matchBox.textContent=candidatos.map(p=>`• ${p.nombre} (${p.email||'—'})`).join('\n');
candidatos.forEach((p)=>{
const idx=Store.pros.indexOf(p);
if(selAssign){
const o=document.createElement('option');
o.value=idx; o.textContent=p.nombre;
selAssign.appendChild(o);
}
});
}

// Espejo del cliente (si hay seleccionado)
fillClientMirror(cli, bruta, neta, flujo);

// Stash evaluación preparada para guardar
const url = (document.getElementById('e_url').value||'').trim();
const data = {
ts:Date.now(),
ref:`${loc} - ${(document.getElementById('e_calle').value||'').trim()}`,
loc, calle:(document.getElementById('e_calle').value||'').trim(), url,
m2:(document.getElementById('e_m2').value||'').trim(),
anio:(document.getElementById('e_anio').value||'').trim(),
asc:document.getElementById('e_asc').value,
alt:document.getElementById('e_alt').value,
bajo:document.getElementById('e_bajo').value,
habs:document.getElementById('e_habs').value,
banos:document.getElementById('e_banos').value,
tipo:tipoAlq,
precio:precio,
itp:e_itp,
notaria:notaria,
reforma:reforma,
honor:honor,
comunidad:comunidad,
ibi:ibi,
hogar:hogar,
impago:impago,
gestion:gestion,
alq_m:alq,
otros_m:otros,
alq_a:alqA,
inversion,gastos,bruta,neta,flujo,pmax
};
window.__calc__=data;
};

// Cambiar espejo al seleccionar un cliente en la lista
document.getElementById('assign_cli')?.addEventListener('change', ()=>{
if(!window.__calc__) return;
const idx=parseInt(document.getElementById('assign_cli').value||'-1',10);
const cli=(idx>=0)?(Store.pros[idx]||null):null;
fillClientMirror(cli, window.__calc__.bruta, window.__calc__.neta, window.__calc__.flujo);
});

// Limpiar formulario
document.getElementById('e_clean').onclick=()=>location.reload();

// ====== Guardar evaluación ======
function saveEval(payload, assignedIdx=null){
const evals=Store.evals||[];
const rec={...payload, id:`EV-${Date.now()}`, assigned:(assignedIdx!=null?[assignedIdx]:[]) };
evals.unshift(rec); Store.evals=evals;
alert('Evaluación guardada');
}
document.getElementById('save_only').onclick=()=>{
if(!window.__calc__) return alert('Calcula primero.');
saveEval(window.__calc__, null);
};
document.getElementById('save_assign').onclick=()=>{
if(!window.__calc__) return alert('Calcula primero.');
const idx=parseInt(document.getElementById('assign_cli').value||'-1',10);
saveEval(window.__calc__, (idx>=0?idx:null));
if(idx>=0){
const arr=Store.pros||[];
const cli=arr[idx];
cli.activos=cli.activos||[];
cli.activos.push({ref:window.__calc__.ref,url:window.__calc__.url});
Store.pros=arr;
}
};
});
