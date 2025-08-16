// js/chart-safe.js — barras sin eval / sin dependencias
(function(){
  function dpi(c){
    var dpr = window.devicePixelRatio||1;
    c.width = c.clientWidth*dpr; c.height = c.clientHeight*dpr;
    var ctx=c.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); return ctx;
  }
  function bars(canvas, opts){
    var c = (typeof canvas==='string')? document.getElementById(canvas): canvas;
    if(!c) return; var ctx = dpi(c);
    var W = c.clientWidth, H = c.clientHeight;
    ctx.clearRect(0,0,W,H);
    var labels = opts.labels||[]; var values = opts.values||[]; var target = opts.target;
    var pad = 20, baseY = H - 40;
    var max = Math.max(10, (values.length?Math.max.apply(null,values):0), (typeof target==='number'?target:0));
    var barW = Math.max(26, (W - pad*2) / (values.length*1.7));
    var gap  = barW * 0.6;

    // eje X
    ctx.strokeStyle = '#2a3238'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, baseY); ctx.lineTo(W-pad, baseY); ctx.stroke();

    // barras
    for(var i=0;i<values.length;i++){
      var x = pad + i*(barW+gap);
      var h = (values[i]/max) * (baseY - 20);
      ctx.fillStyle = '#ff5a1f';
      ctx.fillRect(x, baseY - h, barW, h);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '12px Inter, system-ui, Arial';
      ctx.fillText(labels[i]||'', x, baseY+16);
    }

    // línea objetivo
    if(typeof target==='number'){
      var y = baseY - (target/max) * (baseY - 20);
      ctx.strokeStyle = '#9aa5af'; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W-pad, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#9aa5af'; ctx.font = '12px Inter, system-ui, Arial';
      ctx.fillText('Objetivo', W - pad - 60, y - 6);
    }
  }
  window.SimpleChart = { bars: bars };
})();
