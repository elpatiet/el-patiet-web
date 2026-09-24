(function () {
  var SUPABASE_URL = 'https://tzqghrtqckflkbtbmmqi.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_zZBi0SuXZy1aSGcKIMoHqw_j5UF5_6-';
  var lang = document.documentElement.lang === 'va' ? 'va' : 'es';

  var STRINGS = {
    es: {
      months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
      days: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
      loading: 'Cargando disponibilidad...',
      error: 'No se ha podido cargar el calendario. Inténtalo de nuevo más tarde.',
      free: 'Libre',
      busy: 'Reservado',
      selectedPrefix: 'Día seleccionado: ',
      noSelection: 'Elige un día libre en el calendario.',
      of: ' de '
    },
    va: {
      months: ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'],
      days: ['DL', 'DM', 'DC', 'DJ', 'DV', 'DS', 'DG'],
      loading: 'Carregant disponibilitat...',
      error: 'No s\'ha pogut carregar el calendari. Torna-ho a provar més tard.',
      free: 'Lliure',
      busy: 'Reservat',
      selectedPrefix: 'Dia seleccionat: ',
      noSelection: 'Tria un dia lliure al calendari.',
      of: ' de '
    }
  };
  var STR = STRINGS[lang];

  var client = null;
  if (window.supabase && window.supabase.createClient) {
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }

  var state = { viewDate: new Date(), busyDates: {}, selected: null };

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function isoDate(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }

  function renderShell() {
    var cal = document.getElementById('calendario');
    if (!cal) return;
    cal.innerHTML =
      '<div class="cal-head">' +
      '<button type="button" id="calPrev" aria-label="Anterior">&lsaquo;</button>' +
      '<strong id="calLabel"></strong>' +
      '<button type="button" id="calNext" aria-label="Siguiente">&rsaquo;</button>' +
      '</div>' +
      '<div class="cal-grid" id="calGrid"></div>' +
      '<div class="cal-legend">' +
      '<span><i class="cal-dot free"></i> ' + STR.free + '</span>' +
      '<span><i class="cal-dot busy"></i> ' + STR.busy + '</span>' +
      '</div>';
    document.getElementById('calPrev').addEventListener('click', function () { changeMonth(-1); });
    document.getElementById('calNext').addEventListener('click', function () { changeMonth(1); });
  }

  function changeMonth(delta) {
    state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() + delta, 1);
    loadMonth();
  }

  function loadMonth() {
    var y = state.viewDate.getFullYear();
    var m = state.viewDate.getMonth();
    var label = document.getElementById('calLabel');
    if (label) label.textContent = STR.months[m] + ' ' + y;
    var grid = document.getElementById('calGrid');
    if (grid) grid.innerHTML = '<p class="cal-status">' + STR.loading + '</p>';

    if (!client) {
      if (grid) grid.innerHTML = '<p class="cal-status">' + STR.error + '</p>';
      return;
    }

    var first = isoDate(y, m, 1);
    var last = isoDate(y, m, new Date(y, m + 1, 0).getDate());

    client.from('disponibilidad').select('*').gte('fecha', first).lte('fecha', last)
      .then(function (res) {
        if (res.error) {
          if (grid) grid.innerHTML = '<p class="cal-status">' + STR.error + '</p>';
          return;
        }
        state.busyDates = {};
        (res.data || []).forEach(function (row) { state.busyDates[row.fecha] = row.estado; });
        drawGrid(y, m);
      })
      .catch(function () {
        if (grid) grid.innerHTML = '<p class="cal-status">' + STR.error + '</p>';
      });
  }

  function drawGrid(y, m) {
    var grid = document.getElementById('calGrid');
    if (!grid) return;
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var firstWeekday = (new Date(y, m, 1).getDay() + 6) % 7; // lunes = 0
    var html = '';
    for (var w = 0; w < STR.days.length; w++) html += '<span class="cal-dow">' + STR.days[w] + '</span>';
    for (var i = 0; i < firstWeekday; i++) html += '<span class="cal-empty"></span>';

    var now = new Date();
    var todayIso = isoDate(now.getFullYear(), now.getMonth(), now.getDate());

    for (var d = 1; d <= daysInMonth; d++) {
      var iso = isoDate(y, m, d);
      var busy = !!state.busyDates[iso];
      var past = iso < todayIso;
      var cls = 'cal-day';
      if (busy) cls += ' busy';
      else if (past) cls += ' past';
      else cls += ' free';
      if (state.selected === iso) cls += ' selected';
      html += '<button type="button" class="' + cls + '" data-date="' + iso + '"' + (busy || past ? ' disabled' : '') + '>' + d + '</button>';
    }
    grid.innerHTML = html;

    var freeButtons = grid.querySelectorAll('.cal-day.free');
    for (var b = 0; b < freeButtons.length; b++) {
      freeButtons[b].addEventListener('click', (function (btn) {
        return function () {
          state.selected = btn.getAttribute('data-date');
          drawGrid(y, m);
          updateSelection();
        };
      })(freeButtons[b]));
    }
  }

  function updateSelection() {
    var box = document.getElementById('calSelection');
    if (!box) return;
    if (!state.selected) { box.textContent = STR.noSelection; return; }
    var parts = state.selected.split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    var pretty = d.getDate() + STR.of + STR.months[d.getMonth()] + ' ' + d.getFullYear();
    box.innerHTML = STR.selectedPrefix + '<strong>' + pretty + '</strong>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('calendario')) return;
    renderShell();
    updateSelection();
    loadMonth();
  });
})();
