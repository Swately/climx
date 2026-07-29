import type { ComponentProps, ElementType } from 'react';
import styles from './Text.module.css';

type TextProps = {
  /** Semantic tag — heading levels are a CHOICE here, never implied by size. */
  as?: 'p' | 'span' | 'strong' | 'small' | 'h1' | 'h2' | 'h3' | 'dt' | 'dd';
  /** Step on the type scale (tokens --font-size-100..600). */
  size?: 100 | 200 | 300 | 400 | 500 | 600;
  muted?: boolean;
  bold?: boolean;
} & ComponentProps<'p'>;

export default function Text({
  as = 'p',
  size = 300,
  muted = false,
  bold = false,
  className,
  style,
  ...rest
}: TextProps) {
  const Tag = as as ElementType;
  return (
    <Tag
      className={[styles.text, muted && styles.muted, bold && styles.bold, className]
        .filter(Boolean)
        .join(' ')}
      style={{ '--text-size': `var(--font-size-${size})`, ...style }}
      {...rest}
    />
  );
}

// Made with my soul - Swately <3
