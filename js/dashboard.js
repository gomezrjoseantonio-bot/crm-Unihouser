function(){
  "use strict";

  /* ===== Store ===== */
  var Store = window.Store || {
    get pros(){ try{return JSON.parse(localStorage.getItem("pros")||"[]");}catch(_){return[];} },
    set pros(v){ localStorage.setItem("pros", JSON.stringify(v)); },
    get evals(){ try{return JSON.parse(localStorage.getItem("evals")||"[]");}catch(_){return[];} },
    set evals(v){ localStorage.setItem("evals", JSON.stringify(v)); },
    get cfg(){  try{return JSON.parse(localStorage.getItem("cfg")||"{}");}catch(_){return{};} },
    set cfg(v){ localStorage.setItem("cfg", JSON.stringify(v)); }
  };

  /* ===== Utils ===== */
  var fmtN0=new Intl.NumberFormat("es-ES",{maximumFractionDigits:0});
  var fmtN1=new Intl.NumberFormat("es-ES",{maximumFractionDigits:1});
  function $(id){return document.getElementById(id);}
  function toNum(v){var s=String(v||"").replace(/\./g,"").replace(",","."); var n=Number(s); return Number.isFinite(n)?n:0;}
  function uid(){return "p_"+Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4);}
  function toast(msg,t){var w=$("toasts"); if(!w) return; var d=document.createElement("div"); d.className="toast "+(t||""); d.textContent=msg; w.appendChild(d); setTimeout(()=>d.style.opacity="0",1800); setTimeout(()=>w.removeChild(d),2400);}
  function normPhone(t){return t?String(t).replace(/[^\d+]/g,""):""}

  function attachMoneyLive(){
    document.addEventListener("input", e=>{
      var t=e.target; if(!t.matches||!t.matches("input[data-money-live]")) return;
      var digits=(t.value||"").replace(/[^\d]/g,""); t.value=digits?fmtN0.format(+digits):"";
    });
    document.addEventListener("blur", e=>{
      var t=e.target; if(!t.matches||!t.matches("input[data-money-live]")) return;
      t.value = toNum(t.value)?fmtN0.format(toNum(t.value)):"";
    }, true);
  }

  /* ===== Fases ===== */
  var phases=["CONTACTO","REUNION","BUSQUEDA","COMPRAVENTA","NOTARIA"];
  var subestados={
    CONTACTO:["Pendiente contactar","Contactado","Descartado"],
    REUNION:["Reunión agendada","Reunión hecha","Descartado"],
    BUSQUEDA:["Propuesta enviada","Reserva","Arras firmadas","Descartado"],
    COMPRAVENTA:["Notaría fijada","Pendiente financiación","Descartado"],
    NOTARIA:["Escritura firmada","Descartado"]
  };
  function nextPhase(f){var i=phases.indexOf(f||"CONTACTO"); if(i<0)i=0; return (i>=phases.length-1)?phases[i]:phases[i+1];}

  /* ===== IDs & Evals ===== */
  function ensureIds(){var a=Store.pros||[],ch=false; for(var i=0;i<a.length;i++){ if(!a[i].id){a[i].id=uid(); ch=true;} } if(ch) Store.pros=a;}
  function evalsByProspect(pid){var evs=Store.evals||[]; return evs.filter(e=>Array.isArray(e.prospect_ids)&&e.prospect_ids.includes(pid));}
  function scoreDotFor(p){
    var objT=p.obj_tipo, goal=toNum(p.obj_raw); if(!objT||!goal) return "gray";
    var evs=evalsByProspect(p.id); if(!evs.length) return "gray";
    var best=evs.find(e=>e.kpi_tipo===objT)||evs[0]; var val=Number(best.kpi_val)||0;
    if(objT==="flujo"){ if(val>=goal) return "green"; if(val>=goal*0.9) return "amber"; return "red"; }
    else{ if(val>=goal) return "green"; if(val>=goal-1) return "amber"; return "red"; }
  }

  /* ===== Filtros ===== */
  function readFilters(){return{
    q:($("f_q")?.value||"").trim().toLowerCase(),
    fase:$("f_fase")?.value||"",
    tipo:$("f_tipo")?.value||"",
    loc:($("f_loc")?.value||"").trim().toLowerCase(),
    fin:($("f_fin")?.value||"")
  };}
  function applyFilters(rows,f){
    return rows.filter(p=>{
      if(!p) return false;
      var hay=((p.nombre||"")+" "+(p.email||"")+" "+(p.tel||"")).toLowerCase();
      if(f.q && !hay.includes(f.q)) return false;
      if(f.fase && (p.fase||"CONTACTO")!==f.fase) return false;
      if(f.tipo && (p.pref_tipo||"")!==f.tipo) return false;
      if(f.loc && !String(p.locs_text||"").toLowerCase().includes(f.loc)) return false;
      if(f.fin && (p.financia||"")!==f.fin) return false;
      return true;
    });
  }

  /* ===== KPIs ===== */
  function renderKPIs(rows){
    var c={CONTACTO:0,REUNION:0,BUSQUEDA:0,COMPRAVENTA:0,NOTARIA:0};
    rows.forEach(p=>{c[p.fase||"CONTACTO"]=(c[p.fase||"CONTACTO"]||0)+1;});
    $("k_total").textContent=rows.length||0;
    $("k_contacto").textContent=c.CONTACTO||0;
    $("k_reunion").textContent=c.REUNION||0;
    $("k_busqueda").textContent=c.BUSQUEDA||0;
    $("k_compra").textContent=c.COMPRAVENTA||0;
    $("k_notaria").textContent=c.NOTARIA||0;
  }

  /* ===== Kanban ===== */
  function cardHTML(p, idx){
    var objTxt=(p.obj_tipo==="flujo")?(fmtN0.format(p.obj_raw)+" €"):(fmtN1.format(p.obj_raw)+" %");
    var dot=scoreDotFor(p);
    var chips=(p.locs_text||"—").split(",").slice(0,2).map(x=>x.trim()).filter(Boolean).map(x=><span class="tag">${x}</span>).join("");
    return `
    <div class="card-mini" draggable="true" data-i="${idx}" data-id="${p.id||""}">
      <div class="flex between">
        <div><strong>${p.nombre||"—"}</strong></div>
        <span class="badge">${p.pref_tipo||"—"} <span class="dot ${dot}"></span></span>
      </div>
      <div style="margin-top:4px;font-size:13px;color:#475467">${(p.obj_tipo||"").toUpperCase()} ${objTxt}</div>
      <div class="tags">${chips}</div>
      <div class="actions-row">
        <button class="icon-btn act-mail" title="Email" data-i="${idx}">✉</button>
        <button class="icon-btn act-wa" title="WhatsApp" data-i="${idx}">🗨</button>
        <button class="icon-btn act-open" title="Abrir" data-i="${idx}">➤</button>
        <button class="icon-btn act-next" title="Avanzar fase" data-i="${idx}">➡</button>
        <button class="icon-btn act-del" title="Eliminar" data-i="${idx}">🗑</button>
      </div>
    </div>`;
  }
  function renderKanban(rows){
    var wrap=$("kanban"); if(!wrap) return;
    wrap.querySelectorAll(".column").forEach(col=>{
      var t=col.querySelector("h4")?.textContent||""; col.innerHTML=<h4>${t}</h4>; col.classList.add("dropzone");
    });
    rows.forEach((p,i)=>{
      p.__idx=i; var col=wrap.querySelector(.column[data-col="${p.fase||"CONTACTO"}"]);
      if(col) col.insertAdjacentHTML("beforeend", cardHTML(p,i));
    });
    enableDnD();
  }

  /* ===== Tabla ===== */
  function renderTable(rows){
    var tb=$("tbody"); if(!tb) return;
    if(!rows.length){tb.innerHTML='<tr><td colspan="10" style="text-align:center;color:#667085">Sin datos</td></tr>'; return;}
    tb.innerHTML = rows.map((p,i)=>{
      var objTxt=(p.obj_tipo==="flujo")?(fmtN0.format(p.obj_raw)+" €"):(fmtN1.format(p.obj_raw)+" %");
      return `<tr>
        <td>${p.nombre||"—"}</td>
        <td>${p.email||"—"}</td>
        <td>${p.tel||"—"}</td>
        <td>${p.fase||"CONTACTO"}</td>
        <td>${p.sub||"—"}</td>
        <td>${p.pref_tipo||"—"}</td>
        <td>${p.locs_text||"—"}</td>
        <td>${(p.obj_tipo||"").toUpperCase()} ${objTxt}</td>
        <td>${p.budget?fmtN0.format(p.budget):"—"}</td>
        <td><button class="btn open-drawer" data-i="${i}">Abrir</button></td>
      </tr>`;
    }).join("");
  }

  /* ===== Drawer ===== */
  function fillSubestadosSel(fase,current){
    var sel=$("dv_sub_sel"); if(!sel) return; sel.innerHTML="";
    (subestados[fase]||["—"]).forEach(s=>{
      var o=document.createElement("option"); o.value=s; o.textContent=s; if(s===current) o.selected=true; sel.appendChild(o);
    });
  }
  function openDrawer(p){
    $("dv_title").textContent=p.nombre||"Prospecto";
    $("dv_fase").textContent="Fase: "+(p.fase||"CONTACTO");
    $("dv_tipo").textContent="Tipo: "+(p.pref_tipo||"—");
    var objTxt=(p.obj_tipo==="flujo")?(fmtN0.format(p.obj_raw)+" €"):(fmtN1.format(p.obj_raw)+" %");
    $("dv_obj").textContent="Objetivo: "+(p.obj_tipo||"").toUpperCase()+" "+objTxt;
    $("dv_evals").textContent="Evaluaciones: "+(evalsByProspect(p.id).length||0);
    $("dv_nombre").value=p.nombre||""; $("dv_email").value=p.email||""; $("dv_tel").value=p.tel||""; $("dv_locs").value=p.locs_text||"";
    $("dv_fase_sel").value=p.fase||"CONTACTO"; fillSubestadosSel(p.fase||"CONTACTO", p.sub||"");
    $("dv_email_btn").dataset.to=p.email||""; $("dv_contract_btn").dataset.to=p.email||""; $("dv_whatsapp_btn").dataset.tel=p.tel||"";
    $("dv_adv_btn").dataset.idx=p._idx; $("dv_save").dataset.idx=p.idx; $("dv_delete").dataset.idx=p._idx; 
    $("dv_meeting_btn").dataset.idx=p.__idx; $("dv_evals_btn").dataset.pid=p.id||"";
    $("drawer").classList.add("open"); $("drawer").setAttribute("aria-hidden","false");
  }
  function closeDrawer(){ $("drawer")?.classList.remove("open"); $("drawer")?.setAttribute("aria-hidden","true"); }

  /* ===== Config & Cálculos reunión ===== */
  function cfgOrDefaults(){var c=Store.cfg||{}; return {
    itp_pct: toNum(c.itp_pct)||8, not_eur: toNum(c.notaria)||1500, honor_eur: toNum(c.honorarios)||0
  };}
  function calcPrecioMaxCompra(budget, includeHonor){
    var c=cfgOrDefaults(), itp=c.itp_pct/100, not=c.not_eur, hon=c.honor_eur;
    var num=Math.max(0, budget - not - (includeHonor?hon:0));
    return Math.max(0, Math.floor(num/(1+itp)));
  }
  function monthPlus5(v){ if(!v||!/\d{4}-\d{2}/.test(v))return""; var y=+v.slice(0,4), m=+v.slice(5,7)+5; while(m>12){m-=12;y++;} return y+"-"+(m<10?"0"+m:m); }

  /* ===== Modal reunión ===== */
  function openMeeting(p){
    $("m_dni").value=p.dni||""; $("m_dir").value=p.dir||""; $("m_locres").value=p.loc_res||"";
    $("m_email").value=p.email||""; $("m_tel").value=p.tel||"";
    $("m_tipo").value=p.pref_tipo||"Tradicional"; $("m_locsobj").value=p.locs_text||"";
    $("m_nact").value=p.n_activos||1; $("m_asc").value=p.ascensor||"Sí"; $("m_altmax").value=p.altura_max||1; $("m_bajo").value=p.bajo||"No";
    $("m_ref").value=p.reforma||"No"; $("m_mesini").value=p.mes_ini||""; $("m_mesfin").value=p.mes_fin||"";
    $("m_budget").value=p.budget?fmtN0.format(p.budget):""; $("m_inchonor").value=p.incluir_honor||"si"; $("m_pmax").value=p.pmax_compra?fmtN0.format(p.pmax_compra):"";
    $("m_fin").value=p.financia||"Sí"; $("m_broker").value=p.broker||"No"; $("m_finp").value=p.fin_pct||"80";
    $("m_fin_imp").value=p.fin_importe?fmtN0.format(p.fin_importe):""; $("m_aport").value=p.aportacion?fmtN0.format(p.aportacion):"";
    $("m_objt").value=p.obj_tipo||"bruta"; $("m_objv").value=p.obj_raw||""; $("m_alq_sug").value=p.alq_sugerido?fmtN0.format(p.alq_sugerido):"";
    $("m_save").dataset.idx=p.__idx; $("meetModal").classList.add("open"); $("meetModal").setAttribute("aria-hidden","false");
  }
  function closeMeeting(){ $("meetModal")?.classList.remove("open"); $("meetModal")?.setAttribute("aria-hidden","true"); }

  function recalcMeeting(){
    var c=cfgOrDefaults(), itpPct=c.itp_pct/100, not=c.not_eur, hon=c.honor_eur;
    var budget=toNum($("m_budget")?.value||0), includeHonor=(($("m_inchonor")?.value||"si")==="si");
    var pmax=calcPrecioMaxCompra(budget, includeHonor); $("m_pmax").value=pmax?fmtN0.format(pmax):"";
    var itpVal=Math.round(pmax*itpPct), totalSinHonor=pmax+itpVal+not, totalConHonor=totalSinHonor+hon;

    var fin=( $("m_fin")?.value||"Sí")==="Sí", finp=toNum($("m_finp")?.value||80), financiado=fin?Math.round(pmax*(finp/100)):0;
    var aport = includeHonor ? Math.max(0,totalConHonor-financiado) : Math.max(0,totalSinHonor-financiado+hon);
    $("m_fin_imp").value=financiado?fmtN0.format(financiado):""; $("m_aport").value=aport?fmtN0.format(aport):"";

    var objt=$("m_objt")?.value||"bruta", objv=toNum($("m_objv")?.value||0);
    if(objt==="bruta" && objv>0){ var anual=Math.round((objv/100)*totalSinHonor); $("m_alq_sug").value=fmtN0.format(Math.max(0,Math.round(anual/12))); }
    else $("m_alq_sug").value="";

    var mi=$("m_mesini")?.value||""; if(mi) $("m_mesfin").value=monthPlus5(mi);
  }

  /* ===== Render ===== */
  function renderAll(){
    ensureIds();
    var all=(Store.pros||[]).map((p,i)=>{p.__idx=i; return p;});
    var rows=applyFilters(all, readFilters());
    renderKPIs(rows); renderKanban(rows); renderTable(rows);
  }

  /* ===== Delegación ===== */
  function onClick(sel,fn){
    document.addEventListener("click",e=>{
      var t=e.target; while(t && t!==document){ if(t.matches&&t.matches(sel)){ fn.call(t,e); return;} t=t.parentNode; }
    });
  }

  function attach(){
    attachMoneyLive();

    // Filtros
    onClick("#f_clear", ()=>{ $("f_q").value=""; $("f_fase").value=""; $("f_tipo").value=""; $("f_loc").value=""; $("f_fin").value=""; renderAll(); toast("Filtros limpiados","ok"); });
    onClick("#f_apply", ()=>{ renderAll(); toast("Filtros aplicados","ok"); });
    onClick("#btn_csv", ()=>downloadCSV());

    // Kanban
    onClick(".act-mail", function(){
      var p=(Store.pros||[])[+this.dataset.i]; if(!p||!p.email) return;
      var resumen=[]; if(p.obj_tipo){resumen.push("Objetivo: "+p.obj_tipo.toUpperCase()+" "+(p.obj_tipo==="flujo"?fmtN0.format(p.obj_raw)+" €":fmtN1.format(p.obj_raw)+" %")); }
      if(p.locs_text) resumen.push("Zonas: "+p.locs_text); if(p.budget) resumen.push("Presupuesto: "+fmtN0.format(p.budget)+" €");
      var body="Hola "+(p.nombre||"")+",%0D%0A%0D%0AResumen:%0D%0A- "+resumen.join("%0D%0A- ")+"%0D%0A%0D%0AUn saludo.";
      location.href="mailto:"+encodeURIComponent(p.email)+"?subject="+encodeURIComponent("Unihouser — Seguimiento")+"&body="+body;
    });
    onClick(".act-wa", function(){ var p=(Store.pros||[])[+this.dataset.i]; if(!p) return; var tel=normPhone(p.tel); if(!tel) return; window.open("https://wa.me/"+tel+"?text="+encodeURIComponent("Te envío el resumen por email. Seguimos."),"_blank"); });
    onClick(".act-open, .open-drawer", function(){ var p=(Store.pros||[])[+this.dataset.i]; if(!p) return; p.__idx=+this.dataset.i; openDrawer(p); });
    onClick(".act-next", function(){ var arr=Store.pros||[]; var p=arr[+this.dataset.i]; if(!p) return; p.fase=nextPhase(p.fase||"CONTACTO"); p.sub=""; Store.pros=arr; renderAll(); toast("Movido a "+p.fase,"ok"); });
    onClick(".act-del", function(){ var arr=Store.pros||[]; var i=+this.dataset.i; if(arr[i] && confirm("Eliminar este prospecto?")){arr.splice(i,1); Store.pros=arr; renderAll(); toast("Eliminado","ok"); }});

    // Drawer
    onClick("#dv_close", ()=>closeDrawer());
    onClick("#dv_save", function(){ var i=+this.dataset.idx, arr=Store.pros||[]; var p=arr[i]; if(!p) return;
      p.nombre=$("dv_nombre").value; p.email=$("dv_email").value; p.tel=$("dv_tel").value; p.locs_text=$("dv_locs").value;
      p.fase=$("dv_fase_sel").value; p.sub=$("dv_sub_sel").value; arr[i]=p; Store.pros=arr; renderAll(); toast("Prospecto actualizado","ok");
    });
    onClick("#dv_delete", function(){ var i=+this.dataset.idx, arr=Store.pros||[]; if(arr[i] && confirm("Eliminar este prospecto?")){ arr.splice(i,1); Store.pros=arr; closeDrawer(); renderAll(); toast("Eliminado","ok"); }});
    onClick("#dv_adv_btn", function(){ var i=+this.dataset.idx, arr=Store.pros||[]; var p=arr[i]; if(!p) return; p.fase=nextPhase(p.fase||"CONTACTO"); p.sub=""; Store.pros=arr; openDrawer(p); renderAll(); toast("Avanzado a "+p.fase,"ok"); });
    onClick("#dv_meeting_btn", function(){ var p=(Store.pros||[])[+this.dataset.idx]; if(!p) return; p.__idx=+this.dataset.idx; openMeeting(p); });
    onClick("#dv_evals_btn", function(){ var pid=this.dataset.pid||""; if(!pid) return; location.href="evaluaciones.html?prospect="+encodeURIComponent(pid); });

    // Modal reunión: recálculo
    ["m_budget","m_inchonor","m_fin","m_finp","m_objt","m_objv","m_mesini"].forEach(id=>{
      document.addEventListener("input", e=>{ if(e.target && e.target.id===id) recalcMeeting(); });
      document.addEventListener("change", e=>{ if(e.target && e.target.id===id) recalcMeeting(); });
    });
    onClick("#m_cancel", ()=>closeMeeting());
    onClick("#m_save", function(){
      var i=+this.dataset.idx, arr=Store.pros||[]; var p=arr[i]; if(!p) return;
      p.dni=$("m_dni").value; p.dir=$("m_dir").value; p.loc_res=$("m_locres").value; p.email=$("m_email").value; p.tel=$("m_tel").value;
      p.pref_tipo=$("m_tipo").value; p.locs_text=$("m_locsobj").value; p.n_activos=toNum($("m_nact").value);
      p.ascensor=$("m_asc").value; p.altura_max=toNum($("m_altmax").value); p.bajo=$("m_bajo").value; p.reforma=$("m_ref").value;
      p.mes_ini=$("m_mesini").value; p.mes_fin=$("m_mesfin").value;
      p.budget=toNum($("m_budget").value); p.incluir_honor=$("m_inchonor").value; p.pmax_compra=toNum($("m_pmax").value);
      p.financia=$("m_fin").value; p.broker=$("m_broker").value; p.fin_pct=toNum($("m_finp").value);
      p.fin_importe=toNum($("m_fin_imp").value); p.aportacion=toNum($("m_aport").value);
      p.obj_tipo=$("m_objt").value; p.obj_raw=toNum($("m_objv").value); p.alq_sugerido=toNum($("m_alq_sug").value);
      arr[i]=p; Store.pros=arr; closeMeeting(); renderAll(); toast("Reunión guardada","ok");
    });

    // Toggle tabla flotante
    document.body.insertAdjacentHTML("beforeend",
      '<div style="position:fixed;right:16px;top:96px;z-index:9"><button class="btn" id="toggleTable">Mostrar tabla</button></div>');
    onClick("#toggleTable", function(){
      var el=$("tableWrap"); if(!el) return; var on=el.style.display!=="none"; el.style.display=on?"none":"block"; this.textContent=on?"Mostrar tabla":"Ocultar tabla";
    });

    // ESC cierra overlays
    document.addEventListener("keydown", e=>{ if(e.key==="Escape"){ closeMeeting(); closeDrawer(); } });
  }

  /* ===== Drag & Drop ===== */
  function enableDnD(){
    document.querySelectorAll(".card-mini").forEach(card=>{
      card.addEventListener("dragstart", e=>{ card.classList.add("dragging"); e.dataTransfer.setData("text/plain", card.dataset.i||""); });
      card.addEventListener("dragend", ()=>{ card.classList.remove("dragging"); document.querySelectorAll(".column").forEach(c=>c.classList.remove("drop-target")); });
    });
    document.querySelectorAll(".column[data-drop='1']").forEach(col=>{
      col.addEventListener("dragover", e=>{ e.preventDefault(); col.classList.add("drop-target"); });
      col.addEventListener("dragleave", ()=>col.classList.remove("drop-target"));
      col.addEventListener("drop", e=>{
        e.preventDefault(); col.classList.remove("drop-target");
        var idx=+e.dataTransfer.getData("text/plain"); var arr=Store.pros||[]; var p=arr[idx]; if(!p) return;
        p.fase=col.getAttribute("data-col")||"CONTACTO"; p.sub=""; Store.pros=arr; renderAll(); toast("Movido a "+p.fase,"ok");
      });
    });
  }

  /* ===== CSV ===== */
  function downloadCSV(){
    var rows=applyFilters(Store.pros||[], readFilters()); if(!rows.length){ toast("Nada que exportar","warn"); return; }
    var lines=[["Nombre","Email","Teléfono","Fase","Subestado","Tipo","Localidades","Objetivo","Valor","Presupuesto"].join(";")];
    rows.forEach(p=>{
      lines.push([p.nombre||"",p.email||"",p.tel||"",p.fase||"",p.sub||"",p.pref_tipo||"",String(p.locs_text||"").replace(/;/g,","),(p.obj_tipo||"").toUpperCase(),p.obj_raw||"",p.budget||""].join(";"));
    });
    var blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"});
    var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="prospectos.csv"; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),800);
  }

  /* ===== Init ===== */
  document.addEventListener("DOMContentLoaded", ()=>{ attach(); ensureIds(); renderAll(); });
})();
