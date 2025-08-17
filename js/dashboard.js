(function(){
  "use strict";

  // Utiles seguros por si app.js no está
  var Store = window.Store || {
    get pros(){ try{return JSON.parse(localStorage.getItem("pros")||"[]");}catch(e){return[];} }
  };
  var fmtN0 = new Intl.NumberFormat("es-ES",{maximumFractionDigits:0});
  var fmtN1 = new Intl.NumberFormat("es-ES",{maximumFractionDigits:1});

  function $(id){ return document.getElementById(id); }

  // KPIs muy básicos
  function renderKPIs(rows){
    var tot = rows.length;
    var c = {CONTACTO:0, REUNION:0, BUSQUEDA:0, COMPRAVENTA:0, NOTARIA:0};
    for(var i=0;i<rows.length;i++){
      var f = rows[i].fase||"CONTACTO"; if(c[f]==null) c[f]=0; c[f]++;
    }
    $("k_total").textContent = tot||"0";
    $("k_contacto").textContent = c.CONTACTO||"0";
    $("k_reunion").textContent  = c.REUNION||"0";
    $("k_busqueda").textContent = c.BUSQUEDA||"0";
    $("k_compra").textContent   = c.COMPRAVENTA||"0";
    $("k_notaria").textContent  = c.NOTARIA||"0";
  }

  // Tabla básica
  function renderTable(rows){
    var tb = $("tbody");
    if(!rows.length){ tb.innerHTML='<tr><td colspan="10" style="text-align:center;color:var(--muted)">Sin datos</td></tr>'; return; }
    var html="";
    for(var i=0;i<rows.length;i++){
      var p=rows[i];
      var objTxt = (p.obj_tipo==="flujo") ? (fmtN0.format(p.obj_raw)+" €") : (fmtN1.format(p.obj_raw)+" %");
      html += '<tr>'+
        '<td>'+ (p.nombre||"—") +'</td>'+
        '<td>'+ (p.email||"—") +'</td>'+
        '<td>'+ (p.tel||"—") +'</td>'+
        '<td>'+ (p.fase||"CONTACTO") +'</td>'+
        '<td>'+ (p.sub||"—") +'</td>'+
        '<td>'+ (p.pref_tipo||"—") +'</td>'+
        '<td>'+ (p.locs_text||"—") +'</td>'+
        '<td>'+ ((p.obj_tipo||"").toUpperCase()+" "+objTxt) +'</td>'+
        '<td>'+ (p.budget?fmtN0.format(p.budget):"—") +'</td>'+
        '<td><button class="btn open-drawer" data-i="'+i+'">Abrir</button></td>'+
      '</tr>';
    }
    tb.innerHTML = html;
  }

  // Drawer mínimo
  function openDrawer(p){
    $("dv_nombre").textContent = p.nombre||"Prospecto";
    $("dv_fase").textContent = "Fase: "+(p.fase||"CONTACTO");
    $("dv_tipo").textContent = "Tipo: "+(p.pref_tipo||"—");
    var objTxt = (p.obj_tipo==="flujo") ? (fmtN0.format(p.obj_raw)+" €") : (fmtN1.format(p.obj_raw)+" %");
    $("dv_obj").textContent = "Objetivo: "+(p.obj_tipo||"").toUpperCase()+" "+objTxt;
    $("dv_email").value = p.email||"";
    $("dv_tel").value = p.tel||"";
    $("dv_locs").value = p.locs_text||"";
    $("drawer").classList.add("open");
  }

  function attach(){
    document.addEventListener("click", function(ev){
      var t=ev.target;
      if(!t) return;
      if(t.id==="dv_close"){ $("drawer").classList.remove("open"); return; }
      if(t.classList && t.classList.contains("open-drawer")){
        var i = t.dataset.i ? parseInt(t.dataset.i,10) : 0;
        var rows = Store.pros||[];
        if(rows[i]) openDrawer(rows[i]);
        else $("drawer").classList.add("open"); // placeholder
      }
      if(t.id==="f_clear"){ // limpia filtros (solo UI en v1)
        $("f_q").value=""; $("f_fase").value=""; $("f_tipo").value=""; $("f_loc").value=""; $("f_fin").value="";
      }
      if(t.id==="f_apply"){
        // v1 solo refresca tabla con todo (los filtros reales los metemos en v2)
        renderAll();
      }
    });
  }

  function renderAll(){
    var rows = Store.pros || [];
    renderKPIs(rows);
    renderTable(rows);
    // Kanban v1: lo metemos en v2 junto con filtros reales/acciones
  }

  document.addEventListener("DOMContentLoaded", function(){
    attach();
    renderAll();
  });
})();
