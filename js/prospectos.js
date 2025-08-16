document.addEventListener('DOMContentLoaded', ()=>{
  // Utilidades globales
  if (typeof setupMoneyFormatting === 'function') setupMoneyFormatting();
  if (typeof setupMoneyLive === 'function') setupMoneyLive();

  const $ = id=>document.getElementById(id);
  const nf0 = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0});
  const nf1 = new Intl.NumberFormat('es-ES',{maximumFractionDigits:1});

  // ---------- Definición de fases y subestados (hitos) ----------
  const PHASES = ['CONTACTO','REUNION','BUSQUEDA','COMPRAVENTA','NOTARIA'];
  const TITLES = {
    CONTACTO:'Contacto', REUNION:'Reunión',
    BUSQUEDA:'Búsqueda', COMPRAVENTA:'Compraventa', NOTARIA:'Notaría'
  };
  // Subestados válidos por fase (sirven de checklist de avance)
  const SUBS = {
    CONTACTO:   ['Pendiente contactar','Cita fijada','Descartado'],
    REUNION:    ['Contrato enviado','Contrato firmado','Descartado'],
    BUSQUEDA:   ['Propuesta enviada','Reserva aceptada','Arras firmadas'],
    COMPRAVENTA:['Documentación lista (IBI/nota/comunidad)','Financiación ok','Notaría fijada'],
    NOTARIA:    ['Escritura firmada','Cerrado']
  };
  // Avance automático por hito mínimo alcanzado
  const NEXT_HIT = {
    CONTACTO:'Cita fijada',
    REUNION:'Contrato firmado',
    BUSQUEDA:'Arras firmadas',
    COMPRAVENTA:'Notaría fijada',
    NOTARIA:'Escritura firmada'
  };

  // ---------- Elementos del formulario ----------
  const form = {
    idx: $('p_idx'),
    nombre: $('p_nombre'), email: $('p_email'), tel: $('p_tel'),
    dni: $('p_dni'), dir:$('p_dir'), loc_res: $('p_loc_res'),
    locs_obj: $('p_locs_obj'), pref_tipo: $('p_pref_tipo'), num_activos:$('p_num_activos'),
    sin_asc:$('p_sin_asc'), alt_max:$('p_alt_max'), bajos:$('p_bajos'), reforma:$('p_reforma'),
    budget:$('p_budget'), max_compra:$('p_max_compra'),
    financia:$('p_financia'), broker:$('p_broker'), pct_fin:$('p_pct_fin'),
    obj_tipo:$('p_obj_tipo'), obj_val:$('p_obj_val'),
    fase:$('p_fase'), sub:$('p_sub'), notes:$('p_notes')
  };
  const filters = { fase: $('f_fase'), tipo: $('f_tipo'), q: $('f_q') };
  const tbody = $('p_body');
  const toast = $('p_toast');
  const stepper = $('stepper');

  // ---------- Helper ----------
  function showToast(msg='✅ Guardado'){
    if(!toast) return; toast.textContent=msg; toast.hidden=false;
    clearTimeout(window._p_toast); window._p_toast=setTimeout(()=> toast.hidden=true, 1800);
  }
  const phaseIdx = ph => Math.max(0, PHASES.indexOf(ph||'CONTACTO'));

  // ---------- Stepper ----------
  function renderStepper(currentPhase){
    if(!stepper) return;
    stepper.innerHTML='';
    const idx = phaseIdx(currentPhase);
    PHASES.forEach((ph,i)=>{
      const div=document.createElement('div');
      div.className='step '+(i<idx?'done':(i===idx?'active':'pending'));
      div.dataset.phase=ph;
      div.innerHTML=<span class="dot"></span><span>${TITLES[ph]}</span>;
      // Permitir seleccionar fase manualmente si retrocedes o avanzas con juicio
      div.onclick=()=>{ setPhase(ph, /manual/true); };
      stepper.appendChild(div);
    });
  }

  function setPhase(phase, manual=false){
    // Guarda selección en el form (si existiera select oculto)
    if(form.fase) form.fase.value = phase;
    // Re-render stepper
    renderStepper(phase);
    // Pinta subestados válidos para esta fase (si tienes select p_sub en tu HTML)
    if(form.sub){
      const opts = SUBS[phase] || ['—'];
      form.sub.innerHTML = opts.map(s=><option>${s}</option>).join('');
    }
    // Si viene de avance por hito, respeta; si es manual, no fuerza subestado
    if(!manual && form.sub && !form.sub.value) form.sub.value = (SUBS[phase]||[])[0]||'';
  }

  function maybeAdvanceByMilestone(phase, sub){
    // Si se alcanza el hito de esa fase, pasar a la siguiente
    const hit = NEXT_HIT[phase];
    if(hit && sub===hit){
      const idx=phaseIdx(phase);
      const next = PHASES[Math.min(PHASES.length-1, idx+1)];
      setPhase(next);
    }
  }

  // ---------- Precio máx. compra desde presupuesto total ----------
  function recalcMaxCompra(){
    if(!form.budget || !form.max_compra) return;
    const cfg = Store.cfg || {};
    const B = parseEs(form.budget.value)||0;
    const itp = (cfg.c_itp??8)/100;
    const not = (cfg.c_notaria??1500);
    const honor = 3500*1.21; // tus honorarios con IVA
    // Compra = (Presupuesto - notaría - honor) / (1 + ITP)
    const compra = Math.max(0, (B - not - honor) / (1 + itp));
    form.max_compra.value = nf0.format(Math.round(compra));
  }

  ['input','change'].forEach(ev=>{
    form.budget?.addEventListener(ev, recalcMaxCompra);
  });
  recalcMaxCompra();

  // ---------- Guardado / edición / grid ----------
  function objLabel(p){
    if(p.obj_tipo==='flujo') return nf0.format(p.obj_raw||0)+' €';
    return nf1.format(p.obj_raw||0)+' %';
  }

  function clearForm(){
    form.idx.value = -1;
    ['nombre','email','tel','dni','dir','loc_res','locs_obj','num_activos','alt_max','budget','max_compra','pct_fin','obj_val','notes']
      .forEach(k=> form[k] && (form[k].value=''));
    form.pref_tipo.value='Tradicional';
    form.sin_asc.value='No'; form.bajos.value='No';
    form.reforma.value='No';
    form.financia.value='Sí'; form.broker.value='No';
    form.obj_tipo.value='bruta';
    setPhase('CONTACTO');
  }

  function serialize(){
    const obj_raw = parseEs(form.obj_val?.value);
    return {
      ts: Date.now(),
      nombre:form.nombre?.value.trim(), email:form.email?.value.trim(), tel:form.tel?.value.trim(),
      dni:form.dni?.value.trim(), dir:form.dir?.value.trim(), loc_res:form.loc_res?.value.trim(),
      locs_text:form.locs_obj?.value.trim(),
      pref_tipo:form.pref_tipo?.value, num_activos: parseEs(form.num_activos?.value)||1,
      sin_asc:form.sin_asc?.value, alt_max:parseEs(form.alt_max?.value)||null, bajos:form.bajos?.value, reforma:form.reforma?.value,
      budget: parseEs(form.budget?.value)||0, max_compra: parseEs(form.max_compra?.value)||0,
      financia:form.financia?.value, broker:form.broker?.value, pct_fin:parseEs(form.pct_fin?.value)||80,
      obj_tipo:form.obj_tipo?.value, obj_raw: Number.isFinite(obj_raw)?obj_raw:0,
      fase: form.fase?.value || 'CONTACTO',
      sub: form.sub?.value || (SUBS[form.fase?.value||'CONTACTO']||[])[0]||'',
      notes:form.notes?.value?.trim()
    };
  }

  function hydrate(i){
    const p = (Store.pros||[])[i]; if(!p) return;
    form.idx.value=i;
    ['nombre','email','tel','dni','dir','loc_res','notes'].forEach(k=> form[k] && (form[k].value=p[k]||''));
    form.locs_obj.value=p.locs_text||'';
    form.pref_tipo.value=p.pref_tipo||'Tradicional';
    form.num_activos.value=p.num_activos||'';
    form.sin_asc.value=p.sin_asc||'No';
    form.alt_max.value=p.alt_max||'';
    form.bajos.value=p.bajos||'No';
    form.reforma.value=p.reforma||'No';
    form.budget.value = p.budget? nf0.format(p.budget):'';
    form.max_compra.value = p.max_compra? nf0.format(p.max_compra):'';
    form.financia.value=p.financia||'Sí';
    form.broker.value=p.broker||'No';
    form.pct_fin.value = p.pct_fin!=null? String(p.pct_fin).replace('.',',') : '80,0';
    form.obj_tipo.value=p.obj_tipo||'bruta';
    form.obj_val.value = p.obj_tipo==='flujo' ? nf0.format(p.obj_raw||0) : String(p.obj_raw||'').replace('.',',');
    setPhase(p.fase||'CONTACTO');
    if(form.sub && p.sub){
      const opts = SUBS[p.fase||'CONTACTO']||[]; form.sub.innerHTML=opts.map(s=><option${s===p.sub?' selected':''}>${s}</option>).join('');
    }
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function filtered(list){
    const fF=filters.fase?.value||'', fT=filters.tipo?.value||'', q=(filters.q?.value||'').toLowerCase();
    return (list||[]).filter(p=>{
      if(fF && p.fase!==fF) return false;
      if(fT && p.pref_tipo!==fT) return false;
      if(q){
        const hay = (p.nombre||'').toLowerCase().includes(q) ||
                    (p.locs_text||'').toLowerCase().includes(q) ||
                    (p.loc_res||'').toLowerCase().includes(q);
        if(!hay) return false;
      }
      return true;
    });
  }

  function render(){
    if(!tbody) return;
    tbody.innerHTML='';
    filtered(Store.pros||[]).forEach((p,i)=>{
      const tr=document.createElement('tr');
      tr.innerHTML = `
        <td>${p.nombre||'—'}</td>
        <td>${p.email||'—'}</td>
        <td>${p.tel||'—'}</td>
        <td>${(p.obj_tipo||'').toUpperCase()} ${objLabel(p)}</td>
        <td>${p.pref_tipo||'—'}</td>
        <td>${p.locs_text||'—'}</td>
        <td>${TITLES[p.fase]||'—'}</td>
        <td>${p.sub||'—'}</td>
        <td>
          <button class="btn ghost" data-act="edit" data-i="${i}">Editar</button>
          <button class="btn" data-act="phase" data-i="${i}">Siguiente fase</button>
          <button class="btn" data-act="del" data-i="${i}">Eliminar</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  // ---------- Delegación de eventos ----------
  document.addEventListener('click', (ev)=>{
    const t=ev.target; if(!(t instanceof HTMLElement)) return;

    // Guardar
    if(t.id==='p_save'){
      const rec = serialize();
      // Avance por hito (si el subestado cumple)
      maybeAdvanceByMilestone(rec.fase, rec.sub);
      const arr=Store.pros||[];
      const idx=parseInt(form.idx.value||'-1',10);
      if(idx>=0) arr[idx]=rec; else arr.unshift(rec);
      Store.pros=arr; render(); showToast('✅ Prospecto guardado'); clearForm();
      return;
    }

    // Limpiar
    if(t.id==='p_clear'){ clearForm(); showToast('↺ Limpio'); return; }

    // Acciones grid
    if(t.dataset?.act){
      const act=t.dataset.act, i=parseInt(t.dataset.i||'-1',10);
      const arr=Store.pros||[]; if(!arr[i]) return;
      if(act==='edit'){ hydrate(i); return; }
      if(act==='del'){ if(confirm('¿Eliminar prospecto?')){ arr.splice(i,1); Store.pros=arr; render(); } return; }
      if(act==='phase'){
        const p=arr[i]; const idx=phaseIdx(p.fase); const next=PHASES[Math.min(idx+1,PHASES.length-1)];
        p.fase=next; p.sub=(SUBS[next]||[])[0]||''; Store.pros=arr; render(); return;
      }
    }
  });

  // Filtros
  ['change','input'].forEach(ev=>{
    filters.fase?.addEventListener(ev, render);
    filters.tipo?.addEventListener(ev, render);
    filters.q?.addEventListener(ev, render);
  });

  // Recalcular precio máx. al cargar (si había presupuesto)
  recalcMaxCompra();

  // Estado inicial del stepper
  setPhase('CONTACTO');

  // Primer render
  render();
});
