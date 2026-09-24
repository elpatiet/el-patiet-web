# EL PATIET — esqueleto de la web (Fase 1)

Esto es la Fase 1 del plan: el esqueleto estático de páginas, en castellano y
valenciano, con el contenido que ya sabíamos seguro y avisos claros donde
falta información real. No incluye todavía el calendario funcional ni el
pago (eso es Fase 2 en adelante, y depende de que Alberto responda el
cuestionario).

## Qué hay dentro

- `index.html`, `el-local.html`, `galeria.html`, `precios.html`,
  `reservar.html`, `faq.html`, `contacto.html`, `condiciones.html` — versión
  en castellano.
- `va/` — las mismas páginas en valenciano.
- `assets/style.css` y `assets/main.js` — estilo y comportamiento
  compartidos por todas las páginas.
- `build.py` — el script que generó las 16 páginas. Si quieres cambiar un
  texto en varias páginas a la vez, es más fácil editar aquí y volver a
  ejecutar `python3 build.py` que tocar cada .html a mano.

## Qué es real y qué es placeholder

Real (ya decidido en las conversaciones): el local se alquila completo por
día, no por horas; una reserva bloquea el día para cualquier otro cliente;
el enfoque no es solo cumpleaños infantiles, también comidas y reuniones de
trabajo; el equipamiento conocido (parque de bolas, mesas, sillas, nevera,
barra, microondas).

Placeholder (marcado como "pendiente de confirmar" en el propio texto):
precios, aforo, teléfono/WhatsApp/email/dirección, normas del local, fotos
reales (ahora mismo son bloques de color con el nombre de lo que debería
haber), y todo el contenido legal.

La página "Reservar" muestra una vista previa del calendario solo a modo de
ejemplo (con fechas inventadas) para que se vea el aspecto que tendrá — no
es todavía funcional.

## Diseño

Colores y tipografía basados en el brief real del logo (letras-globo):
azul como color principal, naranja como acento, y el resto de colores del
logo (amarillo, rojo, verde, rosa, morado, turquesa) usados con moderación
en detalles puntuales para no saturar la web. Tipografía: Fredoka para
títulos (con ese aire redondeado de globo) y Work Sans para el texto, que
es más neutra — para que la web funcione tanto para una fiesta infantil
como para una reunión de trabajo.

Nota técnica: la vista previa que yo mismo puedo generar en este entorno usa
un motor de renderizado antiguo que no soporta bien CSS Grid, así que en mis
capturas algunas filas (las tres tarjetas de "cumpleaños/comidas/reuniones",
el calendario de ejemplo) se ven apiladas en una sola columna. Es una
limitación de mi herramienta de comprobación, no del código: en cualquier
navegador actual (Chrome, Safari, Firefox, Edge) se verán en columnas como
está pensado. Aun así, conviene que lo abras tú en un navegador de verdad en
cuanto puedas, para confirmarlo con tus propios ojos.

## Cómo publicarlo (misma receta que Orkya)

1. Crea un repositorio nuevo en GitHub solo para esta web.
2. Sube todo el contenido de esta carpeta a la raíz del repositorio (no
   dentro de una carpeta adicional).
3. En Cloudflare Pages: conecta el repositorio y despliega (framework:
   "None" / sin comando de build).
4. Pruébalo en el móvil y en el ordenador antes de conectar el dominio
   definitivo.

## Qué falta (siguientes fases del plan)

Fase 2 en adelante: base de reservas en Supabase, calendario funcional,
pago de la señal con Stripe, mini página de administración, contenido y
precios reales, y revisión legal de las condiciones — todo pendiente de que
Alberto cierre el cuestionario.
