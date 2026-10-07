'use client';

import { useMemo } from 'react';
import type { GameState } from '@/lib/types';
import { getAvatarItemById, type FoxThemeId } from '@/data/avatarItems';
import DetectiveMascot from '@/components/DetectiveMascot';

const themeNames: Record<FoxThemeId, string> = {
  classic: '经典侦探', space: '星际', ocean: '海洋', forest: '森林', workshop: '工坊', aurora: '极光',
};

export default function DetectiveStage({
  state,
  size = 'large',
  theme,
}: {
  state: Readonly<GameState>;
  size?: 'compact' | 'large';
  theme?: FoxThemeId;
}) {
  const decorations = useMemo(() => (state.decorations || [])
    .map((id) => getAvatarItemById(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item)), [state.decorations]);
  const equippedScene = [...decorations].reverse().find((item) => item.slot === 'background' && item.themeId);
  const equippedTheme = [...decorations].reverse().find((item) => item.themeId);
  const selectedTheme = theme || equippedScene?.themeId || equippedTheme?.themeId || 'classic';
  const large = size === 'large';
  return <section
    aria-label="小狐侦探成就舞台"
    className={`relative isolate flex min-w-0 items-end justify-center overflow-hidden rounded-[2rem] border border-indigo-200/25 bg-[#111a35] ${large ? 'min-h-[320px] px-5 pt-7' : 'min-h-[230px] px-3 pt-5'}`}
  >
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(244,190,99,.3),transparent_62%)]" />
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1/2 opacity-60">
      <span className="absolute left-[12%] top-[23%] h-1 w-1 rounded-full bg-amber-100" />
      <span className="absolute left-[29%] top-[12%] h-1.5 w-1.5 rounded-full bg-cyan-100" />
      <span className="absolute right-[19%] top-[20%] h-1 w-1 rounded-full bg-amber-100" />
      <span className="absolute right-[36%] top-[9%] h-1 w-1 rounded-full bg-indigo-100" />
      <span className="absolute left-[72%] top-[37%] h-1 w-1 rounded-full bg-cyan-100" />
    </div>
    <div className="relative z-10 flex w-full max-w-md items-end justify-center">
      <div className={`${large ? 'scale-[1.8] translate-y-[-18px]' : 'scale-[1.25] translate-y-[-10px]'} origin-bottom transition-transform duration-300 motion-reduce:transition-none`}>
        <DetectiveMascot mood="happy" size="lg" showMessage={false} decorations={decorations} themeId={selectedTheme} />
      </div>
    </div>
    <div className="absolute bottom-0 left-1/2 h-5 w-3/4 -translate-x-1/2 rounded-full bg-black/25 blur-md" aria-hidden="true" />
    <p className="absolute left-3 top-3 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-50">{themeNames[selectedTheme]} · 侦探档案</p>
  </section>;
}
