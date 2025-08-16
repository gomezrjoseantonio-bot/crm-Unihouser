document.addEventListener('DOMContentLoaded', ()=>{
  setupMoneyFormatting(); setupMoneyLive();
  const c=Store.cfg; const defaults={c_itp:8,c_notaria:1500,c_incl_honor:'si',c_pct_hogar:3.5,c_pct_impago:4,c_pct_g_trad:15,c_pct_g_hab:25,c_obj_bruta:6,c_obj_neta:4.5,c_obj_flujo:150};
  const obj=(Object.keys(c).length?c:defaults);
  document.getElementById('c_itp').value=String(obj.c_itp).replace('.',',');
  document.getElementById('c_notaria').value=new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(obj.c_notaria);
  document.getElementById('c_incl_honor').value=obj.c_incl_honor;
  document.getElementById('c_pct_hogar').value=String(obj.c_pct_hogar).replace('.',',');
  document.getElementById('c_pct_impago').value=String(obj.c_pct_impago).replace('.',',');
  document.getElementById('c_pct_g_trad').value=String(obj.c_pct_g_trad).replace('.',',');
  document.getElementById('c_pct_g_hab').value=String(obj.c_pct_g_hab).replace('.',',');
  document.getElementById('c_obj_bruta').value=String(obj.c_obj_bruta).replace('.',',');
  document.getElementById('c_obj_neta').value=String(obj.c_obj_neta).replace('.',',');
  document.getElementById('c_obj_flujo').value=new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(obj.c_obj_flujo);

  document.getElementById('c_save').onclick=()=>{
    const out={
      c_itp:parseEs(document.getElementById('c_itp').value)||8,
      c_notaria:parseEs(document.getElementById('c_notaria').value)||1500,
      c_incl_honor:document.getElementById('c_incl_honor').value,
      c_pct_hogar:parseEs(document.getElementById('c_pct_hogar').value)||3.5,
      c_pct_impago:parseEs(document.getElementById('c_pct_impago').value)||4,
      c_pct_g_trad:parseEs(document.getElementById('c_pct_g_trad').value)||15,
      c_pct_g_hab:parseEs(document.getElementById('c_pct_g_hab').value)||25,
      c_obj_bruta:parseEs(document.getElementById('c_obj_bruta').value)||6,
      c_obj_neta:parseEs(document.getElementById('c_obj_neta').value)||4.5,
      c_obj_flujo:parseEs(document.getElementById('c_obj_flujo').value)||150,
    };
    Store.cfg=out; alert('Configuración guardada');
  };
});
