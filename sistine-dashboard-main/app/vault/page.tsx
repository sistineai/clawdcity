"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowLeft,
  Moon,
  Sun,
  Loader2,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

// Sistine Logo (same as dashboard)
const SISTINE_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="400" zoomAndPan="magnify" viewBox="0 0 300 299.999988" height="400" preserveAspectRatio="xMidYMid meet" version="1.0"><defs><filter x="0%" y="0%" width="100%" height="100%" id="5e7a49b615"><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0" color-interpolation-filters="sRGB"/></filter></defs><rect x="-30" width="360" fill="#ffffff" y="-29.999999" height="359.999986" fill-opacity="1"/><rect x="-30" width="360" fill="#ffffff" y="-29.999999" height="359.999986" fill-opacity="1"/></svg>`;
const SISTINE_LOGO_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(SISTINE_LOGO_SVG)}`;

// Types
interface VaultData {
  name: string;
  location: string;
  registered?: number;
  eligible?: number;
  total: number;
  change24h: number;
  change7d: number;
  lastUpdated: string;
  unit: string;
}

interface PriceData {
  price: number;
  change24h: number;
}

interface ApiResponse {
  success: boolean;
  gold: Record<string, VaultData>;
  silver: Record<string, VaultData>;
  prices: {
    gold: PriceData;
    silver: PriceData;
  };
  timestamp: string;
}

const EMPTY_VAULT_DATA: Record<string, Record<string, VaultData>> = {
  gold: {},
  silver: {},
};

const DEFAULT_PRICES: Record<string, PriceData> = {
  gold: { price: 0, change24h: 0 },
  silver: { price: 0, change24h: 0 },
};

function ChangeIndicator({ value, suffix = '', theme }: { value: number; suffix?: string; theme: 'light' | 'dark' }) {
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-500">
        <TrendingUp className="h-3 w-3" />
        +{value.toFixed(2)}{suffix}
      </span>
    );
  } else if (value < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-rose-500">
        <TrendingDown className="h-3 w-3" />
        {value.toFixed(2)}{suffix}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 ${theme === 'light' ? 'text-gray-500' : 'text-white/50'}`}>
      <Minus className="h-3 w-3" />
      0.00{suffix}
    </span>
  );
}

function VaultCard({ vault, metal, expanded, onToggle, theme }: { vault: VaultData; metal: string; expanded: boolean; onToggle: () => void; theme: 'light' | 'dark' }) {
  const hasBreakdown = vault.registered !== undefined;
  const t = useMemo(() => ({
    border: theme === 'light' ? 'border-gray-200' : 'border-white/10',
    bgCard: theme === 'light' ? 'bg-white' : 'bg-white/5',
    text: theme === 'light' ? 'text-gray-900' : 'text-white',
    textMuted: theme === 'light' ? 'text-gray-500' : 'text-white/50',
    hover: theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-white/10',
  }), [theme]);
  
  return (
    <div className={`rounded-2xl border ${t.border} ${t.bgCard} overflow-hidden`}>
      <button onClick={onToggle} className={`w-full px-4 py-3 flex items-center justify-between ${t.hover} transition`}>
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${metal === 'gold' ? (theme === 'light' ? 'bg-amber-100' : 'bg-amber-500/20') : (theme === 'light' ? 'bg-gray-200' : 'bg-gray-500/20')}`}>
            <Building2 className={`h-5 w-5 ${metal === 'gold' ? (theme === 'light' ? 'text-amber-600' : 'text-amber-400') : (theme === 'light' ? 'text-gray-600' : 'text-gray-400')}`} />
          </div>
          <div className="text-left">
            <div className={`font-semibold ${t.text}`}>{vault.name}</div>
            <div className={`text-xs ${t.textMuted}`}>{vault.location}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className={`text-lg font-bold ${t.text}`}>{vault.total.toFixed(2)} {vault.unit}</div>
            <div className="text-xs"><ChangeIndicator value={vault.change24h} suffix=" oz (24h)" theme={theme} /></div>
          </div>
          {hasBreakdown && (expanded ? <ChevronUp className={`h-5 w-5 ${t.textMuted}`} /> : <ChevronDown className={`h-5 w-5 ${t.textMuted}`} />)}
        </div>
      </button>
      {expanded && hasBreakdown && (
        <div className={`px-4 pb-4 border-t ${t.border} pt-3`}>
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl p-3 ${theme === 'light' ? 'bg-emerald-50' : 'bg-emerald-500/10'}`}>
              <div className={`text-xs font-medium mb-1 ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}`}>Registered</div>
              <div className={`text-lg font-bold ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-300'}`}>{vault.registered?.toFixed(2)} {vault.unit}</div>
              <div className={`text-[10px] ${theme === 'light' ? 'text-emerald-600/70' : 'text-emerald-400/70'}`}>Available for delivery</div>
            </div>
            <div className={`rounded-xl p-3 ${theme === 'light' ? 'bg-amber-50' : 'bg-amber-500/10'}`}>
              <div className={`text-xs font-medium mb-1 ${theme === 'light' ? 'text-amber-600' : 'text-amber-400'}`}>Eligible</div>
              <div className={`text-lg font-bold ${theme === 'light' ? 'text-amber-700' : 'text-amber-300'}`}>{vault.eligible?.toFixed(2)} {vault.unit}</div>
              <div className={`text-[10px] ${theme === 'light' ? 'text-amber-600/70' : 'text-amber-400/70'}`}>Meets exchange standards</div>
            </div>
          </div>
          <div className={`mt-3 flex items-center justify-between text-xs ${t.textMuted}`}>
            <span>7d change: <ChangeIndicator value={vault.change7d} suffix=" oz" theme={theme} /></span>
            <span>Updated: {new Date(vault.lastUpdated).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MetalSummary({ metal, vaults, price, theme }: { metal: string; vaults: Record<string, VaultData>; price: PriceData; theme: 'light' | 'dark' }) {
  const totalOunces = Object.values(vaults).reduce((sum, v) => sum + v.total, 0);
  const totalValue = totalOunces * 1000000 * price.price;
  const total24hChange = Object.values(vaults).reduce((sum, v) => sum + v.change24h, 0);
  const t = useMemo(() => ({ text: theme === 'light' ? 'text-gray-900' : 'text-white', textMuted: theme === 'light' ? 'text-gray-500' : 'text-white/50' }), [theme]);
  
  return (
    <div className={`rounded-2xl p-5 ${metal === 'gold' ? (theme === 'light' ? 'bg-gradient-to-br from-amber-50 to-amber-100/50' : 'bg-gradient-to-br from-amber-500/20 to-amber-600/10') : (theme === 'light' ? 'bg-gradient-to-br from-gray-100 to-gray-200/50' : 'bg-gradient-to-br from-gray-500/20 to-gray-600/10')}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${metal === 'gold' ? (theme === 'light' ? 'bg-amber-200' : 'bg-amber-500/30') : (theme === 'light' ? 'bg-gray-300' : 'bg-gray-500/30')}`}>
            <span className="text-lg">{metal === 'gold' ? '🥇' : '🥈'}</span>
          </div>
          <div>
            <div className={`font-bold ${t.text} capitalize`}>{metal}</div>
            <div className={`text-xs ${t.textMuted}`}>Global Vault Holdings</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-sm ${t.textMuted}`}>Spot Price</div>
          <div className={`font-bold ${t.text}`}>${price.price.toLocaleString()}</div>
          <div className="text-xs"><ChangeIndicator value={price.change24h} suffix="%" theme={theme} /></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className={`text-xs ${t.textMuted} mb-1`}>Total Holdings</div>
          <div className={`text-2xl font-bold ${t.text}`}>{totalOunces.toFixed(2)} M oz</div>
          <div className="text-xs mt-1"><ChangeIndicator value={total24hChange} suffix=" oz (24h)" theme={theme} /></div>
        </div>
        <div>
          <div className={`text-xs ${t.textMuted} mb-1`}>Estimated Value</div>
          <div className={`text-2xl font-bold ${t.text}`}>${(totalValue / 1e9).toFixed(1)}B</div>
          <div className={`text-xs ${t.textMuted} mt-1`}>at current spot</div>
        </div>
      </div>
    </div>
  );
}

export default function VaultTrackerPage() {
  const [selectedMetal, setSelectedMetal] = useState<'gold' | 'silver'>('gold');
  const [expandedVault, setExpandedVault] = useState<string | null>('comex');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [loading, setLoading] = useState(true);
  const [vaultData, setVaultData] = useState<Record<string, Record<string, VaultData>>>(EMPTY_VAULT_DATA);
  const [priceData, setPriceData] = useState<Record<string, PriceData>>(DEFAULT_PRICES);
  
  const fetchVaultData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vault-data');
      if (res.ok) {
        const data: ApiResponse = await res.json();
        if (data.success) {
          setVaultData({ gold: data.gold, silver: data.silver });
          setPriceData(data.prices);
        }
      }
    } catch (e) {
      console.error('Failed to fetch vault data:', e);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => { fetchVaultData(); }, [fetchVaultData]);
  useEffect(() => { const saved = localStorage.getItem('sistine-theme'); if (saved === 'dark' || saved === 'light') setTheme(saved); }, []);
  
  const toggleTheme = useCallback(() => { setTheme((prev) => { const next = prev === 'light' ? 'dark' : 'light'; localStorage.setItem('sistine-theme', next); return next; }); }, []);
  
  const vaults = vaultData[selectedMetal] || {};
  const price = priceData[selectedMetal] || DEFAULT_PRICES[selectedMetal];
  const hasData = Object.keys(vaults).length > 0;
  
  const t = useMemo(() => ({
    bg: theme === 'light' ? 'bg-gray-50' : 'bg-[#070b12]',
    bgCard: theme === 'light' ? 'bg-white' : 'bg-white/5',
    bgHeader: theme === 'light' ? 'bg-white/90' : 'bg-[#070b12]/90',
    border: theme === 'light' ? 'border-gray-200' : 'border-white/10',
    text: theme === 'light' ? 'text-gray-900' : 'text-white',
    textMuted: theme === 'light' ? 'text-gray-500' : 'text-white/55',
    textSecondary: theme === 'light' ? 'text-gray-600' : 'text-white/70',
    hover: theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10',
  }), [theme]);
  
  return (
    <div className={`min-h-screen w-full ${t.bg} ${t.text} transition-colors duration-200`}>
      <div className={`sticky top-0 z-30 border-b ${t.border} ${t.bgHeader} backdrop-blur`}>
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className={`inline-flex items-center gap-2 rounded-2xl border ${t.border} ${t.bgCard} px-3 py-2 text-xs ${t.textSecondary} ${t.hover}`}>
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <div className={`h-6 w-px ${t.border}`} />
            <div className="leading-tight">
              <div className={`text-sm font-bold tracking-tight ${theme === 'light' ? 'text-gray-900' : 'bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent'}`}>Vault Tracker</div>
              <div className={`text-[11px] ${t.textMuted}`}>Global Precious Metals Inventory</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className={`inline-flex items-center justify-center rounded-2xl border ${t.border} ${t.bgCard} p-2 ${t.textSecondary} ${t.hover}`}>
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <button onClick={fetchVaultData} disabled={loading} className={`inline-flex items-center gap-2 rounded-2xl border ${t.border} ${t.bgCard} px-3 py-2 text-xs ${t.textSecondary} ${t.hover} disabled:opacity-50`}>
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
          </div>
        </div>
      </div>
      
      <div className="mx-auto max-w-[1200px] px-4 py-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setSelectedMetal('gold')} className={`flex-1 rounded-2xl px-4 py-3 font-semibold transition border ${selectedMetal === 'gold' ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20' : `${t.bgCard} ${t.border} ${t.textSecondary} ${t.hover}`}`}>🥇 Gold</button>
          <button onClick={() => setSelectedMetal('silver')} className={`flex-1 rounded-2xl px-4 py-3 font-semibold transition border ${selectedMetal === 'silver' ? 'bg-gray-500 text-white border-gray-500 shadow-lg shadow-gray-500/20' : `${t.bgCard} ${t.border} ${t.textSecondary} ${t.hover}`}`}>🥈 Silver</button>
        </div>
        
        <div className="mb-6"><MetalSummary metal={selectedMetal} vaults={vaults} price={price} theme={theme} /></div>
        
        <div className={`rounded-2xl border p-4 mb-6 flex items-start gap-3 ${theme === 'light' ? 'bg-blue-50 border-blue-100' : 'bg-blue-500/10 border-blue-500/20'}`}>
          <Info className={`h-5 w-5 shrink-0 mt-0.5 ${theme === 'light' ? 'text-blue-500' : 'text-blue-400'}`} />
          <div className={`text-sm ${theme === 'light' ? 'text-blue-700' : 'text-blue-300'}`}>
            <strong>Understanding Vault Data:</strong> "Registered" metal is available for immediate delivery against futures contracts. "Eligible" metal meets exchange standards but isn't registered for delivery. Declining inventory can signal physical demand exceeding supply.
          </div>
        </div>
        
        <div className="space-y-3">
          <div className={`text-sm font-semibold uppercase tracking-wide ${t.textMuted}`}>Individual Vaults</div>
          {loading && !hasData ? (
            <div className={`flex items-center justify-center py-12 ${t.textMuted}`}><Loader2 className="h-6 w-6 animate-spin mr-2" />Loading vault data...</div>
          ) : !hasData ? (
            <div className={`text-center py-12 ${t.textMuted}`}>No vault data available. Click refresh to try again.</div>
          ) : (
            Object.entries(vaults).map(([key, vault]) => (
              <VaultCard key={key} vault={vault} metal={selectedMetal} expanded={expandedVault === key} onToggle={() => setExpandedVault(expandedVault === key ? null : key)} theme={theme} />
            ))
          )}
        </div>
        
        <div className={`mt-6 rounded-2xl border ${t.border} ${t.bgCard} p-5`}>
          <div className={`text-sm font-semibold ${t.textSecondary} mb-4`}>Inventory Trend (30 Days)</div>
          <div className={`h-48 rounded-xl flex items-center justify-center ${theme === 'light' ? 'bg-gray-50 text-gray-400' : 'bg-white/5 text-white/30'}`}>📊 Historical chart coming soon</div>
        </div>
        
        <div className={`mt-6 text-xs ${t.textMuted} text-center`}>Data sources: CME Group (COMEX), Shanghai Futures Exchange, LBMA, Perth Mint, Bank of England<br/>Updates vary by source • Some data may be delayed</div>
      </div>
    </div>
  );
}
