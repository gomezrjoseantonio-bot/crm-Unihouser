document.addEventListener('DOMContentLoaded', ()=>{
  setupMoneyFormatting(); setupMoneyLive();
  const body=document.getElementById('p_body');
  function render(){
    body.innerHTML='';
    (Store.pros||[]).forEach((p,idx)=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${p.nombre||'—'}</td><td>${p.email||'—'}</td><td>${p.tel||'—'}</td>
      <td>${(p.obj_tipo||'bruta').toUpperCase()}</td><td>${p.pref_tipo||'—'}</td><td>${p.locs_text||'—'}</td>
      <td><button class="del">Eliminar</button></td>`;
      tr.querySelector('.del').onclick=()=>{ const arr=Store.pros; arr.splice(idx,1); Store.pros=arr; render(); };
      body.appendChild(tr);
    });
  }
  document.getElementById('p_add').onclick=()=>{
    const tipo=document.getElementById('p_obj_tipo').value;
    const raw=parseEs(document.getElementById('p_obj_val').value)||6;
    const entry={
      nombre:document.getElementById('p_nombre').value.trim(), email:document.getElementById('p_email').value.trim(), tel:document.getElementById('p_tel').value.trim(),
      loc_res:document.getElementById('p_loc_res').value.trim(), locs_text:document.getElementById('p_locs_obj').value.trim(),
      budget:parseEs(document.getElementById('p_budget').value)||0, pref_tipo:document.getElementById('p_pref_tipo').value,
      obj_tipo:tipo, obj_raw:raw, obj_label:(tipo==='flujo'?fmtN0.format(raw)+' €':fmtN1.format(raw)+' %'),
      fase:'F2', sub:'Contratado', activos:[]
    };
    const arr=Store.pros; arr.unshift(entry); Store.pros=arr; render();
  };
  document.getElementById('p_clear')?.addEventListener('click', ()=>{['p_nombre','p_email','p_tel','p_loc_res','p_locs_obj','p_budget','p_obj_val'].forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});});
  render();
});
