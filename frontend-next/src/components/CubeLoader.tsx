import React from 'react';
import styles from '../app/produk-digital/digital.module.css';

interface CubeLoaderProps {
  text?: string;
  size?: 'normal' | 'small';
}

export function CubeLoader({ text, size = 'normal' }: CubeLoaderProps) {
  return (
    <div className={styles.loaderContainer} role="status" aria-live="polite">
      <div
        className={styles.cube}
        style={size === 'small' ? { width: '48px', height: '48px', gap: '4px' } : undefined}
        aria-hidden="true"
      >
        <div className={`${styles.cube_item} ${styles.cube_x}`} />
        <div className={`${styles.cube_item} ${styles.cube_y}`} />
        <div className={`${styles.cube_item} ${styles.cube_y}`} />
        <div className={`${styles.cube_item} ${styles.cube_x}`} />
      </div>
      {text && <p className={styles.loaderText}>{text}</p>}
    </div>
  );
}

export default CubeLoader;
