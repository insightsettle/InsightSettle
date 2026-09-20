import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";

import logo from "@/assets/insight-logo.png";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Home" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/roles", label: "Roles" },
  { to: "/services", label: "Services & fees" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="Insight" className="size-9 rounded-lg object-contain" />
          <span className="text-lg font-extrabold">Insight</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to="/dashboard">New deal</Link>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={() => setOpen((v) => !v)}
          >
            <Menu className="size-4" />
          </Button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-card px-4 py-3 lg:hidden">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="Insight" className="size-8 rounded-lg object-contain" />
            <span className="font-bold">Insight</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Secure escrow that protects every payment until delivery is confirmed.
          </p>
        </div>
        <FooterCol
          title="Platform"
          links={[
            { to: "/how-it-works", label: "How it works" },
            { to: "/services", label: "Services & fees" },
            { to: "/roles", label: "Roles & access" },
          ]}
        />
        <FooterCol
          title="Account"
          links={[
            { to: "/dashboard", label: "Dashboard" },
            { to: "/documents", label: "Document review" },
            { to: "/disputes", label: "Dispute center" },
          ]}
        />
        <div>
          <h4 className="text-sm font-semibold">Policies</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Terms of service</li>
            <li>Privacy policy</li>
            <li>Disputes & refunds</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground">
        Demo experience — all balances and payment details are{" "}
        <span className="text-warning">sample data</span>. No real funds are moved.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="transition-colors hover:text-primary">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className={cn("flex-1", className)}>{children}</main>
      <SiteFooter />
    </div>
  );
}
