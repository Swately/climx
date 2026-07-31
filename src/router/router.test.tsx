import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { matchPath, stripBase, Router, Link, useParams, navigate } from './router';

describe('matchPath', () => {
  it('matches literal paths', () => {
    expect(matchPath('/', '/')).toEqual({});
    expect(matchPath('/lab', '/lab')).toEqual({});
    expect(matchPath('/lab', '/otro')).toBeNull();
  });

  it('extracts :params (composite-key shape, W1)', () => {
    expect(matchPath('/estado/:ides/municipio/:idmun', '/estado/20/municipio/54')).toEqual({
      ides: '20',
      idmun: '54',
    });
  });

  it('rejects length mismatches', () => {
    expect(matchPath('/estado/:ides', '/estado/20/municipio/54')).toBeNull();
    expect(matchPath('/estado/:ides/municipio/:idmun', '/estado/20')).toBeNull();
  });

  it('decodes URI segments', () => {
    expect(matchPath('/x/:name', '/x/San%20Salvador')).toEqual({ name: 'San Salvador' });
  });

  it('treats a malformed percent-escape as no-match instead of throwing', () => {
    // Unguarded decodeURIComponent here used to crash the whole app at render.
    expect(() => matchPath('/x/:name', '/x/%E0%A4%A')).not.toThrow();
    expect(matchPath('/x/:name', '/x/%E0%A4%A')).toBeNull();
    expect(matchPath('/estado/:ides/municipio/:idmun', '/estado/9/municipio/%')).toBeNull();
  });
});

describe('stripBase', () => {
  it('strips the configured base and normalizes empty to /', () => {
    // In tests BASE_URL is '/', so stripping is the identity.
    expect(stripBase('/lab')).toBe('/lab');
    expect(stripBase('/')).toBe('/');
  });
});

function Home() {
  return <h1>home</h1>;
}
function Lab() {
  return <h1>lab</h1>;
}
function Muni() {
  const { ides, idmun } = useParams<{ ides: string; idmun: string }>();
  return (
    <h1>
      muni {ides}/{idmun}
    </h1>
  );
}
function NotFound() {
  return <h1>404</h1>;
}

const routes = [
  { path: '/', page: Home },
  { path: '/lab', page: Lab },
  { path: '/estado/:ides/municipio/:idmun', page: Muni },
];

describe('Router', () => {
  it('renders the matching route and navigates via Link', async () => {
    window.history.replaceState(null, '', '/');
    render(
      <>
        <Link to="/lab">ir al lab</Link>
        <Router routes={routes} fallback={NotFound} />
      </>,
    );
    expect(screen.getByRole('heading')).toHaveTextContent('home');
    await userEvent.click(screen.getByRole('link', { name: 'ir al lab' }));
    expect(screen.getByRole('heading')).toHaveTextContent('lab');
  });

  it('provides composite params to the page', () => {
    window.history.replaceState(null, '', '/estado/20/municipio/54');
    render(<Router routes={routes} fallback={NotFound} />);
    expect(screen.getByRole('heading')).toHaveTextContent('muni 20/54');
  });

  it('responds to popstate (back button)', async () => {
    window.history.replaceState(null, '', '/');
    render(<Router routes={routes} fallback={NotFound} />);
    navigate('/lab');
    expect(await screen.findByText('lab')).toBeInTheDocument();
    window.history.back();
    // jsdom fires popstate asynchronously
    expect(await screen.findByText('home')).toBeInTheDocument();
  });

  it('falls back on unknown paths', () => {
    window.history.replaceState(null, '', '/no-existe');
    render(<Router routes={routes} fallback={NotFound} />);
    expect(screen.getByRole('heading')).toHaveTextContent('404');
  });
});

// Made with my soul - Swately <3
