(function(){
"use strict";

/* ====== Store y utilidades ====== */
const $ = id => document.getElementById(id);

let properties = [];
let evaluationResults = [];
let filteredResults = [];

/* ====== Configuración por defecto ====== */
const DEFAULT_CONFIG = {
  itp_pct: 8,
  notaria_eur: 1500,
  psi_eur: 4235,
  hogar_pct: 3,
  impago_trad_pct: 5,
  impago_hab_pct: 7,
  gestion_trad_pct: 5,
  gestion_hab_pct: 10,
  objetivo_bruta_trad_pct: 10,
  objetivo_bruta_hab_pct: 12
};

/* ====== Inicialización ====== */
document.addEventListener('DOMContentLoaded', () => {
  loadProperties();
  loadDefaultParams();
});

/* ====== Cargar propiedades de localStorage ====== */
function loadProperties() {
  try {
    const storedProps = localStorage.getItem('bulk_evaluation_properties');
    if (storedProps) {
      properties = JSON.parse(storedProps);
      console.log('Propiedades cargadas:', properties.length);
    }
    
    if (properties.length === 0) {
      showEmptyState();
    } else {
      hideEmptyState();
    }
  } catch (error) {
    console.error('Error cargando propiedades:', error);
    showEmptyState();
  }
}

/* ====== Mostrar/ocultar estado vacío ====== */
function showEmptyState() {
  const emptyState = $('empty_state');
  if (emptyState) emptyState.style.display = 'block';
}

function hideEmptyState() {
  const emptyState = $('empty_state');
  if (emptyState) emptyState.style.display = 'none';
}

/* ====== Cargar parámetros por defecto ====== */
window.loadDefaultParams = function() {
  try {
    const cfg = JSON.parse(localStorage.getItem('cfg') || '{}');
    const config = {...DEFAULT_CONFIG, ...cfg};
    
    // Cargar valores en los campos
    if ($('global_itp')) $('global_itp').value = config.itp_pct || 8;
    if ($('global_notaria')) $('global_notaria').value = config.notaria_eur || 1500;
    if ($('global_reforma')) $('global_reforma').value = 0;
    if ($('global_psi')) $('global_psi').value = 'no';
    if ($('global_comunidad')) $('global_comunidad').value = 600;
    if ($('global_ibi')) $('global_ibi').value = 400;
    if ($('global_tipo')) $('global_tipo').value = 'tradicional';
    if ($('global_alq_m2')) $('global_alq_m2').value = 8;
    
    showToast('Parámetros cargados correctamente', 'success');
  } catch (error) {
    console.error('Error cargando parámetros:', error);
    showToast('Error al cargar parámetros', 'error');
  }
};

/* ====== Iniciar evaluación masiva ====== */
window.startBulkEvaluation = async function() {
  if (properties.length === 0) {
    showToast('No hay propiedades para evaluar', 'error');
    return;
  }
  
  // Recoger parámetros globales
  const globalParams = {
    itp_pct: parseFloat($('global_itp')?.value) || 8,
    notaria_eur: parseFloat($('global_notaria')?.value) || 1500,
    reforma_eur: parseFloat($('global_reforma')?.value) || 0,
    psi: $('global_psi')?.value === 'si',
    comunidad_anual: parseFloat($('global_comunidad')?.value) || 600,
    ibi_anual: parseFloat($('global_ibi')?.value) || 400,
    tipo: $('global_tipo')?.value || 'tradicional',
    alq_m2_mes: parseFloat($('global_alq_m2')?.value) || 8
  };
  
  // Mostrar progress
  showProgressSection();
  hideResultsSection();
  
  evaluationResults = [];
  
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    
    // Actualizar progress
    updateProgress(i, properties.length, `Evaluando: ${property.title}`);
    
    try {
      // Simular tiempo de evaluación
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Evaluar propiedad
      const result = evaluateProperty(property, globalParams);
      evaluationResults.push(result);
      
    } catch (error) {
      console.error('Error evaluando propiedad:', property.id, error);
      evaluationResults.push({
        ...property,
        status: 'error',
        error: error.message
      });
    }
  }
  
  // Completar evaluación
  updateProgress(properties.length, properties.length, 'Evaluación completada');
  setTimeout(() => {
    hideProgressSection();
    showResultsSection();
    updateStatistics();
    filterResults();
  }, 500);
  
  showToast(`Evaluación completada: ${evaluationResults.length} propiedades`, 'success');
};

/* ====== Evaluar una propiedad individual ====== */
function evaluateProperty(property, globalParams) {
  try {
    const cfg = {...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem('cfg') || '{}')};
    
    // Datos base
    const precio = property.price;
    const m2 = property.size;
    const alquiler_mes = m2 * globalParams.alq_m2_mes;
    
    // Gastos de adquisición
    const itp_eur = precio * (globalParams.itp_pct / 100);
    const notaria = globalParams.notaria_eur;
    const reforma = globalParams.reforma_eur;
    const psi = globalParams.psi ? cfg.psi_eur : 0;
    
    const total_adquisicion = precio + itp_eur + notaria + reforma + psi;
    
    // Gastos anuales
    const comunidad = globalParams.comunidad_anual;
    const ibi = globalParams.ibi_anual;
    const hogar = alquiler_mes * 12 * (cfg.hogar_pct / 100);
    
    const tipo = globalParams.tipo;
    const impago_pct = tipo === 'habitaciones' ? cfg.impago_hab_pct : cfg.impago_trad_pct;
    const gestion_pct = tipo === 'habitaciones' ? cfg.gestion_hab_pct : cfg.gestion_trad_pct;
    
    const impago = alquiler_mes * 12 * (impago_pct / 100);
    const gestion = alquiler_mes * 12 * (gestion_pct / 100);
    
    const total_gastos_anuales = comunidad + ibi + hogar + impago + gestion;
    
    // Ingresos y rentabilidades
    const ingresos_anuales = alquiler_mes * 12;
    const beneficio_neto_anual = ingresos_anuales - total_gastos_anuales;
    const flujo_mensual = beneficio_neto_anual / 12;
    
    // ROI
    const roi_bruto = (ingresos_anuales / total_adquisicion) * 100;
    const roi_neto = (beneficio_neto_anual / total_adquisicion) * 100;
    
    // Clasificación
    const objetivo_bruta = tipo === 'habitaciones' ? cfg.objetivo_bruta_hab_pct : cfg.objetivo_bruta_trad_pct;
    const clasificacion = roi_bruto >= objetivo_bruta ? 'good' : 
                         roi_bruto >= objetivo_bruta * 0.8 ? 'warning' : 'bad';
    
    return {
      ...property,
      status: 'completed',
      evaluation: {
        total_adquisicion,
        alquiler_mes,
        ingresos_anuales,
        total_gastos_anuales,
        beneficio_neto_anual,
        flujo_mensual,
        roi_bruto,
        roi_neto,
        clasificacion,
        precio_m2: precio / m2
      }
    };
    
  } catch (error) {
    throw new Error(`Error en cálculos: ${error.message}`);
  }
}

/* ====== Mostrar/ocultar secciones ====== */
function showProgressSection() {
  const section = $('progress_section');
  if (section) section.style.display = 'block';
}

function hideProgressSection() {
  const section = $('progress_section');
  if (section) section.style.display = 'none';
}

function showResultsSection() {
  const section = $('results_section');
  const controls = $('table_controls');
  const stats = $('stats_section');
  const exportBtn = $('export_btn');
  
  if (section) section.style.display = 'block';
  if (controls) controls.style.display = 'block';
  if (stats) stats.style.display = 'block';
  if (exportBtn) exportBtn.style.display = 'inline-block';
}

function hideResultsSection() {
  const section = $('results_section');
  const controls = $('table_controls');
  const stats = $('stats_section');
  
  if (section) section.style.display = 'none';
  if (controls) controls.style.display = 'none';
  if (stats) stats.style.display = 'none';
}

/* ====== Actualizar barra de progreso ====== */
function updateProgress(current, total, text) {
  const progressBar = $('progress_bar');
  const progressText = $('progress_text');
  
  const percentage = Math.round((current / total) * 100);
  
  if (progressBar) {
    progressBar.style.width = `${percentage}%`;
    progressBar.textContent = `${percentage}%`;
  }
  
  if (progressText) {
    progressText.textContent = text;
  }
}

/* ====== Actualizar estadísticas ====== */
function updateStatistics() {
  const completed = evaluationResults.filter(r => r.status === 'completed');
  const good = completed.filter(r => r.evaluation?.clasificacion === 'good');
  
  if ($('stat_total')) $('stat_total').textContent = completed.length;
  if ($('stat_good')) $('stat_good').textContent = good.length;
  
  if (completed.length > 0) {
    const avgRoi = completed.reduce((sum, r) => sum + (r.evaluation?.roi_bruto || 0), 0) / completed.length;
    const avgPrice = completed.reduce((sum, r) => sum + r.price, 0) / completed.length;
    const bestRoi = Math.max(...completed.map(r => r.evaluation?.roi_bruto || 0));
    
    if ($('stat_avg_roi')) $('stat_avg_roi').textContent = `${avgRoi.toFixed(1)}%`;
    if ($('stat_avg_price')) $('stat_avg_price').textContent = formatPrice(avgPrice);
    if ($('stat_best_roi')) $('stat_best_roi').textContent = `${bestRoi.toFixed(1)}%`;
  }
}

/* ====== Filtrar resultados ====== */
window.filterResults = function() {
  const statusFilter = $('filter_status')?.value || 'all';
  const roiFilter = parseFloat($('filter_roi')?.value) || 0;
  
  filteredResults = evaluationResults.filter(result => {
    // Filtro por estado
    if (statusFilter !== 'all' && result.status !== statusFilter) {
      return false;
    }
    
    // Filtro por ROI
    if (roiFilter > 0 && (!result.evaluation || result.evaluation.roi_bruto < roiFilter)) {
      return false;
    }
    
    return true;
  });
  
  sortResults();
};

/* ====== Ordenar resultados ====== */
window.sortResults = function() {
  const sortBy = $('sort_by')?.value || 'roi_desc';
  
  filteredResults.sort((a, b) => {
    switch (sortBy) {
      case 'roi_desc':
        return (b.evaluation?.roi_bruto || 0) - (a.evaluation?.roi_bruto || 0);
      case 'roi_asc':
        return (a.evaluation?.roi_bruto || 0) - (b.evaluation?.roi_bruto || 0);
      case 'price_desc':
        return b.price - a.price;
      case 'price_asc':
        return a.price - b.price;
      case 'location':
        return a.location.localeCompare(b.location);
      default:
        return 0;
    }
  });
  
  renderResultsTable();
};

/* ====== Renderizar tabla de resultados ====== */
function renderResultsTable() {
  const tbody = $('results_tbody');
  if (!tbody) return;
  
  tbody.innerHTML = filteredResults.map(result => {
    const eval_ = result.evaluation;
    
    if (result.status === 'error') {
      return `
        <tr>
          <td><span class="status error">Error</span></td>
          <td>${result.title}</td>
          <td>${result.location}</td>
          <td>${formatPrice(result.price)}</td>
          <td>${result.size} m²</td>
          <td>-</td>
          <td>${result.rooms}</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td>${result.portal}</td>
          <td>
            <button class="btn" onclick="retryEvaluation('${result.id}')">
              🔄 Reintentar
            </button>
          </td>
        </tr>
      `;
    }
    
    if (result.status === 'completed' && eval_) {
      return `
        <tr>
          <td><span class="status completed">✓</span></td>
          <td>
            <div style="font-weight:700">${result.title}</div>
            <div style="font-size:10px;color:var(--ink2)">${result.address}</div>
          </td>
          <td>${result.location}</td>
          <td>${formatPrice(result.price)}</td>
          <td>${result.size} m²</td>
          <td>${formatPrice(eval_.precio_m2)}</td>
          <td>${result.rooms}</td>
          <td>${formatPrice(eval_.alquiler_mes)}</td>
          <td>
            <span class="kpi ${eval_.clasificacion}">
              ${eval_.roi_bruto.toFixed(1)}%
            </span>
          </td>
          <td>${eval_.roi_neto.toFixed(1)}%</td>
          <td>
            <span style="color:${eval_.flujo_mensual >= 0 ? 'var(--ok)' : 'var(--bad)'}">
              ${formatPrice(eval_.flujo_mensual)}
            </span>
          </td>
          <td>
            <span style="background:${result.portal === 'idealista' ? '#ff6600' : '#00AA00'};color:#fff;padding:2px 4px;border-radius:4px;font-size:9px">
              ${result.portal}
            </span>
          </td>
          <td>
            <button class="btn" onclick="viewDetails('${result.id}')">
              👁️ Ver
            </button>
            <button class="btn" onclick="saveEvaluation('${result.id}')">
              💾 Guardar
            </button>
          </td>
        </tr>
      `;
    }
    
    return `
      <tr>
        <td><span class="status pending">Pendiente</span></td>
        <td>${result.title}</td>
        <td>${result.location}</td>
        <td>${formatPrice(result.price)}</td>
        <td>${result.size} m²</td>
        <td>-</td>
        <td>${result.rooms}</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>${result.portal}</td>
        <td>-</td>
      </tr>
    `;
  }).join('');
}

/* ====== Exportar resultados ====== */
window.exportResults = function() {
  const completed = evaluationResults.filter(r => r.status === 'completed');
  
  if (completed.length === 0) {
    showToast('No hay resultados para exportar', 'error');
    return;
  }
  
  const csvContent = generateCSV(completed);
  downloadCSV(csvContent, 'evaluacion_masiva_' + new Date().getTime() + '.csv');
  
  showToast('Resultados exportados correctamente', 'success');
};

/* ====== Generar CSV ====== */
function generateCSV(results) {
  const headers = [
    'Título', 'Dirección', 'Localización', 'Portal', 'Precio', 'Superficie (m²)', 'Habitaciones', 'Baños',
    'Año', 'Ascensor', 'Planta', 'Precio/m²', 'Alquiler/mes', 'ROI Bruto (%)', 'ROI Neto (%)', 
    'Flujo Mensual', 'Clasificación', 'URL'
  ];
  
  const rows = results.map(result => {
    const eval_ = result.evaluation;
    return [
      `"${result.title}"`,
      `"${result.address}"`,
      result.location,
      result.portal,
      result.price,
      result.size,
      result.rooms,
      result.bathrooms,
      result.year,
      result.elevator ? 'Sí' : 'No',
      result.floor,
      eval_.precio_m2.toFixed(2),
      eval_.alquiler_mes.toFixed(2),
      eval_.roi_bruto.toFixed(2),
      eval_.roi_neto.toFixed(2),
      eval_.flujo_mensual.toFixed(2),
      eval_.clasificacion,
      `"${result.url}"`
    ];
  });
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/* ====== Descargar CSV ====== */
function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ====== Acciones individuales ====== */
window.viewDetails = function(propertyId) {
  const result = evaluationResults.find(r => r.id === propertyId);
  if (!result) return;
  
  // Aquí podrías abrir un modal con detalles completos
  showToast(`Detalles de: ${result.title}`, 'success');
};

window.saveEvaluation = function(propertyId) {
  const result = evaluationResults.find(r => r.id === propertyId);
  if (!result || result.status !== 'completed') return;
  
  try {
    // Convertir a formato de evaluación compatible con el sistema existente
    const evaluationData = {
      id: 'ev_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      ts: Date.now(),
      // Datos del inmueble
      loc: result.location,
      calle: result.address,
      url: result.url,
      anio: result.year,
      m2: result.size,
      asc: result.elevator ? 'Sí' : 'No',
      alt: result.floor,
      bajo: result.floor === 0 ? 'Sí' : 'No',
      habs: result.rooms,
      banos: result.bathrooms,
      // Evaluación
      precio: result.price,
      alq_m: result.evaluation.alquiler_mes,
      kpi_bruta: result.evaluation.roi_bruto,
      kpi_neta: result.evaluation.roi_neto,
      kpi_flujo: result.evaluation.flujo_mensual,
      // Metadata
      origen: 'bulk_evaluation',
      portal: result.portal
    };
    
    // Guardar en localStorage
    const existingEvals = JSON.parse(localStorage.getItem('evals') || '[]');
    existingEvals.push(evaluationData);
    localStorage.setItem('evals', JSON.stringify(existingEvals));
    
    showToast(`Evaluación guardada: ${result.title}`, 'success');
    
  } catch (error) {
    console.error('Error guardando evaluación:', error);
    showToast('Error al guardar la evaluación', 'error');
  }
};

window.retryEvaluation = function(propertyId) {
  // Implementar reintento de evaluación
  showToast('Función de reintento en desarrollo', 'warning');
};

/* ====== Utilidades ====== */
function formatPrice(price) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(price);
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type} show`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

})();