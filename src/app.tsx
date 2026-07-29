import { Router, type Route } from './router/router';
import HomePage from './pages/HomePage';
import StatePage from './pages/StatePage';
import MunicipioPage from './pages/MunicipioPage';
import PrimitivesLab from './pages/PrimitivesLab';
import NotFound from './pages/NotFound';

const routes: Route[] = [
  { path: '/', page: HomePage },
  { path: '/estado/:ides', page: StatePage },
  { path: '/estado/:ides/municipio/:idmun', page: MunicipioPage },
  { path: '/lab', page: PrimitivesLab },
];

export default function App() {
  return (
    <>
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <div className="page" id="contenido">
        <Router routes={routes} fallback={NotFound} />
      </div>
    </>
  );
}

// Made with my soul - Swately <3
