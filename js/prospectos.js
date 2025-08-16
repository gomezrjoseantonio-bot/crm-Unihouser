document.addEventListener('DOMContentLoaded', ()=>{
  if (typeof setupMoneyFormatting === 'function') setupMoneyFormatting();
  if (typeof setupMoneyLive === 'function') setupMoneyLive();
  const $ = id=>document.getElementById(id);
  const nf0 = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0});
  const nf1 = new Intl.NumberFormat('es-ES',{maximumFractionDigits:1});

  // Secciones por fase
  const gates = {
    F1: $('gateF1'), F2: $('gateF2'), F3: $('gateF3'), F4: $('gateF4'), F5: $('gateF5')
  };
  const stepsEl = $('steps');

  // Form refs
  const F = {
    idx: $('p_idx'),
    // F1
    nombre:$('p_nombre'), email:$('p_email'), tel:$('p_tel'), recordatorio:$('p_recordatorio'), sub_f1:$('p_sub_f1'),
    // F2
    dni:$('p_dni'), dir:$('p_dir'), loc_res:$('p_loc_res'),
    pref_tipo:$('p_pref_tipo'), obj_tipo:$('p_obj_tipo'), obj_val:$('p_obj_val'),
    budget:$('p_budget'), incl_honor:$('p_incl_honor'), max_compra:$('p_max_compra'),
    // F3
    locs_obj:$('p_locs_obj'), n_activos:$('p_n_activos'),
    no_asc:$('p_no_asc'), alt_max:$('p_alt_max'), bajos:$('p_bajos'), reforma:$('p_reforma'),
    inicio:$('p_inicio'), fin:$('p_fin'), notes:$('p_notes'),
    // F4/F5
    notaria_fecha:$('p_notaria_fecha'), sub_f5:$('p_sub_f5'),
    // global
    toast:$('p_toast'),
    // filtros / grid
    f_fase:$('f_fase'), f_tipo:$('f_tipo'), f_q:$('f_q'), tbody:$('p_body')
  };

  // Estado actual de fase en edición (no confundir con el guardado)
  let currentPhase = 'F1';

  // ---------- UI FASES ----------
  function setPhase(ph){
    currentPhase = ph;
    Object.entries(gates).forEach(([k,el])=> el.hidden = (k!==ph));
    stepsEl.querySelectorAll('.step').forEach(s=>{
      s.classList.toggle('active', s.dataset.phase===ph);
    });
  }
  stepsEl.addEventListener('click', (e)=>{
    const t=e.target.closest('.step'); if(!t) return;
    setPhase(t.dataset.phase);
  });

  // ---------- Helpers ----------
  function toast(msg='OK'){
    if(!F.toast) return;
    F.toast.textContent=msg; F.toast.hidden=false;
    clearTimeout(window._p_toast); window._p_toast=setTimeout(()=>F.toast.hidden=true, 2000);
  }
  function objLabel(p){
    if(p.obj_tipo==='flujo') return nf0.format(p.obj_raw||0)+' €';
    return nf1.format(p.obj_raw||0)+' %';
  }
  function minimalF1OK(){ return !!(F.email.value.trim() || F.tel.value.trim()); }
  function clampFinMes(){
    const s=F.inicio.value, e=F.fin.value; if(!s||!e) return;
    const [ys,ms]=s.split('-').map(Number), [ye,me]=e.split('-').map(Number);
    const max=new Date(ys,ms-1+5,1), end=new Date(ye,me-1,1);
    if(end>max) F.fin.value = ${max.getFullYear()}-${String(max.getMonth()+1).padStart(2,'0')};
  }
  F.inicio?.addEventListener('change',clampFinMes);
  F.fin?.addEventListener('change',clampFinMes);

  // Max compra desde presupuesto (usa Config)
  function recalcMaxCompra(){
    const cfg=Store.cfg||{};
    const itp=(cfg.c_itp??8)/100, notaria=(cfg.c_notaria??1500);
    const incl = F.incl_honor.value==='si', honor = incl?3500*1.21:0;
    const budget=parseEs(F.budget.value)||0;
    if(budget<=0){ F.max_compra.value=''; return; }
    const numerador=Math.max(0, budget-notaria-honor);
    const maxCompra = Math.max(0, numerador/(1+itp));
    F.max_compra.value = nf0.format(Math.round(maxCompra));
  }
  ['input','change'].forEach(ev=>{
    F.budget?.addEventListener(ev, recalcMaxCompra);
    F.incl_honor?.addEventListener(ev, recalcMaxCompra);
  });

  // ---------- Listado ----------
  function filtered(list){
    const fF=F.f_fase?.value||'', fT=F.f_tipo?.value||'', q=(F.f_q?.value||'').toLowerCase();
    return (list||[]).filter(p=>{
      if(fF && p.fase!==fF) return false;
      if(fT && p.pref_tipo!==fT) return false;
      if(q){
        const hay=(p.nombre||'').toLowerCase().includes(q) ||
                  (p.locs_text||'').toLowerCase().includes(q) ||
                  (p.loc_res||'').toLowerCase().includes(q) ||
                  (p.email||'').toLowerCase().includes(q);
        if(!hay) return false;
      }
      return true;
    });
  }
  function render(){
    F.tbody.innerHTML='';
    filtered(Store.pros||[]).forEach((p,i)=>{
      const contacto=[p.email,p.tel].filter(Boolean).join(' / ')||'—';
      const tr=document.createElement('tr');
      tr.innerHTML=`
        <td>${p.nombre||'—'}</td>
        <td>${contacto}</td>
        <td>${p.pref_tipo||'—'}</td>
        <td>${(p.obj_tipo||'').toUpperCase()} ${objLabel(p)}</td>
        <td>${p.budget? nf0.format(p.budget)+' €':'—'}</td>
        <td>${p.max_compra? nf0.format(p.max_compra)+' €':'—'}</td>
        <td>${p.fase||'F1'}</td>
        <td>${p.sub||'Contacto recibido'}</td>
        <td>
          <button class="btn ghost" data-act="edit" data-i="${i}">Editar</button>
          <button class="btn" data-act="phase" data-i="${i}">Avanzar fase</button>
          <button class="btn" data-act="del" data-i="${i}">Eliminar</button>
        </td>`;
      F.tbody.appendChild(tr);
    });
  }

  // ---------- Carga/edición ----------
  function clearForm(){
    F.idx.value=-1;
    ['nombre','email','tel','recordatorio','dni','dir','loc_res','obj_val','budget',
     'max_compra','locs_obj','n_activos','alt_max','notes','notaria_fecha'].forEach(k=>F[k]&&(F[k].value=''));
    F.sub_f1.value='Contacto recibido'; F.pref_tipo.value='Tradicional'; F.obj_tipo.value='bruta';
    F.incl_honor.value='si'; F.no_asc.value='no'; F.bajos.value='no'; F.reforma.value='No';
    F.inicio.value=''; F.fin.value=''; F.sub_f5.value='Notaría fijada';
    setPhase('F1');
  }
  function editRow(i){
    const arr=Store.pros||[]; const p=arr[i]; if(!p) return;
    F.idx.value=i;
    // F1
    F.nombre.value=p.nombre||''; F.email.value=p.email||''; F.tel.value=p.tel||'';
    F.recordatorio.value=p.recordatorio||''; F.sub_f1.value=p.sub_f1||p.sub||'Contacto recibido';
    // F2
    F.dni.value=p.dni||''; F.dir.value=p.dir||''; F.loc_res.value=p.loc_res||'';
    F.pref_tipo.value=p.pref_tipo||'Tradicional'; F.obj_tipo.value=p.obj_tipo||'bruta';
    F.obj_val.value = (p.obj_tipo==='flujo')? (p.obj_raw||0) : String(p.obj_raw||'').replace('.',',');
    F.budget.value=p.budget? nf0.format(p.budget):''; F.incl_honor.value=p.incl_honor||'si';
    F.max_compra.value=p.max_compra? nf0.format(p.max_compra):'';
    // F3
    F.locs_obj.value=p.locs_text||''; F.n_activos.value=p.n_activos||'';
    F.no_asc.value=p.no_asc||'no'; F.alt_max.value=p.alt_max||''; F.bajos.value=p.bajos||'no'; F.reforma.value=p.reforma||'No';
    F.inicio.value=p.inicio||''; F.fin.value=p.fin||''; F.notes.value=p.notes||'';
    // F5
    F.notaria_fecha.value=p.notaria_fecha||''; F.sub_f5.value=p.sub_f5||'Notaría fijada';

    setPhase(p.fase||'F1');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function advancePhaseObj(p){
    const order=['F1','F2','F3','F4','F5'];
    const i=order.indexOf(p.fase||'F1'); p.fase=order[Math.min(order.length-1,i+1)];
    if(p.fase==='F2') p.sub='Contrato enviado';
    if(p.fase==='F3') p.sub='Propuesta enviada';
    if(p.fase==='F4') p.sub='Pendientes (arras)';
    if(p.fase==='F5') p.sub='Notaría fijada';
  }

  // ---------- Guardar ----------
  function collect(){
    const obj_tipo=F.obj_tipo.value;
    const obj_raw=parseEs(F.obj_val.value);
    const budget=parseEs(F.budget.value)||0;
    const max_compra=parseEs(F.max_compra.value)||0;

    const rec={
      fase: currentPhase,
      // F1
      nombre:F.nombre.value.trim(), email:F.email.value.trim(), tel:F.tel.value.trim(),
      recordatorio:F.recordatorio.value||'', sub_f1:F.sub_f1.value, sub:F.sub_f1.value,
      // F2
      dni:F.dni.value.trim(), dir:F.dir.value.trim(), loc_res:F.loc_res.value.trim(),
      pref_tipo:F.pref_tipo.value, obj_tipo,
      obj_raw: Number.isFinite(obj_raw)? obj_raw : (obj_tipo==='flujo'?0:0),
      budget, incl_honor:F.incl_honor.value, max_compra,
      // F3
      locs_text:F.locs_obj.value.trim(), n_activos:parseEs(F.n_activos.value)||0,
      no_asc:F.no_asc.value, alt_max:parseEs(F.alt_max.value)||0, bajos:F.bajos.value, reforma:F.reforma.value,
      inicio:F.inicio.value||'', fin:F.fin.value||'', notes:F.notes.value.trim(),
      // F5
      notaria_fecha:F.notaria_fecha.value||'', sub_f5:F.sub_f5.value,
      ts: Date.now()
    };
    return rec;
  }

  function save(){
    // Validación mínima por fase
    if(currentPhase==='F1' && !minimalF1OK()){
      alert('En F1 necesitas al menos email o teléfono.'); return;
    }
    const arr=Store.pros||[]; const idx=parseInt(F.idx.value||'-1',10);
    const rec=collect();
    if(idx>=0) arr[idx]=rec; else arr.unshift(rec);
    Store.pros=arr; render(); toast('✅ Prospecto guardado');
  }

  // ---------- Acciones de fase (emails, pdf ligero, navegación) ----------
  function mailto(to, subject, body){
    const href=mailto:${encodeURIComponent(to||'')}+
      ?subject=${encodeURIComponent(subject||'')}+
      &body=${encodeURIComponent(body||'')};
    window.open(href,'_blank');
  }
  function takeName(){ return (F.nombre.value||'Cliente').trim(); }

  function printSummary(phase){
    const cfg=Store.cfg||{};
    const html=`<html><head><meta charset="utf-8"><title>Resumen ${phase}</title>
      <style>body{font-family:Inter,Arial;padding:24px} h1{margin:0 0 8px}
      .k{color:#666}.b{font-weight:700}</style></head><body>
      <h1>Unihouser · Resumen ${phase}</h1>
      <p><span class="k">Cliente:</span> <span class="b">${takeName()}</span></p>
      <p><span class="k">Email:</span> ${F.email.value||'—'} · <span class="k">Tel:</span> ${F.tel.value||'—'}</p>
      <hr>
      <p><span class="k">Tipo:</span> ${F.pref_tipo.value||'—'} · <span class="k">Objetivo:</span> ${F.obj_tipo.value||'—'} ${F.obj_val.value||''}</p>
      <p><span class="k">Presupuesto total:</span> ${F.budget.value||'—'} · <span class="k">Máx compra:</span> ${F.max_compra.value||'—'}</p>
      <p><span class="k">Localidades objetivo:</span> ${F.locs_obj.value||'—'}</p>
      <p><span class="k">Notas:</span> ${F.notes.value||'—'}</p>
      <hr>
      <small>© Unihouser · unihouser.es · info@unihouser.es · 644 300 200</small>
    </body></html>`;
    const w=window.open('','_blank'); w.document.write(html); w.document.close(); w.focus(); w.print();
  }

  // Delegación de eventos
  document.addEventListener('click',(e)=>{
    const t=e.target.closest('button'); if(!t) return;

    // Global
    if(t.id==='p_save'){ save(); return; }
    if(t.id==='p_clear'){ clearForm(); toast('Formulario limpio'); return; }

    // Navegación fases
    if(t.id==='toF2'){ currentPhase='F2'; setPhase('F2'); save(); return; }
    if(t.id==='toF3'){ currentPhase='F3'; setPhase('F3'); save(); return; }
    if(t.id==='toF4'){ currentPhase='F4'; setPhase('F4'); save(); return; }
    if(t.id==='toF5'){ currentPhase='F5'; setPhase('F5'); save(); return; }
    if(t.id==='toF1'){ currentPhase='F1'; setPhase('F1'); save(); return; }
    if(t.id==='backF2'){ setPhase('F2'); return; }
    if(t.id==='backF3'){ setPhase('F3'); return; }
    if(t.id==='backF4'){ setPhase('F4'); return; }

    // Acciones F1
    if(t.id==='f1_email'){
      if(!F.email.value){ alert('Necesitas un email.'); return; }
      mailto(F.email.value, 'Unihouser · Primer contacto',
        Hola ${takeName()},%0D%0A%0D%0ASoy de Unihouser. Gracias por tu interés. ¿Cuándo te viene bien una breve reunión para alinear objetivos y presupuesto?%0D%0A%0D%0ASaludos.);
      return;
    }
    if(t.id==='f1_pdf'){ printSummary('F1 · Contacto'); return; }

    // Acciones F2
    if(t.id==='f2_pdf'){ printSummary('F2 · Reunión'); return; }
    if(t.id==='f2_mail_ok'){
      if(!F.email.value){ alert('Necesitas un email.'); return; }
      mailto(F.email.value, 'Unihouser · Contrato de servicio',
        Hola ${takeName()},%0D%0A%0D%0ATe envío contrato para firma. Objetivo: ${F.obj_tipo.value} ${F.obj_val.value}. Presupuesto total: ${F.budget.value}. Máx compra: ${F.max_compra.value}.%0D%0A%0D%0ASaludos.);
      return;
    }
    if(t.id==='f2_mail_no'){
      if(!F.email.value){ alert('Necesitas un email.'); return; }
      mailto(F.email.value, 'Unihouser · Gracias por tu tiempo',
        Hola ${takeName()},%0D%0A%0D%0AGracias por la conversación. Si en el futuro cambian tus planes, estaremos encantados de ayudarte.%0D%0A%0D%0ASaludos.);
      return;
    }
    if(t.id==='f2_contrato'){
      // Marcador de posición: aquí podríamos abrir una plantilla de contrato
      alert('Generación de contrato: prepararemos la plantilla para auto-rellenar.');
      return;
    }

    // Acciones F3/F4
    if(t.id==='f3_enviar_props'){
      if(!F.email.value){ alert('Necesitas un email.'); return; }
      mailto(F.email.value, 'Unihouser · Propuesta enviada',
        Hola ${takeName()},%0D%0A%0D%0ATe acabamos de enviar una propuesta de activo ajustada a tus criterios. Quedo atento a tu feedback.%0D%0A%0D%0ASaludos.);
      return;
    }
    if(t.id==='f3_reserva'){ toast('Reserva activada'); currentPhase='F3'; save(); return; }
    if(t.id==='f4_pendientes'){ toast('Arras: pendientes'); currentPhase='F4'; save(); return; }
    if(t.id==='f4_firmadas'){ toast('Arras firmadas'); currentPhase='F4'; save(); return; }

    // F5
    if(t.id==='f5_cerrar'){ toast('Operación completada'); currentPhase='F5'; save(); return; }
  });

  // Tabla acciones
  document.addEventListener('click',(e)=>{
    const b=e.target.closest('button[data-act]'); if(!b) return;
    const i=parseInt(b.dataset.i||'-1',10); const arr=Store.pros||[]; const p=arr[i]; if(!p) return;
    if(b.dataset.act==='edit'){ editRow(i); }
    if(b.dataset.act==='phase'){ advancePhaseObj(p); Store.pros=arr; render(); }
    if(b.dataset.act==='del'){ if(confirm('¿Eliminar prospecto?')){ arr.splice(i,1); Store.pros=arr; render(); } }
  });

  // Filtros
  ['change','input'].forEach(ev=>{
    F.f_fase?.addEventListener(ev, render);
    F.f_tipo?.addEventListener(ev, render);
    F.f_q?.addEventListener(ev, render);
  });

  // Inicial
  setPhase('F1');
  render();

  // Recalc max compra si había presupuesto guardado
  recalcMaxCompra();
});
