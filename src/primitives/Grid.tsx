import type { ComponentProps, ElementType } from 'react';
import styles from './Grid.module.css';

type GridProps = {
  as?: 'div' | 'ul' | 'section';
  /** Minimum column width (CSS length); columns auto-fill from it. */
  min?: string;
  /** Gap step on the spacing scale. */
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
} & ComponentProps<'div'>;

/** Responsive grid: as many columns of at least `min` as fit — no media queries needed. */
export default function Grid({
  as = 'div',
  min = '14rem',
  gap = 4,
  className,
  style,
  ...rest
}: GridProps) {
  const Tag = as as ElementType;
  return (
    <Tag
      className={[styles.grid, className].filter(Boolean).join(' ')}
      style={{ '--grid-min': min, '--grid-gap': `var(--space-${gap})`, ...style }}
      {...rest}
    />
  );
}

// Made with my soul - Swately <3
