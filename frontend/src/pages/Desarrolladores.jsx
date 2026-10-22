export default function Desarrolladores() {
  return (
    <section className="section dev-section" aria-labelledby="dev-titulo">
      <div className="page-intro"><p className="eyebrow">Sección D · Proyecto académico</p><h1 id="dev-titulo">Tecnología con propósito</h1><p className="lead">RedLila es una plataforma web educativa e interactiva contra la violencia hacia la mujer. Reúne un Violentómetro Digital y un directorio boliviano para facilitar el reconocimiento de señales y el acceso a apoyo.</p><p className="motivation">No estás sola. Tu voz importa y mereces vivir sin violencia.</p></div>
      <div className="feature-grid">
        <article className="feature-card"><span className="feature-number">01 / DESARROLLADOR</span><h3>Diego Janco Paco</h3><p>Estudiante de Diseño y Programación Web III · Carrera de Sistemas Informáticos · Instituto Técnico Nacional de Comercio “Federico Álvarez Plata” Nocturno.</p></article>
        <article className="feature-card"><span className="feature-number">02 / TECNOLOGÍA</span><h3>Arquitectura web</h3><p>React y Vite para la interfaz; Node.js y Express para la API; MySQL para preguntas, opciones, directorio y resultados agregados.</p></article>
        <article className="feature-card"><span className="feature-number">03 / PROPÓSITO</span><h3>Información y acceso</h3><p>Acercar orientación comprensible y contactos institucionales de Bolivia, sin solicitar una cuenta ni datos personales.</p></article>
      </div>
      <section className="project-features" aria-labelledby="funcionalidades-title"><h2 id="funcionalidades-title">Funcionalidades implementadas</h2><ul><li>Violentómetro interactivo con 11 preguntas y opciones recuperadas desde MySQL.</li><li>Evaluación explicable con cuatro niveles, señales por categoría y recomendaciones personalizadas.</li><li>Detección prioritaria de señales críticas y de una posible situación de peligro actual.</li><li>Registro estadístico anónimo por opción, sin conservar combinaciones individuales.</li><li>Directorio telefónico y de WhatsApp con filtros para los nueve departamentos.</li><li>Botón de salida rápida y diseño adaptable a dispositivos móviles.</li></ul></section>
      <div className="project-principles"><h2>Cómo cuidamos esta experiencia</h2><div><p><strong>Privacidad:</strong> las respuestas del cuestionario permanecen en memoria durante la sesión y se guarda solo un resumen anónimo.</p><p><strong>Claridad:</strong> el resultado es educativo y no constituye un diagnóstico.</p><p><strong>Acceso:</strong> diseño adaptable a teléfonos y directorio para los nueve departamentos.</p></div></div>
      <p className="small credits-line">Fuentes y créditos educativos: Organización Mundial de la Salud (OMS), Ley N.º 348 y recursos institucionales enlazados en la sección Información. Tipografías DM Sans y Manrope distribuidas con licencia abierta. Desarrollo y diseño: Diego Janco Paco.</p>
    </section>
  );
}
