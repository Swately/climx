import { Router, type Route } from './router/router';
import HomePage from './pages/HomePage';
import PrimitivesLab from './pages/PrimitivesLab';
import NotFound from './pages/NotFound';

const routes: Route[] = [
  { path: '/', page: HomePage },
  { path: '/lab', page: PrimitivesLab },
];

export default function App() {
  return <Router routes={routes} fallback={NotFound} />;
}

// Made with my soul - Swately <3
