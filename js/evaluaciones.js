<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unihouser — Evaluaciones</title>
  <link rel="stylesheet" href="css/style.css">
  <style>
    /* mínimas reglas para que el drawer y los toasts funcionen incluso si no están en tu CSS */
    .drawer{position:fixed;top:0;right:-420px;width:420px;height:100vh;background:#fff;color:#0f1112;border-left:1px solid #e5e7eb;box-shadow:0 10px 24px rgba(0,0,0,.15);transition:right .28s ease;padding:16px;z-index:50;overflow:auto}
    .drawer.open{right:0}
    .toast-wrap{position:fixed;bottom:18px;right:18px;display:flex;flex-direction:column;gap:8px;z-index:60}
    .toast{background:#0f1112;color:#fff;padding:10px 12px;border-radius:10px;opacity:.98}
    .toast.ok{background:#16a34a}.toast.warn{background:#f59e0b}.toast.bad{background:#ef4444}
    .kpis{display:grid;gap:10px;grid-template-columns:repeat(4,1fr)}
    @media(min-width:980px){.kpis{grid-template-columns:repeat(4,1fr)}}
    .kpi{background:var(--card,#fff);border:1px solid #e5e7eb;border-radius:12px;padding:12px}
    .kpi .lab{font-size:12px;color:#667085}
    .kpi .val{font-weight:800;font-size:20px;margin-top:2px}
    .filters .row{display:grid;gap:10px;grid-template-columns:1.2fr .8fr .8fr .8fr .6fr}
    @media(max-width:900px){.filters .row{grid-template-columns:1fr}}
    table.table {width:100%;border-collapse:separate;border-spacing:0;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
    .table th,.table td{padding:12px;border-bottom:1px solid #eef2f7;text-align:left;font-size:14px}
    .table th{background:#fafafa;color:#111827;cursor:pointer;user-select:none}
    .badge{display:inline-block;padding:2px 8px;border-radius:999px;background:#eef2f7;color:#111827;font-size:12px}
    .btn.small{padding:8px 10px;font-size:13px;border-radius:10px}
    .drawer h3{margin:0 0 8px}
    .drawer .pair{display:grid;grid-template-columns:120px 1fr;gap:8px;margin-bottom:8px}
    .muted{color:#667085}
  </style>
</head>
<body>
<header class="topbar">
  <div class="container flex between center">
    <div class="brand flex center"><div class="title">Unihouser — CRM & BuyBox</div></div>
    <nav class="nav">
      <a href="evaluar.html">Evaluar</a>
      <a href="evaluaciones.html" class="active">Evaluaciones</a>
      <a href="prospectos.html">Prospectos</a>
      <a href="dashboard.html">Dashboard</a>
      <a href="configuracion.html">Configuración</a>
    </nav>
  </div>
</header>

<main class="container">
  <section class="card">
    <h2>Evaluaciones</h2>

    <!-- KPIs -->
    <div class="kpis" style="margin-top:6px">
      <div class="kpi">
        <div class="lab">Total evaluaciones</div>
        <div class="val" id="k_total">0</div>
      </div>
      <div class="kpi">
        <div class="lab">Asignadas</div>
        <div class="val" id="k_asig">0</div>
      </div>
      <div class="kpi">
        <div class="lab">Bruta media</div>
        <div class="val" id="k_bru">0,0 %</div>
      </div>
      <div class="kpi">
        <div class="lab">Neta media</div>
        <div class="val" id="k_net">0,0 %</div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="card" style="margin-top:12px">
      <h3 style="margin:0 0 6px">Filtros</h3>
      <div class="filters">
        <div class="row">
          <div class="field">
            <label class="muted">Buscar</label>
            <input id="f_text" placeholder="Localidad o calle">
          </div>
          <div class="field">
            <label class="muted">Tipo</label>
            <select id="f_tipo">
              <option value="">Todos</option>
              <option>Tradicional</option>
              <option>Habitaciones</option>
            </select>
          </div>
          <div class="field">
            <label class="muted">Desde</label>
            <input id="f_desde" type="date" placeholder="dd/mm/aaaa">
          </div>
          <div class="field">
            <label class="muted">Hasta</label>
            <input id="f_hasta" type="date" placeholder="dd/mm/aaaa">
          </div>
          <div class="field" style="display:flex;gap:8px;align-items:flex-end">
            <button class="btn" id="b_limpiar">Limpiar</button>
            <button class="btn primary" id="b_filtrar">Filtrar</button>
            <button class="btn" id="b_export">Exportar CSV</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="card" style="margin-top:12px">
      <table class="table" id="tbl">
        <thead>
          <tr>
            <th data-k="ts">Fecha</th>
            <th data-k="loc">Localidad</th>
            <th data-k="calle">Calle</th>
            <th data-k="tipo">Tipo</th>
            <th data-k="precio" style="text-align:right">Precio</th>
            <th data-k="alq" style="text-align:right">Alquiler</th>
            <th data-k="kpi_bruta" style="text-align:right">Bruta %</th>
            <th data-k="kpi_neta" style="text-align:right">Neta %</th>
            <th data-k="kpi_flujo" style="text-align:right">Flujo</th>
            <th data-k="pmax" style="text-align:right">P. máx</th>
            <th data-k="asig" style="text-align:center">Asignados</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>
  </section>
</main>

<footer class="foot"><div class="container foot-inner">© 2025 Unihouser · unihouser.es · info@unihouser.es · 644 300 200</div></footer>

<!-- Drawer detalle/asignación -->
<aside id="drawer" class="drawer" aria-hidden="true">
  <button class="btn" id="d_cerrar" style="float:right;margin-top:-6px">Cerrar</button>
  <h3>Detalle de evaluación</h3>
  <div class="pair"><div class="muted">Fecha</div><div id="d_fecha">—</div></div>
  <div class="pair"><div class="muted">Tipo</div><div id="d_tipo">—</div></div>
  <div class="pair"><div class="muted">Localidad</div><div id="d_loc">—</div></div>
  <div class="pair"><div class="muted">Calle</div><div id="d_calle">—</div></div>
  <div class="pair"><div class="muted">Precio</div><div id="d_precio">—</div></div>
  <div class="pair"><div class="muted">Alquiler</div><div id="d_alq">—</div></div>
  <div class="pair"><div class="muted">Bruta</div><div id="d_bruta">—</div></div>
  <div class="pair"><div class="muted">Neta</div><div id="d_neta">—</div></div>
  <div class="pair"><div class="muted">Flujo</div><div id="d_flujo">—</div></div>
  <div class="pair"><div class="muted">P. máx</div><div id="d_pmax">—</div></div>
  <div class="pair"><div class="muted">Inversión</div><div id="d_inv">—</div></div>
  <div class="pair"><div class="muted">URL</div><div id="d_url">—</div></div>
  <hr style="margin:10px 0">
  <h3>Asignar a prospects</h3>
  <div id="p_list" class="muted">—</div>
  <div style="margin-top:10px;display:flex;gap:8px">
    <button class="btn primary" id="d_guardar">Guardar asignación</button>
    <button class="btn" id="d_cerrar_2" onclick="document.getElementById('drawer').classList.remove('open')">Cancelar</button>
  </div>
</aside>

<!-- Toasts -->
<div id="toasts" class="toast-wrap"></div>

<!-- JS -->
<script defer src="js/evaluaciones.js"></script>
</body>
</html>
