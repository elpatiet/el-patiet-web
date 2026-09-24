(function () {
  var SUPABASE_URL = 'https://tzqghrtqckflkbtbmmqi.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_zZBi0SuXZy1aSGcKIMoHqw_j5UF5_6-';
  var STRIPE_PUBLISHABLE_KEY = 'pk_test_51UJEswFH02hRXlyEvUwsiP2pAFDxZfiVC7QLJ3FjmPI6M1Iw7nCEZw8sGeWi6kv34p7Zy7T4VajNy3USrjW5Cvwb00b6Mr8nNF';
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
      noSelection: 'Elige un día libre en el calendario para reservarlo.',
      of: ' de ',
      formTitle: 'Datos de la reserva',
      formNote: 'Señal de prueba: 20,00 € (importe fijo mientras se define el precio real). No se cobra dinero real: estamos en modo de pruebas de Stripe.',
      labelNombre: 'Nombre y apellidos',
      labelTelefono: 'Teléfono / WhatsApp',
      labelEmail: 'Email',
      labelTipo: 'Tipo de celebración',
      tipoOptions: ['Cumpleaños infantil', 'Comida o quedada con amigos', 'Reunión de trabajo', 'Otro'],
      submit: 'Reservar y pagar señal',
      submitting: 'Conectando con el pago...',
      submitError: 'No se ha podido iniciar el pago. Inténtalo de nuevo.',
      requiredError: 'Completa al menos el nombre y el teléfono.'
    },
    va: {
      months: ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'],
      days: ['DL', 'DM', 'DC', 'DJ', 'DV', 'DS', 'DG'],
      loading: 'Carregant disponibilitat...',
      error: 'No s\'ha pogut carregar el calendari. Torna-ho a provar més tard.',
      free: 'Lliure',
      busy: 'Reservat',
      selectedPrefix: 'Dia seleccionat: ',
      noSelection: 'Tria un dia lliure al calendari per a reservar-lo.',
      of: ' de ',
      formTitle: 'Dades de la reserva',
      formNote: 'Senyal de prova: 20,00 € (import fix mentre es defineix el preu real). No es cobra diners real: estem en mode de proves de Stripe.',
      labelNombre: 'Nom i cognoms',
      labelTelefono: 'Telèfon / WhatsApp',
      labelEmail: 'Correu',
      labelTipo: 'Tipus de celebració',
      tipoOptions: ['Aniversari infantil', 'Dinar o trobada amb amics', 'Reunió de treball', 'Altre'],
      submit: 'Reservar i pagar senyal',
      submitting: 'Connectant amb el pagament...',
      submitError: 'No s\'ha pogut iniciar el pagament. Torna-ho a provar.',
      requiredError: 'Completa almenys el nom i el telèfon.'
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
    var firstWeekday = (new Date(y, m, 1).getDay() + 6) % 7;
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

  function prettyDate(iso) {
    var parts = iso.split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.getDate() + STR.of + STR.months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function updateSelection() {
    var box = document.getElementById('calSelection');
    var formWrap = document.getElementById('reservaFormWrap');
    if (!box) return;
    if (!state.selected) {
      box.textContent = STR.noSelection;
      if (formWrap) formWrap.style.display = 'none';
      return;
    }
    box.innerHTML = STR.selectedPrefix + '<strong>' + prettyDate(state.selected) + '</strong>';
    if (formWrap) formWrap.style.display = 'block';
    renderForm();
  }

  function renderForm() {
    var formWrap = document.getElementById('reservaFormWrap');
    if (!formWrap || formWrap.dataset.built === '1') return;
    formWrap.dataset.built = '1';

    var opts = STR.tipoOptions.map(function (o) { return '<option>' + o + '</option>'; }).join('');

    formWrap.innerHTML =
      '<h3>' + STR.formTitle + '</h3>' +
      '<div class="note" style="margin-bottom:14px;">' + STR.formNote + '</div>' +
      '<form id="reservaForm">' +
      '<label>' + STR.labelNombre + '</label>' +
      '<input type="text" id="rNombre" required>' +
      '<label>' + STR.labelTelefono + '</label>' +
      '<input type="tel" id="rTelefono" required>' +
      '<label>' + STR.labelEmail + '</label>' +
      '<input type="email" id="rEmail">' +
      '<label>' + STR.labelTipo + '</label>' +
      '<select id="rTipo">' + opts + '</select>' +
      '<button type="submit" class="btn btn-primary" id="rSubmit" style="margin-top:18px; width:100%; justify-content:center;">' + STR.submit + '</button>' +
      '<div class="note" id="rFormError" style="display:none; margin-top:12px; border-color:var(--balloon-red); color:var(--balloon-red);"></div>' +
      '</form>';

    document.getElementById('reservaForm').addEventListener('submit', onSubmitReserva);
  }

  function onSubmitReserva(e) {
    e.preventDefault();
    var nombre = document.getElementById('rNombre').value.trim();
    var telefono = document.getElementById('rTelefono').value.trim();
    var email = document.getElementById('rEmail').value.trim();
    var tipo = document.getElementById('rTipo').value;
    var errBox = document.getElementById('rFormError');
    var submitBtn = document.getElementById('rSubmit');

    if (!nombre || !telefono) {
      errBox.textContent = STR.requiredError;
      errBox.style.display = 'block';
      return;
    }
    errBox.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = STR.submitting;

    fetch('/api/crear-pago', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fecha: state.selected,
        nombre: nombre,
        telefono: telefono,
        email: email,
        tipo_evento: tipo,
        lang: lang
      })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.url) {
          window.location.href = data.url;
        } else {
          throw new Error(data && data.error ? data.error : 'error');
        }
      })
      .catch(function () {
        errBox.textContent = STR.submitError;
        errBox.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = STR.submit;
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('calendario')) return;
    renderShell();
    updateSelection();
    loadMonth();
  });
})();

