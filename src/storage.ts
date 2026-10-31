// Persistence layer. In the desktop app, data lives as JSON files in the
// app's data folder (e.g. ~/Library/Application Support/io.github.lbhickman.youworld).
// When run in a plain browser (npm run dev), it falls back to localStorage.

import type { Bank, BankMeta, LabRow } from "./types";

export const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function invoke<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
  const core = await import("@tauri-apps/api/core");
  return core.invoke<T>(cmd, args);
}

async function readRaw(name: string): Promise<string | null> {
  if (isTauri()) return (await invoke<string | null>("read_data", { name })) ?? null;
  try {
    return localStorage.getItem("youworld:" + name);
  } catch {
    return null;
  }
}

async function writeRaw(name: string, contents: string): Promise<void> {
  if (isTauri()) {
    await invoke("write_data", { name, contents });
    return;
  }
  try {
    localStorage.setItem("youworld:" + name, contents);
  } catch (e) {
    console.error("Could not save", name, e);
    throw e;
  }
}

async function deleteRaw(name: string): Promise<void> {
  if (isTauri()) {
    await invoke("delete_data", { name });
    return;
  }
  try {
    localStorage.removeItem("youworld:" + name);
  } catch {
    /* ignore */
  }
}

async function readJson<T>(name: string, fallback: T): Promise<T> {
  const raw = await readRaw(name);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.error("Corrupt data file", name);
    return fallback;
  }
}

// ---- Banks index ----
export const loadBankIndex = () => readJson<BankMeta[]>("banks.json", []);
export const saveBankIndex = (list: BankMeta[]) => writeRaw("banks.json", JSON.stringify(list));

// ---- Individual bank ----
export const loadBank = (id: string) => readJson<Bank | null>(`bank-${id}.json`, null);
export const saveBank = (bank: Bank) => writeRaw(`bank-${bank.id}.json`, JSON.stringify(bank));

// ---- Images (data URLs keyed by content hash), stored separately per bank ----
export type AssetMap = Record<string, string>;
export const loadAssets = (bankId: string) => readJson<AssetMap>(`assets-${bankId}.json`, {});
export const saveAssets = (bankId: string, assets: AssetMap) =>
  writeRaw(`assets-${bankId}.json`, JSON.stringify(assets));

export async function deleteBankFiles(id: string) {
  await deleteRaw(`bank-${id}.json`);
  await deleteRaw(`assets-${id}.json`);
}

// ---- Lab values (user-editable) ----
export const loadLabs = () => readJson<LabRow[] | null>("labs.json", null);
export const saveLabs = (rows: LabRow[]) => writeRaw("labs.json", JSON.stringify(rows));
export const resetLabs = () => deleteRaw("labs.json");

// ---- Save a text file to a user-chosen location ----
export async function saveTextFileAs(defaultName: string, contents: string, ext: string[]) {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({
      defaultPath: defaultName,
      filters: [{ name: ext.join("/").toUpperCase(), extensions: ext }],
    });
    if (!path) return false;
    await invoke("save_text_file", { path, contents });
    return true;
  }
  const blob = new Blob([contents], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = defaultName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return true;
}

export async function openExternal(url: string) {
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } else {
    window.open(url, "_blank", "noopener");
  }
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
