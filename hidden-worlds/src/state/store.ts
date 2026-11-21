// App state (Zustand). The saved document lives here and is written through storage.ts on
// every change. Transient UI state (toasts, the loaded pack) sits alongside it.
import { create } from 'zustand';
import { setCommon, track } from '../adapters';
import { now } from '../game/clock';
import { todayKey } from '../game/dates';
import type { SpritePack } from '../engine/pack/types';
import { loadDoc, pruneDoc, saveDoc } from './storage';
import { freshDoc, type SaveDoc, type Settings } from './schema';
import { newDeviceId } from './storage';

export interface Toast {
  id: number;
  text: string;
}

interface AppState {
  doc: SaveDoc;
  first: boolean;
  recovered: boolean;
  pack: SpritePack | null;
  packError: string | null;
  toast: Toast | null;
  update(fn: (d: SaveDoc) => SaveDoc): void;
  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void;
  setPack(p: SpritePack | null, error?: string | null): void;
  showToast(text: string): void;
  reset(): void;
}

function initial() {
  const t = now();
  const r = loadDoc(t);
  const doc = pruneDoc({ ...r.doc, lastOpen: t }, todayKey(t));
  saveDoc(doc);
  setCommon({ device_id: doc.deviceId });
  return { doc, first: r.first, recovered: r.recovered };
}

let toastId = 0;
export const useApp = create<AppState>()((set, get) => ({
  ...initial(),
  pack: null,
  packError: null,
  toast: null,
  update(fn) {
    const doc = fn(get().doc);
    saveDoc(doc);
    set({ doc });
  },
  setSetting(key, value) {
    get().update((d) => ({ ...d, settings: { ...d.settings, [key]: value } }));
    track('settings_change', { key, value: typeof value === 'boolean' ? value : String(value) });
  },
  setPack(pack, error = null) {
    set({ pack, packError: error });
    if (pack) setCommon({ pack_id: pack.id });
  },
  showToast(text) {
    const id = ++toastId;
    set({ toast: { id, text } });
    setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null });
    }, 2600);
  },
  reset() {
    const doc = { ...freshDoc(now(), newDeviceId()), onboarded: true };
    saveDoc(doc);
    setCommon({ device_id: doc.deviceId });
    set({ doc });
  },
}));

export const getDoc = () => useApp.getState().doc;
