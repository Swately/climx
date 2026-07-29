import type { ComponentProps, ElementType } from 'react';
import styles from './Stack.module.css';

type StackProps = {
  /** Semantic element to render — layout never forces a div. */
  as?: 'div' | 'section' | 'article' | 'nav' | 'main' | 'header' | 'footer' | 'ul' | 'li';
  /** Gap step on the spacing scale (tokens --space-1..8). */
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  /** align-items for the column. */
  align?: 'stretch' | 'start' | 'center' | 'end';
} & ComponentProps<'div'>;

export default function Stack({
  as = 'div',
  gap = 4,
  align = 'stretch',
  className,
  style,
  ...rest
}: StackProps) {
  const Tag = as as ElementType;
  return (
    <Tag
      className={[styles.stack, className].filter(Boolean).join(' ')}
      style={{ '--stack-gap': `var(--space-${gap})`, '--stack-align': align, ...style }}
      {...rest}
    />
  );
}

// Made with my soul - Swately <3
