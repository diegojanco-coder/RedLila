const equipo = [
  {
    nombre: 'Diego Janco Paco',
    rol: 'Desarrollo full stack, diseño UX/UI y contenidos',
    detalle: 'Estudiante de Diseño y Programación Web III · Carrera de Sistemas Informáticos · Instituto Técnico Nacional de Comercio “Federico Álvarez Plata” Nocturno.'
  }
];

const tecnologias = [
  ['React 18', 'Interfaz por componentes y estado de la sesión'],
  ['React Router', 'Navegación entre secciones sin recargar'],
  ['Vite', 'Compilación y optimización del frontend'],
  ['Node.js + Express', 'API REST para quiz, resultados y directorio'],
  ['MySQL 8', 'Preguntas, opciones, contactos y estadísticas'],
  ['CSS adaptable', 'Diseño propio para teléfonos, tabletas y escritorio'],
  ['Docker', 'Imagen única para publicar web y API']
];

const iniciales = nombre => nombre.split(' ').filter(Boolean).slice(0, 2).map(parte => parte[0]).join('');

export default function Desarrolladores() {
  return (
    <section className="section dev-section" aria-labelledby="dev-titulo">
      <div className="page-intro"><p className="eyebrow">Sección D · Desarrolladores</p><h1 id="dev-titulo">Tecnología con propósito</h1><p className="lead">RedLila es una plataforma web educativa e interactiva contra la violencia hacia la mujer. Reúne información, un Violentómetro Digital y un directorio boliviano para facilitar el reconocimiento de señales y el acceso a apoyo.</p><p className="motivation">No estás sola. Tu voz importa y mereces vivir sin violencia.</p></div>

      <section className="team-section" aria-labelledby="equipo-titulo">
        <h2 id="equipo-titulo">{equipo.length > 1 ? 'Equipo de desarrollo' : 'Desarrollador'}</h2>
        <div className="team-grid">
          {equipo.map(persona => (
            <article className="team-card" key={persona.nombre}>
              <span className="team-avatar" aria-hidden="true">{iniciales(persona.nombre)}</span>
              <div><h3>{persona.nombre}</h3><p className="team-role">{persona.rol}</p><p>{persona.detalle}</p></div>
            </article>
          ))}
        </div>
      </section>

      <div className="feature-grid">
        <article className="feature-card"><span className="feature-number">01 / PROPÓSITO</span><h3>Información y acceso</h3><p>Acercar orientación comprensible y contactos institucionales de Bolivia, sin solicitar una cuenta ni datos personales.</p></article>
        <article className="feature-card"><span className="feature-number">02 / PÚBLICO</span><h3>Mujeres y su entorno</h3><p>Personas que quieren reconocer señales de violencia, acompañar a alguien o informarse sobre sus derechos.</p></article>
        <article className="feature-card"><span className="feature-number">03 / ARQUITECTURA</span><h3>Web y API en un solo servicio</h3><p>El frontend React consume la API Express, que lee el quiz y el directorio desde MySQL y calcula cada resultado en el servidor.</p></article>
      </div>

      <section className="tech-section" aria-labelledby="tecnologias-titulo">
        <h2 id="tecnologias-titulo">Tecnologías utilizadas</h2>
        <ul className="tech-grid">
          {tecnologias.map(([nombre, uso]) => <li key={nombre}><strong>{nombre}</strong><span>{uso}</span></li>)}
        </ul>
      </section>

      <section className="project-features" aria-labelledby="funcionalidades-title"><h2 id="funcionalidades-title">Funcionalidades implementadas</h2><ul><li>Violentómetro interactivo con 11 preguntas y opciones recuperadas desde MySQL.</li><li>Cálculo de puntuación en el servidor, con escala visual y cuatro niveles de orientación.</li><li>Evaluación explicable con señales por categoría y recomendaciones personalizadas.</li><li>Detección prioritaria de señales críticas y de una posible situación de peligro actual.</li><li>Registro anónimo del resultado y estadísticas por opción, sin conservar combinaciones individuales.</li><li>Directorio telefónico y de WhatsApp con filtros para los nueve departamentos.</li><li>Botón de salida rápida y diseño adaptable a dispositivos móviles.</li></ul></section>
      <div className="project-principles"><h2>Cómo cuidamos esta experiencia</h2><div><p><strong>Privacidad:</strong> las respuestas del cuestionario permanecen en memoria durante la sesión y se guarda solo un resumen anónimo.</p><p><strong>Claridad:</strong> el resultado es educativo y no constituye un diagnóstico.</p><p><strong>Acceso:</strong> diseño adaptable a teléfonos y directorio para los nueve departamentos.</p></div></div>
      <p className="small credits-line">Créditos: contenidos educativos basados en la Organización Mundial de la Salud (OMS), la Ley N.º 348 y los recursos institucionales enlazados en la sección Información. Tipografías DM Sans y Manrope con licencia abierta. Desarrollo y diseño: {equipo.map(persona => persona.nombre).join(', ')}.</p>
    </section>
  );
}
