import { Link } from '../router/router';

// S0 skeleton: semantic landmarks in place; real content arrives with the
// primitives (S3a) and the data layer (S3).
export default function HomePage() {
  return (
    <>
      <header>
        <h1>climx</h1>
        <p>Pronóstico municipal de México — datos oficiales del SMN/CONAGUA.</p>
      </header>
      <main>
        <p>
          En reconstrucción (CLIMX-A). La versión escolar original vive en la etiqueta{' '}
          <code>v0-school</code>.
        </p>
        <nav aria-label="secciones">
          <Link to="/lab">Laboratorio de primitivos</Link>
        </nav>
      </main>
      <footer>
        <p>
          <small>Fuente de datos: Servicio Meteorológico Nacional (CONAGUA).</small>
        </p>
      </footer>
    </>
  );
}

// Made with my soul - Swately <3
