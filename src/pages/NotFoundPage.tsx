import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <>
      <section className="hero hero--compact">
        <div className="hero__inner">
          <p className="hero__eyebrow">Error</p>
          <h1 className="hero__title hero__title--detail">404</h1>
        </div>
      </section>

      <section className="section">
        <div className="section__inner">
          <div className="empty-state">
            <h2>Page not found</h2>
            <p>This page doesn&apos;t exist. Check the URL, or head back to the products.</p>
            <Link className="pill-button" to="/products">
              Back to products
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
