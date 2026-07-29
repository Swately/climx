import { Link } from '../router/router';

// El escenario de las sesiones de primitivos-con-tokens: cada primitivo
// (Stack, Cluster, Grid, Box, Text) se construye aquí, paso a paso, y esta
// página los exhibe con casos reales mientras nacen. Vacío a propósito en S0.
export default function PrimitivesLab() {
  return (
    <>
      <header>
        <h1>Laboratorio de primitivos</h1>
      </header>
      <main>
        <p>
          Aquí se construyen los primitivos de layout con tokens, sesión a sesión. Todavía no
          existe ninguno — ese es el punto de partida.
        </p>
        <nav aria-label="secciones">
          <Link to="/">Volver al inicio</Link>
        </nav>
      </main>
    </>
  );
}

// Made with my soul - Swately <3
