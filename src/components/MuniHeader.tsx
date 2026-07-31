import { useState } from 'react';
import { estadoImg } from './EstadoCard';
import type { MuniImage } from '../lib/data/types';
import Text from '../primitives/Text';
import styles from './MuniHeader.module.css';

// Presentational: the municipality photo + its CC credit, or the state photo as
// fallback. It fetches NOTHING — `img` arrives with the forecast the page
// already loaded, so one municipality view costs one request.
export function muniImg(ides: string, idmun: string): string {
  return `${import.meta.env.BASE_URL}img/municipios/${ides}/${idmun}.webp`;
}

export default function MuniHeader({
  ides,
  idmun,
  img,
}: {
  ides: string;
  idmun: string;
  img?: MuniImage;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  // `file === null` (or no img at all) is the honest "no photo" signal: use the
  // state image WITHOUT requesting a .webp that cannot exist.
  const photo = img?.file ? img : null;
  const showPhoto = photo !== null && !imgFailed;

  return (
    <figure className={styles.figure}>
      <img
        src={showPhoto ? muniImg(ides, idmun) : estadoImg(ides)}
        alt=""
        className={styles.img}
        onError={(e) => {
          if (showPhoto) setImgFailed(true);
          else e.currentTarget.style.display = 'none';
        }}
      />
      {showPhoto && (
        <figcaption>
          <Text as="small" muted size={100}>
            Foto:{' '}
            {photo.filePage ? (
              <a href={photo.filePage} target="_blank" rel="noreferrer">
                {photo.artist}
              </a>
            ) : (
              photo.artist
            )}{' '}
            ·{' '}
            {photo.licenseUrl ? (
              <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
                {photo.license}
              </a>
            ) : (
              photo.license
            )}{' '}
            · Wikimedia Commons
          </Text>
        </figcaption>
      )}
    </figure>
  );
}

// Made with my soul - Swately <3
