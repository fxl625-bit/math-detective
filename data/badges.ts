import { Badge } from '@/lib/types';

export const badges: Badge[] = [
  {
    id: 'streak_3',
    name: '坚持不懈',
    description: '连续打卡3天',
    icon: '🔥',
    condition: '连续打卡3天',
  },
  {
    id: 'streak_7',
    name: '侦探之星',
    description: '连续打卡7天',
    icon: '⭐',
    condition: '连续打卡7天',
  },
  {
    id: 'streak_14',
    name: '恒心侦探',
    description: '连续打卡14天',
    icon: '💎',
    condition: '连续打卡14天',
  },
  {
    id: 'completed_10',
    name: '初出茅庐',
    description: '累计完成10道题',
    icon: '🌱',
    condition: '累计完成10道题',
  },
  {
    id: 'completed_50',
    name: '小有所成',
    description: '累计完成50道题',
    icon: '📚',
    condition: '累计完成50道题',
  },
  {
    id: 'completed_100',
    name: '数学达人',
    description: '累计完成100道题',
    icon: '🏅',
    condition: '累计完成100道题',
  },
  {
    id: 'level_3',
    name: '中级侦探',
    description: '升至中级侦探等级',
    icon: '🌟',
    condition: '达到等级3',
  },
  {
    id: 'level_5',
    name: '王牌侦探',
    description: '升至王牌侦探等级',
    icon: '👑',
    condition: '达到等级5',
  },
  {
    id: 'perfect_10',
    name: '完美十连',
    description: '连续10题全对',
    icon: '💯',
    condition: '连续10题正确',
  },
  {
    id: 'accuracy_high',
    name: '精准侦探',
    description: '累计30题正确，错误不超过2题',
    icon: '🎯',
    condition: '高正确率侦探',
  },
];

export function getBadgeById(id: string): Badge | undefined {
  return badges.find((b) => b.id === id);
}
