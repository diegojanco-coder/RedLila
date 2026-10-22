import { useState } from 'react';
import { Link } from 'react-router-dom';

const mitos = [
  ['Si no hay golpes, no es violencia.', 'La violencia también puede ser psicológica, sexual, económica, patrimonial o digital. La Ley N.º 348 reconoce muchas de estas formas.'],
  ['Los celos son una prueba de amor.', 'Vigilar, prohibir amistades o exigir explicaciones constantes es control, no cuidado. Una relación sana se basa en la confianza y el respeto.'],
  ['En una pareja no puede haber violencia sexual.', 'El consentimiento es necesario siempre, también en el matrimonio o el noviazgo. Estar en pareja no obliga a nada.'],
  ['Es un asunto privado; nadie debe meterse.', 'La violencia afecta derechos y la salud. Cualquier persona puede pedir orientación o acudir a las instituciones para apoyar a alguien.'],
  ['Si ella no se va, es porque no quiere.', 'Salir puede ser difícil y peligroso: miedo, dependencia económica, hijas o hijos. La responsabilidad es de quien ejerce la violencia.'],
  ['Revisar su celular es normal si no oculta nada.', 'Exigir contraseñas o revisar mensajes sin permiso es control digital. La privacidad es un derecho.']
];

const pasosPlan = [
  ['contacto', 'Tengo una persona de confianza a quien puedo contarle lo que pasa.'],
  ['clave', 'Acordé con esa persona una palabra o señal para pedir ayuda sin que otros lo noten.'],
  ['numeros', 'Memoricé el 110 y la línea de la FELCV 800 14 0348.'],
  ['lugar', 'Sé a qué lugar seguro puedo ir si necesito salir de casa.'],
  ['documentos', 'Sé dónde están mis documentos y, si es seguro, guardé una copia fuera de casa.'],
  ['telefono', 'Intento mantener mi teléfono con batería y saldo.'],
  ['digital', 'Sé usar «Salir rápido» y cómo revisar quién accede a mis cuentas.']
];

function MitoCard({ mito, realidad, indice }) {
  const [abierta, setAbierta] = useState(false);
  const id = `realidad-${indice}`;
  return (
    <article className={abierta ? 'myth-card open' : 'myth-card'}>
      <span className="myth-label">{abierta ? 'Realidad' : 'Mito'}</span>
      <h3>«{mito}»</h3>
      <p id={id} className="myth-reality" hidden={!abierta}>{realidad}</p>
      <button type="button" className="myth-toggle" aria-expanded={abierta} aria-controls={id} onClick={() => setAbierta(!abierta)}>
        {abierta ? 'Ocultar' : 'Ver la realidad'}
      </button>
    </article>
  );
}

function PlanSeguridad() {
  const [marcados, setMarcados] = useState({});
  const total = pasosPlan.length;
  const listos = pasosPlan.filter(([clave]) => marcados[clave]).length;
  return (
    <div className="safety-plan">
      <div className="safety-progress">
        <p><strong>{listos} de {total}</strong> pasos pensados</p>
        <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={listos} aria-label="Avance del plan de seguridad"><span style={{ width: `${listos / total * 100}%` }} /></div>
      </div>
      <ul className="safety-list">
        {pasosPlan.map(([clave, texto]) => (
          <li key={clave}>
            <label className={marcados[clave] ? 'safety-item done' : 'safety-item'}>
              <input type="checkbox" checked={Boolean(marcados[clave])} onChange={() => setMarcados(actual => ({ ...actual, [clave]: !actual[clave] }))} />
              <span>{texto}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="small safety-plan-note" aria-live="polite">
        {listos === total
          ? 'Pensaste en todos los pasos. Revisa tu plan de vez en cuando: las situaciones cambian.'
          : 'No tienes que completar todo hoy. Cada paso que pienses con calma suma a tu seguridad.'}
        {' '}Esta lista no se guarda ni se envía: se borra al salir de la página.
      </p>
      {listos > 0 && <button type="button" className="button button-secondary" onClick={() => setMarcados({})}>Borrar mis marcas</button>}
    </div>
  );
}

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

      <section className="info-block" aria-labelledby="mitos-title">
        <div className="section-heading"><p className="eyebrow">Pon a prueba lo que sabes</p><h2 id="mitos-title">Mitos y realidades</h2><p>Algunas ideas frecuentes justifican la violencia sin que lo notemos. Pulsa cada tarjeta para descubrir la realidad.</p></div>
        <div className="myth-grid">
          {mitos.map(([mito, realidad], indice) => <MitoCard key={mito} mito={mito} realidad={realidad} indice={indice} />)}
        </div>
      </section>

      <section className="info-block" aria-labelledby="apoyo-title">
        <div className="section-heading"><p className="eyebrow">Opciones a tu ritmo</p><h2 id="apoyo-title">Si te preocupa algo que estás viviendo</h2><p>No tienes que tomar todas las decisiones hoy. Puedes escoger el paso que te resulte posible y seguro.</p></div>
        <div className="recommendation-list">
          {recomendaciones.map(([titulo, texto], indice) => <article className="recommendation-card" key={titulo}><span className="recommendation-index">{String(indice + 1).padStart(2, '0')}</span><div><h3>{titulo}</h3><p>{texto}</p></div></article>)}
        </div>
        <aside className="info-callout"><strong>Si estás en peligro inmediato:</strong> llama a la Policía al 110 desde un lugar seguro. También puedes revisar las <Link to="/ayuda">líneas nacionales y contactos regionales</Link>. La disponibilidad de los servicios puede variar.</aside>
      </section>

      <section className="info-block" aria-labelledby="plan-title">
        <div className="section-heading"><p className="eyebrow">Herramienta interactiva</p><h2 id="plan-title">Mi plan de seguridad</h2><p>Un plan de seguridad ayuda a pensar con anticipación qué hacer si la situación empeora. Marca los pasos que ya tienes pensados.</p></div>
        <PlanSeguridad />
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
