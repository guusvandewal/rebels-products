import { useState } from 'react';
import type { Product } from '../api/products';
import { useUnsplashPhoto } from '../api/unsplash';

/**
 * The assignment db points at source.unsplash.com, which no longer serves
 * images. We fetch a live photo from the Unsplash API by product name and
 * fall back to a branded tile while loading, if that fetch fails, or if the
 * resulting image itself fails to load.
 */
export function ProductImage({ product }: { product: Product }) {
  const [imgFailed, setImgFailed] = useState(false);
  const { data: photo, isError } = useUnsplashPhoto(product.name);

  if (isError || imgFailed || !photo) {
    const dark = product.id % 2 === 0;
    return (
      <div
        className={dark ? 'product-tile product-tile--dark' : 'product-tile product-tile--pink'}
        role="img"
        aria-label={product.name}
      >
        <span className="product-tile__initial">{product.name.charAt(0)}</span>
        <span className="product-tile__category">{product.category}</span>
      </div>
    );
  }

  return (
    <img
      className="product-image"
      src={photo.urls.small}
      alt={photo.alt_description ?? product.name}
      loading="lazy"
      onError={() => setImgFailed(true)}
    />
  );
}
