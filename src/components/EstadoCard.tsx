import { Link } from '../router/router';
import Text from '../primitives/Text';
import styles from './EstadoCard.module.css';

// State card: v0's representative-site photos (optimized 123MB -> 1.1MB WebP,
// keyed by ides — scripts/build-state-images.mjs). Image is decorative; the
// name carries the semantics.
export function estadoImg(ides: string): string {
  return `${import.meta.env.BASE_URL}img/estados/${ides}.webp`;
}

export default function EstadoCard({ ides, nes }: { ides: string; nes: string }) {
  return (
    <li className={styles.card}>
      <Link to={`/estado/${ides}`} className={styles.link}>
        <img
          src={estadoImg(ides)}
          alt=""
          loading="lazy"
          className={styles.img}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <Text as="span" bold className={styles.name}>
          {nes}
        </Text>
      </Link>
    </li>
  );
}

// Made with my soul - Swately <3
