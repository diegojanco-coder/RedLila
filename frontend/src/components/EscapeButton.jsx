export default function EscapeButton() {
  function escapar() {
    // La navegación sucede en el mismo gesto, sin espera de red ni confirmación.
    window.location.replace('https://www.google.com');
  }

  return (
    <button type="button" className="escape-button" onClick={escapar}
      aria-label="Salir rápidamente de RedLila y abrir Google">
      Salir rápido <span aria-hidden="true">↗</span>
    </button>
  );
}
