'use client';

import { useId } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { AvatarArtKey, AvatarItem, FoxThemeId } from '@/data/avatarItems';

const palettes: Record<FoxThemeId, { sky: string; deep: string; glow: string; fabric: string; trim: string; accent: string }> = {
  classic: { sky: '#fff4d8', deep: '#26365d', glow: '#f6c760', fabric: '#33446f', trim: '#e4bd68', accent: '#e7893f' },
  space: { sky: '#182348', deep: '#10182f', glow: '#9477ff', fabric: '#435b9d', trim: '#b9e7ff', accent: '#6fd9ef' },
  ocean: { sky: '#d9f5f3', deep: '#18405c', glow: '#7bded1', fabric: '#267b87', trim: '#d3fbf2', accent: '#e8af5b' },
  forest: { sky: '#e7f0d8', deep: '#294838', glow: '#b4d67a', fabric: '#52724c', trim: '#ead7a0', accent: '#8fae5f' },
  workshop: { sky: '#f7e9d7', deep: '#4c3541', glow: '#f2ae65', fabric: '#685167', trim: '#f3cc7d', accent: '#d77851' },
  aurora: { sky: '#dceafa', deep: '#233b67', glow: '#8dd9dc', fabric: '#52618f', trim: '#e0ddff', accent: '#73c6bd' },
};

function ItemLayer({ item, color, trim }: { item: AvatarItem; color: string; trim: string }) {
  const key: AvatarArtKey | undefined = item.artKey;
  if (!key) return null;
  if (key === 'background') return null;
  if (key === 'coat') return <g aria-label={item.name}>
    <path d="M76 151 Q91 132 111 132 L131 132 Q153 135 168 154 L177 228 Q158 247 121 247 Q82 247 63 228 Z" fill={color} stroke={trim} strokeWidth="4" />
    <path d="M103 139 L120 164 L137 139 L129 205 L120 213 L110 205 Z" fill="#fff4d8" stroke={trim} strokeWidth="2" />
    <path d="M88 174 L105 185 M151 174 L135 185" stroke={trim} strokeWidth="3" strokeLinecap="round" />
    <circle cx="120" cy="221" r="3" fill={trim} /><circle cx="120" cy="232" r="3" fill={trim} />
  </g>;
  if (key === 'hat') return <g aria-label={item.name}>
    <path d="M76 60 Q81 30 120 29 Q159 31 164 60 L170 70 Q120 77 70 70 Z" fill={color} stroke={trim} strokeWidth="4" />
    <path d="M72 69 Q119 61 168 69 Q159 82 120 82 Q83 82 72 69Z" fill={trim} stroke={color} strokeWidth="3" />
    {item.themeId === 'space' && <path d="M120 34 L124 45 L136 46 L127 53 L130 65 L120 58 L110 65 L113 53 L104 46 L116 45 Z" fill="#fff1a5" />}
    {item.themeId === 'forest' && <path d="M120 34 Q110 43 120 56 Q130 43 120 34 M120 47 L120 61" fill="#d6e9a1" stroke="#d6e9a1" strokeWidth="2" />}
  </g>;
  if (key === 'tool') return <g aria-label={item.name}>
    <path d="M165 176 Q181 184 185 202 L176 209 Q170 193 158 190Z" fill={color} stroke={trim} strokeWidth="3" />
    <circle cx="183" cy="167" r="17" fill="#d8f2f3" fillOpacity=".8" stroke={trim} strokeWidth="5" />
    <path d="M194 180 L207 195" stroke={trim} strokeWidth="6" strokeLinecap="round" />
    <path d="M176 167 Q183 158 190 167" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
  </g>;
  if (key === 'badge') return <g aria-label={item.name}>
    <path d="M151 178 L165 184 L163 201 Q157 209 151 212 Q145 209 139 201 L137 184 Z" fill={color} stroke={trim} strokeWidth="3" />
    <path d="M151 184 L154 192 L162 193 L156 198 L158 205 L151 201 L144 205 L146 198 L140 193 L148 192 Z" fill={trim} />
  </g>;
  if (key === 'pet') return <g aria-label={item.name} transform="translate(184 205)">
    <path d="M-15 9 Q-20 -5 -11 -12 L-6 -22 L1 -14 L9 -19 L13 -8 Q23 0 16 12 Q2 22 -15 9Z" fill={color} stroke={trim} strokeWidth="3" />
    <circle cx="-5" cy="-4" r="2" fill="#263044" /><circle cx="8" cy="-4" r="2" fill="#263044" />
    <path d="M-2 4 Q2 7 6 4" fill="none" stroke="#263044" strokeWidth="2" strokeLinecap="round" />
    <path d="M-8 10 Q2 7 12 11" fill="none" stroke={trim} strokeWidth="3" />
  </g>;
  if (key === 'aura') return <g aria-label={item.name} fill="none" stroke={trim} strokeWidth="3" strokeLinecap="round">
    <path d="M62 119 Q45 78 70 57 M178 119 Q195 78 170 57" />
    <path d="M51 91 L42 88 M189 91 L198 88 M63 63 L57 55 M177 63 L183 55" />
    <circle cx="48" cy="113" r="4" fill={trim} stroke="none" /><circle cx="192" cy="113" r="4" fill={trim} stroke="none" />
  </g>;
  if (key === 'glasses') return <g aria-label={item.name} fill="none" stroke={trim} strokeWidth="3">
    <path d="M85 91 Q85 81 98 82 Q110 83 110 94 Q109 106 98 106 Q86 105 85 91Z M130 94 Q130 83 143 82 Q156 81 156 91 Q155 105 143 106 Q131 106 130 94Z M110 92 Q120 88 130 92 M84 89 L76 86 M157 89 L165 86" />
  </g>;
  if (key === 'scarf') return <g aria-label={item.name}>
    <path d="M89 133 Q120 148 152 132 L159 145 Q143 163 119 158 Q99 156 82 146Z" fill={color} stroke={trim} strokeWidth="3" />
    <path d="M143 151 L155 152 L151 181 L138 178Z" fill={color} stroke={trim} strokeWidth="3" />
  </g>;
  return null;
}

export default function FoxIllustration({
  themeId = 'classic',
  items = [],
  mood = 'happy',
  size = 240,
  decorative = false,
}: {
  themeId?: FoxThemeId;
  items?: readonly AvatarItem[];
  mood?: 'happy' | 'thinking' | 'encourage' | 'excited';
  size?: number;
  decorative?: boolean;
}) {
  const generatedId = useId();
  const id = generatedId.replace(/:/g, '');
  const reducedMotion = Boolean(useReducedMotion());
  const colors = palettes[themeId];
  const themeParts = items.filter((item) => item.artKey && item.artKey !== 'background');
  const sceneItem = [...items].reverse().find((item) => item.artKey === 'background');
  return <motion.svg
    viewBox="0 0 240 280"
    width={size}
    height={size * 280 / 240}
    role={decorative ? undefined : 'img'}
    aria-label={decorative ? undefined : `原创小狐侦探，${themeId}造型`}
    aria-hidden={decorative || undefined}
    xmlns="http://www.w3.org/2000/svg"
    className="max-w-full"
    initial={false}
    animate={reducedMotion ? undefined : { y: [0, -2, 0] }}
    transition={reducedMotion ? undefined : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
  >
    <defs>
      <linearGradient id={`${id}-fur`} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#ffbf64" /><stop offset=".62" stopColor="#e9823d" /><stop offset="1" stopColor="#c75d37" /></linearGradient>
      <linearGradient id={`${id}-coat`} x1="0" x2="1" y1="0" y2="1"><stop stopColor={colors.fabric} /><stop offset="1" stopColor={colors.deep} /></linearGradient>
      <linearGradient id={`${id}-medal`} x1="0" x2="0" y1="0" y2="1"><stop stopColor="#fff0a5" /><stop offset=".46" stopColor={colors.trim} /><stop offset="1" stopColor="#a56a35" /></linearGradient>
      <radialGradient id={`${id}-scene`}><stop stopColor={colors.glow} stopOpacity=".56" /><stop offset="1" stopColor={colors.sky} stopOpacity="0" /></radialGradient>
    </defs>
    {sceneItem ? <rect x="3" y="3" width="234" height="274" rx="35" fill={colors.sky} stroke={colors.trim} strokeWidth="3" /> : <ellipse cx="120" cy="154" rx="111" ry="120" fill={`url(#${id}-scene)`} />}
    {themeId === 'classic' && <g fill={colors.deep} opacity=".12"><path d="M0 206 H31 V167 H53 V190 H77 V151 H99 V195 H124 V176 H150 V194 H174 V157 H198 V188 H221 V172 H240 V245 H0Z" /><path d="M34 176 H46 M81 162 H92 M178 169 H190" stroke="#fff" strokeWidth="2" /></g>}
    {themeId === 'space' && <g><circle cx="190" cy="86" r="27" fill={colors.glow} fillOpacity=".35" stroke={colors.trim} strokeWidth="2" /><ellipse cx="190" cy="86" rx="38" ry="10" fill="none" stroke={colors.trim} strokeWidth="2" opacity=".75" /><g fill="#fff7cd"><circle cx="36" cy="63" r="2" /><circle cx="198" cy="56" r="2.5" /><circle cx="199" cy="117" r="1.7" /><path d="M41 133 L44 141 L52 144 L44 147 L41 155 L38 147 L30 144 L38 141Z" /></g></g>}
    {themeId === 'ocean' && <g><path d="M0 206 Q30 188 60 205 T120 205 T180 205 T240 205 V260 H0Z" fill={colors.glow} fillOpacity=".22" /><path d="M0 222 Q35 203 70 222 T140 222 T210 222 T280 222 V270 H0Z" fill={colors.accent} fillOpacity=".17" /><g fill="none" stroke={colors.accent} strokeWidth="4" opacity=".75"><path d="M15 222 Q36 208 56 222 T97 222" /><path d="M143 226 Q165 212 186 226 T226 226" /></g></g>}
    {themeId === 'forest' && <g><path d="M0 211 Q50 175 104 207 T212 202 T280 209 V265 H0Z" fill={colors.accent} fillOpacity=".18" /><g fill={colors.accent} opacity=".75"><path d="M7 219 L23 183 L39 219Z M28 222 L46 177 L64 222Z M180 223 L198 177 L216 223Z M204 224 L222 185 L239 224Z" /></g></g>}
    {themeId === 'workshop' && <g fill="none" stroke={colors.accent} strokeWidth="3" opacity=".6"><circle cx="35" cy="67" r="14" /><circle cx="35" cy="67" r="5" /><path d="M193 59 L213 59 M203 49 L203 69" /><path d="M13 224 H54 V189 H76 V224 M190 223 V183 H224 V223" /></g>}
    {themeId === 'aurora' && <g><path d="M8 87 Q48 31 97 66 T232 60" fill="none" stroke={colors.glow} strokeWidth="20" strokeOpacity=".3" /><path d="M0 123 Q48 72 103 111 T240 103" fill="none" stroke="#83b9eb" strokeWidth="11" strokeOpacity=".24" /><path d="M0 221 Q61 197 120 216 T240 213 V270 H0Z" fill={colors.deep} fillOpacity=".1" /></g>}
    <ellipse cx="120" cy="253" rx="75" ry="11" fill={colors.deep} fillOpacity=".1" />

    <AnimatePresence initial={false}>
      {themeParts.filter((item) => item.artKey === 'aura').map((item) => <motion.g
        key={item.id}
        initial={reducedMotion ? false : { opacity: 0, scale: .92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reducedMotion ? undefined : { opacity: 0, scale: .96 }}
        transition={reducedMotion ? undefined : { duration: .24, ease: 'easeOut' }}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      ><ItemLayer item={item} color={colors.accent} trim={colors.trim} /></motion.g>)}
    </AnimatePresence>
    {/* Tail, feet and the detective coat silhouette are all fitted to this fox body. */}
    <path d="M77 172 Q47 150 31 174 Q17 194 40 212 Q54 224 70 211 Q48 210 45 195 Q43 181 60 184 L82 194Z" fill={`url(#${id}-fur)`} stroke="#ae5634" strokeWidth="3" />
    <path d="M42 202 Q51 210 63 207 Q55 217 43 213Z" fill="#fff0d8" />
    <path d="M83 224 Q77 252 94 258 Q106 261 111 250 L109 222Z M132 222 L129 249 Q137 263 152 257 Q164 252 155 224Z" fill="#c76838" stroke="#a84e32" strokeWidth="3" />
    <path d="M81 253 Q94 246 109 253 L109 260 Q95 266 81 259Z M130 253 Q146 246 159 253 L160 260 Q144 266 130 259Z" fill={colors.deep} />
    <path d="M76 147 Q90 128 108 127 L132 127 Q153 131 166 151 L174 226 Q153 241 121 241 Q89 241 66 226Z" fill={`url(#${id}-coat)`} stroke={colors.deep} strokeWidth="4" />
    <path d="M101 137 L120 159 L139 137 L130 205 L120 214 L110 205Z" fill="#fff0d8" stroke={colors.trim} strokeWidth="2.5" />
    <path d="M80 164 Q92 171 104 180 M160 164 Q148 171 136 180" fill="none" stroke={colors.trim} strokeWidth="3" strokeLinecap="round" />
    <path d="M107 148 L120 165 L133 148" fill="none" stroke={colors.trim} strokeWidth="3" />
    <circle cx="120" cy="222" r="3" fill={colors.trim} />

    <g>
      <path d="M69 69 L54 19 Q76 25 92 52 Q119 39 148 52 Q163 24 186 19 L170 79 Q177 110 162 132 Q146 153 120 153 Q92 153 76 132 Q61 111 69 69Z" fill={`url(#${id}-fur)`} stroke="#a94f31" strokeWidth="4" strokeLinejoin="round" />
      <path d="M64 31 L82 53 L72 73Z M177 31 L158 54 L168 73Z" fill="#f8d1ad" />
      <path d="M82 108 Q93 96 107 107 Q99 122 89 121Z M133 107 Q147 96 158 108 Q151 122 140 121Z" fill="#fff0d8" />
      <motion.ellipse cx="99" cy="91" rx="4.2" ry="6.3" fill="#362b34" animate={reducedMotion ? undefined : { scaleY: [1, 1, 0.12, 1, 1] }} transition={reducedMotion ? undefined : { duration: 4.8, repeat: Infinity, times: [0, .94, .96, .98, 1] }} />
      <motion.ellipse cx="141" cy="91" rx="4.2" ry="6.3" fill="#362b34" animate={reducedMotion ? undefined : { scaleY: [1, 1, 0.12, 1, 1] }} transition={reducedMotion ? undefined : { duration: 4.8, repeat: Infinity, times: [0, .94, .96, .98, 1] }} />
      <path d="M114 115 Q120 108 126 115 Q123 122 120 122 Q117 122 114 115Z" fill="#613448" />
      <path d={mood === 'encourage' ? 'M111 128 Q120 121 129 128' : 'M111 126 Q120 134 129 126'} fill="none" stroke="#773e38" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M74 82 Q91 70 106 81 M134 81 Q149 70 166 82" fill="none" stroke="#a94f31" strokeWidth="3" strokeLinecap="round" />
    </g>
    {/* Classic baseline detective cap and neckerchief create a complete default outfit. */}
    {themeId === 'classic' && !themeParts.some((item) => item.artKey === 'hat') && <g>
      <path d="M78 59 Q84 36 120 35 Q156 37 162 59 L168 68 Q120 75 72 68Z" fill={colors.deep} stroke={colors.trim} strokeWidth="4" />
      <path d="M74 68 Q120 61 166 68 Q158 79 120 79 Q84 79 74 68Z" fill={colors.trim} />
      <path d="M88 145 Q120 158 153 144 L159 157 Q139 172 119 166 Q100 164 82 157Z" fill={colors.trim} stroke={colors.deep} strokeWidth="3" />
    </g>}

    <AnimatePresence initial={false}>
      {themeParts.filter((item) => ['coat', 'scarf', 'glasses', 'hat', 'badge', 'tool', 'pet'].includes(item.artKey || '')).map((item) => (
        <motion.g
          key={item.id}
          initial={reducedMotion ? false : { opacity: 0, scale: .94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0, scale: .97 }}
          transition={reducedMotion ? undefined : { duration: .24, ease: 'easeOut' }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        ><ItemLayer item={item} color={colors.fabric} trim={item.artKey === 'badge' ? `url(#${id}-medal)` : colors.trim} /></motion.g>
      ))}
    </AnimatePresence>
    {(mood === 'excited' || mood === 'happy') && !reducedMotion && <motion.g
      initial={{ rotate: 0 }} animate={{ rotate: [0, -8, 9, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 3.5 }}
      style={{ transformOrigin: '167px 182px' }}
    >
      <path d="M158 182 Q174 174 180 189 L177 198 Q169 189 159 193Z" fill="#e9823d" stroke="#a94f31" strokeWidth="3" />
    </motion.g>}
  </motion.svg>;
}
