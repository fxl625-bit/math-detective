import { GameState } from './types';
import { allDecorations, DecorationItem } from '@/data/decorations';

export function toggleDecoration(state: GameState, decorationId: string): GameState {
  const current = new Set(state.decorations || []);
  const decoration = allDecorations.find(d => d.id === decorationId);
  if (!decoration) return state;

  if (current.has(decorationId)) {
    current.delete(decorationId);
  } else {
    current.add(decorationId);
  }

  return { ...state, decorations: Array.from(current) };
}

export function checkNewDecorations(state: GameState): DecorationItem[] {
  const equipped = new Set(state.decorations || []);
  return allDecorations.filter(d => d.unlockCheck(state) && !equipped.has(d.id));
}

export function getVisibleDecorations(state: GameState): {
  hat: DecorationItem[];
  accessory: DecorationItem[];
  outfit: DecorationItem[];
  tool: DecorationItem[];
} {
  const equippedIds = new Set(state.decorations || []);
  const equipped = allDecorations.filter(d => equippedIds.has(d.id));

  return {
    hat: equipped.filter(d => d.category === 'hat'),
    accessory: equipped.filter(d => d.category === 'accessory'),
    outfit: equipped.filter(d => d.category === 'outfit'),
    tool: equipped.filter(d => d.category === 'tool'),
  };
}
