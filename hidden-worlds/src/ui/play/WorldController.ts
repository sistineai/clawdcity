// The world canvas: camera, input and drawing. React owns the element; this class owns every
// frame, so React never re-renders while the player pans (CLAUDE.md code style).
import { PLAY } from '../../config';
import { isSkySprite, type PuzzleSpec } from '../../engine/logic';
import type { Palette, SpritePack } from '../../engine/pack/types';
import { renderWorld, spriteBounds, type Rect } from '../../engine/render/draw';

export interface Camera {
  s: number;
  tx: number;
  ty: number;
}

export interface WorldEvents {
  /** A tap in world coordinates, with the forgiving radius in world pixels. Returns true when the
   *  tap found something, so a quick follow-up tap is not read as a double-tap. */
  onTap(x: number, y: number, radiusWorld: number, double: boolean): boolean;
  onCamera?(c: Camera): void;
}

interface Mark {
  x: number;
  y: number;
  t0: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export class WorldController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private world: HTMLCanvasElement | null;
  private spec: PuzzleSpec;
  private pack: SpritePack;
  private palette: Palette;
  private events: WorldEvents;
  private dpr = 1;
  private vw = 1;
  private vh = 1;
  cam: Camera = { s: 1, tx: 0, ty: 0 };
  private found = new Set<number>();
  private misses: Mark[] = [];
  private hint: { x: number; y: number; r: number; until: number } | null = null;
  private raf = 0;
  private sharpTimer: ReturnType<typeof setTimeout> | null = null;
  private sharp = false;
  private pointers = new Map<number, { x: number; y: number; x0: number; y0: number; t0: number }>();
  private pinch: { d0: number; s0: number } | null = null;
  private moved = false;
  private lastTap: { x: number; y: number; t: number } | null = null;
  private anim: { from: Camera; to: Camera; t0: number; ms: number } | null = null;
  reducedMotion = false;
  private ro: ResizeObserver | null = null;
  private disposed = false;

  constructor(
    canvas: HTMLCanvasElement,
    spec: PuzzleSpec,
    pack: SpritePack,
    palette: Palette,
    events: WorldEvents,
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.spec = spec;
    this.pack = pack;
    this.palette = palette;
    this.events = events;
    this.world = this.paintWorld();
    this.bind();
    this.resize();
    this.fitInitial();
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(canvas);
    }
  }

  /** The full world at 1 world pixel per canvas pixel, painted once. */
  private paintWorld(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.spec.W;
    c.height = this.spec.H;
    renderWorld(c.getContext('2d')!, this.spec, this.pack, this.palette);
    return c;
  }

  setPalette(p: Palette): void {
    this.palette = p;
    this.releaseWorld();
    this.world = this.paintWorld();
    this.invalidate();
  }

  setTapHandler(fn: WorldEvents['onTap']): void {
    this.events = { ...this.events, onTap: fn };
  }

  setFound(uids: Iterable<number>): void {
    this.found = new Set(uids);
    this.invalidate();
  }

  // ---------- camera ----------
  private minScale(): number {
    return Math.min(this.vw / this.spec.W, this.vh / this.spec.H);
  }
  private maxScale(): number {
    return PLAY.maxZoom;
  }
  private clampCam(c: Camera): Camera {
    const s = clamp(c.s, this.minScale(), this.maxScale());
    const ww = this.spec.W * s;
    const wh = this.spec.H * s;
    // world never leaves the screen: centre it when smaller than the view, else keep edges covered
    const tx = ww <= this.vw ? (this.vw - ww) / 2 : clamp(c.tx, this.vw - ww, 0);
    const ty = wh <= this.vh ? (this.vh - wh) / 2 : clamp(c.ty, this.vh - wh, 0);
    return { s, tx, ty };
  }
  setCamera(c: Camera, animate = false): void {
    const to = this.clampCam(c);
    if (animate && !this.reducedMotion)
      this.anim = { from: { ...this.cam }, to, t0: performance.now(), ms: 420 };
    else {
      this.anim = null;
      this.cam = to;
    }
    this.sharp = false;
    this.events.onCamera?.(this.cam);
    this.invalidate();
  }
  private fitInitial(): void {
    // Start with the world filling the screen's height (or width), centred: big enough to tap.
    const s = Math.max(this.vw / this.spec.W, this.vh / this.spec.H);
    this.setCamera({ s, tx: (this.vw - this.spec.W * s) / 2, ty: (this.vh - this.spec.H * s) / 2 });
  }
  fitAll(): void {
    const s = this.minScale();
    this.setCamera({ s, tx: 0, ty: 0 }, true);
  }
  zoomBy(f: number, sx = this.vw / 2, sy = this.vh / 2, animate = true): void {
    const c = this.cam;
    const s = clamp(c.s * f, this.minScale(), this.maxScale());
    const wx = (sx - c.tx) / c.s;
    const wy = (sy - c.ty) / c.s;
    this.setCamera({ s, tx: sx - wx * s, ty: sy - wy * s }, animate);
  }
  centerOn(x: number, y: number, s = this.cam.s, animate = true): void {
    this.setCamera({ s, tx: this.vw / 2 - x * s, ty: this.vh / 2 - y * s }, animate);
  }
  worldToScreen(x: number, y: number): { x: number; y: number } {
    return { x: x * this.cam.s + this.cam.tx, y: y * this.cam.s + this.cam.ty };
  }
  screenToWorld(x: number, y: number): { x: number; y: number } {
    return { x: (x - this.cam.tx) / this.cam.s, y: (y - this.cam.ty) / this.cam.s };
  }
  /** Tap radius in world pixels: a fixed screen distance, so it grows as you zoom out (PLAY-3). */
  tapRadiusWorld(): number {
    return clamp(PLAY.tapRadiusScreenPx / this.cam.s, PLAY.tapRadiusMinWorld, PLAY.tapRadiusMaxWorld);
  }

  // ---------- feedback ----------
  addMiss(x: number, y: number): void {
    this.misses.push({ x, y, t0: performance.now() });
    this.invalidate();
  }
  showHint(x: number, y: number, r: number): void {
    this.hint = { x, y, r, until: performance.now() + PLAY.hintMs };
    const s = clamp(Math.min(this.vw, this.vh) / (r * 2 * 1.7), this.minScale(), this.maxScale());
    this.centerOn(x, y, Math.max(s, this.minScale()), true);
  }

  // ---------- input ----------
  private bind(): void {
    const c = this.canvas;
    c.addEventListener('pointerdown', this.onDown);
    c.addEventListener('pointermove', this.onMove);
    c.addEventListener('pointerup', this.onUp);
    c.addEventListener('pointercancel', this.onCancel);
    c.addEventListener('wheel', this.onWheel, { passive: false });
    c.addEventListener('keydown', this.onKey);
  }
  private local(e: PointerEvent | WheelEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  private two(): [{ x: number; y: number }, { x: number; y: number }] {
    const v = [...this.pointers.values()];
    return [v[0]!, v[1]!];
  }
  private onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const p = this.local(e);
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      // synthetic pointers in some browsers cannot be captured
    }
    this.pointers.set(e.pointerId, { x: p.x, y: p.y, x0: p.x, y0: p.y, t0: performance.now() });
    this.anim = null;
    if (this.pointers.size === 1) this.moved = false;
    if (this.pointers.size === 2) {
      const [a, b] = this.two();
      this.pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: this.cam.s };
      this.moved = true;
    }
  };
  private onMove = (e: PointerEvent) => {
    const q = this.pointers.get(e.pointerId);
    if (!q) return;
    const p = this.local(e);
    const dx = p.x - q.x;
    const dy = p.y - q.y;
    q.x = p.x;
    q.y = p.y;
    if (Math.hypot(p.x - q.x0, p.y - q.y0) > PLAY.tapSlopPx) this.moved = true;
    if (this.pointers.size === 1 && this.moved) {
      this.setCamera({ s: this.cam.s, tx: this.cam.tx + dx, ty: this.cam.ty + dy });
    } else if (this.pointers.size === 2 && this.pinch) {
      const [a, b] = this.two();
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const target = (this.pinch.s0 * d) / this.pinch.d0;
      // zoom about the midpoint, and follow the midpoint as it moves
      const c = this.cam;
      const wx = (mx - dx / 2 - c.tx) / c.s;
      const wy = (my - dy / 2 - c.ty) / c.s;
      const s = clamp(target, this.minScale(), this.maxScale());
      this.setCamera({ s, tx: mx - wx * s, ty: my - wy * s });
    }
  };
  private onUp = (e: PointerEvent) => {
    const q = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    if (!q) return;
    const dt = performance.now() - q.t0;
    // PLAY-2: down and up within 8 px and 300 ms, with no other finger involved
    if (
      !this.moved &&
      this.pointers.size === 0 &&
      dt <= PLAY.tapMaxMs &&
      Math.hypot(q.x - q.x0, q.y - q.y0) <= PLAY.tapSlopPx
    ) {
      const t = performance.now();
      const double =
        !!this.lastTap &&
        t - this.lastTap.t < PLAY.doubleTapMs &&
        Math.hypot(q.x - this.lastTap.x, q.y - this.lastTap.y) < 30;
      this.lastTap = double ? null : { x: q.x, y: q.y, t };
      const w = this.screenToWorld(q.x, q.y);
      const hit = this.events.onTap(w.x, w.y, this.tapRadiusWorld(), double);
      if (hit) this.lastTap = null;
      if (double) this.zoomBy(PLAY.zoomStep, q.x, q.y);
    }
  };
  private onCancel = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    this.pinch = null;
  };
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const p = this.local(e);
    const f = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0018));
    this.zoomBy(f, p.x, p.y, false);
  };
  private onKey = (e: KeyboardEvent) => {
    const step = 80;
    const c = this.cam;
    const k = e.key;
    if (k === 'ArrowLeft') this.setCamera({ ...c, tx: c.tx + step });
    else if (k === 'ArrowRight') this.setCamera({ ...c, tx: c.tx - step });
    else if (k === 'ArrowUp') this.setCamera({ ...c, ty: c.ty + step });
    else if (k === 'ArrowDown') this.setCamera({ ...c, ty: c.ty - step });
    else if (k === '+' || k === '=') this.zoomBy(PLAY.zoomStep);
    else if (k === '-' || k === '_') this.zoomBy(1 / PLAY.zoomStep);
    else return;
    e.preventDefault();
  };

  // ---------- drawing ----------
  resize(): void {
    const r = this.canvas.getBoundingClientRect();
    // SHELL-11: cap the backing store at DPR 2 (iOS limits canvas memory)
    this.dpr = Math.min(PLAY.maxDpr, window.devicePixelRatio || 1);
    this.vw = Math.max(1, r.width);
    this.vh = Math.max(1, r.height);
    this.canvas.width = Math.round(this.vw * this.dpr);
    this.canvas.height = Math.round(this.vh * this.dpr);
    this.cam = this.clampCam(this.cam);
    this.sharp = false;
    this.invalidate();
  }
  get viewSize(): { w: number; h: number } {
    return { w: this.vw, h: this.vh };
  }
  invalidate(): void {
    if (this.disposed || this.raf) return;
    this.raf = requestAnimationFrame(this.frame);
  }
  private frame = (t: number) => {
    this.raf = 0;
    if (this.disposed) return;
    let again = false;
    if (this.anim) {
      const k = Math.min(1, (t - this.anim.t0) / this.anim.ms);
      const e = 1 - Math.pow(1 - k, 3);
      const a = this.anim.from;
      const b = this.anim.to;
      this.cam = { s: a.s + (b.s - a.s) * e, tx: a.tx + (b.tx - a.tx) * e, ty: a.ty + (b.ty - a.ty) * e };
      if (k >= 1) this.anim = null;
      again = true;
      this.sharp = false;
    }
    const ctx = this.ctx;
    const { s, tx, ty } = this.cam;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1b3a30';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.dpr * s, 0, 0, this.dpr * s, this.dpr * tx, this.dpr * ty);
    ctx.imageSmoothingEnabled = true;
    if (this.world) ctx.drawImage(this.world, 0, 0);
    if (this.sharp) this.drawSharp();
    else if (!this.anim && s * this.dpr > 1.05) this.scheduleSharp();
    this.drawOverlays(ctx, t);
    if (this.misses.length || this.hint) again = true;
    if (again) this.invalidate();
  };
  private scheduleSharp(): void {
    if (this.sharpTimer) clearTimeout(this.sharpTimer);
    this.sharpTimer = setTimeout(() => {
      this.sharpTimer = null;
      this.sharp = true;
      this.invalidate();
    }, PLAY.sharpRedrawDelayMs);
  }
  /** When zoomed past 1:1, redraw the visible sprites as vectors so they stay crisp. */
  private drawSharp(): void {
    const tl = this.screenToWorld(0, 0);
    const br = this.screenToWorld(this.vw, this.vh);
    const region: Rect = { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
    renderWorld(this.ctx, this.spec, this.pack, this.palette, { background: false, region });
  }
  private drawOverlays(ctx: CanvasRenderingContext2D, t: number): void {
    const s = this.cam.s;
    const px = 1 / s;
    // found markers: a gold ring with a small tick, sized to the sprite
    for (const uid of this.found) {
      const sp = this.spec.sprites[uid];
      if (!sp) continue;
      const b = spriteBounds(sp);
      const r = Math.max(b.w * 0.5, 14 * px);
      ctx.lineWidth = Math.max(3 * px, 3);
      ctx.strokeStyle = 'rgba(255,184,28,0.95)';
      ctx.fillStyle = 'rgba(255,184,28,0.16)';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const cr = Math.max(9 * px, r * 0.26);
      const cx = sp.x + r * 0.7;
      const cy = sp.y - r * 0.7;
      ctx.fillStyle = '#ffb81c';
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#13231d';
      ctx.lineWidth = cr * 0.32;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - cr * 0.45, cy);
      ctx.lineTo(cx - cr * 0.1, cy + cr * 0.35);
      ctx.lineTo(cx + cr * 0.5, cy - cr * 0.35);
      ctx.stroke();
    }
    // misses: a small cross that fades
    const life = 900;
    this.misses = this.misses.filter((m) => t - m.t0 < life);
    for (const m of this.misses) {
      const a = 1 - (t - m.t0) / life;
      const r = 10 * px;
      ctx.strokeStyle = `rgba(229,83,45,${a.toFixed(3)})`;
      ctx.lineWidth = 3.5 * px;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x - r, m.y - r);
      ctx.lineTo(m.x + r, m.y + r);
      ctx.moveTo(m.x + r, m.y - r);
      ctx.lineTo(m.x - r, m.y + r);
      ctx.stroke();
    }
    if (this.hint) {
      if (t > this.hint.until) this.hint = null;
      else {
        const k = this.reducedMotion ? 0 : (Math.sin(t / 180) + 1) / 2;
        ctx.lineWidth = (4 + 3 * k) * px;
        ctx.strokeStyle = 'rgba(255,184,28,0.95)';
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath();
        ctx.arc(this.hint.x, this.hint.y, this.hint.r * (1 + 0.04 * k), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  /** Whether a sprite is in the sky layer (for the test hook and hints). */
  isSky(uid: number): boolean {
    const sp = this.spec.sprites[uid];
    return !!sp && isSkySprite(sp);
  }

  private releaseWorld(): void {
    if (this.world) {
      // release the big backing store promptly (SHELL-11)
      this.world.width = 0;
      this.world.height = 0;
      this.world = null;
    }
  }
  dispose(): void {
    this.disposed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.sharpTimer) clearTimeout(this.sharpTimer);
    this.ro?.disconnect();
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onDown);
    c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('pointercancel', this.onCancel);
    c.removeEventListener('wheel', this.onWheel);
    c.removeEventListener('keydown', this.onKey);
    this.releaseWorld();
    c.width = 0;
    c.height = 0;
  }
}
