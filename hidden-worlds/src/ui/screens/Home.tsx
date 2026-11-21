import { now } from '../../game/clock';
import { todayKey } from '../../game/dates';
import { S } from '../../strings';
import { go } from '../router';

export function Home() {
  return (
    <main className="screen">
      <h1 className="title">{S.appName}</h1>
      <button
        type="button"
        className="btn gold"
        onClick={() => go(`play/daily/${todayKey(now())}`)}
        data-testid="play-today"
      >
        {S.play}
      </button>
    </main>
  );
}
