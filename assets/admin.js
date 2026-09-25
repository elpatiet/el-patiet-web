(function () {
  var SUPABASE_URL = 'https://tzqghrtqckflkbtbmmqi.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_zZBi0SuXZy1aSGcKIMoHqw_j5UF5_6-';
  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  var loginBox = document.getElementById('loginBox');
  var panelBox = document.getElementById('panelBox');
  var userEmail = document.getElementById('userEmail');

  function showPanel(session) {
    loginBox.style.display = 'none';
    panelBox.style.display = 'block';
    userEmail.textContent = session.user.email;
    cargarReservas();
  }

  function showLogin() {
    loginBox.style.display = 'block';
    panelBox.style.display = 'none';
  }

  client.auth.getSession().then(function (res) {
    if (res.data.session) showPanel(res.data.session);
    else showLogin();
  });

  document.getElementById('loginBtn').addEventListener('click', function () {
    var email = document.getElementById('adminEmail').value.trim();
    var password = document.getElementById('adminPassword').value;
    var errBox = document.getElementById('loginError');
    errBox.style.display = 'none';

    client.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
      if (res.error) {
        errBox.textContent = 'No se ha podido entrar: ' + res.error.message;
        errBox.style.display = 'block';
        return;
      }
      showPanel(res.data.session);
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', function () {
    client.auth.signOut().then(function () { showLogin(); });
  });

  document.getElementById('addForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var errBox = document.getElementById('addError');
    errBox.style.display = 'none';

    var registro = {
      fecha: document.getElementById('fFecha').value,
      estado: document.getElementById('fEstado').value,
      nombre_responsable: document.getElementById('fNombre').value || null,
      telefono: document.getElementById('fTelefono').value || null,
      tipo_evento: document.getElementById('fTipo').value || null
    };

    client.from('reservas').insert(registro).then(function (res) {
      if (res.error) {
        errBox.textContent = 'No se ha podido guardar (¿ese día ya está ocupado?): ' + res.error.message;
        errBox.style.display = 'block';
        return;
      }
      document.getElementById('addForm').reset();
      cargarReservas();
    });
  });

  function cargarReservas() {
    var hoy = new Date().toISOString().slice(0, 10);
    client.from('reservas').select('*').gte('fecha', hoy).order('fecha').then(function (res) {
      var cont = document.getElementById('listaReservas');
      cont.innerHTML = ''; // limpiar de forma segura (sin datos externos involucrados)

      if (res.error) {
        var pErr = document.createElement('p');
        pErr.className = 'note';
        pErr.textContent = 'No se han podido cargar las reservas.';
        cont.appendChild(pErr);
        return;
      }
      if (!res.data || res.data.length === 0) {
        var pVacio = document.createElement('p');
        pVacio.className = 'note';
        pVacio.textContent = 'No hay reservas próximas.';
        cont.appendChild(pVacio);
        return;
      }

      var table = document.createElement('table');
      table.className = 'price-table';
      var thead = document.createElement('thead');
      var headRow = document.createElement('tr');
      ['Fecha', 'Estado', 'Nombre', 'Teléfono', 'Tipo', ''].forEach(function (texto) {
        var th = document.createElement('th');
        th.textContent = texto;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      res.data.forEach(function (r) {
        var tr = document.createElement('tr');
        [r.fecha, r.estado, r.nombre_responsable || '—', r.telefono || '—', r.tipo_evento || '—'].forEach(function (valor) {
          var td = document.createElement('td');
          td.textContent = valor; // textContent: nunca se interpreta como HTML
          tr.appendChild(td);
        });

        var tdBtn = document.createElement('td');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-ghost';
        btn.style.padding = '6px 12px';
        btn.style.fontSize = '0.85rem';
        btn.textContent = 'Liberar';
        btn.addEventListener('click', function () {
          if (!confirm('¿Liberar esta fecha?')) return;
          client.from('reservas').delete().eq('id', r.id).then(function () { cargarReservas(); });
        });
        tdBtn.appendChild(btn);
        tr.appendChild(tdBtn);

        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      cont.appendChild(table);
    });
  }
})();
