// js/chart-enhanced.js — Enhanced charting with multiple types and interactivity
(function(){
  var activeChart = null;
  var tooltipDiv = null;

  function dpi(c){
    var dpr = window.devicePixelRatio||1;
    c.width = c.clientWidth*dpr; c.height = c.clientHeight*dpr;
    var ctx=c.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); return ctx;
  }

  function createTooltip(){
    if(tooltipDiv) return tooltipDiv;
    tooltipDiv = document.createElement('div');
    tooltipDiv.style.cssText = 'position:absolute;background:#333;color:#fff;padding:4px 8px;border-radius:4px;font-size:11px;pointer-events:none;z-index:1000;display:none;';
    document.body.appendChild(tooltipDiv);
    return tooltipDiv;
  }

  function showTooltip(e, text){
    var tooltip = createTooltip();
    tooltip.textContent = text;
    tooltip.style.display = 'block';
    tooltip.style.left = (e.pageX + 10) + 'px';
    tooltip.style.top = (e.pageY - 30) + 'px';
  }

  function hideTooltip(){
    if(tooltipDiv) tooltipDiv.style.display = 'none';
  }

  function bars(canvas, opts){
    var c = (typeof canvas==='string')? document.getElementById(canvas): canvas;
    if(!c) return; var ctx = dpi(c);
    var W = c.clientWidth, H = c.clientHeight;
    ctx.clearRect(0,0,W,H);
    var labels = opts.labels||[]; var values = opts.values||[]; var target = opts.target;
    var colors = opts.colors || ['#ff5a1f', '#2563eb', '#16a34a', '#dc2626', '#ca8a04'];
    var pad = 20, baseY = H - 40;
    var max = Math.max(10, (values.length?Math.max.apply(null,values):0), (typeof target==='number'?target:0));
    var barW = Math.max(26, (W - pad*2) / (values.length*1.7));
    var gap  = barW * 0.6;
    var hitAreas = [];

    // eje X
    ctx.strokeStyle = '#2a3238'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, baseY); ctx.lineTo(W-pad, baseY); ctx.stroke();

    // barras
    for(var i=0;i<values.length;i++){
      var x = pad + i*(barW+gap);
      var h = (values[i]/max) * (baseY - 20);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(x, baseY - h, barW, h);
      
      // Store hit area for interactivity
      hitAreas.push({
        x: x, y: baseY - h, w: barW, h: h,
        label: labels[i], value: values[i]
      });
      
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

    // Add mouse events for interactivity
    c.onmousemove = function(e){
      var rect = c.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      
      var hit = hitAreas.find(function(area){
        return x >= area.x && x <= area.x + area.w && y >= area.y && y <= area.y + area.h;
      });
      
      if(hit){
        c.style.cursor = 'pointer';
        showTooltip(e, hit.label + ': ' + hit.value.toFixed(1));
      } else {
        c.style.cursor = 'default';
        hideTooltip();
      }
    };
    
    c.onmouseleave = function(){
      hideTooltip();
    };
  }

  function pie(canvas, opts){
    var c = (typeof canvas==='string')? document.getElementById(canvas): canvas;
    if(!c) return; var ctx = dpi(c);
    var W = c.clientWidth, H = c.clientHeight;
    ctx.clearRect(0,0,W,H);
    
    var data = opts.data || [];
    var labels = opts.labels || [];
    var colors = opts.colors || ['#ff5a1f', '#2563eb', '#16a34a', '#dc2626', '#ca8a04', '#7c3aed', '#0891b2'];
    
    var total = data.reduce(function(sum, val){ return sum + val; }, 0);
    if(total === 0) return;
    
    var centerX = W / 2, centerY = H / 2;
    var radius = Math.min(W, H) / 2 - 30;
    var startAngle = -Math.PI / 2;
    
    data.forEach(function(value, i){
      var sliceAngle = (value / total) * 2 * Math.PI;
      
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fill();
      
      // Add label
      var labelAngle = startAngle + sliceAngle / 2;
      var labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
      var labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
      
      ctx.fillStyle = '#fff';
      ctx.font = '12px Inter, system-ui, Arial';
      ctx.textAlign = 'center';
      ctx.fillText(Math.round((value/total)*100) + '%', labelX, labelY);
      
      startAngle += sliceAngle;
    });
    
    // Legend
    var legendY = 20;
    labels.forEach(function(label, i){
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(20, legendY, 12, 12);
      ctx.fillStyle = '#333';
      ctx.textAlign = 'left';
      ctx.fillText(label, 40, legendY + 9);
      legendY += 18;
    });
  }

  function line(canvas, opts){
    var c = (typeof canvas==='string')? document.getElementById(canvas): canvas;
    if(!c) return; var ctx = dpi(c);
    var W = c.clientWidth, H = c.clientHeight;
    ctx.clearRect(0,0,W,H);
    
    var data = opts.data || [];
    var labels = opts.labels || [];
    var color = opts.color || '#2563eb';
    var pad = 30;
    
    if(data.length < 2) return;
    
    var max = Math.max.apply(null, data);
    var min = Math.min.apply(null, data);
    var range = max - min || 1;
    
    // Draw axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad, H - pad);
    ctx.lineTo(W - pad, H - pad);
    ctx.stroke();
    
    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach(function(value, i){
      var x = pad + (i / (data.length - 1)) * (W - 2 * pad);
      var y = H - pad - ((value - min) / range) * (H - 2 * pad);
      
      if(i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = color;
    data.forEach(function(value, i){
      var x = pad + (i / (data.length - 1)) * (W - 2 * pad);
      var y = H - pad - ((value - min) / range) * (H - 2 * pad);
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  function exportChart(canvas, filename){
    var c = (typeof canvas==='string')? document.getElementById(canvas): canvas;
    if(!c) return;
    
    var link = document.createElement('a');
    link.download = filename || 'chart.png';
    link.href = c.toDataURL();
    link.click();
  }

  // Enhanced SimpleChart with backward compatibility
  window.SimpleChart = { 
    bars: bars, 
    pie: pie, 
    line: line,
    export: exportChart
  };
})();