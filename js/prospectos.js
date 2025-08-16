// js/prospectos.js — COMPLETO (ES5, CSP-safe, mantiene look&feel, objetivos por defecto por tipo)
document.addEventListener('DOMContentLoaded', function(){
  // Utilidades de app.js
  if (typeof setupMoneyFormatting === 'function') setupMoneyFormatting();
  if (typeof setupMoneyLive === 'function') setupMoneyLive();

  function $(id){ return document.getElementById(id); }
  var nf0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

  // parseEs de app.js (fallback por si acaso)
  function parseEsMaybe(v){
    if (typeof parseEs === 'function') return parseEs(v);
    if (v==null) return NaN;
    var s = String(v).trim().replace(/\./g,'').replace(',', '.');
    if(!s) return NaN; var n = Number(s); return isFinite(n)?n:NaN;
  }

  // Store (usa el del proyecto si existe)
  var Store = window.Store || {
    get cfg(){ try{return JSON.parse(localStorage.getItem('cfg')||'{}')}catch(_){return{}} },
    set cfg(v){ localStorage.setItem('cfg', JSON.stringify(v)); },
    get pros(){ try{return JSON.parse(localStorage.getItem('pros')||'[]')}catch(_){return[]} },
    set pros(v){ localStorage.setItem('pros', JSON.stringify(v)); }
  };

  // --------- REFS ----------
  var gates = { F1: $('gateF1'), F2: $('gateF2'), F3: $('gateF3'), F4: $('gateF4'), F5: $('gateF5') };
  var stepsEl = $('steps');

  var F = {
    idx: $('p_idx'), toast: $('p_toast'),
    // F1
    nombre: $('p_nombre'), email: $('p_email'), tel: $('p_tel'),
    recordatorio: $('p_recordatorio'), sub_f1: $('p_sub_f1'),
    // F2
    dni: $('p_dni'), dir: $('p_dir'), loc_res: $('p_loc_res'),
    financia: $('p_financia'), broker: $('p_broker'), pct_fin: $('p_pct_fin'),
    // F3 — características
    locs_obj: $('p_locs_obj'), pref_tipo: $('p_pref_tipo'), n_activos: $('p_n_activos'),
    no_asc: $('p_no_asc'), alt_max: $('p_alt_max'), bajos: $('p_bajos'),
    reforma: $('p_reforma'), notes: $('p_notes'),
    // F3 — objetivos / presupuesto
    obj_tipo: $('p_obj_tipo'), obj_val: $('p_obj_val'),
    inicio: $('p_inicio'), fin: $('p_fin'),
    budget: $('p_budget'), incl_honor: $('p_incl_honor'), max_compra: $('p_max_compra'),
    // F4
    sub_f4: $('p_sub_f4'), props: $('p_props'), notes_f4: $('p_notes_f4'),
    // F5
    notaria_fecha: $('p_notaria_fecha'), sub_f5: $('p_sub_f5'),
    // GRID / filtros
    tbody: $('p_body'), f_fase: $('f_fase'), f_tipo: $('f_tipo'), f_q: $('f_q')
  };

  // CFG (para ITP, notaría, honorarios, objetivos por defecto, etc.)
  var CFG = Store.cfg || {};
  var C_ITP = (CFG.c_itp != null ? CFG.c_itp : 8);           // %
  var C_NOT = (CFG.c_notaria != null ? CFG.c_notaria : 1500); // €
  var HON_PSI_EUR = Math.round(3500 * 1.21);                  // por defecto

  // objetivo por defecto según tipo+objetivo elegido
  function defaultGoalFor(tipo, kpi){
    var isHab = (String(tipo||'').toLowerCase()==='habitaciones');
    if(kpi==='bruta'){
      return isHab ? (CFG.goal_bruta_hab!=null?Number(CFG.goal_bruta_hab):null)
                   : (CFG.goal_bruta_trad!=null?Number(CFG.goal_bruta_trad):null);
    }
    if(kpi==='neta'){
      return isHab ? (CFG.goal_neta_hab!=null?Number(CFG.goal_neta_hab):null)
                   : (CFG.goal_neta_trad!=null?Number(CFG.goal_neta_trad):null);
    }
    if(kpi==='flujo'){
      return (CFG.goal_flujo_eur!=null?Number(CFG.goal_flujo_eur):null); // €/año
    }
    return null;
  }

  // --------- FASES ----------
  var currentPhase = 'F1';
  function setPhase(ph){
    currentPhase = ph;
    for (var k in gates){ if(!gates.hasOwnProperty(k)) continue; var el=gates[k]; if(el) el.hidden = (k!==ph); }
    if (stepsEl){
      var nodes = stepsEl.querySelectorAll('.step');
      for (var i=0;i<nodes.length;i++){
        var s = nodes[i]; var phAttr = s.getAttribute('data-phase');
        if (phAttr === ph) s.classList.add('active'); else s.classList.remove('active');
      }
    }
  }
  if (stepsEl){
    stepsEl.addEventListener('click', function(e){
      var t = e.target.closest ? e.target.closest('.step') : null; if(!t) return;
      setPhase(t.getAttribute('data-phase'));
    });
  }

  // --------- TOAST ----------
  function toast(msg){
    if(!F.toast) return;
    F.toast.textContent = msg || 'OK';
    F.toast.hidden = false;
    clearTimeout(window.__p_toast);
    window.__p_toast = setTimeout(function(){ F.toast.hidden = true; }, 2000);
  }

  // --------- REGLAS ----------
  function minimalF1OK(){
    var hasEmail = (F.email && F.email.value && F.email.value.trim());
    var hasTel   = (F.tel && F.tel.value && F.tel.value.trim());
    return !!(hasEmail || hasTel);
  }

  // Limitar fin a +5 meses desde inicio
  function clampFinMes(){
    if(!F.inicio || !F.fin) return;
    var s = F.inicio.value, e = F.fin.value; if(!s || !e) return;
    var sp = s.split('-'), ep = e.split('-');
    var ys = Number(sp[0]), ms = Number(sp[1]);
    var ye = Number(ep[0]), me = Number(ep[1]);
    var max = new Date(ys, ms-1+5, 1);
    var end = new Date(ye, me-1, 1);
    if(end > max){
      var y = String(max.getFullYear()); var m = String(max.getMonth()+1); if(m.length<2) m='0'+m;
      F.fin.value = y + '-' + m;
    }
  }
  if(F.inicio) F.inicio.addEventListener('change', clampFinMes);
  if(F.fin)    F.fin.addEventListener('change', clampFinMes);

  // Máx compra = (Budget - Notaría - Honorarios(if si)) / (1 + ITP)
  function recalcMaxCompra(){
    var itp = (C_ITP/100);
    var notaria = C_NOT;
    var incl = (F.incl_honor && F.incl_honor.value === 'si');
    var honor = incl ? HON_PSI_EUR : 0;
    var budget = parseEsMaybe(F.budget && F.budget.value) || 0;

    if(!F.max_compra) return;
    if(budget <= 0){ F.max_compra.value=''; return; }

    var numerador = Math.max(0, budget - notaria - honor);
    var maxCompra = Math.max(0, Math.round(numerador / (1 + itp)));
    F.max_compra.value = nf0.format(maxCompra);
  }
  ['input','change'].forEach(function(ev){
    if(F.budget) F.budget.addEventListener(ev, recalcMaxCompra);
    if(F.incl_honor) F.incl_honor.addEventListener(ev, recalcMaxCompra);
  });

  // Poner valor objetivo por defecto en función del tipo elegido + objetivo
  function applyGoalDefault(force){
    if(!F.pref_tipo || !F.obj_tipo || !F.obj_val) return;
    var tipo = F.pref_tipo.value;
    var kpi  = F.obj_tipo.value;
    var curr = (F.obj_val.value||'').trim();

    if (force || !curr){
      var def = defaultGoalFor(tipo, kpi);
      if(def!=null && !isNaN(def)){
        // Para flujo (€/año) entero, para % con un decimal
        if(kpi==='flujo'){ F.obj_val.value = nf0.format(Math.round(def)); }
        else { F.obj_val.value = String(def).replace('.', ','); }
      }
    }
  }
  if(F.pref_tipo) F.pref_tipo.addEventListener('change', function(){ applyGoalDefault(false); });
  if(F.obj_tipo)  F.obj_tipo .addEventListener('change', function(){ applyGoalDefault(false); });

  // --------- GRID (filtros + render) ----------
  function objLabel(rec){
    if(rec.obj_tipo==='flujo') return nf0.format(rec.obj_raw||0) + ' €';
    return nf1.format(rec.obj_raw||0) + ' %';
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
          ((p.nombre||'').toLowerCase().indexOf(q)!==-1) ||
          ((p.locs_text||'').toLowerCase().indexOf(q)!==-1) ||
          ((p.loc_res||'').toLowerCase().indexOf(q)!==-1) ||
          ((p.email||'').toLowerCase().indexOf(q)!==-1);
        if(!hay) return false;
      }
      return true;
    });
  }
  function render(){
    if(!F.tbody) return;
    F.tbody.innerHTML = '';
    var arr = Store.pros || [];
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

  // --------- FORM helpers ----------
  function clearForm(){
    if(!F.idx) return;
    F.idx.value = -1;

    var toClear = ['nombre','email','tel','recordatorio','dni','dir','loc_res',
      'pct_fin','locs_obj','n_activos','alt_max','notes','obj_val','budget',
      'max_compra','props','notes_f4','notaria_fecha'];
    for (var i=0;i<toClear.length;i++){ var k=toClear[i]; if(F[k]) F[k].value=''; }

    if(F.sub_f1) F.sub_f1.value='Contacto recibido';
    if(F.financia) F.financia.value='si';
    if(F.broker)   F.broker.value='no';
    if(F.pref_tipo)F.pref_tipo.value='Tradicional';
    if(F.no_asc)   F.no_asc.value='no';
    if(F.bajos)    F.bajos.value='no';
    if(F.reforma)  F.reforma.value='No';
    if(F.obj_tipo) F.obj_tipo.value='bruta';
    if(F.incl_honor) F.incl_honor.value='si';
    if(F.sub_f4) F.sub_f4.value='Propuesta enviada';
    if(F.sub_f5) F.sub_f5.value='Notaría fijada';

    setPhase('F1');
  }

  function editRow(i){
    var arr = Store.pros || [];
    var p = arr[i]; if(!p) return;
    F.idx.value = i;

    // F1
    if(F.nombre) F.nombre.value = p.nombre||'';
    if(F.email)  F.email.value  = p.email||'';
    if(F.tel)    F.tel.value    = p.tel||'';
    if(F.recordatorio) F.recordatorio.value = p.recordatorio||'';
    if(F.sub_f1) F.sub_f1.value = p.sub_f1 || p.sub || 'Contacto recibido';

    // F2
    if(F.dni) F.dni.value = p.dni||'';
    if(F.dir) F.dir.value = p.dir||'';
    if(F.loc_res) F.loc_res.value = p.loc_res||'';
    if(F.financia) F.financia.value = p.financia||'si';
    if(F.broker)   F.broker.value   = p.broker||'no';
    if(F.pct_fin)  F.pct_fin.value  = (p.pct_fin!=null? p.pct_fin : '');

    // F3 características
    if(F.locs_obj)   F.locs_obj.value = p.locs_text||'';
    if(F.pref_tipo)  F.pref_tipo.value = p.pref_tipo||'Tradicional';
    if(F.n_activos)  F.n_activos.value = p.n_activos||'';
    if(F.no_asc)     F.no_asc.value = p.no_asc||'no';
    if(F.alt_max)    F.alt_max.value = p.alt_max||'';
    if(F.bajos)      F.bajos.value = p.bajos||'no';
    if(F.reforma)    F.reforma.value = p.reforma||'No';
    if(F.notes)      F.notes.value = p.notes||'';

    // F3 objetivos/presupuesto
    if(F.obj_tipo) F.obj_tipo.value = p.obj_tipo||'bruta';
    if(F.obj_val){
      if(p.obj_tipo==='flujo'){ F.obj_val.value = nf0.format(Math.round(p.obj_raw||0)); }
      else { F.obj_val.value = String(p.obj_raw||'').replace('.', ','); }
    }
    if(F.inicio) F.inicio.value = p.inicio||'';
    if(F.fin)    F.fin.value    = p.fin||'';
    if(F.budget) F.budget.value = p.budget ? nf0.format(p.budget) : '';
    if(F.incl_honor) F.incl_honor.value = p.incl_honor||'si';
    if(F.max_compra) F.max_compra.value = p.max_compra ? nf0.format(p.max_compra) : '';

    // F4
    if(F.sub_f4) F.sub_f4.value = p.sub_f4 || 'Propuesta enviada';
    if(F.props)  F.props.value  = p.props || '';
    if(F.notes_f4) F.notes_f4.value = p.notes_f4 || '';

    // F5
    if(F.notaria_fecha) F.notaria_fecha.value = p.notaria_fecha||'';
    if(F.sub_f5) F.sub_f5.value = p.sub_f5 || 'Notaría fijada';

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

  // --------- SAVE ----------
  function collect(){
    var obj_tipo = (F.obj_tipo && F.obj_tipo.value) || 'bruta';
    var raw = parseEsMaybe(F.obj_val && F.obj_val.value);
    var budget = parseEsMaybe(F.budget && F.budget.value) || 0;
    var max_compra = parseEsMaybe(F.max_compra && F.max_compra.value) || 0;

    return {
      fase: currentPhase,
      // F1
      nombre: (F.nombre && F.nombre.value ? F.nombre.value.trim() : ''),
      email: (F.email && F.email.value ? F.email.value.trim() : ''),
      tel:   (F.tel && F.tel.value ? F.tel.value.trim() : ''),
      recordatorio: (F.recordatorio && F.recordatorio.value) || '',
      sub_f1: (F.sub_f1 && F.sub_f1.value) || 'Contacto recibido',
      sub:    (F.sub_f1 && F.sub_f1.value) || 'Contacto recibido',

      // F2
      dni: (F.dni && F.dni.value ? F.dni.value.trim() : ''),
      dir: (F.dir && F.dir.value ? F.dir.value.trim() : ''),
      loc_res: (F.loc_res && F.loc_res.value ? F.loc_res.value.trim() : ''),
      financia: (F.financia && F.financia.value) || 'si',
      broker:   (F.broker && F.broker.value) || 'no',
      pct_fin:  parseEsMaybe(F.pct_fin && F.pct_fin.value) || null,

      // F3 — características
      locs_text: (F.locs_obj && F.locs_obj.value ? F.locs_obj.value.trim() : ''),
      pref_tipo: (F.pref_tipo && F.pref_tipo.value) || 'Tradicional',
      n_activos: parseEsMaybe(F.n_activos && F.n_activos.value) || 0,
      no_asc: (F.no_asc && F.no_asc.value) || 'no',
      alt_max: parseEsMaybe(F.alt_max && F.alt_max.value) || 0,
      bajos: (F.bajos && F.bajos.value) || 'no',
      reforma: (F.reforma && F.reforma.value) || 'No',
      notes: (F.notes && F.notes.value ? F.notes.value.trim() : ''),

      // F3 — objetivos / presupuesto
      obj_tipo: obj_tipo,
      obj_raw: (isFinite(raw) ? raw : (obj_tipo==='flujo'? 0 : 0)),
      inicio: (F.inicio && F.inicio.value) || '',
      fin:    (F.fin && F.fin.value) || '',
      budget: budget,
      incl_honor: (F.incl_honor && F.incl_honor.value) || 'si',
      max_compra: max_compra,

      // F4
      sub_f4: (F.sub_f4 && F.sub_f4.value) || 'Propuesta enviada',
      props: parseEsMaybe(F.props && F.props.value) || 0,
      notes_f4: (F.notes_f4 && F.notes_f4.value) || '',

      // F5
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
    var arr = Store.pros || [];
    var idx = parseInt((F.idx && F.idx.value) || '-1', 10);
    var rec = collect();
    if(idx >= 0) arr[idx] = rec; else arr.unshift(rec);
    Store.pros = arr;
    render();
    toast('✅ Prospecto guardado');
  }

  // --------- MAILTO / PDF breves ----------
  function mailto(to, subject, body){
    var href = 'mailto:'+encodeURIComponent(to||'')+'?subject='+encodeURIComponent(subject||'')+'&body='+encodeURIComponent(body||'');
    var w = window.open(href, '_blank'); if(w) w.focus();
  }
  function takeName(){ return (F.nombre && F.nombre.value ? F.nombre.value : 'Cliente').trim(); }

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
    var w = window.open('', '_blank'); if(!w) return;
    w.document.write(html); w.document.close(); w.focus(); w.print();
  }

  // --------- EVENTOS ----------
  document.addEventListener('click', function(e){
    var t = e.target.closest ? e.target.closest('button') : null; if(!t) return;

    if(t.id === 'p_save'){ save(); return; }
    if(t.id === 'p_clear'){ clearForm(); toast('Formulario limpio'); return; }

    if(t.id === 'toF2'){ setPhase('F2'); save(); return; }
    if(t.id === 'toF3'){ setPhase('F3'); save(); return; }
    if(t.id === 'toF4'){ setPhase('F4'); save(); return; }
    if(t.id === 'toF5'){ setPhase('F5'); save(); return; }
    if(t.id === 'toF1'){ setPhase('F1'); save(); return; }

    // F1
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

    // F2
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
  });

  document.addEventListener('click', function(e){
    var b = e.target.closest ? e.target.closest('button[data-act]') : null; if(!b) return;
    var i = parseInt(b.getAttribute('data-i') || '-1', 10);
    var arr = Store.pros || [];
    var p = arr[i]; if(!p) return;

    var act = b.getAttribute('data-act');
    if(act === 'edit'){ editRow(i); return; }
    if(act === 'phase'){ advancePhaseObj(p); Store.pros = arr; render(); return; }
    if(act === 'del'){
      if(confirm('¿Eliminar prospecto?')){ arr.splice(i,1); Store.pros = arr; render(); }
      return;
    }
  });

  ['change','input'].forEach(function(ev){
    if(F.f_fase) F.f_fase.addEventListener(ev, render);
    if(F.f_tipo) F.f_tipo.addEventListener(ev, render);
    if(F.f_q)    F.f_q.addEventListener(ev, render);
  });

  // Init
  setPhase('F1');
  applyGoalDefault(false);   // precarga objetivo por defecto si está vacío
  recalcMaxCompra();         // si ya hay presupuesto
  render();
});
