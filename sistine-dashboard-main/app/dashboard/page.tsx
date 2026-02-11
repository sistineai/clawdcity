"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Search,
  RefreshCcw,
  ExternalLink,
  Flame,
  TrendingUp,
  Globe,
  Rss,
  Sparkles,
  X,
  Filter,
  Share2,
  CreditCard,
  Moon,
  Sun,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Building2,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

// --- Sistine Research logo (SVG provided by user) ---
const SISTINE_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="400" zoomAndPan="magnify" viewBox="0 0 300 299.999988" height="400" preserveAspectRatio="xMidYMid meet" version="1.0"><defs><filter x="0%" y="0%" width="100%" height="100%" id="5e7a49b615"><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0" color-interpolation-filters="sRGB"/></filter><filter x="0%" y="0%" width="100%" height="100%" id="a458ec5d12"><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0.2126 0.7152 0.0722 0 0" color-interpolation-filters="sRGB"/></filter><mask id="65bec0d799"><g filter="url(#5e7a49b615)"><g filter="url(#a458ec5d12)" transform="matrix(0.3, 0, 0, 0.3, 0.000006, 0)"><image x="0" y="0" width="1000" xlink:href="data:image/png;base64,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" height="1000" preserveAspectRatio="xMidYMid meet"/></g></g></mask></defs><rect x="-30" width="360" fill="#ffffff" y="-29.999999" height="359.999986" fill-opacity="1"/><rect x="-30" width="360" fill="#ffffff" y="-29.999999" height="359.999986" fill-opacity="1"/><g mask="url(#65bec0d799)"><g transform="matrix(0.3, 0, 0, 0.3, 0.000006, 0)"><image x="0" y="0" width="1000" xlink:href="data:image/png;base64,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" height="1000" preserveAspectRatio="xMidYMid meet"/></g></g></svg>`;
const SISTINE_LOGO_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(SISTINE_LOGO_SVG)}`;

type AssetClass = "Crypto" | "Equities" | "Indexes" | "Energy" | "Metals" | "FX" | "Agriculture";
type ImpactDirection = "Bullish" | "Bearish" | "Neutral";

type AssetImpact = {
  asset: string;
  assetClass: AssetClass | string;
  direction: ImpactDirection | string;
  rationale: string;
};

type FeedItem = {
  id: string;
  sourceName: string;
  handle: string;
  ts: string;
  text: string;
  url?: string;
  lat?: number;
  lon?: number;
  country?: string;
  // AI-generated fields
  impactScore: number;
  impactLevel: 'Severe' | 'High' | 'Medium' | 'Low';
  assets: AssetImpact[];
  research: {
    summary: string;
    firstOrder: Array<{asset: string; direction: string; rationale: string}>;
    secondOrder: Array<{asset: string; direction: string; rationale: string}>;
    thirdOrder: Array<{asset: string; direction: string; rationale: string}>;
    contrarian: string;
    confidence: string;
  } | null;
  isAnalyzed: boolean;
  // Congressional trade fields
  isCongressTrade?: boolean;
  tradeData?: {
    politician: string;
    chamber: 'House' | 'Senate';
    party: string;
    ticker: string;
    type: 'Buy' | 'Sell';
    amount: string;
  };
};

type QuoteRow = {
  key: string;
  name: string;
  symbol: string;
  assetClass: AssetClass;
  price: number;
  mcap: number;
  chg24: number;
  spark: number[];
};

// Approximate coordinates for countries (for map dots)
const COUNTRY_COORDS: Record<string, { lat: number; lon: number }> = {
  "Ukraine": { lat: 48.3794, lon: 31.1656 },
  "Russia": { lat: 61.524, lon: 105.3188 },
  "Israel": { lat: 31.0461, lon: 34.8516 },
  "Iran": { lat: 32.4279, lon: 53.688 },
  "China": { lat: 35.8617, lon: 104.1954 },
  "Japan": { lat: 36.2048, lon: 138.2529 },
  "United States of America": { lat: 37.0902, lon: -95.7129 },
  "United Kingdom": { lat: 55.3781, lon: -3.436 },
  "Germany": { lat: 51.1657, lon: 10.4515 },
  "France": { lat: 46.2276, lon: 2.2137 },
  "Yemen": { lat: 15.5527, lon: 48.5164 },
  "Saudi Arabia": { lat: 23.8859, lon: 45.0792 },
  "India": { lat: 20.5937, lon: 78.9629 },
  "Australia": { lat: -25.2744, lon: 133.7751 },
  "Canada": { lat: 56.1304, lon: -106.3468 },
  "Brazil": { lat: -14.235, lon: -51.9253 },
  "Mexico": { lat: 23.6345, lon: -102.5528 },
  "South Korea": { lat: 35.9078, lon: 127.7669 },
  "North Korea": { lat: 40.3399, lon: 127.5101 },
  "Syria": { lat: 34.8021, lon: 38.9968 },
  "Turkey": { lat: 38.9637, lon: 35.2433 },
  "Egypt": { lat: 26.8206, lon: 30.8025 },
  "Poland": { lat: 51.9194, lon: 19.1451 },
  "Netherlands": { lat: 52.1326, lon: 5.2913 },
  "Switzerland": { lat: 46.8182, lon: 8.2275 },
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function fmtMoney(n: number) {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(2)}K`;
  return `${sign}$${abs.toFixed(abs >= 1 ? 2 : 4)}`;
}

function fmtPrice(n: number) {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1000) return `$${n.toFixed(2)}`;
  if (abs >= 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(6)}`;
}

function fmtPct(n: number) {
  if (!Number.isFinite(n)) return "—";
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}

function timeAgoLabel(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.max(0, Math.floor(ms / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function stableId(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function directionBadge(dir: string, theme: 'light' | 'dark' = 'dark') {
  if (theme === 'light') {
    if (dir === "Bullish") return "border-emerald-600/40 text-emerald-700 bg-emerald-500/15";
    if (dir === "Bearish") return "border-rose-600/40 text-rose-700 bg-rose-500/15";
    return "border-gray-300 text-gray-600 bg-gray-100";
  }
  if (dir === "Bullish") return "border-emerald-500/25 text-emerald-200 bg-emerald-500/10";
  if (dir === "Bearish") return "border-rose-500/25 text-rose-200 bg-rose-500/10";
  return "border-white/10 text-white/75 bg-white/5";
}

function impactLevelBadge(level: string, theme: 'light' | 'dark' = 'dark') {
  if (theme === 'light') {
    if (level === "Severe" || level === "High") return "border-red-600/50 text-red-700 bg-red-500/15";
    if (level === "Medium") return "border-amber-600/50 text-amber-700 bg-amber-500/15";
    return "border-emerald-600/50 text-emerald-700 bg-emerald-500/15";
  }
  if (level === "Severe" || level === "High") return "border-red-500/50 text-red-200 bg-red-500/20";
  if (level === "Medium") return "border-amber-500/50 text-amber-200 bg-amber-500/20";
  return "border-emerald-500/50 text-emerald-200 bg-emerald-500/20";
}

function impactScoreColor(score: number) {
  if (score >= 75) return "text-rose-400";
  if (score >= 55) return "text-amber-400";
  return "text-emerald-400";
}

// Helper: Wrap text into lines that fit within maxWidth
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

// Helper function to draw rounded rectangles
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Screenshot tile by rendering to canvas (light mode style)
async function shareToX(
  item: {
    sourceName: string;
    handle: string;
    text: string;
    country?: string;
    impactLevel?: string;
    assets?: Array<{asset: string; direction: string; rationale?: string; assetClass?: string}>;
    research?: { summary?: string } | null;
  }
) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    alert('Unable to generate image. Please try again.');
    return;
  }

  // Scale for retina
  const scale = 2;
  const width = 600;
  const padding = 20;
  
  // Calculate height based on content
  let contentHeight = padding; // top padding
  contentHeight += 36; // header row
  contentHeight += 20; // increased gap before headline
  contentHeight += 60; // headline (approx 2-3 lines)
  contentHeight += 14; // gap
  contentHeight += 28; // tags row
  contentHeight += 18; // divider gap
  contentHeight += 28; // "Impact Breakdown" header
  contentHeight += 12; // gap
  
  const numAssets = Math.min((item.assets || []).length, 3);
  contentHeight += numAssets > 0 ? 100 : 0; // asset cards
  contentHeight += 12; // gap
  contentHeight += item.research?.summary ? 80 : 0; // summary
  contentHeight += padding; // bottom padding

  const height = Math.max(contentHeight, 320);
  
  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);

  // Fill ENTIRE canvas with background color first (prevents white corners on Twitter)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Background - Light mode
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 0, 0, width, height, 24);
  ctx.fill();

  // Border
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  roundRect(ctx, 0, 0, width, height, 24);
  ctx.stroke();

  let y = padding;
  const x = padding;
  const innerWidth = width - (padding * 2);

  // === HEADER ROW ===
  // Source logo placeholder (rounded square)
  const logoSize = 36;
  ctx.fillStyle = '#f3f4f6';
  roundRect(ctx, x, y, logoSize, logoSize, 12);
  ctx.fill();
  ctx.strokeStyle = '#e5e7eb';
  roundRect(ctx, x, y, logoSize, logoSize, 12);
  ctx.stroke();

  // Source logo letter
  ctx.fillStyle = '#6b7280';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(item.sourceName.charAt(0).toUpperCase(), x + logoSize/2, y + logoSize/2 + 5);
  ctx.textAlign = 'left';

  // Source name
  ctx.fillStyle = '#111827';
  ctx.font = '600 12px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(item.sourceName, x + logoSize + 12, y + 14);

  // @handle
  ctx.fillStyle = '#6b7280';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`@${item.handle}`, x + logoSize + 12, y + 30);

  y += logoSize + 20; // Increased gap before headline

  // === HEADLINE ===
  ctx.fillStyle = '#1f2937';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
  const headlineLines = wrapText(ctx, item.text, innerWidth);
  headlineLines.slice(0, 3).forEach((line, idx) => {
    ctx.fillText(line, x, y + (idx * 18));
  });
  y += Math.min(headlineLines.length, 3) * 18 + 14;

  // === TAGS ROW ===
  let tagX = x;
  const tagHeight = 22;
  const tagGap = 8;

  // Helper to draw a tag
  const drawTag = (text: string, bgColor: string, borderColor: string, textColor: string) => {
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    const textWidth = ctx.measureText(text).width;
    const tagWidth = textWidth + 16;
    
    if (tagX + tagWidth > width - padding) {
      tagX = x;
      y += tagHeight + 6;
    }
    
    ctx.fillStyle = bgColor;
    roundRect(ctx, tagX, y, tagWidth, tagHeight, tagHeight/2);
    ctx.fill();
    
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    roundRect(ctx, tagX, y, tagWidth, tagHeight, tagHeight/2);
    ctx.stroke();
    
    ctx.fillStyle = textColor;
    ctx.fillText(text, tagX + 8, y + 15);
    
    tagX += tagWidth + tagGap;
  };

  // Country tag
  const country = item.country || 'Global';
  drawTag(country, '#f9fafb', '#e5e7eb', '#4b5563');

  // Impact level tag
  const impactLevel = item.impactLevel || 'Medium';
  let impactBg, impactBorder, impactText;
  if (impactLevel === 'Severe' || impactLevel === 'High') {
    impactBg = '#fef2f2';
    impactBorder = '#fca5a5';
    impactText = '#dc2626';
  } else if (impactLevel === 'Low') {
    impactBg = '#f0fdf4';
    impactBorder = '#86efac';
    impactText = '#16a34a';
  } else {
    impactBg = '#fffbeb';
    impactBorder = '#fcd34d';
    impactText = '#d97706';
  }
  ctx.font = '600 10px -apple-system, BlinkMacSystemFont, sans-serif';
  drawTag(`${impactLevel === 'Severe' ? 'High' : impactLevel} Impact`, impactBg, impactBorder, impactText);

  // Asset tags
  ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
  (item.assets || []).slice(0, 3).forEach((asset) => {
    let assetBg, assetBorder, assetText;
    if (asset.direction === 'Bullish') {
      assetBg = '#f0fdf4';
      assetBorder = '#86efac';
      assetText = '#16a34a';
    } else if (asset.direction === 'Bearish') {
      assetBg = '#fef2f2';
      assetBorder = '#fca5a5';
      assetText = '#dc2626';
    } else {
      assetBg = '#f9fafb';
      assetBorder = '#d1d5db';
      assetText = '#6b7280';
    }
    drawTag(`${asset.asset}: ${asset.direction}`, assetBg, assetBorder, assetText);
  });

  y += tagHeight + 18;

  // === DIVIDER ===
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(width - padding, y);
  ctx.stroke();
  y += 16;

  // === IMPACT BREAKDOWN HEADER ===
  ctx.fillStyle = '#374151';
  ctx.font = '600 11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Impact Breakdown', x, y + 10);
  y += 28;

  // === ASSET CARDS ===
  const assets = (item.assets || []).slice(0, 3);
  if (assets.length > 0) {
    const cardGap = 8;
    const cardWidth = (innerWidth - (cardGap * (assets.length - 1))) / assets.length;
    const cardHeight = 88;

    assets.forEach((asset, idx) => {
      const cardX = x + (idx * (cardWidth + cardGap));
      
      // Card background - Light
      ctx.fillStyle = '#f9fafb';
      roundRect(ctx, cardX, y, cardWidth, cardHeight, 16);
      ctx.fill();
      
      ctx.strokeStyle = '#e5e7eb';
      roundRect(ctx, cardX, y, cardWidth, cardHeight, 16);
      ctx.stroke();

      // Asset name
      ctx.fillStyle = '#111827';
      ctx.font = '600 12px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(asset.asset, cardX + 12, y + 20);

      // Direction badge
      let dirBg, dirBorder, dirText;
      if (asset.direction === 'Bullish') {
        dirBg = '#dcfce7';
        dirBorder = '#86efac';
        dirText = '#16a34a';
      } else if (asset.direction === 'Bearish') {
        dirBg = '#fee2e2';
        dirBorder = '#fca5a5';
        dirText = '#dc2626';
      } else {
        dirBg = '#f3f4f6';
        dirBorder = '#d1d5db';
        dirText = '#6b7280';
      }
      
      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
      const dirWidth = ctx.measureText(asset.direction).width + 12;
      const dirX = cardX + cardWidth - dirWidth - 12;
      
      ctx.fillStyle = dirBg;
      roundRect(ctx, dirX, y + 8, dirWidth, 18, 9);
      ctx.fill();
      ctx.strokeStyle = dirBorder;
      roundRect(ctx, dirX, y + 8, dirWidth, 18, 9);
      ctx.stroke();
      ctx.fillStyle = dirText;
      ctx.fillText(asset.direction, dirX + 6, y + 20);

      // Rationale
      if (asset.rationale) {
        ctx.fillStyle = '#4b5563';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        const rationaleLines = wrapText(ctx, asset.rationale, cardWidth - 24);
        rationaleLines.slice(0, 2).forEach((line, lineIdx) => {
          ctx.fillText(line, cardX + 12, y + 44 + (lineIdx * 14));
        });
      }

      // Asset class
      if (asset.assetClass) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(`Class: ${asset.assetClass}`, cardX + 12, y + cardHeight - 12);
      }
    });

    y += cardHeight + 12;
  }

  // === SUMMARY ===
  if (item.research?.summary) {
    const summaryHeight = 72;
    
    // Summary background - Light purple
    ctx.fillStyle = '#faf5ff';
    roundRect(ctx, x, y, innerWidth, summaryHeight, 16);
    ctx.fill();
    
    ctx.strokeStyle = '#d8b4fe';
    roundRect(ctx, x, y, innerWidth, summaryHeight, 16);
    ctx.stroke();

    // SUMMARY label
    ctx.fillStyle = '#9333ea';
    ctx.font = '600 10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('SUMMARY', x + 12, y + 18);

    // Summary text
    ctx.fillStyle = '#374151';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    const summaryLines = wrapText(ctx, item.research.summary, innerWidth - 24);
    summaryLines.slice(0, 2).forEach((line, idx) => {
      ctx.fillText(line, x + 12, y + 36 + (idx * 16));
    });
  }

  // Copy to clipboard
  try {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });
    
    if (blob) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      
      // Show confirmation
      const btn = document.activeElement as HTMLButtonElement;
      if (btn) {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<span>Copied!</span>';
        setTimeout(() => {
          btn.innerHTML = originalHTML;
        }, 1500);
      }
    }
  } catch (error) {
    console.error('Failed to copy image:', error);
    alert('Unable to copy image. Please try again.');
  }
}

function classBadge(c: AssetClass, theme: 'light' | 'dark' = 'dark') {
  if (theme === 'light') {
    const m: Record<AssetClass, string> = {
      Crypto: "border-sky-600/40 text-sky-700 bg-sky-500/15",
      Equities: "border-indigo-600/40 text-indigo-700 bg-indigo-500/15",
      Indexes: "border-amber-600/40 text-amber-700 bg-amber-500/15",
      Energy: "border-orange-600/40 text-orange-700 bg-orange-500/15",
      Metals: "border-yellow-600/40 text-yellow-700 bg-yellow-500/15",
      FX: "border-emerald-600/40 text-emerald-700 bg-emerald-500/15",
      Agriculture: "border-lime-600/40 text-lime-700 bg-lime-500/15",
    };
    return m[c] || "border-gray-300 text-gray-600 bg-gray-100";
  }
  const m: Record<AssetClass, string> = {
    Crypto: "border-sky-500/25 text-sky-200 bg-sky-500/10",
    Equities: "border-indigo-500/25 text-indigo-200 bg-indigo-500/10",
    Indexes: "border-amber-500/25 text-amber-200 bg-amber-500/10",
    Energy: "border-orange-500/25 text-orange-200 bg-orange-500/10",
    Metals: "border-yellow-500/25 text-yellow-200 bg-yellow-500/10",
    FX: "border-emerald-500/25 text-emerald-200 bg-emerald-500/10",
    Agriculture: "border-lime-500/25 text-lime-200 bg-lime-500/10",
  };
  return m[c] || "border-white/10 text-white/75 bg-white/5";
}

function logoDataUrl(label: string) {
  const s = label || "?";
  const bg = "#0b1220";
  const fg = "#e6eefc";
  const stroke = "rgba(255,255,255,0.16)";
  const txt = s.slice(0, 4).toUpperCase();
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">` +
    `<rect x="4" y="4" width="56" height="56" rx="14" fill="${bg}" stroke="${stroke}"/>` +
    `<text x="32" y="38" font-family="ui-sans-serif, system-ui" font-size="18" text-anchor="middle" fill="${fg}" font-weight="700">${txt}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function sourceLogoDataUrl(source: string) {
  const colors: Record<string, { bg: string; fg: string }> = {
    "Reuters": { bg: "#ff8000", fg: "#ffffff" },
    "ReutersBiz": { bg: "#ff8000", fg: "#ffffff" },
    "BBCWorld": { bg: "#bb1919", fg: "#ffffff" },
    "CNBC": { bg: "#005594", fg: "#ffffff" },
    "AJEnglish": { bg: "#d4aa00", fg: "#000000" },
    "NYTimes": { bg: "#000000", fg: "#ffffff" },
    "Bloomberg": { bg: "#472a91", fg: "#ffffff" },
    "FT": { bg: "#fff1e5", fg: "#000000" },
    "WashPost": { bg: "#000000", fg: "#ffffff" },
    "Guardian": { bg: "#052962", fg: "#ffffff" },
    // Financial news sources
    "zaboravremena": { bg: "#f7931a", fg: "#000000" }, // ZeroHedge orange
    "MarketWatch": { bg: "#00ac4e", fg: "#ffffff" },
    "YahooFinance": { bg: "#6001d2", fg: "#ffffff" },
    "Investingcom": { bg: "#0d6523", fg: "#ffffff" },
    "TheStreet": { bg: "#1a1a1a", fg: "#ff6600" },
  };
  const c = colors[source] || { bg: "#0b1220", fg: "#e6eefc" };
  const txt = source.slice(0, 2).toUpperCase();
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">` +
    `<rect x="0" y="0" width="64" height="64" rx="16" fill="${c.bg}"/>` +
    `<text x="32" y="40" font-family="ui-sans-serif, system-ui" font-size="20" text-anchor="middle" fill="${c.fg}" font-weight="700">${txt}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Fetch news from our server-side API (no CORS issues!)
async function fetchNewsFromAPI(): Promise<FeedItem[]> {
  try {
    // Use the analyzed-news endpoint which includes AI-generated analysis
    const response = await fetch('/api/analyzed-news');
    if (!response.ok) throw new Error('API request failed');
    
    const data = await response.json();
    
    if (!data.success || !Array.isArray(data.items)) {
      throw new Error('Invalid API response');
    }
    
    // Map items with country coordinates and ensure unique IDs
    return data.items.map((item: {
      id: string;
      sourceName: string;
      handle: string;
      ts: string;
      text: string;
      url?: string;
      country?: string;
      impactScore: number;
      impactLevel: 'Severe' | 'High' | 'Medium' | 'Low';
      assets: Array<{asset: string; assetClass: string; direction: string; rationale: string}>;
      research: FeedItem['research'];
      isAnalyzed: boolean;
    }, index: number) => {
      const coords = item.country ? COUNTRY_COORDS[item.country] : undefined;
      
      // Ensure unique ID by appending index
      const uniqueId = `${item.id}-${index}`;
      
      return {
        ...item,
        id: uniqueId,
        lat: coords?.lat,
        lon: coords?.lon,
      };
    });
  } catch (e) {
    console.error('Failed to fetch news:', e);
    return [];
  }
}

function computeBbox(geom: { coordinates: unknown }): [number, number, number, number] {
  let minLon = 180,
    minLat = 90,
    maxLon = -180,
    maxLat = -90;

  const visit = (coords: unknown) => {
    if (!coords) return;
    if (Array.isArray(coords) && typeof coords[0] === "number" && typeof coords[1] === "number") {
      const lon = Number(coords[0]);
      const lat = Number(coords[1]);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
      minLon = Math.min(minLon, lon);
      minLat = Math.min(minLat, lat);
      maxLon = Math.max(maxLon, lon);
      maxLat = Math.max(maxLat, lat);
      return;
    }
    if (Array.isArray(coords)) {
      for (const c of coords) visit(c);
    }
  };

  visit(geom.coordinates);
  return [minLon, minLat, maxLon, maxLat];
}

function project(lon: number, lat: number, w: number, h: number) {
  const x = ((lon + 180) / 360) * w;
  const y = ((90 - lat) / 180) * h;
  return { x, y };
}

function geoToSvgPath(geom: { type: string; coordinates: unknown }, w: number, h: number) {
  const ringToPath = (ring: unknown[]) => {
    if (!Array.isArray(ring) || ring.length === 0) return "";
    let d = "";
    for (let i = 0; i < ring.length; i++) {
      const pt = ring[i];
      if (!Array.isArray(pt) || pt.length < 2) continue;
      const lon = Number(pt[0]);
      const lat = Number(pt[1]);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
      const { x, y } = project(lon, lat, w, h);
      d += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return d + " Z ";
  };

  const polyToPath = (coords: unknown[]) => {
    let d = "";
    for (const ring of coords || []) d += ringToPath(ring as unknown[]);
    return d;
  };

  if (!geom) return "";
  if (geom.type === "Polygon") return polyToPath(geom.coordinates as unknown[]);
  if (geom.type === "MultiPolygon") {
    let d = "";
    for (const poly of (geom.coordinates as unknown[][]) || []) d += polyToPath(poly);
    return d;
  }
  return "";
}

type CountryShape = {
  name: string;
  geom: { type: string; coordinates: unknown };
  bbox: [number, number, number, number];
  path: string;
};

function SvgWorldMap(props: {
  items: FeedItem[];
  selectedCountry: string | null;
  onCountryToggle: (country: string) => void;
  theme: 'light' | 'dark';
}) {
  const w = 980;
  const h = 480;
  const isLight = props.theme === 'light';

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [countries, setCountries] = useState<CountryShape[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hover, setHover] = useState<{ name: string; x: number; y: number; count: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const url = "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json";
        const res = await fetch(url);
        const gj = await res.json() as { features?: Array<{ properties?: { name?: string }; geometry?: { type: string; coordinates: unknown } }> };
        const feats = Array.isArray(gj?.features) ? gj.features : [];
        const parsed: CountryShape[] = feats
          .map((f) => {
            const name = String(f?.properties?.name ?? "");
            const geom = f?.geometry as { type: string; coordinates: unknown };
            const bbox = computeBbox(geom);
            const path = geoToSvgPath(geom, w, h);
            return { name, geom, bbox, path } as CountryShape;
          })
          .filter((c) => c.name && c.path);
        if (!cancelled) {
          setCountries(parsed);
          setErr(null);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setCountries([]);
          setErr(String((e as Error)?.message ?? e));
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of props.items) {
      const c = it.country;
      if (!c) continue;
      m.set(c, (m.get(c) ?? 0) + 1);
    }
    return m;
  }, [props.items]);

  const maxCount = useMemo(() => {
    let mx = 0;
    counts.forEach((v) => {
      mx = Math.max(mx, v);
    });
    return mx;
  }, [counts]);

  const intensity = (name: string) => {
    const c = counts.get(name) ?? 0;
    if (!maxCount) return 0;
    return clamp(c / maxCount, 0, 1);
  };

  const fillFor = (name: string) => {
    const t = intensity(name);
    if (t <= 0) return isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.045)";
    return `rgba(99,102,241,${0.06 + t * 0.22})`;
  };

  const strokeFor = (name: string) => {
    const t = intensity(name);
    if (props.selectedCountry === name) return isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.55)";
    return t > 0 ? "rgba(99,102,241,0.42)" : isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.10)";
  };

  const onMove = (ev: React.MouseEvent, name: string) => {
    if (!wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const x = ev.clientX - r.left;
    const y = ev.clientY - r.top;
    setHover({ name, x, y, count: counts.get(name) ?? 0 });
  };

  const clearHover = () => setHover(null);

  return (
    <div className="relative h-full w-full" ref={wrapRef}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        onMouseLeave={clearHover}
      >
        <rect x={0} y={0} width={w} height={h} fill={isLight ? "#f3f4f6" : "#0b1220"} />

        {countries && countries.length > 0 ? (
          <g>
            {countries.map((c) => (
              <path
                key={c.name}
                d={c.path}
                fill={fillFor(c.name)}
                stroke={strokeFor(c.name)}
                strokeWidth={0.8}
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => onMove(e, c.name)}
                onMouseMove={(e) => onMove(e, c.name)}
                onClick={() => props.onCountryToggle(c.name)}
              />
            ))}
          </g>
        ) : (
          <g>
            <path
              d="M 70 165 L 165 118 L 252 132 L 304 170 L 330 224 L 264 256 L 170 260 L 116 230 Z"
              fill={isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}
              stroke={isLight ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.14)"}
              strokeWidth={0.8}
            />
            <path
              d="M 318 152 L 412 126 L 516 126 L 612 152 L 672 198 L 650 250 L 586 270 L 512 246 L 428 240 L 360 210 Z"
              fill={isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}
              stroke={isLight ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.14)"}
              strokeWidth={0.8}
            />
          </g>
        )}

        {props.items
          .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lon))
          .slice(0, 140)
          .map((e) => {
            const lon = Number(e.lon);
            const lat = Number(e.lat);
            const { x, y } = project(lon, lat, w, h);
            return (
              <circle
                key={e.id}
                cx={x}
                cy={y}
                r={2.4}
                fill={isLight ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.72)"}
                opacity={0.75}
              />
            );
          })}
      </svg>

      {hover && (
        <div
          className={`pointer-events-none absolute z-20 -translate-y-2 rounded-2xl border px-3 py-2 text-[11px] shadow-lg backdrop-blur ${
            isLight 
              ? "border-gray-200 bg-white/90 text-gray-900" 
              : "border-white/10 bg-black/70 text-white/85"
          }`}
          style={{ left: Math.min(hover.x + 12, 920), top: Math.max(hover.y - 10, 6) }}
        >
          <div className="font-semibold">{hover.name}</div>
          <div className={isLight ? "text-gray-500" : "text-white/60"}>{hover.count} items</div>
        </div>
      )}

      {err && (
        <div className={`absolute bottom-3 left-3 right-3 rounded-2xl border px-3 py-2 text-[11px] backdrop-blur ${
          isLight
            ? "border-gray-200 bg-white/80 text-gray-600"
            : "border-white/10 bg-black/55 text-white/70"
        }`}>
          Map data failed to load in this environment: {err}
        </div>
      )}
    </div>
  );
}

const MARKET_TEMPLATE: Array<{ key: string; name: string; symbol: string; assetClass: AssetClass }> = [
  // Top 5 Crypto by market cap
  { key: "btc", name: "Bitcoin", symbol: "BTC", assetClass: "Crypto" },
  { key: "eth", name: "Ethereum", symbol: "ETH", assetClass: "Crypto" },
  { key: "xrp", name: "XRP", symbol: "XRP", assetClass: "Crypto" },
  { key: "sol", name: "Solana", symbol: "SOL", assetClass: "Crypto" },
  { key: "bnb", name: "BNB", symbol: "BNB", assetClass: "Crypto" },
  
  // Equities - Mega Cap Tech (10)
  { key: "aapl", name: "Apple", symbol: "AAPL", assetClass: "Equities" },
  { key: "msft", name: "Microsoft", symbol: "MSFT", assetClass: "Equities" },
  { key: "nvda", name: "NVIDIA", symbol: "NVDA", assetClass: "Equities" },
  { key: "tsla", name: "Tesla", symbol: "TSLA", assetClass: "Equities" },
  { key: "amzn", name: "Amazon", symbol: "AMZN", assetClass: "Equities" },
  { key: "googl", name: "Alphabet", symbol: "GOOGL", assetClass: "Equities" },
  { key: "meta", name: "Meta", symbol: "META", assetClass: "Equities" },
  { key: "nflx", name: "Netflix", symbol: "NFLX", assetClass: "Equities" },
  { key: "amd", name: "AMD", symbol: "AMD", assetClass: "Equities" },
  { key: "intc", name: "Intel", symbol: "INTC", assetClass: "Equities" },
  
  // Equities - Semiconductors (5)
  { key: "avgo", name: "Broadcom", symbol: "AVGO", assetClass: "Equities" },
  { key: "qcom", name: "Qualcomm", symbol: "QCOM", assetClass: "Equities" },
  { key: "txn", name: "Texas Instruments", symbol: "TXN", assetClass: "Equities" },
  { key: "asml", name: "ASML", symbol: "ASML", assetClass: "Equities" },
  { key: "mu", name: "Micron", symbol: "MU", assetClass: "Equities" },
  
  // Equities - Finance (8)
  { key: "jpm", name: "JPMorgan", symbol: "JPM", assetClass: "Equities" },
  { key: "v", name: "Visa", symbol: "V", assetClass: "Equities" },
  { key: "gs", name: "Goldman", symbol: "GS", assetClass: "Equities" },
  { key: "ma", name: "Mastercard", symbol: "MA", assetClass: "Equities" },
  { key: "bac", name: "Bank of America", symbol: "BAC", assetClass: "Equities" },
  { key: "wfc", name: "Wells Fargo", symbol: "WFC", assetClass: "Equities" },
  { key: "c", name: "Citigroup", symbol: "C", assetClass: "Equities" },
  { key: "ms", name: "Morgan Stanley", symbol: "MS", assetClass: "Equities" },
  
  // Equities - Healthcare (6)
  { key: "jnj", name: "J&J", symbol: "JNJ", assetClass: "Equities" },
  { key: "unh", name: "UnitedHealth", symbol: "UNH", assetClass: "Equities" },
  { key: "pfe", name: "Pfizer", symbol: "PFE", assetClass: "Equities" },
  { key: "mrna", name: "Moderna", symbol: "MRNA", assetClass: "Equities" },
  { key: "abbv", name: "AbbVie", symbol: "ABBV", assetClass: "Equities" },
  { key: "lly", name: "Eli Lilly", symbol: "LLY", assetClass: "Equities" },
  
  // Equities - Defense & Aerospace (4)
  { key: "lmt", name: "Lockheed", symbol: "LMT", assetClass: "Equities" },
  { key: "rtx", name: "RTX", symbol: "RTX", assetClass: "Equities" },
  { key: "noc", name: "Northrop", symbol: "NOC", assetClass: "Equities" },
  { key: "ba", name: "Boeing", symbol: "BA", assetClass: "Equities" },
  
  // Equities - Energy (4)
  { key: "xom", name: "Exxon", symbol: "XOM", assetClass: "Equities" },
  { key: "cvx", name: "Chevron", symbol: "CVX", assetClass: "Equities" },
  { key: "cop", name: "ConocoPhillips", symbol: "COP", assetClass: "Equities" },
  { key: "slb", name: "Schlumberger", symbol: "SLB", assetClass: "Equities" },
  
  // Equities - Consumer (6)
  { key: "wmt", name: "Walmart", symbol: "WMT", assetClass: "Equities" },
  { key: "cost", name: "Costco", symbol: "COST", assetClass: "Equities" },
  { key: "hd", name: "Home Depot", symbol: "HD", assetClass: "Equities" },
  { key: "mcd", name: "McDonald's", symbol: "MCD", assetClass: "Equities" },
  { key: "ko", name: "Coca-Cola", symbol: "KO", assetClass: "Equities" },
  { key: "pep", name: "PepsiCo", symbol: "PEP", assetClass: "Equities" },
  
  // Equities - Other (5)
  { key: "dis", name: "Disney", symbol: "DIS", assetClass: "Equities" },
  { key: "pltr", name: "Palantir", symbol: "PLTR", assetClass: "Equities" },
  { key: "crm", name: "Salesforce", symbol: "CRM", assetClass: "Equities" },
  { key: "orcl", name: "Oracle", symbol: "ORCL", assetClass: "Equities" },
  { key: "ibm", name: "IBM", symbol: "IBM", assetClass: "Equities" },
  
  // Indexes - US (5)
  { key: "spx", name: "S&P 500", symbol: "SPX", assetClass: "Indexes" },
  { key: "ndx", name: "Nasdaq 100", symbol: "NDX", assetClass: "Indexes" },
  { key: "dji", name: "Dow", symbol: "DJI", assetClass: "Indexes" },
  { key: "vix", name: "VIX", symbol: "VIX", assetClass: "Indexes" },
  { key: "rut", name: "Russell 2000", symbol: "RUT", assetClass: "Indexes" },
  
  // Indexes - International (6)
  { key: "ftse", name: "FTSE 100", symbol: "FTSE", assetClass: "Indexes" },
  { key: "dax", name: "DAX", symbol: "DAX", assetClass: "Indexes" },
  { key: "n225", name: "Nikkei 225", symbol: "N225", assetClass: "Indexes" },
  { key: "hsi", name: "Hang Seng", symbol: "HSI", assetClass: "Indexes" },
  { key: "ssec", name: "Shanghai", symbol: "SSEC", assetClass: "Indexes" },
  { key: "stoxx", name: "Euro Stoxx 50", symbol: "SX5E", assetClass: "Indexes" },
  
  // ETFs (4)
  { key: "spy", name: "SPY ETF", symbol: "SPY", assetClass: "Indexes" },
  { key: "qqq", name: "QQQ ETF", symbol: "QQQ", assetClass: "Indexes" },
  { key: "iwm", name: "IWM ETF", symbol: "IWM", assetClass: "Indexes" },
  { key: "tlt", name: "Treasury ETF", symbol: "TLT", assetClass: "Indexes" },
  
  // Energy Commodities (6)
  { key: "wti", name: "Oil (WTI)", symbol: "WTI", assetClass: "Energy" },
  { key: "brent", name: "Oil (Brent)", symbol: "BRENT", assetClass: "Energy" },
  { key: "natgas", name: "Nat Gas", symbol: "NG", assetClass: "Energy" },
  { key: "uranium", name: "Uranium", symbol: "URA", assetClass: "Energy" },
  { key: "coal", name: "Coal", symbol: "COAL", assetClass: "Energy" },
  { key: "gasoline", name: "Gasoline", symbol: "RB", assetClass: "Energy" },
  
  // Metals (8)
  { key: "gold", name: "Gold", symbol: "XAU", assetClass: "Metals" },
  { key: "silver", name: "Silver", symbol: "XAG", assetClass: "Metals" },
  { key: "copper", name: "Copper", symbol: "HG", assetClass: "Metals" },
  { key: "platinum", name: "Platinum", symbol: "PL", assetClass: "Metals" },
  { key: "palladium", name: "Palladium", symbol: "PA", assetClass: "Metals" },
  { key: "aluminum", name: "Aluminum", symbol: "ALI", assetClass: "Metals" },
  { key: "nickel", name: "Nickel", symbol: "NI", assetClass: "Metals" },
  { key: "gld", name: "Gold ETF", symbol: "GLD", assetClass: "Metals" },
  
  // Agriculture (9)
  { key: "wheat", name: "Wheat", symbol: "ZW", assetClass: "Agriculture" },
  { key: "corn", name: "Corn", symbol: "ZC", assetClass: "Agriculture" },
  { key: "soybeans", name: "Soybeans", symbol: "ZS", assetClass: "Agriculture" },
  { key: "coffee", name: "Coffee", symbol: "KC", assetClass: "Agriculture" },
  { key: "sugar", name: "Sugar", symbol: "SB", assetClass: "Agriculture" },
  { key: "cotton", name: "Cotton", symbol: "CT", assetClass: "Agriculture" },
  { key: "cocoa", name: "Cocoa", symbol: "CC", assetClass: "Agriculture" },
  { key: "cattle", name: "Live Cattle", symbol: "LE", assetClass: "Agriculture" },
  { key: "lumber", name: "Lumber", symbol: "LBS", assetClass: "Agriculture" },
  
  // FX (9)
  { key: "dxy", name: "US Dollar", symbol: "DXY", assetClass: "FX" },
  { key: "eurusd", name: "EUR/USD", symbol: "EUR", assetClass: "FX" },
  { key: "gbpusd", name: "GBP/USD", symbol: "GBP", assetClass: "FX" },
  { key: "usdjpy", name: "USD/JPY", symbol: "JPY", assetClass: "FX" },
  { key: "usdcny", name: "USD/CNY", symbol: "CNY", assetClass: "FX" },
  { key: "usdchf", name: "USD/CHF", symbol: "CHF", assetClass: "FX" },
  { key: "audusd", name: "AUD/USD", symbol: "AUD", assetClass: "FX" },
  { key: "usdcad", name: "USD/CAD", symbol: "CAD", assetClass: "FX" },
];

function makeEmptyQuotes(): QuoteRow[] {
  const out: QuoteRow[] = [];
  for (const a of MARKET_TEMPLATE) {
    out.push({
      key: a.key,
      name: a.name,
      symbol: a.symbol,
      assetClass: a.assetClass,
      price: NaN,
      mcap: NaN,
      chg24: NaN,
      spark: [],
    });
  }
  return out;
}

async function fetchLiveQuotes(): Promise<QuoteRow[]> {
  const out: QuoteRow[] = [];

  try {
    // Fetch from our server-side API that aggregates CoinGecko + Yahoo Finance
    const response = await fetch('/api/quotes');
    if (!response.ok) throw new Error('API request failed');
    
    const data = await response.json();
    
    if (data.success && data.quotes) {
      for (const a of MARKET_TEMPLATE) {
        const q = data.quotes[a.key] as { price?: number; mcap?: number; chg24?: number; sparkline?: number[] } | undefined;
        
        out.push({
          key: a.key,
          name: a.name,
          symbol: a.symbol,
          assetClass: a.assetClass,
          price: q?.price ?? NaN,
          mcap: q?.mcap ?? NaN,
          chg24: q?.chg24 ?? NaN,
          spark: Array.isArray(q?.sparkline) && q.sparkline.length >= 5 ? q.sparkline.slice(-18).map((x) => Number(x)) : [],
        });
      }
      return out;
    }
  } catch (e) {
    console.error('Failed to fetch live quotes:', e);
  }

  // Return empty quotes on error
  return makeEmptyQuotes();
}

function computeCategoryOverview(items: FeedItem[]) {
  const classes: AssetClass[] = ["Equities", "Crypto", "Energy", "Metals", "Agriculture", "Indexes", "FX"];
  const out: Record<AssetClass, { score: number; label: ImpactDirection; count: number; weightedScore: number; totalWeight: number }> = {} as Record<AssetClass, { score: number; label: ImpactDirection; count: number; weightedScore: number; totalWeight: number }>;

  for (const c of classes) out[c] = { score: 0, label: "Neutral", count: 0, weightedScore: 0, totalWeight: 0 };

  for (const it of items) {
    // Calculate weight based on impact level (Severe=4, High=3, Medium=2, Low=1)
    const weight = it.impactLevel === 'Severe' ? 4 : it.impactLevel === 'High' ? 3 : it.impactLevel === 'Medium' ? 2 : 1;
    
    for (const asset of it.assets || []) {
      const assetClass = asset.assetClass as AssetClass;
      const bucket = out[assetClass];
      if (!bucket) continue;
      bucket.count += 1;
      bucket.totalWeight += weight;
      
      // Weight the directional signal by impact
      if (asset.direction === "Bullish") {
        bucket.score += 1;
        bucket.weightedScore += weight;
      }
      if (asset.direction === "Bearish") {
        bucket.score -= 1;
        bucket.weightedScore -= weight;
      }
    }
  }

  for (const c of classes) {
    const b = out[c];
    if (!b.totalWeight) {
      b.label = "Neutral";
      continue;
    }
    // Use weighted average for determining bullish/bearish
    const weightedAvg = b.weightedScore / b.totalWeight;
    b.label = weightedAvg > 0.15 ? "Bullish" : weightedAvg < -0.15 ? "Bearish" : "Neutral";
  }

  return out;
}

// Compute individual asset sentiment from headlines
type AssetSentiment = {
  key: string;
  name: string;
  symbol: string;
  assetClass: AssetClass;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  totalCount: number;
  weightedScore: number;
  totalWeight: number;
  score: number; // normalized -1 to 1
  label: ImpactDirection;
  recentHeadlines: Array<{ text: string; direction: string; ts: string }>;
};

function computeAssetSentiments(items: FeedItem[], marketTemplate: typeof MARKET_TEMPLATE): AssetSentiment[] {
  // Initialize sentiment for each tracked asset
  const sentimentMap: Record<string, AssetSentiment> = {};
  
  for (const asset of marketTemplate) {
    sentimentMap[asset.symbol.toUpperCase()] = {
      key: asset.key,
      name: asset.name,
      symbol: asset.symbol,
      assetClass: asset.assetClass,
      bullishCount: 0,
      bearishCount: 0,
      neutralCount: 0,
      totalCount: 0,
      weightedScore: 0,
      totalWeight: 0,
      score: 0,
      label: "Neutral",
      recentHeadlines: [],
    };
    // Also map by name for matching
    sentimentMap[asset.name.toUpperCase()] = sentimentMap[asset.symbol.toUpperCase()];
  }
  
  // Process headlines
  for (const item of items) {
    // Calculate weight based on impact level (Severe=4, High=3, Medium=2, Low=1)
    const weight = item.impactLevel === 'Severe' ? 4 : item.impactLevel === 'High' ? 3 : item.impactLevel === 'Medium' ? 2 : 1;
    
    for (const asset of item.assets || []) {
      const assetKey = asset.asset?.toUpperCase();
      if (!assetKey) continue;
      
      // Try to match by symbol or name
      let sentiment = sentimentMap[assetKey];
      if (!sentiment) {
        // Try partial matching for names like "Gold", "Bitcoin", etc.
        for (const key of Object.keys(sentimentMap)) {
          if (assetKey.includes(key) || key.includes(assetKey)) {
            sentiment = sentimentMap[key];
            break;
          }
        }
      }
      
      if (!sentiment) continue;
      
      sentiment.totalCount += 1;
      sentiment.totalWeight += weight;
      
      if (asset.direction === "Bullish") {
        sentiment.bullishCount += 1;
        sentiment.weightedScore += weight;
      } else if (asset.direction === "Bearish") {
        sentiment.bearishCount += 1;
        sentiment.weightedScore -= weight;
      } else {
        sentiment.neutralCount += 1;
      }
      
      // Keep last 3 headlines for this asset
      if (sentiment.recentHeadlines.length < 3) {
        sentiment.recentHeadlines.push({
          text: item.text?.substring(0, 80) + (item.text && item.text.length > 80 ? '...' : '') || '',
          direction: asset.direction || 'Neutral',
          ts: item.ts || new Date().toISOString(),
        });
      }
    }
  }
  
  // Calculate scores and labels
  const results: AssetSentiment[] = [];
  const seen = new Set<string>();
  
  for (const asset of marketTemplate) {
    const sentiment = sentimentMap[asset.symbol.toUpperCase()];
    if (!sentiment || seen.has(sentiment.key)) continue;
    seen.add(sentiment.key);
    
    if (sentiment.totalWeight > 0) {
      // Use weighted score for determining sentiment
      sentiment.score = sentiment.weightedScore / sentiment.totalWeight;
      if (sentiment.score > 0.15) sentiment.label = "Bullish";
      else if (sentiment.score < -0.15) sentiment.label = "Bearish";
      else sentiment.label = "Neutral";
    }
    
    results.push(sentiment);
  }
  
  return results;
}

export default function Page() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [feedStatus, setFeedStatus] = useState<"loading" | "live" | "error">("loading");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [q, setQ] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<AssetClass | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [selectedImpact, setSelectedImpact] = useState<'High' | 'Medium' | 'Low' | null>(null);
  const [sortBy, setSortBy] = useState<"recency" | "severity">("recency");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [quotes, setQuotes] = useState<QuoteRow[]>(() => makeEmptyQuotes());
  const [quotesStatus, setQuotesStatus] = useState<"live" | "error" | "loading">("loading");

  // Research modal state
  const [researchOpen, setResearchOpen] = useState(false);
  const [researchHeadline, setResearchHeadline] = useState("");
  const [researchLoading, setResearchLoading] = useState(false);
  
  // Theme state - default to light mode
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Heatmap state
  const [heatmapExpanded, setHeatmapExpanded] = useState(false);
  const [heatmapView, setHeatmapView] = useState<'sectors' | 'assets'>('sectors');
  const [expandedSector, setExpandedSector] = useState<AssetClass | null>(null);
  
  // Load theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sistine-theme');
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved);
    }
  }, []);
  
  // Save theme to localStorage
  const toggleTheme = useCallback(() => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('sistine-theme', next);
  }, [theme]);
  
  // Theme-aware colors - memoized for stable reference
  const t = useMemo(() => ({
    bg: theme === 'light' ? 'bg-gray-50' : 'bg-[#070b12]',
    bgCard: theme === 'light' ? 'bg-white' : 'bg-white/5',
    bgHeader: theme === 'light' ? 'bg-white/90' : 'bg-[#070b12]/90',
    border: theme === 'light' ? 'border-gray-200' : 'border-white/10',
    text: theme === 'light' ? 'text-gray-900' : 'text-white',
    textMuted: theme === 'light' ? 'text-gray-500' : 'text-white/55',
    textSecondary: theme === 'light' ? 'text-gray-600' : 'text-white/70',
    hover: theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10',
    input: theme === 'light' ? 'bg-gray-100' : 'bg-white/5',
  }), [theme]);
  
  const [researchItem, setResearchItem] = useState<{
    sourceName: string;
    handle: string;
    text: string;
    country?: string;
    impactLevel?: string;
    assets?: Array<{asset: string; direction: string; rationale?: string; assetClass?: string}>;
    research?: { summary?: string } | null;
  } | null>(null);
  const [researchResult, setResearchResult] = useState<{
    summary: string;
    firstOrder: Array<{asset: string; direction: string; rationale: string}>;
    secondOrder: Array<{asset: string; direction: string; rationale: string}>;
    thirdOrder: Array<{asset: string; direction: string; rationale: string}>;
    contrarian: string;
    confidence: string;
  } | null>(null);

  // Track if this is initial load or refresh
  const isInitialLoad = useRef(true);

  // Fetch RSS feeds from our server-side API
  const fetchFeeds = useCallback(async () => {
    // Only show loading state on initial load, not refreshes
    if (isInitialLoad.current) {
      setFeedStatus("loading");
    }
    try {
      const feedItems = await fetchNewsFromAPI();
      if (feedItems.length > 0) {
        // Sort items immediately to ensure consistent order
        feedItems.sort((a, b) => {
          const timeDiff = new Date(b.ts).getTime() - new Date(a.ts).getTime();
          if (timeDiff !== 0) return timeDiff;
          return a.id.localeCompare(b.id);
        });
        setItems(feedItems);
        setFeedStatus("live");
        setLastUpdated(new Date());
        isInitialLoad.current = false;
      } else if (isInitialLoad.current) {
        setFeedStatus("error");
      }
    } catch (e) {
      console.error("Failed to fetch feeds:", e);
      if (isInitialLoad.current) {
        setFeedStatus("error");
      }
    }
  }, []);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchFeeds();
    const interval = setInterval(fetchFeeds, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [fetchFeeds]);

  // Fetch quotes
  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        setQuotesStatus("loading");
        const next = await fetchLiveQuotes();
        if (!cancelled) {
          setQuotes(next);
          // Check if we got any valid data
          const hasValidData = next.some((r) => Number.isFinite(r.price));
          setQuotesStatus(hasValidData ? "live" : "error");
        }
      } catch {
        if (!cancelled) {
          setQuotes(makeEmptyQuotes());
          setQuotesStatus("error");
        }
      }
    }
    tick();
    const id = setInterval(tick, 45000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const filteredItems = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = items.slice();

    // Filter by impact level (treat 'Severe' same as 'High')
    if (selectedImpact) {
      out = out.filter((it) => {
        const level = it.impactLevel;
        if (selectedImpact === 'High') {
          return level === 'High' || level === 'Severe';
        }
        return level === selectedImpact;
      });
    }

    if (needle) {
      out = out.filter((it) => (it.text || "").toLowerCase().includes(needle));
    }

    if (selectedCountry) {
      out = out.filter((it) => it.country === selectedCountry);
    }

    // Filter by asset class - ONLY check AI-tagged assets, not text matching
    if (selectedClass) {
      out = out.filter((it) => {
        const assets = it.assets || [];
        return assets.some((a) => a.assetClass === selectedClass);
      });
    }

    // Filter by selected asset (from Market Board click)
    // STRICT: Only show items where the AI has tagged this specific asset
    if (selectedAsset) {
      const asset = MARKET_TEMPLATE.find(a => a.key === selectedAsset);
      if (asset) {
        out = out.filter((it) => {
          const taggedAssets = it.assets || [];
          
          // Check if AI tagged this specific asset
          const assetMatch = taggedAssets.some(a => {
            const taggedAsset = (a.asset || '').toUpperCase();
            const targetSymbol = asset.symbol.toUpperCase();
            const targetName = asset.name.toUpperCase();
            
            // Direct symbol match
            if (taggedAsset === targetSymbol) return true;
            
            // Direct name match or contains
            if (taggedAsset.includes(targetName) || targetName.includes(taggedAsset)) return true;
            
            // Handle common variations for crypto
            if (targetSymbol === 'BTC' && (taggedAsset.includes('BITCOIN') || taggedAsset === 'BTC')) return true;
            if (targetSymbol === 'ETH' && (taggedAsset.includes('ETHEREUM') || taggedAsset === 'ETH')) return true;
            if (targetSymbol === 'XRP' && (taggedAsset.includes('RIPPLE') || taggedAsset === 'XRP')) return true;
            if (targetSymbol === 'SOL' && (taggedAsset.includes('SOLANA') || taggedAsset === 'SOL')) return true;
            if (targetSymbol === 'BNB' && (taggedAsset.includes('BINANCE') || taggedAsset === 'BNB')) return true;
            
            // Handle commodities
            if (targetSymbol === 'XAU' && (taggedAsset.includes('GOLD') || taggedAsset === 'XAU')) return true;
            if (targetSymbol === 'XAG' && (taggedAsset.includes('SILVER') || taggedAsset === 'XAG')) return true;
            if (targetSymbol === 'WTI' && (taggedAsset.includes('OIL') || taggedAsset.includes('WTI') || taggedAsset.includes('CRUDE'))) return true;
            if (targetSymbol === 'NG' && (taggedAsset.includes('NATURAL GAS') || taggedAsset === 'NG')) return true;
            
            return false;
          });
          
          return assetMatch;
        });
      }
    }

    // Stable sort: use ID as tiebreaker to prevent reordering on refresh
    out.sort((a, b) => {
      if (sortBy === "severity") {
        const scoreDiff = (b.impactScore ?? 0) - (a.impactScore ?? 0);
        if (scoreDiff !== 0) return scoreDiff;
        // Tiebreaker: use ID for stable ordering
        return a.id.localeCompare(b.id);
      }
      const timeDiff = new Date(b.ts).getTime() - new Date(a.ts).getTime();
      if (timeDiff !== 0) return timeDiff;
      // Tiebreaker: use ID for stable ordering
      return a.id.localeCompare(b.id);
    });

    return out;
  }, [items, q, selectedCountry, selectedClass, selectedAsset, selectedImpact, sortBy]);

  // Clear expandedId if the expanded item is no longer in the filtered list
  useEffect(() => {
    if (expandedId && filteredItems.length > 0) {
      const stillExists = filteredItems.some(it => it.id === expandedId);
      if (!stillExists) {
        setExpandedId(null);
      }
    }
  }, [filteredItems, expandedId]);

  const overview = useMemo(() => computeCategoryOverview(items), [items]);
  
  const assetSentiments = useMemo(() => computeAssetSentiments(items, MARKET_TEMPLATE), [items]);

  const marketRows = useMemo(() => {
    let rows = quotes.slice();
    
    // Filter by selected asset class
    if (selectedClass) {
      rows = rows.filter((r) => r.assetClass === selectedClass);
    }
    
    // Sort by 24h % change (highest to lowest), putting NaN values at the end
    rows.sort((a, b) => {
      const aChg = Number.isFinite(a.chg24) ? a.chg24 : -Infinity;
      const bChg = Number.isFinite(b.chg24) ? b.chg24 : -Infinity;
      return bChg - aChg;
    });
    
    return rows;
  }, [quotes, selectedClass]);

  const masterScrollRef = useRef<HTMLDivElement | null>(null);

  // Use useCallback for stable function references
  const toggleExpand = useCallback((id: string) => {
    setExpandedId((cur) => (cur === id ? null : id));
  }, []);

  const toggleCountry = useCallback((country: string) => {
    setSelectedCountry((cur) => (cur === country ? null : country));
    setExpandedId(null);
    if (masterScrollRef.current) masterScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const toggleClass = useCallback((cls: AssetClass) => {
    setSelectedClass((cur) => (cur === cls ? null : cls));
    setSelectedAsset(null);
    setExpandedId(null);
    if (masterScrollRef.current) masterScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const toggleAsset = useCallback((key: string) => {
    setSelectedAsset((cur) => (cur === key ? null : key));
    setSelectedClass(null);
    setExpandedId(null);
    if (masterScrollRef.current) masterScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const toggleImpact = useCallback((level: 'High' | 'Medium' | 'Low') => {
    setSelectedImpact((cur) => (cur === level ? null : level));
    setExpandedId(null);
    if (masterScrollRef.current) masterScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const clearAll = useCallback(() => {
    setSelectedCountry(null);
    setSelectedClass(null);
    setSelectedAsset(null);
    setSelectedImpact(null);
    setExpandedId(null);
  }, []);

  // Research function
  const openResearch = async (headline: string) => {
    setResearchHeadline(headline);
    setResearchOpen(true);
    setResearchLoading(true);
    setResearchResult(null);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline }),
      });
      
      const data = await response.json();
      if (data.success && data.analysis) {
        setResearchResult(data.analysis);
      } else if (data.fallback) {
        setResearchResult(data.fallback);
      }
    } catch (e) {
      console.error('Research failed:', e);
    } finally {
      setResearchLoading(false);
    }
  };

  return (
    <div className={`min-h-screen w-full ${t.bg} ${t.text} transition-colors duration-200`}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar{width:0;height:0}
        .no-scrollbar{scrollbar-width:none;-ms-overflow-style:none}
      `}</style>

      <div className={`sticky top-0 z-30 border-b ${t.border} ${t.bgHeader} backdrop-blur`}>
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={`grid h-10 w-10 place-items-center rounded-2xl border ${t.border} ${t.bgCard} overflow-hidden`}>
              <img
                src={SISTINE_LOGO_DATA_URI}
                alt="Sistine Research"
                className="h-full w-full object-contain"
                draggable={false}
              />
            </div>
            <div className="leading-tight">
              <div className={`text-sm font-bold tracking-tight ${theme === 'light' ? 'text-gray-900' : 'bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent'}`}>Sistine Research</div>
              <div className={`text-[11px] ${t.textMuted}`}>Live Market Intelligence Feed</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`hidden items-center gap-2 rounded-2xl border ${t.border} ${t.input} px-3 py-2 md:flex`}>
              <Search className={`h-4 w-4 ${t.textMuted}`} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search news…"
                className={`w-[360px] bg-transparent text-sm outline-none ${theme === 'light' ? 'placeholder:text-gray-400' : 'placeholder:text-white/35'}`}
              />
            </div>
            <button
              onClick={toggleTheme}
              className={`inline-flex items-center justify-center rounded-2xl border ${t.border} ${t.bgCard} p-2 ${t.textSecondary} ${t.hover}`}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <button
              onClick={fetchFeeds}
              disabled={feedStatus === "loading"}
              className={`inline-flex items-center gap-2 rounded-2xl border ${t.border} ${t.bgCard} px-3 py-2 text-xs ${t.textSecondary} ${t.hover} disabled:opacity-50`}
            >
              <RefreshCcw className={`h-4 w-4 ${feedStatus === "loading" ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              href="/vault"
              className={`inline-flex items-center gap-2 rounded-2xl border ${t.border} ${theme === 'light' ? 'bg-gradient-to-r from-amber-50 to-yellow-50' : 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10'} px-3 py-2 text-xs ${t.hover}`}
            >
              <Building2 className={`h-4 w-4 ${theme === 'light' ? 'text-amber-600' : 'text-amber-400'}`} />
              <span className={theme === 'light' ? 'text-gray-700' : 'text-white/80'}>Metals</span>
            </Link>
            <a
              href="/api/billing-portal"
              className={`inline-flex items-center gap-2 rounded-2xl border ${t.border} ${t.bgCard} px-3 py-2 text-xs ${t.textSecondary} ${t.hover}`}
            >
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Billing</span>
            </a>
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8"
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-12 gap-4 px-3 py-3" style={{ height: 'calc(100vh - 80px)' }}>
        <div className="col-span-12 flex min-h-0 flex-col gap-3 md:col-span-4 lg:col-span-4 overflow-hidden">
          <div className={`overflow-hidden rounded-3xl border ${t.border} ${t.bgCard} shrink-0`}>
            <div className={`flex items-center justify-between border-b ${t.border} px-4 py-3`}>
              <div className="flex items-center gap-2">
                <Globe className={`h-4 w-4 ${t.textSecondary}`} />
                <div className="text-sm font-semibold">Map</div>
              </div>
              <div className={`text-[11px] ${t.textMuted}`}>click country to filter</div>
            </div>
            <div className="h-[320px]">
              <SvgWorldMap items={items} selectedCountry={selectedCountry} onCountryToggle={toggleCountry} theme={theme} />
            </div>
            {(selectedCountry || selectedClass || selectedAsset || selectedImpact) && (
              <div className={`flex items-center justify-between border-t ${t.border} px-4 py-2 text-[11px] ${t.textSecondary}`}>
                <div className="truncate flex items-center gap-1">
                  <Filter className="h-3 w-3" />
                  {selectedImpact ? `Impact: ${selectedImpact}` : ""}
                  {selectedImpact && (selectedCountry || selectedClass || selectedAsset) ? " • " : ""}
                  {selectedCountry ? `Country: ${selectedCountry}` : ""}
                  {selectedCountry && (selectedClass || selectedAsset) ? " • " : ""}
                  {selectedClass ? `Class: ${selectedClass}` : ""}
                  {selectedClass && selectedAsset ? " • " : ""}
                  {selectedAsset ? `Asset: ${MARKET_TEMPLATE.find(a => a.key === selectedAsset)?.name || selectedAsset}` : ""}
                </div>
                <button
                  onClick={clearAll}
                  className={`rounded-xl border ${t.border} ${t.bgCard} px-2 py-1 ${t.hover}`}
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className={`overflow-hidden rounded-3xl border ${t.border} ${t.bgCard} flex-1 flex flex-col min-h-0`}>
            <div className={`flex items-center justify-between border-b ${t.border} px-4 py-3 shrink-0`}>
              <div className="flex items-center gap-2">
                <TrendingUp className={`h-4 w-4 ${t.textSecondary}`} />
                <div className="text-sm font-semibold">Market Board</div>
                <div className={`text-[11px] ${quotesStatus === "live" ? "text-emerald-400" : quotesStatus === "loading" ? "text-amber-400" : "text-rose-400"}`}>
                  {quotesStatus === "live" ? "● Live" : quotesStatus === "loading" ? "● Loading..." : "● Error"}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto overflow-x-hidden no-scrollbar min-h-0">
              <div className={`sticky top-0 z-10 grid grid-cols-[24px_minmax(130px,1fr)_60px_72px_78px_74px] items-center gap-2 border-b ${t.border} ${t.bgHeader} pl-4 pr-5 h-9 text-[10px] ${t.textMuted} backdrop-blur`}>
                <div />
                <div>Asset</div>
                <div>Class</div>
                <div className="text-right pl-1">Price</div>
                <div className="text-right">Mkt Cap</div>
                <div className="text-right pr-4">24h</div>
              </div>

              <div className={`divide-y ${theme === 'light' ? 'divide-gray-100' : 'divide-white/10'}`}>
                {marketRows.length === 0 && quotesStatus === "loading" && (
                  <div className={`flex items-center justify-center py-8 text-sm ${t.textMuted}`}>
                    <RefreshCcw className="h-5 w-5 animate-spin mr-2" />
                    Loading market data...
                  </div>
                )}
                {marketRows.length === 0 && quotesStatus === "error" && (
                  <div className="flex items-center justify-center py-8 text-sm text-rose-500">
                    Failed to load market data
                  </div>
                )}
                {marketRows.map((r) => {
                  const hasData = Number.isFinite(r.price);
                  const chgTone = !hasData ? t.textMuted :
                    r.chg24 > 0.05 ? "text-emerald-600" : r.chg24 < -0.05 ? "text-rose-600" : t.textSecondary;
                  const img = logoDataUrl(r.symbol);
                  const isSelected = selectedAsset === r.key;
                  return (
                    <button
                      key={r.key}
                      onClick={() => toggleAsset(r.key)}
                      className={`w-full grid grid-cols-[24px_minmax(130px,1fr)_60px_72px_78px_74px] items-center gap-2 pl-4 pr-5 h-10 ${t.hover} text-left transition ${isSelected ? (theme === 'light' ? "bg-gray-100 border-l-2 border-l-sky-500" : "bg-white/10 border-l-2 border-l-sky-500") : ""}`}
                    >
                      <img src={img} alt={r.symbol} className={`h-6 w-6 rounded-lg border ${t.border}`} />

                      <div className="min-w-0 overflow-hidden">
                        <div className="flex min-w-0 items-baseline gap-2">
                          <div className={`truncate text-[12px] font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white/90'}`}>{r.name}</div>
                          <div className={`shrink-0 text-[10px] font-semibold ${t.textMuted}`}>{r.symbol}</div>
                        </div>
                      </div>

                      <div>
                        <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] ${classBadge(r.assetClass, theme)}`}>{r.assetClass}</span>
                      </div>

                      <div className={`text-right pl-1 text-[12px] font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white/90'} tabular-nums`}>{fmtPrice(r.price)}</div>
                      <div className={`text-right text-[11px] ${t.textSecondary} tabular-nums`}>{fmtMoney(r.mcap)}</div>
                      <div className={`text-right pr-4 text-[11px] font-semibold tabular-nums ${chgTone}`}>{fmtPct(r.chg24)}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className={`col-span-12 flex min-h-0 flex-col overflow-hidden rounded-3xl border ${t.border} ${t.bgCard} md:col-span-8 lg:col-span-8`}>
          <div className={`flex flex-wrap items-center justify-between gap-2 border-b ${t.border} px-4 py-3`}>
            <div className="flex items-center gap-2">
              <Rss className={`h-4 w-4 ${t.textSecondary}`} />
              <div className="text-sm font-semibold">Live News Feed</div>
              <div className={`text-[11px] ${feedStatus === "live" ? "text-emerald-500" : feedStatus === "loading" ? "text-amber-500" : "text-rose-500"}`}>
                {feedStatus === "live" ? "● Live" : feedStatus === "loading" ? "● Loading..." : "● Error"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className={`rounded-2xl border ${t.border} ${t.bgCard} px-3 py-2 text-[11px] ${t.textSecondary}`}>
                Impact
                <select
                  value={selectedImpact || ''}
                  onChange={(e) => setSelectedImpact(e.target.value ? e.target.value as 'High' | 'Medium' | 'Low' : null)}
                  className={`ml-2 bg-transparent text-[11px] ${t.text} outline-none`}
                >
                  <option value="" className={theme === 'light' ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'}>All</option>
                  <option value="High" className={theme === 'light' ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'}>High</option>
                  <option value="Medium" className={theme === 'light' ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'}>Medium</option>
                  <option value="Low" className={theme === 'light' ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'}>Low</option>
                </select>
              </div>

              <div className={`rounded-2xl border ${t.border} ${t.bgCard} px-3 py-2 text-[11px] ${t.textSecondary}`}>
                Sort
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "recency" | "severity")}
                  className={`ml-2 bg-transparent text-[11px] ${t.text} outline-none`}
                >
                  <option value="recency" className={theme === 'light' ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'}>Recency</option>
                  <option value="severity" className={theme === 'light' ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'}>Impact</option>
                </select>
              </div>

              <div className={`md:hidden flex items-center gap-2 rounded-2xl border ${t.border} ${t.bgCard} px-3 py-2`}>
                <Search className={`h-4 w-4 ${t.textMuted}`} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search…"
                  className={`w-[160px] bg-transparent text-sm outline-none ${theme === 'light' ? 'placeholder:text-gray-400' : 'placeholder:text-white/35'}`}
                />
              </div>
            </div>
          </div>

          <div className={`border-b ${t.border} px-4 py-3`}>
            <div className={`text-xs font-semibold ${theme === 'light' ? 'text-gray-700' : 'text-white/85'}`}>Asset Impact Overview</div>
            <div className="mt-2 grid gap-2 grid-cols-4 md:grid-cols-7">
              {(["Equities", "Crypto", "Energy", "Metals", "Agriculture", "Indexes", "FX"] as AssetClass[]).map((cls) => {
                const b = overview[cls];
                const active = selectedClass === cls;
                const tone = directionBadge(b.label, theme);
                return (
                  <button
                    key={cls}
                    onClick={() => toggleClass(cls)}
                    className={
                      `rounded-2xl border px-3 py-2 text-left transition ${t.border} ` +
                      (active 
                        ? (theme === 'light' ? "border-gray-400 bg-gray-100" : "border-white/25 bg-white/10") 
                        : (theme === 'light' ? "bg-gray-50 hover:bg-gray-100" : "bg-white/5 hover:bg-white/10"))
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-semibold ${theme === 'light' ? 'text-gray-700' : 'text-white/85'}`}>{cls}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] ${tone}`}>{b.label}</span>
                    </div>
                    <div className={`mt-1 text-[10px] ${t.textMuted}`}>Signals: {b.count}</div>
                  </button>
                );
              })}
            </div>
            <div className={`mt-2 text-[11px] ${t.textMuted}`}>
              Overview is computed from <span className={theme === 'light' ? 'text-gray-600' : 'text-white/75'}>all</span> items (not affected by your current filters).
            </div>
          </div>

          {/* Sector Heatmap Section */}
          <div className={`border-b ${t.border} px-4 py-3`}>
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setHeatmapExpanded(!heatmapExpanded)}
                className="flex items-center gap-2"
              >
                <LayoutGrid className={`h-4 w-4 ${theme === 'light' ? 'text-gray-600' : 'text-white/70'}`} />
                <span className={`text-xs font-semibold ${theme === 'light' ? 'text-gray-700' : 'text-white/85'}`}>
                  Sentiment Heatmap
                </span>
                {heatmapExpanded ? (
                  <ChevronUp className={`h-4 w-4 ${t.textMuted}`} />
                ) : (
                  <ChevronDown className={`h-4 w-4 ${t.textMuted}`} />
                )}
              </button>
              
              {/* Clear button - always visible when filter is active */}
              {(selectedAsset || selectedClass) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAsset(null);
                    setSelectedClass(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${
                    theme === 'light'
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  <X className="h-3 w-3" />
                  Clear Filter
                  <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] ${
                    theme === 'light' ? 'bg-gray-200' : 'bg-white/20'
                  }`}>
                    {selectedAsset 
                      ? MARKET_TEMPLATE.find(a => a.key === selectedAsset)?.symbol || selectedAsset
                      : selectedClass}
                  </span>
                </button>
              )}
            </div>
            
            {heatmapExpanded && (
              <div className="mt-3">
                {/* View Toggle */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => { setHeatmapView('sectors'); setExpandedSector(null); }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${
                      heatmapView === 'sectors'
                        ? theme === 'light' 
                          ? 'bg-gray-900 text-white' 
                          : 'bg-white text-gray-900'
                        : theme === 'light'
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    Sectors
                  </button>
                  <button
                    onClick={() => setHeatmapView('assets')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${
                      heatmapView === 'assets'
                        ? theme === 'light' 
                          ? 'bg-gray-900 text-white' 
                          : 'bg-white text-gray-900'
                        : theme === 'light'
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    All Assets
                  </button>
                </div>

                {/* Sector View */}
                {heatmapView === 'sectors' && (
                  <div className="space-y-2">
                    {(["Equities", "Crypto", "Energy", "Metals", "Agriculture", "Indexes", "FX"] as AssetClass[]).map((sector) => {
                      const sectorData = overview[sector];
                      const sectorAssets = assetSentiments.filter(a => a.assetClass === sector);
                      const isExpanded = expandedSector === sector;
                      
                      // Calculate heatmap color - subtle backgrounds for readability
                      const getHeatColor = (score: number, label: string) => {
                        const intensity = Math.min(Math.abs(score) * 1.5, 1);
                        if (label === 'Bullish') {
                          return theme === 'light'
                            ? `rgba(16, 185, 129, ${0.08 + intensity * 0.12})`  // emerald-500
                            : `rgba(16, 185, 129, ${0.05 + intensity * 0.15})`;
                        }
                        if (label === 'Bearish') {
                          return theme === 'light'
                            ? `rgba(244, 63, 94, ${0.08 + intensity * 0.12})`   // rose-500
                            : `rgba(244, 63, 94, ${0.05 + intensity * 0.15})`;
                        }
                        return theme === 'light' ? 'rgba(156, 163, 175, 0.1)' : 'rgba(255, 255, 255, 0.03)';
                      };
                      
                      // Border color for heatmap cells
                      const getHeatBorder = (label: string) => {
                        if (label === 'Bullish') {
                          return theme === 'light' ? 'border-emerald-500/30' : 'border-emerald-500/25';
                        }
                        if (label === 'Bearish') {
                          return theme === 'light' ? 'border-rose-500/30' : 'border-rose-500/25';
                        }
                        return t.border;
                      };
                      
                      const sectorScore = sectorData.count > 0 ? sectorData.score / sectorData.count : 0;
                      
                      return (
                        <div key={sector}>
                          <button
                            onClick={() => setExpandedSector(isExpanded ? null : sector)}
                            className={`w-full rounded-xl p-3 transition border ${getHeatBorder(sectorData.label)} hover:border-opacity-60`}
                            style={{ backgroundColor: getHeatColor(sectorScore, sectorData.label) }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className={`text-sm font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                                  {sector}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                  sectorData.label === 'Bullish' 
                                    ? 'border-emerald-500/25 text-emerald-500 bg-emerald-500/10' 
                                    : sectorData.label === 'Bearish'
                                      ? 'border-rose-500/25 text-rose-500 bg-rose-500/10'
                                      : theme === 'light' ? 'border-gray-300 bg-gray-100 text-gray-600' : 'border-white/10 bg-white/5 text-white/60'
                                }`}>
                                  {sectorData.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`text-[11px] ${t.textMuted}`}>
                                  {sectorData.count} signals
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className={`h-4 w-4 ${t.textMuted}`} />
                                ) : (
                                  <ChevronDown className={`h-4 w-4 ${t.textMuted}`} />
                                )}
                              </div>
                            </div>
                            
                            {/* Mini asset preview */}
                            {!isExpanded && sectorAssets.filter(a => a.totalCount > 0).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {sectorAssets.filter(a => a.totalCount > 0).slice(0, 6).map((asset) => (
                                  <span
                                    key={asset.key}
                                    className={`text-[9px] px-1.5 py-0.5 rounded border ${
                                      asset.label === 'Bullish'
                                        ? 'border-emerald-500/20 text-emerald-500 bg-emerald-500/10'
                                        : asset.label === 'Bearish'
                                          ? 'border-rose-500/20 text-rose-500 bg-rose-500/10'
                                          : theme === 'light' ? 'border-gray-200 bg-gray-100 text-gray-500' : 'border-white/10 bg-white/5 text-white/50'
                                    }`}
                                  >
                                    {asset.symbol}
                                  </span>
                                ))}
                                {sectorAssets.filter(a => a.totalCount > 0).length > 6 && (
                                  <span className={`text-[9px] ${t.textMuted}`}>
                                    +{sectorAssets.filter(a => a.totalCount > 0).length - 6} more
                                  </span>
                                )}
                              </div>
                            )}
                          </button>
                          
                          {/* Expanded sector assets */}
                          {isExpanded && (
                            <div className={`mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-2 rounded-xl ${theme === 'light' ? 'bg-gray-50' : 'bg-white/5'}`}>
                              {sectorAssets.map((asset) => {
                                const assetHeatColor = getHeatColor(asset.score, asset.label);
                                return (
                                  <button
                                    key={asset.key}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleAsset(asset.key);
                                      setHeatmapExpanded(false);
                                    }}
                                    className={`rounded-lg p-2 border ${getHeatBorder(asset.label)} transition hover:scale-[1.02]`}
                                    style={{ backgroundColor: assetHeatColor }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className={`text-xs font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                                        {asset.symbol}
                                      </span>
                                      <span className={`text-sm font-medium ${
                                        asset.label === 'Bullish' ? 'text-emerald-500' :
                                        asset.label === 'Bearish' ? 'text-rose-500' :
                                        t.textMuted
                                      }`}>
                                        {asset.label === 'Bullish' ? '↑' : asset.label === 'Bearish' ? '↓' : '—'}
                                      </span>
                                    </div>
                                    <div className={`text-[10px] ${t.textMuted} mt-1`}>
                                      {asset.name}
                                    </div>
                                    <div className={`text-[9px] ${t.textMuted} mt-1`}>
                                      {asset.totalCount > 0 ? (
                                        <>
                                          <span className="text-emerald-500">{asset.bullishCount}↑</span>
                                          {' '}
                                          <span className="text-rose-500">{asset.bearishCount}↓</span>
                                          {' '}
                                          <span>{asset.neutralCount}—</span>
                                        </>
                                      ) : (
                                        'No signals'
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* All Assets View */}
                {heatmapView === 'assets' && (
                  <div className="max-h-[400px] overflow-y-auto pr-1">
                    <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-1.5">
                    {assetSentiments.map((asset) => {
                      // Subtle backgrounds for readability
                      const getHeatColor = (score: number, label: string) => {
                        const intensity = Math.min(Math.abs(score) * 1.5, 1);
                        if (label === 'Bullish') {
                          return theme === 'light'
                            ? `rgba(16, 185, 129, ${0.08 + intensity * 0.12})`
                            : `rgba(16, 185, 129, ${0.05 + intensity * 0.15})`;
                        }
                        if (label === 'Bearish') {
                          return theme === 'light'
                            ? `rgba(244, 63, 94, ${0.08 + intensity * 0.12})`
                            : `rgba(244, 63, 94, ${0.05 + intensity * 0.15})`;
                        }
                        return theme === 'light' ? 'rgba(156, 163, 175, 0.08)' : 'rgba(255, 255, 255, 0.03)';
                      };
                      
                      const getHeatBorder = (label: string) => {
                        if (label === 'Bullish') return theme === 'light' ? 'border-emerald-500/30' : 'border-emerald-500/25';
                        if (label === 'Bearish') return theme === 'light' ? 'border-rose-500/30' : 'border-rose-500/25';
                        return t.border;
                      };
                      
                      return (
                        <button
                          key={asset.key}
                          onClick={() => {
                            toggleAsset(asset.key);
                            setHeatmapExpanded(false);
                          }}
                          className={`rounded-lg p-2 border ${getHeatBorder(asset.label)} transition hover:scale-[1.03] text-left`}
                          style={{ backgroundColor: getHeatColor(asset.score, asset.label) }}
                          title={`${asset.name}: ${asset.bullishCount} bullish, ${asset.bearishCount} bearish, ${asset.neutralCount} neutral`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-[11px] font-bold ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                              {asset.symbol}
                            </span>
                            <span className={`text-sm font-medium ${
                              asset.label === 'Bullish' ? 'text-emerald-500' :
                              asset.label === 'Bearish' ? 'text-rose-500' :
                              t.textMuted
                            }`}>
                              {asset.label === 'Bullish' ? '↑' : asset.label === 'Bearish' ? '↓' : '—'}
                            </span>
                          </div>
                          <div className={`text-[8px] ${t.textMuted} truncate`}>
                            {asset.name}
                          </div>
                          {asset.totalCount > 0 && (
                            <div className={`text-[8px] mt-0.5 ${t.textMuted}`}>
                              {asset.totalCount} signal{asset.totalCount !== 1 ? 's' : ''}
                            </div>
                          )}
                        </button>
                      );
                    })}
                    </div>
                  </div>
                )}
                
                <div className={`mt-3 text-[10px] ${t.textMuted} flex items-center gap-4`}>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded border border-emerald-500/30 bg-emerald-500/20"></span> Bullish
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded border border-rose-500/30 bg-rose-500/20"></span> Bearish
                  </span>
                  <span className="flex items-center gap-1">
                    <span className={`w-3 h-3 rounded ${theme === 'light' ? 'border border-gray-300 bg-gray-100' : 'border border-white/10 bg-white/5'}`}></span> Neutral
                  </span>
                  <span className="ml-auto">Click any asset to filter headlines</span>
                </div>
              </div>
            )}
          </div>

          <div ref={masterScrollRef} className="flex-1 overflow-auto p-2 no-scrollbar">
            <div className="grid gap-2">
              {feedStatus === "loading" && items.length === 0 && (
                <div className={`rounded-3xl border ${t.border} ${t.bgCard} p-5 text-sm ${t.textSecondary} text-center`}>
                  <RefreshCcw className={`h-6 w-6 animate-spin mx-auto mb-2 ${t.textMuted}`} />
                  Loading news feeds...
                </div>
              )}

              {feedStatus === "error" && items.length === 0 && (
                <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-600 text-center">
                  Failed to load news feeds. Click Refresh to try again.
                </div>
              )}

              {filteredItems.map((it) => {
                const expanded = expandedId === it.id;
                const hint = it.country ? it.country : "Global";
                const sourceLogo = sourceLogoDataUrl(it.handle);
                const isCongressTrade = it.isCongressTrade === true;
                return (
                  <div key={it.id} className={`rounded-3xl border ${isCongressTrade ? (theme === 'light' ? 'border-purple-300 bg-gradient-to-r from-purple-50 to-blue-50' : 'border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-blue-500/10') : `${t.border} ${theme === 'light' ? 'bg-white' : 'bg-black/20'}`} transition-colors duration-200`}>
                    <button onClick={() => toggleExpand(it.id)} className={`w-full rounded-3xl px-3 py-2 text-left ${t.hover} transition-colors duration-200`}>
                      <div className="flex items-start gap-3">
                        {isCongressTrade ? (
                          <div className={`mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-2xl flex items-center justify-center ${theme === 'light' ? 'bg-purple-100' : 'bg-purple-500/20'}`}>
                            <Building2 className={`h-5 w-5 ${theme === 'light' ? 'text-purple-600' : 'text-purple-400'}`} />
                          </div>
                        ) : (
                          <div className={`mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-2xl border ${t.border}`}>
                            <img src={sourceLogo} alt={it.handle} className="h-full w-full object-cover" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {isCongressTrade ? (
                              <>
                                <div className={`text-xs font-semibold ${theme === 'light' ? 'text-purple-700' : 'text-purple-300'}`}>Congressional Trade</div>
                                <div className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  it.tradeData?.chamber === 'Senate' 
                                    ? 'bg-purple-500/20 text-purple-600' 
                                    : 'bg-blue-500/20 text-blue-600'
                                }`}>
                                  {it.tradeData?.chamber}
                                </div>
                                <div className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  it.tradeData?.party === 'Democrat' || it.tradeData?.party === 'D'
                                    ? 'bg-blue-500/20 text-blue-600' 
                                    : it.tradeData?.party === 'Republican' || it.tradeData?.party === 'R'
                                      ? 'bg-red-500/20 text-red-600'
                                      : 'bg-gray-500/20 text-gray-600'
                                }`}>
                                  {it.tradeData?.party}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className={`text-xs font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white/90'}`}>{it.sourceName}</div>
                                <div className={`text-[11px] ${t.textMuted}`}>@{it.handle}</div>
                              </>
                            )}
                            <div className={`ml-auto shrink-0 rounded-full border ${t.border} ${t.bgCard} px-2 py-0.5 text-[10px] ${t.textSecondary}`}>
                              {timeAgoLabel(it.ts)}
                            </div>
                          </div>

                          {isCongressTrade && it.tradeData ? (
                            <div className="mt-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-lg font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{it.tradeData.ticker}</span>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                  it.tradeData.type === 'Buy' 
                                    ? 'bg-green-500/20 text-green-600' 
                                    : 'bg-red-500/20 text-red-600'
                                }`}>
                                  {it.tradeData.type}
                                </span>
                                <span className={`text-[11px] ${t.textSecondary}`}>{it.tradeData.amount}</span>
                              </div>
                              <div className={`text-[12px] ${theme === 'light' ? 'text-gray-600' : 'text-white/70'}`}>
                                {it.tradeData.politician}
                              </div>
                            </div>
                          ) : (
                            <div className={`mt-1 line-clamp-2 text-[12px] leading-5 ${theme === 'light' ? 'text-gray-700' : 'text-white/85'}`}>{it.text}</div>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border ${t.border} ${t.bgCard} px-2 py-0.5 text-[10px] ${t.textSecondary}`}>{hint}</span>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${impactLevelBadge(it.impactLevel, theme)}`}>
                              {it.impactLevel === 'Severe' ? 'High' : it.impactLevel} Impact
                            </span>

                            {(it.assets || []).slice(0, 3).map((asset, idx) => (
                              <span key={`${it.id}-${asset.asset}-${idx}`} className={`rounded-full border px-2 py-0.5 text-[10px] ${directionBadge(asset.direction, theme)}`}>
                                {asset.asset}: {asset.direction}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>

                    {expanded && (
                      <div className={`border-t ${t.border} px-4 py-3`}>
                        <div className="grid gap-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className={`text-[11px] font-semibold ${theme === 'light' ? 'text-gray-700' : 'text-white/85'}`}>
                              Impact Breakdown
                            </div>
                            <div className="flex items-center gap-2">
                              {it.research && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    shareToX({
                                      sourceName: it.sourceName,
                                      handle: it.handle,
                                      text: it.text,
                                      country: it.country,
                                      impactLevel: it.impactLevel,
                                      assets: it.assets,
                                      research: it.research,
                                    });
                                  }}
                                  className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-600 hover:bg-sky-500/20 transition"
                                >
                                  <Share2 className="h-4 w-4" />
                                  Share
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setResearchItem({
                                    sourceName: it.sourceName,
                                    handle: it.handle,
                                    text: it.text,
                                    country: it.country,
                                    impactLevel: it.impactLevel,
                                    assets: it.assets,
                                    research: it.research,
                                  });
                                  // Always call research API for full 2nd/3rd order analysis
                                  openResearch(it.text);
                                }}
                                className="inline-flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-[11px] text-purple-600 hover:bg-purple-500/20 transition"
                              >
                                <Sparkles className="h-4 w-4" />
                                Research
                              </button>
                              {it.url && (
                                <a
                                  href={it.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className={`inline-flex items-center gap-2 rounded-xl border ${t.border} ${t.bgCard} px-3 py-2 text-[11px] ${t.textSecondary} ${t.hover}`}
                                >
                                  Read full article <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="grid gap-2 md:grid-cols-3">
                            {(it.assets || []).slice(0, 3).map((asset, idx) => (
                              <div key={`${it.id}-asset-${asset.asset}-${idx}`} className={`rounded-2xl border ${t.border} ${t.bgCard} p-3`}>
                                <div className="flex items-center justify-between gap-2">
                                  <div className={`truncate text-[12px] font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white/90'}`}>{asset.asset}</div>
                                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${directionBadge(asset.direction, theme)}`}>{asset.direction}</span>
                                </div>
                                <div className={`mt-1 text-[11px] ${t.textSecondary}`}>{asset.rationale}</div>
                                <div className={`mt-2 text-[10px] ${t.textMuted}`}>Class: {asset.assetClass}</div>
                              </div>
                            ))}
                          </div>

                          {it.research && (
                            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-3">
                              <div className="text-[10px] font-semibold text-purple-600 mb-1">SUMMARY</div>
                              <div className={`text-[12px] ${theme === 'light' ? 'text-gray-700' : 'text-white/85'}`}>{it.research.summary}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredItems.length === 0 && feedStatus === "live" && (
                <div className={`rounded-3xl border ${t.border} ${t.bgCard} p-5 text-sm ${t.textSecondary}`}>No items match your filters.</div>
              )}

              <div className="h-4" />
            </div>
          </div>

          <div className={`border-t ${t.border} px-4 py-3 text-[11px] ${t.textMuted}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rss className="h-3 w-3" />
                Sources: Reuters, BBC, CNBC, Bloomberg, NYT, FT, ZeroHedge, MarketWatch + more • Auto-refreshes every 5 minutes
              </div>
              {lastUpdated && (
                <div>Last updated: {lastUpdated.toLocaleTimeString()}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`pointer-events-none fixed inset-x-0 bottom-0 h-16 bg-gradient-to-t ${theme === 'light' ? 'from-gray-50' : 'from-[#070b12]'} to-transparent`} />

      {/* Research Modal */}
      {researchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className={`relative w-full max-w-2xl max-h-[85vh] overflow-auto rounded-3xl border ${t.border} ${theme === 'light' ? 'bg-white' : 'bg-[#0a0f18]'} shadow-2xl`}>
            <div className={`sticky top-0 z-10 flex items-center justify-between border-b ${t.border} ${theme === 'light' ? 'bg-white' : 'bg-[#0a0f18]'} px-5 py-4`}>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-purple-500/20 p-2">
                  <Sparkles className={`h-5 w-5 ${theme === 'light' ? 'text-purple-600' : 'text-purple-300'}`} />
                </div>
                <div>
                  <div className={`text-sm font-semibold ${t.text}`}>Research Analysis</div>
                  <div className={`text-[11px] ${t.textMuted}`}>2nd & 3rd order thinking</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {researchResult && researchItem && (
                  <button
                    onClick={() => {
                      shareToX({
                        ...researchItem,
                        research: { summary: researchResult.summary },
                      });
                    }}
                    className={`inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[11px] ${theme === 'light' ? 'text-sky-600' : 'text-sky-200'} hover:bg-sky-500/20 transition`}
                  >
                    <Share2 className="h-4 w-4" />
                    Share to X
                  </button>
                )}
                <button
                  onClick={() => setResearchOpen(false)}
                  className={`rounded-xl border ${t.border} ${t.bgCard} p-2 ${t.hover}`}
                >
                  <X className={`h-4 w-4 ${t.textSecondary}`} />
                </button>
              </div>
            </div>

            <div className="p-5">
              <div className={`mb-4 rounded-2xl border ${t.border} ${t.bgCard} p-4`}>
                <div className={`text-[11px] font-semibold ${t.textMuted} mb-2`}>HEADLINE</div>
                <div className={`text-[13px] ${theme === 'light' ? 'text-gray-800' : 'text-white/90'} leading-relaxed`}>{researchHeadline}</div>
              </div>

              {researchLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCcw className={`h-8 w-8 animate-spin ${theme === 'light' ? 'text-purple-500' : 'text-purple-400'} mb-3`} />
                  <div className={`text-sm ${t.textSecondary}`}>Analyzing headline...</div>
                  <div className={`text-[11px] ${t.textMuted} mt-1`}>Using 2nd & 3rd order thinking</div>
                </div>
              )}

              {!researchLoading && researchResult && (
                <div className="space-y-4">
                  <div className={`rounded-2xl border ${t.border} ${t.bgCard} p-4`}>
                    <div className={`text-[11px] font-semibold ${t.textMuted} mb-2`}>SUMMARY</div>
                    <div className={`text-[13px] ${theme === 'light' ? 'text-gray-700' : 'text-white/85'}`}>{researchResult.summary}</div>
                    <div className={`mt-2 inline-flex rounded-full border ${t.border} ${t.bgCard} px-2 py-0.5 text-[10px] ${t.textSecondary}`}>
                      Confidence: {researchResult.confidence}
                    </div>
                  </div>

                  {researchResult.firstOrder.length > 0 && (
                    <div>
                      <div className={`text-[11px] font-semibold ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'} mb-2 flex items-center gap-2`}>
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        1ST ORDER — Direct Impact
                      </div>
                      <div className="grid gap-2">
                        {researchResult.firstOrder.map((item, i) => (
                          <div key={i} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className={`text-[12px] font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white/90'}`}>{item.asset}</span>
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${directionBadge(item.direction, theme)}`}>
                                {item.direction}
                              </span>
                            </div>
                            <div className={`text-[11px] ${t.textSecondary}`}>{item.rationale}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {researchResult.secondOrder.length > 0 && (
                    <div>
                      <div className={`text-[11px] font-semibold ${theme === 'light' ? 'text-amber-600' : 'text-amber-400'} mb-2 flex items-center gap-2`}>
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        2ND ORDER — Indirect Impact
                      </div>
                      <div className="grid gap-2">
                        {researchResult.secondOrder.map((item, i) => (
                          <div key={i} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className={`text-[12px] font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white/90'}`}>{item.asset}</span>
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${directionBadge(item.direction, theme)}`}>
                                {item.direction}
                              </span>
                            </div>
                            <div className={`text-[11px] ${t.textSecondary}`}>{item.rationale}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {researchResult.thirdOrder.length > 0 && (
                    <div>
                      <div className={`text-[11px] font-semibold ${theme === 'light' ? 'text-purple-600' : 'text-purple-400'} mb-2 flex items-center gap-2`}>
                        <div className="h-2 w-2 rounded-full bg-purple-500" />
                        3RD ORDER — Macro & Structural
                      </div>
                      <div className="grid gap-2">
                        {researchResult.thirdOrder.map((item, i) => (
                          <div key={i} className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className={`text-[12px] font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white/90'}`}>{item.asset}</span>
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${directionBadge(item.direction, theme)}`}>
                                {item.direction}
                              </span>
                            </div>
                            <div className={`text-[11px] ${t.textSecondary}`}>{item.rationale}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {researchResult.contrarian && (
                    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
                      <div className={`text-[11px] font-semibold ${theme === 'light' ? 'text-rose-600' : 'text-rose-400'} mb-2`}>⚠️ CONTRARIAN VIEW</div>
                      <div className={`text-[12px] ${theme === 'light' ? 'text-gray-700' : 'text-white/85'}`}>{researchResult.contrarian}</div>
                    </div>
                  )}

                  <div className={`text-[10px] ${t.textMuted} text-center pt-2`}>
                    Analysis is for informational purposes only. Not financial advice.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
