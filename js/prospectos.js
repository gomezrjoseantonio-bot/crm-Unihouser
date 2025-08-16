document.addEventListener('DOMContentLoaded', ()=>{
  // utilidades
  if (typeof setupMoneyFormatting === 'function') setupMoneyFormatting();
  if (typeof setupMoneyLive === 'function') setupMoneyLive();
  const $ = id=>document.getElementById(id);
  const nf0 = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0});
  const nf1 = new Intl.NumberFormat('es-ES',{maximumFractionDigits:1});

  // ---- refs de formulario
  const form = {
    idx: $('p_idx'),
    nombre: $('p_nombre'), dni:$('p_dni'),
    email:$('p_email'), tel:$('p_tel'), dir:$('p_dir'), loc_res:$('p_loc_res'),
    locs_obj:$('p_locs_obj'), pref_tipo:$('p_pref_tipo'), n_activos:$('p_n_activos'),
    no_asc:$('p_no_asc'), alt_max:$('p_alt_max'), bajos:$('p_bajos'), reforma:$('p_reforma'),
    budget:$('p_budget'), incl_honor:$('p_incl_honor'), max_compra:$('p_max_compra'),
    financia:$('p_financia'), broker:$('p_broker'), ltv:$('p_ltv'),
    obj_tipo:$('p_obj_tipo'), obj_val:$('p_obj_val'), obj_flow:$('p_obj_flow'),
    inicio:$('p_inicio'), fin:$('p_fin'), notes:$('p_notes'),
    fase:$('p_fase'), sub:$('p_sub'), recordatorio:$('p_recordatorio')
  };
  const filters = { fase:$('f_fase'), tipo:$('f_tipo'), q:$('f_q') };
  const tbody = $('p_body');
  const toast = $('p_toast');

  // ---- helpers
  function showToast(msg='✅ Prospecto guardado'){
    if(!toast) return; toast.textContent=msg; toast.hidden=false;
    clearTimeout(window._p_toast); window._p_toast=setTimeout(()=> toast.hidden=true, 2000);
  }
  function clearForm(){
    form.idx.value=-1;
    ['nombre','dni','email','tel','dir','loc_res','locs_obj','n_activos','alt_max',
     'budget','max_compra','ltv','obj_val','obj_flow','inicio','fin','notes','p_recordatorio']
     .forEach(k=> (form[k]||{}).value='');
    form.pref_tipo.value='Tradicional'; form.no_asc.value='no'; form.bajos.value='no'; form.reforma.value='No';
    form.incl_honor.value='si'; form.financia.value='si'; form.broker.value='no';
    form.fase.value='F1'; form.sub.value='Contacto recibido';
  }
  function objLabel(p){
    if(p.obj_tipo==='flujo') return nf0.format(p.obj_raw||0)+' €';
    return nf1.format(p.obj_raw||0)+' %';
  }

  // ---- cálculo: Máx compra = (Budget - Notaría - Honorarios)/ (1 + ITP%)
  function recalcMaxCompra(){
    const cfg = Store.cfg||{};
    const itp = (cfg.c_itp??8)/100;
    const notaria = (cfg.c_notaria??1500);
    const inclHonor = (form.incl_honor.value==='si');
    const honor = inclHonor ? (3500*1.21) : 0;
    const budget = parseEs(form.budget.value)||0;
    if(budget<=0){ form.max_compra.value=''; return; }
    const numerador = Math.max(0, budget - notaria - honor);
    const maxCompra = Math.max(0, numerador / (1+itp));
    form.max_compra.value = nf0.format(Math.round(maxCompra));
  }
  ['input','change'].forEach(ev=>{
    form.budget.addEventListener(ev, recalcMaxCompra);
    form.incl_honor.addEventListener(ev, recalcMaxCompra);
  });
  recalcMaxCompra();

  // ---- validación suave para F1 (permite mínimos)
  function isMinimalF1OK(){
    return !!(form.email.value.trim() || form.tel.value.trim());
  }
  function clampFinMes(){
    const start = form.inicio.value; const end = form.fin.value;
    if(!start || !end) return;
    // limitar fin a +5 meses desde inicio
    const [y,m] = start.split('-').map(Number);
    const max = new Date(y, m-1+5, 1);
    const [ye,me] = end.split('-').map(Number);
    const finDate=new Date(ye,me-1,1);
    if(finDate>max){
      form.fin.value = ${max.getFullYear()}-${String(max.getMonth()+1).padStart(2,'0')};
    }
  }
  form.inicio.addEventListener('change', clampFinMes);
  form.fin.addEventListener('change', clampFinMes);

  // ---- listado
  function filtered(list){
    const fF=filters.fase?.value||'', fT=filters.tipo?.value||'', q=(filters.q?.value||'').toLowerCase();
    return (list||[]).filter(p=>{
      if(fF && p.fase!==fF) return false;
      if(fT && p.pref_tipo!==fT) return false;
      if(q){
        const hay = (p.nombre||'').toLowerCase().includes(q) ||
                    (p.locs_text||'').toLowerCase().includes(q) ||
                    (p.loc_res||'').toLowerCase().includes(q) ||
                    (p.email||'').toLowerCase().includes(q);
        if(!hay) return false;
      }
      return true;
    });
  }
  function render(){
    tbody.innerHTML='';
    filtered(Store.pros||[]).forEach((p,i)=>{
      const contacto = [p.email,p.tel].filter(Boolean).join(' / ') || '—';
      const tr=document.createElement('tr');
      tr.innerHTML=`
        <td>${p.nombre||'—'}</td>
        <td>${contacto}</td>
        <td>${p.pref_tipo||'—'}</td>
        <td>${(p.obj_tipo||'').toUpperCase()} ${objLabel(p)}</td>
        <td>${nf0.format(p.budget||0)} €</td>
        <td>${nf0.format(p.max_compra||0)} €</td>
        <td>${p.fase||'—'}</td>
        <td>${p.sub||'—'}</td>
        <td>
          <button class="btn ghost" data-act="edit" data-i="${i}">Editar</button>
          <button class="btn" data-act="phase" data-i="${i}">Avanzar fase</button>
          <button class="btn" data-act="del" data-i="${i}">Eliminar</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  function editRow(i){
    const arr=Store.pros||[]; const p=arr[i]; if(!p) return;
    form.idx.value=i;
    // personales
    form.nombre.value=p.nombre||''; form.dni.value=p.dni||''; form.email.value=p.email||'';
    form.tel.value=p.tel||''; form.dir.value=p.dir||''; form.loc_res.value=p.loc_res||'';
    // inversión
    form.locs_obj.value=p.locs_text||''; form.pref_tipo.value=p.pref_tipo||'Tradicional';
    form.n_activos.value=p.n_activos||''; form.no_asc.value=p.no_asc||'no';
    form.alt_max.value=p.alt_max||''; form.bajos.value=p.bajos||'no'; form.reforma.value=p.reforma||'No';
    form.budget.value=nf0.format(p.budget||0); form.incl_honor.value=p.incl_honor||'si';
    form.max_compra.value=nf0.format(p.max_compra||0);
    // financiación & objetivos
    form.financia.value=p.financia||'si'; form.broker.value=p.broker||'no';
    form.ltv.value = (p.ltv!=null) ? String(p.ltv).replace('.',',') : '';
    form.obj_tipo.value=p.obj_tipo||'bruta';
    form.obj_val.value = (p.obj_tipo==='flujo')? nf0.format(p.obj_raw||0) : String(p.obj_raw||'').replace('.',',');
    form.obj_flow.value = p.obj_flow ? nf0.format(p.obj_flow) : '';
    form.inicio.value=p.inicio||''; form.fin.value=p.fin||'';
    form.notes.value=p.notes||'';
    // funnel
    form.fase.value=p.fase||'F1'; form.sub.value=p.sub||'Contacto recibido';
    form.recordatorio.value=p.recordatorio||'';
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function advancePhase(p){
    const order=['F1','F2','F3','F4','F5'];
    const i=order.indexOf(p.fase||'F1'); p.fase=order[Math.min(order.length-1, i+1)];
    // subestados sugeridos
    if(p.fase==='F2' && (!p.sub || p.sub.includes('Contacto'))) p.sub='Contrato enviado';
    else if(p.fase==='F3') p.sub='Propuesta enviada';
    else if(p.fase==='F4') p.sub='Pendientes (arras)';
    else if(p.fase==='F5') p.sub='Notaría fijada';
  }

  // ---- delegación de eventos (botones)
  document.addEventListener('click',(ev)=>{
    const t=ev.target;
    if(!(t instanceof HTMLElement)) return;

    // Guardar
    if(t.id==='p_save'){
      // F1 mínimo: permitir email o teléfono y poco más
      if(form.fase.value==='F1' && !isMinimalF1OK()){
        alert('En F1 necesitas al menos email o teléfono.'); return;
      }

      const arr=Store.pros||[]; const idx=parseInt(form.idx.value||'-1',10);
      const budget = parseEs(form.budget.value)||0;
      const max_compra = parseEs(form.max_compra.value)||0;
      const obj_tipo=form.obj_tipo.value;
      const obj_raw = parseEs(form.obj_val.value);
      const ltv = parseEs(form.ltv.value);
      const obj_flow = parseEs(form.obj_flow.value)||0;

      const rec = {
        // personales
        nombre:form.nombre.value.trim(),
        dni:form.dni.value.trim(),
        email:form.email.value.trim(),
        tel:form.tel.value.trim(),
        dir:form.dir.value.trim(),
        loc_res:form.loc_res.value.trim(),
        // inversión
        locs_text:form.locs_obj.value.trim(),
        pref_tipo:form.pref_tipo.value,
        n_activos: parseEs(form.n_activos.value)||0,
        no_asc: form.no_asc.value,
        alt_max: parseEs(form.alt_max.value)||0,
        bajos: form.bajos.value,
        reforma: form.reforma.value,
        budget, incl_honor: form.incl_honor.value,
        max_compra,
        // financiación & objetivos
        financia: form.financia.value,
        broker: form.broker.value,
        ltv: Number.isFinite(ltv)? ltv : null,
        obj_tipo, obj_raw: Number.isFinite(obj_raw)? obj_raw : (obj_tipo==='flujo'?0:0),
        obj_flow: obj_flow || null,
        inicio: form.inicio.value || '',
        fin: form.fin.value || '',
        notes: form.notes.value.trim(),
        // funnel
        fase: form.fase.value,
        sub: form.sub.value,
        recordatorio: form.recordatorio.value||'',
        ts: Date.now()
      };

      if(idx>=0) arr[idx]=rec; else arr.unshift(rec);
      Store.pros=arr; render(); showToast('✅ Prospecto guardado'); return;
    }

    // Limpiar
    if(t.id==='p_clear'){ clearForm(); showToast('Formulario limpio'); return; }

    // Acciones del grid
    if(t.dataset && t.dataset.act){
      const act=t.dataset.act; const i=parseInt(t.dataset.i||'-1',10);
      const arr=Store.pros||[]; const p=arr[i]; if(!p) return;
      if(act==='edit'){ editRow(i); return; }
      if(act==='phase'){ advancePhase(p); Store.pros=arr; render(); return; }
      if(act==='del'){ if(confirm('¿Eliminar prospecto?')){ arr.splice(i,1); Store.pros=arr; render(); } return; }
    }
  });

  // filtros
  ['change','input'].forEach(ev=>{
    filters.fase?.addEventListener(ev, render);
    filters.tipo?.addEventListener(ev, render);
    filters.q?.addEventListener(ev, render);
  });

  // primer render
  render();
});
