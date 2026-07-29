import { useState } from 'react';
import { estadoImg } from './EstadoCard';
import { useMuniSidecar } from '../lib/data/commons';
import Text from '../primitives/Text';
import styles from './MuniHeader.module.css';

// Municipality header image: harvested Commons photo (with its credit) or the
// state photo as fallback. The credit line is part of the CC attribution.
export function muniImg(ides: string, idmun: string): string {
  return `${import.meta.env.BASE_URL}img/municipios/${ides}/${idmun}.webp`;
}

export default function MuniHeader({ ides, idmun }: { ides: string; idmun: string }) {
  const sidecar = useMuniSidecar(ides, idmun);
  const [muniImgFailed, setMuniImgFailed] = useState(false);

  const hasMuniImg = sidecar.status === 'ok' && !muniImgFailed;
  return (
    <figure className={styles.figure}>
      <img
        src={hasMuniImg ? muniImg(ides, idmun) : estadoImg(ides)}
        alt=""
        className={styles.img}
        onError={(e) => {
          if (hasMuniImg) setMuniImgFailed(true);
          else e.currentTarget.style.display = 'none';
        }}
      />
      {hasMuniImg && (
        <figcaption>
          <Text as="small" muted size={100}>
            Foto:{' '}
            <a href={sidecar.data.filePage} target="_blank" rel="noreferrer">
              {sidecar.data.artist}
            </a>{' '}
            ·{' '}
            {sidecar.data.licenseUrl ? (
              <a href={sidecar.data.licenseUrl} target="_blank" rel="noreferrer">
                {sidecar.data.license}
              </a>
            ) : (
              sidecar.data.license
            )}{' '}
            · Wikimedia Commons
          </Text>
        </figcaption>
      )}
    </figure>
  );
}

// Made with my soul - Swately <3
