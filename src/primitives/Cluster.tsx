import type { ComponentProps, ElementType } from 'react';
import styles from './Cluster.module.css';

type ClusterProps = {
  as?: 'div' | 'nav' | 'ul' | 'li' | 'span';
  /** Gap step on the spacing scale. */
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  align?: 'stretch' | 'start' | 'center' | 'end' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'space-between';
} & ComponentProps<'div'>;

/** Horizontal, wrapping flex row — the counterpart of Stack. */
export default function Cluster({
  as = 'div',
  gap = 3,
  align = 'center',
  justify = 'start',
  className,
  style,
  ...rest
}: ClusterProps) {
  const Tag = as as ElementType;
  return (
    <Tag
      className={[styles.cluster, className].filter(Boolean).join(' ')}
      style={{
        '--cluster-gap': `var(--space-${gap})`,
        '--cluster-align': align,
        '--cluster-justify': justify,
        ...style,
      }}
      {...rest}
    />
  );
}

// Made with my soul - Swately <3
