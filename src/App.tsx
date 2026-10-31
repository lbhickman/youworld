import { useCallback, useEffect, useRef, useState } from "react";
import type { Bank, BankMeta, LabRow } from "./types";
import * as store from "./storage";
import type { AssetMap } from "./storage";
import { DEFAULT_LABS } from "./labValues";
import BankPicker from "./components/BankPicker";
import BankShell, { type View } from "./components/BankShell";
import TestRunner from "./components/TestRunner";
import { LabsContext } from "./components/LabValuesPanel";

export default function App() {
  const [index, setIndex] = useState<BankMeta[] | null>(null);
  const [bank, setBank] = useState<Bank | null>(null);
  const [assets, setAssets] = useState<AssetMap>({});
  const [view, setView] = useState<View>("create");
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [labs, setLabs] = useState<LabRow[]>(DEFAULT_LABS);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const pending = useRef<Bank | null>(null);

  useEffect(() => {
    store.loadBankIndex().then(setIndex);
    store.loadLabs().then((l) => l && l.length && setLabs(l));
  }, []);

  const flush = useCallback(async () => {
    const b = pending.current;
    if (!b) return;
    pending.current = null;
    try {
      await store.saveBank(b);
      const list = (await store.loadBankIndex()).map((m) =>
        m.id === b.id ? { ...m, name: b.name, updatedAt: Date.now(), questionCount: b.questions.length } : m,
      );
      await store.saveBankIndex(list);
      setIndex(list);
      setSaveError(null);
    } catch (e) {
      setSaveError(String(e));
    }
  }, []);

  // Save shortly after each change, and immediately when the window closes.
  const updateBank = useCallback(
    (fn: (b: Bank) => Bank, immediate = false) => {
      setBank((prev) => {
        if (!prev) return prev;
        const next = fn(prev);
        pending.current = next;
        window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(flush, immediate ? 0 : 400);
        return next;
      });
    },
    [flush],
  );

  useEffect(() => {
    const onHide = () => void flush();
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flush]);

  const addAssets = useCallback(
    async (more: AssetMap) => {
      if (!bank || !Object.keys(more).length) return;
      const merged = { ...assets, ...more };
      setAssets(merged);
      await store.saveAssets(bank.id, merged);
    },
    [assets, bank],
  );

  const openBank = async (id: string) => {
    const b = await store.loadBank(id);
    if (!b) {
      alert("This bank's data file could not be found.");
      return;
    }
    setAssets(await store.loadAssets(id));
    setBank(b);
    setView(b.questions.length ? "create" : "import");
    setActiveTestId(null);
  };

  const closeBank = async () => {
    await flush();
    setBank(null);
    setAssets({});
    setActiveTestId(null);
    setIndex(await store.loadBankIndex());
  };

  const updateLabs = async (rows: LabRow[] | null) => {
    if (rows) {
      setLabs(rows);
      await store.saveLabs(rows);
    } else {
      setLabs(DEFAULT_LABS);
      await store.resetLabs();
    }
  };

  if (!index) return <div className="splash">Loading…</div>;

  let content;
  if (!bank) {
    content = <BankPicker index={index} setIndex={setIndex} onOpen={openBank} />;
  } else if (activeTestId) {
    content = (
      <TestRunner
        bank={bank}
        assets={assets}
        testId={activeTestId}
        updateBank={updateBank}
        onExit={(goTo) => {
          setActiveTestId(null);
          if (goTo) setView(goTo);
          void flush();
        }}
      />
    );
  } else {
    content = (
      <BankShell
        bank={bank}
        assets={assets}
        view={view}
        setView={setView}
        updateBank={updateBank}
        addAssets={addAssets}
        startTest={(id) => setActiveTestId(id)}
        closeBank={closeBank}
        labs={labs}
        updateLabs={updateLabs}
      />
    );
  }

  return (
    <LabsContext.Provider value={labs}>
      {saveError && (
        <div className="save-error">
          Could not save your progress: {saveError}
          <button onClick={() => setSaveError(null)}>Dismiss</button>
        </div>
      )}
      {content}
    </LabsContext.Provider>
  );
}
