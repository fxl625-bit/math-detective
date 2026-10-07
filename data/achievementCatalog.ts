export type AchievementCategory = 'exploration' | 'persistence' | 'recovery' | 'first_try' | 'thinking' | 'breadth';
export type AchievementRarity = 'bronze' | 'silver' | 'gold' | 'legendary';
export type AchievementMetric = 'unique_questions' | 'active_days' | 'corrected_questions' | 'independent_first_try' | 'challenge_questions' | 'distinct_skills';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  currentMetric: AchievementMetric;
  target: number;
  iconKey: string;
}

const rarityByTier: AchievementRarity[] = ['bronze', 'silver', 'gold', 'legendary'];

function family(
  category: AchievementCategory,
  iconKey: string,
  label: string,
  metric: AchievementMetric,
  targets: readonly [number, number, number, number],
): AchievementDefinition[] {
  const metricLabel: Record<AchievementMetric, string> = {
    unique_questions: '道不同题', active_days: '个学习日', corrected_questions: '道订正成功的错题',
    independent_first_try: '道独立首答题', challenge_questions: '道思维挑战题', distinct_skills: '种不同技能',
  };
  return targets.map((target, index) => {
    const tierName = ['初探', '进阶', '资深', '传奇'][index];
    return {
      id: `${category}_${rarityByTier[index]}`,
      name: `${label}·${tierName}`,
      description: [
        `${label}达到${target}${metricLabel[metric]}，获得铜章。`,
        `${label}达到${target}${metricLabel[metric]}，获得银章。`,
        `${label}达到${target}${metricLabel[metric]}，获得金章。`,
        `${label}达到${target}${metricLabel[metric]}，获得传奇章。`,
      ][index],
      category,
      rarity: rarityByTier[index],
      currentMetric: metric,
      target,
      iconKey,
    };
  });
}

/** Six evidence-backed families with four stable rarity tiers each. */
export const achievementCatalog: AchievementDefinition[] = [
  ...family('exploration', 'magnifier', '线索探索', 'unique_questions', [1, 5, 15, 40]),
  ...family('persistence', 'footprints', '坚持练习', 'active_days', [1, 3, 7, 21]),
  ...family('recovery', 'turn-back', '错题重破', 'corrected_questions', [1, 3, 8, 20]),
  ...family('first_try', 'spark', '独立首答', 'independent_first_try', [1, 5, 15, 30]),
  ...family('thinking', 'brain', '思维挑战', 'challenge_questions', [1, 3, 8, 20]),
  ...family('breadth', 'map', '知识地图', 'distinct_skills', [2, 4, 8, 16]),
];

export const achievementById = Object.fromEntries(achievementCatalog.map((item) => [item.id, item])) as Record<string, AchievementDefinition>;
