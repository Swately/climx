import { Link } from '../router/router';

export default function NotFound() {
  return (
    <main>
      <h1>Página no encontrada</h1>
      <p>
        <Link to="/">Volver al inicio</Link>
      </p>
    </main>
  );
}

// Made with my soul - Swately <3
