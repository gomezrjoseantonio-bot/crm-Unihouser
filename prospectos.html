<!DOCTYPE html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Unihouser — Prospectos</title>
<link rel="stylesheet" href="css/style.css">
<style>
/* Stepper (camino de fases) - Look Unihouser */
.stepper{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0 6px}
.step{
  display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;
  font-weight:800;border:1px solid #2b343a;cursor:pointer;user-select:none
}
.step .dot{width:8px;height:8px;border-radius:50%}
.step.pending{background:#0f1214;color:#9aa5af}
.step.pending .dot{background:#9aa5af}
.step.active{background:#ff5a1f;color:#fff;border-color:#ff5a1f;box-shadow:0 0 0 3px rgba(255,90,31,.15)}
.step.active .dot{background:#fff}
.step.done{background:#0f2318;color:#86efac;border-color:#14532d}
.step.done .dot{background:#22c55e}
.badge{display:inline-block;padding:4px 8px;border-radius:999px;font-weight:800;font-size:12px}
.badge.note{background:#0b0d0e;color:#9aa5af;border:1px solid #2b343a}
</style>
</head><body>
<header class="topbar">
  <div class="container flex between center">
    <div class="brand flex center"><div class="title">Unihouser — CRM & BuyBox</div></div>
    <nav class="nav">
      <a href="evaluar.html">Evaluar</a>
      <a href="evaluaciones.html">Evaluaciones</a>
      <a href="prospectos.html" class="active">Prospectos</a>
      <a href="dashboard.html">Dashboard</a>
      <a href="configuracion.html">Configuración</a>
    </nav>
  </div>
</header>

<main class="container">
<section class="card">
  <h2>Prospecto</h2>
  <!-- Camino de fases -->
  <div id="stepper" class="stepper"></div>

  <input type="hidden" id="p_idx" value="-1">

  <!-- 1. Datos personales -->
  <div class="section">
    <h3>1 · Datos personales</h3>
    <div class="row three">
      <div class="field"><label>Nombre y Apellidos</label><input id="p_nombre" placeholder="Nombre y apellidos"></div>
      <div class="field"><label>DNI</label><input id="p_dni" placeholder="00000000X"></div>
      <div class="field"><label>Teléfono</label><input id="p_tel" placeholder="644 300 200"></div>
    </div>
    <div class="row three">
      <div class="field"><label>Email</label><input id="p_email" placeholder="email@dominio.com"></div>
      <div class="field"><label>Dirección</label><input id="p_dir" placeholder="C/ ... nº ..."></div>
      <div class="field"><label>Localidad (residencia)</label><input id="p_loc_res" placeholder="Oviedo"></div>
    </div>
  </div>

  <!-- 2. Características del activo / inversión -->
  <div class="section">
    <h3>2 · Características del activo / inversión</h3>
    <div class="row three">
      <div class="field"><label>Localidades objetivo (separadas por comas)</label><input id="p_locs_obj" placeholder="Oviedo, Gijón, Avilés"></div>
      <div class="field"><label>Tipo de alquiler</label>
        <select id="p_pref_tipo"><option>Tradicional</option><option>Habitaciones</option></select>
      </div>
      <div class="field"><label>Nº de activos deseados</label><input id="p_num_activos" inputmode="numeric" placeholder="1"></div>
    </div>
    <div class="row three">
      <div class="field"><label>¿Ascensor?</label><select id="p_asc"><option>Sí</option><option>No</option></select></div>
      <div class="field"><label>Altura máxima (planta)</label><input id="p_alt_max" inputmode="numeric" placeholder="3"></div>
      <div class="field"><label>¿Bajos?</label><select id="p_bajos"><option>No</option><option>Sí</option></select></div>
    </div>
    <div class="row three">
      <div class="field"><label>Acepta reforma</label>
        <select id="p_reforma"><option>No</option><option>Lavado de cara</option><option>Integral</option></select>
      </div>
      <div class="field"><label>Presupuesto TOTAL (€) (compra+ITP+notaría+honorarios)</label>
        <input id="p_budget" data-money placeholder="150.000">
      </div>
      <div class="field"><label>Precio máx. COMPRA (auto)</label>
        <input id="p_max_compra" data-money disabled>
        <small class="hint">Se calcula con ITP/Notaría (Config) y honorarios (3.500€+IVA).</small>
      </div>
    </div>
  </div>

  <!-- 3. Financiación -->
  <div class="section">
    <h3>3 · Financiación</h3>
    <div class="row three">
      <div class="field"><label>Financiación bancaria</label><select id="p_financia"><option>Sí</option><option>No</option></select></div>
      <div class="field"><label>¿Necesita broker?</label><select id="p_broker"><option>No</option><option>Sí</option></select></div>
      <div class="field"><label>% financiación habitual</label><input id="p_pct_fin" placeholder="80,0"></div>
    </div>
    <div class="row three">
      <div class="field"><label>Hipoteca estimada (auto)</label><input id="p_hipoteca" data-money disabled></div>
      <div class="field"><label>Fondos propios (auto)</label><input id="p_propios" data-money disabled></div>
      <div class="field"><span class="badge note">El % se aplica sobre el <b>precio máx. de compra</b></span></div>
    </div>
  </div>

  <!-- 4. Objetivos -->
  <div class="section">
    <h3>4 · Objetivos</h3>
    <div class="row three">
      <div class="field"><label>Objetivo principal</label>
        <select id="p_obj_tipo">
          <option value="bruta">Rentabilidad bruta (%)</option>
          <option value="neta">Rentabilidad neta (%)</option>
          <option value="flujo">Flujo de caja (€/mes)</option>
        </select>
      </div>
      <div class="field"><label>Valor objetivo</label><input id="p_obj_val" placeholder="7,5 o 300"></div>
      <div class="field"><label>Periodo de búsqueda</label>
        <div class="row two">
          <input id="p_mes_ini" placeholder="MM/AAAA">
          <input id="p_mes_fin" placeholder="MM/AAAA">
        </div>
        <small class="hint">Si indicas inicio, el fin se autocompleta +5 meses.</small>
      </div>
    </div>
    <div class="row three" id="row_alquiler_max" hidden>
      <div class="field">
        <label>Alquiler máx. (orientativo) para la rentabilidad bruta (€ / mes)</label>
        <input id="p_alq_max" data-money disabled>
        <small class="hint">Calculado como Rb% × (Presupuesto TOTAL / 12).</small>
      </div>
    </div>
  </div>

  <!-- Acciones -->
  <div class="actions">
    <button class="btn primary" id="p_save" type="button">Guardar</button>
    <button class="btn ghost" id="p_clear" type="button">Limpiar</button>
    <button class="btn" id="p_mail_contacto" type="button">Email: contacto</button>
    <button class="btn" id="p_mail_resumen" type="button">Email: resumen reunión</button>
    <button class="btn" id="p_mail_contrato" type="button">Email: contrato</button>
  </div>
  <div id="p_toast" class="toast success" hidden>✅ Prospecto guardado</div>

  <div class="hr"></div>

  <!-- Listado (sin filtros; los pasamos a Dashboard) -->
  <div class="section"><h3>Listado de prospectos</h3></div>
  <table class="table">
    <thead><tr>
      <th>Nombre</th><th>Email</th><th>Teléfono</th>
      <th>Objetivo</th><th>Tipo</th><th>Localidades</th>
      <th>Fase</th><th>Subestado</th><th>Acciones</th>
    </tr></thead>
    <tbody id="p_body"></tbody>
  </table>
</section>
</main>

<footer class="foot"><div class="container foot-inner">© 2025 Unihouser · unihouser.es · info@unihouser.es · 644 300 200</div></footer>
<script defer src="js/app.js"></script>
<script defer src="js/prospectos.js"></script>
</body></html>
