// js/prospectos.js — reemplazo completo
document.addEventListener('DOMContentLoaded', ()=>{
  if (typeof setupMoneyFormatting === 'function') setupMoneyFormatting();
  if (typeof setupMoneyLive === 'function') setupMoneyLive();

  const $ = id => document.getElementById(id);
  const nf0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

  const gates = { F1: $('gateF1'), F2: $('gateF2'), F3: $('gateF3'), F4: $('gateF4'), F5: $('gateF5') };
  const stepsEl = $('steps');

  const F = {
    idx: $('p_idx'), toast: $('p_toast'),
    // F1
    nombre: $('p_nombre'), email: $('p_email'), tel: $('p_tel'),
    recordatorio: $('p_recordatorio'), sub_f1: $('p_sub_f1'),
    // F2
    dni: $('p_dni'), dir: $('p_dir'), loc_res: $('p_loc_res'),
    pref_tipo: $('p_pref_tipo'), obj_tipo: $('p_obj_tipo'), obj_val: $('p_obj_val'),
    budget: $('p_budget'), incl_honor: $('p_incl_honor'), max_compra: $('p_max_compra'),
    // F3
    locs_obj: $('p_locs_obj'), n_activos: $('p_n_activos'),
    no_asc: $('p_no_asc'), alt_max: $('p_alt_max'), bajos: $('p_bajos'), reforma: $('p_reforma'),
    inicio: $('p_inicio'), fin: $('p_fin'), notes: $('p_notes'),
    // F5
    notaria_fecha: $('p_notaria_fecha'), sub_f5: $('p_sub_f5'),
    // grid / filtros
    tbody: $('p_body'), f_fase: $('f_fase'), f_tipo: $('f_tipo'), f_q: $('f_q')
  };

  let currentPhase = 'F1';

  function setPhase(ph){
    currentPhase = ph;
    Object.entries(gates).forEach(([k,el])=> { if(el) el.hidden = (k!==ph); });
    if (stepsEl) {
      stepsEl.querySelectorAll('.step').forEach(s=>{
        s.classList.toggle('active', s.dataset.phase === ph);
      });
    }
  }

  stepsEl?.addEventListener('click', (e)=>{
    const t = e.target.closest('.step'); if(!t) return;
    setPhase(t.dataset.phase);
  });

  function toast(msg='OK'){
    if(!F.toast) return;
    F.toast.textContent = msg;
    F.toast.hidden = false;
    clearTimeout(window.__p_toast);
    window.__p_toast = setTimeout(()=> F.toast.hidden = true, 2000);
  }
  function objLabel(rec){
    if(rec.obj_tipo === 'flujo') return nf0.format(rec.obj_raw||0) + ' €';
    return nf1.format(rec.obj_raw||0) + ' %';
  }
  function minimalF1OK(){ return !!(F.email?.value.trim() || F.tel?.value.trim()); }

  function clampFinMes(){
    const s = F.inicio?.value, e = F.fin?.value; if(!s || !e) return;
    const [ys, ms] = s.split('-').map(Number);
    const [ye, me] = e.split('-').map(Number);
    const max = new Date(ys, ms-1+5, 1);
    const end = new Date(ye, me-1, 1);
    if(end > max){
      F.fin.value = ${max.getFullYear()}-${String(max.getMonth()+1).padStart(2,'0')};
    }
  }
  F.inicio?.addEventListener('change', clampFinMes);
  F.fin?.addEventListener('change', clampFinMes);

  function recalcMaxCompra(){
    const cfg = (window.Store?.cfg) || {};
    const itp = (cfg.c_itp ?? 8) / 100;
    const notaria = (cfg.c_notaria ?? 1500);
    const incl = (F.incl_honor?.value === 'si');
    const honor = incl ? (3500 * 1.21) : 0;
    const budget = parseEs(F.budget?.value) || 0;
    if(!F.max_compra) return;
    if(budget <= 0){ F.max_compra.value = ''; return; }
    const numerador = Math.max(0, budget - notaria - honor);
    const maxCompra = Math.max(0, numerador / (1 + itp));
    F.max_compra.value = nf0.format(Math.round(maxCompra));
  }
  ['input','change'].forEach(ev=>{
    F.budget?.addEventListener(ev, recalcMaxCompra);
    F.incl_honor?.addEventListener(ev, recalcMaxCompra);
  });

  function filtered(list){
    const fF = F.f_fase?.value || '';
    const fT = F.f_tipo?.value || '';
    const q  = (F.f_q?.value || '').toLowerCase();
    return (list||[]).filter(p=>{
      if(fF && p.fase !== fF) return false;
      if(fT && p.pref_tipo !== fT) return false;
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
    if(!F.tbody) return;
    F.tbody.innerHTML = '';
    filtered(window.Store?.pros || []).forEach((p,i)=>{
      const contacto = [p.email, p.tel].filter(Boolean).join(' / ') || '—';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.nombre||'—'}</td>
        <td>${contacto}</td>
        <td>${p.pref_tipo||'—'}</td>
        <td>${(p.obj_tipo||'').toUpperCase()} ${objLabel(p)}</td>
        <td>${p.budget ? nf0.format(p.budget)+' €' : '—'}</td>
        <td>${p.max_compra ? nf0.format(p.max_compra)+' €' : '—'}</td>
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

  function clearForm(){
    if(!F.idx) return;
    F.idx.value = -1;
    ['nombre','email','tel','recordatorio','dni','dir','loc_res','obj_val',
     'budget','max_compra','locs_obj','n_activos','alt_max','notes','notaria_fecha']
     .forEach(k=>{ if(F[k]) F[k].value=''; });

    F.sub_f1 && (F.sub_f1.value='Contacto recibido');
    F.pref_tipo && (F.pref_tipo.value='Tradicional');
    F.obj_tipo && (F.obj_tipo.value='bruta');
    F.incl_honor && (F.incl_honor.value='si');
    F.no_asc && (F.no_asc.value='no');
    F.bajos && (F.bajos.value='no');
    F.reforma && (F.reforma.value='No');
    F.inicio && (F.inicio.value='');
    F.fin && (F.fin.value='');
    F.sub_f5 && (F.sub_f5.value='Notaría fijada');

    setPhase('F1');
  }

  function editRow(i){
    const arr = window.Store?.pros || [];
    const p = arr[i]; if(!p) return;
    F.idx.value = i;

    F.nombre && (F.nombre.value = p.nombre||'');
    F.email && (F.email.value = p.email||'');
    F.tel && (F.tel.value = p.tel||'');
    F.recordatorio && (F.recordatorio.value = p.recordatorio||'');
    F.sub_f1 && (F.sub_f1.value = p.sub_f1 || p.sub || 'Contacto recibido');

    F.dni && (F.dni.value = p.dni||'');
    F.dir && (F.dir.value = p.dir||'');
    F.loc_res && (F.loc_res.value = p.loc_res||'');
    F.pref_tipo && (F.pref_tipo.value = p.pref_tipo||'Tradicional');
    if(F.obj_tipo) F.obj_tipo.value = p.obj_tipo||'bruta';
    if(F.obj_val)  F.obj_val.value  = (p.obj_tipo==='flujo')
                                        ? (p.obj_raw||0)
                                        : String(p.obj_raw||'').replace('.', ',');
    if(F.budget)    F.budget.value    = p.budget ? nf0.format(p.budget) : '';
    if(F.incl_honor)F.incl_honor.value= p.incl_honor||'si';
    if(F.max_compra)F.max_compra.value= p.max_compra ? nf0.format(p.max_compra) : '';

    F.locs_obj && (F.locs_obj.value = p.locs_text||'');
    F.n_activos && (F.n_activos.value = p.n_activos||'');
    F.no_asc && (F.no_asc.value = p.no_asc||'no');
    F.alt_max && (F.alt_max.value = p.alt_max||'');
    F.bajos && (F.bajos.value = p.bajos||'no');
    F.reforma && (F.reforma.value = p.reforma||'No');
    F.inicio && (F.inicio.value = p.inicio||'');
    F.fin && (F.fin.value = p.fin||'');
    F.notes && (F.notes.value = p.notes||'');

    F.notaria_fecha && (F.notaria_fecha.value = p.notaria_fecha||'');
    F.sub_f5 && (F.sub_f5.value = p.sub_f5||'Notaría fijada');

    setPhase(p.fase || 'F1');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function advancePhaseObj(p){
    const order = ['F1','F2','F3','F4','F5'];
    const i = order.indexOf(p.fase || 'F1');
    p.fase = order[Math.min(order.length-1, i+1)];
    if(p.fase==='F2') p.sub='Contrato enviado';
    if(p.fase==='F3') p.sub='Propuesta enviada';
    if(p.fase==='F4') p.sub='Pendientes (arras)';
    if(p.fase==='F5') p.sub='Notaría fijada';
  }

  function collect(){
    const obj_tipo = F.obj_tipo?.value || 'bruta';
    const obj_raw  = parseEs(F.obj_val?.value);
    const budget   = parseEs(F.budget?.value) || 0;
    const max_compra = parseEs(F.max_compra?.value) || 0;

    const rec = {
      fase: currentPhase,
      nombre: F.nombre?.value.trim() || '',
      email: F.email?.value.trim() || '',
      tel: F.tel?.value.trim() || '',
      recordatorio: F.recordatorio?.value || '',
      sub_f1: F.sub_f1?.value || 'Contacto recibido',
      sub: F.sub_f1?.value || 'Contacto recibido',
      dni: F.dni?.value.trim() || '',
      dir: F.dir?.value.trim() || '',
      loc_res: F.loc_res?.value.trim() || '',
      pref_tipo: F.pref_tipo?.value || 'Tradicional',
      obj_tipo,
      obj_raw: Number.isFinite(obj_raw) ? obj_raw : (obj_tipo==='flujo'? 0 : 0),
      budget,
      incl_honor: F.incl_honor?.value || 'si',
      max_compra,
      locs_text: F.locs_obj?.value.trim() || '',
      n_activos: parseEs(F.n_activos?.value) || 0,
      no_asc: F.no_asc?.value || 'no',
      alt_max: parseEs(F.alt_max?.value) || 0,
      bajos: F.bajos?.value || 'no',
      reforma: F.reforma?.value || 'No',
      inicio: F.inicio?.value || '',
      fin: F.fin?.value || '',
      notes: F.notes?.value.trim() || '',
      notaria_fecha: F.notaria_fecha?.value || '',
      sub_f5: F.sub_f5?.value || 'Notaría fijada',
      ts: Date.now()
    };
    return rec;
  }

  function save(){
    if(currentPhase==='F1' && !minimalF1OK()){
      alert('En F1 necesitas al menos email o teléfono.');
      return;
    }
    const arr = window.Store?.pros || [];
    const idx = parseInt(F.idx?.value || '-1', 10);
    const rec = collect();
    if(idx >= 0) arr[idx] = rec; else arr.unshift(rec);
    if(window.Store) window.Store.pros = arr;
    render();
    toast('✅ Prospecto guardado');
  }

  function mailto(to, subject, body){
    const href = mailto:${encodeURIComponent(to||'')} +
                 ?subject=${encodeURIComponent(subject||'')} +
                 &body=${encodeURIComponent(body||'')};
    window.open(href, '_blank');
  }
  function takeName(){ return (F.nombre?.value || 'Cliente').trim(); }

  function printSummary(phase){
    const html = `
      <html><head><meta charset="utf-8"><title>Resumen ${phase}</title>
      <style>body{font-family:Inter,Arial;padding:24px}h1{margin:0 0 8px}.k{color:#666}.b{font-weight:700}</style>
      </head><body>
      <h1>Unihouser · Resumen ${phase}</h1>
      <p><span class="k">Cliente:</span> <span class="b">${takeName()}</span></p>
      <p><span class="k">Email:</span> ${F.email?.value||'—'} · <span class="k">Tel:</span> ${F.tel?.value||'—'}</p>
      <hr>
      <p><span class="k">Tipo:</span> ${F.pref_tipo?.value||'—'} · <span class="k">Objetivo:</span> ${F.obj_tipo?.value||'—'} ${F.obj_val?.value||''}</p>
      <p><span class="k">Presupuesto total:</span> ${F.budget?.value||'—'} · <span class="k">Máx compra:</span> ${F.max_compra?.value||'—'}</p>
      <p><span class="k">Localidades objetivo:</span> ${F.locs_obj?.value||'—'}</p>
      <p><span class="k">Notas:</span> ${F.notes?.value||'—'}</p>
      <hr><small>© Unihouser · unihouser.es · info@unihouser.es · 644 300 200</small>
      </body></html>`;
    const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.focus(); w.print();
  }

  document.addEventListener('click', (e)=>{
    const t = e.target.closest('button'); if(!t) return;

    if(t.id === 'p_save'){ save(); return; }
    if(t.id === 'p_clear'){ clearForm(); toast('Formulario limpio'); return; }

    if(t.id === 'toF2'){ setPhase('F2'); save(); return; }
    if(t.id === 'toF3'){ setPhase('F3'); save(); return; }
    if(t.id === 'toF4'){ setPhase('F4'); save(); return; }
    if(t.id === 'toF5'){ setPhase('F5'); save(); return; }
    if(t.id === 'toF1'){ setPhase('F1'); save(); return; }
    if(t.id === 'backF2'){ setPhase('F2'); return; }
    if(t.id === 'backF3'){ setPhase('F3'); return; }
    if(t.id === 'backF4'){ setPhase('F4'); return; }

    if(t.id === 'f1_email'){
      if(!F.email?.value){ alert('Necesitas un email.'); return; }
      mailto(F.email.value, 'Unihouser · Primer contacto',
        Hola ${takeName()},\n\nGracias por tu interés. ¿Cuándo te viene bien una breve reunión para alinear objetivos y presupuesto?\n\nSaludos.);
      return;
    }
    if(t.id === 'f1_pdf'){ printSummary('F1 · Contacto'); return; }

    if(t.id === 'f2_pdf'){ printSummary('F2 · Reunión'); return; }
    if(t.id === 'f2_mail_ok'){
      if(!F.email?.value){ alert('Necesitas un email.'); return; }
      mailto(F.email.value, 'Unihouser · Contrato de servicio',
        Hola ${takeName()},\n\nTe envío contrato para firma. Objetivo: ${F.obj_tipo?.value} ${F.obj_val?.value}. Presupuesto total: ${F.budget?.value}. Máx compra: ${F.max_compra?.value}.\n\nSaludos.);
      return;
    }
    if(t.id === 'f2_mail_no'){
      if(!F.email?.value){ alert('Necesitas un email.'); return; }
      mailto(F.email.value, 'Unihouser · Gracias por tu tiempo',
        Hola ${takeName()},\n\nGracias por la conversación. Si en el futuro cambian tus planes, estaremos encantados de ayudarte.\n\nSaludos.);
      return;
    }
    if(t.id === 'f2_contrato'){
      alert('Generación de contrato: dejaremos una plantilla auto-rellenable en un próximo paso.');
      return;
    }

    if(t.id === 'f3_enviar_props'){
      if(!F.email?.value){ alert('Necesitas un email.'); return; }
      mailto(F.email.value, 'Unihouser · Propuesta enviada',
        Hola ${takeName()},\n\nTe acabamos de enviar una propuesta de activo ajustada a tus criterios. Quedo atento a tu feedback.\n\nSaludos.);
      return;
    }
    if(t.id === 'f3_reserva'){ toast('Reserva activada'); save(); return; }
    if(t.id === 'f4_pendientes'){ toast('Arras: pendientes'); save(); return; }
    if(t.id === 'f4_firmadas'){ toast('Arras firmadas'); save(); return; }
    if(t.id === 'f5_cerrar'){ toast('Operación completada'); save(); return; }
  });

  document.addEventListener('click', (e)=>{
    const b = e.target.closest('button[data-act]'); if(!b) return;
    const i = parseInt(b.dataset.i || '-1', 10);
    const arr = window.Store?.pros || [];
    const p = arr[i]; if(!p) return;

    if(b.dataset.act === 'edit'){ editRow(i); return; }
    if(b.dataset.act === 'phase'){ advancePhaseObj(p); if(window.Store) window.Store.pros = arr; render(); return; }
    if(b.dataset.act === 'del'){
      if(confirm('¿Eliminar prospecto?')){ arr.splice(i,1); if(window.Store) window.Store.pros = arr; render(); }
      return;
    }
  });

  ['change','input'].forEach(ev=>{
    F.f_fase?.addEventListener(ev, render);
    F.f_tipo?.addEventListener(ev, render);
    F.f_q?.addEventListener(ev, render);
  });

  setPhase('F1');
  render();
  recalcMaxCompra();
});
