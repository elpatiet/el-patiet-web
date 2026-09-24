# -*- coding: utf-8 -*-
import os

ROOT = os.path.dirname(os.path.abspath(__file__))

NAV = [
    ("index", "Inicio", "Inici"),
    ("el-local", "El local", "El local"),
    ("galeria", "Galería", "Galeria"),
    ("precios", "Precios", "Preus"),
    ("reservar", "Reservar", "Reservar"),
    ("faq", "FAQ", "FAQ"),
    ("contacto", "Contacto", "Contacte"),
]

TITLES = {
    "index": ("EL PATIET — Alquiler de local con parque de bolas", "EL PATIET — Lloguer de local amb piscina de boles"),
    "el-local": ("El local — EL PATIET", "El local — EL PATIET"),
    "galeria": ("Galería — EL PATIET", "Galeria — EL PATIET"),
    "precios": ("Precios — EL PATIET", "Preus — EL PATIET"),
    "reservar": ("Reservar — EL PATIET", "Reservar — EL PATIET"),
    "faq": ("Preguntas frecuentes — EL PATIET", "Preguntes freqüents — EL PATIET"),
    "contacto": ("Contacto — EL PATIET", "Contacte — EL PATIET"),
    "condiciones": ("Condiciones y privacidad — EL PATIET", "Condicions i privacitat — EL PATIET"),
}

BALLOON_VARS = ["--brand", "--accent", "--balloon-green", "--balloon-pink", "--balloon-purple", "--balloon-turquoise"]


def asset_path(lang):
    return "assets/" if lang == "es" else "../assets/"


def page_href(lang, slug):
    # links to other pages within the SAME language
    return f"{slug}.html"


def lang_switch_html(lang, slug):
    if lang == "es":
        return f'''<div class="lang-switch">
          <a href="{slug}.html" aria-current="true">ES</a>
          <a href="va/{slug}.html">VA</a>
        </div>'''
    else:
        return f'''<div class="lang-switch">
          <a href="../{slug}.html">ES</a>
          <a href="{slug}.html" aria-current="true">VA</a>
        </div>'''


def base_page(lang, slug, body_html):
    title = TITLES[slug][0 if lang == "es" else 1]
    assets = asset_path(lang)
    nav_html = "\n".join(
        f'<li><a href="{page_href(lang, n[0])}"{" aria-current=\"page\"" if n[0] == slug else ""}>{n[1] if lang == "es" else n[2]}</a></li>'
        for n in NAV
    )
    footer_lang = "es" if lang == "es" else "va"
    condiciones_href = "condiciones.html" if lang == "es" else "condiciones.html"
    footer_labels = {
        "es": dict(sobre="Sobre EL PATIET", sobre_txt="Local privado con parque de bolas para alquilar por días completos: cumpleaños, comidas con amigos y reuniones de trabajo.",
                   contacto_h="Contacto", contacto_wapp="WhatsApp (pendiente)", contacto_mail="Email (pendiente)",
                   legal_h="Legal", legal_link="Condiciones y privacidad", rights="Todos los derechos reservados.",
                   draft="Sitio en construcción — versión de trabajo."),
        "va": dict(sobre="Sobre EL PATIET", sobre_txt="Local privat amb piscina de boles per a llogar per dies complets: aniversaris, dinars amb amics i reunions de treball.",
                   contacto_h="Contacte", contacto_wapp="WhatsApp (pendent)", contacto_mail="Correu (pendent)",
                   legal_h="Legal", legal_link="Condicions i privacitat", rights="Tots els drets reservats.",
                   draft="Lloc en construcció — versió de treball."),
    }[lang]

    return f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="EL PATIET: local privado con parque de bolas para alquilar por día completo.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%8E%88%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Work+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{assets}style.css">
</head>
<body>
<header class="site-header">
  <div class="container nav-row">
    <a href="{page_href(lang, 'index')}" class="logotype">
      <span>E</span><span>L</span><span> </span><span>P</span><span>A</span><span>T</span><span>I</span><span>E</span><span>T</span>
    </a>
    <nav>
      <ul class="nav-links">
        {nav_html}
      </ul>
    </nav>
    <div style="display:flex; align-items:center; gap:14px;">
      {lang_switch_html(lang, slug)}
      <button class="nav-toggle" aria-label="Menú"><span></span></button>
    </div>
  </div>
</header>

<main>
{body_html}
</main>

{'<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script><script src="' + assets + 'reservas.js"></script>' if slug == 'reservar' else ''}
<footer>
  <div class="container">
    <div class="footer-grid">
      <div>
        <h4>{footer_labels['sobre']}</h4>
        <p style="color:#C9D2E8; max-width:44ch;">{footer_labels['sobre_txt']}</p>
      </div>
      <div>
        <h4>{footer_labels['contacto_h']}</h4>
        <ul>
          <li>{footer_labels['contacto_wapp']}</li>
          <li>{footer_labels['contacto_mail']}</li>
        </ul>
      </div>
      <div>
        <h4>{footer_labels['legal_h']}</h4>
        <ul>
          <li><a href="{condiciones_href}">{footer_labels['legal_link']}</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>EL PATIET — {footer_labels['rights']}</span>
      <span>{footer_labels['draft']}</span>
    </div>
  </div>
</footer>
<script src="{assets}main.js"></script>
</body>
</html>
"""


def dots_row():
    return '<div class="eyebrow-balloons">' + "".join(
        f'<span style="background:var({v})"></span>' for v in BALLOON_VARS
    ) + "</div>"


# ---------------------------------------------------------------
# CONTENIDO POR PÁGINA
# ---------------------------------------------------------------

def content_index(lang):
    if lang == "es":
        return f"""
<section class="hero container">
  {dots_row()}
  <h1>Un espacio para tu celebración, tu comida con amigos o tu próxima reunión</h1>
  <p class="lead">EL PATIET es un local privado con parque de bolas que alquiláis entero, por un día completo, para lo que vosotros decidáis: un cumpleaños infantil, una comida con amigos o una reunión de trabajo.</p>
  <a href="reservar.html" class="btn btn-primary">Ver días disponibles</a>
  <a href="el-local.html" class="btn btn-ghost">Conoce el local</a>
</section>

<section class="container">
  <div class="use-row">
    <div class="use-card"><div class="dot" style="background:var(--brand)"></div><h3>Cumpleaños infantiles</h3><p>El parque de bolas y todo el espacio son vuestros durante el día, sin compartir turno con nadie más.</p></div>
    <div class="use-card"><div class="dot" style="background:var(--accent)"></div><h3>Comidas y quedadas</h3><p>Traed vuestra propia comida y disfrutad de un espacio tranquilo para el grupo, sin límite de mesas.</p></div>
    <div class="use-card"><div class="dot" style="background:var(--balloon-purple)"></div><h3>Reuniones de trabajo</h3><p>Una alternativa distinta a la sala de siempre, con espacio de sobra para el equipo.</p></div>
  </div>
</section>

<section class="section-alt">
  <div class="container">
    <h2>Qué encontrarás en el local</h2>
    <ul class="check-list">
      <li>Parque de bolas</li>
      <li>Mesas y sillas</li>
      <li>Nevera</li>
      <li>Barra</li>
      <li>Microondas</li>
      <li>Zona diferenciada para adultos</li>
    </ul>
    <div class="note"><strong>Nota:</strong> lista todavía en revisión — se ampliará cuando se confirmen todos los detalles del local.</div>
  </div>
</section>

<section class="container">
  <h2>Cómo funciona reservar</h2>
  <div class="steps">
    <div class="step"><h3>Elige tu día</h3><p>En el calendario ves al momento qué días están libres y cuáles ya están reservados.</p></div>
    <div class="step"><h3>Cuéntanos el plan</h3><p>Nombre, contacto y qué vais a celebrar. Nada más.</p></div>
    <div class="step"><h3>Confirma con la señal</h3><p>Pagas la señal online y el día queda solo para vosotros, al instante.</p></div>
  </div>
  <div class="note" style="margin-top:28px;"><strong>Esta web está en construcción.</strong> Los precios, las fotos y algunos datos de contacto son todavía provisionales.</div>
</section>
"""
    else:
        return f"""
<section class="hero container">
  {dots_row()}
  <h1>Un espai per a la teua celebració, el teu dinar amb amics o la teua pròxima reunió</h1>
  <p class="lead">EL PATIET és un local privat amb piscina de boles que llogueu sencer, per un dia complet, per al que vosaltres decidiu: un aniversari infantil, un dinar amb amics o una reunió de treball.</p>
  <a href="reservar.html" class="btn btn-primary">Veure dies disponibles</a>
  <a href="el-local.html" class="btn btn-ghost">Coneix el local</a>
</section>

<section class="container">
  <div class="use-row">
    <div class="use-card"><div class="dot" style="background:var(--brand)"></div><h3>Aniversaris infantils</h3><p>La piscina de boles i tot l'espai són vostres durant el dia, sense compartir torn amb ningú més.</p></div>
    <div class="use-card"><div class="dot" style="background:var(--accent)"></div><h3>Dinars i trobades</h3><p>Porteu el vostre propi menjar i gaudiu d'un espai tranquil per al grup, sense límit de taules.</p></div>
    <div class="use-card"><div class="dot" style="background:var(--balloon-purple)"></div><h3>Reunions de treball</h3><p>Una alternativa diferent a la sala de sempre, amb espai de sobra per a l'equip.</p></div>
  </div>
</section>

<section class="section-alt">
  <div class="container">
    <h2>Què trobaràs al local</h2>
    <ul class="check-list">
      <li>Piscina de boles</li>
      <li>Taules i cadires</li>
      <li>Nevera</li>
      <li>Barra</li>
      <li>Microones</li>
      <li>Zona diferenciada per a adults</li>
    </ul>
    <div class="note"><strong>Nota:</strong> llista encara en revisió — s'ampliarà quan es confirmen tots els detalls del local.</div>
  </div>
</section>

<section class="container">
  <h2>Com funciona reservar</h2>
  <div class="steps">
    <div class="step"><h3>Tria el teu dia</h3><p>Al calendari veus a l'instant quins dies estan lliures i quins ja estan reservats.</p></div>
    <div class="step"><h3>Conta'ns el pla</h3><p>Nom, contacte i què anireu a celebrar. Res més.</p></div>
    <div class="step"><h3>Confirma amb el senyal</h3><p>Pagues el senyal en línia i el dia queda només per a vosaltres, a l'instant.</p></div>
  </div>
  <div class="note" style="margin-top:28px;"><strong>Esta web està en construcció.</strong> Els preus, les fotos i algunes dades de contacte encara són provisionals.</div>
</section>
"""


def content_el_local(lang):
    if lang == "es":
        return """
<section class="container" style="padding-top:52px;">
  <h1>El local</h1>
  <p class="lead">Un espacio pensado para que quepa cualquier plan: desde una fiesta infantil hasta una comida de veinte personas.</p>

  <h2>Instalaciones</h2>
  <ul class="check-list">
    <li>Parque de bolas (edades admitidas: pendiente de confirmar)</li>
    <li>Mesas y sillas</li>
    <li>Nevera</li>
    <li>Barra</li>
    <li>Microondas</li>
    <li>Zona diferenciada para adultos</li>
    <li>Baños</li>
  </ul>
  <div class="note"><strong>Aforo máximo:</strong> pendiente de confirmar.</div>

  <h2>¿Qué podéis traer?</h2>
  <ul class="check-list">
    <li>Comida propia — pendiente de confirmar</li>
    <li>Bebida — pendiente de confirmar</li>
    <li>Tarta — pendiente de confirmar</li>
    <li>Decoración — pendiente de confirmar</li>
  </ul>

  <h2>Normas básicas</h2>
  <div class="note">Las normas del local (limpieza, supervisión de menores, uso del parque de bolas, daños y fianza) se publicarán aquí en cuanto estén cerradas.</div>
</section>
"""
    else:
        return """
<section class="container" style="padding-top:52px;">
  <h1>El local</h1>
  <p class="lead">Un espai pensat perquè hi càpiga qualsevol pla: des d'una festa infantil fins a un dinar de vint persones.</p>

  <h2>Instal·lacions</h2>
  <ul class="check-list">
    <li>Piscina de boles (edats admeses: pendent de confirmar)</li>
    <li>Taules i cadires</li>
    <li>Nevera</li>
    <li>Barra</li>
    <li>Microones</li>
    <li>Zona diferenciada per a adults</li>
    <li>Banys</li>
  </ul>
  <div class="note"><strong>Aforament màxim:</strong> pendent de confirmar.</div>

  <h2>Què podeu portar?</h2>
  <ul class="check-list">
    <li>Menjar propi — pendent de confirmar</li>
    <li>Beguda — pendent de confirmar</li>
    <li>Pastís — pendent de confirmar</li>
    <li>Decoració — pendent de confirmar</li>
  </ul>

  <h2>Normes bàsiques</h2>
  <div class="note">Les normes del local (neteja, supervisió de menors, ús de la piscina de boles, danys i fiança) es publicaran ací quan estiguen tancades.</div>
</section>
"""


def content_galeria(lang):
    tiles_es = ["Fachada", "Parque de bolas", "Mesas", "Zona de adultos", "Cocina", "Baños"]
    tiles_va = ["Façana", "Piscina de boles", "Taules", "Zona d'adults", "Cuina", "Banys"]
    tiles = tiles_es if lang == "es" else tiles_va
    colors = ["--brand", "--accent", "--balloon-green", "--balloon-pink", "--balloon-purple", "--balloon-turquoise"]
    grid = "\n".join(
        f'<div class="gallery-tile" style="background:var({colors[i]})">{tiles[i]}</div>'
        for i in range(len(tiles))
    )
    if lang == "es":
        return f"""
<section class="container" style="padding-top:52px;">
  <h1>Galería</h1>
  <p class="lead">Estas son las fotos que faltan por incorporar. De momento, un hueco de color por cada zona del local.</p>
  <div class="gallery-grid">{grid}</div>
  <div class="note" style="margin-top:24px;"><strong>Nota:</strong> las fotografías reales del local sustituirán a estos bloques de color en cuanto estén disponibles.</div>
</section>
"""
    else:
        return f"""
<section class="container" style="padding-top:52px;">
  <h1>Galeria</h1>
  <p class="lead">Estes són les fotos que falten per incorporar. De moment, un espai de color per cada zona del local.</p>
  <div class="gallery-grid">{grid}</div>
  <div class="note" style="margin-top:24px;"><strong>Nota:</strong> les fotografies reals del local substituiran estos blocs de color quan estiguen disponibles.</div>
</section>
"""


def content_precios(lang):
    if lang == "es":
        rows = [("Lunes a jueves", "A confirmar"), ("Viernes", "A confirmar"), ("Sábado", "A confirmar"),
                ("Domingo", "A confirmar"), ("Festivos", "A confirmar"), ("Vísperas de festivo", "A confirmar")]
        rows_html = "\n".join(f"<tr><td>{a}</td><td>{b}</td></tr>" for a, b in rows)
        return f"""
<section class="container" style="padding-top:52px;">
  <h1>Precios</h1>
  <p class="lead">El precio del alquiler cambia según el tipo de día. Se calcula automáticamente al elegir la fecha en el calendario de reservas.</p>
  <table class="price-table">
    <thead><tr><th>Tipo de día</th><th>Precio</th></tr></thead>
    <tbody>{rows_html}</tbody>
  </table>
  <div class="note"><strong>Señal:</strong> para confirmar la reserva se paga una señal online; el resto se acuerda con el local. Importe y forma de pago: pendiente de confirmar.</div>
  <div class="note"><strong>Extras:</strong> (por ejemplo, servicio de limpieza) pendientes de definir.</div>
</section>
"""
    else:
        rows = [("Dilluns a dijous", "A confirmar"), ("Divendres", "A confirmar"), ("Dissabte", "A confirmar"),
                ("Diumenge", "A confirmar"), ("Festius", "A confirmar"), ("Vespres de festiu", "A confirmar")]
        rows_html = "\n".join(f"<tr><td>{a}</td><td>{b}</td></tr>" for a, b in rows)
        return f"""
<section class="container" style="padding-top:52px;">
  <h1>Preus</h1>
  <p class="lead">El preu del lloguer canvia segons el tipus de dia. Es calcula automàticament en triar la data al calendari de reserves.</p>
  <table class="price-table">
    <thead><tr><th>Tipus de dia</th><th>Preu</th></tr></thead>
    <tbody>{rows_html}</tbody>
  </table>
  <div class="note"><strong>Senyal:</strong> per a confirmar la reserva es paga un senyal en línia; la resta s'acorda amb el local. Import i forma de pagament: pendent de confirmar.</div>
  <div class="note"><strong>Extres:</strong> (per exemple, servei de neteja) pendents de definir.</div>
</section>
"""


def content_reservar(lang):
    if lang == "es":
        return """
<section class="container" style="padding-top:52px;">
  <h1>Reservar</h1>
  <p class="lead">Elige un día libre en el calendario. El pago de la señal todavía no está conectado — eso llega en la siguiente fase.</p>
  <div class="reserve-shell">
    <div class="reserve-panel">
      <div id="calendario"></div>
      <div id="calSelection" class="note" style="margin-top:16px;"></div>
    </div>
    <div class="reserve-panel">
      <h3>Confirmar por ahora</h3>
      <p>Mientras el pago online no está activo, escríbenos con el día que ves libre y te confirmamos el resto.</p>
      <a href="contacto.html" class="btn btn-primary">Escribir por WhatsApp</a>
      <div class="note" style="margin-top:20px;">En cuanto el pago de la señal esté conectado, reservar y pagar se hará aquí mismo, sin pasar por WhatsApp.</div>
    </div>
  </div>
</section>
"""
    else:
        return """
<section class="container" style="padding-top:52px;">
  <h1>Reservar</h1>
  <p class="lead">Tria un dia lliure al calendari. El pagament del senyal encara no està connectat — arribarà en la següent fase.</p>
  <div class="reserve-shell">
    <div class="reserve-panel">
      <div id="calendario"></div>
      <div id="calSelection" class="note" style="margin-top:16px;"></div>
    </div>
    <div class="reserve-panel">
      <h3>Confirmar per ara</h3>
      <p>Mentre el pagament en línia no estiga actiu, escriu-nos amb el dia que veus lliure i et confirmem la resta.</p>
      <a href="contacto.html" class="btn btn-primary">Escriure per WhatsApp</a>
      <div class="note" style="margin-top:20px;">Quan el pagament del senyal estiga connectat, reservar i pagar es farà ací mateix, sense passar per WhatsApp.</div>
    </div>
  </div>
</section>
"""


def content_faq(lang):
    if lang == "es":
        faqs = [
            ("¿Puedo alquilar el local aunque no sea un cumpleaños infantil?",
             "Sí. El local se alquila completo por un día, para lo que decidáis: cumpleaños, comidas con amigos, reuniones de trabajo o cualquier otro plan."),
            ("¿Se reserva por horas o por el día completo?",
             "Por el día completo. No se reserva por horas ni turnos: el local es solo vuestro ese día, y el horario concreto de entrada y salida se acuerda con vosotros."),
            ("¿Puede haber dos reservas el mismo día?",
             "No. Cada día solo tiene una reserva; en cuanto se confirma, ese día deja de estar disponible para cualquier otra persona."),
            ("¿Qué incluye el alquiler?", "Respuesta pendiente de confirmar."),
            ("¿Cuántas personas pueden entrar?", "Respuesta pendiente de confirmar."),
            ("¿Qué edades admite el parque de bolas?", "Respuesta pendiente de confirmar."),
            ("¿Podemos llevar comida, bebida o tarta?", "Respuesta pendiente de confirmar."),
            ("¿Existe fianza?", "Respuesta pendiente de confirmar."),
            ("¿Qué ocurre si cancelamos la reserva?", "Respuesta pendiente de confirmar."),
        ]
        items = "\n".join(f'<details class="faq-item"><summary>{q}</summary><p>{a}</p></details>' for q, a in faqs)
        return f"""
<section class="container" style="padding-top:52px;">
  <h1>Preguntas frecuentes</h1>
  <div>{items}</div>
</section>
"""
    else:
        faqs = [
            ("Es pot llogar el local encara que no siga un aniversari infantil?",
             "Sí. El local es lloga sencer per un dia, per al que decidiu: aniversaris, dinars amb amics, reunions de treball o qualsevol altre pla."),
            ("Es reserva per hores o pel dia complet?",
             "Pel dia complet. No es reserva per hores ni torns: el local és només vostre eixe dia, i l'horari concret d'entrada i eixida s'acorda amb vosaltres."),
            ("Pot haver-hi dos reserves el mateix dia?",
             "No. Cada dia només té una reserva; quan es confirma, eixe dia deixa d'estar disponible per a qualsevol altra persona."),
            ("Què inclou el lloguer?", "Resposta pendent de confirmar."),
            ("Quantes persones poden entrar?", "Resposta pendent de confirmar."),
            ("Quines edats admet la piscina de boles?", "Resposta pendent de confirmar."),
            ("Podem portar menjar, beguda o pastís?", "Resposta pendent de confirmar."),
            ("Hi ha fiança?", "Resposta pendent de confirmar."),
            ("Què passa si cancel·lem la reserva?", "Resposta pendent de confirmar."),
        ]
        items = "\n".join(f'<details class="faq-item"><summary>{q}</summary><p>{a}</p></details>' for q, a in faqs)
        return f"""
<section class="container" style="padding-top:52px;">
  <h1>Preguntes freqüents</h1>
  <div>{items}</div>
</section>
"""


def content_contacto(lang):
    if lang == "es":
        return """
<section class="container" style="padding-top:52px;">
  <h1>Contacto</h1>
  <p class="lead">¿Tienes dudas o quieres reservar ya mismo? Escríbenos.</p>
  <div class="reserve-panel" style="max-width:480px;">
    <p><strong>WhatsApp:</strong> pendiente de confirmar</p>
    <p><strong>Teléfono:</strong> pendiente de confirmar</p>
    <p><strong>Email:</strong> pendiente de confirmar</p>
    <p><strong>Dirección:</strong> pendiente de confirmar</p>
    <div class="note">Mapa y redes sociales se añadirán aquí en cuanto estén disponibles.</div>
  </div>
</section>
"""
    else:
        return """
<section class="container" style="padding-top:52px;">
  <h1>Contacte</h1>
  <p class="lead">Tens dubtes o vols reservar ara mateix? Escriu-nos.</p>
  <div class="reserve-panel" style="max-width:480px;">
    <p><strong>WhatsApp:</strong> pendent de confirmar</p>
    <p><strong>Telèfon:</strong> pendent de confirmar</p>
    <p><strong>Correu:</strong> pendent de confirmar</p>
    <p><strong>Adreça:</strong> pendent de confirmar</p>
    <div class="note">El mapa i les xarxes socials s'afegiran ací quan estiguen disponibles.</div>
  </div>
</section>
"""


def content_condiciones(lang):
    if lang == "es":
        secciones = ["Aviso legal", "Política de privacidad", "Condiciones de reserva y cancelación", "Cookies"]
        blocks = "\n".join(f'<h2>{s}</h2><div class="note">Contenido pendiente de redactar y revisar por un profesional antes de publicarse.</div>' for s in secciones)
        return f"""
<section class="container" style="padding-top:52px;">
  <h1>Condiciones y privacidad</h1>
  {blocks}
</section>
"""
    else:
        secciones = ["Avís legal", "Política de privacitat", "Condicions de reserva i cancel·lació", "Galetes (cookies)"]
        blocks = "\n".join(f'<h2>{s}</h2><div class="note">Contingut pendent de redactar i revisar per un professional abans de publicar-se.</div>' for s in secciones)
        return f"""
<section class="container" style="padding-top:52px;">
  <h1>Condicions i privacitat</h1>
  {blocks}
</section>
"""


PAGES = {
    "index": content_index,
    "el-local": content_el_local,
    "galeria": content_galeria,
    "precios": content_precios,
    "reservar": content_reservar,
    "faq": content_faq,
    "contacto": content_contacto,
    "condiciones": content_condiciones,
}

for slug, fn in PAGES.items():
    for lang, folder in (("es", ROOT), ("va", os.path.join(ROOT, "va"))):
        body = fn(lang)
        html = base_page(lang, slug, body)
        path = os.path.join(folder, f"{slug}.html")
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)

print("Generadas", len(PAGES) * 2, "páginas.")
