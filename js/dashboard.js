(function(){
  "use strict";

  // ===== Store =====
  var Store = window.Store || {
    get pros(){ try{return JSON.parse(localStorage.getItem("pros")||"[]");}catch(e){return[];} },
    set pros(v){ localStorage.setItem("pros", JSON.stringify(v)); }
  };

  // ===== Utils =====
  var fmtN0 = new Intl.NumberFormat("es-ES",{maximumFractionDigits:0});
  var fmtN1 = new Intl.NumberFormat("es-ES",{maximumFractionDigits:1});
  function $(id){ return document.getElementById(id); }
  function normPhone(t){ return t?String(t).replace(/[^\d+]/g,""):""; }
  function toNum(x){ var s=String(x||"").replace(/\./g,"").replace(",","."); var n=Number(s); return Number.isFinite(n)?n:0; }

  // Fases y subestados
  var phases = ["CONTACTO","REUNION","BUSQUEDA","COMPRAVENTA","NOTARIA"];
  var subestados = {
    CONTACTO   : ["Pendiente contactar","Contactado","Descartado"],
    REUNION    : ["Reunión agendada","Reunión hecha","Descartado"],
    BUSQUEDA   : ["Propuesta enviada","Reserva","Arras firmadas","Descartado"],
    COMPRAVENTA: ["Notaría fijada","Pendiente financiación","Descartado"],
    NOTARIA    : ["Escritura firmada","Descartado"]
  };
  function nextPhase(f){ var i=phases.indexOf(f||"CONTACTO"); if(i<0)i=0; return (i>=phases.length-1)?phases[i]:phases[i+1]; }

  // ===== Filtros =====
  function readFilters(){
    return {
      q:   ($("f_q")?.value||"").trim().toLowerCase(),
      fase:$("f_fase")?.value||"",
      tipo:$("f_tipo")?.value||"",
      loc: ($("f_loc")?.value||"").trim().toLowerCase(),
      fin: ($("f_fin")?.value||"")
    };
  }
  function applyFilters(rows, f){
    var out=[], i, p, hay, ll;
    for(i=0;i<rows.length;i++){
      p=rows[i]; if(!p) continue;
      hay = (p.nombre||"")+" "+(p.email||"")+" "+(p.tel||"");
      if(f.q && hay.toLowerCase().indexOf(f.q)===-1) continue;
      if(f.fase && (p.fase||"CONTACTO")!==f.fase) continue;
      if(f.tipo && (p.pref_tipo||"")!==f.tipo) continue;
      if(f.loc){
        ll = (p.locs_text||"").toLowerCase();
        if(ll.indexOf(f.loc)===-1) continue;
      }
      if(f.fin && (p.financia||"")!==f.fin) continue;
      out.push(p);
    }
    return out;
  }

  // ===== KPIs =====
  function renderKPIs(rows){
    if(!$("k_total")) return;
    var tot = rows.length, i, f;
    var c = {CONTACTO:0, REUNION:0, BUSQUEDA:0, COMPRAVENTA:0, NOTARIA:0};
    for(i=0;i<rows.length;i++){ f=rows[i].fase||"CONTACTO"; if(c[f]==null) c[f]=0; c[f]++; }
    $("k_total").textContent   = String(tot||0);
    $("k_contacto").textContent= String(c.CONTACTO||0);
    $("k_reunion").textContent = String(c.REUNION||0);
    $("k_busqueda").textContent= String(c.BUSQUEDA||0);
    $("k_compra").textContent  = String(c.COMPRAVENTA||0);
    $("k_notaria").textContent = String(c.NOTARIA||0);
  }

  // ===== Semáforo placeholder =====
  function dotFor(p){
    if(!p || !p.obj_tipo){ return "gray"; }
    if(p.obj_tipo==="bruta" && p.obj_raw>0) return "green";
    if(p.obj_tipo==="flujo" && p.obj_raw>0) return "green";
    if(p.obj_tipo==="neta"  && p.obj_raw>0) return "amber";
    return "gray";
  }

  // ===== Kanban =====
  function cardHTML(p, idx){
    var objTxt = (p.obj_tipo==="flujo") ? (fmtN0.format(p.obj_raw)+" €")
                                        : (fmtN1.format(p.obj_raw)+" %");
    var dot = dotFor(p);
    var locs = (p.locs_text||"—").split(",").slice(0,2);
    var chips="", i, c;
    for(i=0;i<locs.length;i++){ c=locs[i].trim(); if(c) chips += '<span class="tag">'+c+'</span>'; }
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
        '<button class="icon-btn act-del" title="Eliminar" data-i="'+idx+'">🗑</button>'+
      '</div>'+
    '</div>';
  }
  function renderKanban(rows){
    var wrap = document.getElementById("kanban");
    if(!wrap) return;
    var cols = wrap.querySelectorAll(".column"), k;
    for(k=0;k<cols.length;k++){
      var h = cols[k].querySelector("h4")?.textContent||"";
      cols[k].innerHTML = "<h4>"+h+"</h4>";
    }
    var i, p, fase, col;
    for(i=0;i<rows.length;i++){
      p=rows[i]; p.__idx=i; fase=(p.fase||"CONTACTO");
      col = wrap.querySelector('.column[data-col="'+fase+'"]');
      if(col) col.insertAdjacentHTML("beforeend", cardHTML(p, i));
    }
  }

  // ===== Tabla (opcional) =====
  function renderTable(rows){
    var tb = $("tbody"); if(!tb) return;
    var html="", i, p, objTxt;
    if(!rows.length){ tb.innerHTML='<tr><td colspan="10" style="text-align:center;color:var(--muted)">Sin datos</td></tr>'; return; }
    for(i=0;i<rows.length;i++){
      p=rows[i];
      objTxt = (p.obj_tipo==="flujo") ? (fmtN0.format(p.obj_raw)+" €") : (fmtN1.format(p.obj_raw)+" %");
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

  // ===== Drawer & Subestados =====
  function fillSubestadosSel(fase, current){
    var sel = $("dv_sub_sel"); if(!sel) return;
    sel.innerHTML="";
    var arr = subestados[fase]||["—"];
    for(var i=0;i<arr.length;i++){
      var opt=document.createElement("option"); opt.value=arr[i]; opt.textContent=arr[i];
      if(arr[i]===current) opt.selected=true;
      sel.appendChild(opt);
    }
  }
  function openDrawer(p){
    if(!$("drawer")) return;
    $("dv_title").textContent = p.nombre||"Prospecto";
    $("dv_fase").textContent   = "Fase: "+(p.fase||"CONTACTO");
    $("dv_tipo").textContent   = "Tipo: "+(p.pref_tipo||"—");
    var objTxt = (p.obj_tipo==="flujo") ? (fmtN0.format(p.obj_raw)+" €") : (fmtN1.format(p.obj_raw)+" %");
    $("dv_obj").textContent    = "Objetivo: "+(p.obj_tipo||"").toUpperCase()+" "+objTxt;

    $("dv_nombre").value = p.nombre||"";
    $("dv_email").value  = p.email||"";
    $("dv_tel").value    = p.tel||"";
    $("dv_locs").value   = p.locs_text||"";

    $("dv_fase_sel").value = p.fase||"CONTACTO";
    fillSubestadosSel(p.fase||"CONTACTO", p.sub||"");

    // datasets
    $("dv_email_btn").dataset.to = p.email||"";
    $("dv_contract_btn").dataset.to = p.email||"";
    $("dv_whatsapp_btn").dataset.tel = p.tel||"";
    $("dv_adv_btn").dataset.idx = p.__idx;
    $("dv_save").dataset.idx = p.__idx;
    $("dv_delete").dataset.idx = p.__idx;
    $("dv_meeting_btn").dataset.idx = p.__idx;

    $("drawer").classList.add("open");
    $("drawer").setAttribute("aria-hidden","false");
  }
  function closeDrawer(){
    if(!$("drawer")) return;
    $("drawer").classList.remove("open");
    $("drawer").setAttribute("aria-hidden","true");
  }

  // ===== Overlay reunión =====
  function openMeeting(p){
    if(!$("meetModal")) return;
    $("m_dni").value = p.dni||"";
    $("m_dir").value = p.dir||"";
    $("m_locres").value = p.loc_res||"";
    $("m_tipo").value = p.pref_tipo||"Tradicional";
    $("m_locsobj").value = p.locs_text||"";
    $("m_nact").value = p.n_activos||1;
    $("m_objt").value = p.obj_tipo||"bruta";
    $("m_objv").value = p.obj_raw||"";
    $("m_budget").value = p.budget||"";
    $("m_fin").value = p.financia||"";
    $("m_finp").value = p.fin_pct||"80";
    $("m_save").dataset.idx = p.__idx;
    $("meetModal").classList.add("open");
    $("meetModal").setAttribute("aria-hidden","false");
  }
  function closeMeeting(){
    if(!$("meetModal")) return;
    $("meetModal").classList.remove("open");
    $("meetModal").setAttribute("aria-hidden","true");
  }

  // ===== Render principal =====
  function renderAll(){
    var all = Store.pros || [];
    for(var k=0;k<all.length;k++){ all[k].__idx=k; }

    var f = readFilters();
    var rows = applyFilters(all, f);

    renderKPIs(rows);
    renderKanban(rows);
    renderTable(rows);
  }

  // ===== Delegación de eventos (robusta) =====
  function onClick(e, selector, handler){
    document.addEventListener("click", function(ev){
      var t = ev.target;
      if(!t) return;
      // sube hasta encontrar el selector
      while(t && t !== document){
        if(t.matches && t.matches(selector)){ handler.call(t, ev); return; }
        t = t.parentNode;
      }
    });
  }

  function attach(){
    // Toggle tabla
    onClick(null, "#toggleTable", function(){
      var w=$("tableWrap"); if(!w) return;
      var on=w.style.display!=="none";
      w.style.display = on?"none":"block";
      this.textContent = on?"Mostrar tabla (avanzado)":"Ocultar tabla";
    });

    // Filtros
    onClick(null, "#f_clear", function(){ 
      if($("f_q")) $("f_q").value="";
      if($("f_fase")) $("f_fase").value="";
      if($("f_tipo")) $("f_tipo").value="";
      if($("f_loc"))  $("f_loc").value="";
      if($("f_fin"))  $("f_fin").value="";
      renderAll(); 
    });
    onClick(null, "#f_apply", function(){ renderAll(); });

    // Kanban acciones
    onClick(null, ".act-mail", function(){
      var p=(Store.pros||[])[parseInt(this.dataset.i,10)]; if(!p || !p.email) return;
      var body="Hola "+(p.nombre||"")+",%0D%0ASeguimos con tu búsqueda.%0D%0ASaludos.";
      window.location.href="mailto:"+encodeURIComponent(p.email)+"?subject="+encodeURIComponent("Unihouser — Seguimiento")+"&body="+body;
    });
    onClick(null, ".act-wa", function(){
      var p=(Store.pros||[])[parseInt(this.dataset.i,10)]; if(!p) return;
      var tel = normPhone(p.tel); if(!tel) return;
      window.open("https://wa.me/"+tel+"?text="+encodeURIComponent("Seguimos con tu búsqueda de inversión."), "_blank");
    });
    onClick(null, ".act-open", function(){
      var p=(Store.pros||[])[parseInt(this.dataset.i,10)]; if(!p) return;
      p.__idx=parseInt(this.dataset.i,10); openDrawer(p);
    });
    onClick(null, ".act-next", function(){
      var arr=Store.pros||[], idx=parseInt(this.dataset.i,10), p=arr[idx]; if(!p) return;
      p.fase = nextPhase(p.fase||"CONTACTO"); var subs=subestados[p.fase]||[]; p.sub=subs.length?subs[0]:"";
      Store.pros=arr; renderAll();
    });
    onClick(null, ".act-del", function(){
      var arr=Store.pros||[], idx=parseInt(this.dataset.i,10), p=arr[idx]; if(!p) return;
      if(confirm("¿Eliminar a "+(p.nombre||"este prospecto")+"? Esta acción no se puede deshacer.")){
        arr.splice(idx,1); Store.pros=arr; renderAll();
      }
    });

    // Drawer
    onClick(null, "#dv_close", function(){ closeDrawer(); });
    onClick(null, ".open-drawer", function(){
      var p=(Store.pros||[])[parseInt(this.dataset.i,10)]; if(!p) return;
      p.__idx=parseInt(this.dataset.i,10); openDrawer(p);
    });

    onClick(null, "#dv_email_btn", function(){
      var to = this.dataset.to||""; if(!to) return;
      var body="Hola,%0D%0ATe comparto el resumen de la reunión.%0D%0ASaludos.";
      window.location.href="mailto:"+encodeURIComponent(to)+"?subject="+encodeURIComponent("Unihouser — Resumen de reunión")+"&body="+body;
    });
    onClick(null, "#dv_contract_btn", function(){
      var to = this.dataset.to||""; if(!to) return;
      var body="Hola,%0D%0AAdjunto contrato para firma. Cualquier duda, dime.%0D%0ASaludos.";
      window.location.href="mailto:"+encodeURIComponent(to)+"?subject="+encodeURIComponent("Unihouser — Contrato de servicios")+"&body="+body;
    });
    onClick(null, "#dv_whatsapp_btn", function(){
      var tel = normPhone(this.dataset.tel||""); if(!tel) return;
      window.open("https://wa.me/"+tel+"?text="+encodeURIComponent("Te envío el resumen/contrato por email. Cualquier duda, dime."), "_blank");
    });
    onClick(null, "#dv_adv_btn", function(){
      var idx=parseInt(this.dataset.idx,10), arr=Store.pros||[], p=arr[idx]; if(!p) return;
      p.fase = nextPhase(p.fase||"CONTACTO"); var subs=subestados[p.fase]||[]; p.sub=subs.length?subs[0]:"";
      Store.pros=arr; closeDrawer(); renderAll();
    });
    onClick(null, "#dv_delete", function(){
      var idx=parseInt(this.dataset.idx,10), arr=Store.pros||[], p=arr[idx]; if(!p) return;
      if(confirm("¿Eliminar a "+(p.nombre||"este prospecto")+"? Esta acción no se puede deshacer.")){
        arr.splice(idx,1); Store.pros=arr; closeDrawer(); renderAll();
      }
    });
    onClick(null, "#dv_save", function(){
      var idx=parseInt(this.dataset.idx,10), arr=Store.pros||[], p=arr[idx]; if(!p) return;
      p.nombre=$("dv_nombre")?.value||""; p.email=$("dv_email")?.value||""; p.tel=$("dv_tel")?.value||"";
      p.locs_text=$("dv_locs")?.value||""; p.fase=$("dv_fase_sel")?.value||"CONTACTO"; p.sub=$("dv_sub_sel")?.value||"";
      Store.pros=arr; closeDrawer(); renderAll();
    });
    onClick(null, "#dv_meeting_btn", function(){
      var idx=parseInt(this.dataset.idx,10), arr=Store.pros||[], p=arr[idx]; if(!p) return;
      p.__idx=idx; openMeeting(p);
    });
    onClick(null, "#m_cancel", function(){ closeMeeting(); });
    onClick(null, "#m_save", function(){
      var idx=parseInt(this.dataset.idx,10), a=Store.pros||[], P=a[idx]; if(!P) return;
      P.dni=$("m_dni")?.value||""; P.dir=$("m_dir")?.value||""; P.loc_res=$("m_locres")?.value||"";
      P.pref_tipo=$("m_tipo")?.value||"Tradicional"; P.locs_text=$("m_locsobj")?.value||"";
      P.n_activos=toNum($("m_nact")?.value); P.obj_tipo=$("m_objt")?.value||"bruta"; P.obj_raw=toNum($("m_objv")?.value);
      P.budget=toNum($("m_budget")?.value); P.financia=$("m_fin")?.value||""; P.fin_pct=toNum($("m_finp")?.value);
      Store.pros=a; closeMeeting(); renderAll();
    });

    // Fase -> subestados en drawer
    var faseSel = $("dv_fase_sel");
    if(faseSel) faseSel.addEventListener("change", function(){ fillSubestadosSel(this.value||"CONTACTO",""); });
  }

  document.addEventListener("DOMContentLoaded", function(){
    attach();
    renderAll();
  });
})();
