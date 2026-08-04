"use client";

// One copy of the pharmacy directory for the whole back office.
//
// The directory and the visit map used to fetch it separately, so moving
// between them re-hit the database and each screen could show a different
// snapshot after an edit. Loading it once here means both read the same list,
// navigation is instant, and a change made on one screen is already there on
// the other.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Pharmacy, PharmacyFolder } from "@/types";
import { fetchPharmacies, fetchPharmacyFolders } from "./api";

interface PharmacyStore {
  pharmacies: Pharmacy[];
  folders: PharmacyFolder[];
  loading: boolean;
  error: string | null;
  /** Re-read both lists from the server. */
  reload: () => Promise<void>;
  /** Swap one pharmacy in place — used for optimistic pin drags on the map. */
  replacePharmacy: (pharmacy: Pharmacy) => void;
  /** Name of a folder id, or the "unfiled" label for null. */
  folderName: (id: number | null, unfiledLabel: string) => string;
}

const Ctx = createContext<PharmacyStore | null>(null);

export function PharmacyProvider({ children }: { children: React.ReactNode }) {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [folders, setFolders] = useState<PharmacyFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [ph, fo] = await Promise.all([
        fetchPharmacies(),
        fetchPharmacyFolders(),
      ]);
      setPharmacies(ph);
      setFolders(fo);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const replacePharmacy = useCallback((pharmacy: Pharmacy) => {
    setPharmacies((cur) =>
      cur.map((p) => (p.id === pharmacy.id ? pharmacy : p)),
    );
  }, []);

  const folderName = useCallback(
    (id: number | null, unfiledLabel: string) =>
      id == null
        ? unfiledLabel
        : (folders.find((f) => f.id === id)?.name ?? unfiledLabel),
    [folders],
  );

  const value = useMemo<PharmacyStore>(
    () => ({
      pharmacies,
      folders,
      loading,
      error,
      reload,
      replacePharmacy,
      folderName,
    }),
    [pharmacies, folders, loading, error, reload, replacePharmacy, folderName],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePharmacies(): PharmacyStore {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("usePharmacies must be used inside <PharmacyProvider>.");
  }
  return ctx;
}
