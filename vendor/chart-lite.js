window.renderBars = function(canvasId, series){
  const c = document.getElementById(canvasId); if(!c) return;
  const ctx = c.getContext('2d'); const w=c.width=420, h=c.height=200;
  ctx.clearRect(0,0,w,h); const max=Math.max(1, ...series.map(s=>s.v));
  const bw = Math.floor((w-60)/series.length)-12; let x=40;
  series.forEach(s=>{
    const bar = Math.round((s.v/max)*(h-50));
    ctx.fillStyle=s.color||'#ff6600';
    ctx.fillRect(x, h-30-bar, bw, bar); x+=bw+16;
  });
  ctx.fillStyle='#475569'; ctx.font='12px system-ui'; x=40;
  series.forEach(s=>{ ctx.fillText(s.label||'', x, h-12); x+=bw+16; });
};
