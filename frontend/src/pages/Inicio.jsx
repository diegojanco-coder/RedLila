import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { departamentos } from '../data/departamentos.js';
import { lineasRespaldo } from '../data/lineasRespaldo.js';

const pasos = [
  { numero: '01', titulo: 'Reconoce', texto: 'Identifica comportamientos de control, humillación, amenazas o agresión que pueden pasar desapercibidos.', icono: 'sparkle' },
  { numero: '02', titulo: 'Infórmate', texto: 'Accede a contenido claro sobre señales, derechos, prevención y alternativas para pedir apoyo.', icono: 'book' },
  { numero: '03', titulo: 'Conecta', texto: 'Consulta líneas nacionales y recursos de orientación en los nueve departamentos de Bolivia.', icono: 'phone' },
];

const niveles = [
  ['01', 'Señales de alerta', 'Reconocer a tiempo permite conversar y buscar orientación.', 'level-green'],
  ['02', 'Atención', 'El control y la intimidación pueden afectar tu libertad y bienestar.', 'level-yellow'],
  ['03', 'Riesgo alto', 'Amenazas y agresiones requieren apoyo y un plan de seguridad.', 'level-orange'],
  ['04', 'Emergencia', 'Si existe peligro inmediato, busca un lugar seguro y llama a emergencias.', 'level-red'],
];

export default function Inicio() {
  return (
    <div className="home-page">
      <section className="hero" aria-labelledby="titulo-principal">
        <div className="hero-copy">
          <p className="eyebrow"><span className="signal-dot" /> Plataforma educativa · Bolivia</p>
          <h1 id="titulo-principal">Reconocer las señales es <span>el primer paso.</span></h1>
          <p className="hero-subtitle">Lucha contra la violencia hacia la mujer</p>
          <p className="lead">RedLila es un espacio para aprender, reflexionar y encontrar apoyo. Explora el Violentómetro Digital y conoce recursos disponibles en tu departamento.</p>
          <div className="button-row">
            <Link className="button button-primary" to="/quiz">Explorar el Violentómetro <Icon name="arrow" size={18} /></Link>
            <Link className="button button-secondary" to="/informacion">Conocer más</Link>
          </div>
          <div className="hero-trust"><span><Icon name="shield" size={17} /> No necesitas crear una cuenta</span><span><Icon name="heart" size={17} /> Avanza a tu propio ritmo</span></div>
          <p className="small safety-note">El botón «Salir rápido» abre Google de inmediato. El historial previo de tu navegador puede permanecer visible.</p>
        </div>

        <div className="hero-visual" aria-label="Vista previa ilustrativa del Violentómetro Digital">
          <div className="hero-orb" />
          <div className="preview-note note-privacy"><Icon name="shield" size={17} /><span><strong>Tu privacidad importa</strong><small>No solicitamos datos personales</small></span></div>
          <article className="preview-card">
            <div className="preview-top"><span className="preview-logo"><Icon name="heart" size={17} /></span><span>VISTA PREVIA · VIOLENTÓMETRO</span><span className="preview-dots">•••</span></div>
            <div className="preview-progress"><span /></div>
            <p className="preview-step">PREGUNTA 01 <span>DE 11</span></p>
            <h2>¿Respeta tus decisiones y tu espacio personal?</h2>
            <div className="preview-option"><i /> Sí, me siento respetada</div>
            <div className="preview-option"><i /> A veces tengo dudas</div>
            <div className="preview-option"><i /> No, suele decidir por mí</div>
            <div className="preview-foot"><span><Icon name="shield" size={15} /> Respuestas anónimas</span><span>01 / 11</span></div>
          </article>
          <div className="preview-note note-support"><span className="support-pulse" /><span><strong>Orientación paso a paso</strong><small>Información para decidir con calma</small></span></div>
          <div className="hero-caption">Un espacio para reconocer, informarte y conectar.</div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Principios de RedLila">
        <span><Icon name="shield" size={19} /> Privacidad y respeto</span><i /><span><Icon name="book" size={19} /> Educación accesible</span><i /><span><Icon name="heart" size={19} /> Apoyo sin juicios</span>
      </section>

      <section className="story-section" aria-labelledby="historia-titulo">
        <div className="story-card">
          <div className="story-copy">
            <p className="eyebrow">Un mensaje para ti</p>
            <h2 id="historia-titulo">Tu historia merece ser escuchada.</h2>
            <p>Reconocer una señal, hablar con alguien de confianza o consultar un recurso puede ser un primer paso. Puedes hacerlo a tu ritmo y desde un lugar seguro.</p>
            <Link className="text-link" to="/informacion">Conoce las señales y tus opciones <Icon name="arrow" size={17} /></Link>
          </div>
          <img className="story-art" src="/images/redlila-mujeres.webp" width="1774" height="887" alt="Ilustración de tres mujeres bolivianas unidas" decoding="async" loading="lazy" />
        </div>
      </section>

      <section className="section steps-section" aria-labelledby="como-funciona">
        <div className="section-heading"><p className="eyebrow">RedLila te acompaña</p><h2 id="como-funciona">Un espacio para aprender y encontrar orientación</h2><p><strong>Nuestro objetivo:</strong> ayudar a reconocer a tiempo las señales de violencia hacia la mujer, informar sobre derechos y acercar contactos de apoyo en Bolivia. Tú decides qué consultar y cuándo hacerlo.</p></div>
        <div className="feature-grid">
          {pasos.map(paso => <article className="feature-card" key={paso.numero}><span className="feature-icon"><Icon name={paso.icono} size={21} /></span><span className="feature-number">{paso.numero}</span><h3>{paso.titulo}</h3><p>{paso.texto}</p></article>)}
        </div>
      </section>

      <section className="section signals-section" aria-labelledby="senales-titulo">
        <div className="section-heading"><p className="eyebrow">Información para reconocer</p><h2 id="senales-titulo">La violencia puede comenzar con señales sutiles</h2><p>Controlar, aislar o intimidar también puede ser violencia. No tienes que esperar a que exista una agresión física para buscar orientación.</p></div>
        <div className="signal-grid">
          <article className="signal-card"><span>01 / CONTROL</span><h3>Vigilancia y restricciones</h3><p>Revisar tu teléfono, decidir con quién hablas o limitar tus actividades.</p></article>
          <article className="signal-card"><span>02 / AISLAMIENTO</span><h3>Alejarte de tu entorno</h3><p>Hacerte sentir culpable por ver a personas de confianza o pedir apoyo.</p></article>
          <article className="signal-card"><span>03 / VIOLENCIA PSICOLÓGICA</span><h3>Humillación e intimidación</h3><p>Insultos, amenazas, chantaje o conductas que buscan causar miedo.</p></article>
          <article className="signal-card"><span>04 / AGRESIÓN</span><h3>Daño físico o sexual</h3><p>Cualquier agresión merece atención. Si hay peligro inmediato, busca ayuda desde un lugar seguro.</p></article>
        </div>
        <Link className="text-link" to="/informacion">Explorar la sección informativa <Icon name="arrow" size={17} /></Link>
      </section>

      <section className="violentometer-section" aria-labelledby="niveles-titulo">
        <div className="violentometer-inner">
          <div className="section-heading"><p className="eyebrow">Violentómetro Digital</p><h2 id="niveles-titulo">Cada señal merece ser tomada en cuenta</h2><p>La herramienta organiza señales por nivel de alerta y ofrece una orientación educativa basada en tus respuestas.</p></div>
          <div className="level-list">{niveles.map(([num, titulo, texto, color]) => <article className={`level-row ${color}`} key={num}><span className="level-num">{num}</span><span className="level-indicator" /><div><h3>{titulo}</h3><p>{texto}</p></div><span className="level-arrow" aria-hidden="true">↗</span></article>)}</div>
          <div className="violentometer-bottom"><p>El resultado no es un diagnóstico profesional ni reemplaza la atención especializada.</p><Link className="button button-light" to="/quiz">Iniciar orientación <Icon name="arrow" size={18} /></Link></div>
        </div>
      </section>

      <section className="section departments-section" aria-labelledby="departamentos-titulo">
        <div className="section-heading"><p className="eyebrow">Red nacional de apoyo</p><h2 id="departamentos-titulo">Orientación en los nueve departamentos</h2><p>Consulta líneas nacionales y filtra el directorio por departamento. Los servicios y horarios pueden variar según la localidad.</p></div>
        <div className="department-grid">
          {departamentos.map((departamento, indice) => <Link className="department-link" key={departamento} to={`/ayuda?departamento=${encodeURIComponent(departamento)}`}><span className="department-index">{String(indice + 1).padStart(2, '0')}</span><span>{departamento}</span><Icon name="arrow" size={17} /></Link>)}
        </div>
        <div className="national-lines">{lineasRespaldo.map(linea => <a key={linea.id} href={`tel:${linea.numeroMarcacion}`} className="national-line"><span className="national-line-icon"><Icon name="phone" size={19} /></span><span><small>{linea.institucion}</small><strong>{linea.telefono}</strong></span><Icon name="arrow" size={17} /></a>)}</div>
        <p className="directory-link-wrap"><Link className="text-link" to="/ayuda">Ver directorio completo <Icon name="arrow" size={17} /></Link></p>
      </section>

      <section className="closing-quote"><span className="quote-mark">“</span><p>Tu voz importa. Mereces vivir con libertad, respeto y seguridad.</p><span>REDLILA · INFORMACIÓN, ORIENTACIÓN Y APOYO</span></section>
    </div>
  );
}
