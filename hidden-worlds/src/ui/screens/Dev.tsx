// /#/dev: render any puzzle with an answers overlay, and compute the golden hashes in this
// browser (E2E-15 compares them with tests/golden/golden.json). Not linked from the app.
import { useEffect, useMemo, useRef, useState } from 'react';
import { generate, specHash, type PuzzleSpec } from '../../engine/logic';
import { computeGolden, type GoldenEntry } from '../../engine/golden';
import { loadPack } from '../../engine/pack/load';
import type { SpritePack } from '../../engine/pack/types';
import { renderWorld, spriteBounds } from '../../engine/render/draw';
import { COLORS } from '../../engine/render/palette';
import { WORLD_ORDER } from '../../config';

export function Dev() {
  const [pack, setPack] = useState<SpritePack | null>(null);
  const [seed, setSeed] = useState('dev-1');
  const [difficulty, setDifficulty] = useState(3);
  const [world, setWorld] = useState<string>('meadow');
  const [answers, setAnswers] = useState(true);
  const [golden, setGolden] = useState<GoldenEntry[] | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadPack().then((p) => {
      setPack(p);
      setGolden(computeGolden(p.logic));
    });
  }, []);

  const spec = useMemo<PuzzleSpec | null>(
    () => (pack ? generate({ seed, difficulty, worldId: world, pack: pack.logic }) : null),
    [pack, seed, difficulty, world],
  );

  useEffect(() => {
    if (!pack || !spec) return;
    const s = spec;
    let live = true;
    pack.art.ready(s.sprites).then(() => {
      const c = canvas.current;
      if (!live || !c) return;
      c.width = s.W / 2;
      c.height = s.H / 2;
      const ctx = c.getContext('2d')!;
      ctx.scale(0.5, 0.5);
      renderWorld(ctx, s, pack, COLORS);
      if (answers) {
        ctx.lineWidth = 6;
        for (const t of [...s.targets, ...(s.resident ? [s.resident] : [])]) {
          const b = spriteBounds(s.sprites[t.uid]!);
          ctx.strokeStyle = t === s.resident ? '#ffb81c' : '#e5532d';
          ctx.strokeRect(b.x, b.y, b.w, b.h);
        }
      }
    });
    return () => {
      live = false;
    };
  }, [pack, spec, answers]);

  return (
    <main className="dev">
      <h1 className="title">Engine bench</h1>
      <form className="dev-form" onSubmit={(e) => e.preventDefault()}>
        <label>
          Seed <input value={seed} onChange={(e) => setSeed(e.target.value)} />
        </label>
        <label>
          Difficulty{' '}
          <input
            type="number"
            min={1}
            max={5}
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
          />
        </label>
        <label>
          World{' '}
          <select value={world} onChange={(e) => setWorld(e.target.value)}>
            {WORLD_ORDER.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={answers} onChange={(e) => setAnswers(e.target.checked)} /> Answers
        </label>
      </form>
      {spec && (
        <p data-testid="dev-stats">
          pack {spec.packId} v{spec.packVersion} · hash {specHash(spec)} · targets {spec.targets.length} ·
          passes {spec.stats.passes} · forced {spec.stats.forced}
        </p>
      )}
      <canvas ref={canvas} className="dev-canvas" />
      <h2>Golden check</h2>
      <pre data-testid="golden">{golden ? JSON.stringify(golden) : 'computing'}</pre>
    </main>
  );
}
