// Notificaciones mejoradas para Unihouser CRM
(function(){
"use strict";

// Sistema de notificaciones global
window.UNotify = {
  show: function(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `unotify unotify-${type}`;
    
    // Icono según el tipo
    const icons = {
      success: '✅',
      error: '❌', 
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    toast.innerHTML = `
      <div class="unotify-content">
        <span class="unotify-icon">${icons[type] || icons.info}</span>
        <span class="unotify-message">${message}</span>
        <button class="unotify-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    // Estilos inline para garantizar funcionamiento
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 280px;
      max-width: 400px;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
    `;
    
    // Estilos del contenido
    const content = toast.querySelector('.unotify-content');
    content.style.cssText = `
      display: flex;
      align-items: center;
      padding: 12px 16px;
      gap: 8px;
    `;
    
    // Estilos del mensaje
    const messageEl = toast.querySelector('.unotify-message');
    messageEl.style.cssText = `
      flex: 1;
      line-height: 1.4;
    `;
    
    // Estilos del botón cerrar
    const closeBtn = toast.querySelector('.unotify-close');
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.5;
    `;
    
    // Colores según tipo
    const colors = {
      success: { bg: '#f0f9ff', border: '#0ea5e9', text: '#0c4a6e' },
      error: { bg: '#fef2f2', border: '#ef4444', text: '#7f1d1d' },
      warning: { bg: '#fffbeb', border: '#f59e0b', text: '#78350f' },
      info: { bg: '#f8fafc', border: '#64748b', text: '#334155' }
    };
    
    const color = colors[type] || colors.info;
    toast.style.backgroundColor = color.bg;
    toast.style.borderColor = color.border;
    toast.style.color = color.text;
    
    // Agregar al DOM
    document.body.appendChild(toast);
    
    // Crear contenedor si no existe
    if (!document.querySelector('.unotify-container')) {
      const container = document.createElement('div');
      container.className = 'unotify-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }
    
    // Animar entrada
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    });
    
    // Auto-eliminar
    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentNode) {
          toast.style.opacity = '0';
          toast.style.transform = 'translateX(100%)';
          setTimeout(() => {
            if (toast.parentNode) {
              toast.parentNode.removeChild(toast);
            }
          }, 300);
        }
      }, duration);
    }
    
    return toast;
  },
  
  success: function(message, duration) {
    return this.show(message, 'success', duration);
  },
  
  error: function(message, duration) {
    return this.show(message, 'error', duration);
  },
  
  warning: function(message, duration) {
    return this.show(message, 'warning', duration);
  },
  
  info: function(message, duration) {
    return this.show(message, 'info', duration);
  }
};

// Interceptar errores globales
window.addEventListener('error', function(e) {
  if (window.UNotify) {
    UNotify.error('Error en la aplicación. Por favor, recarga la página.');
  }
});

// Detectar conexión de red
if (navigator.onLine !== undefined) {
  window.addEventListener('online', () => {
    UNotify.success('Conexión restaurada');
  });
  
  window.addEventListener('offline', () => {
    UNotify.warning('Sin conexión a internet. Trabajando en modo offline.', 0);
  });
}

})();