import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import EscapeButton from './components/EscapeButton.jsx';
import Icon from './components/Icon.jsx';
import Inicio from './pages/Inicio.jsx';
import Quiz from './pages/Quiz.jsx';
import Resultados from './pages/Resultados.jsx';
import Ayuda from './pages/Ayuda.jsx';
import Desarrolladores from './pages/Desarrolladores.jsx';
import Informacion from './pages/Informacion.jsx';

const enlaces = [
  ['/', 'Inicio'], ['/informacion', 'Información'], ['/quiz', 'Violentómetro'], ['/ayuda', 'Directorio'],
  ['/desarrolladores', 'Proyecto']
];

export default function App() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [resultadoTemporal, setResultadoTemporal] = useState(null);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/resultados') setResultadoTemporal(null);
  }, [location.pathname]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="site-header">
        <div className="header-inner">
          <NavLink to="/" className="brand" aria-label="RedLila, ir al inicio" onClick={() => setMenuAbierto(false)}>
            <span className="brand-mark"><Icon name="heart" size={23} /></span>
            <span className="brand-word">Red<span>Lila</span><small>INFORMACIÓN · ORIENTACIÓN · APOYO</small></span>
          </NavLink>
          <button className="menu-toggle" type="button" aria-expanded={menuAbierto} aria-controls="navegacion-principal" onClick={() => setMenuAbierto(!menuAbierto)}>
            {menuAbierto ? 'Cerrar' : 'Menú'} <span aria-hidden="true">{menuAbierto ? '−' : '+'}</span>
          </button>
          <nav id="navegacion-principal" className={menuAbierto ? 'main-nav nav-open' : 'main-nav'} aria-label="Navegación principal">
            {enlaces.map(([ruta, etiqueta]) => (
              <NavLink key={ruta} to={ruta} end={ruta === '/'}
                onClick={() => setMenuAbierto(false)}
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                {etiqueta}
              </NavLink>
            ))}
            <a className="header-phone" href="tel:800140348"><Icon name="phone" size={17} /><span>800 14 0348</span></a>
          </nav>
        </div>
      </header>
      <main id="contenido" className="page-content">
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/informacion" element={<Informacion />} />
          <Route path="/quiz" element={<Quiz onResultado={setResultadoTemporal} />} />
          <Route path="/resultados" element={<Resultados resultado={resultadoTemporal} />} />
          <Route path="/ayuda" element={<Ayuda />} />
          <Route path="/desarrolladores" element={<Desarrolladores />} />
          <Route path="*" element={<Inicio />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-brand"><span className="brand-mark"><Icon name="heart" size={20} /></span><div><strong>RedLila</strong><p>Información que acompaña. Apoyo que conecta.</p></div></div>
          <div className="footer-meta"><p>Plataforma web educativa contra la violencia hacia la mujer.</p><span>Proyecto académico · Bolivia · Diego Janco Paco</span></div>
        </div>
      </footer>
      <EscapeButton />
    </div>
  );
}
