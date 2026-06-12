// ---------------------------------------------------------------------------
// ActionPanel component — fixed bottom action bar.
// Task 11 — Shows available actions for the human player.
// ---------------------------------------------------------------------------

import type { PlayerAction, ActionType } from '@tj-mahjong/shared';

interface ActionPanelProps {
  canPong: boolean;
  canMingKong: boolean;
  canAnKong: boolean;
  canBuKong: boolean;
  canJinKong: boolean;
  canWin: boolean;
  onAction: (action: PlayerAction) => void;
  loading?: boolean;
}

interface ActionButtonDef {
  type: ActionType;
  label: string;
  available: boolean;
  colorClass: string;
}

export default function ActionPanel({
  canPong,
  canMingKong,
  canAnKong,
  canBuKong,
  canJinKong,
  canWin,
  onAction,
  loading,
}: ActionPanelProps) {
  const buttons: ActionButtonDef[] = [
    { type: 'win', label: '自摸胡！', available: canWin, colorClass: 'bg-red-600 hover:bg-red-500 text-white' },
    { type: 'pong', label: '碰', available: canPong, colorClass: 'bg-blue-600 hover:bg-blue-500 text-white' },
    { type: 'ming-kong', label: '明杠', available: canMingKong, colorClass: 'bg-purple-600 hover:bg-purple-500 text-white' },
    { type: 'an-kong', label: '暗杠', available: canAnKong, colorClass: 'bg-purple-700 hover:bg-purple-600 text-white' },
    { type: 'bu-kong', label: '补杠', available: canBuKong, colorClass: 'bg-purple-700 hover:bg-purple-600 text-white' },
    { type: 'jin-kong', label: '金杠', available: canJinKong, colorClass: 'bg-yellow-600 hover:bg-yellow-500 text-white' },
  ];

  const anyAvailable = buttons.some((b) => b.available);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 border-t border-gray-700 backdrop-blur-sm p-3">
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-3 flex-wrap">
        {buttons
          .filter((b) => b.available)
          .map((b) => (
            <button
              key={b.type}
              type="button"
              disabled={loading}
              onClick={() => onAction({ type: b.type })}
              className={[
                'px-5 py-2.5 rounded-lg text-sm font-bold',
                'transition-all duration-150',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                b.colorClass,
              ].join(' ')}
            >
              {b.label}
            </button>
          ))}

        {/* 过 (Pass) — always visible when there are response options available */}
        {anyAvailable && (
          <button
            type="button"
            disabled={loading}
            onClick={() => onAction({ type: 'discard' as ActionType, tileIndex: -1 })}
            className="px-5 py-2.5 rounded-lg text-sm font-bold bg-gray-600 hover:bg-gray-500 text-white transition-all duration-150 disabled:opacity-50"
          >
            过
          </button>
        )}
      </div>

      {!anyAvailable && (
        <p className="text-center text-xs text-gray-500 mt-1">
          点击手牌中的亮色牌出牌
        </p>
      )}
    </div>
  );
}
