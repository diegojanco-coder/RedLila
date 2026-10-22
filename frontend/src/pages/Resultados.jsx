import { Link } from 'react-router-dom';
import { lineasRespaldo } from '../data/lineasRespaldo.js';

const contenidos = {
  verde: 'Verde · orientación inicial',
  amarillo: 'Amarillo · atención',
  naranja: 'Naranja · riesgo alto',
  rojo: 'Rojo · peligro'
};
const escala = ['verde', 'amarillo', 'naranja', 'rojo'];

export default function Resultados({ resultado }) {
  if (!resultado || !contenidos[resultado.nivel]) {
    return <section className="section"><h1>El resultado ya no está disponible</h1><p>Por privacidad, RedLila no conserva tu resultado después de recargar o salir de esta pantalla. Puedes volver a realizar el cuestionario.</p><Link className="button button-primary" to="/quiz">Volver al quiz</Link></section>;
  }

  return (
    <section className={`results-section result-theme-${resultado.nivel}`} aria-labelledby="resultado-titulo">
      <p className="eyebrow">Orientación del Violentómetro</p>
      <div className="result-panel">
        <p className="result-level">{contenidos[resultado.nivel]}</p>
        <h1 id="resultado-titulo">{resultado.orientacion.titulo}</h1>
        <p className="lead">{resultado.orientacion.resumen}</p>
      </div>

      <div className="result-scale" aria-label={`Tu resultado está en el nivel ${resultado.nivel}`}>
        {escala.map(nivel => <span className={nivel === resultado.nivel ? `scale-${nivel} current` : `scale-${nivel}`} aria-current={nivel === resultado.nivel ? 'step' : undefined} key={nivel}>{nivel}</span>)}
      </div>

      <div className="result-reason"><strong>Por qué aparece esta orientación</strong><p>{resultado.orientacion.motivo}</p></div>

      {resultado.emergenciaInmediata && <div className="emergency-callout" role="alert"><strong>Indicaste que podrías estar en peligro ahora.</strong><span>Si puedes hacerlo sin aumentar el riesgo, ve a un lugar seguro y llama al 110 o a la FELCV. Evita confrontar a quien te pone en peligro.</span></div>}

      {resultado.orientacion.senales.length > 0 && <section className="result-detail" aria-labelledby="senales-detectadas">
        <div className="section-heading"><p className="eyebrow">Según tus respuestas</p><h2 id="senales-detectadas">Señales identificadas</h2><p>Estas explicaciones muestran por qué recibiste esta orientación.</p></div>
        <div className="result-signal-grid">
          {resultado.orientacion.senales.map(senal => <article className="result-signal-card" key={senal.categoria}><span>{senal.intensidad}</span><h3>{senal.titulo}</h3><p>{senal.descripcion}</p></article>)}
        </div>
      </section>}

      <section className="result-detail" aria-labelledby="recomendaciones-titulo">
        <div className="section-heading"><p className="eyebrow">Pasos posibles</p><h2 id="recomendaciones-titulo">Qué puedes considerar ahora</h2><p>Tú decides qué opción resulta posible y segura para ti.</p></div>
        <div className="result-recommendations">
          {resultado.orientacion.recomendaciones.map((recomendacion, indice) => <article className="recommendation-card" key={recomendacion.titulo}><span className="recommendation-index">{String(indice + 1).padStart(2, '0')}</span><div><h3>{recomendacion.titulo}</h3><p>{recomendacion.texto}</p></div></article>)}
        </div>
      </section>

      <article className="info-card result-about"><h2>Sobre este resultado</h2><p>Es una orientación educativa basada en tus respuestas. No es un diagnóstico ni predice lo que ocurrirá. Una ausencia de señales en este cuestionario tampoco descarta otras formas de violencia.</p></article>
      <div className="callout" role="note"><strong>Cuida tu privacidad.</strong> Si alguien supervisa tu dispositivo, usa «Salir rápido». Esa acción no elimina el historial anterior.</div>
      <div className="section-heading"><p className="eyebrow">{resultado.nivel === 'rojo' ? 'Apoyo inmediato' : 'Contactos de apoyo'}</p><h2>Líneas nacionales</h2></div>
      <div className="button-row">
        {lineasRespaldo.map(linea => <a key={linea.id} className="button button-call" href={`tel:${linea.numeroMarcacion}`}>Llamar a {linea.institucion}: {linea.telefono}</a>)}
      </div>
      <p className="small">La llamada solo se inicia al pulsar un enlace. Si no puedes llamar, <Link to="/ayuda">consulta contactos de tu departamento</Link>.</p>
    </section>
  );
}
