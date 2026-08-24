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
  productId: number;
  productName: string;
  variant?: 'icon' | 'full';
}

export function WishlistButton({ productId, productName, variant = 'icon' }: WishlistButtonProps) {
  const isWishlisted = useIsWishlisted(productId);
  const toggle = useWishlistStore((state) => state.toggle);

  const label = isWishlisted
    ? `Remove ${productName} from wishlist`
    : `Add ${productName} to wishlist`;

  if (variant === 'full') {
    return (
      <button
        type="button"
        className={isWishlisted ? 'pill-button pill-button--active' : 'pill-button'}
        onClick={() => toggle(productId)}
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
        toggle(productId);
      }}
      aria-pressed={isWishlisted}
      aria-label={label}
      title={label}
    >
      <HeartIcon filled={isWishlisted} />
    </button>
  );
}
