export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/crear-pago' && request.method === 'POST') {
      return handleCrearPago(request, env, url.origin);
    }

    if (url.pathname === '/api/webhook-stripe' && request.method === 'POST') {
      return handleWebhookStripe(request, env);
    }

    // Cualquier otra ruta: servir los archivos estáticos normales
    return env.ASSETS.fetch(request);
  }
};

async function handleCrearPago(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonError('Datos inválidos.', 400);
  }

  const { fecha, nombre, telefono, email, tipo_evento, lang } = body;

  if (!fecha || !nombre || !telefono) {
    return jsonError('Faltan datos obligatorios (fecha, nombre, teléfono).', 400);
  }

  if (!env.STRIPE_SECRET_KEY) {
    return jsonError('Falta el binding STRIPE_SECRET_KEY en wrangler.jsonc.', 500);
  }

  let stripeSecretKey;
  try {
    stripeSecretKey = await env.STRIPE_SECRET_KEY.get();
  } catch (e) {
    return jsonError('No se ha podido leer la clave secreta de Stripe desde el Secrets Store.', 500);
  }
  if (!stripeSecretKey) {
    return jsonError('La clave secreta de Stripe está vacía en el Secrets Store.', 500);
  }

  const idioma = lang === 'va' ? 'va' : 'es';
  const successPath = idioma === 'va' ? '/va/reserva-confirmada.html' : '/reserva-confirmada.html';
  const cancelPath = idioma === 'va' ? '/va/reservar.html' : '/reservar.html';

  // IMPORTANTE: 2000 = 20,00€. Es un importe FIJO DE PRUEBA.
  // Cuando el negocio cierre precios y señal reales, este número (y toda la lógica
  // de precio por tipo de día) tiene que sustituirse por el cálculo real.
  const IMPORTE_SENAL_PRUEBA_CENTIMOS = 2000;

  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('success_url', `${origin}${successPath}?session_id={CHECKOUT_SESSION_ID}`);
  params.append('cancel_url', `${origin}${cancelPath}`);
  params.append('line_items[0][price_data][currency]', 'eur');
  params.append('line_items[0][price_data][product_data][name]', `Señal reserva EL PATIET — ${fecha} (PRUEBA)`);
  params.append('line_items[0][price_data][unit_amount]', String(IMPORTE_SENAL_PRUEBA_CENTIMOS));
  params.append('line_items[0][quantity]', '1');
  if (email) params.append('customer_email', email);
  params.append('metadata[fecha]', fecha);
  params.append('metadata[nombre]', nombre);
  params.append('metadata[telefono]', telefono);
  if (tipo_evento) params.append('metadata[tipo_evento]', tipo_evento);

  let stripeRes;
  try {
    stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
  } catch (e) {
    return jsonError('No se ha podido contactar con Stripe.', 502);
  }

  const session = await stripeRes.json();

  if (!stripeRes.ok) {
    return jsonError(session.error && session.error.message ? session.error.message : 'Error creando el pago.', 500);
  }

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status: status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// -----------------------------------------------------------------
// Webhook de Stripe: se dispara cuando un pago se completa de verdad.
// Aquí, y solo aquí, se escribe la reserva definitiva en Supabase.
// -----------------------------------------------------------------

async function handleWebhookStripe(request, env) {
  const signatureHeader = request.headers.get('Stripe-Signature');
  const rawBody = await request.text();

  if (!env.STRIPE_WEBHOOK_SECRET) {
    return new Response('Falta el binding STRIPE_WEBHOOK_SECRET.', { status: 500 });
  }

  let webhookSecret;
  try {
    webhookSecret = await env.STRIPE_WEBHOOK_SECRET.get();
  } catch (e) {
    return new Response('No se ha podido leer STRIPE_WEBHOOK_SECRET.', { status: 500 });
  }

  const valid = await verifyStripeSignature(rawBody, signatureHeader, webhookSecret);
  if (!valid) {
    return new Response('Firma no válida.', { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    return new Response('JSON inválido.', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object || {};
    const metadata = session.metadata || {};
    const fecha = metadata.fecha;

    if (fecha) {
      const email = session.customer_email ||
        (session.customer_details && session.customer_details.email) || null;

      const resultado = await guardarReservaEnSupabase(env, {
        fecha: fecha,
        nombre: metadata.nombre || null,
        telefono: metadata.telefono || null,
        tipo_evento: metadata.tipo_evento || null,
        email: email,
        stripe_payment_id: session.payment_intent || session.id || null,
      });

      if (!resultado.ok) {
        // No relanzamos error 500 a Stripe para evitar reintentos infinitos
        // en un caso de doble reserva; queda registrado en el cuerpo de la respuesta.
        return new Response(JSON.stringify({ received: true, aviso: resultado.mensaje }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // La reserva ya está guardada; un fallo de email nunca debe romper el webhook.
      try {
        await enviarConfirmaciones(env, {
          fecha: fecha,
          nombre: metadata.nombre || null,
          telefono: metadata.telefono || null,
          tipo_evento: metadata.tipo_evento || null,
          email: email,
        });
      } catch (e) {
        // se ignora: la reserva ya quedó guardada, el email es un extra
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function verifyStripeSignature(payload, signatureHeader, secret) {
  if (!signatureHeader) return false;

  var parts = {};
  signatureHeader.split(',').forEach(function (part) {
    var kv = part.split('=');
    parts[kv[0]] = kv[1];
  });
  var timestamp = parts.t;
  var v1 = parts.v1;
  if (!timestamp || !v1) return false;

  var signedPayload = timestamp + '.' + payload;
  var key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  var signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  var bytes = new Uint8Array(signatureBuffer);
  var computedHex = '';
  for (var i = 0; i < bytes.length; i++) {
    computedHex += bytes[i].toString(16).padStart(2, '0');
  }
  return computedHex === v1;
}

async function guardarReservaEnSupabase(env, datos) {
  if (!env.SUPABASE_SERVICE_KEY) {
    return { ok: false, mensaje: 'Falta el binding SUPABASE_SERVICE_KEY.' };
  }
  var serviceKey;
  try {
    serviceKey = await env.SUPABASE_SERVICE_KEY.get();
  } catch (e) {
    return { ok: false, mensaje: 'No se ha podido leer SUPABASE_SERVICE_KEY.' };
  }

  var res = await fetch('https://tzqghrtqckflkbtbmmqi.supabase.co/rest/v1/reservas', {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': 'Bearer ' + serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      fecha: datos.fecha,
      estado: 'confirmada',
      nombre_responsable: datos.nombre,
      telefono: datos.telefono,
      email: datos.email,
      tipo_evento: datos.tipo_evento,
      stripe_payment_id: datos.stripe_payment_id,
    }),
  });

  if (!res.ok) {
    var texto = await res.text();
    return { ok: false, mensaje: 'Supabase rechazó la reserva (posible fecha ya ocupada): ' + texto };
  }
  return { ok: true };
}

// -----------------------------------------------------------------
// Emails de confirmación (Resend). Un fallo aquí nunca debe impedir
// que la reserva quede guardada — por eso se llama siempre después.
// -----------------------------------------------------------------

async function enviarConfirmaciones(env, datos) {
  if (!env.RESEND_API_KEY) return;
  var apiKey;
  try {
    apiKey = await env.RESEND_API_KEY.get();
  } catch (e) {
    return;
  }

  var remitente = 'EL PATIET <reservas@elpatiet.es>';
  var mensajes = [];

  if (datos.email) {
    mensajes.push({
      from: remitente,
      to: [datos.email],
      subject: 'Tu reserva en EL PATIET — ' + datos.fecha,
      html:
        '<p>¡Hola' + (datos.nombre ? ' ' + datos.nombre : '') + '!</p>' +
        '<p>Tu señal para el día <strong>' + datos.fecha + '</strong> se ha recibido correctamente. Ese día queda reservado para vosotros.</p>' +
        '<p>En breve os contactaremos para concretar los últimos detalles.</p>' +
        '<p>— EL PATIET</p>',
    });
  }

  mensajes.push({
    from: remitente,
    to: ['elpatietlocal@gmail.com'],
    subject: 'Nueva reserva pagada — ' + datos.fecha,
    html:
      '<p>Nueva reserva confirmada:</p>' +
      '<ul>' +
      '<li>Fecha: ' + datos.fecha + '</li>' +
      '<li>Nombre: ' + (datos.nombre || '—') + '</li>' +
      '<li>Teléfono: ' + (datos.telefono || '—') + '</li>' +
      '<li>Tipo de evento: ' + (datos.tipo_evento || '—') + '</li>' +
      '<li>Email del cliente: ' + (datos.email || '—') + '</li>' +
      '</ul>',
  });

  for (var i = 0; i < mensajes.length; i++) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mensajes[i]),
      });
    } catch (e) {
      // seguimos con el siguiente email aunque uno falle
    }
  }
}
