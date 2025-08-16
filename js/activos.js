document.addEventListener('DOMContentLoaded', ()=>{
  setupMoneyFormatting(); setupMoneyLive();

  // localidades
  const locSel=document.getElementById('e_loc');
  fetch('data/asturias.json').then(r=>r.json()).then(list=>{
    locSel.innerHTML=list.map(n=>`<option>${n}</option>`).join('');
  }).catch(_=>{ locSel.innerHTML='<option>Oviedo</option>'; });

  // autos desde Config
  const elNot = document.getElementById('e_notaria');
  if(elNot) elNot.value = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format((Store.cfg.c_notaria||1500));
  const precioInp = document.getElementById('e_precio');
  const itpOut = document.getElementById('e_itp_eur');
  const itpPct = (Store.cfg.c_itp||8)/100;
  function updateITP(){
    const p = parseEs(precioInp.value)||0;
    if(itpOut) itpOut.value = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(Math.round(p*itpPct));
  }
  precioInp.addEventListener('input', updateITP); updateITP();

  // operativos autocalculados
  const alqInp=document.getElementById('e_alq'); const otrosInp=document.getElementById('e_otros');
  const hogarInp=document.getElementById('e_hogar'), impagoInp=document.getElementById('e_impago'), gestInp=document.getElementById('e_gestion');
  function updateOperativos(){
    const alq = parseEs(alqInp.value)||0; const otros = parseEs(otrosInp.value)||0; const alqA=(alq+otros)*12;
    const pct_h=(Store.cfg.c_pct_hogar||3.5)/100, pct_i=(Store.cfg.c_pct_impago||4)/100,
          pct_g=(document.getElementById('e_tipo').value==='Habitaciones'?(Store.cfg.c_pct_g_hab||25):(Store.cfg.c_pct_g_trad||15))/100;
    if(!hogarInp.dataset.touched)  hogarInp.value = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(Math.round(alqA*pct_h));
    if(!impagoInp.dataset.touched) impagoInp.value = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(Math.round(alqA*pct_i));
    if(!gestInp.dataset.touched)   gestInp.value = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(Math.round(alqA*pct_g));
  }
  [alqInp, otrosInp, document.getElementById('e_tipo')].forEach(el=> el && el.addEventListener('input', updateOperativos));
  updateOperativos();

  function precioMaximo({alqA,gastos,notaria,reforma,honor,itp_pct,objTipo,objValor}){
    const fix=(notaria||0)+(reforma||0)+(honor||0);
    const k = 1 + (itp_pct||0);
    if(objTipo==='bruta'){
      const Inv = (alqA*100)/(objValor||6);
      return Math.max(0, (Inv - fix)/k);
    } else if(objTipo==='neta'){
      const Inv = ((alqA - (gastos||0))*100)/(objValor||4.5);
      return Math.max(0, (Inv - fix)/k);
    } else {
      const t = (Store.cfg.c_obj_neta||4.5);
      const Inv = ((alqA - (gastos||0))*100)/t;
      return Math.max(0, (Inv - fix)/k);
    }
  }

  function fillClientMirror(cli, bruta, neta, flujo){
    const cm=document.getElementById('clientMirror'); if(!cm) return;
    document.getElementById('cm_nombre').textContent = cli?.nombre || '—';
    let label='—', real='—', goal='—', gap='—';
    if(cli){
      if(cli.obj_tipo==='bruta'){ label='Bruta (%)'; real=fmtN1.format(bruta)+' %'; goal=fmtN1.format(cli.obj_raw)+' %'; gap=(bruta-cli.obj_raw); }
      else if(cli.obj_tipo==='neta'){ label='Neta (%)'; real=fmtN1.format(neta)+' %'; goal=fmtN1.format(cli.obj_raw)+' %'; gap=(neta-cli.obj_raw); }
      else { label='Flujo (€/mes)'; real=fmtN0.format(flujo/12)+' €'; goal=fmtN0.format(cli.obj_raw)+' €'; gap=((flujo/12)-cli.obj_raw); }
      document.getElementById('cm_obj').textContent=label;
      document.getElementById('cm_real').textContent=real;
      document.getElementById('cm_goal').textContent=goal;
      document.getElementById('cm_gap').textContent=(gap>=0?'+':'')+(cli.obj_tipo==='flujo'?fmtN0.format(gap):fmtN1.format(gap))+(cli.obj_tipo==='flujo'?' €':' pp');
      cm.hidden=false;
    } else cm.hidden=true;
  }

  document.getElementById('e_calc').onclick=()=>{
    const c=Store.cfg;
    const e_itp = (parseEs(document.getElementById('e_itp_eur').value)|| (parseEs(document.getElementById('e_precio').value)||0)*(c.c_itp||8)/100);
    const inclHonor=(document.getElementById('e_honor').value || c.c_incl_honor || 'si')==='si';
    const alq=parseEs(document.getElementById('e_alq').value)||0, otros=parseEs(document.getElementById('e_otros').value)||0;
    const alqA=(alq+otros)*12;
    const precio=parseEs(document.getElementById('e_precio').value)||0, reforma=parseEs(document.getElementById('e_reforma').value)||0;
    const notaria=parseEs(document.getElementById('e_notaria').value)|| (c.c_notaria||1500), honor=inclHonor?3500*1.21:0;
    const hogar=parseEs(document.getElementById('e_hogar').value)||0, impago=parseEs(document.getElementById('e_impago').value)||0, gestion=parseEs(document.getElementById('e_gestion').value)||0;
    const comunidad=parseEs(document.getElementById('e_comunidad').value)||0, ibi=parseEs(document.getElementById('e_ibi').value)||0;

    const inversion=precio+e_itp+notaria+reforma+honor, gastos=hogar+impago+gestion+comunidad+ibi;
    const bruta=inversion?alqA/inversion*100:0, neta=inversion?(alqA-gastos)/inversion*100:0, flujo=alqA-gastos;

    let objTipo='neta', objValor = (Store.cfg.c_obj_neta||4.5);
    const sel=document.getElementById('assign_cli');
    const selectedIdx = sel && sel.value ? parseInt(sel.value,10) : -1;
    const cli = (selectedIdx>=0)? (Store.pros[selectedIdx]||null) : null;
    if(cli){ objTipo=cli.obj_tipo; objValor=cli.obj_raw; }

    const pmax = precioMaximo({alqA,gastos,notaria,reforma,honor,itp_pct:(Store.cfg.c_itp||8)/100,objTipo,objValor});
    document.getElementById('e_pmax').value = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(Math.round(pmax));

    document.getElementById('e_result').hidden=false;
    document.getElementById('r_inv').textContent=e0(inversion);
    document.getElementById('r_bruta').textContent=fmtN1.format(bruta)+' %';
    document.getElementById('r_neta').textContent=fmtN1.format(neta)+' %';
    document.getElementById('r_flujo').textContent=e0(flujo);
    document.getElementById('r_pmax').textContent=e0(pmax);

    const dB=bruta-(Store.cfg.c_obj_bruta||6), dN=neta-(Store.cfg.c_obj_neta||4.5);
    const sgn=v=> (v>=0?'+':'')+fmtN1.format(v).replace('.',',')+' pp';
    document.getElementById('r_bruta_diff').textContent='('+sgn(dB)+')';
    document.getElementById('r_neta_diff').textContent='('+sgn(dN)+')';

    const score=(val,obj)=>{const diff=val-obj; const pct=obj?diff/obj*100:0; return pct>=0?'green':(pct<-5?'red':'amber')};
    document.getElementById('sb').className='dot '+score(bruta,Store.cfg.c_obj_bruta||6);
    document.getElementById('sn').className='dot '+score(neta,Store.cfg.c_obj_neta||4.5);
    document.getElementById('sf').className='dot '+score(flujo,(Store.cfg.c_obj_flujo||150)*12);

    const goal = (objTipo==='bruta')?(Store.cfg.c_obj_bruta||6):(objTipo==='neta')?(Store.cfg.c_obj_neta||4.5):((Store.cfg.c_obj_flujo||150));
    const real = (objTipo==='bruta')?bruta:(objTipo==='neta')?neta:(flujo/12);
    renderBars('chartKPI',[{label:'Real', v:Math.max(0,real), color:'#ff6600'},{label:'Obj', v:Math.max(0,goal), color:'#9ca3af'}]);

    // candidatos
    const tipoAlq=document.getElementById('e_tipo').value; const loc=(document.getElementById('e_loc').value||'').toLowerCase();
    const candidatos=(Store.pros||[]).filter(p=>((p.sub||'').toLowerCase().includes('contrat'))||(['F2','F3','F4','F5'].includes(p.fase))).filter(p=>{
      const locs=String(p.locs_text||'').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean); return locs.length===0 || locs.includes(loc);
    }).filter(p=> (p.pref_tipo||'Tradicional')===tipoAlq);
    const matchBox=document.getElementById('matchList');
    const selAssign=document.getElementById('assign_cli');
    selAssign.innerHTML='';
    if(!candidatos.length){ matchBox.textContent='Sin clientes potenciales'; }
    else{
      matchBox.textContent=candidatos.map(p=>`• ${p.nombre} (${p.email||'—'})`).join('\n');
      candidatos.forEach((p)=>{ const idx=Store.pros.indexOf(p); const o=document.createElement('option'); o.value=idx; o.textContent=p.nombre; selAssign.appendChild(o); });
    }

    fillClientMirror(cli, bruta, neta, flujo);

    const url=document.getElementById('e_url').value.trim();
    const data={
      ts:Date.now(),
      ref:`${loc} - ${(document.getElementById('e_calle').value||'').trim()}`,
      loc, calle:(document.getElementById('e_calle').value||'').trim(), url,
      m2:(document.getElementById('e_m2').value||'').trim(), anio:(document.getElementById('e_anio').value||'').trim(),
      asc:document.getElementById('e_asc').value, alt:document.getElementById('e_alt').value, bajo:document.getElementById('e_bajo').value,
      habs:document.getElementById('e_habs').value, banos:document.getElementById('e_banos').value,
      tipo:tipoAlq, precio:parseEs(document.getElementById('e_precio').value)||0,
      itp:e_itp, notaria:parseEs(document.getElementById('e_notaria').value)||0, reforma:parseEs(document.getElementById('e_reforma').value)||0,
      honor:inclHonor?3500*1.21:0, comunidad:parseEs(document.getElementById('e_comunidad').value)||0,
      ibi:parseEs(document.getElementById('e_ibi').value)||0, hogar:parseEs(document.getElementById('e_hogar').value)||0,
      impago:parseEs(document.getElementById('e_impago').value)||0, gestion:parseEs(document.getElementById('e_gestion').value)||0,
      alq_m:parseEs(document.getElementById('e_alq').value)||0, otros_m:parseEs(document.getElementById('e_otros').value)||0,
      alq_a:alqA, inversion, gastos, bruta, neta, flujo, pmax
    };
    window.__calc__=data;
  };

  document.getElementById('assign_cli')?.addEventListener('change', ()=>{
    if(!window.__calc__) return;
    const idx=parseInt(document.getElementById('assign_cli').value||'-1',10);
    const cli=(idx>=0)?(Store.pros[idx]||null):null;
    fillClientMirror(cli, window.__calc__.bruta, window.__calc__.neta, window.__calc__.flujo);
  });

  document.getElementById('e_clean').onclick=()=>location.reload();

  function saveEval(payload, assignedIdx=null){
    const evals=Store.evals;
    const rec={...payload, id:`EV-${Date.now()}`, assigned:(assignedIdx!=null?[assignedIdx]:[]) };
    evals.unshift(rec); Store.evals=evals;
    alert('Evaluación guardada');
  }
  document.getElementById('save_only').onclick=()=>{ if(!window.__calc__) return alert('Calcula primero.'); saveEval(window.__calc__, null); };
  document.getElementById('save_assign').onclick=()=>{
    if(!window.__calc__) return alert('Calcula primero.');
    const idx=parseInt(document.getElementById('assign_cli').value||'-1',10);
    saveEval(window.__calc__, (idx>=0?idx:null));
    if(idx>=0){ const arr=Store.pros; const cli=arr[idx]; cli.activos=cli.activos||[]; cli.activos.push({ref:window.__calc__.ref,url:window.__calc__.url}); Store.pros=arr; }
  };
});
