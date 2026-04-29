export const levelConfig = [
  { level: 1, name: '见习侦探', minStars: 0, icon: '🔍', color: 'from-slate-400 to-slate-500' },
  { level: 2, name: '初级侦探', minStars: 20, icon: '⭐', color: 'from-yellow-400 to-orange-400' },
  { level: 3, name: '中级侦探', minStars: 50, icon: '🌟', color: 'from-blue-400 to-purple-400' },
  { level: 4, name: '高级侦探', minStars: 100, icon: '💫', color: 'from-purple-400 to-pink-400' },
  { level: 5, name: '王牌侦探', minStars: 200, icon: '👑', color: 'from-amber-400 to-red-400' },
  { level: 6, name: '传奇侦探', minStars: 400, icon: '🏆', color: 'from-rainbow-400 to-rainbow-600' },
];

export const encouragementMessages = [
  '你发现了重要线索！🔍',
  '太棒了！你像真正的侦探一样会分析题目了！🕵️',
  '了不起！你已经掌握了解题的关键！⭐',
  '真厉害！继续加油，小侦探！💪',
  '你是最棒的小侦探！🌟',
  '这么快就找到答案了，真聪明！🧠',
  '完美破案！又获得一颗星星！⭐',
  '你比昨天更厉害了！继续前进吧！🚀',
];

export const gentleHintMessages = [
  '差一点点就对了，再看看题目哦～💡',
  '没关系，我们再仔细读一遍题目吧！🔍',
  '小侦探，这个线索可能需要再想一想～🤔',
  '别着急，慢慢来，你一定能找到正确答案的！😊',
  '这次不太对哦，但侦探都是从错误中学习的！💪',
  '再试一次吧，你已经很接近了！✨',
];

export function getRandomEncouragement(): string {
  return encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
}

export function getRandomHint(): string {
  return gentleHintMessages[Math.floor(Math.random() * gentleHintMessages.length)];
}
