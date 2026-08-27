"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, Upload, RefreshCw } from "lucide-react";
import {
  planRecovery,
  applyRecovery,
  type RecoveryPlan,
  type RecoveryResult,
} from "@/lib/recoverLocalCatalog";
import { useI18n } from "@/lib/LanguageProvider";
import { num } from "@/lib/format";

/**
 * Publishes catalog edits that are stranded in this browser.
 *
 * Before the catalog moved into the shared database, the admin saved products
 * to IndexedDB — so anything edited then is invisible to every other device.
 * This shows what it would take to make the database match this browser and
 * writes nothing until that plan is confirmed, because matching it means
 * deleting server rows this device doesn't have.
 */
export default function RecoverPage() {
  const { t } = useI18n();
  const [plan, setPlan] = useState<RecoveryPlan | null>(null);
  const [localCount, setLocalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<RecoveryResult | null>(null);

  // Nothing is set synchronously here: the first statement has to be the
  // await, or mounting this page schedules a cascading render.
  const load = useCallback(async () => {
    try {
      const { local, plan } = await planRecovery();
      setLocalCount(local.products.length);
      setPlan(plan);
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

  /** The refresh button — unlike mounting, this wants the spinner back. */
  const reload = () => {
    setLoading(true);
    load();
  };

  const apply = async () => {
    if (!plan) return;
    setApplying(true);
    setError(null);
    try {
      const res = await applyRecovery(plan);
      setResult(res);
      setConfirmed(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }

  const deletions = plan?.deleteProducts.length ?? 0;
  // Wiping most of the shop is what a stale or half-seeded device looks like,
  // not what recovering a few edits looks like. Say so before it happens.
  const drastic = deletions > 0 && localCount > 0 && deletions > localCount / 2;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-5 sm:p-8">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          {t("recover.title")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          {t("recover.lede")}
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-rose/30 bg-rose/5 p-4 text-sm text-rose">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-brand/30 bg-brand/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Check className="h-4 w-4 text-brand" />
            {t("recover.done")}
          </p>
          <p className="mt-2 text-sm text-ink-2">
            {t("recover.doneDetail", {
              created: num(result.created),
              updated: num(result.updated),
              deleted: num(result.deleted),
            })}
          </p>
          {result.failures.length > 0 && (
            <div className="mt-3 rounded-md border border-rose/25 bg-surface p-3">
              <p className="text-xs font-semibold text-rose">
                {t("recover.partial", { n: num(result.failures.length) })}
              </p>
              <ul className="mt-1.5 space-y-1">
                {result.failures.map((f) => (
                  <li key={f} className="text-[11px] text-ink-2">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {localCount === 0 ? (
        <div className="rounded-lg border border-line bg-surface p-6 text-center">
          <p className="text-sm font-medium text-ink">{t("recover.noLocal")}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-3">
            {t("recover.noLocalHint")}
          </p>
        </div>
      ) : plan?.empty ? (
        <div className="rounded-lg border border-line bg-surface p-6 text-center">
          <p className="text-sm font-medium text-ink">{t("recover.inSync")}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-3">
            {t("recover.inSyncHint", { n: num(localCount) })}
          </p>
        </div>
      ) : (
        plan && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label={t("recover.toAdd")} value={plan.createProducts.length} />
              <Stat
                label={t("recover.toUpdate")}
                value={plan.updateProducts.length}
              />
              <Stat
                label={t("recover.toDelete")}
                value={plan.deleteProducts.length}
                danger
              />
              <Stat label={t("recover.skipped")} value={plan.skipped.length} />
            </div>

            <p className="rounded-lg border border-line bg-sunken/50 px-4 py-3 text-xs leading-relaxed text-ink-2">
              {t("recover.categoriesKept")}
            </p>

            {drastic && (
              <div className="flex gap-3 rounded-lg border border-rose/40 bg-rose/5 p-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose" />
                <p className="text-sm leading-relaxed text-ink-2">
                  {t("recover.drastic", {
                    deletions: num(deletions),
                    local: num(localCount),
                  })}
                </p>
              </div>
            )}

            <Section
              title={t("recover.toUpdate")}
              rows={plan.updateProducts.map(({ local, changed }) => ({
                key: `u${local.id}`,
                code: local.code,
                name: local.name,
                note: changed.join(", "),
              }))}
            />
            <Section
              title={t("recover.toDelete")}
              danger
              rows={plan.deleteProducts.map((p) => ({
                key: `d${p.id}`,
                code: p.code,
                name: p.name,
              }))}
            />
            <Section
              title={t("recover.toAdd")}
              rows={plan.createProducts.map((p) => ({
                key: `c${p.id}`,
                code: p.code,
                name: p.name,
              }))}
            />
            <Section
              title={t("recover.skipped")}
              rows={plan.skipped.map((p) => ({
                key: `s${p.id}`,
                code: p.code,
                name: p.name,
                note: t("recover.skippedNote"),
              }))}
            />

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface p-4">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
              />
              <span className="text-sm leading-relaxed text-ink-2">
                {t("recover.confirm")}
              </span>
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={apply}
                disabled={!confirmed || applying}
                className="flex h-11 items-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-on-brand
                           transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-40"
              >
                {applying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {t("recover.publish")}
              </button>
              <button
                onClick={reload}
                disabled={applying}
                className="flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-sm font-semibold text-ink transition hover:bg-sunken disabled:opacity-40"
              >
                <RefreshCw className="h-4 w-4" />
                {t("common.retry")}
              </button>
            </div>
          </>
        )
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p
        className={`font-display text-2xl font-semibold tabular-nums ${
          danger && value > 0 ? "text-rose" : "text-ink"
        }`}
      >
        {num(value)}
      </p>
      <p className="label-caps mt-1 text-ink-3">{label}</p>
    </div>
  );
}

function Section({
  title,
  rows,
  danger,
}: {
  title: string;
  danger?: boolean;
  rows: { key: string; code: string; name: string; note?: string }[];
}) {
  if (rows.length === 0) return null;
  return (
    <section className="rounded-lg border border-line bg-surface">
      <h2
        className={`label-caps border-b border-line px-4 py-3 ${
          danger ? "text-rose" : "text-ink-2"
        }`}
      >
        {title} · {rows.length}
      </h2>
      <ul className="scroll-thin max-h-64 divide-y divide-line overflow-y-auto">
        {rows.map((r) => (
          <li key={r.key} className="flex items-baseline gap-3 px-4 py-2.5">
            <span className="shrink-0 font-mono text-[11px] text-ink-3">
              {r.code}
            </span>
            <span className="truncate text-sm text-ink">{r.name}</span>
            {r.note && (
              <span className="ms-auto shrink-0 text-[11px] text-ink-3">
                {r.note}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
