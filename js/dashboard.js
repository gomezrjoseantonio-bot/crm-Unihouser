document.addEventListener('DOMContentLoaded', ()=>{
  const body=document.getElementById('d_body');
  function render(){
    body.innerHTML='';
    (Store.pros||[]).forEach((p)=>{
      const link = (p.activos && p.activos[0] && p.activos[0].url) ? `<a href="${p.activos[0].url}" target="_blank" rel="noopener">🔗</a>` : '';
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${p.nombre||'—'}</td><td>${p.email||'—'}</td><td>${p.tel||'—'}</td><td>${p.fase||'F2'}</td><td>${link}</td>`;
      body.appendChild(tr);
    });
  }
  render();
});
