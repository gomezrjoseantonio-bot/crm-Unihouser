(function(){
  "use strict";

  // ==== Datos base (localStorage) ====
  var Store = window.Store || {
    get pros(){ try{return JSON.parse(localStorage.getItem("pros")||"[]");}catch(e){return[];} },
    set pros(v){ localStorage.setItem("pros", JSON.stringify(v)); }
  };
  var fmtN0 = new Intl.NumberFormat("es-ES",{maximumFractionDigits:0});
  var fmtN1 = new Intl.NumberFormat("es-ES",{maximumFractionDigits:1});
  function $(id){ return document.getElementById(id); }

  var phases = ["CONTACTO","REUNION","BUSQUEDA","COMPRAVENTA","NOTARIA"];

  // ==== Filtros ====
  function readFilters(){
    return {
      q:   ($("f_q").value||"").trim().toLowerCase(),
      fase:$("f_fase").value||"",
      tipo:$("f_tipo").value||"",
      loc: ($("f_loc").value||"").trim().toLowerCase(),
      fin: ($("f_fin").value||"")
    };
  }
  function applyFilters(rows, f){
    var out=[];
    for(var i=0;i<rows.length;i++){
      var p=rows[i]; if(!p) continue;
      // texto libre
      var hay = (p.nombre||"")+ " "+(p.email||"")+ " "+(p.tel||"");
      if(f.q && hay.toLowerCase().indexOf(f.q)===-1) continue;
      // fase
      if(f.fase && (p.fase||"CONTACTO")!==f.fase) continue;
      // tipo
      if(f.tipo && (p.pref_tipo||"")!==f.tipo) continue;
      // localidades contiene
      if(f.loc){
        var ll=(p.locs_text||"").toLowerCase();
        if(ll.indexOf(f.loc)===-1) continue;
      }
      // financiación
      if(f.fin && (p.financia||"")!==f.fin) continue;
      out.push(p);
    }
    return out;
  }

  // ==== KPIs ====
  function renderKPIs(rows){
    var tot = rows.length;
    var c = {CONTACTO:0, REUNION:0, BUSQUEDA:0, COMPRAVENTA:0, NOTARIA:0};
    for(var i=0;i<rows.length;i++){ var f=rows[i].fase||"CONTACTO"; if(c[f]==null) c[f]=0; c[f]++; }
    $("k_total").textContent = String(tot||0);
    $("k_contacto").textContent = String(c.CONTACTO||0);
    $("k_reunion").textContent  = String(c.REUNION||0);
    $("k_busqueda").textContent = String(c.BUSQUEDA||0);
    $("k_compra").textContent   = String(c.COMPRAVENTA||0);
    $("k_notaria").textContent  = String(c.NOTARIA||0);
  }

  // ==== Semáforo rápido (solo orientativo por ahora) ====
  function dotFor(p){
    // Solo marcamos algo si objetivo existe (bruta o flujo). En v2 lo cruzaremos con evaluaciones reales.
    if(!p || !p.obj_tipo){ return "gray"; }
    if(p.obj_tipo==="bruta" && p.obj_raw>0){ return "green"; } // placeholder positivo
    if(p.obj_tipo==="flujo" && p.obj_raw>0){ return "green"; }
    return "gray";
  }

  // ==== Kanban ====
  function cardHTML(p, idx){
    var objTxt = (p.obj_tipo==="flujo") ? (fmtN0.format(p.obj_raw)+" €")
                                        : (p.obj_tipo==="neta" ? (fmtN1.format(p.obj_raw)+" %") 
                                                               : (fmtN1.format(p.obj_raw)+" %"));
    var dot = dotFor(p);
    var locs = (p.locs_text||"—").split(",").slice(0,2);
    var chips = "";
    for(var i=0;i<locs.length;i++){
      var c = locs[i].trim(); if(!c) continue;
      chips += '<span class="tag">'+c+'</span>';
    }
    return ''+
    '<div class="card-mini" data-i="'+idx+'">'+
      '<div class="flex between"><div><strong>'+(p.nombre||"—")+'</strong></div>'+
        '<span class="badge">'+(p.pref_tipo||"—")+' <span class="dot '+dot+'"></span></span></div>'+
      '<div style="margin-top:4px;font-size:13px;color:#475467">'+((p.obj_tipo||"").toUpperCase()+' '+objTxt)+'</div>'+
      '<div class="tags">'+chips+'</div>'+
      '<div class="actions-row">'+
        '<button class="icon-btn act-mail" title="Email" data-i="'+idx+'">✉</button>'+
        '<button class="icon-btn act-wa" title="WhatsApp" data-i="'+idx+'">🗨</button>'+
        '<button class="icon-btn act-open" title="Abrir" data-i="'+idx+'">➤</button>'+
        '<button class="icon-btn act-next" title="Avanzar fase" data-i="'+idx+'">➡</button>'+
      '</div>'+
    '</div>';
  }
  function renderKanban(rows){
    // Vaciar columnas
    var cols = document.querySelectorAll(".kanban .column");
    for(var k=0;k<cols.length;k++) cols[k].innerHTML = "<h4>"+cols[k].querySelector("h4").textContent+"</h4>";

    // Insertar tarjetas por fase
    for(var i=0;i<rows.length;i++){
      var p=rows[i]; var fase=(p.fase||"CONTACTO");
      var col = document.querySelector('.kanban .column[data-col="'+fase+'"]');
      if(!col) continue;
      col.insertAdjacentHTML("beforeend", cardHTML(p, i));
    }
  }

  // ==== Tabla ====
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

  // ==== Drawer ====
  function openDrawer(p){
    $("dv_nombre").textContent = p.nombre||"Prospecto";
    $("dv_fase").textContent   = "Fase: "+(p.fase||"CONTACTO");
    $("dv_tipo").textContent   = "Tipo: "+(p.pref_tipo||"—");
    var objTxt = (p.obj_tipo==="flujo") ? (fmtN0.format(p.obj_raw)+" €") : (fmtN1.format(p.obj_raw)+" %");
    $("dv_obj").textContent    = "Objetivo: "+(p.obj_tipo||"").toUpperCase()+" "+objTxt;
    $("dv_email").value        = p.email||"";
    $("dv_tel").value          = p.tel||"";
    $("dv_locs").value         = p.locs_text||"";
    $("drawer").classList.add("open");
    $("dv_email_btn").dataset.to = p.email||"";
    $("dv_whatsapp_btn").dataset.tel = p.tel||"";
    $("dv_adv_btn").dataset.idx = p.__idx; // set desde renderAll
  }
  function closeDrawer(){ $("drawer").classList.remove("open"); }

  // ==== Helpers acciones ====
  function normPhone(t){
    if(!t) return "";
    return String(t).replace(/[^\d+]/g,"");
  }
  function nextPhase(fase){
    var i = phases.indexOf(fase||"CONTACTO");
    if(i<0) i=0; if(i>=phases.length-1) return phases[i];
    return phases[i+1];
  }

  // ==== Render principal ====
  function renderAll(){
    var all = Store.pros || [];
    // etiquetar índice para acciones
    for(var k=0;k<all.length;k++){ all[k].__idx = k; }

    var f = readFilters();
    var rows = applyFilters(all, f);

    renderKPIs(rows);
    renderKanban(rows);
    renderTable(rows);

    // Binds dentro de contenido renderizado
    var opens = document.querySelectorAll(".open-drawer");
    for(var i=0;i<opens.length;i++){
      opens[i].addEventListener("click", function(ev){
        var idx = parseInt(this.dataset.i,10);
        var all2 = Store.pros||[];
        if(all2[idx]){ all2[idx].__idx=idx; openDrawer(all2[idx]); }
      });
    }
  }

  // ==== Eventos globales ====
  function attach(){
    document.addEventListener("click", function(ev){
      var t=ev.target; if(!t) return;

      if(t.id==="dv_close"){ closeDrawer(); return; }

      if(t.id==="f_clear"){
        $("f_q").value=""; $("f_fase").value=""; $("f_tipo").value=""; $("f_loc").value=""; $("f_fin").value="";
        renderAll(); return;
      }
      if(t.id==="f_apply"){ renderAll(); return; }

      // Kanban: mail
      if(t.classList && t.classList.contains("act-mail")){
        var idx = parseInt(t.dataset.i,10); var p=(Store.pros||[])[idx]; if(!p) return;
        var to = p.email||""; if(!to) return;
        var subj="Unihouser — Seguimiento"; 
        var body="Hola "+(p.nombre||"")+",%0D%0A%0D%0ASeguimos con tu búsqueda. Cualquier duda me dices.%0D%0A%0D%0AUn abrazo,%0DUnihouser";
        window.location.href="mailto:"+encodeURIComponent(to)+"?subject="+encodeURIComponent(subj)+"&body="+body;
        return;
      }
      // Kanban: WhatsApp
      if(t.classList && t.classList.contains("act-wa")){
        var idx2 = parseInt(t.dataset.i,10); var p2=(Store.pros||[])[idx2]; if(!p2) return;
        var tel = normPhone(p2.tel); if(!tel) return;
        var msg="Hola "+(p2.nombre||"")+", seguimos con tu búsqueda de inversión.";
        window.open("https://wa.me/"+tel+"?text="+encodeURIComponent(msg), "_blank");
        return;
      }
      // Kanban: Abrir
      if(t.classList && t.classList.contains("act-open")){
        var idx3 = parseInt(t.dataset.i,10); var p3=(Store.pros||[])[idx3]; if(!p3) return;
        p3.__idx=idx3; openDrawer(p3); return;
      }
      // Kanban: Avanzar fase
      if(t.classList && t.classList.contains("act-next")){
        var idx4 = parseInt(t.dataset.i,10); var list=Store.pros||[]; var p4=list[idx4]; if(!p4) return;
        p4.fase = nextPhase(p4.fase||"CONTACTO");
        Store.pros = list; renderAll(); return;
      }

      // Drawer: email/wa/avanzar
      if(t.id==="dv_email_btn"){
        var to = t.dataset.to||""; if(!to) return;
        window.location.href="mailto:"+encodeURIComponent(to)+"?subject="+encodeURIComponent("Unihouser — Seguimiento")+"&body="+encodeURIComponent("Te escribo para actualizar próximos pasos.");
        return;
      }
      if(t.id==="dv_whatsapp_btn"){
        var tel = normPhone(t.dataset.tel||""); if(!tel) return;
        window.open("https://wa.me/"+tel+"?text="+encodeURIComponent("Te escribo por el seguimiento de tu inversión Unihouser."), "_blank"); return;
      }
      if(t.id==="dv_adv_btn"){
        var idx5 = parseInt(t.dataset.idx,10); var arr=Store.pros||[]; var p5=arr[idx5]; if(!p5) return;
        p5.fase = nextPhase(p5.fase||"CONTACTO");
        Store.pros = arr; closeDrawer(); renderAll(); return;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function(){
    attach();
    renderAll();
  });
})();
