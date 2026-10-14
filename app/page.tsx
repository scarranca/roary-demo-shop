import Shop from "./components/Shop";
import { listProducts } from "@/lib/catalog";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-amber-600">Roary Demo Shop</p>
          <h1 className="mt-1 text-3xl font-bold text-stone-900">Merch for teams that ship</h1>
        </div>
        <p className="hidden text-sm text-stone-500 sm:block">Free shipping over $50</p>
      </header>
      <Shop products={listProducts()} />
    </main>
  );
}
