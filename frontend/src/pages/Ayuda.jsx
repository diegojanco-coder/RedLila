import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LineaCard from '../components/LineaCard.jsx';
import { departamentos } from '../data/departamentos.js';
import { lineasRespaldo } from '../data/lineasRespaldo.js';
import { obtenerAyuda } from '../services/api.js';

export default function Ayuda() {
  const [parametros, setParametros] = useSearchParams();
  const elegido = parametros.get('departamento');
  const departamento = departamentos.includes(elegido) ? elegido : 'Todos';
  const [lineas, setLineas] = useState(lineasRespaldo);
  const [respaldo, setRespaldo] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    obtenerAyuda(controller.signal)
      .then(datos => {
        if (datos.lineas?.length) setLineas(datos.lineas);
        else setRespaldo(true);
      })
      .catch(error => { if (error.name !== 'AbortError') setRespaldo(true); })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, []);

  const nacionales = useMemo(() => lineas.filter(linea => linea.departamento === 'Nacional'), [lineas]);
  const regionales = useMemo(() => lineas.filter(linea => linea.departamento !== 'Nacional' && (departamento === 'Todos' || linea.departamento === departamento)), [lineas, departamento]);

  function cambiarDepartamento(evento) {
    const valor = evento.target.value;
    setParametros(valor === 'Todos' ? {} : { departamento: valor });
  }

  return (
    <section className="help-section" aria-labelledby="ayuda-titulo">
      <div className="page-intro"><p className="eyebrow">Directorio de apoyo · Bolivia</p><h1 id="ayuda-titulo">Encuentra ayuda cerca de ti</h1><p className="lead">Contactos nacionales y regionales para los nueve departamentos. Elige tu ubicación y revisa el canal de cada servicio antes de comunicarte.</p></div>
      {cargando && <p className="status-note" role="status">Actualizando contactos…</p>}
      {respaldo && <p className="callout" role="status">No se pudo actualizar el directorio. Se muestran las líneas nacionales guardadas en esta página.</p>}

      <div className="directory-header"><div><p className="eyebrow">Disponibles en todo el país</p><h2>Líneas nacionales</h2><p>En una emergencia inmediata, llama desde un lugar seguro.</p></div><span className="directory-count">{nacionales.length} contactos</span></div>
      <div className="lineas-lista">{nacionales.map(linea => <LineaCard key={linea.id} linea={linea} />)}</div>

      <div className="department-filter">
        <div><p className="eyebrow">Atención regional</p><h2>Elige tu departamento</h2><p>Los servicios locales pueden limitar su atención a su municipio o zona.</p></div>
        <div><label className="filter-label" htmlFor="departamento">Departamento</label><select id="departamento" value={departamento} onChange={cambiarDepartamento}><option value="Todos">Todos los departamentos</option>{departamentos.map(item => <option key={item} value={item}>{item}</option>)}</select></div>
      </div>
      <div className="department-chips" aria-label="Accesos a departamentos">
        {departamentos.map(item => <button type="button" key={item} className={departamento === item ? 'chip active' : 'chip'} onClick={() => setParametros({ departamento: item })} aria-pressed={departamento === item}>{item}</button>)}
      </div>
      <div className="directory-header regional-heading"><div><p className="eyebrow">{departamento === 'Todos' ? 'Nueve departamentos' : departamento}</p><h2>Contactos regionales</h2></div><span className="directory-count">{regionales.length} contactos</span></div>
      {regionales.length ? <div className="lineas-lista">{regionales.map(linea => <LineaCard key={linea.id} linea={linea} />)}</div> : <p className="callout">{cargando ? 'Cargando contactos regionales…' : respaldo ? 'Los contactos regionales requieren conexión. Puedes usar las líneas nacionales mostradas arriba.' : 'No hay un contacto regional publicado para esta selección. Puedes usar las líneas nacionales mostradas arriba.'}</p>}
      <p className="small directory-note">Los números marcados como WhatsApp abren un chat, no una llamada. La disponibilidad y los horarios pueden variar. Comprueba el contacto en la fuente oficial antes de usarlo.</p>
    </section>
  );
}
