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
      if (res.error) {
        cont.innerHTML = '<p class="note">No se han podido cargar las reservas.</p>';
        return;
      }
      if (!res.data || res.data.length === 0) {
        cont.innerHTML = '<p class="note">No hay reservas próximas.</p>';
        return;
      }
      var html = '<table class="price-table"><thead><tr><th>Fecha</th><th>Estado</th><th>Nombre</th><th>Teléfono</th><th>Tipo</th><th></th></tr></thead><tbody>';
      res.data.forEach(function (r) {
        html += '<tr>' +
          '<td>' + r.fecha + '</td>' +
          '<td>' + r.estado + '</td>' +
          '<td>' + (r.nombre_responsable || '—') + '</td>' +
          '<td>' + (r.telefono || '—') + '</td>' +
          '<td>' + (r.tipo_evento || '—') + '</td>' +
          '<td><button type="button" class="btn btn-ghost" data-id="' + r.id + '" style="padding:6px 12px; font-size:0.85rem;">Liberar</button></td>' +
          '</tr>';
      });
      html += '</tbody></table>';
      cont.innerHTML = html;

      var botones = cont.querySelectorAll('button[data-id]');
      for (var i = 0; i < botones.length; i++) {
        botones[i].addEventListener('click', function () {
          var id = this.getAttribute('data-id');
          if (!confirm('¿Liberar esta fecha?')) return;
          client.from('reservas').delete().eq('id', id).then(function () { cargarReservas(); });
        });
      }
    });
  }
})();
