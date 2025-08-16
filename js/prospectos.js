// js/prospectos.js — reemplazo completo (ES5, sin template strings, CSP-safe)
document.addEventListener('DOMContentLoaded', function(){
  // Utilidades comunes (definidas en app.js)
  if (typeof setupMoneyFormatting === 'function') setupMoneyFormatting();
  if (typeof setupMoneyLive === 'function') setupMoneyLive();

  function $(id){ return document.getElementById(id); }
  var nf0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

  var gates = { F1: $('gateF1'), F2: $('gateF2'), F3: $('gateF3'), F4: $('gateF4'), F5: $('gateF5') };
  var stepsEl = $('steps');

  var F = {
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

  var currentPhase = 'F1';

  function setPhase(ph){
    currentPhase = ph;
    for (var k in gates){
      if (!gates.hasOwnProperty(k)) continue;
      var el = gates[k];
      if (el) el.hidden = (k !== ph);
    }
    if (stepsEl){
      var nodes = stepsEl.querySelectorAll('.step');
      for (var i=0;i<nodes.length;i++){
        var s = nodes[i];
        var phAttr = s.getAttribute('data-phase');
        if (phAttr === ph){ s.classList.add('active'); }
        else { s.classList.remove('active'); }
      }
    }
  }

  if (stepsEl){
    stepsEl.addEventListener('click', function(e){
      var t = e.target.closest ? e.target.closest('.step') : null;
      if(!t) return;
      setPhase(t.getAttribute('data-phase'));
    });
  }

  function toast(msg){
    if(!F.toast) return;
    F.toast.textContent = msg || 'OK';
    F.toast.hidden = false;
    clearTimeout(window.__p_toast);
    window.__p_toast = setTimeout(function(){ F.toast.hidden = true; }, 2000);
  }

  function objLabel(rec){
    if(rec.obj_tipo === 'flujo') return nf0.format(rec.obj_raw||0) + ' €';
    return nf1.format(rec.obj_raw||0) + ' %';
  }

  function minimalF1OK(){
    var hasEmail = (F.email && F.email.value && F.email.value.trim());
    var hasTel   = (F.tel && F.tel.value && F.tel.value.trim());
    return !!(hasEmail || hasTel);
  }

  // ---------- clampFinMes: sin template strings ----------
  function clampFinMes(){
    if(!F.inicio || !F.fin) return;
    var s = F.inicio.value;
    var e = F.fin.value;
    if(!s || !e) return;

    var sp = s.split('-'); var ep = e.split('-');
    var ys = Number(sp[0]); var ms = Number(sp[1]);
    var ye = Number(ep[0]); var me = Number(ep[1]);

    var max = new Date(ys, ms-1+5, 1);
    var end = new Date(ye, me-1, 1);

    if(end > max){
      var y = String(max.getFullYear());
      var m = String(max.getMonth()+1);
      if(m.length < 2) m = '0' + m;
      F.fin.value = y + '-' + m;
    }
  }
  if(F.inicio) F.inicio.addEventListener('change', clampFinMes);
  if(F.fin)    F.fin.addEventListener('change', clampFinMes);

  // Máx. compra = (Budget - Notaría - Honorarios) / (1 + ITP)
  function recalcMaxCompra(){
    var cfg = (window.Store && window.Store.cfg) || {};
    var itp = ((cfg.c_itp != null ? cfg.c_itp : 8) / 100);
    var notaria = (cfg.c_notaria != null ? cfg.c_notaria : 1500);
    var incl = (F.incl_honor && F.incl_honor.value === 'si');
    var honor = incl ? (3500 * 1.21) : 0;
    var budget = parseEs(F.budget && F.budget.value) || 0;

    if(!F.max_compra) return;
    if(budget <= 0){ F.max_compra.value = ''; return; }

    var numerador = Math.max(0, budget - notaria - honor);
    var maxCompra = Math.max(0, numerador / (1 + itp));
    F.max_compra.value = nf0.format(Math.round(maxCompra));
  }
  var recalcEvts = ['input','change'];
  for (var r=0; r<recalcEvts.length; r++){
    var ev = recalcEvts[r];
    if(F.budget) F.budget.addEventListener(ev, recalcMaxCompra);
    if(F.incl_honor) F.incl_honor.addEventListener(ev, recalcMaxCompra);
  }

  function filtered(list){
    var fF = (F.f_fase && F.f_fase.value) || '';
    var fT = (F.f_tipo && F.f_tipo.value) || '';
    var q  = ((F.f_q && F.f_q.value) || '').toLowerCase();
    return (list||[]).filter(function(p){
      if(fF && p.fase !== fF) return false;
      if(fT && p.pref_tipo !== fT) return false;
      if(q){
        var hay =
          ((p.nombre||'').toLowerCase().indexOf(q) !== -1) ||
          ((p.locs_text||'').toLowerCase().indexOf(q) !== -1) ||
          ((p.loc_res||'').toLowerCase().indexOf(q) !== -1) ||
          ((p.email||'').toLowerCase().indexOf(q) !== -1);
        if(!hay) return false;
      }
      return true;
    });
  }

  function render(){
    if(!F.tbody) return;
    F.tbody.innerHTML = '';
    var arr = (window.Store && window.Store.pros) || [];
    var rows = filtered(arr);
    for (var i=0;i<rows.length;i++){
      var p = rows[i];
      var contacto = [p.email, p.tel].filter(Boolean).join(' / ') || '—';
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>'+(p.nombre||'—')+'</td>'+
        '<td>'+contacto+'</td>'+
        '<td>'+(p.pref_tipo||'—')+'</td>'+
        '<td>'+((p.obj_tipo||'').toUpperCase())+' '+objLabel(p)+'</td>'+
        '<td>'+(p.budget ? nf0.format(p.budget)+' €' : '—')+'</td>'+
        '<td>'+(p.max_compra ? nf0.format(p.max_compra)+' €' : '—')+'</td>'+
        '<td>'+(p.fase||'F1')+'</td>'+
        '<td>'+(p.sub||'Contacto recibido')+'</td>'+
        '<td>'+
          '<button class="btn ghost" data-act="edit" data-i="'+i+'">Editar</button> '+
          '<button class="btn" data-act="phase" data-i="'+i+'">Avanzar fase</button> '+
          '<button class="btn" data-act="del" data-i="'+i+'">Eliminar</button>'+
        '</td>';
      F.tbody.appendChild(tr);
    }
  }

  function clearForm(){
    if(!F.idx) return;
    F.idx.value = -1;
    var toClear = ['nombre','email','tel','recordatorio','dni','dir','loc_res','obj_val',
                   'budget','max_compra','locs_obj','n_activos','alt_max','notes','notaria_fecha'];
    for (var i=0;i<toClear.length;i++){
      var k = toClear[i];
      if(F[k]) F[k].value = '';
    }

    if(F.sub_f1) F.sub_f1.value='Contacto recibido';
    if(F.pref_tipo) F.pref_tipo.value='Tradicional';
    if(F.obj_tipo) F.obj_tipo.value='bruta';
    if(F.incl_honor) F.incl_honor.value='si';
    if(F.no_asc) F.no_asc.value='no';
    if(F.bajos) F.bajos.value='no';
    if(F.reforma) F.reforma.value='No';
    if(F.inicio) F.inicio.value='';
    if(F.fin) F.fin.value='';
    if(F.sub_f5) F.sub_f5.value='Notaría fijada';

    setPhase('F1');
  }

  function editRow(i){
    var arr = (window.Store && window.Store.pros) || [];
    var p = arr[i]; if(!p) return;
    F.idx.value = i;

    if(F.nombre) F.nombre.value = p.nombre||'';
    if(F.email) F.email.value = p.email||'';
    if(F.tel) F.tel.value = p.tel||'';
    if(F.recordatorio) F.recordatorio.value = p.recordatorio||'';
    if(F.sub_f1) F.sub_f1.value = p.sub_f1 || p.sub || 'Contacto recibido';

    if(F.dni) F.dni.value = p.dni||'';
    if(F.dir) F.dir.value = p.dir||'';
    if(F.loc_res) F.loc_res.value = p.loc_res||'';
    if(F.pref_tipo) F.pref_tipo.value = p.pref_tipo||'Tradicional';
    if(F.obj_tipo) F.obj_tipo.value = p.obj_tipo||'bruta';
    if(F.obj_val)  F.obj_val.value  = (p.obj_tipo==='flujo')
                                      ? (p.obj_raw||0)
                                      : String(p.obj_raw||'').replace('.', ',');
    if(F.budget) F.budget.value = p.budget ? nf0.format(p.budget) : '';
    if(F.incl_honor) F.incl_honor.value = p.incl_honor||'si';
    if(F.max_compra) F.max_compra.value = p.max_compra ? nf0.format(p.max_compra) : '';

    if(F.locs_obj) F.locs_obj.value = p.locs_text||'';
    if(F.n_activos) F.n_activos.value = p.n_activos||'';
    if(F.no_asc) F.no_asc.value = p.no_asc||'no';
    if(F.alt_max) F.alt_max.value = p.alt_max||'';
    if(F.bajos) F.bajos.value = p.bajos||'no';
    if(F.reforma) F.reforma.value = p.reforma||'No';
    if(F.inicio) F.inicio.value = p.inicio||'';
    if(F.fin) F.fin.value = p.fin||'';
    if(F.notes) F.notes.value = p.notes||'';

    if(F.notaria_fecha) F.notaria_fecha.value = p.notaria_fecha||'';
    if(F.sub_f5) F.sub_f5.value = p.sub_f5||'Notaría fijada';

    setPhase(p.fase || 'F1');
    window.scrollTo(0, 0);
  }

  function advancePhaseObj(p){
    var order = ['F1','F2','F3','F4','F5'];
    var i = order.indexOf(p.fase || 'F1');
    p.fase = order[Math.min(order.length-1, i+1)];
    if(p.fase==='F2') p.sub='Contrato enviado';
    if(p.fase==='F3') p.sub='Propuesta enviada';
    if(p.fase==='F4') p.sub='Pendientes (arras)';
    if(p.fase==='F5') p.sub='Notaría fijada';
  }

  function collect(){
    var obj_tipo = (F.obj_tipo && F.obj_tipo.value) || 'bruta';
    var obj_raw  = parseEs(F.obj_val && F.obj_val.value);
    var budget   = parseEs(F.budget && F.budget.value) || 0;
    var max_compra = parseEs(F.max_compra && F.max_compra.value) || 0;

    return {
      fase: currentPhase,
      nombre: (F.nombre && F.nombre.value ? F.nombre.value.trim() : ''),
      email: (F.email && F.email.value ? F.email.value.trim() : ''),
      tel:   (F.tel && F.tel.value ? F.tel.value.trim() : ''),
      recordatorio: (F.recordatorio && F.recordatorio.value) || '',
      sub_f1: (F.sub_f1 && F.sub_f1.value) || 'Contacto recibido',
      sub:    (F.sub_f1 && F.sub_f1.value) || 'Contacto recibido',
      dni: (F.dni && F.dni.value ? F.dni.value.trim() : ''),
      dir: (F.dir && F.dir.value ? F.dir.value.trim() : ''),
      loc_res: (F.loc_res && F.loc_res.value ? F.loc_res.value.trim() : ''),
      pref_tipo: (F.pref_tipo && F.pref_tipo.value) || 'Tradicional',
      obj_tipo: obj_tipo,
      obj_raw: (Number.isFinite(obj_raw) ? obj_raw : (obj_tipo==='flujo'? 0 : 0)),
      budget: budget,
      incl_honor: (F.incl_honor && F.incl_honor.value) || 'si',
      max_compra: max_compra,
      locs_text: (F.locs_obj && F.locs_obj.value ? F.locs_obj.value.trim() : ''),
      n_activos: parseEs(F.n_activos && F.n_activos.value) || 0,
      no_asc: (F.no_asc && F.no_asc.value) || 'no',
      alt_max: parseEs(F.alt_max && F.alt_max.value) || 0,
      bajos: (F.bajos && F.bajos.value) || 'no',
      reforma: (F.reforma && F.reforma.value) || 'No',
      inicio: (F.inicio && F.inicio.value) || '',
      fin: (F.fin && F.fin.value) || '',
      notes: (F.notes && F.notes.value ? F.notes.value.trim() : ''),
      notaria_fecha: (F.notaria_fecha && F.notaria_fecha.value) || '',
      sub_f5: (F.sub_f5 && F.sub_f5.value) || 'Notaría fijada',
      ts: Date.now()
    };
  }

  function save(){
    if(currentPhase==='F1' && !minimalF1OK()){
      alert('En F1 necesitas al menos email o teléfono.');
      return;
    }
    var arr = (window.Store && window.Store.pros) || [];
    var idx = parseInt((F.idx && F.idx.value) || '-1', 10);
    var rec = collect();
    if(idx >= 0) arr[idx] = rec; else arr.unshift(rec);
    if(window.Store) window.Store.pros = arr;
    render();
    toast('✅ Prospecto guardado');
  }

  function mailto(to, subject, body){
    var href = 'mailto:'+encodeURIComponent(to||'') +
               '?subject='+encodeURIComponent(subject||'') +
               '&body='+encodeURIComponent(body||'');
    var w = window.open(href, '_blank');
    if(w) w.focus();
  }
  function takeName(){
    return (F.nombre && F.nombre.value ? F.nombre.value : 'Cliente').trim();
  }

  function printSummary(phase){
    var html = ''
      + '<html><head><meta charset="utf-8"><title>Resumen '+phase+'</title>'
      + '<style>body{font-family:Inter,Arial;padding:24px}h1{margin:0 0 8px}.k{color:#666}.b{font-weight:700}</style>'
      + '</head><body>'
      + '<h1>Unihouser · Resumen '+phase+'</h1>'
      + '<p><span class="k">Cliente:</span> <span class="b">'+takeName()+'</span></p>'
      + '<p><span class="k">Email:</span> '+((F.email && F.email.value) || '—')+' · <span class="k">Tel:</span> '+((F.tel && F.tel.value) || '—')+'</p>'
      + '<hr>'
      + '<p><span class="k">Tipo:</span> '+((F.pref_tipo && F.pref_tipo.value) || '—')+' · <span class="k">Objetivo:</span> '+((F.obj_tipo && F.obj_tipo.value) || '—')+' '+((F.obj_val && F.obj_val.value) || '')+'</p>'
      + '<p><span class="k">Presupuesto total:</span> '+((F.budget && F.budget.value) || '—')+' · <span class="k">Máx compra:</span> '+((F.max_compra && F.max_compra.value) || '—')+'</p>'
      + '<p><span class="k">Localidades objetivo:</span> '+((F.locs_obj && F.locs_obj.value) || '—')+'</p>'
      + '<p><span class="k">Notas:</span> '+((F.notes && F.notes.value) || '—')+'</p>'
      + '<hr><small>© 2025 Unihouser · unihouser.es · info@unihouser.es · 644 300 200</small>'
      + '</body></html>';
    var w = window.open('', '_blank');
    if(!w) return;
    w.document.write(html); w.document.close(); w.focus(); w.print();
  }

  document.addEventListener('click', function(e){
    var t = e.target.closest ? e.target.closest('button') : null; if(!t) return;

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
      if(!F.email || !F.email.value){ alert('Necesitas un email.'); return; }
      mailto(
        F.email.value,
        'Unihouser · Primer contacto',
        'Hola '+takeName()+',\n\nGracias por tu interés. ¿Cuándo te viene bien una breve reunión para alinear objetivos y presupuesto?\n\nSaludos.'
      );
      return;
    }
    if(t.id === 'f1_pdf'){ printSummary('F1 · Contacto'); return; }

    if(t.id === 'f2_pdf'){ printSummary('F2 · Reunión'); return; }
    if(t.id === 'f2_mail_ok'){
      if(!F.email || !F.email.value){ alert('Necesitas un email.'); return; }
      mailto(
        F.email.value,
        'Unihouser · Contrato de servicio',
        'Hola '+takeName()+',\n\nTe envío contrato para firma. Objetivo: '+(F.obj_tipo && F.obj_tipo.value)+' '+(F.obj_val && F.obj_val.value)+'. Presupuesto total: '+(F.budget && F.budget.value)+'. Máx compra: '+(F.max_compra && F.max_compra.value)+'.\n\nSaludos.'
      );
      return;
    }
    if(t.id === 'f2_mail_no'){
      if(!F.email || !F.email.value){ alert('Necesitas un email.'); return; }
      mailto(
        F.email.value,
        'Unihouser · Gracias por tu tiempo',
        'Hola '+takeName()+',\n\nGracias por la conversación. Si en el futuro cambian tus planes, estaremos encantados de ayudarte.\n\nSaludos.'
      );
      return;
    }
    if(t.id === 'f2_contrato'){
      alert('Generación de contrato: dejaremos una plantilla auto-rellenable en un próximo paso.');
      return;
    }

    if(t.id === 'f3_enviar_props'){
      if(!F.email || !F.email.value){ alert('Necesitas un email.'); return; }
      mailto(
        F.email.value,
        'Unihouser · Propuesta enviada',
        'Hola '+takeName()+',\n\nTe acabamos de enviar una propuesta de activo ajustada a tus criterios. Quedo atento a tu feedback.\n\nSaludos.'
      );
      return;
    }
    if(t.id === 'f3_reserva'){ toast('Reserva activa'); save(); return; }
    if(t.id === 'f4_pendientes'){ toast('Arras: pendientes'); save(); return; }
    if(t.id === 'f4_firmadas'){ toast('Arras firmadas'); save(); return; }
    if(t.id === 'f5_cerrar'){ toast('Operación completada'); save(); return; }
  });

  document.addEventListener('click', function(e){
    var b = e.target.closest ? e.target.closest('button[data-act]') : null; if(!b) return;
    var i = parseInt(b.getAttribute('data-i') || '-1', 10);
    var arr = (window.Store && window.Store.pros) || [];
    var p = arr[i]; if(!p) return;

    var act = b.getAttribute('data-act');
    if(act === 'edit'){ editRow(i); return; }
    if(act === 'phase'){ advancePhaseObj(p); if(window.Store) window.Store.pros = arr; render(); return; }
    if(act === 'del'){
      if(confirm('¿Eliminar prospecto?')){ arr.splice(i,1); if(window.Store) window.Store.pros = arr; render(); }
      return;
    }
  });

  var filterEvts = ['change','input'];
  for (var f=0; f<filterEvts.length; f++){
    var fe = filterEvts[f];
    if(F.f_fase) F.f_fase.addEventListener(fe, render);
    if(F.f_tipo) F.f_tipo.addEventListener(fe, render);
    if(F.f_q)    F.f_q.addEventListener(fe, render);
  }

  setPhase('F1');
  render();
  recalcMaxCompra();
});
