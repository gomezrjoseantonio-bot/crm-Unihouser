(function(){
"use strict";

/* ====== Store y utilidades ====== */
const $ = id => document.getElementById(id);

// Simulación de datos de propiedades para demostración
const MOCK_PROPERTIES = [
  {
    id: 'prop_001',
    portal: 'idealista',
    title: 'Piso en Oviedo Centro',
    price: 180000,
    size: 85,
    rooms: 3,
    bathrooms: 2,
    location: 'Oviedo',
    address: 'Calle Uría, 15',
    description: 'Piso céntrico totalmente reformado con ascensor',
    url: 'https://www.idealista.com/inmueble/...',
    images: ['https://via.placeholder.com/300x200'],
    year: 1980,
    elevator: true,
    floor: 3,
    orientation: 'Sur'
  },
  {
    id: 'prop_002',
    portal: 'fotocasa',
    title: 'Casa adosada en Gijón',
    price: 220000,
    size: 120,
    rooms: 4,
    bathrooms: 3,
    location: 'Gijón',
    address: 'Barrio de Somió',
    description: 'Casa con jardín y plaza de garaje',
    url: 'https://www.fotocasa.es/...',
    images: ['https://via.placeholder.com/300x200'],
    year: 1995,
    elevator: false,
    floor: 0,
    orientation: 'Este'
  },
  {
    id: 'prop_003',
    portal: 'idealista',
    title: 'Apartamento en Avilés',
    price: 120000,
    size: 65,
    rooms: 2,
    bathrooms: 1,
    location: 'Avilés',
    address: 'Centro histórico',
    description: 'Apartamento acogedor cerca del puerto',
    url: 'https://www.idealista.com/inmueble/...',
    images: ['https://via.placeholder.com/300x200'],
    year: 1970,
    elevator: false,
    floor: 2,
    orientation: 'Norte'
  }
];

let searchResults = [];
let selectedProperties = new Set();

/* ====== Inicialización ====== */
document.addEventListener('DOMContentLoaded', () => {
  loadLocations();
  updateSelectedCount();
});

/* ====== Cargar localidades ====== */
async function loadLocations() {
  try {
    const response = await fetch('data/asturias.json');
    const locations = await response.json();
    
    const select = $('search_location');
    if (select) {
      select.innerHTML = '<option value="">Toda Asturias</option>';
      locations.forEach(loc => {
        const option = document.createElement('option');
        option.value = loc;
        option.textContent = loc;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error cargando localidades:', error);
    // Fallback con algunas localidades principales
    const select = $('search_location');
    if (select) {
      select.innerHTML = `
        <option value="">Toda Asturias</option>
        <option value="Oviedo">Oviedo</option>
        <option value="Gijón">Gijón</option>
        <option value="Avilés">Avilés</option>
        <option value="Mieres">Mieres</option>
        <option value="Langreo">Langreo</option>
      `;
    }
  }
}

/* ====== Búsqueda de propiedades ====== */
window.searchProperties = async function() {
  const searchBtn = $('search_btn_text');
  const loadingDiv = $('loading');
  const resultsSection = $('results_section');
  const emptyDiv = $('empty');
  
  // Mostrar loading
  if (searchBtn) searchBtn.textContent = '🔍 Buscando...';
  if (loadingDiv) loadingDiv.style.display = 'block';
  if (resultsSection) resultsSection.style.display = 'none';
  if (emptyDiv) emptyDiv.style.display = 'none';
  
  // Recopilar filtros
  const filters = {
    portal: $('search_portal')?.value || 'both',
    operation: $('search_operation')?.value || 'sale',
    propertyType: $('search_property_type')?.value || 'all',
    location: $('search_location')?.value || '',
    priceMin: parseInt($('search_price_min')?.value) || 0,
    priceMax: parseInt($('search_price_max')?.value) || Infinity,
    sizeMin: parseInt($('search_size_min')?.value) || 0,
    sizeMax: parseInt($('search_size_max')?.value) || Infinity,
    roomsMin: parseInt($('search_rooms_min')?.value) || 0,
    bathroomsMin: parseInt($('search_bathrooms_min')?.value) || 0,
    maxResults: parseInt($('search_max_results')?.value) || 20
  };
  
  try {
    // Simular tiempo de búsqueda real
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Filtrar propiedades mock según criterios
    searchResults = MOCK_PROPERTIES.filter(prop => {
      if (filters.portal !== 'both' && prop.portal !== filters.portal) return false;
      if (filters.location && prop.location !== filters.location) return false;
      if (prop.price < filters.priceMin || prop.price > filters.priceMax) return false;
      if (prop.size < filters.sizeMin || prop.size > filters.sizeMax) return false;
      if (prop.rooms < filters.roomsMin) return false;
      if (prop.bathrooms < filters.bathroomsMin) return false;
      return true;
    });
    
    // Generar propiedades adicionales para demostración
    const additionalProps = generateAdditionalProperties(filters, Math.min(filters.maxResults - searchResults.length, 15));
    searchResults = [...searchResults, ...additionalProps];
    
    // Limitar resultados
    searchResults = searchResults.slice(0, filters.maxResults);
    
    // Mostrar resultados
    displayResults();
    showToast('Búsqueda completada correctamente', 'success');
    
  } catch (error) {
    console.error('Error en búsqueda:', error);
    showToast('Error en la búsqueda. Inténtalo de nuevo.', 'error');
  } finally {
    // Ocultar loading
    if (searchBtn) searchBtn.textContent = '🔍 Buscar Propiedades';
    if (loadingDiv) loadingDiv.style.display = 'none';
  }
};

/* ====== Generar propiedades adicionales para demostración ====== */
function generateAdditionalProperties(filters, count) {
  const locations = ['Oviedo', 'Gijón', 'Avilés', 'Mieres', 'Langreo', 'Llanera', 'Siero'];
  const streets = ['Calle Principal', 'Avenida Central', 'Plaza Mayor', 'Calle Real', 'Paseo Marítimo'];
  const orientations = ['Norte', 'Sur', 'Este', 'Oeste', 'Sureste', 'Suroeste'];
  const portals = ['idealista', 'fotocasa'];
  const propertyTypes = ['Piso', 'Casa', 'Apartamento', 'Dúplex', 'Ático'];
  
  const props = [];
  
  for (let i = 0; i < count; i++) {
    const location = filters.location || locations[Math.floor(Math.random() * locations.length)];
    const rooms = Math.max(filters.roomsMin, Math.floor(Math.random() * 4) + 1);
    const size = Math.max(filters.sizeMin, 50 + Math.floor(Math.random() * 100));
    const price = Math.max(filters.priceMin, 80000 + Math.floor(Math.random() * 200000));
    
    props.push({
      id: `prop_gen_${Date.now()}_${i}`,
      portal: filters.portal === 'both' ? portals[Math.floor(Math.random() * 2)] : filters.portal,
      title: `${propertyTypes[Math.floor(Math.random() * propertyTypes.length)]} en ${location}`,
      price: price,
      size: size,
      rooms: rooms,
      bathrooms: Math.max(filters.bathroomsMin, Math.floor(rooms / 2) + 1),
      location: location,
      address: `${streets[Math.floor(Math.random() * streets.length)]}, ${Math.floor(Math.random() * 50) + 1}`,
      description: `Propiedad en ${location} con ${rooms} habitaciones`,
      url: `https://www.${portals[Math.floor(Math.random() * 2)]}.com/inmueble/...`,
      images: ['https://via.placeholder.com/300x200'],
      year: 1960 + Math.floor(Math.random() * 60),
      elevator: Math.random() > 0.4,
      floor: Math.floor(Math.random() * 8),
      orientation: orientations[Math.floor(Math.random() * orientations.length)]
    });
  }
  
  return props;
}

/* ====== Mostrar resultados ====== */
function displayResults() {
  const resultsSection = $('results_section');
  const emptyDiv = $('empty');
  const container = $('results_container');
  
  if (!searchResults.length) {
    if (emptyDiv) emptyDiv.style.display = 'block';
    if (resultsSection) resultsSection.style.display = 'none';
    return;
  }
  
  // Actualizar resumen
  updateResultsSummary();
  
  // Mostrar sección de resultados
  if (resultsSection) resultsSection.style.display = 'block';
  if (emptyDiv) emptyDiv.style.display = 'none';
  
  // Generar HTML de propiedades
  if (container) {
    container.innerHTML = searchResults.map(prop => createPropertyCard(prop)).join('');
  }
}

/* ====== Crear tarjeta de propiedad ====== */
function createPropertyCard(prop) {
  const isSelected = selectedProperties.has(prop.id);
  const portalIcon = prop.portal === 'idealista' ? '🏠' : '🏡';
  const pricePerM2 = Math.round(prop.price / prop.size);
  
  return `
    <div class="property-card ${isSelected ? 'selected' : ''}" data-id="${prop.id}">
      <div class="property-header">
        <div>
          <h4 class="property-title">${portalIcon} ${prop.title}</h4>
          <div style="font-size:11px;color:var(--ink2);margin:2px 0">
            ${prop.address} • ${prop.portal}
          </div>
        </div>
        <div class="property-price">
          ${formatPrice(prop.price)}
          <div style="font-size:10px;color:var(--ink2)">
            ${pricePerM2} €/m²
          </div>
        </div>
      </div>
      
      <div class="property-details">
        <div class="property-detail">
          <strong>${prop.size} m²</strong><br>Superficie
        </div>
        <div class="property-detail">
          <strong>${prop.rooms}</strong><br>Habitaciones
        </div>
        <div class="property-detail">
          <strong>${prop.bathrooms}</strong><br>Baños
        </div>
        <div class="property-detail">
          <strong>${prop.year}</strong><br>Año constr.
        </div>
        <div class="property-detail">
          <strong>${prop.floor}º</strong><br>Planta
        </div>
        <div class="property-detail">
          <strong>${prop.elevator ? 'Sí' : 'No'}</strong><br>Ascensor
        </div>
      </div>
      
      <div style="margin:8px 0;font-size:11px;color:var(--ink2)">
        ${prop.description}
      </div>
      
      <div class="property-actions">
        <button class="btn ${isSelected ? 'primary' : ''}" onclick="toggleProperty('${prop.id}')">
          ${isSelected ? '✓ Seleccionada' : '+ Seleccionar'}
        </button>
        <button class="btn" onclick="evaluateProperty('${prop.id}')">
          📊 Evaluar Individual
        </button>
        <button class="btn" onclick="viewProperty('${prop.id}')">
          👁️ Ver Detalles
        </button>
        <button class="btn" onclick="showDemoMessage()">
          🔗 Ver Original
        </button>
      </div>
    </div>
  `;
}

/* ====== Actualizar resumen de resultados ====== */
function updateResultsSummary() {
  const totalFound = $('total_found');
  const selectedForEval = $('selected_for_eval');
  const avgPrice = $('avg_price');
  
  if (totalFound) totalFound.textContent = searchResults.length;
  if (selectedForEval) selectedForEval.textContent = selectedProperties.size;
  
  if (avgPrice && searchResults.length) {
    const average = Math.round(searchResults.reduce((sum, prop) => sum + prop.price, 0) / searchResults.length);
    avgPrice.textContent = formatPrice(average);
  }
}

/* ====== Seleccionar/deseleccionar propiedad ====== */
window.toggleProperty = function(propertyId) {
  if (selectedProperties.has(propertyId)) {
    selectedProperties.delete(propertyId);
  } else {
    selectedProperties.add(propertyId);
  }
  
  updateSelectedCount();
  updatePropertyCard(propertyId);
  updateResultsSummary();
};

/* ====== Actualizar contador de seleccionadas ====== */
function updateSelectedCount() {
  const count = selectedProperties.size;
  const selectedCountSpan = $('selected_count');
  const evaluateBtn = $('evaluate_btn');
  
  if (selectedCountSpan) selectedCountSpan.textContent = count;
  if (evaluateBtn) {
    evaluateBtn.style.display = count > 0 ? 'inline-block' : 'none';
  }
}

/* ====== Actualizar tarjeta de propiedad ====== */
function updatePropertyCard(propertyId) {
  const card = document.querySelector(`[data-id="${propertyId}"]`);
  if (card) {
    const isSelected = selectedProperties.has(propertyId);
    const button = card.querySelector('.property-actions .btn');
    
    if (isSelected) {
      card.classList.add('selected');
      if (button) {
        button.textContent = '✓ Seleccionada';
        button.classList.add('primary');
      }
    } else {
      card.classList.remove('selected');
      if (button) {
        button.textContent = '+ Seleccionar';
        button.classList.remove('primary');
      }
    }
  }
}

/* ====== Evaluar propiedades seleccionadas ====== */
window.evaluateSelected = function() {
  if (selectedProperties.size === 0) {
    showToast('Selecciona al menos una propiedad para evaluar', 'error');
    return;
  }
  
  const selectedProps = searchResults.filter(prop => selectedProperties.has(prop.id));
  
  // Guardar propiedades seleccionadas en localStorage para evaluación masiva
  localStorage.setItem('bulk_evaluation_properties', JSON.stringify(selectedProps));
  
  // Navegar a página de evaluación masiva
  window.location.href = 'evaluacion-masiva.html';
};

/* ====== Evaluar propiedad individual ====== */
window.evaluateProperty = function(propertyId) {
  const property = searchResults.find(prop => prop.id === propertyId);
  if (!property) return;
  
  // Pre-rellenar formulario de evaluación con datos de la propiedad
  const evalData = {
    calle: property.address,
    m2: property.size,
    anio: property.year,
    habs: property.rooms,
    banos: property.bathrooms,
    alt: property.floor,
    asc: property.elevator ? 'Sí' : 'No',
    url: property.url,
    precio: property.price
  };
  
  localStorage.setItem('pre_fill_evaluation', JSON.stringify(evalData));
  
  // Navegar a página de evaluación individual
  window.location.href = 'evaluar.html?auto=true';
};

/* ====== Mostrar mensaje de demostración ====== */
window.showDemoMessage = function() {
  showToast('Las propiedades mostradas son simuladas para demostración. En una versión completa, este enlace llevaría al listado real en Idealista/Fotocasa.', 'warning');
};

/* ====== Ver detalles de propiedad ====== */
window.viewProperty = function(propertyId) {
  const property = searchResults.find(prop => prop.id === propertyId);
  if (!property) return;
  
  // Mostrar modal con detalles (implementación futura)
  showToast(`Detalles de: ${property.title}`, 'success');
};

/* ====== Limpiar filtros ====== */
window.clearFilters = function() {
  const inputs = ['search_price_min', 'search_price_max', 'search_size_min', 'search_size_max'];
  inputs.forEach(id => {
    const el = $(id);
    if (el) el.value = '';
  });
  
  const selects = ['search_portal', 'search_operation', 'search_property_type', 'search_location', 'search_rooms_min', 'search_bathrooms_min', 'search_max_results'];
  selects.forEach(id => {
    const el = $(id);
    if (el) el.selectedIndex = 0;
  });
  
  showToast('Filtros limpiados', 'success');
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
  if (window.UNotify) {
    if (type === 'success') UNotify.success(message);
    else if (type === 'error') UNotify.error(message);
    else if (type === 'warning') UNotify.warning(message);
    else UNotify.info(message);
  } else {
    // Fallback para compatibilidad
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
}

/* ====== Estilos adicionales para propiedades seleccionadas ====== */
const style = document.createElement('style');
style.textContent = `
  .property-card.selected {
    border-color: var(--brand);
    background: linear-gradient(135deg, #fff 0%, #fff7ed 100%);
  }
  
  .property-card.selected .property-title {
    color: var(--brand);
  }
`;
document.head.appendChild(style);

})();