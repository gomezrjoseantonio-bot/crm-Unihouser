(function(){
  "use strict";

  // ===== Store =====
  var Store = window.Store || {
    get pros(){ try{return JSON.parse(localStorage.getItem("pros")||"[]");}catch(e){return[];} },
    set pros(v){ localStorage.setItem("pros", JSON.stringify(v)); },
    get evals(){ try{return JSON.parse(localStorage.getItem("evals")||"[]");}catch(e){return[];} },
    set evals(v){ localStorage.setItem("evals", JSON.stringify(v)); },
    get cfg(){  try{return JSON.parse(localStorage.getItem("cfg")||"{}");}catch(e){return{};} },
    set cfg(v){ localStorage.setItem("cfg", JSON.stringify(v)); }
  };

  // ===== Utils =====
  var fmtN0 = new Intl.NumberFormat("es-ES",{maximumFractionDigits:0});
  var fmtN1 = new Intl.NumberFormat("es-ES",{maximumFractionDigits:1});
  function $(id){ return document.getElementById(id); }
  function toNum(x){ var s=String(x||"").replace(/\./g,"").replace(",","."); var n=Number(s); return Number.isFinite(n)?n:0; }
  function uid(){ return 'p_'+Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4); }
  function normPhone(t){ return t?String(t).replace(/[^\d+]/g,""):""; }
  function toast(msg, type){
    var box=$("toasts"); if(!box) return;
    var d=document.createElement("div"); d.className="toast "+(type||""); d.textContent=msg;
    box.appendChild(d); setTimeout(function(){ d.style.opacity="0"; }, 1800);
    setTimeout(function(){ box.removeChild(d); }, 2400);
  }

  // Miles en vivo (inputs con data-money-live)
  function attachMoneyLive(){
    document.addEventListener("input", function(e){
      var t=e.target; if(!t||!t.matches||!t.matches("input[data-money-live]")) return;
      var digits=(t.value||"").replace(/[^\d]/g,""); if(!digits){ t.value=""; return; }
      t.value = fmtN0.format(Number(digits));
    });
    document.addEventListener("blur", function(e){
      var t=e.target; if(!t||!t.matches||!t.matches("input[data-money-live]")) return;
      var n=toNum(t.value); t.value = n?fmtN0.format(n):"";
    }, true);
  }

  // ===== Fases =====
  var phases=["CONTACTO","REUNION","BUSQUEDA","COMPRAVENTA","NOTARIA"];
  var subestados={
    CONTACTO:["Pendiente contactar","Contactado","Descartado"],
    REUNION:["Reunión agendada","Reunión hecha","Descartado"],
    BUSQUEDA:["Propuesta enviada","Reserva","Arras firmadas","Descartado"],
    COMPRAVENTA:["Notaría fijada","Pendiente financiación","Descartado"],
    NOTARIA:["Escritura firmada","Descartado"]
  };
  function nextPhase(f){ var i=phases.indexOf(f||"CONTACTO"); if(i<0)i=0; return (i>=phases.length-1)?phases[i]:phases[i+1]; }

  // ===== IDs & Evaluaciones =====
  function ensureIds(){
    var ps=Store.pros||[], ch=false; for(var i=0;i<ps.length;i++){ if(!ps[i].id){ ps[i].id=uid(); ch=true; } }
    if(ch) Store.pros=ps;
  }
  function evalsByProspect(pid){
    var evs=Store.evals||[], out=[]; for(var i=0;i<evs.length;i++){
      var e=evs[i]; if(Array.isArray(e.prospect_ids)&&e.prospect_ids.indexOf(pid)>=0) out.push(e);
    } return out;
  }
  function scoreDotFor(p){
    var objT=p.obj_tipo, goal=toNum(p.obj_raw); if(!objT||!goal) return "gray";
    var evs=evalsByProspect(p.id); if(!evs.length) return "gray";
    var best=null; for(var i=0;i<evs.length;i++){ if(evs[i].kpi_tipo===objT){ best=evs[i]; break; } }
    if(!best) best=evs[0];
    var val=Number(best.kpi_val)||0;
    if(objT==="flujo"){ if(val>=goal) return "green"; if(val>=goal*0.9) return "amber"; return "red"; }
    else{ if(val>=goal) return "green"; if(val>=goal-1) return "amber"; return "red"; }
  }

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
    var out=[], i,p,hay,ll;
    for(i=0;i<rows.length;i++){
      p=rows[i]; if(!p) continue;
      hay=(p.nombre||"")+" "+(p.email||"")+" "+(p.tel||"");
      if(f.q && hay.toLowerCase().indexOf(f.q)===-1) continue;
      if(f.fase && (p.fase||"CONTACTO")!==f.fase) continue;
      if(f.tipo && (p.pref_tipo||"")!==f.tipo) continue;
      if(f.loc){ ll=(p.locs_text||"").toLowerCase(); if(ll.indexOf(f.loc)===-1) continue; }
      if(f.fin && (p.financia||"")!==f.fin) continue;
      out.push(p);
    }
    return out;
  }

  // ===== KPIs =====
  function renderKPIs(rows){
    if(!$("k_total")) return;
    var tot=rows.length, i,f; var c={CONTACTO:0,REUNION:0,BUSQUEDA:0,COMPRAVENTA:0,NOTARIA:0};
    for(i=0;i<rows.length;i++){ f=rows[i].fase||"CONTACTO"; if(c[f]==null) c[f]=0; c[f]++; }
    $("k_total").textContent=String(tot||0);
    $("k_contacto").textContent=String(c.CONTACTO||0);
    $("k_reunion").textContent=String(c.REUNION||0);
    $("k_busqueda").textContent=String(c.BUSQUEDA||0);
    $("k_compra").textContent=String(c.COMPRAVENTA||0);
    $("k_notaria").textContent=String(c.NOTARIA||0);
  }

  // ===== Kanban =====
  function cardHTML(p, idx){
    var objTxt=(p.obj_tipo==="flujo")?(fmtN0.format(p.obj_raw)+" €"):(fmtN1.format(p.obj_raw)+" %");
    var dot=scoreDotFor(p);
    var locs=(p.locs_text||"—").split(",").slice(0,2), chips="", i,c;
    for(i=0;i<locs.length;i++){ c=locs[i].trim(); if(c) chips+='<span class="tag">'+c+'</span>'; }
    return ''+
    '<div class="card-mini" draggable="true" data-i="'+idx+'" data-id="'+(p.id||"")+'">'+
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
    var wrap=$("kanban"); if(!wrap) return;
    var cols=wrap.querySelectorAll(".column"), k;
    for(k=0;k<cols.length;k++){
      var h=cols[k].querySelector("h4")?.textContent||"";
      cols[k].innerHTML="<h4>"+h+"</h4>"; cols[k].classList.add("dropzone");
    }
    var i,p,fase,col;
    for(i=0;i<rows.length;i++){
      p=rows[i]; p.__idx=i; fase=p.fase||"CONTACTO";
      col=wrap.querySelector('.column[data-col="'+fase+'"]');
      if(col) col.insertAdjacentHTML("beforeend", cardHTML(p,i));
    }
  }

  // ===== Tabla =====
  function renderTable(rows){
    var tb=$("tbody"); if(!tb) return;
    var html="", i,p,objTxt;
    if(!rows.length){ tb.innerHTML='<tr><td colspan="10" style="text-align:center;color:#667085">Sin datos</td></tr>'; return; }
    for(i=0;i<rows.length;i++){
      p=rows[i]; objTxt=(p.obj_tipo==="flujo")?(fmtN0.format(p.obj_raw)+" €"):(fmtN1.format(p.obj_raw)+" %");
      html+='<tr>'+
        '<td>'+(p.nombre||"—")+'</td>'+
        '<td>'+(p.email||"—")+'</td>'+
        '<td>'+(p.tel||"—")+'</td>'+
        '<td>'+(p.fase||"CONTACTO")+'</td>'+
        '<td>'+(p.sub||"—")+'</td>'+
        '<td>'+(p.pref_tipo||"—")+'</td>'+
        '<td>'+(p.locs_text||"—")+'</td>'+
        '<td>'+((p.obj_tipo||"").toUpperCase()+" "+objTxt)+'</td>'+
        '<td>'+(p.budget?fmtN0.format(p.budget):"—")+'</td>'+
        '<td><button class="btn open-drawer" data-i="'+i+'">Abrir</button></td>'+
      '</tr>';
    }
    tb.innerHTML=html;
  }

  // ===== Drawer =====
  function fillSubestadosSel(fase,current){
    var sel=$("dv_sub_sel"); if(!sel) return;
    sel.innerHTML=""; var arr=subestados[fase]||["—"];
    for(var i=0;i<arr.length;i++){
      var opt=document.createElement("option"); opt.value=arr[i]; opt.textContent=arr[i];
      if(arr[i]===current) opt.selected=true; sel.appendChild(opt);
    }
  }
  function openDrawer(p){
    if(!$("drawer")) return;
    $("dv_title").textContent=p.nombre||"Prospecto";
    $("dv_fase").textContent="Fase: "+(p.fase||"CONTACTO");
    $("dv_tipo").textContent="Tipo: "+(p.pref_tipo||"—");
    var objTxt=(p.obj_tipo==="flujo")?(fmtN0.format(p.obj_raw)+" €"):(fmtN1.format(p.obj_raw)+" %");
    $("dv_obj").textContent="Objetivo: "+(p.obj_tipo||"").toUpperCase()+" "+objTxt;
    $("dv_evals").textContent="Evaluaciones: "+(evalsByProspect(p.id).length||0);

    $("dv_nombre").value=p.nombre||""; $("dv_email").value=p.email||""; $("dv_tel").value=p.tel||""; $("dv_locs").value=p.locs_text||"";
    $("dv_fase_sel").value=p.fase||"CONTACTO"; fillSubestadosSel(p.fase||"CONTACTO", p.sub||"");

    $("dv_email_btn").dataset.to=p.email||""; $("dv_contract_btn").dataset.to=p.email||""; $("dv_whatsapp_btn").dataset.tel=p.tel||"";
    $("dv_adv_btn").dataset.idx=p._idx; $("dv_save").dataset.idx=p.idx; $("dv_delete").dataset.idx=p.idx; $("dv_meeting_btn").dataset.idx=p._idx; $("dv_evals_btn").dataset.pid=p.id||"";

    $("drawer").classList.add("open"); $("drawer").setAttribute("aria-hidden","false");
  }
  function closeDrawer(){ $("drawer")?.classList.remove("open"); $("drawer")?.setAttribute("aria-hidden","true"); }

  // ===== Config & cálculos =====
  function cfgOrDefaults(){
    var c=Store.cfg||{};
    return { itp_pct: toNum(c.itp_pct)||8, not_eur: toNum(c.notaria)||1500, honor_eur: toNum(c.honorarios)||0 };
  }
  function calcPrecioMaxCompra(budget, includeHonor){
    var c=cfgOrDefaults(); var honor = includeHonor? c.honor_eur : 0;
    var denom = 1 + (c.itp_pct/100);
    var num = Math.max(0, budget - c.not_eur - honor);
    return Math.max(0, Math.floor(num/denom));
  }
  function calcAlquilerSugerido(objBrutaPct, inversionTotal){
    if(!objBrutaPct||!inversionTotal) return 0;
    var anual = (objBrutaPct/100)*inversionTotal;
    return Math.max(0, Math.round(anual/12));
  }
  function monthPlus5(value){
    if(!value||!/\d{4}-\d{2}/.test(value)) return "";
    var y=+value.slice(0,4), m=+value.slice(5,7); m+=5; while(m>12){m-=12; y+=1;}
    return y+"-"+(m<10?("0"+m):m);
  }

  // ===== Modal Reunión =====
  function openMeeting(p){
    if(!$("meetModal")) return;
    // Personales
    $("m_dni").value=p.dni||""; $("m_dir").value=p.dir||""; $("m_locres").value=p.loc_res||"";
    $("m_email").value=p.email||""; $("m_tel").value=p.tel||"";
    // Preferencias
    $("m_tipo").value=p.pref_tipo||"Tradicional"; $("m_locsobj").value=p.locs_text||"";
    $("m_nact").value=p.n_activos||1; $("m_asc").value=p.ascensor||"Sí";
    $("m_altmax").value=p.altura_max||1; $("m_bajo").value=p.bajo||"No";
    $("m_ref").value=p.reforma||"No"; $("m_mesini").value=p.mes_ini||"";
    $("m_mesfin").value=p.mes_fin||"";
    // Presupuesto
    $("m_budget").value=p.budget?fmtN0.format(p.budget):""; $("m_inchonor").value=p.incluir_honor||"si";
    $("m_pmax").value=p.pmax_compra?fmtN0.format(p.pmax_compra):"";
    // Financiación
    $("m_fin").value=p.financia||"Sí"; $("m_broker").value=p.broker||"No"; $("m_finp").value=p.fin_pct||"80";
    $("m_fin_imp").value=p.fin_importe?fmtN0.format(p.fin_importe):""; $("m_aport").value=p.aportacion?fmtN0.format(p.aportacion):"";
    // Objetivos
    $("m_objt").value=p.obj_tipo||"bruta"; $("m_objv").value=p.obj_raw||"";
    $("m_alq_sug").value=p.alq_sugerido?fmtN0.format(p.alq_sugerido):"";

    $("m_save").dataset.idx=p.__idx;
    $("meetModal").classList.add("open"); $("meetModal").setAttribute("aria-hidden","false");
  }
  function closeMeeting(){ $("meetModal")?.classList.remove("open"); $("meetModal")?.setAttribute("aria-hidden","true"); }

  function recalcMeeting(){
    var budget = toNum($("m_budget")?.value||0);
    var includeHonor = (($("m_inchonor")?.value||"si")==="si");
    var pmax = calcPrecioMaxCompra(budget, includeHonor);
    if($("m_pmax")) $("m_pmax").value = pmax?fmtN0.format(pmax):"";

    // financiación (sobre precio)
    var fin = ($("m_fin")?.value||"Sí")==="Sí";
    var finp = toNum($("m_finp")?.value||80);
    var finImporte = fin ? Math.round(pmax * (finp/100)) : 0;
    var aport = Math.max(0, budget - finImporte);
    $("m_fin_imp").value = finImporte?fmtN0.format(finImporte):"";
    $("m_aport").value   = aport?fmtN0.format(aport):"";

    // alquiler sugerido si objetivo es bruta %
    var objt= $("m_objt")?.value||"bruta";
    var objv= toNum($("m_objv")?.value||0);
    if(objt==="bruta"){
      var alq = calcAlquilerSugerido(objv, budget);
      $("m_alq_sug").value = alq?fmtN0.format(alq):"";
    }else{
      $("m_alq_sug").value = "";
    }

    // mes fin auto
    var mi=$("m_mesini")?.value||"";
    if(mi){ $("m_mesfin").value = monthPlus5(mi); }
  }

  // ===== Render principal =====
  function renderAll(){
    ensureIds();
    var all=Store.pros||[]; for(var k=0;k<all.length;k++){ all[k].__idx=k; }
    var rows=applyFilters(all, readFilters());
    renderKPIs(rows); renderKanban(rows); renderTable(rows);
  }

  // ===== Delegación de eventos =====
  function onClick(sel, handler){
    document.addEventListener("click", function(ev){
      var t=ev.target; while(t && t!==document){ if(t.matches && t.matches(sel)){ handler.call(t,ev); return; } t=t.parentNode; }
    });
  }

  function attach(){
    attachMoneyLive();

    // ESC
    document.addEventListener("keydown", function(e){ if(e.key==="Escape"){ closeMeeting(); closeDrawer(); } });

    // Toggle tabla
    onClick("#toggleTable", function(){ var w=$("tableWrap"); if(!w) return; var on=w.style.display!=="none"; w.style.display=on?"none":"block"; this.textContent=on?"Mostrar tabla (avanzado)":"Ocultar tabla"; });

    // Filtros
    onClick("#f_clear", function(){ $("f_q").value=""; $("f_fase").value=""; $("f_tipo").value=""; $("f_loc").value=""; $("f_fin").value=""; renderAll(); toast("Filtros limpiados","ok"); });
    onClick("#f_apply", function(){ renderAll(); toast("Filtros aplicados","ok"); });
    onClick("#btn_csv", function(){ downloadCSV(); });

    // Kanban acciones
    onClick(".act-mail", function(){
      var p=(Store.pros||[])[parseInt(this.dataset.i,10)]; if(!p||!p.email) return;
      var resumen=[]; if(p.obj_tipo){ resumen.push("Objetivo: "+p.obj_tipo.toUpperCase()+" "+(p.obj_tipo==="flujo"?(fmtN0.format(p.obj_raw)+" €"):(fmtN1.format(p.obj_raw)+" %"))); }
      if(p.locs_text){ resumen.push("Zonas: "+p.locs_text); } if(p.budget){ resumen.push("Presupuesto total: "+fmtN0.format(p.budget)+" €"); }
      var body="Hola "+(p.nombre||"")+",%0D%0A%0D%0AResumen:%0D%0A- "+resumen.join("%0D%0A- ")+"%0D%0A%0D%0ASeguimos en contacto.%0D%0ASaludos.";
      window.location.href="mailto:"+encodeURIComponent(p.email)+"?subject="+encodeURIComponent("Unihouser — Seguimiento")+"&body="+body;
    });
    onClick(".act-wa", function(){
      var p=(Store.pros||[])[parseInt(this.dataset.i,10)]; if(!p) return;
      var tel=normPhone(p.tel); if(!tel) return;
      window.open("https://wa.me/"+tel+"?text="+encodeURIComponent("Te envío el resumen por email. Seguimos."), "_blank");
    });
    onClick(".act-open", function(){ var p=(Store.pros||[])[parseInt(this.dataset.i,10)]; if(!p) return; p.__idx=parseInt(this.dataset.i,10); openDrawer(p); });
    onClick(".act-next", function(){ var arr=Store.pros||[], idx=parseInt(this.dataset.i,10), p=arr[idx]; if(!p) return; p.fase=nextPhase(p.fase||"CONTACTO"); var subs=subestados[p.fase]||[]; p.sub=subs.length?subs[0]:""; Store.pros=arr; renderAll(); toast("Fase: "+p.fase,"ok"); });
    onClick(".act-del", function(){ var arr=Store.pros||[], idx=parseInt(this.dataset.i,10), p=arr[idx]; if(!p) return; if(confirm("¿Eliminar a "+(p.nombre||"este prospecto")+"?")){ arr.splice(idx,1); Store.pros=arr; renderAll(); toast("Prospecto eliminado","ok"); } });

    // Drawer
    onClick("#dv_close", function(){ closeDrawer(); });
    onClick(".open-drawer", function(){ var p=(Store.pros||[])[parseInt(this.dataset.i,10)]; if(!p) return; p.__idx=parseInt(this.dataset.i,10); openDrawer(p); });
    onClick("#dv_email_btn", function(){
      var to=this.dataset.to||""; if(!to) return;
      var arr=Store.pros||[]; var idx=$("dv_save")?.dataset.idx?parseInt($("dv_save").dataset.idx,10):-1; var p=arr[idx]||{};
      var resumen=[]; if(p.obj_tipo){ resumen.push("Objetivo: "+p.obj_tipo.toUpperCase()+" "+(p.obj_tipo==="flujo"?(fmtN0.format(p.obj_raw)+" €"):(fmtN1.format(p.obj_raw)+" %"))); }
      if(p.locs_text){ resumen.push("Zonas: "+p.locs_text); } if(p.budget){ resumen.push("Presupuesto total: "+fmtN0.format(p.budget)+" €"); }
      var body="Hola "+(p.nombre||"")+",%0D%0A%0D%0AResumen reunión:%0D%0A- "+resumen.join("%0D%0A- ")+"%0D%0A%0D%0AQuedo atento.%0D%0ASaludos.";
      window.location.href="mailto:"+encodeURIComponent(to)+"?subject="+encodeURIComponent("Unihouser — Resumen de reunión")+"&body="+body;
    });
    onClick("#dv_contract_btn", function(){ var to=this.dataset.to||""; if(!to) return; var body="Hola,%0D%0AAdjunto contrato para firma. Cualquier duda, dime.%0D%0ASaludos."; window.location.href="mailto:"+encodeURIComponent(to)+"?subject="+encodeURIComponent("Unihouser — Contrato de servicios")+"&body="+body; });
    onClick("#dv_whatsapp_btn", function(){ var tel=normPhone(this.dataset.tel||""); if(!tel) return; window.open("https://wa.me/"+tel+"?text="+encodeURIComponent("Te envío el resumen/contrato por email. Cualquier duda, dime."), "_blank"); });
    onClick("#dv_adv_btn", function(){ var idx=parseInt(this.dataset.idx,10), arr=Store.pros||[], p=arr[idx]; if(!p) return; p.fase=nextPhase(p.fase||"CONTACTO"); var subs=subestados[p.fase]||[]; p.sub=subs.length?subs[0]:""; Store.pros=arr; closeDrawer(); renderAll(); toast("Fase: "+p.fase,"ok"); });
    onClick("#dv_delete", function(){ var idx=parseInt(this.dataset.idx,10), arr=Store.pros||[], p=arr[idx]; if(!p) return; if(confirm("¿Eliminar a "+(p.nombre||"este prospecto")+"?")){ arr.splice(idx,1); Store.pros=arr; closeDrawer(); renderAll(); toast("Prospecto eliminado","ok"); } });
    onClick("#dv_save", function(){ var idx=parseInt(this.dataset.idx,10), arr=Store.pros||[], p=arr[idx]; if(!p) return; p.nombre=$("dv_nombre")?.value||""; p.email=$("dv_email")?.value||""; p.tel=$("dv_tel")?.value||""; p.locs_text=$("dv_locs")?.value||""; p.fase=$("dv_fase_sel")?.value||"CONTACTO"; p.sub=$("dv_sub_sel")?.value||""; Store.pros=arr; closeDrawer(); renderAll(); toast("Guardado","ok"); });
    onClick("#dv_meeting_btn", function(){ var idx=parseInt(this.dataset.idx,10), arr=Store.pros||[], p=arr[idx]; if(!p) return; p.__idx=idx; openMeeting(p); });
    onClick("#dv_evals_btn", function(){ var pid=this.dataset.pid||""; if(!pid) return; window.location.href="evaluaciones.html?prospect="+encodeURIComponent(pid); });

    // Modal reunión: listeners
    ["m_budget","m_inchonor","m_objt","m_objv","m_fin","m_finp","m_mesini"].forEach(function(id){
      var el=$(id); if(el){ ["input","change","blur"].forEach(function(ev){ el.addEventListener(ev, recalcMeeting); }); }
    });

    onClick("#m_cancel", function(){ closeMeeting(); });
    onClick("#m_save", function(){
      var idx=parseInt(this.dataset.idx,10), a=Store.pros||[], P=a[idx]; if(!P) return;

      // Personales
      P.dni=$("m_dni")?.value||""; P.dir=$("m_dir")?.value||""; P.loc_res=$("m_locres")?.value||"";
      P.email=$("m_email")?.value||P.email||""; P.tel=$("m_tel")?.value||P.tel||"";

      // Preferencias
      P.pref_tipo=$("m_tipo")?.value||"Tradicional"; P.locs_text=$("m_locsobj")?.value||"";
      P.n_activos=toNum($("m_nact")?.value); P.ascensor=$("m_asc")?.value||"Sí";
      P.altura_max=toNum($("m_altmax")?.value); P.bajo=$("m_bajo")?.value||"No";
      P.reforma=$("m_ref")?.value||"No"; P.mes_ini=$("m_mesini")?.value||""; P.mes_fin=$("m_mesfin")?.value||"";

      // Presupuesto / precio max
      P.budget=toNum($("m_budget")?.value); P.incluir_honor=$("m_inchonor")?.value||"si";
      P.pmax_compra=toNum(($("m_pmax")?.value||"").replace(/\./g,""));

      // Financiación
      P.financia=$("m_fin")?.value||"Sí"; P.broker=$("m_broker")?.value||"No"; P.fin_pct=toNum($("m_finp")?.value);
      P.fin_importe=toNum(($("m_fin_imp")?.value||"").replace(/\./g,""));
      P.aportacion=toNum(($("m_aport")?.value||"").replace(/\./g,""));

      // Objetivo
      P.obj_tipo=$("m_objt")?.value||"bruta"; P.obj_raw=toNum($("m_objv")?.value);
      P.alq_sugerido=toNum(($("m_alq_sug")?.value||"").replace(/\./g,""));

      Store.pros=a; closeMeeting(); renderAll(); toast("Datos de reunión guardados","ok");
    });

    // Fase -> subestados
    var faseSel=$("dv_fase_sel"); if(faseSel) faseSel.addEventListener("change", function(){ var v=this.value||"CONTACTO"; fillSubestadosSel(v,""); });
  }

  // ===== Drag & Drop =====
  function attachDragDrop(){
    document.addEventListener("dragstart", function(e){
      var card=e.target.closest(".card-mini"); if(!card) return;
      card.classList.add("dragging");
      e.dataTransfer.setData("text/plain", card.dataset.i||"");
    });
    document.addEventListener("dragend", function(e){
      var card=e.target.closest(".card-mini"); if(card) card.classList.remove("dragging");
      document.querySelectorAll(".column").forEach(function(c){ c.classList.remove("drop-target"); });
    });
    document.addEventListener("dragover", function(e){
      var col=e.target.closest('.column[data-drop="1"]'); if(!col) return;
      e.preventDefault(); col.classList.add("drop-target");
    });
    document.addEventListener("dragleave", function(e){
      var col=e.target.closest('.column[data-drop="1"]'); if(!col) return;
      col.classList.remove("drop-target");
    });
    document.addEventListener("drop", function(e){
      var col=e.target.closest('.column[data-drop="1"]'); if(!col) return;
      e.preventDefault();
      var idx=parseInt(e.dataTransfer.getData("text/plain"),10);
      var arr=Store.pros||[], p=arr[idx]; if(!p) return;
      var newPhase=col.getAttribute("data-col")||"CONTACTO";
      if(p.fase!==newPhase){
        p.fase=newPhase; var subs=subestados[p.fase]||[]; p.sub=subs.length?subs[0]:"";
        Store.pros=arr; renderAll(); toast("Movido a "+newPhase,"ok");
      }
    });
  }

  // ===== CSV =====
  function toCSV(rows){
    var esc=function(s){ if(s==null) return ""; s=String(s); if(s.includes('"')||s.includes(',')||s.includes('\n')) return '"'+s.replace(/"/g,'""')+'"'; return s; };
    var head=["Nombre","Email","Teléfono","Fase","Subestado","Tipo","Localidades","Objetivo","Objetivo_valor","Presupuesto","ID"];
    var lines=[head.join(",")];
    for(var i=0;i<rows.length;i++){
      var p=rows[i], objTxt=(p.obj_tipo||"").toUpperCase();
      var objVal=(p.obj_tipo==="flujo")?(fmtN0.format(p.obj_raw)):(fmtN1.format(p.obj_raw));
      lines.push([esc(p.nombre||""),esc(p.email||""),esc(p.tel||""),esc(p.fase||"CONTACTO"),esc(p.sub||""),esc(p.pref_tipo||""),esc(p.locs_text||""),esc(objTxt),esc(objVal),esc(p.budget?fmtN0.format(p.budget):""),esc(p.id||"")].join(","));
    }
    return lines.join("\n");
  }
  function downloadCSV(){
    var all=Store.pros||[], rows=applyFilters(all, readFilters());
    var csv=toCSV(rows), blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
    var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="unihouser_prospectos.csv";
    document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);document.body.removeChild(a);},500);
    toast("CSV exportado","ok");
  }

  document.addEventListener("DOMContentLoaded", function(){
    ensureIds();
    attach();
    attachDragDrop();
    renderAll();
  });
})();
