document.addEventListener('DOMContentLoaded', ()=>{
  console.debug('[prospectos] DOM listo');
  if (typeof setupMoneyFormatting === 'function') setupMoneyFormatting();
  if (typeof setupMoneyLive === 'function') setupMoneyLive();

  const $ = id=>document.getElementById(id);
  const nf0 = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0});
  const nf1 = new Intl.NumberFormat('es-ES',{maximumFractionDigits:1});

  const form = {
    idx: $('p_idx'),
    nombre: $('p_nombre'), email: $('p_email'), tel: $('p_tel'),
    loc_res: $('p_loc_res'), locs_obj: $('p_locs_obj'), budget: $('p_budget'),
    pref_tipo: $('p_pref_tipo'), obj_tipo: $('p_obj_tipo'), obj_val: $('p_obj_val'),
    fase: $('p_fase'), sub: $('p_sub'), notes: $('p_notes')
  };
  const filters = { fase: $('f_fase'), tipo: $('f_tipo'), q: $('f_q') };
  const tbody = $('p_body');
  const toast = $('p_toast');

  function objLabel(p){
    if(p.obj_tipo==='flujo') return nf0.format(p.obj_raw||0)+' €';
    return nf1.format(p.obj_raw||0)+' %';
  }

  function clearForm(){
    if(!form.idx) return;
    form.idx.value=-1;
    form.nombre.value=form.email.value=form.tel.value='';
    form.loc_res.value=form.locs_obj.value=form.budget.value='';
    form.pref_tipo.value='Tradicional'; form.obj_tipo.value='bruta'; form.obj_val.value='';
    form.fase.value='F2'; form.sub.value='Contratado'; form.notes.value='';
  }

  function editRow(i){
    const arr=Store.pros||[]; const p=arr[i]; if(!p) return;
    form.idx.value=i;
    form.nombre.value=p.nombre||''; form.email.value=p.email||''; form.tel.value=p.tel||'';
    form.loc_res.value=p.loc_res||''; form.locs_obj.value=p.locs_text||'';
    form.budget.value=nf0.format(p.budget||0);
    form.pref_tipo.value=p.pref_tipo||'Tradicional';
    form.obj_tipo.value=p.obj_tipo||'bruta';
    form.obj_val.value=(p.obj_tipo==='flujo')? nf0.format(p.obj_raw||0) : String(p.obj_raw||'').replace('.',',');
    form.fase.value=p.fase||'F2'; form.sub.value=p.sub||'Contratado'; form.notes.value=p.notes||'';
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function advancePhase(p){
    const order=['F1','F2','F3','F4','F5'];
    const i=order.indexOf(p.fase||'F1');
    p.fase = order[Math.min(order.length-1, i+1)];
    if(p.fase==='F3' && p.sub==='Contratado') p.sub='Propuesta enviada';
    if(p.fase==='F4') p.sub='Pendientes (arras)';
    if(p.fase==='F5') p.sub='Notaría fijada';
  }

  function showToast(msg='✅ Prospecto guardado'){
    if(!toast) return;
    toast.textContent=msg;
    toast.hidden=false;
    clearTimeout(window.__p_toast);
    window.__p_toast=setTimeout(()=> toast.hidden=true, 2000);
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
    console.debug('[prospectos] render');
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

  // Delegación de eventos (un solo listener para todo)
  document.addEventListener('click', (ev)=>{
    const t = ev.target;
    if(!(t instanceof HTMLElement)) return;

    // Guardar
    if(t.id==='p_save'){
      console.debug('[prospectos] click guardar');
      const arr = Store.pros||[];
      const idx = parseInt(form.idx.value||'-1',10);
      const obj_tipo = form.obj_tipo.value;
      const obj_raw = parseEs(form.obj_val.value);
      const budget  = parseEs(form.budget.value)||0;

      const rec = {
        nombre:form.nombre.value.trim(),
        email:form.email.value.trim(),
        tel:form.tel.value.trim(),
        loc_res:form.loc_res.value.trim(),
        locs_text:form.locs_obj.value.trim(),
        budget,
        pref_tipo:form.pref_tipo.value,
        obj_tipo,
        obj_raw: Number.isFinite(obj_raw)? obj_raw : (obj_tipo==='flujo'?0:0),
        fase:form.fase.value,
        sub:form.sub.value,
        notes:form.notes.value.trim(),
        ts: Date.now()
      };
      if(idx>=0){ arr[idx]=rec; } else { arr.unshift(rec); }
      Store.pros=arr;
      render(); showToast('✅ Prospecto guardado'); clearForm();
      return;
    }

    // Limpiar
    if(t.id==='p_clear'){
      console.debug('[prospectos] click limpiar');
      clearForm(); return;
    }

    // Acciones en la tabla
    if(t.dataset && t.dataset.act){
      const act=t.dataset.act; const i=parseInt(t.dataset.i||'-1',10);
      const arr=Store.pros||[];
      if(!arr[i]) return;

      if(act==='edit'){ editRow(i); return; }
      if(act==='phase'){ advancePhase(arr[i]); Store.pros=arr; render(); return; }
      if(act==='del'){ if(confirm('¿Eliminar prospecto?')){ arr.splice(i,1); Store.pros=arr; render(); } return; }
    }
  });

  // Filtros en vivo
  ['change','input'].forEach(ev=>{
    filters.fase?.addEventListener(ev, render);
    filters.tipo?.addEventListener(ev, render);
    filters.q?.addEventListener(ev, render);
  });

  // Primer render
  render();
});
