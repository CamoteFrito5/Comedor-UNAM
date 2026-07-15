/* ============================================================
   views/scanner.view.js — Terminal de Registro de Asistencia
   ============================================================
   Vistas:
   - renderQR       → Escáner por código QR
   - renderBarcode  → Escáner por código de barras
   - renderDNI      → Teclado numérico para DNI
   - renderConfirm  → Lista de asistencias del día
   ============================================================ */

const ScannerViews = {

  /* ──────────────────────────────────────────────────────────
     SHARED: HTML de tabs de navegación del escáner
  ────────────────────────────────────────────────────────── */
  _tabsHTML(active) {
    const tabs = [
      { key: 'qr',      label: '📷 Código QR',      route: 'scanner-qr' },
      { key: 'barcode', label: '▦ Código de Barras', route: 'scanner-barcode' },
      { key: 'dni',     label: '🔢 DNI Manual',      route: 'scanner-dni' },
    ];
    return `
      <div class="scanner-tabs">
        ${tabs.map(t => `
          <button
            class="scanner-tab${active === t.key ? ' active' : ''}"
            onclick="navigateTo('${t.route}')"
          >${t.label}</button>
        `).join('')}
      </div>`;
  },

  /* ──────────────────────────────────────────────────────────
     SHARED: HTML de últimos registros
  ────────────────────────────────────────────────────────── */
  _lastRegistrationsHTML() {
    return `
      <div class="scanner-section-title">
        <span>📋 Últimos Registros</span>
      </div>
      <div id="last-registrations" class="last-registrations-list">
        <!-- Se llena dinámicamente con ScannerComponent._actualizarListaReciente() -->
      </div>`;
  },

  /* ──────────────────────────────────────────────────────────
     1. renderQR — Escáner por Código QR
  ────────────────────────────────────────────────────────── */
  renderQR(container) {
    container.innerHTML = `
      <div class="scanner-view">
        <!-- Tabs de navegación -->
        ${this._tabsHTML('qr')}

        <!-- Área de resultado (oculta hasta escaneo) -->
        <div id="scanner-result" class="scanner-result" style="display:none;"></div>

        <!-- Viewport del escáner -->
        <div class="scanner-card">
          <div class="scanner-viewport">
            <div class="scanner-corners">
              <span class="corner tl"></span>
              <span class="corner tr"></span>
              <span class="corner bl"></span>
              <span class="corner br"></span>
            </div>
            <div class="scanner-line"></div>
            <div id="scanner-center-icon" class="scanner-center-icon">
              <span class="scanner-big-icon">📷</span>
              <span class="scanner-waiting-text">Esperando lectura...</span>
            </div>
          </div>

          <!-- Input de escaneo -->
          <div class="scanner-input-group">
            <input
              id="scanner-input"
              type="text"
              class="scanner-input"
              placeholder="Ingrese o escanee código QR..."
              autocomplete="off"
              autofocus
            />
            <button
              class="btn-scan"
              onclick="ScannerComponent.process($('scanner-input').value, 'qr')"
            >
              📷 Escanear
            </button>
          </div>

          <p class="scanner-hint">
            💡 Prueba con QR: <code>QR-2026-001</code> o DNI: <code>72345678</code>
          </p>
        </div>

        <!-- Últimos registros -->
        ${this._lastRegistrationsHTML()}
      </div>`;

    /* ── Post-render: poblar lista y listener de Enter ── */
    ScannerComponent._actualizarListaReciente();

    const input = $('scanner-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const val = input.value.trim();
          if (val) ScannerComponent.process(val, 'qr');
        }
      });
      input.focus();
    }
  },

  /* ──────────────────────────────────────────────────────────
     2. renderBarcode — Escáner por Código de Barras
  ────────────────────────────────────────────────────────── */
  renderBarcode(container) {
    container.innerHTML = `
      <div class="scanner-view">
        <!-- Tabs de navegación -->
        ${this._tabsHTML('barcode')}

        <!-- Área de resultado (oculta hasta escaneo) -->
        <div id="scanner-result" class="scanner-result" style="display:none;"></div>

        <!-- Viewport del escáner -->
        <div class="scanner-card">
          <div class="scanner-viewport scanner-viewport--barcode">
            <div class="scanner-corners">
              <span class="corner tl"></span>
              <span class="corner tr"></span>
              <span class="corner bl"></span>
              <span class="corner br"></span>
            </div>
            <div class="scanner-line"></div>
            <div id="scanner-center-icon" class="scanner-center-icon">
              <span class="scanner-big-icon">▦</span>
              <span class="scanner-waiting-text">Esperando lectura...</span>
            </div>
          </div>

          <!-- Input de escaneo -->
          <div class="scanner-input-group">
            <input
              id="scanner-input"
              type="text"
              class="scanner-input"
              placeholder="Ingrese o escanee código de barras..."
              autocomplete="off"
              autofocus
            />
            <button
              class="btn-scan"
              onclick="ScannerComponent.process($('scanner-input').value, 'barcode')"
            >
              ▦ Escanear
            </button>
          </div>

          <p class="scanner-hint">
            💡 Prueba con QR: <code>QR-2026-001</code> o DNI: <code>72345678</code>
          </p>
        </div>

        <!-- Últimos registros -->
        ${this._lastRegistrationsHTML()}
      </div>`;

    /* ── Post-render: poblar lista y listener de Enter ── */
    ScannerComponent._actualizarListaReciente();

    const input = $('scanner-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const val = input.value.trim();
          if (val) ScannerComponent.process(val, 'barcode');
        }
      });
      input.focus();
    }
  },

  /* ──────────────────────────────────────────────────────────
     3. renderDNI — Teclado Numérico para DNI
  ────────────────────────────────────────────────────────── */
  renderDNI(container) {
    const keys = ['1','2','3','4','5','6','7','8','9','⌫','0','↵'];

    container.innerHTML = `
      <div class="scanner-view">
        <!-- Tabs de navegación -->
        ${this._tabsHTML('dni')}

        <!-- Área de resultado (oculta hasta escaneo) -->
        <div id="scanner-result" class="scanner-result" style="display:none;"></div>

        <!-- Panel DNI -->
        <div class="scanner-card scanner-card--dni">
          <div class="dni-display-wrapper">
            <label class="dni-label">🪪 Ingrese su DNI</label>
            <input
              id="scanner-input"
              type="text"
              class="scanner-input scanner-input--dni"
              placeholder="_ _ _ _ _ _ _ _"
              maxlength="8"
              readonly
            />
          </div>

          <!-- Teclado numérico -->
          <div class="dni-keypad">
            ${keys.map(key => {
              let cls = 'keypad-btn';
              if (key === '⌫') cls += ' keypad-btn--clear';
              if (key === '↵') cls += ' keypad-btn--enter';
              return `
                <button
                  class="${cls}"
                  onclick="ScannerComponent.keypadPress('${key}')"
                >${key}</button>`;
            }).join('')}
          </div>

          <p class="scanner-hint">
            💡 Prueba con DNI: <code>72345678</code>
          </p>
        </div>

        <!-- Últimos registros -->
        ${this._lastRegistrationsHTML()}
      </div>`;

    /* ── Post-render: poblar lista ── */
    ScannerComponent._actualizarListaReciente();
  },

  /* ──────────────────────────────────────────────────────────
     4. renderConfirm — Asistencias Registradas del Día
  ────────────────────────────────────────────────────────── */
  renderConfirm(container) {
    const today         = getToday();
    const asistencias   = DB.get('asistencias').filter(a => a.fecha === today);
    const beneficiarios = DB.get('beneficiarios');
    const users         = DB.get('users');

    /* ── Helpers de enriquecimiento ── */
    const findUser  = (dni) => users.find(u => u.dni === dni || u.id === dni) || {};
    const findBenef = (dni) => beneficiarios.find(b => b.dni === dni) || {};

    /* ── Estadísticas del día ── */
    const total      = asistencias.length;
    const totalBenef = beneficiarios.filter(b => b.estado === 'activo').length || 1;
    const pct        = totalBenef > 0 ? ((total / totalBenef) * 100).toFixed(1) : '0.0';
    const lastHora   = total > 0
      ? asistencias[asistencias.length - 1].hora || '--:--'
      : '--:--';

    /* ── Filas de la tabla ── */
    const filas = asistencias.map((a, i) => {
      const user  = findUser(a.dni || a.userId);
      const benef = findBenef(a.dni || a.userId);
      const nombre  = user.nombre  || benef.nombre  || 'Desconocido';
      const carrera = user.carrera || benef.carrera || '—';
      const dni     = a.dni || user.dni || '—';
      const initials = nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

      const methodColor = { qr: 'badge-success', barcode: 'badge-info', dni: 'badge-warning' };
      const badgeCls    = methodColor[a.metodo] || 'badge-info';

      return `
        <tr>
          <td class="text-muted">${i + 1}</td>
          <td>
            <div class="user-cell">
              <div class="avatar avatar--sm">${initials}</div>
              <div>
                <div class="user-name">${nombre}</div>
                <div class="text-muted text-sm">${dni}</div>
              </div>
            </div>
          </td>
          <td class="text-sm">${carrera}</td>
          <td><span class="time-badge">${a.hora || '--:--'}</span></td>
          <td>${statusBadge(a.metodo || 'manual', badgeCls)}</td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h2 class="view-title">✅ Asistencias del Día</h2>
          <p class="view-subtitle">Registros confirmados hoy — ${fmt(today)}</p>
        </div>
        <button class="btn btn-primary" onclick="navigateTo('scanner-qr')">
          ➕ Nuevo Registro
        </button>
      </div>

      <!-- Stat cards -->
      <div class="stats-grid stats-grid--3">
        <div class="stat-card stat-card--green">
          <div class="stat-icon">✅</div>
          <div class="stat-value">${total}</div>
          <div class="stat-label">Confirmados Hoy</div>
        </div>
        <div class="stat-card stat-card--blue">
          <div class="stat-icon">📊</div>
          <div class="stat-value">${pct}%</div>
          <div class="stat-label">Porcentaje de Asistencia</div>
        </div>
        <div class="stat-card stat-card--purple">
          <div class="stat-icon">🕐</div>
          <div class="stat-value">${lastHora}</div>
          <div class="stat-label">Último Registro</div>
        </div>
      </div>

      <!-- Tabla de asistencias -->
      <div class="card mt-4">
        <div class="card-header">
          <h3 class="card-title">📋 Detalle de Registros</h3>
          <span class="badge badge-success">${total} registros</span>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Estudiante</th>
                <th>Carrera</th>
                <th>Hora</th>
                <th>Método</th>
              </tr>
            </thead>
            <tbody>
              ${filas || `
                <tr>
                  <td colspan="5" class="text-center text-muted py-4">
                    No hay registros para hoy aún.
                  </td>
                </tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
  },
};
