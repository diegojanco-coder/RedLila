import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { enviarRespuestas, obtenerQuiz } from '../services/api.js';

function crearSolicitudId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let indice = 0; indice < bytes.length; indice += 1) {
      bytes[indice] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hexadecimal = [...bytes].map(valor => valor.toString(16).padStart(2, '0')).join('');
  return `${hexadecimal.slice(0, 8)}-${hexadecimal.slice(8, 12)}-${hexadecimal.slice(12, 16)}-${hexadecimal.slice(16, 20)}-${hexadecimal.slice(20)}`;
}

export default function Quiz({ onResultado }) {
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [indice, setIndice] = useState(0);
  const [respuestas, setRespuestas] = useState({});
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [solicitudId] = useState(crearSolicitudId);
  const leyendaRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    obtenerQuiz(controller.signal)
      .then(setQuiz)
      .catch(err => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (quiz?.preguntas?.length) leyendaRef.current?.focus();
  }, [quiz, indice]);

  if (cargando) return <section className="section"><p role="status">Cargando preguntas…</p></section>;
  if (!quiz) return <section className="section"><h1>El quiz no está disponible</h1><p role="alert">{error}</p><Link className="button button-secondary" to="/ayuda">Ver ayuda</Link></section>;

  const pregunta = quiz.preguntas[indice];
  const seleccionada = respuestas[pregunta.id];
  const ultima = indice === quiz.preguntas.length - 1;

  async function siguiente(evento) {
    evento.preventDefault();
    if (!seleccionada || enviando) return;
    if (!ultima) { setIndice(actual => actual + 1); setError(''); return; }
    setEnviando(true);
    setError('');
    try {
      const opcionIds = quiz.preguntas.map(item => respuestas[item.id]);
      const resultado = await enviarRespuestas(quiz.version.id, opcionIds, solicitudId);
      onResultado(resultado);
      navigate('/resultados', { replace: true });
    } catch (err) { setError(err.message); setEnviando(false); }
  }

  return (
    <section className="quiz-section" aria-labelledby="quiz-title">
      <div className="quiz-intro"><p className="eyebrow">Violentómetro digital</p><h1 id="quiz-title">Responde a tu ritmo</h1><p>Elige la opción que mejor describa tu situación. Puedes salir en cualquier momento.</p></div>
      <div className="quiz-card">
        <div className="progress-copy"><span>Pregunta {indice + 1} de {quiz.preguntas.length}</span><span>{Math.round((indice + 1) / quiz.preguntas.length * 100)}%</span></div>
        <div className="progress-track" role="progressbar" aria-valuemin="1" aria-valuemax={quiz.preguntas.length} aria-valuenow={indice + 1} aria-label="Progreso del cuestionario"><span style={{ width: `${(indice + 1) / quiz.preguntas.length * 100}%` }} /></div>
        <form onSubmit={siguiente}>
          <fieldset>
            <legend ref={leyendaRef} tabIndex={-1}>{pregunta.enunciado}</legend>
            <div className="options">
              {pregunta.opciones.map(opcion => (
                <label key={opcion.id} className={seleccionada === opcion.id ? 'option selected' : 'option'}>
                  <input type="radio" name={`pregunta-${pregunta.id}`} value={opcion.id}
                    checked={seleccionada === opcion.id}
                    onChange={() => setRespuestas(actual => ({ ...actual, [pregunta.id]: opcion.id }))} />
                  <span>{opcion.texto}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="quiz-actions">
            <button type="button" className="button button-secondary" disabled={indice === 0 || enviando} onClick={() => setIndice(actual => actual - 1)}>Anterior</button>
            <button type="submit" className="button button-primary" disabled={!seleccionada || enviando}>{enviando ? 'Evaluando…' : ultima ? 'Ver orientación' : 'Siguiente'}</button>
          </div>
        </form>
      </div>
      <p className="small center">Antes de enviar, tus respuestas se mantienen solo en memoria. Al finalizar, se suman conteos anónimos por opción y se guarda el nivel general; RedLila no conserva tu combinación de respuestas.</p>
    </section>
  );
}
