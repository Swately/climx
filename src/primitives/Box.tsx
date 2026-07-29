import type { ComponentProps, ElementType } from 'react';
import styles from './Box.module.css';

type BoxProps = {
  as?: 'div' | 'section' | 'article' | 'aside' | 'li' | 'figure';
  /** Padding step on the spacing scale. */
  padding?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  /** surface = card look (surface color + border + radius); plain = no chrome. */
  variant?: 'plain' | 'surface';
} & ComponentProps<'div'>;

export default function Box({
  as = 'div',
  padding = 4,
  variant = 'plain',
  className,
  style,
  ...rest
}: BoxProps) {
  const Tag = as as ElementType;
  return (
    <Tag
      className={[styles.box, variant === 'surface' && styles.surface, className]
        .filter(Boolean)
        .join(' ')}
      style={{ '--box-padding': `var(--space-${padding})`, ...style }}
      {...rest}
    />
  );
}

// Made with my soul - Swately <3
