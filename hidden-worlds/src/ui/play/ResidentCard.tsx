// PLAY-10: a field-guide entry for the resident just found.
import { indexPack } from '../../engine/logic';
import { useApp } from '../../state/store';
import { S } from '../../strings';
import { Dialog } from '../components/Dialog';
import { SpriteIcon } from '../components/Icon';

export function ResidentCard({
  residentId,
  isNew,
  onClose,
}: {
  residentId: string;
  isNew: boolean;
  onClose: () => void;
}) {
  const pack = useApp((s) => s.pack);
  const def = pack ? indexPack(pack.logic).byId.get(residentId) : undefined;
  const rarity = def?.rarity ?? 'common';
  return (
    <Dialog labelId="res-title" onClose={onClose} className="resident-card">
      <p className="eyebrow">{isNew ? S.newToCollection : S.alreadyMet}</p>
      <div className="specimen">
        <SpriteIcon spriteId={residentId} color={null} size={120} />
      </div>
      <h2 id="res-title" className="title">
        {S.residentFound(def?.name ?? residentId)}
      </h2>
      <p className={`rarity rarity-${rarity}`}>{S.rarity[rarity]}</p>
      <p className="entry">{def?.description}</p>
      <button type="button" className="btn solid wide" onClick={onClose} data-testid="resident-continue">
        {S.continue}
      </button>
    </Dialog>
  );
}
