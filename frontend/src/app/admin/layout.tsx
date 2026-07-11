"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Folder,
  ClipboardList,
  ShoppingBag,
  Monitor,
  LogOut,
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
];

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  return (
    <AuthGate>
    <div className="admin flex h-screen w-full overflow-hidden bg-paper text-ink">
      {/* Side rail (desktop) */}
      <aside className="print-hidden hidden w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="border-b border-line px-6 py-5">
          <p className="font-display text-xl font-semibold tracking-tight text-ink">
            Pharmacy Line
          </p>
          <p className="label-caps mt-1 text-brand">Back office</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-md px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${
                  active
                    ? "bg-brand text-on-brand"
                    : "text-ink-2 hover:bg-sunken hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-between border-t border-line px-3 py-4">
          <Link
            href="/"
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
      </aside>

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top nav */}
        <div className="print-hidden flex shrink-0 items-center gap-1 overflow-x-auto border-b border-line bg-surface px-3 py-2 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="font-display px-2 text-base font-semibold text-ink">
            Pharmacy Line
          </span>
          {NAV.map(({ href, label }) => {
            const active =
              href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`label-caps whitespace-nowrap rounded-md px-3 py-2 transition-colors ${
                  active ? "bg-brand text-on-brand" : "text-ink-2 hover:bg-sunken"
                }`}
              >
                {label}
              </Link>
            );
          })}
          <Link
            href="/"
            className="label-caps whitespace-nowrap rounded-md px-3 py-2 text-ink-3"
          >
            Shop
          </Link>
          <div className="ml-auto shrink-0">
            <ThemeToggle />
          </div>
        </div>

        <main className="scroll-thin min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
    </AuthGate>
  );
}
