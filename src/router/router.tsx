// Hand-rolled client router (CLIMX-A, M1 item 8 by construction).
// PUBLIC CONTRACT — frozen at S0 (CLIMX_IMPLEMENTATION_STRATEGIES §S0): pages may
// import ONLY Router, Link, useParams, navigate. Everything else is internal, so a
// swap to react-router behind this interface stays contained.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type ComponentType,
  type ReactNode,
} from 'react';

export type Route = { path: string; page: ComponentType };

type Params = Record<string, string>;

// BASE_URL: GH Pages serves the app under a project path; routes are matched
// against the path with that prefix stripped.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function stripBase(pathname: string): string {
  const p = BASE && pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  return p === '' ? '/' : p;
}

// Matches a pattern of literal and :param segments against a pathname.
// Exported for unit tests; not part of the page-facing contract.
export function matchPath(pattern: string, pathname: string): Params | null {
  const pat = pattern.split('/').filter(Boolean);
  const path = pathname.split('/').filter(Boolean);
  if (pat.length !== path.length) return null;
  const params: Params = {};
  for (let i = 0; i < pat.length; i++) {
    const p = pat[i] as string;
    const s = decodeURIComponent(path[i] as string);
    if (p.startsWith(':')) params[p.slice(1)] = s;
    else if (p !== s) return null;
  }
  return params;
}

const listeners = new Set<() => void>();

function currentPath(): string {
  return stripBase(window.location.pathname);
}

export function navigate(to: string, opts?: { replace?: boolean }): void {
  const url = BASE + to;
  if (opts?.replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
  listeners.forEach((fn) => fn());
}

const ParamsContext = createContext<Params>({});

export function Router({ routes, fallback }: { routes: Route[]; fallback: ComponentType }) {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const onChange = () => setPath(currentPath());
    listeners.add(onChange);
    window.addEventListener('popstate', onChange);
    return () => {
      listeners.delete(onChange);
      window.removeEventListener('popstate', onChange);
    };
  }, []);
  for (const r of routes) {
    const params = matchPath(r.path, path);
    if (params) {
      const Page = r.page;
      return (
        <ParamsContext.Provider value={params}>
          <Page />
        </ParamsContext.Provider>
      );
    }
  }
  const Fallback = fallback;
  return <Fallback />;
}

export function useParams<T extends Params = Params>(): T {
  return useContext(ParamsContext) as T;
}

type LinkProps = { to: string; children: ReactNode } & Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
>;

export function Link({ to, children, onClick, ...rest }: LinkProps) {
  return (
    <a
      href={BASE + to}
      onClick={(e) => {
        onClick?.(e);
        // Only intercept plain left-clicks; modified clicks keep native behavior.
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
          return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

// Made with my soul - Swately <3
