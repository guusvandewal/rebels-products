import { Link, useParams } from 'react-router-dom';
import { useAllProducts, useProduct } from '../api/products';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { WishlistButton } from '../components/WishlistButton';

function formatSpecKey(key: string): string {
  const spaced = key.replace(/([A-Z])/g, ' $1').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: product, isPending, isError } = useProduct(id);
  const { data: allProducts } = useAllProducts();

  const related = product
    ? allProducts
        ?.filter((other) => other.category === product.category && other.id !== product.id)
        .slice(0, 3)
    : undefined;

  return (
    <>
      <section className="hero hero--compact">
        {product && (
          <div className="hero__inner">
            <nav aria-label="Breadcrumb" className="breadcrumb-trail">
              <ol>
                <li>
                  <Link to="/products" className="breadcrumb">
                    All products
                  </Link>
                </li>
                <li>
                  <Link
                    to={`/products?category=${encodeURIComponent(product.category)}`}
                    className="breadcrumb"
                  >
                    {product.category}
                  </Link>
                </li>
              </ol>
            </nav>
            <p className="hero__eyebrow">{product.brand}</p>
            <h1 className="hero__title hero__title--detail">{product.name}</h1>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__inner">
          {isPending && <p className="results-bar__count">Loading...</p>}

          {!isPending && (isError || !product) && (
            <div className="empty-state">
              <h2>Product not found</h2>
              <p>This product doesn&apos;t exist or the API isn&apos;t running.</p>
              <Link className="pill-button" to="/products">
                Back to products
              </Link>
            </div>
          )}

          {product && (
            <div className="detail">
              <div className="detail__media">
                <ProductImage product={product} />
              </div>

              <div className="detail__info">
                <p className="detail__category">{product.category}</p>
                <hr className="rule" />
                <h2 className="detail__heading">
                  Speci<em>fications</em>
                </h2>
                <dl className="specs">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div className="specs__row" key={key}>
                      <dt>{formatSpecKey(key)}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <WishlistButton product={product} variant="full" />
              </div>
            </div>
          )}
        </div>
      </section>

      {related && related.length > 0 && (
        <section className="section section--tight">
          <div className="section__inner">
            <h2 className="section__heading">
              More in <em>{product?.category}</em>
            </h2>
            <hr className="rule" />
            <div className="grid">
              {related.map((other) => (
                <ProductCard key={other.id} product={other} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
