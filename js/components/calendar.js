/* ============================================================
   components/calendar.js — Componente Calendario
   ============================================================
   Renderiza un calendario mensual interactivo que colorea
   los días según asistencia, ausencia o justificación.
   
   Uso:
     CalendarComponent.render('mi-contenedor', 7, 2026, asistencias, ausencias, true)
   ============================================================ */

const CalendarComponent = {

  // Mes y año actualmente mostrado (estado local del componente)
  _mes: null,
  _año: null,

  // Referencia al contenedor y datos actuales (para re-render)
  _containerId: null,
  _asistencias: [],
  _ausencias:   [],

  /**
   * Renderiza el calendario en el contenedor dado.
   * @param {string}  containerId — ID del elemento DOM
   * @param {number}  month       — 1-12
   * @param {number}  year        — Año YYYY
   * @param {Array}   asistencias — registros de asistencia [{fecha:'YYYY-MM-DD', ...}]
   * @param {Array}   ausencias   — registros de ausencia   [{fecha:'YYYY-MM-DD', justificado:bool, ...}]
   * @param {boolean} showNav     — muestra botones ◀ ▶ para cambiar mes
   */
  render(containerId, month, year, asistencias = [], ausencias = [], showNav = false) {
    const el = $(containerId);
    if (!el) return;

    // Guardar estado para re-renders al navegar
    this._containerId = containerId;
    this._mes         = month;
    this._año         = year;
    this._asistencias = asistencias;
    this._ausencias   = ausencias;
    this._showNav     = showNav;

    const MESES    = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const DIAS     = ['Lu','Ma','Mi','Ju','Vi','Sa','Do'];
    const today    = getToday();

    // Pre-computar sets para O(1) lookup
    const attended = new Set(asistencias.map(a => a.fecha));
    const absentMap = {};
    ausencias.forEach(a => { if (a.fecha) absentMap[a.fecha] = a.justificado; });

    // Calcular primer día de semana y total de días
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=Dom
    const daysInMonth    = new Date(year, month, 0).getDate();
    const offset         = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Lunes=0

    // Generar celdas del encabezado
    const headers = DIAS.map(d => `<div class="cal-day-header">${d}</div>`).join('');

    // Celdas vacías al inicio
    let cells = Array(offset).fill('<div class="cal-day empty"></div>').join('');

    // Celdas de días
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      let cls = '';
      if (dateStr === today)            cls = 'today';
      else if (attended.has(dateStr))   cls = 'attended';
      else if (dateStr in absentMap)    cls = absentMap[dateStr] ? 'justified' : 'absent';

      cells += `<div class="cal-day ${cls}" title="${dateStr}">${d}</div>`;
    }

    // Navegación (opcional)
    const nav = showNav
      ? `<div class="cal-nav">
           <button class="btn btn-ghost btn-sm" onclick="CalendarComponent.changeMonth(-1)">◀</button>
           <h3>${MESES[month - 1]} ${year}</h3>
           <button class="btn btn-ghost btn-sm" onclick="CalendarComponent.changeMonth(1)">▶</button>
         </div>`
      : `<div class="cal-nav"><h3>${MESES[month - 1]} ${year}</h3></div>`;

    el.innerHTML = `
      ${nav}
      <div class="cal-grid">${headers}${cells}</div>`;
  },

  /**
   * Avanza o retrocede el mes actual y re-renderiza.
   * @param {number} dir — 1 (adelante) o -1 (atrás)
   */
  changeMonth(dir) {
    this._mes += dir;
    if (this._mes > 12) { this._mes = 1;  this._año++; }
    if (this._mes < 1)  { this._mes = 12; this._año--; }
    this.render(this._containerId, this._mes, this._año, this._asistencias, this._ausencias, this._showNav);
  },
};
