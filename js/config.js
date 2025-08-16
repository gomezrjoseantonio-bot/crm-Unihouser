document.addEventListener('DOMContentLoaded', ()=>{
  // utilidades comunes
  setupMoneyFormatting();
  setupMoneyLive();

  const $ = id => document.getElementById(id);

  // Defaults “oficiales”
  const DEFAULTS = {
    c_itp: 8,
    c_notaria: 1500,
    c_pct_hogar: 3.5,
    c_pct_impago_trad: 4.0,
    c_pct_impago_hab: 4.0,
    c_pct_g_trad: 15.0,
    c_pct_g_hab: 25.0,
    c_obj_flujo: 150
  };

  // Mezcla cfg guardada con defaults sin perder otras claves previas
  const cfg = Object.assign({}, DEFAULTS, Store.cfg || {});

  // Euros (con miles)
  $('#c_notaria').value   = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(cfg.c_notaria);
  $('#c_obj_flujo').value = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(cfg.c_obj_flujo);

  // Porcentajes (con coma decimal)
  $('#c_itp').value             = String(cfg.c_itp).replace('.', ',');
  $('#c_pct_hogar').value       = String(cfg.c_pct_hogar).replace('.', ',');
  $('#c_pct_impago_trad').value = String(cfg.c_pct_impago_trad).replace('.', ',');
  $('#c_pct_impago_hab').value  = String(cfg.c_pct_impago_hab).replace('.', ',');
  $('#c_pct_g_trad').value      = String(cfg.c_pct_g_trad).replace('.', ',');
  $('#c_pct_g_hab').value       = String(cfg.c_pct_g_hab).replace('.', ',');

  // Guardar configuración
  $('#c_save').onclick = ()=>{
    const out = {
      ...Store.cfg, // preserva cualquier otra clave histórica
      c_itp:             parseEs($('#c_itp').value)             ?? DEFAULTS.c_itp,
      c_notaria:         parseEs($('#c_notaria').value)         ?? DEFAULTS.c_notaria,
      c_pct_hogar:       parseEs($('#c_pct_hogar').value)       ?? DEFAULTS.c_pct_hogar,
      c_pct_impago_trad: parseEs($('#c_pct_impago_trad').value) ?? DEFAULTS.c_pct_impago_trad,
      c_pct_impago_hab:  parseEs($('#c_pct_impago_hab').value)  ?? DEFAULTS.c_pct_impago_hab,
      c_pct_g_trad:      parseEs($('#c_pct_g_trad').value)      ?? DEFAULTS.c_pct_g_trad,
      c_pct_g_hab:       parseEs($('#c_pct_g_hab').value)       ?? DEFAULTS.c_pct_g_hab,
      c_obj_flujo:       parseEs($('#c_obj_flujo').value)       ?? DEFAULTS.c_obj_flujo
    };
    Store.cfg = out;

    // Toast éxito
    const toast = $('#c_toast');
    toast.hidden = false;
    clearTimeout(window.__cfg_toast);
    window.__cfg_toast = setTimeout(()=> toast.hidden = true, 2200);
  };

  // Restaurar valores por defecto
  $('#c_reset').onclick = ()=>{
    // Pintar defaults en inputs
    $('#c_notaria').value   = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(DEFAULTS.c_notaria);
    $('#c_obj_flujo').value = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(DEFAULTS.c_obj_flujo);

    $('#c_itp').value             = String(DEFAULTS.c_itp).replace('.', ',');
    $('#c_pct_hogar').value       = String(DEFAULTS.c_pct_hogar).replace('.', ',');
    $('#c_pct_impago_trad').value = String(DEFAULTS.c_pct_impago_trad).replace('.', ',');
    $('#c_pct_impago_hab').value  = String(DEFAULTS.c_pct_impago_hab).replace('.', ',');
    $('#c_pct_g_trad').value      = String(DEFAULTS.c_pct_g_trad).replace('.', ',');
    $('#c_pct_g_hab').value       = String(DEFAULTS.c_pct_g_hab).replace('.', ',');

    // Guardar defaults
    Store.cfg = Object.assign({}, Store.cfg, DEFAULTS);

    // Toast
    const toast = $('#c_toast');
    toast.textContent = '✅ Configuración restaurada';
    toast.hidden = false;
    clearTimeout(window.__cfg_toast);
    window.__cfg_toast = setTimeout(()=>{
      toast.hidden = true; 
      toast.textContent = '✅ Nueva configuración guardada con éxito';
    }, 2200);
  };
});
