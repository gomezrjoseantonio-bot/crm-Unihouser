document.addEventListener('DOMContentLoaded', ()=>{
  const body=document.getElementById('ev_body');
  function render(){
    body.innerHTML='';
    const arr=Store.evals||[];
    arr.forEach((ev, i)=>{
      const tr=document.createElement('tr');
      const cli = (ev.assigned && ev.assigned.length && Store.pros[ev.assigned[0]]) ? Store.pros[ev.assigned[0]].nombre : '—';
      tr.innerHTML=`<td>${ev.ref||'—'}</td><td>${(ev.loc||'—').toUpperCase()}</td>
        <td>${(ev.bruta||0).toFixed(1)} %</td><td>${(ev.neta||0).toFixed(1)} %</td><td>${new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(ev.flujo||0)}</td>
        <td>${cli}</td>
        <td><button class="btn ghost" data-i="${i}">Cargar en Evaluar</button></td>`;
      tr.querySelector('button').onclick=()=>{
        localStorage.setItem('__load_eval__', JSON.stringify(ev));
        location.href='evaluar.html';
      };
      body.appendChild(tr);
    });
  }
  document.getElementById('ev_clear').onclick=()=>{ if(confirm('¿Borrar todas las evaluaciones?')){ Store.evals=[]; render(); } };
  render();
});
