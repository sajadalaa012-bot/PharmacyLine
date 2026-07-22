"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Folder,
  ClipboardList,
  ShoppingBag,
  Monitor,
  MapPin,
  Map as MapIcon,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import AuthGate from "@/components/AuthGate";
import { logout } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/sell", label: "New sale", icon: Monitor },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Folder },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/pharmacies", label: "Pharmacies", icon: MapPin },
  { href: "/admin/map", label: "Visit map", icon: MapIcon },
];

/** The rail contents — shared by the desktop sidebar and the mobile drawer. */
function SideNavContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="border-b border-line px-6 py-5">
        <p className="font-display text-xl font-semibold tracking-tight text-ink">
          Pharmacy Line
        </p>
        <p className="label-caps mt-1 text-brand">Back office</p>
      </div>

      <nav className="scroll-thin flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-md px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${
                active
                  ? "bg-brand text-on-brand"
                  : "text-ink-2 hover:bg-sunken hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between border-t border-line px-3 py-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="label-caps flex items-center gap-2.5 rounded-md px-3.5 py-2 text-ink-3 transition hover:bg-sunken hover:text-ink"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          Storefront
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className="rounded-md p-2 text-ink-3 transition hover:bg-sunken hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <ThemeToggle />
        </div>
      </div>
    </>
  );
}

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const activeLabel =
    NAV.find(({ href }) =>
      href === "/admin" ? pathname === "/admin" : pathname.startsWith(href),
    )?.label ?? "Back office";

  return (
    <AuthGate>
      <div className="admin flex h-screen w-full overflow-hidden bg-paper text-ink">
        {/* Side rail (desktop) */}
        <aside className="print-hidden hidden w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
          <SideNavContent pathname={pathname} />
        </aside>

        {/* Content column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <header className="print-hidden flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-3 md:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink-2 transition hover:bg-sunken hover:text-ink"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-display truncate text-base font-semibold leading-none text-ink">
                Pharmacy Line
              </p>
              <p className="label-caps mt-1 truncate text-brand">{activeLabel}</p>
            </div>
            <ThemeToggle />
          </header>

          {/* Mobile drawer */}
          {menuOpen && (
            <div className="print-hidden fixed inset-0 z-50 md:hidden">
              <div
                className="fade-in absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                onClick={() => setMenuOpen(false)}
              />
              <div className="admin slide-in-left absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col bg-surface shadow-2xl">
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition hover:bg-sunken hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
                <SideNavContent
                  pathname={pathname}
                  onNavigate={() => setMenuOpen(false)}
                />
              </div>
            </div>
          )}

          <main className="scroll-thin min-h-0 flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AuthGate>
  );
}
