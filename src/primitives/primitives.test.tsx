import { describe, it, expect } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import Stack from './Stack';
import Cluster from './Cluster';
import Grid from './Grid';
import Box from './Box';
import Text from './Text';

// The tap-tap anti-checklist: every prop consumed, native props forward, ref is
// real, `as` renders real semantic tags.
describe('primitives', () => {
  it('render the semantic tag the `as` prop asks for', () => {
    render(
      <Stack as="nav" aria-label="n1">
        x
      </Stack>,
    );
    expect(screen.getByRole('navigation', { name: 'n1' }).tagName).toBe('NAV');
    render(<Text as="h2">titulo</Text>);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('titulo');
  });

  it('consume scale props as CSS custom properties (no dead props)', () => {
    render(
      <Stack gap={6} data-testid="s">
        x
      </Stack>,
    );
    expect(screen.getByTestId('s').style.getPropertyValue('--stack-gap')).toBe('var(--space-6)');
    render(
      <Grid min="10rem" gap={2} data-testid="g">
        x
      </Grid>,
    );
    const g = screen.getByTestId('g');
    expect(g.style.getPropertyValue('--grid-min')).toBe('10rem');
    expect(g.style.getPropertyValue('--grid-gap')).toBe('var(--space-2)');
    render(
      <Cluster justify="space-between" data-testid="c">
        x
      </Cluster>,
    );
    expect(screen.getByTestId('c').style.getPropertyValue('--cluster-justify')).toBe(
      'space-between',
    );
    render(
      <Box padding={8} variant="surface" data-testid="b">
        x
      </Box>,
    );
    expect(screen.getByTestId('b').style.getPropertyValue('--box-padding')).toBe('var(--space-8)');
    render(
      <Text size={500} data-testid="t">
        x
      </Text>,
    );
    expect(screen.getByTestId('t').style.getPropertyValue('--text-size')).toBe(
      'var(--font-size-500)',
    );
  });

  it('forward native props and merge className', () => {
    render(
      <Box className="extra" data-testid="fw" lang="es">
        x
      </Box>,
    );
    const el = screen.getByTestId('fw');
    expect(el.className).toContain('extra');
    expect(el.getAttribute('lang')).toBe('es');
  });

  it('expose a working ref (React 19 ref-as-prop)', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Stack ref={ref}>x</Stack>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});

// Made with my soul - Swately <3
