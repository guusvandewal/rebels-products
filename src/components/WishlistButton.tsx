import type { Product } from '../api/products';
import { trackWishlistAdd, trackWishlistRemove } from '../lib/analytics';
import { useIsWishlisted, useWishlistStore } from '../stores/wishlist';

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="heart" aria-hidden="true">
      <path
        d="M12 20.5C7.5 16.9 3 13.2 3 8.9 3 6.1 5.2 4 7.9 4c1.6 0 3.1.8 4.1 2.1C13 4.8 14.5 4 16.1 4 18.8 4 21 6.1 21 8.9c0 4.3-4.5 8-9 11.6z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface WishlistButtonProps {
  product: Pick<Product, 'id' | 'name' | 'brand' | 'category'>;
  variant?: 'icon' | 'full';
}

export function WishlistButton({ product, variant = 'icon' }: WishlistButtonProps) {
  const isWishlisted = useIsWishlisted(product.id);
  const toggle = useWishlistStore((state) => state.toggle);

  function handleToggle() {
    if (isWishlisted) {
      trackWishlistRemove(product);
    } else {
      trackWishlistAdd(product);
    }
    toggle(product.id);
  }

  const label = isWishlisted
    ? `Remove ${product.name} from wishlist`
    : `Add ${product.name} to wishlist`;

  if (variant === 'full') {
    return (
      <button
        type="button"
        className={isWishlisted ? 'pill-button pill-button--active' : 'pill-button'}
        onClick={handleToggle}
        aria-pressed={isWishlisted}
      >
        <HeartIcon filled={isWishlisted} />
        {isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={isWishlisted ? 'heart-button heart-button--active' : 'heart-button'}
      onClick={(event) => {
        // The card itself is a link, keep the click on the button.
        event.preventDefault();
        event.stopPropagation();
        handleToggle();
      }}
      aria-pressed={isWishlisted}
      aria-label={label}
      title={label}
    >
      <HeartIcon filled={isWishlisted} />
    </button>
  );
}
