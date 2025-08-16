// js/activos.js — reemplazo completo (ES5, CSP-safe)
document.addEventListener('DOMContentLoaded', function(){
  // Utils existentes
  if (typeof setupMoneyFormatting === 'function') setupMoneyFormatting();
  if (typeof setupMoneyLive === 'function') setupMoneyLive();

  function $(id){ return document.getElementById(id); }
  var fmtE0 = new Intl.NumberFormat('es-ES', { style:'currency', currency:'EUR', maximumFractionDigits:0 });
  var fmtN0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits:0 });
  var fmtN1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits:1 });

  function parseEsMaybe(v){
    if (typeof parseEs === 'function') return parseEs(v);
    if (v==null) return NaN;
    var s = String(v).trim().replace(/\./g,'').replace(',', '.');
    if(!s) return NaN; var n = Number(s); return isFinite(n)?n:NaN;
  }
  function e0(n){ return fmtE0.format(n||0); }

  // --- refs (IDs según tu evaluar.html anterior) ---
  var E = {
    // Datos
    loc: $('e_loc'), calle: $('e_calle'), m2: $('e_m2'), anio: $('e_anio'),
    asc: $('e_asc'), alt: $('e_alt'), bajo: $('e_bajo'), habs: $('e_habs'), banos: $('e_banos'),
    url: $('e_url'),
    // Adquisición
    precio: $('e_precio'), itp_eur: $('e_itp_eur'), notaria: $('e_notaria'),
    reforma: $('e_reforma'), honor: $('e_honor'), pmax_in: $('e_pmax'),
    // Mantenimiento
    comunidad: $('e_comunidad'), ibi: $('e_ibi'), hogar: $('e_hogar'),
    impago: $('e_impago'), gestion: $('e_gestion'),
    // Explotación
    tipo: $('e_tipo'), alq: $('e_alq'), otros: $('e_otros'),
    // Acciones
    calc: $('e_calc'), clean: $('e_clean'),
    // Resultados
    panel: $('e_result'), r_inv: $('r_inv'),
    r_bruta: $('r_bruta'), r_bruta_diff: $('r_bruta_diff'),
    r_neta: $('r_neta'), r_neta_diff: $('r_neta_diff'),
    r_flujo: $('r_flujo'), r_pmax: $('r_pmax'),
    sb: $('sb'), sn: $('sn'), sf: $('sf'),
    chart: $('chartKPI'),
    // Matching/guardar
    matchList: $('matchList'), assignCli: $('assign_cli'),
    saveOnly: $('save_only'), saveAssign: $('save_assign'),
    clientMirror: $('clientMirror'),
    cm_nombre: $('cm_nombre'), cm_obj: $('cm_obj'), cm_real: $('cm_real'), cm_goal: $('cm_goal'), cm_gap: $('cm_gap')
  };

  // --- CONFIG desde localStorage ---
  var CFG = (window.Store && window.Store.cfg) || {};
  // Defaults seguros/gestión si no existen aún
  var C_ITP = (CFG.c_itp != null ? CFG.c_itp : 8); // %
  var C_NOT = (CFG.c_notaria != null ? CFG.c_notaria : 1500); // €
  var C_HOGAR = (CFG.c_seg_hogar_pct != null ? CFG.c_seg_hogar_pct : 3.5); // % sobre alquiler anual
  var C_IMP_TRAD = (CFG.c_seg_impago_trad_pct != null ? CFG.c_seg_impago_trad_pct : 4); // %
  var C_IMP_HAB  = (CFG.c_seg_impago_hab_pct  != null ? CFG.c_seg_impago_hab_pct  : 4); // %
  var C_GES_TRAD = (CFG.c_gestion_trad_pct != null ? CFG.c_gestion_trad_pct : 15); // %
  var C_GES_HAB  = (CFG.c_gestion_hab_pct  != null ? CFG.c_gestion_hab_pct  : 25); // %

  // Objetivos opcionales en CFG
  // Ejemplos esperados si los tienes guardados:
  // CFG.goal_main = 'bruta' | 'neta' | 'flujo'
  // CFG.goal_bruta_trad, CFG.goal_bruta_hab (en %)
  // CFG.goal_neta_trad,  CFG.goal_neta_hab  (en %)
  // CFG.goal_flujo_eur (€/año)
  function goalFor(tipo, kpi){
    var isHab = (tipo && tipo.toLowerCase()==='habitaciones');
    if(kpi==='bruta'){
      return isHab ? (CFG.goal_bruta_hab!=null?Number(CFG.goal_bruta_hab):null)
                   : (CFG.goal_bruta_trad!=null?Number(CFG.goal_bruta_trad):null);
    }
    if(kpi==='neta'){
      return isHab ? (CFG.goal_neta_hab!=null?Number(CFG.goal_neta_hab):null)
                   : (CFG.goal_neta_trad!=null?Number(CFG.goal_neta_trad):null);
    }
    if(kpi==='flujo'){
      return (CFG.goal_flujo_eur!=null?Number(CFG.goal_flujo_eur):null);
    }
    return null;
  }

  // --- FORMATO live de miles ya lo aporta setupMoneyLive con [data-money] ---

  // --- Autocalcular ITP/Notaría al teclear Precio ---
  function onPrecioChanged(){
    var precio = parseEsMaybe(E.precio && E.precio.value) || 0;
    var itp = Math.round(precio * (C_ITP/100));
    if(E.itp_eur) E.itp_eur.value = fmtN0.format(itp);
    if(E.notaria) E.notaria.value = fmtN0.format(C_NOT);
  }

  // --- Autocalcular Hogar/Impago/Gestión al teclear Alquiler ---
  function onAlquilerChanged(){
    var alq = parseEsMaybe(E.alq && E.alq.value) || 0;
    var alqAnual = alq * 12;
    var isHab = (E.tipo && (E.tipo.value || '').toLowerCase()==='habitaciones');

    var hogar = Math.round(alqAnual * (C_HOGAR/100));
    var impago = Math.round(alqAnual * ((isHab?C_IMP_HAB:C_IMP_TRAD)/100));
    var gestion = Math.round(alqAnual * ((isHab?C_GES_HAB:C_GES_TRAD)/100));

    if(E.hogar)   E.hogar.value   = fmtN0.format(hogar);
    if(E.impago)  E.impago.value  = fmtN0.format(impago);
    if(E.gestion) E.gestion.value = fmtN0.format(gestion);
  }

  if(E.precio)   E.precio.addEventListener('input', onPrecioChanged);
  if(E.precio)   E.precio.addEventListener('blur', onPrecioChanged);
  if(E.alq)      E.alq.addEventListener('input', onAlquilerChanged);
  if(E.alq)      E.alq.addEventListener('blur', onAlquilerChanged);
  if(E.tipo)     E.tipo.addEventListener('change', onAlquilerChanged);

  // --- Calcular métricas ---
  function emoji(score){ // 1 = verde, 0 = ámbar, -1 = rojo
    return score>0 ? '🟢' : (score===0 ? '🟡' : '🔴');
  }
  function cmpSemaforo(tipo, kpi, real){
    var g = goalFor(tipo, kpi);
    if(g==null || isNaN(g)) return ''; // sin objetivo configurado
    // Tolerancia ±0.3 puntos para %, y ±300€ para flujo
    if(kpi==='flujo'){
      if(real >= g + 300) return emoji(1);
      if(real >= g - 300) return emoji(0);
      return emoji(-1);
    }else{
      if(real >= g + 0.3) return emoji(1);
      if(real >= g - 0.3) return emoji(0);
      return emoji(-1);
    }
  }
  function gapTxt(tipo, kpi, real){
    var g = goalFor(tipo, kpi);
    if(g==null || isNaN(g)) return '';
    var gap = real - g;
    var sign = gap>=0 ? '+' : '−';
    if(kpi==='flujo') return ' ('+sign+fmtN0.format(Math.abs(Math.round(gap)))+' €)';
    return ' ('+sign+fmtN1.format(Math.abs(gap))+' ptos)';
  }

  function calcular(){
    var precio   = parseEsMaybe(E.precio && E.precio.value) || 0;
    var itpEur   = parseEsMaybe(E.itp_eur && E.itp_eur.value) || 0;
    var notaria  = parseEsMaybe(E.notaria && E.notaria.value) || C_NOT;
    var reforma  = parseEsMaybe(E.reforma && E.reforma.value) || 0;
    var inclHon  = (E.honor && E.honor.value==='si');
    var honor    = inclHon ? Math.round(3500*1.21) : 0;

    var alq      = parseEsMaybe(E.alq && E.alq.value) || 0;
    var otros    = parseEsMaybe(E.otros && E.otros.value) || 0;
    var alqAnual = (alq + otros) * 12;

    var comunidad= parseEsMaybe(E.comunidad && E.comunidad.value) || 0;
    var ibi      = parseEsMaybe(E.ibi && E.ibi.value) || 0;
    var hogar    = parseEsMaybe(E.hogar && E.hogar.value) || 0;
    var impago   = parseEsMaybe(E.impago && E.impago.value) || 0;
    var gestion  = parseEsMaybe(E.gestion && E.gestion.value) || 0;

    // Si el usuario no tocó alquiler tras cambiar tipo, recalcula gastos por si acaso
    if((hogar+impago+gestion)===0) onAlquilerChanged();
    hogar   = parseEsMaybe(E.hogar && E.hogar.value) || 0;
    impago  = parseEsMaybe(E.impago && E.impago.value) || 0;
    gestion = parseEsMaybe(E.gestion && E.gestion.value) || 0;

    // Inversión total
    var inversion = precio + itpEur + notaria + reforma + honor;

    // Gastos anuales
    var gastosAnuales = comunidad + ibi + hogar + impago + gestion;

    // KPIs
    var bruta = inversion>0 ? (alqAnual / inversion) * 100 : 0;
    var neta  = inversion>0 ? ((alqAnual - gastosAnuales) / inversion) * 100 : 0;
    var flujo = (alqAnual - gastosAnuales);

    // Precio Máx compra (si hay objetivo en CFG)
    var tipo = (E.tipo && E.tipo.value) || 'Tradicional';
    var pmax = 0;
    var gMain = CFG.goal_main || null;
    if(gMain==='bruta'){
      // alqAnual / inv = g%  -> inv = alqAnual / (g/100)
      var gB = goalFor(tipo,'bruta');
      if(gB && gB>0){
        var invNecesaria = alqAnual / (gB/100);
        pmax = Math.max(0, Math.round(invNecesaria - (itpEur + notaria + reforma + honor)));
      }
    }else if(gMain==='neta'){
      // (alqAnual - gastos) / inv = g%  -> inv = (alqAnual - gastos) / (g/100)
      var gN = goalFor(tipo,'neta');
      if(gN && gN>0){
        var invNecesariaN = (alqAnual - gastosAnuales) / (gN/100);
        pmax = Math.max(0, Math.round(invNecesariaN - (itpEur + notaria + reforma + honor)));
      }
    }else if(gMain==='flujo'){
      var gF = goalFor(tipo,'flujo'); // €/año
      if(gF!=null){
        // flujo = alqAnual - gastos; si queremos gF, precio no cambia el flujo directamente,
        // así que mantenemos pmax=0 (no depende del precio). Lo dejamos vacío.
        pmax = 0;
      }
    }
    if(E.pmax_in) E.pmax_in.value = pmax? fmtN0.format(pmax) : '';

    // Pintar resultados
    if(E.panel) E.panel.hidden = false;
    if(E.r_inv)   E.r_inv.textContent   = e0(inversion);
    if(E.r_flujo) E.r_flujo.textContent = e0(flujo);

    if(E.r_bruta){
      E.r_bruta.textContent = fmtN1.format(bruta) + ' %';
      E.r_bruta_diff.textContent = gapTxt(tipo,'bruta', bruta);
      E.sb.textContent = cmpSemaforo(tipo,'bruta', bruta);
    }
    if(E.r_neta){
      E.r_neta.textContent = fmtN1.format(neta) + ' %';
      E.r_neta_diff.textContent = gapTxt(tipo,'neta', neta);
      E.sn.textContent = cmpSemaforo(tipo,'neta', neta);
    }
    if(E.sf){ E.sf.textContent = cmpSemaforo(tipo,'flujo', flujo); }

    // Gráfica: KPI principal si hay objetivo principal, si no, bruta por defecto
    var kpi = CFG.goal_main || 'bruta';
    var real = (kpi==='neta') ? neta : (kpi==='flujo' ? flujo : bruta);
    var objetivo = goalFor(tipo, kpi);
    if(E.chart && window.SimpleChart){
      var labels = [ (kpi==='flujo'?'Flujo (€)':'KPI (%)') ];
      var values = [ (kpi==='flujo'? Math.max(0, real) : Math.max(0, real)) ];
      SimpleChart.bars(E.chart, { labels: labels, values: values, target: (objetivo!=null?objetivo:undefined) });
    }

    // Matching prospectos
    renderMatching(tipo, bruta, neta, flujo);

    // Devolver por si quieres testear
    return { inversion: inversion, bruta: bruta, neta: neta, flujo: flujo, pmax: pmax };
  }

  // --- Matching con prospectos guardados ---
  function renderMatching(tipo, bruta, neta, flujo){
    var list = (window.Store && window.Store.pros) || [];
    if(!E.matchList || !E.assignCli) return;
    E.matchList.textContent = '—';
    E.assignCli.innerHTML = '';

    var matches = [];
    for(var i=0;i<list.length;i++){
      var p = list[i];
      if(!p) continue;
      if((p.pref_tipo||'').toLowerCase() !== (tipo||'').toLowerCase()) continue;
      var ok = false, gap = 0, real=0, goal=0, label='';

      if(p.obj_tipo==='bruta'){
        real = bruta; goal = Number(p.obj_raw||0); label='Bruta';
        ok = (real >= goal);
        gap = real - goal;
      }else if(p.obj_tipo==='neta'){
        real = neta; goal = Number(p.obj_raw||0); label='Neta';
        ok = (real >= goal);
        gap = real - goal;
      }else{ // flujo
        real = flujo; goal = Number(p.obj_raw||0); label='Flujo';
        ok = (real >= goal);
        gap = real - goal;
      }

      if(ok){
        matches.push({i:i, nombre:(p.nombre||('Prospecto '+(i+1))), label:label, real:real, goal:goal, gap:gap});
      }
    }

    if(!matches.length){
      E.matchList.textContent = 'Sin clientes potenciales';
    }else{
      var lines = [];
      for(var j=0;j<matches.length;j++){
        var m = matches[j];
        var gapStr = (m.label==='Flujo')
          ? ( (m.gap>=0?'+':'−') + fmtN0.format(Math.abs(Math.round(m.gap))) + ' €' )
          : ( (m.gap>=0?'+':'−') + fmtN1.format(Math.abs(m.gap)) + ' ptos' );
        lines.push('• '+m.nombre+' — '+m.label+': '+(m.label==='Flujo'?fmtE0.format(Math.round(m.real)):fmtN1.format(m.real)+' %')+' ('+gapStr+')');
        var opt = document.createElement('option');
        opt.value = m.i; opt.textContent = m.nombre + ' — ' + m.label;
        E.assignCli.appendChild(opt);
      }
      E.matchList.textContent = lines.join('\n');
    }
  }

  // --- Guardar evaluación (y opcionalmente asignar) ---
  function collectEval(){
    // Guarda un snapshot mínimo suficiente para reabrir
    var o = {
      ts: Date.now(),
      // datos básicos
      loc: E.loc && E.loc.value || '', calle: E.calle && E.calle.value || '',
      m2: E.m2 && E.m2.value || '', anio: E.anio && E.anio.value || '',
      asc: E.asc && E.asc.value || '', alt: E.alt && E.alt.value || '',
      bajo: E.bajo && E.bajo.value || '', habs: E.habs && E.habs.value || '',
      banos: E.banos && E.banos.value || '', url: E.url && E.url.value || '',
      tipo: E.tipo && E.tipo.value || 'Tradicional',
      // adquisición
      precio: E.precio && E.precio.value || '', itp_eur: E.itp_eur && E.itp_eur.value || '',
      notaria: E.notaria && E.notaria.value || '', reforma: E.reforma && E.reforma.value || '',
      honor: E.honor && E.honor.value || 'si', pmax_in: E.pmax_in && E.pmax_in.value || '',
      // mantenimiento
      comunidad: E.comunidad && E.comunidad.value || '', ibi: E.ibi && E.ibi.value || '',
      hogar: E.hogar && E.hogar.value || '', impago: E.impago && E.impago.value || '',
      gestion: E.gestion && E.gestion.value || '',
      // explotación
      alq: E.alq && E.alq.value || '', otros: E.otros && E.otros.value || '',
    };
    return o;
  }

  function saveEvaluation(assignIndex){
    var arr = (window.Store && window.Store.evals) || [];
    var rec = collectEval();
    arr.unshift(rec);
    if(window.Store) window.Store.evals = arr;

    // Asignación opcional a un prospecto
    if(assignIndex!=null && assignIndex!=='' && !isNaN(parseInt(assignIndex,10))){
      var idx = parseInt(assignIndex,10);
      var pros = (window.Store && window.Store.pros) || [];
      var p = pros[idx];
      if(p){
        if(!p.asignados) p.asignados = [];
        p.asignados.unshift({ ts: Date.now(), ref: rec.url || rec.calle || (rec.loc+', '+rec.tipo) });
        window.Store.pros = pros;
      }
    }
    alert('✅ Evaluación guardada' + (assignIndex!=null ? ' y asignada' : ''));
  }

  // --- Eventos botones ---
  if(E.calc) E.calc.addEventListener('click', function(){
    calcular();
    // Pre-visual espejo cliente si hay selección en assign
    var s = E.assignCli && E.assignCli.value;
    if(s!=null && s!==''){
      var out = calcular(); // usa los últimos valores
      var idx = parseInt(s,10);
      var p = ((window.Store && window.Store.pros)||[])[idx];
      if(p && E.clientMirror){
        var kLabel = (p.obj_tipo==='flujo'?'Flujo (€)': (p.obj_tipo==='neta'?'Neta %':'Bruta %'));
        var realK = (p.obj_tipo==='flujo'? out.flujo : (p.obj_tipo==='neta'? out.neta : out.bruta));
        var goalK = Number(p.obj_raw||0);
        var gap = realK - goalK;
        if(E.clientMirror) E.clientMirror.hidden = false;
        if(E.cm_nombre) E.cm_nombre.textContent = p.nombre||'—';
        if(E.cm_obj)    E.cm_obj.textContent = kLabel;
        if(E.cm_real)   E.cm_real.textContent = (p.obj_tipo==='flujo'? fmtE0.format(Math.round(realK)) : fmtN1.format(realK)+' %');
        if(E.cm_goal)   E.cm_goal.textContent = (p.obj_tipo==='flujo'? fmtE0.format(Math.round(goalK)) : fmtN1.format(goalK)+' %');
        if(E.cm_gap)    E.cm_gap.textContent  = (p.obj_tipo==='flujo'
                                 ? ((gap>=0?'+':'−')+fmtN0.format(Math.abs(Math.round(gap)))+' €')
                                 : ((gap>=0?'+':'−')+fmtN1.format(Math.abs(gap))+' ptos'));
      }
    }else{
      if(E.clientMirror) E.clientMirror.hidden = true;
    }
  });

  if(E.clean) E.clean.addEventListener('click', function(){
    var ids = ['e_calle','e_m2','e_anio','e_alt','e_habs','e_banos','e_url',
               'e_precio','e_itp_eur','e_notaria','e_reforma','e_pmax',
               'e_comunidad','e_ibi','e_hogar','e_impago','e_gestion',
               'e_alq','e_otros'];
    for(var i=0;i<ids.length;i++){
      var el = $(ids[i]); if(el){ el.value=''; }
    }
    if(E.honor) E.honor.value='si';
    if(E.tipo)  E.tipo.value='Tradicional';
    if(E.panel) E.panel.hidden = true;
    if(E.clientMirror) E.clientMirror.hidden = true;
  });

  if(E.saveOnly)  E.saveOnly.addEventListener('click', function(){ saveEvaluation(null); });
  if(E.saveAssign)E.saveAssign.addEventListener('click', function(){
    var v = E.assignCli && E.assignCli.value; saveEvaluation(v);
  });

  // Inicializa algunos autos si hay valores precargados
  onPrecioChanged();
  onAlquilerChanged();
});
