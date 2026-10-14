export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number; // USD cents
  emoji: string;
};

const PRODUCTS: Product[] = [
  { id: "roar-tee", sku: "SKU-1001", name: "Roar Tee", description: "Soft cotton tee for loud launches.", price: 2800, emoji: "👕" },
  { id: "lion-mug", sku: "SKU-1002", name: "Lion Mug", description: "12oz of courage, dishwasher safe.", price: 1600, emoji: "☕" },
  { id: "mane-cap", sku: "SKU-1003", name: "Mane Cap", description: "Keeps the sun off during on-call.", price: 2200, emoji: "🧢" },
  { id: "pride-stickers", sku: "SKU-1004", name: "Pride Sticker Pack", description: "Six vinyl stickers for your laptop.", price: 800, emoji: "🦁" },
  { id: "deploy-hoodie", sku: "SKU-1005", name: "Deploy Friday Hoodie", description: "For people who ship on Fridays.", price: 5400, emoji: "🧥" },
  { id: "bug-plush", sku: "SKU-1006", name: "Squashed Bug Plush", description: "A trophy for every fixed incident.", price: 1900, emoji: "🐞" },
];

// Catalog indexed by product id, used for server-side price lookups.
export const CATALOG: Record<string, Product> = Object.fromEntries(
  PRODUCTS.map((p) => [p.id, p]),
);

export const listProducts = (): Product[] => Object.values(CATALOG);

export const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
