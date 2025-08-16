document.addEventListener('DOMContentLoaded', ()=>{
  // Asegura utilidades disponibles (evita fallos si app.js aún no cargó)
  if (typeof setupMoneyFormatting === 'function') setupMoneyFormatting();
  if (typeof setupMoneyLive === 'function') setupMoneyLive();

  const $ = id => document.getElementById(id);
  function getVal(id){ const el=$(id); return el?el.value:''; }
  function setVal(id,v){ const el=$(id); if(el) el.value=v; }

  // Defaults
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

  // Carga cfg
  const cfg = Object.assign({}, DEFAULTS, (window.Store?.cfg)||{});

  // Pintar (euros con miles)
  setVal('c_notaria', new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(cfg.c_notaria));
  setVal('c_obj_flujo', new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(cfg.c_obj_flujo));

  // Pintar (porcentajes con coma)
  setVal('c_itp', String(cfg.c_itp).replace('.', ','));
  setVal('c_pct_hogar', String(cfg.c_pct_hogar).replace('.', ','));
  setVal('c_pct_impago_trad', String(cfg.c_pct_impago_trad).replace('.', ','));
  setVal('c_pct_impago_hab', String(cfg.c_pct_impago_hab).replace('.', ','));
  setVal('c_pct_g_trad', String(cfg.c_pct_g_trad).replace('.', ','));
  setVal('c_pct_g_hab', String(cfg.c_pct_g_hab).replace('.', ','));

  // Guardar
  const btnSave = $('c_save');
  if(btnSave){
    btnSave.addEventListener('click', ()=>{
      const out = {
        ...(window.Store?.cfg||{}),
        c_itp:             parseEs(getVal('c_itp'))             ?? DEFAULTS.c_itp,
        c_notaria:         parseEs(getVal('c_notaria'))         ?? DEFAULTS.c_notaria,
        c_pct_hogar:       parseEs(getVal('c_pct_hogar'))       ?? DEFAULTS.c_pct_hogar,
        c_pct_impago_trad: parseEs(getVal('c_pct_impago_trad')) ?? DEFAULTS.c_pct_impago_trad,
        c_pct_impago_hab:  parseEs(getVal('c_pct_impago_hab'))  ?? DEFAULTS.c_pct_impago_hab,
        c_pct_g_trad:      parseEs(getVal('c_pct_g_trad'))      ?? DEFAULTS.c_pct_g_trad,
        c_pct_g_hab:       parseEs(getVal('c_pct_g_hab'))       ?? DEFAULTS.c_pct_g_hab,
        c_obj_flujo:       parseEs(getVal('c_obj_flujo'))       ?? DEFAULTS.c_obj_flujo
      };
      if(window.Store) window.Store.cfg = out;
      showToast('✅ Nueva configuración guardada con éxito');
    });
  }

  // Reset
  const btnReset = $('c_reset');
  if(btnReset){
    btnReset.addEventListener('click', ()=>{
      // Pintar defaults
      setVal('c_notaria', new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(DEFAULTS.c_notaria));
      setVal('c_obj_flujo', new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(DEFAULTS.c_obj_flujo));

      setVal('c_itp', String(DEFAULTS.c_itp).replace('.', ','));
      setVal('c_pct_hogar', String(DEFAULTS.c_pct_hogar).replace('.', ','));
      setVal('c_pct_impago_trad', String(DEFAULTS.c_pct_impago_trad).replace('.', ','));
      setVal('c_pct_impago_hab', String(DEFAULTS.c_pct_impago_hab).replace('.', ','));
      setVal('c_pct_g_trad', String(DEFAULTS.c_pct_g_trad).replace('.', ','));
      setVal('c_pct_g_hab', String(DEFAULTS.c_pct_g_hab).replace('.', ','));

      if(window.Store) window.Store.cfg = Object.assign({}, window.Store.cfg||{}, DEFAULTS);
      showToast('✅ Configuración restaurada');
      // Volver al texto estándar después
      setTimeout(()=>{
        const t=$('c_toast'); if(t) t.textContent='✅ Nueva configuración guardada con éxito';
      }, 2400);
    });
  }

  function showToast(msg){
    const t = $('c_toast'); if(!t) return;
    t.textContent = msg;
    t.hidden = false;
    t.classList.add('show');
    clearTimeout(window.__cfg_toast);
    window.__cfg_toast = setTimeout(()=>{
      t.classList.remove('show');
      t.hidden = true;
    }, 2200);
  }
});
