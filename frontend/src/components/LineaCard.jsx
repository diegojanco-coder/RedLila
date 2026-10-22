export default function LineaCard({ linea }) {
  const esWhatsApp = linea.canal === 'whatsapp';
  const destino = esWhatsApp
    ? `https://wa.me/591${linea.numeroMarcacion.replace(/\D/g, '')}`
    : `tel:${linea.numeroMarcacion}`;

  return (
    <article className="linea-card">
      <div>
        <div className="linea-meta"><span className="linea-scope">{linea.alcance}</span><span className={esWhatsApp ? 'channel channel-chat' : 'channel'}>{esWhatsApp ? 'WhatsApp' : 'Llamada'}</span></div>
        <h3>{linea.institucion}</h3>
        <p>{linea.tipoAyuda}</p>
        <p className="small">Fuente consultada: {linea.verificadaEn}</p>
      </div>
      <div className="linea-actions">
        <a className={esWhatsApp ? 'button button-chat' : 'button button-call'} href={destino}
          target={esWhatsApp ? '_blank' : undefined}
          rel={esWhatsApp ? 'noopener noreferrer' : undefined}
          aria-label={`${esWhatsApp ? 'Abrir WhatsApp de' : 'Llamar a'} ${linea.institucion}: ${linea.telefono}`}>
          {esWhatsApp ? 'Escribir al' : 'Llamar al'} {linea.telefono} <span aria-hidden="true">↗</span>
        </a>
        <a className="source-link" href={linea.fuenteUrl} target="_blank" rel="noopener noreferrer">
          Ver fuente oficial <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}
