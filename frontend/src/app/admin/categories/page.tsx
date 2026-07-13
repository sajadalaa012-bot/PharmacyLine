"use client";

import { useState, useEffect, useCallback } from "react";
import { Category } from "@/types";
import {
  fetchProducts,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/api";
import { Plus, Edit3, Trash2, ChevronUp, ChevronDown, Check, X } from "lucide-react";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setCategories(await fetchProducts());
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
    [load]
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    run(async () => {
      await createCategory({ name });
      setNewName("");
    });
  };

  const handleRename = (cat: Category) => {
    const name = editingName.trim();
    if (!name || name === cat.name) {
      setEditingId(null);
      return;
    }
    run(async () => {
      await updateCategory(cat.id, { name, display_order: cat.display_order });
      setEditingId(null);
    });
  };

  const handleDelete = (cat: Category) => {
    if (cat.products.length > 0) {
      setError(
        `Cannot delete “${cat.name}” — it contains ${cat.products.length} products. Move or delete them first.`
      );
      return;
    }
    if (pendingDelete !== cat.id) {
      setPendingDelete(cat.id);
      setTimeout(
        () => setPendingDelete((cur) => (cur === cat.id ? null : cur)),
        3500
      );
      return;
    }
    setPendingDelete(null);
    run(async () => {
      await deleteCategory(cat.id);
    });
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= categories.length) return;
    const list = [...categories];
    [list[index], list[target]] = [list[target], list[index]];
    const reordered = list.map((cat, idx) => ({ ...cat, display_order: idx + 1 }));
    run(async () => {
      await Promise.all(
        reordered.map((cat) =>
          updateCategory(cat.id, { name: cat.name, display_order: cat.display_order })
        )
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

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6 sm:py-7">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Categories
        </h1>
        <p className="mt-1 text-xs text-ink-3">
          Rename, reorder, and organize the catalog sections
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-rose/30 bg-rose/10 p-3 text-xs text-rose">
          {error}
        </div>
      )}

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-3">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name (e.g. Lip Care)"
          disabled={busy}
          className="h-10 flex-1 rounded-md border border-line bg-sunken px-3.5 text-sm text-ink
                     outline-none transition placeholder:text-ink-3 focus:border-brand/50 focus:ring-1 focus:ring-brand/25"
        />
        <button
          type="submit"
          disabled={busy || !newName.trim()}
          className="label-caps flex h-10 items-center gap-1.5 rounded-md bg-brand px-4 text-on-brand transition hover:bg-brand-deep active:scale-[0.98] disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>

      {/* List */}
      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {categories.map((cat, idx) => (
          <li
            key={cat.id}
            className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-sunken/40"
          >
            <div className="min-w-0 flex-1">
              {editingId === cat.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(cat);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                    className="h-8 flex-1 rounded-md border border-brand/50 bg-sunken px-2.5 text-sm text-ink outline-none"
                  />
                  <button
                    onClick={() => handleRename(cat)}
                    aria-label="Save name"
                    className="flex h-8 w-8 items-center justify-center rounded-md bg-brand/15 text-brand transition hover:bg-brand/25"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    aria-label="Cancel rename"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition hover:bg-sunken"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-baseline gap-3">
                  <span className="truncate text-sm font-semibold text-ink">
                    {cat.name}
                  </span>
                  <span className="label-caps shrink-0 text-ink-3">
                    {cat.products.length} items
                  </span>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => handleMove(idx, "up")}
                disabled={idx === 0 || busy}
                title="Move up"
                className="flex h-8 w-8 items-center justify-center rounded-md text-ink-2 transition hover:bg-sunken hover:text-ink disabled:opacity-20"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleMove(idx, "down")}
                disabled={idx === categories.length - 1 || busy}
                title="Move down"
                className="flex h-8 w-8 items-center justify-center rounded-md text-ink-2 transition hover:bg-sunken hover:text-ink disabled:opacity-20"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              {editingId !== cat.id && (
                <button
                  onClick={() => {
                    setEditingId(cat.id);
                    setEditingName(cat.name);
                  }}
                  disabled={busy}
                  title="Rename category"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-ink-2 transition hover:bg-brand/15 hover:text-brand"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => handleDelete(cat)}
                disabled={busy}
                title={pendingDelete === cat.id ? "Click again to confirm" : "Delete category"}
                className={`flex h-8 items-center justify-center gap-1 rounded-md transition ${
                  pendingDelete === cat.id
                    ? "label-caps animate-pulse bg-rose px-2 text-white"
                    : "w-8 text-ink-2 hover:bg-rose/15 hover:text-rose"
                }`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {pendingDelete === cat.id && "Sure?"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
