// META-2: played, completed, streaks, best and average time, three-star count, residents found.
import { formatTime, todayKey } from '../../game/dates';
import { now } from '../../game/clock';
import { displayedStreak } from '../../game/streak';
import { useApp } from '../../state/store';
import { S } from '../../strings';
import { Screen } from '../components/Screen';

export function Stats() {
  const doc = useApp((s) => s.doc);
  const st = doc.stats;
  const total = useApp((s) => s.pack?.logic.worlds.reduce((a, w) => a + w.residents.length, 0) ?? 12);
  const rows: [string, string | number, string][] = [
    [S.played, st.played, 'played'],
    [S.completed, st.completed, 'completed'],
    [S.currentStreak, displayedStreak(doc.streak, todayKey(now())), 'streak'],
    [S.bestStreakLong, doc.streak.best, 'best-streak'],
    [S.bestTime, st.bestTimeMs === null ? '–' : formatTime(st.bestTimeMs), 'best-time'],
    [S.avgTime, st.completed ? formatTime(st.totalTimeMs / st.completed) : '–', 'avg-time'],
    [S.threeStars, st.threeStars, 'three-stars'],
    [S.residentsFound, `${Object.keys(doc.residents).length} / ${total}`, 'residents'],
  ];
  return (
    <Screen title={S.statsTitle}>
      <dl className="stat-board">
        {rows.map(([label, value, id]) => (
          <div key={id} className="stat-cell">
            <dt>{label}</dt>
            <dd className="num" data-testid={`stat-${id}`}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </Screen>
  );
}
