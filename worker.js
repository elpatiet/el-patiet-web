export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/crear-pago' && request.method === 'POST') {
      return handleCrearPago(request, env, url.origin);
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
