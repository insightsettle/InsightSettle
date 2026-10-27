import { cn } from "@/lib/utils";

/**
 * Payment acceptance marks (founder, 27 Oct: real brand icons on the checkout).
 * Artwork lives in /public/brand/payments (see NOTICE.md for sources and licences). The official mada mark
 * is not in any open library, so mada uses a neutral wordmark chip until the provider's merchant-kit artwork
 * is dropped in as /brand/payments/mada.svg.
 */
export type PaymentBrand = "mada" | "visa" | "mastercard" | "amex" | "applepay";

const SRC: Partial<Record<PaymentBrand, string>> = {
  visa: "/brand/payments/visa.svg",
  mastercard: "/brand/payments/mastercard.svg",
  amex: "/brand/payments/amex.svg",
  applepay: "/brand/payments/applepay.svg",
};
const NAME: Record<PaymentBrand, string> = { mada: "mada", visa: "Visa", mastercard: "Mastercard", amex: "American Express", applepay: "Apple Pay" };

/** One mark in a card-shaped chip (same size for every brand so rows line up). */
export function PaymentMark({ brand, size = "md", className }: { brand: PaymentBrand; size?: "sm" | "md" | "lg" | undefined; className?: string | undefined }) {
  const box = size === "sm" ? "h-5 w-8" : size === "lg" ? "h-8 w-[50px]" : "h-6 w-[38px]";
  const src = SRC[brand];
  if (brand === "mada" || !src) {
    return (
      <span role="img" aria-label={NAME[brand]} className={cn("inline-grid shrink-0 place-items-center rounded-[4px] border border-border bg-white font-sans font-extrabold lowercase leading-none tracking-tight text-[#1b1b1b]", box, size === "sm" ? "text-[9px]" : size === "lg" ? "text-sm" : "text-[11px]", className)} dir="ltr">
        {NAME[brand]}
      </span>
    );
  }
  if (brand === "applepay") {
    return <span className={cn("inline-grid shrink-0 place-items-center rounded-[4px] border border-border bg-white px-0.5", box, className)}><img src={src} alt={NAME[brand]} className="h-[78%] w-auto" draggable={false} /></span>;
  }
  return <img src={src} alt={NAME[brand]} className={cn("shrink-0 rounded-[4px] shadow-[0_0_0_1px_rgb(0_0_0/0.06)]", box, className)} draggable={false} />;
}

export function PaymentMarks({ brands, size, className }: { brands: PaymentBrand[]; size?: "sm" | "md" | "lg" | undefined; className?: string | undefined }) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)} dir="ltr">
      {brands.map((b) => <PaymentMark key={b} brand={b} size={size} />)}
    </span>
  );
}

/** Which marks belong to each checkout method. */
export const METHOD_BRANDS = {
  mada: ["mada"],
  credit_card: ["visa", "mastercard"],
  bank_transfer: [],
} as const satisfies Record<string, readonly PaymentBrand[]>;
