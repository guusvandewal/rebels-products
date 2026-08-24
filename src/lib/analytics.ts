import type { Product } from '../api/products';

export interface DataLayerEvent {
  event: string;
  [key: string]: unknown;
}

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
  }
}

/**
 * Pushes an event onto window.dataLayer — the standard integration point
 * Google Tag Manager listens to for Custom Event triggers, so a GTM
 * container dropped in later can subscribe to these event names with no
 * code changes here. No container is loaded yet, so this also logs to the
 * console for visibility in the meantime.
 */
function pushDataLayerEvent(event: DataLayerEvent): void {
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(event);
  console.info('[dataLayer]', event);
}

type TrackableProduct = Pick<Product, 'id' | 'name' | 'brand' | 'category'>;

function toItem(product: TrackableProduct) {
  return {
    item_id: product.id,
    item_name: product.name,
    item_brand: product.brand,
    item_category: product.category,
  };
}

export function trackSearch(searchTerm: string): void {
  pushDataLayerEvent({ event: 'search', search_term: searchTerm });
}

export function trackProductClick(product: TrackableProduct): void {
  pushDataLayerEvent({ event: 'select_item', ...toItem(product) });
}

export function trackWishlistAdd(product: TrackableProduct): void {
  pushDataLayerEvent({ event: 'add_to_wishlist', ...toItem(product) });
}

export function trackWishlistRemove(product: TrackableProduct): void {
  pushDataLayerEvent({ event: 'remove_from_wishlist', ...toItem(product) });
}
