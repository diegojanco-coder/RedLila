import { Link } from 'react-router-dom';

const formas = [
  ['Psicológica', 'Insultos, humillaciones, amenazas, vigilancia, aislamiento o control de tus decisiones.'],
  ['Física', 'Empujones, golpes, sujeciones u otras acciones que dañan o ponen en riesgo el cuerpo.'],
  ['Sexual', 'Cualquier acto o contacto sexual sin consentimiento libre. Una relación previa no equivale a consentimiento.'],
  ['Económica y patrimonial', 'Controlar tus ingresos, impedirte trabajar o estudiar, quitarte dinero o dañar tus pertenencias.'],
  ['Digital', 'Revisar dispositivos sin permiso, exigir contraseñas, vigilar tu ubicación o acosarte por medios digitales.']
];

const recomendaciones = [
  ['Prioriza tu seguridad', 'Si hay peligro inmediato, intenta llegar a un lugar seguro y contacta a emergencias cuando puedas hacerlo sin aumentar el riesgo.'],
  ['Busca una persona de confianza', 'Puedes contar lo que sucede a alguien que respete tus decisiones y te acompañe sin presionarte.'],
  ['Elige cómo pedir apoyo', 'Si compartir el teléfono no es seguro, considera usar un dispositivo de confianza o acudir personalmente a un servicio.'],
  ['Conserva información solo si es seguro', 'Guardar mensajes o anotar fechas puede servirte más adelante. No lo hagas si alguien revisa tu dispositivo o esto te expone a mayor peligro.'],
  ['Acude a servicios especializados', 'En Bolivia puedes consultar la FELCV, los Servicios Legales Integrales Municipales (SLIM) y los contactos de tu departamento.']
];

export default function Informacion() {
  return (
    <article className="info-page" aria-labelledby="info-title">
      <div className="info-intro-layout">
        <header className="page-intro">
          <p className="eyebrow">Sección B · Aprende y encuentra recursos</p>
          <h1 id="info-title">Información para reconocer la violencia</h1>
          <p className="lead">La violencia puede presentarse de distintas maneras y afectar la libertad, la seguridad y las decisiones de una mujer. Reconocer conductas dañinas puede ayudar a buscar orientación; ninguna situación es culpa de quien la vive.</p>
        </header>
        <figure className="info-intro-art">
          <img src="/images/redlila-apoyo.webp" width="1536" height="1024" alt="Ilustración de dos mujeres bolivianas conversando en un espacio de apoyo" decoding="async" />
          <figcaption>Hablar también puede ser un primer paso.</figcaption>
        </figure>
      </div>

      <section className="info-block" aria-labelledby="formas-title">
        <div className="section-heading"><p className="eyebrow">Identificar señales</p><h2 id="formas-title">Algunas formas de violencia</h2><p>Las formas pueden combinarse. Esta lista es educativa y no pretende evaluar ni diagnosticar una situación.</p></div>
        <div className="info-type-grid">
          {formas.map(([titulo, texto], indice) => <article className="info-type-card" key={titulo}><span className="feature-number">0{indice + 1}</span><h3>{titulo}</h3><p>{texto}</p></article>)}
        </div>
      </section>

      <section className="info-block" aria-labelledby="apoyo-title">
        <div className="section-heading"><p className="eyebrow">Opciones a tu ritmo</p><h2 id="apoyo-title">Si te preocupa algo que estás viviendo</h2><p>No tienes que tomar todas las decisiones hoy. Puedes escoger el paso que te resulte posible y seguro.</p></div>
        <div className="recommendation-list">
          {recomendaciones.map(([titulo, texto], indice) => <article className="recommendation-card" key={titulo}><span className="recommendation-index">{String(indice + 1).padStart(2, '0')}</span><div><h3>{titulo}</h3><p>{texto}</p></div></article>)}
        </div>
        <aside className="info-callout"><strong>Si estás en peligro inmediato:</strong> llama a la Policía al 110 desde un lugar seguro. También puedes revisar las <Link to="/ayuda">líneas nacionales y contactos regionales</Link>. La disponibilidad de los servicios puede variar.</aside>
      </section>

      <section className="info-block" aria-labelledby="derechos-title">
        <div className="section-heading"><p className="eyebrow">Marco de referencia</p><h2 id="derechos-title">Derechos y recursos en Bolivia</h2><p>La Ley N.º 348 establece mecanismos de prevención, atención, protección y reparación para las mujeres en situación de violencia. Consulta el texto y los materiales informativos en las fuentes enlazadas.</p></div>
        <div className="resource-grid">
          <a className="resource-card" href="https://bolivia.unfpa.org/es/publicaciones/ley-integral-para-garantizar-a-las-mujeres-una-vida-libre-de-violencia-ley-n%C2%BA-348-del-9" target="_blank" rel="noopener noreferrer"><span className="resource-label">LEGISLACIÓN · BOLIVIA</span><h3>Ley N.º 348</h3><p>Texto de la Ley Integral para Garantizar a las Mujeres una Vida Libre de Violencia, publicada por UNFPA Bolivia.</p><span className="resource-link">Consultar recurso ↗</span></a>
          <a className="resource-card" href="https://www.who.int/es/news-room/fact-sheets/detail/violence-against-women" target="_blank" rel="noopener noreferrer"><span className="resource-label">SALUD PÚBLICA · OMS</span><h3>Violencia contra la mujer</h3><p>Definiciones, formas de violencia, efectos en la salud y respuesta del sector sanitario.</p><span className="resource-link">Leer ficha informativa ↗</span></a>
          <Link className="resource-card resource-card-internal" to="/ayuda"><span className="resource-label">DIRECTORIO · BOLIVIA</span><h3>Contactos de apoyo</h3><p>Consulta líneas nacionales y recursos publicados para los nueve departamentos.</p><span className="resource-link">Abrir directorio ↗</span></Link>
        </div>
      </section>

      <section className="info-quiz-cta"><div><p className="eyebrow">Una herramienta educativa</p><h2>¿Quieres explorar el Violentómetro?</h2><p>Responde a tu ritmo. El resultado orienta y no reemplaza la atención especializada.</p></div><Link className="button button-primary" to="/quiz">Ir al Violentómetro <span aria-hidden="true">↗</span></Link></section>
      <p className="small info-disclaimer">RedLila es un proyecto académico. El contenido es informativo, no constituye asesoría legal, atención psicológica ni un diagnóstico. Las fuentes externas pueden actualizarse; consulta los servicios oficiales para información vigente.</p>
    </article>
  );
}
