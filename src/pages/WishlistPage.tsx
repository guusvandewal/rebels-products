import { Link } from 'react-router-dom';
import { useProductsByIds } from '../api/products';
import { ProductImage } from '../components/ProductImage';
import { useWishlistStore } from '../stores/wishlist';

export function WishlistPage() {
  const productIds = useWishlistStore((state) => state.productIds);
  const remove = useWishlistStore((state) => state.remove);
  const clear = useWishlistStore((state) => state.clear);
  const { data: products, isPending } = useProductsByIds(productIds);

  const isEmpty = productIds.length === 0;

  return (
    <>
      <section className="hero hero--compact">
        <div className="hero__inner">
          <p className="hero__eyebrow">Your</p>
          <h1 className="hero__title">Wishlist</h1>
          <div className="hero__body">
            <p>
              {isEmpty
                ? 'Still empty. Tap the heart on a product to save it.'
                : `${productIds.length} product${productIds.length === 1 ? '' : 's'} saved, stored locally in your browser.`}
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__inner">
          {isEmpty ? (
            <div className="empty-state">
              <h2>Nothing saved</h2>
              <p>Find something nice and save it here, just like on Coolblue.</p>
              <Link className="pill-button" to="/products">
                View products
              </Link>
            </div>
          ) : (
            <>
              <div className="results-bar">
                <span className="results-bar__count">
                  {isPending
                    ? 'Loading...'
                    : `${products?.length ?? 0} product${(products?.length ?? 0) === 1 ? '' : 's'}`}
                </span>
                <button type="button" className="text-button" onClick={clear}>
                  Remove all
                </button>
              </div>

              <ul className="wishlist">
                {products?.map((product) => (
                  <li className="wishlist__row" key={product.id}>
                    <Link to={`/products/${product.id}`} className="wishlist__media">
                      <ProductImage product={product} />
                    </Link>
                    <div className="wishlist__info">
                      <p className="card__brand">{product.brand}</p>
                      <Link to={`/products/${product.id}`} className="wishlist__name">
                        {product.name}
                      </Link>
                      <p className="card__category">{product.category}</p>
                    </div>
                    <button
                      type="button"
                      className="text-button text-button--danger"
                      onClick={() => remove(product.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </>
  );
}
