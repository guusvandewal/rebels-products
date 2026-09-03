import { Link } from 'react-router-dom';
import type { Product } from '../api/products';
import { trackProductClick } from '../lib/analytics';
import { ProductImage } from './ProductImage';
import { WishlistButton } from './WishlistButton';

interface ProductCardProps {
  product: Product;
  /** Heading level for the product name, so the card slots into whatever
   *  heading structure the surrounding page already has. */
  headingLevel?: 2 | 3;
}

export function ProductCard({ product, headingLevel = 2 }: ProductCardProps) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3';

  return (
    <article className="card">
      <div className="card__media">
        <ProductImage product={product} decorative />
        <WishlistButton product={product} />
      </div>
      <div className="card__body">
        <p className="card__brand">{product.brand}</p>
        <Heading className="card__name">
          {/* The only link in the card; CSS stretches it over the whole
              card so the full card stays a mouse target without nesting
              the wishlist button inside a link. */}
          <Link
            to={`/products/${product.id}`}
            className="card__link"
            onClick={() => trackProductClick(product)}
          >
            {product.name}
          </Link>
        </Heading>
        <p className="card__category">{product.category}</p>
      </div>
    </article>
  );
}
