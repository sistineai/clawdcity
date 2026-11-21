// The frame shared by every non-play screen: a spruce header with back and title.
import type { ReactNode } from 'react';
import { S } from '../../strings';
import { Icon } from './Glyph';
import { go } from '../router';

export function Screen({
  title,
  back = '',
  children,
  className = '',
  lede,
}: {
  title: string;
  back?: string | null;
  children: ReactNode;
  className?: string;
  lede?: string;
}) {
  return (
    <div className={`page ${className}`}>
      <header className="page-bar">
        {back !== null && (
          <button type="button" className="icon-btn on-dark" onClick={() => go(back)} aria-label={S.back}>
            <Icon name="back" />
          </button>
        )}
        <h1 className="title page-title">{title}</h1>
      </header>
      <main className="page-body">
        {lede && <p className="lede">{lede}</p>}
        {children}
      </main>
    </div>
  );
}
