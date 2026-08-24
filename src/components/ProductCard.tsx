import { Link } from 'react-router-dom';
import type { Product } from '../api/products';
import { ProductImage } from './ProductImage';
import { WishlistButton } from './WishlistButton';

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="card">
      <Link to={`/products/${product.id}`} className="card__link">
        <div className="card__media">
          <ProductImage product={product} />
          <WishlistButton productId={product.id} productName={product.name} />
        </div>
        <div className="card__body">
          <p className="card__brand">{product.brand}</p>
          <h2 className="card__name">{product.name}</h2>
          <p className="card__category">{product.category}</p>
        </div>
      </Link>
    </article>
  );
}
