const SUPABASE_URL = 'https://tzqghrtqckflkbtbmmqi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_zZBi0SuXZy1aSGcKIMoHqw_j5UF5_6-';

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; " +
    "script-src 'self' https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data:; " +
    "connect-src 'self' " + SUPABASE_URL + "; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "object-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

function conCabecerasSeguridad(response) {
  const headers = new Headers(response.headers);
  for (const k in SECURITY_HEADERS) {
    headers.set(k, SECURITY_HEADERS[k]);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let response;

    if (url.pathname === '/api/crear-pago' && request.method === 'POST') {
      response = await handleCrearPago(request, env, url.origin);
    } else if (url.pathname === '/api/webhook-stripe' && request.method === 'POST') {
      response = await handleWebhookStripe(request, env);
    } else {
      response = await env.ASSETS.fetch(request);
    }

    return conCabecerasSeguridad(response);
  }
};

// -----------------------------------------------------------------
// Validación de entrada (auditoría ELP-002 / ELP-009)
// -----------------------------------------------------------------

function fechaValidaYFutura(fecha) {
  if (typeof fecha !== 'string') return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!m) return false;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return false;
  const hoy = new Date();
  const hoyIso = hoy.getUTCFullYear() + '-' + String(hoy.getUTCMonth() + 1).padStart(2, '0') + '-' + String(hoy.getUTCDate()).padStart(2, '0');
  return fecha >= hoyIso;
}

function textoValido(v, maxLen) {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= maxLen;
}

function emailValido(v) {
  if (v === undefined || v === null || v === '') return true; // el email es opcional
  return typeof v === 'string' && v.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fechaYaOcupada(fecha) {
  const url = SUPABASE_URL + '/rest/v1/disponibilidad?fecha=eq.' + encodeURIComponent(fecha) + '&select=fecha';
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    },
  });
  if (!res.ok) return null; // no se ha podido comprobar; se trata como "desconocido"
  const data = await res.json();
  return Array.isArray(data) && data.length > 0;
}

// -----------------------------------------------------------------
// Crear el pago de la señal
// -----------------------------------------------------------------

async function handleCrearPago(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonError('Datos inválidos.', 400);
  }

  const { fecha, nombre, telefono, email, tipo_evento, lang } = body;

  if (!fechaValidaYFutura(fecha)) {
    return jsonError('La fecha indicada no es válida.', 400);
  }
  if (!textoValido(nombre, 120)) {
    return jsonError('El nombre no es válido.', 400);
  }
  if (!textoValido(telefono, 40)) {
    return jsonError('El teléfono no es válido.', 400);
  }
  if (!emailValido(email)) {
    return jsonError('El email no es válido.', 400);
  }
  if (tipo_evento !== undefined && tipo_evento !== null && tipo_evento !== '' &&
    (typeof tipo_evento !== 'string' || tipo_evento.length > 120)) {
    return jsonError('El tipo de evento no es válido.', 400);
  }

  let ocupada;
  try {
    ocupada = await fechaYaOcupada(fecha);
  } catch (e) {
    ocupada = null;
  }
  if (ocupada === true) {
    return jsonError('Ese día ya está reservado. Elige otra fecha.', 409);
  }

  if (!env.STRIPE_SECRET_KEY) {
    return jsonError('Falta el binding STRIPE_SECRET_KEY en wrangler.jsonc.', 500);
  }

  let stripeSecretKey;
  try {
    stripeSecretKey = await env.STRIPE_SECRET_KEY.get();
  } catch (e) {
    return jsonError('No se ha podido leer la clave secreta de Stripe.', 500);
  }
  if (!stripeSecretKey) {
    return jsonError('La clave secreta de Stripe está vacía.', 500);
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

  if (!stripeRes.ok) {
    // No reenviamos el texto interno de Stripe al cliente (ELP-009): con los
    // datos ya validados arriba, un fallo aquí es casi siempre de configuración.
    return jsonError('No se ha podido iniciar el pago. Inténtalo de nuevo en unos minutos.', 500);
  }

  const session = await stripeRes.json();

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

  // Idempotencia (auditoría P1-7): si Stripe reenvía el mismo evento
  // (reintentos, red lenta...), no queremos duplicar el email de aviso.
  if (!env.SUPABASE_SERVICE_KEY) {
    return new Response('Falta el binding SUPABASE_SERVICE_KEY.', { status: 500 });
  }
  let serviceKey;
  try {
    serviceKey = await env.SUPABASE_SERVICE_KEY.get();
  } catch (e) {
    return new Response('No se ha podido leer SUPABASE_SERVICE_KEY.', { status: 500 });
  }

  const yaProcesado = await eventoYaProcesado(serviceKey, event.id);
  if (yaProcesado === true) {
    return new Response(JSON.stringify({ received: true, duplicado: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object || {};
    const metadata = session.metadata || {};
    const fecha = metadata.fecha;

    if (fecha) {
      const email = session.customer_email ||
        (session.customer_details && session.customer_details.email) || null;

      const resultado = await guardarReservaEnSupabase(serviceKey, {
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

async function eventoYaProcesado(serviceKey, eventId) {
  var res = await fetch(SUPABASE_URL + '/rest/v1/stripe_events', {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': 'Bearer ' + serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ id: eventId }),
  });
  if (res.status === 409) return true; // ya existía esa id => evento repetido
  if (!res.ok) return null; // no se pudo comprobar; seguimos igualmente para no perder el evento
  return false;
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

async function guardarReservaEnSupabase(serviceKey, datos) {
  var res = await fetch(SUPABASE_URL + '/rest/v1/reservas', {
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
// Los campos escritos por el cliente se escapan antes de ir al HTML.
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
  var nombreSeguro = escapeHtml(datos.nombre);
  var fechaSegura = escapeHtml(datos.fecha);
  var mensajes = [];

  if (datos.email) {
    mensajes.push({
      from: remitente,
      to: [datos.email],
      subject: 'Tu reserva en EL PATIET — ' + datos.fecha,
      html:
        '<p>¡Hola' + (nombreSeguro ? ' ' + nombreSeguro : '') + '!</p>' +
        '<p>Tu señal para el día <strong>' + fechaSegura + '</strong> se ha recibido correctamente. Ese día queda reservado para vosotros.</p>' +
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
      '<li>Fecha: ' + fechaSegura + '</li>' +
      '<li>Nombre: ' + (nombreSeguro || '—') + '</li>' +
      '<li>Teléfono: ' + escapeHtml(datos.telefono || '—') + '</li>' +
      '<li>Tipo de evento: ' + escapeHtml(datos.tipo_evento || '—') + '</li>' +
      '<li>Email del cliente: ' + escapeHtml(datos.email || '—') + '</li>' +
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
