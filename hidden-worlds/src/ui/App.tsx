import { lazy, Suspense } from 'react';
import { S } from '../strings';
import { useRoute } from './router';

const Dev = lazy(() => import('./screens/Dev').then((m) => ({ default: m.Dev })));

export function App() {
  const route = useRoute();
  if (route.parts[0] === 'dev')
    return (
      <Suspense fallback={<p>{S.loading}</p>}>
        <Dev />
      </Suspense>
    );
  return (
    <main className="screen">
      <h1 className="title">{S.appName}</h1>
    </main>
  );
}
