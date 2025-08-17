(function(){
  "use strict";

  // ==== SAFE UTILS (no colisionan con app.js) ====
  var fmtN0 = new Intl.NumberFormat("es-ES",{maximumFractionDigits:0});
  var fmtN1 = new Intl.NumberFormat("es-ES",{maximumFractionDigits:1});
  function parseEs(str){
    if(str==null) return NaN;
    var s = String(str).trim().replace(/\./g,"").replace(",",".");
    if(!s) return NaN;
    var n = Number(s);
    return isFinite(n)?n:NaN;
  }
  // Si app.js no las tiene, las creamos aquí
  if(typeof window.setupMoneyFormatting!=="function"){
    window.setupMoneyFormatting = function(root){
      root = root || document;
      var nodes = root.querySelectorAll("input[data-money]");
      for(var i=0;i<nodes.length;i++){
        (function(inp){
          inp.addEventListener("blur", function(){
            var n=parseEs(inp.value);
            if(isFinite(n)) inp.value = fmtN0.format(Math.round(n));
          });
          inp.addEventListener("input", function(){
            var digits=(inp.value||"").replace(/[^\d]/g,"");
            if(!digits){ inp.value=""; return; }
            inp.value = fmtN0.format(Number(digits));
          });
        })(nodes[i]);
      }
    };
  }
  var Store = window.Store || {
    get cfg(){ try{return JSON.parse(localStorage.getItem("cfg")||"{}");}catch(e){return{}} },
    set cfg(v){ localStorage.setItem("cfg", JSON.stringify(v)); },
    get pros(){ try{return JSON.parse(localStorage.getItem("pros")||"[]");}catch(e){return[]} },
    set pros(v){ localStorage.setItem("pros", JSON.stringify(v)); }
  };

  function $(id){ return document.getElementById(id); }
  function toast(msg){
    var t=$("p_toast"); if(!t) return;
    t.textContent=msg; t.hidden=false;
    clearTimeout(window.__p_toast);
    window.__p_toast=setTimeout(function(){ t.hidden=true; },1600);
  }

  // ==== DOM refs ====
  var form = {};
  function bind(){
    form.idx=$("p_idx");
    form.nombre=$("p_nombre"); form.dni=$("p_dni"); form.email=$("p_email"); form.tel=$("p_tel");
    form.dir=$("p_dir"); form.loc_res=$("p_loc_res");
    form.locs_obj=$("p_locs_obj"); form.pref_tipo=$("p_pref_tipo"); form.num_activos=$("p_num_activos");
    form.asc=$("p_asc"); form.alt_max=$("p_alt_max"); form.bajos=$("p_bajos"); form.reforma=$("p_reforma");
    form.budget=$("p_budget"); form.max_compra=$("p_max_compra");
    form.financia=$("p_financia"); form.broker=$("p_broker"); form.pct_fin=$("p_pct_fin");
    form.hipoteca=$("p_hipoteca"); form.propios=$("p_propios");
    form.obj_tipo=$("p_obj_tipo"); form.obj_val=$("p_obj_val");
    form.mes_ini=$("p_mes_ini"); form.mes_fin=$("p_mes_fin");
    form.alq_max=$("p_alq_max");
  }

  // ==== CÁLCULOS ====
  function recalcMaxCompra(){
    var cfg = Store.cfg || {};
    var B = parseEs(form.budget.value)||0;
    var itp = ((cfg.c_itp!=null?cfg.c_itp:8))/100;
    var not = (cfg.c_notaria!=null?cfg.c_notaria:1500);
    var honor = 3500*1.21; // fijo v1
    var compra = Math.max(0, (B - not - honor)/(1+itp));
    form.max_compra.value = fmtN0.format(Math.round(compra));
    recalcFinanciacion();
    recalcAlquilerMax();
  }
  function recalcFinanciacion(){
    var financia = (form.financia.value==="Sí");
    var pct = (parseEs(form.pct_fin.value)||80)/100;
    var compra = parseEs(form.max_compra.value)||0;
    var presupuesto = parseEs(form.budget.value)||0;
    var hip = financia ? Math.round(compra*pct) : 0;
    var propios = Math.max(0, presupuesto - hip);
    form.hipoteca.value = fmtN0.format(hip);
    form.propios.value  = fmtN0.format(propios);
  }
  function recalcAlquilerMax(){
  // Mostrar/ocultar fila según objetivo
  var row = $("row_alquiler_max");
  var isBruta = (form.obj_tipo.value === "bruta");
  if(row) row.hidden = !isBruta;
  if(!isBruta){ form.alq_max.value = ""; return; }

  // % objetivo
  var rb = parseEs(form.obj_val.value); // ej. 10 => 10%
  if(!isFinite(rb) || rb <= 0){ form.alq_max.value = ""; return; }

  // COSTE TOTAL = Compra + ITP + Notaría + Honorarios
  // Tomamos compra = "Precio máx. COMPRA" ya calculado en base a presupuesto/config
  var cfg   = Store.cfg || {};
  var itp   = ((cfg.c_itp != null ? cfg.c_itp : 8)) / 100;
  var not   = (cfg.c_notaria != null ? cfg.c_notaria : 1500);
  var honor = 3500 * 1.21; // fijo v1 (PSI + IVA)
  var compra = parseEs(form.max_compra.value) || 0;

  var costeTotal = compra * (1 + itp) + not + honor;
  if(costeTotal <= 0){ form.alq_max.value = ""; return; }

  // Alquiler mensual orientativo = (Rb% * Coste total) / 12
  var alq = Math.max(0, (rb / 100) * costeTotal / 12);
  form.alq_max.value = fmtN0.format(Math.round(alq));

  }
  function autoMesFin(){
    var s=(form.mes_ini.value||"").trim();
    if(!s || (form.mes_fin.value||"").trim()) return;
    var m=s.match(/^(\d{2})\/(\d{4})$/); if(!m) return;
    var mm=parseInt(m[1],10), yy=parseInt(m[2],10);
    mm += 5; while(mm>12){ mm-=12; yy+=1; }
    form.mes_fin.value = (mm<10?"0"+mm:mm)+"/"+yy;
  }

  // ==== SERIALIZAR / LIMPIAR ====
  function serialize(){
    var raw = parseEs(form.obj_val.value);
    return {
      ts: Date.now(),
      nombre:(form.nombre.value||"").trim(),
      dni:(form.dni.value||"").trim(),
      email:(form.email.value||"").trim(),
      tel:(form.tel.value||"").trim(),
      dir:(form.dir.value||"").trim(),
      loc_res:(form.loc_res.value||"").trim(),
      locs_text:(form.locs_obj.value||"").trim(),
      pref_tipo:form.pref_tipo.value,
      num_activos:parseEs(form.num_activos.value)||1,
      asc:form.asc.value,
      alt_max:parseEs(form.alt_max.value)||null,
      bajos:form.bajos.value,
      reforma:form.reforma.value,
      budget:parseEs(form.budget.value)||0,
      max_compra:parseEs(form.max_compra.value)||0,
      financia:form.financia.value,
      broker:form.broker.value,
      pct_fin:parseEs(form.pct_fin.value)||80,
      hipoteca:parseEs(form.hipoteca.value)||0,
      propios:parseEs(form.propios.value)||0,
      obj_tipo:form.obj_tipo.value,
      obj_raw:isFinite(raw)?raw:0,
      mes_ini:(form.mes_ini.value||"").trim(),
      mes_fin:(form.mes_fin.value||"").trim(),
      fase:"CONTACTO",
      sub:"Pendiente contactar",
      alq_max:parseEs(form.alq_max.value)||0
    };
  }
  function clearForm(){
    form.idx.value = -1;
    var ids=["p_nombre","p_dni","p_email","p_tel","p_dir","p_loc_res","p_locs_obj","p_num_activos","p_alt_max","p_budget","p_max_compra","p_pct_fin","p_hipoteca","p_propios","p_obj_val","p_mes_ini","p_mes_fin","p_alq_max"];
    for(var i=0;i<ids.length;i++){ var el=$(ids[i]); if(el) el.value=""; }
    form.pref_tipo.value="Tradicional";
    form.asc.value="Sí";
    form.bajos.value="No";
    form.reforma.value="No";
    form.financia.value="Sí";
    form.broker.value="No";
    form.obj_tipo.value="bruta";
    recalcAlquilerMax();
  }

  // ==== EMAILS (mailto) ====
  function mailto(to, subject, body){
    if(!to){ toast("⚠ Falta email"); return; }
    var url="mailto:"+encodeURIComponent(to)+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
    window.location.href=url;
  }
  function objLabel(p){ return p.obj_tipo==="flujo" ? fmtN0.format(p.obj_raw)+" €" : fmtN1.format(p.obj_raw)+" %"; }
  function plantillaContacto(p){
    return "Hola "+(p.nombre||"")+",\n\nSoy José Antonio de Unihouser. He recibido tu interés en inversión inmobiliaria.\n¿Te viene bien agendar una reunión para concretar objetivos y financiación?\n\nGracias,\nUnihouser · 644 300 200 · unihouser.es";
  }
  function plantillaResumen(p){
    return "Hola "+(p.nombre||"")+",\n\nResumen de la reunión:\n- Tipo alquiler: "+p.pref_tipo+"\n- Localidades objetivo: "+(p.locs_text||"-")+"\n- Presupuesto total: "+fmtN0.format(p.budget)+" €\n- Precio máx. compra (estimado): "+fmtN0.format(p.max_compra)+" €\n- Financiación: "+p.financia+" ("+(p.pct_fin||80)+"% sobre compra)\n- Objetivo: "+(p.obj_tipo||"").toUpperCase()+" "+objLabel(p)+"\n- Periodo búsqueda: "+(p.mes_ini||"-")+" a "+(p.mes_fin||"-")+"\n\nSi todo OK, te envío el contrato para firma.\n\nUnihouser";
  }
  function plantillaContrato(p){
    return "Hola "+(p.nombre||"")+",\n\nAdjunto el contrato de servicios para firma.\nEn cuanto lo tengamos, iniciamos búsqueda (hasta 5 propuestas iniciales).\n\nGracias,\nUnihouser";
  }

  // ==== EVENTOS ====
  function attachLive(){
    var evs=["input","change"];
    form.budget.addEventListener(evs[0],recalcMaxCompra); form.budget.addEventListener(evs[1],recalcMaxCompra);
    form.financia.addEventListener(evs[0],recalcFinanciacion); form.financia.addEventListener(evs[1],recalcFinanciacion);
    form.pct_fin.addEventListener(evs[0],recalcFinanciacion); form.pct_fin.addEventListener(evs[1],recalcFinanciacion);
    form.obj_tipo.addEventListener(evs[0],recalcAlquilerMax); form.obj_tipo.addEventListener(evs[1],recalcAlquilerMax);
    form.obj_val.addEventListener(evs[0],recalcAlquilerMax);  form.obj_val.addEventListener(evs[1],recalcAlquilerMax);
    form.mes_ini.addEventListener(evs[0],autoMesFin);         form.mes_ini.addEventListener(evs[1],autoMesFin);
  }
  function onClick(ev){
    var t=ev.target; if(!t || !t.id) return;
    if(t.id==="p_save"){
      var rec=serialize();
      var arr=Store.pros||[];
      var idx=parseInt(form.idx.value||"-1",10);
      if(idx>=0) arr[idx]=rec; else arr.unshift(rec);
      Store.pros=arr; toast("✅ Prospecto guardado"); clearForm(); return;
    }
    if(t.id==="p_clear"){ clearForm(); toast("↺ Limpio"); return; }
    if(t.id==="p_mail_contacto"){ var p1=serialize(); mailto(p1.email,"Unihouser · Primer contacto",plantillaContacto(p1)); return; }
    if(t.id==="p_mail_resumen"){  var p2=serialize(); mailto(p2.email,"Unihouser · Resumen de reunión",plantillaResumen(p2)); return; }
    if(t.id==="p_mail_contrato"){  var p3=serialize(); mailto(p3.email,"Unihouser · Contrato de servicios",plantillaContrato(p3)); return; }
  }

  // ==== INIT ====
  document.addEventListener("DOMContentLoaded", function(){
    bind();
    setupMoneyFormatting(document);
    attachLive();
    recalcMaxCompra();
    recalcAlquilerMax();
    document.addEventListener("click", onClick);
  });
})();
