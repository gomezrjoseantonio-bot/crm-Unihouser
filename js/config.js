document.addEventListener('DOMContentLoaded', ()=>{
setupMoneyFormatting(); setupMoneyLive();

const $ = id => document.getElementById(id);
const defaults = {
c_itp: 8,
c_notaria: 1500,
c_pct_hogar: 3.5,
c_pct_impago_trad: 4.0,
c_pct_impago_hab: 3.0,
c_pct_g_trad: 15.0,
c_pct_g_hab: 25.0,
c_obj_flujo: 250
};

// Cargar configuración actual o defaults
const cfg = Object.assign({}, defaults, Store.cfg || {});

// Pintar valores (con formato ES)
$('#c_itp').value = String(cfg.c_itp).replace('.', ',');
$('#c_notaria').value = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(cfg.c_notaria);
$('#c_pct_hogar').value = String(cfg.c_pct_hogar).replace('.', ',');
$('#c_pct_impago_trad').value = String(cfg.c_pct_impago_trad).replace('.', ',');
$('#c_pct_impago_hab').value = String(cfg.c_pct_impago_hab).replace('.', ',');
$('#c_pct_g_trad').value = String(cfg.c_pct_g_trad).replace('.', ',');
$('#c_pct_g_hab').value = String(cfg.c_pct_g_hab).replace('.', ',');
$('#c_obj_flujo').value = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(cfg.c_obj_flujo);

// Guardar
$('#c_save').onclick = ()=>{
const out = {
c_itp: parseEs($('#c_itp').value) ?? defaults.c_itp,
c_notaria: parseEs($('#c_notaria').value) ?? defaults.c_notaria,
c_pct_hogar: parseEs($('#c_pct_hogar').value) ?? defaults.c_pct_hogar,
c_pct_impago_trad: parseEs($('#c_pct_impago_trad').value) ?? defaults.c_pct_impago_trad,
c_pct_impago_hab: parseEs($('#c_pct_impago_hab').value) ?? defaults.c_pct_impago_hab,
c_pct_g_trad: parseEs($('#c_pct_g_trad').value) ?? defaults.c_pct_g_trad,
c_pct_g_hab: parseEs($('#c_pct_g_hab').value) ?? defaults.c_pct_g_hab,
c_obj_flujo: parseEs($('#c_obj_flujo').value) ?? defaults.c_obj_flujo,
// Mantener cualquier clave previa para no romper otras páginas
...Store.cfg
};

// Persistir
Store.cfg = out;

// Mostrar aviso éxito
const toast = $('#c_toast');
if (toast){
toast.hidden = false;
setTimeout(()=> toast.hidden = true, 2500);
}
};
});
