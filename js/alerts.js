// js/alerts.js — Sistema de alertas automáticas
(function(){
"use strict";

const Store = {
  get cfg(){ try{return JSON.parse(localStorage.getItem('cfg')||'{}')}catch(_){return{}} },
  get evals(){ try{return JSON.parse(localStorage.getItem('evals')||'[]')}catch(_){return[]} },
  get alerts(){ try{return JSON.parse(localStorage.getItem('alerts')||'[]')}catch(_){return[]} },
  set alerts(v){ localStorage.setItem('alerts', JSON.stringify(v)); }
};

// Alert types
const ALERT_TYPES = {
  LOW_ACTIVITY: 'low_activity',
  HIGH_VALUE: 'high_value', 
  POOR_METRICS: 'poor_metrics',
  BUDGET_EXCEEDED: 'budget_exceeded'
};

// Check for alerts
function checkAlerts(){
  const cfg = Store.cfg;
  const alerts = cfg.alertas || {};
  
  if(!alerts) return;
  
  const newAlerts = [];
  
  // Check activity
  if(alerts.actividad_baja){
    const activityAlert = checkActivityAlert();
    if(activityAlert) newAlerts.push(activityAlert);
  }
  
  // Check high value properties
  if(alerts.alto_valor){
    const highValueAlerts = checkHighValueAlerts();
    newAlerts.push(...highValueAlerts);
  }
  
  // Check poor metrics
  if(alerts.metricas_pobres){
    const poorMetricsAlerts = checkPoorMetricsAlerts();
    newAlerts.push(...poorMetricsAlerts);
  }
  
  // Check budget
  const budgetAlerts = checkBudgetAlerts();
  newAlerts.push(...budgetAlerts);
  
  // Store new alerts
  if(newAlerts.length > 0){
    const existing = Store.alerts;
    const updated = [...existing, ...newAlerts];
    Store.alerts = updated;
    
    // Show notifications
    newAlerts.forEach(showAlert);
  }
}

function checkActivityAlert(){
  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const recentEvals = Store.evals.filter(e => {
    const date = new Date(e.ts || e.id?.slice(3)).getTime();
    return date > weekAgo;
  });
  
  const cfg = Store.cfg;
  const targetWeekly = Math.ceil((cfg.presupuestos?.evals_mes || 20) / 4);
  
  if(recentEvals.length < targetWeekly * 0.5){
    return {
      id: 'activity_' + Date.now(),
      type: ALERT_TYPES.LOW_ACTIVITY,
      title: 'Actividad baja detectada',
      message: `Solo ${recentEvals.length} evaluaciones esta semana (objetivo: ${targetWeekly})`,
      timestamp: Date.now(),
      level: 'warning'
    };
  }
  
  return null;
}

function checkHighValueAlerts(){
  const cfg = Store.cfg;
  const threshold = cfg.alertas?.alto_valor_monto || 400000;
  const alerts = [];
  
  const recentHighValue = Store.evals.filter(e => {
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const date = new Date(e.ts || e.id?.slice(3)).getTime();
    return date > dayAgo && (e.precio || 0) > threshold;
  });
  
  recentHighValue.forEach(eval => {
    alerts.push({
      id: 'highvalue_' + eval.id,
      type: ALERT_TYPES.HIGH_VALUE,
      title: 'Propiedad de alto valor',
      message: `${eval.loc || ''} ${eval.calle || ''} - €${eval.precio?.toLocaleString('es-ES')}`,
      timestamp: Date.now(),
      level: 'info',
      evalId: eval.id
    });
  });
  
  return alerts;
}

function checkPoorMetricsAlerts(){
  const cfg = Store.cfg;
  const minRent = cfg.alertas?.rentabilidad_minima || 6;
  const alerts = [];
  
  const recentPoor = Store.evals.filter(e => {
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const date = new Date(e.ts || e.id?.slice(3)).getTime();
    return date > dayAgo && (e.kpi_bruta || 0) < minRent;
  });
  
  recentPoor.forEach(eval => {
    alerts.push({
      id: 'poormetrics_' + eval.id,
      type: ALERT_TYPES.POOR_METRICS,
      title: 'Rentabilidad por debajo del objetivo',
      message: `${eval.loc || ''} ${eval.calle || ''} - ${(eval.kpi_bruta || 0).toFixed(1)}% (objetivo: ${minRent}%)`,
      timestamp: Date.now(),
      level: 'warning',
      evalId: eval.id
    });
  });
  
  return alerts;
}

function checkBudgetAlerts(){
  const cfg = Store.cfg;
  const budgets = cfg.presupuestos || {};
  const alerts = [];
  
  // Check monthly budget
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  const monthlyEvals = Store.evals.filter(e => {
    const date = new Date(e.ts || e.id?.slice(3));
    return date >= monthStart;
  });
  
  // Evaluations budget
  if(budgets.evals_mes && monthlyEvals.length > budgets.evals_mes * 1.1){
    alerts.push({
      id: 'budget_evals_' + Date.now(),
      type: ALERT_TYPES.BUDGET_EXCEEDED,
      title: 'Presupuesto de evaluaciones superado',
      message: `${monthlyEvals.length} evaluaciones este mes (presupuesto: ${budgets.evals_mes})`,
      timestamp: Date.now(),
      level: 'info'
    });
  }
  
  // Investment budget
  if(budgets.inversion_mes){
    const totalInv = monthlyEvals.reduce((sum, e) => sum + (e.inv_total || 0), 0);
    if(totalInv > budgets.inversion_mes * 1.1){
      alerts.push({
        id: 'budget_inv_' + Date.now(),
        type: ALERT_TYPES.BUDGET_EXCEEDED,
        title: 'Presupuesto de inversión superado',
        message: `€${Math.round(totalInv).toLocaleString('es-ES')} este mes (presupuesto: €${budgets.inversion_mes.toLocaleString('es-ES')})`,
        timestamp: Date.now(),
        level: 'info'
      });
    }
  }
  
  return alerts;
}

function showAlert(alert){
  // Browser notification
  if('Notification' in window && Notification.permission === 'granted'){
    const notification = new Notification(alert.title, {
      body: alert.message,
      icon: '/logo-unihouser.svg',
      tag: alert.id
    });
    
    notification.onclick = function(){
      window.focus();
      if(alert.evalId){
        localStorage.setItem('load_eval', alert.evalId);
        window.location.href = 'evaluar.html';
      }
    };
  }
  
  // In-app toast
  showToast(alert.title, alert.level);
}

function showToast(message, level = 'info'){
  const toast = document.createElement('div');
  toast.className = 'alert-toast alert-' + level;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${level === 'warning' ? '#f59e0b' : level === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    max-width: 300px;
    font-size: 14px;
    cursor: pointer;
  `;
  
  document.body.appendChild(toast);
  
  toast.onclick = function(){
    toast.remove();
  };
  
  setTimeout(() => {
    if(toast.parentNode) toast.remove();
  }, 5000);
}

// Get current alerts for display
function getCurrentAlerts(){
  const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
  return Store.alerts.filter(a => a.timestamp > dayAgo);
}

// Mark alert as read
function markAlertRead(alertId){
  const alerts = Store.alerts;
  const alert = alerts.find(a => a.id === alertId);
  if(alert){
    alert.read = true;
    Store.alerts = alerts;
  }
}

// Clear old alerts (older than 7 days)
function clearOldAlerts(){
  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const alerts = Store.alerts.filter(a => a.timestamp > weekAgo);
  Store.alerts = alerts;
}

// Initialize alerts system
function initAlerts(){
  // Check alerts every 30 minutes
  setInterval(checkAlerts, 30 * 60 * 1000);
  
  // Check alerts on page load
  setTimeout(checkAlerts, 2000);
  
  // Clean old alerts daily
  setInterval(clearOldAlerts, 24 * 60 * 60 * 1000);
  clearOldAlerts();
  
  // Daily summary notification
  const cfg = Store.cfg;
  if(cfg.notificaciones?.resumen_diario){
    scheduleDailySummary();
  }
}

function scheduleDailySummary(){
  const cfg = Store.cfg;
  const time = cfg.notificaciones?.hora_resumen || '09:00';
  const [hours, minutes] = time.split(':').map(Number);
  
  const now = new Date();
  const scheduled = new Date();
  scheduled.setHours(hours, minutes, 0, 0);
  
  // If time has passed today, schedule for tomorrow
  if(scheduled <= now){
    scheduled.setDate(scheduled.getDate() + 1);
  }
  
  const delay = scheduled.getTime() - now.getTime();
  
  setTimeout(() => {
    sendDailySummary();
    // Schedule next day
    setInterval(sendDailySummary, 24 * 60 * 60 * 1000);
  }, delay);
}

function sendDailySummary(){
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterdayEvals = Store.evals.filter(e => {
    const date = new Date(e.ts || e.id?.slice(3));
    return date >= yesterday && date < today;
  });
  
  if('Notification' in window && Notification.permission === 'granted'){
    const message = yesterdayEvals.length > 0 
      ? `${yesterdayEvals.length} evaluaciones realizadas ayer`
      : 'Sin evaluaciones realizadas ayer';
      
    new Notification('Resumen diario', {
      body: message,
      icon: '/logo-unihouser.svg'
    });
  }
}

// Export functions
window.AlertsSystem = {
  init: initAlerts,
  check: checkAlerts,
  getCurrent: getCurrentAlerts,
  markRead: markAlertRead,
  show: showToast
};

// Auto-initialize if DOM is ready
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initAlerts);
} else {
  initAlerts();
}

})();