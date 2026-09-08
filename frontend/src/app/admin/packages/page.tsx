"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package as PackageType,
  PackageInput,
  Product,
  isDiscounted,
  packageItemCount,
  packageValue,
} from "@/types";
import {
  fetchAllPackages,
  fetchProducts,
  createPackage,
  updatePackage,
  deletePackage,
} from "@/lib/api";
import PackageModal from "@/components/admin/PackageModal";
import {
  Plus,
  Edit3,
  Trash2,
  ChevronUp,
  ChevronDown,
  Boxes,
  Eye,
  EyeOff,
} from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";
import { localized } from "@/lib/i18n";
import { num } from "@/lib/format";

/**
 * Where the shop's packages are built, priced and switched on.
 *
 * The list is deliberately blunt about state: a package that is hidden, has
 * no price, or has nothing in it says so on its own row. Those three are the
 * only reasons a package someone has just created isn't on the home page, and
 * having to open each one to find out which would be the annoying version.
 */
export default function AdminPackagesPage() {
  const { t, lang } = useI18n();
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PackageType | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [pkgs, cats] = await Promise.all([
        fetchAllPackages(),
        fetchProducts(),
      ]);
      setPackages(pkgs);
      setProducts(cats.flatMap((c) => c.products));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true);
      setError(null);
      try {
        await fn();
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (pkg: PackageType) => {
    setEditing(pkg);
    setModalOpen(true);
  };

  // The modal reports its own errors, so a failure here has to reach it
  // rather than be swallowed by `run`.
  const handleSave = async (input: PackageInput) => {
    if (editing) await updatePackage(editing.id, input);
    else await createPackage(input);
    setModalOpen(false);
    await load();
  };

  /** Switch one package on or off without opening it. */
  const toggleActive = (pkg: PackageType) =>
    run(async () => {
      await updatePackage(pkg.id, { ...pkg, active: !pkg.active });
    });

  const handleDelete = (pkg: PackageType) => {
    if (pendingDelete !== pkg.id) {
      setPendingDelete(pkg.id);
      setTimeout(
        () => setPendingDelete((cur) => (cur === pkg.id ? null : cur)),
        3500,
      );
      return;
    }
    setPendingDelete(null);
    run(async () => {
      await deletePackage(pkg.id);
    });
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= packages.length) return;
    const list = [...packages];
    [list[index], list[target]] = [list[target], list[index]];
    run(async () => {
      // Renumber the pair that actually moved, not the whole list.
      await Promise.all(
        list.map((pkg, idx) =>
          pkg.display_order === idx + 1
            ? Promise.resolve()
            : updatePackage(pkg.id, { ...pkg, display_order: idx + 1 }),
        ),
      );
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
      </div>
    );
  }

  const nextOrder = packages.length + 1;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6 sm:py-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            {t("nav.packages")}
          </h1>
          <p className="mt-1 max-w-md text-xs text-ink-3">{t("pkg.subtitle")}</p>
        </div>
        <button
          onClick={openNew}
          disabled={busy}
          className="label-caps flex h-10 shrink-0 items-center gap-1.5 rounded-md bg-brand px-4 text-on-brand transition hover:bg-brand-deep active:scale-[0.98] disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          {t("pkg.new")}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-rose/30 bg-rose/10 p-3 text-xs text-rose">
          {error}
        </div>
      )}

      {packages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line px-6 py-12 text-center">
          <Boxes className="mx-auto h-8 w-8 text-line-strong" />
          <p className="mt-3 text-sm font-semibold text-ink">
            {t("pkg.noneYet")}
          </p>
          <p className="mt-1 text-xs text-ink-3">{t("pkg.noneYetHint")}</p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {packages.map((pkg, idx) => {
            const count = packageItemCount(pkg);
            const separately = packageValue(pkg, products);
            const onOffer = isDiscounted(pkg);
            return (
              <li
                key={pkg.id}
                className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-sunken/40 sm:px-4"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-white">
                  {pkg.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={pkg.image_url}
                      alt=""
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <Boxes className="h-5 w-5 text-line-strong" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="truncate text-sm font-semibold text-ink">
                      <bdi>{localized(pkg, "name", lang)}</bdi>
                    </span>
                    <span
                      className={`label-caps shrink-0 rounded-full px-1.5 py-0.5 ${
                        pkg.active
                          ? "bg-brand/12 text-brand"
                          : "bg-sunken text-ink-3"
                      }`}
                    >
                      {t(pkg.active ? "pkg.live" : "pkg.hidden")}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-[11px] text-ink-3">
                    <span className="tabular-nums">
                      {count === 1
                        ? t("pkg.oneItem")
                        : t("pkg.itemsCount", { n: count })}
                    </span>
                    {onOffer && (
                      <span className="tabular-nums line-through decoration-rose/60">
                        {num(pkg.old_price as number)}
                      </span>
                    )}
                    <span
                      className={`font-semibold tabular-nums ${
                        onOffer ? "text-rose" : "text-ink-2"
                      }`}
                    >
                      {num(pkg.price)} {t("common.currency")}
                    </span>
                    {separately > 0 && (
                      <span className="tabular-nums">
                        {t("pkg.separately")} {num(separately)}
                      </span>
                    )}
                  </div>

                  {/* Why this package isn't selling, when it isn't. */}
                  {(pkg.price <= 0 || count === 0) && (
                    <p className="mt-1 text-[11px] font-semibold text-copper">
                      {[
                        pkg.price <= 0 ? t("pkg.needsPrice") : null,
                        count === 0 ? t("pkg.needsItems") : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    onClick={() => handleMove(idx, "up")}
                    disabled={idx === 0 || busy}
                    title={t("pkg.moveUp")}
                    className="hidden h-8 w-8 items-center justify-center rounded-md text-ink-2 transition hover:bg-sunken hover:text-ink disabled:opacity-20 sm:flex"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleMove(idx, "down")}
                    disabled={idx === packages.length - 1 || busy}
                    title={t("pkg.moveDown")}
                    className="hidden h-8 w-8 items-center justify-center rounded-md text-ink-2 transition hover:bg-sunken hover:text-ink disabled:opacity-20 sm:flex"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggleActive(pkg)}
                    disabled={busy}
                    title={t(pkg.active ? "pkg.hidden" : "pkg.showOnStorefront")}
                    className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
                      pkg.active
                        ? "text-brand hover:bg-brand/15"
                        : "text-ink-3 hover:bg-sunken hover:text-ink"
                    }`}
                  >
                    {pkg.active ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(pkg)}
                    disabled={busy}
                    title={t("common.edit")}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-ink-2 transition hover:bg-brand/15 hover:text-brand"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(pkg)}
                    disabled={busy}
                    title={
                      pendingDelete === pkg.id
                        ? t("common.clickAgain")
                        : t("pkg.deletePackage")
                    }
                    className={`flex h-8 items-center justify-center gap-1 rounded-md transition ${
                      pendingDelete === pkg.id
                        ? "label-caps animate-pulse bg-rose px-2 text-paper"
                        : "w-8 text-ink-2 hover:bg-rose/15 hover:text-rose"
                    }`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {pendingDelete === pkg.id && t("common.sure")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <PackageModal
        isOpen={modalOpen}
        pkg={editing}
        products={products}
        nextOrder={nextOrder}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
