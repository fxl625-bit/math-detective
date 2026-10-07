import type { Question } from '@/lib/types';
import type { QuestionLearningMetadata } from './helpers';
import { inferTargetSkill, makeProgressionQuestion, metadataFor } from './helpers';
import { g1LowerLateQuestions } from '@/data/questions/g1-lower-late';
import { g2Questions } from '@/data/questions/g2';
import { g2OlympiadQuestions } from '@/data/questions/g2-olympiad';

const g2TimeAndMeasurement: Question[] = [
  makeProgressionQuestion({
    id: 'prog_g2_u4_01', gradeBand: 'G2', unitId: 'g2-u4', skillKey: 'g2-u4:elapsed-time', domain: 'time',
    text: '小明早上7:30出发，走到学校用了15分钟。他到学校时是几时几分？', answer: '7:45', answerType: 'text',
    answerSentence: '他7:45到学校。', answerSchema: { kind: 'text', acceptedAnswers: ['7:45', '7时45分'] }, operation: 'addition',
    equation: '7:30+15分钟=7:45', explanation: '7:30到7:40经过10分钟，还剩5分钟；7:40再过5分钟是7:45。',
    solutionSteps: ['从7:30先经过10分钟到7:40。', '15-10=5分钟还没走完。', '7:40再过5分钟是7:45。'],
    hints: ['先走到下一个整十分钟。', '7:30到7:40经过10分钟，还剩5分钟。', '7:40再过5分钟，答案7:45。'],
    numbers: [7, 30, 15], unit: '时分', difficulty: 2, role: 'application', family: 'g2-elapsed-time', tier: 1, method: 'representation',
  }),
  makeProgressionQuestion({
    id: 'prog_g2_u4_02', gradeBand: 'G2', unitId: 'g2-u4', skillKey: 'g2-u4:length-units', domain: 'measurement',
    text: '一根2米长的绳子剪去75厘米，还剩多少厘米？', answer: 125,
    answerSentence: '还剩125厘米。', answerSchema: { kind: 'integer', min: 0, max: 200 }, operation: 'subtraction', equation: '2米=200厘米；200-75=125（厘米）',
    explanation: '先统一单位：2米等于200厘米。剪去75厘米后，200-75=125厘米。',
    solutionSteps: ['把2米换成200厘米。', '用200厘米减去剪去的75厘米。', '200-75=125厘米。'],
    hints: ['先把米换成厘米，1米是100厘米。', '2米就是200厘米。', '200-75=125厘米。'],
    numbers: [2, 75, 100], unit: '厘米', difficulty: 4, role: 'advanced', family: 'g2-unit-conversion-subtraction', tier: 1, method: 'equivalence',
  }),
  makeProgressionQuestion({
    id: 'prog_g2_u4_03', gradeBand: 'G2', unitId: 'g2-u4', skillKey: 'g2-u4:length-units', domain: 'measurement',
    text: '小明身高1米20厘米。小红比小明矮5厘米，小刚又比小红矮8厘米。小明比小刚高多少厘米？', answer: 13,
    answerSentence: '小明比小刚高13厘米。', answerSchema: { kind: 'integer', min: 0, max: 30 }, operation: 'subtraction', equation: '5+8=13（厘米）',
    explanation: '小红比小明矮5厘米，小刚比小红还矮8厘米，因此小明比小刚一共高5+8=13厘米。虽然身高有1米部分，但两个身高相减时共同的1米20厘米基准抵消，只需相加两段差。',
    solutionSteps: ['小红比小明矮5厘米。', '小刚比小红再矮8厘米。', '小明比小刚高5+8=13厘米。'],
    hints: ['把两段“矮”的距离连起来看。', '小红比小明矮5厘米，小刚比小红再矮8厘米。', '两段合起来是5+8=13厘米。'],
    numbers: [5, 8], unit: '厘米', difficulty: 4, role: 'advanced', family: 'g2-height-difference-chain', tier: 2, method: 'representation',
  }),
];

const divisionSpecs = [
  {
    id: 'prog_g2_u2_01', text: '18张贴纸平均分给3个小朋友，每人分到几张？', answer: 6, answerSchema: { kind: 'integer' as const, min: 0, max: 18 }, equation: '18÷3=6（张）',
    explanation: '把贴纸一张张轮流发给3人。每人发1张共用3张，连续发6轮共用18张，所以每人6张。', steps: ['每人先发1张，共发出3张。', '继续轮流发，数每个人收到的张数；6轮共用18张。', '18张正好发完，每人6张。'], hints: ['把贴纸一张一张轮流分给三人。', '每发完一轮，每人各得到1张，一共用3张。', '18张正好够发6轮，所以每人6张。'], numbers: [18, 3], role: 'foundation' as const,
    operation: 'division' as const, family: 'g2-share-equal', method: 'representation' as const, tier: 1 as const, difficulty: 2 as const,
  },
  {
    id: 'prog_g2_u2_02', text: '有30颗弹珠，每5颗装一袋，可以装几袋？', answer: 6, answerSchema: { kind: 'integer' as const, min: 0, max: 30 }, equation: '30÷5=6（袋）',
    explanation: '每袋5颗，求30颗里有几个5，用除法30÷5=6。验算6×5=30。', steps: ['找出每袋的数量是5颗。', '求30里面有几个5：30÷5=6。', '可以装6袋。'], hints: ['这里问的是“有几袋”，不是每袋几颗。', '连续分出每袋5颗，看看能分几次。', '30÷5=6袋。'], numbers: [30, 5], role: 'application' as const,
    operation: 'division' as const, family: 'g2-measure-groups', method: 'inverse' as const, tier: 1 as const, difficulty: 3 as const,
  },
  {
    id: 'prog_g2_u2_03', text: '29块饼干平均分给3个孩子，每人分9块后还剩几块？', answer: 2,
    answerSchema: { kind: 'integer' as const, min: 0, max: 2 }, equation: '29-9-9-9=2（块）',
    explanation: '每人9块时，3个人一共拿走9+9+9=27块；29-27=2块，所以还剩2块。由于2少于3，不能再给每个孩子各1块。', steps: ['3个人每人9块：9+9+9=27块。', '总数29减去已分出的27，剩2块。', '2少于3，不能再每人分1块。'], hints: ['先算3个孩子一共分走多少块。', '把3个9相加，得到27块。', '29-27=2块。'], numbers: [29, 3], role: 'advanced' as const,
    operation: 'division' as const, family: 'g2-remainder', method: 'inverse' as const, tier: 1 as const, difficulty: 4 as const,
  },
  {
    id: 'prog_g2_u2_04', text: '一个数比12大、比18小。它平均分成3份没有剩余，平均分成5份也没有剩余。这个数是多少？', answer: 15,
    answerSchema: { kind: 'integer' as const, min: 13, max: 17 }, equation: '13到17之间的3倍数：15；5倍数：15；交集15',
    explanation: '13到17之间，能平均分成3份的数只有15；能平均分成5份的也只有15。交集是15。检验15=5+5+5，也等于3+3+3+3+3。', steps: ['列出13到17之间的3的倍数：15。', '列出13到17之间的5的倍数：15。', '两列交集只有15。'], hints: ['先列出13到17之间能平均分成3份的数。', '再列出同一范围内能平均分成5份的数。', '共同的数是15；可用3+3+3+3+3核对。'], numbers: [12, 18, 3, 5], role: 'olympiad' as const,
    operation: 'division' as const, family: 'g2-common-multiple', method: 'enumeration' as const, tier: 1 as const, difficulty: 4 as const,
  },
  {
    id: 'prog_g2_u2_05', text: '一筐苹果在20个到30个之间。每5个装一袋会剩1个；两两分组时没有剩余。这筐苹果有多少个？', answer: 26,
    answerSchema: { kind: 'integer' as const, min: 20, max: 30 }, equation: '候选数21、26；其中偶数是26',
    explanation: '20到30之间除以5余1的数只有21和26。两两分组没有剩余表示总数是偶数；21是奇数，26是偶数，因此这筐有26个。检验26=5+5+5+5+5+1。',
    steps: ['列出20到30之间除以5余1的候选数：21、26。', '两两分组没有剩余，说明总数必须是偶数。', '21是奇数，26是偶数，所以答案是26。'], hints: ['先用“每5个装袋剩1个”找候选数。', '再用“两两分组无剩余”筛掉奇数。', '候选21、26中只有26是偶数。'], numbers: [20, 30, 5, 1, 2], role: 'olympiad' as const,
    operation: 'division' as const, family: 'g2-remainder-and-parity', method: 'classification' as const, tier: 2 as const, difficulty: 5 as const,
  },
  {
    id: 'prog_g2_u2_06', text: '15支彩笔平均放进5个笔筒，每个笔筒放几支？', answer: 3,
    answerSchema: { kind: 'integer' as const, min: 0, max: 15 }, equation: '15÷5=3（支）',
    explanation: '按一轮一支的方式，分别放入5个笔筒。放1轮用了5支，放2轮用了10支，放3轮刚好用完15支，所以每个笔筒3支。', steps: ['每个笔筒先放1支，一共用5支。', '再各放1支，累计10支；第三轮累计15支。', '每个笔筒放了3轮，也就是3支。'], hints: ['一轮给每个笔筒放1支，5个笔筒共用5支。', '继续轮流放，记录已用总数。', '15支正好放3轮，所以每个笔筒3支。'], numbers: [15, 5], role: 'foundation' as const,
    operation: 'division' as const, family: 'g2-share-five', method: 'representation' as const, tier: 1 as const, difficulty: 2 as const,
  },
  {
    id: 'prog_g2_u2_07', text: '有23张卡片，每3张装一袋。最多能装满几袋？', answer: 7,
    answerSchema: { kind: 'integer' as const, min: 0, max: 8 }, equation: '3×7=21，23-21=2',
    explanation: '每袋3张，7袋需要3+3+3+3+3+3+3=21张；还剩2张，不够再装满一袋，所以最多7袋。', steps: ['算7袋需要多少张：3重复7次是21张。', '23-21=2张剩余。', '剩2张少于一袋的3张，因此最多7袋。'], hints: ['每袋装3张，先试能装几组3。', '7袋要21张，8袋要24张，超过23张。', '最多装满7袋，还剩2张。'], numbers: [23, 3], role: 'application' as const,
    operation: 'division' as const, family: 'g2-full-groups', method: 'inverse' as const, tier: 1 as const, difficulty: 3 as const,
  },
  {
    id: 'prog_g2_u2_08', text: '23张卡片要平均分给3个小朋友。最少再添几张，才能一张不剩地分完？', answer: 1,
    answerSchema: { kind: 'integer' as const, min: 0, max: 2 }, equation: '23+1=24；24=8+8+8',
    explanation: '23张先给每人7张，使用7+7+7=21，剩2张。再添1张后剩3张，正好能每人再给1张，合计每人8张。',
    steps: ['每人先发7张，7+7+7=21张，还剩2张。', '添1张后剩3张，可以再平均给3人。', '每人共8张且无剩余，添1张最少。'], hints: ['先试着给每人相同数量，找出剩余。', '给每人7张共21张，还剩2张。', '添1张后再给每人1张，正好分完。'], numbers: [23, 3, 1], role: 'advanced' as const,
    operation: 'addition' as const, family: 'g2-complete-equal-share', method: 'inverse' as const, tier: 2 as const, difficulty: 4 as const,
  },
  {
    id: 'prog_g2_u2_09', text: '20支彩笔平均放进5个笔筒。每轮给每个笔筒放1支，放完20支后每个笔筒有几支？', answer: 4,
    answerSchema: { kind: 'integer' as const, min: 0, max: 20 }, equation: '5+5+5+5=20；共4轮',
    explanation: '每轮给5个笔筒各放1支，共用5支。连续4轮用完20支，因此每个笔筒有4支。',
    steps: ['每轮用5支，分别放入5个笔筒。', '4轮共5+5+5+5=20支。', '每个笔筒每轮得1支，4轮后有4支。'],
    hints: ['一轮给每个笔筒放1支。', '每轮要用5支；累计数到20。', '5+5+5+5=20，所以一共4轮，每筒4支。'], numbers: [20, 5], role: 'foundation' as const,
    operation: 'division' as const, family: 'g2-round-robin-share', method: 'representation' as const, tier: 1 as const, difficulty: 2 as const,
  },
].map((spec) => makeProgressionQuestion({
  ...spec, gradeBand: 'G2', unitId: 'g2-u2', skillKey: 'g2-u2:equal-sharing', domain: 'multiplication_division',
  answerSentence: `答案：${spec.answer}`, solutionSteps: spec.steps, hints: spec.hints as [string, string, string], unit: '个',
}));

const shapeSpecs = [
  {
    id: 'prog_g2_u5_01', text: '一张长方形卡片有几条边？', answer: 4,
    answerSchema: { kind: 'integer' as const, min: 0, max: 6 }, operation: 'geometry' as const,
    equation: '长方形有4条边', explanation: '长方形有4条边。题目说的是单独一张长方形卡片，不需要图形额外信息。',
    steps: ['从任意一条边开始绕一圈数。', '回到起点前数到第4条边。', '长方形有4条边。'], hints: ['沿着长方形的边绕一圈数。', '数到回到起点时一共数了几条边。', '长方形有4条边。'], numbers: [], role: 'foundation' as const, method: 'spatial' as const, tier: 1 as const, difficulty: 1 as const,
  },
  {
    id: 'prog_g2_u5_02', text: '一个三角形和一个正方形没有重叠地摆在桌上。它们一共有几条边？', answer: 7,
    answerSchema: { kind: 'integer' as const, min: 0, max: 10 }, operation: 'geometry' as const, equation: '3+4=7（条）',
    explanation: '三角形3条边，正方形4条边；两张图形分开放且没有重叠，边数相加为3+4=7条。',
    steps: ['三角形有3条边。', '正方形有4条边。', '两图形分开摆放，3+4=7条。'], hints: ['分别回忆两种图形有几条边。', '三角形3条，正方形4条。', '3+4=7条。'], numbers: [3, 4], role: 'foundation' as const, method: 'representation' as const, tier: 1 as const, difficulty: 2 as const,
  },
  {
    id: 'prog_g2_u5_03', text: '桌上有2个三角形、3个正方形和1个圆。按“有直边”和“没有直边”分成两类，有直边的图形有几个？', answer: 5,
    answerSchema: { kind: 'integer' as const, min: 0, max: 6 }, operation: 'geometry' as const, equation: '2+3=5（个）',
    explanation: '三角形和正方形都有直边，圆没有直边。2+3=5个图形有直边。',
    steps: ['三角形有直边，共2个。', '正方形也有直边，共3个；圆没有直边。', '2+3=5个。'], hints: ['先判断哪两类有直边。', '三角形和正方形都有直边，圆没有。', '把2个和3个相加，得到5个。'], numbers: [2, 3, 1], role: 'foundation' as const, method: 'classification' as const, tier: 1 as const, difficulty: 2 as const,
  },
  {
    id: 'prog_g2_u5_04', text: '小方格按2行3列整齐排成一个长方形。每个小方格都是正方形，一共有几个小方格？', answer: 6,
    answerSchema: { kind: 'integer' as const, min: 1, max: 6 }, operation: 'multiplication' as const, equation: '2×3=6（个）',
    explanation: '每行3个，共2行，所以小方格总数是3+3=6，也就是2×3=6。行数和列数已在文字中给出。',
    steps: ['第一行有3个方格。', '第二行也有3个方格。', '3+3=6个方格。'], hints: ['按行数，不需要看图。', '有2行，每行3个。', '2×3=6个。'], numbers: [2, 3], role: 'application' as const, method: 'representation' as const, tier: 1 as const, difficulty: 2 as const,
  },
  {
    id: 'prog_g2_u5_05', text: '一个正方形被一条对角线分成两个三角形。请分别数两个小三角形各自的边数，再把边数相加；公共斜边在两个三角形中各算一次。一共有几条三角形边？', answer: 6,
    answerSchema: { kind: 'integer' as const, min: 0, max: 6 }, operation: 'multiplication' as const, equation: '2×3=6（条）',
    explanation: '题目问两个小三角形各自边数的总和，公共对角线在两个三角形边数里各算一次。2×3=6条。',
    steps: ['一条对角线把正方形分成2个三角形。', '每个三角形有3条边。', '按题意统计两者边数总和：2×3=6条。'], hints: ['题目问的是两个三角形各自的边数之和。', '每个有3条边，一共有2个。', '2×3=6条；公共斜边在两只三角形中各算一条。'], numbers: [2, 3], role: 'application' as const, method: 'spatial' as const, tier: 1 as const, difficulty: 3 as const,
  },
  {
    id: 'prog_g2_u5_06', text: '一个长方形花园长8米、宽5米。沿四周走一圈一共走多少米？', answer: 26,
    answerSchema: { kind: 'integer' as const, min: 0, max: 40 }, operation: 'addition' as const, equation: '8+5+8+5=26（米）',
    explanation: '长方形有两条8米的长边和两条5米的宽边，周长是8+5+8+5=26米。',
    steps: ['两条长边共8+8=16米。', '两条宽边共5+5=10米。', '16+10=26米。'], hints: ['绕四周一圈，要把四条边都算上。', '两条长边是16米，两条宽边是10米。', '16+10=26米。'], numbers: [8, 5], role: 'advanced' as const, method: 'spatial' as const, tier: 1 as const, difficulty: 3 as const,
  },
  {
    id: 'prog_g2_u5_07', text: '一个正方形和一个长方形拼成长条，正方形边长4厘米，长方形长9厘米、宽4厘米。两图形沿一条4厘米边完整相接，拼成图形的外边周长是多少厘米？', answer: 34,
    answerSchema: { kind: 'integer' as const, min: 0, max: 40 }, operation: 'subtraction' as const, equation: '4+4+4+4+9+4+9+4-4-4=34（厘米）',
    explanation: '把正方形的4厘米边与长方形的4厘米宽边完全重合。外周长等于两图形周长之和减去被内部遮住的共同边两次：16+26-8=34厘米。',
    steps: ['正方形周长4+4+4+4=16厘米。', '长方形周长9+4+9+4=26厘米。', '共同边4厘米被重复数了两次，去掉4+4：16+26-8=34厘米。'], hints: ['先分别把两个图形的边长逐段相加。', '相接的4厘米边藏在拼图内部，不算外框。', '两周长16+26，去掉共同边4+4，得34厘米。'], numbers: [4, 9], role: 'advanced' as const, method: 'spatial' as const, tier: 2 as const, difficulty: 4 as const,
  },
  {
    id: 'prog_g2_u5_08', text: '把一张边长6厘米的正方形纸片，沿一条中线剪成两个长6厘米、宽3厘米的长方形。两个长方形的周长一共比原正方形周长多多少厘米？', answer: 12,
    answerSchema: { kind: 'integer' as const, min: 0, max: 30 }, operation: 'subtraction' as const, equation: '(6+3+6+3)+(6+3+6+3)-(6+6+6+6)=12（厘米）',
    explanation: '原正方形周长24厘米。剪线长6厘米；剪开后两个新长方形各多出一条6厘米边，周长合计增加6+6=12厘米。也可算每个新长方形周长6+3+6+3=18厘米，两个共36厘米；36-24=12厘米。',
    steps: ['原正方形周长是6+6+6+6=24厘米。', '每个新长方形周长是6+3+6+3=18厘米。', '两个共36厘米，比24厘米多12厘米。'], hints: ['比较剪开前后的边界总长度。', '剪线长6厘米，两个新长方形各多出一条6厘米边。', '周长合计增加6+6=12厘米。'], numbers: [6, 3], role: 'olympiad' as const, method: 'spatial' as const, tier: 1 as const, difficulty: 4 as const,
  },
  {
    id: 'prog_g2_u5_09', text: '一个由2行3列小正方形组成的方格长方形。只沿方格线数完整长方形（正方形也算长方形），一共有多少个？', answer: 18,
    answerSchema: { kind: 'integer' as const, min: 1, max: 20 }, operation: 'addition' as const, equation: '1×1有6个，1×2有4个，1×3有2个，2×1有3个，2×2有2个，2×3有1个；合计18个',
    explanation: '按高和宽分类且不漏：高1格时宽1、2、3格分别有6、4、2个，共12个；高2格时宽1、2、3格分别有3、2、1个，共6个；12+6=18。',
    steps: ['只占1行：宽1格有6个、宽2格有4个、宽3格有2个，共12个。', '占2行：宽1格有3个、宽2格有2个、宽3格有1个，共6个。', '12+6=18个长方形。'], hints: ['按长方形占几行分类，可以系统地数。', '占1行的有6+4+2个；占2行的有3+2+1个。', '6+4+2+3+2+1=18个。'], numbers: [2, 3], role: 'olympiad' as const, method: 'enumeration' as const, tier: 2 as const, difficulty: 5 as const,
  },
].map((spec) => makeProgressionQuestion({
  ...spec, gradeBand: 'G2', unitId: 'g2-u5', skillKey: 'g2-u5:shape-features',
  domain: 'geometry', answerSentence: `答案：${spec.answer}`, solutionSteps: spec.steps, hints: spec.hints as [string, string, string],
  visualKey: 'thinking',
}));

const multiplicationChallenges: Question[] = [
  makeProgressionQuestion({
    id: 'prog_g2_u1_01', gradeBand: 'G2', unitId: 'g2-u1', skillKey: 'g2-u1:equal-groups', domain: 'multiplication_division',
    text: '教室有5排桌子，每排2张；另外活动区有3排桌子，每排3张。一共有多少张桌子？', answer: 19,
    answerSentence: '一共有19张桌子。', answerSchema: { kind: 'integer', min: 0, max: 30 }, operation: 'addition', equation: '2+2+2+2+2+3+3+3=19',
    explanation: '教室5排桌子逐排相加是2+2+2+2+2=10张；活动区3排是3+3+3=9张；10+9=19张。',
    solutionSteps: ['教室5排，每排2张：2+2+2+2+2=10张。', '活动区3排，每排3张：3+3+3=9张。', '10+9=19张。'],
    hints: ['把两处桌子分开数。', '第一处数5次2，第二处数3次3。', '两处共10+9=19张。'],
    numbers: [5, 2, 3, 3], difficulty: 4, role: 'advanced', family: 'g2-mixed-arrays', tier: 1, method: 'classification',
  }),
  makeProgressionQuestion({
    id: 'prog_g2_u1_02', gradeBand: 'G2', unitId: 'g2-u1', skillKey: 'g2-u1:equal-groups', domain: 'multiplication_division',
    text: '3个大盒子里各有5个小袋，每个小袋装2颗糖。3个大盒子里一共有多少颗糖？', answer: 30,
    answerSentence: '一共有30颗糖。', answerSchema: { kind: 'integer', min: 0, max: 50 }, operation: 'multiplication', equation: '(5×2)+(5×2)+(5×2)=10+10+10=30',
    explanation: '每个大盒子有5袋，每袋2颗，所以一盒糖数为2+2+2+2+2=10颗；3盒是10+10+10=30颗。只用重复加法，不需跨越未学乘法口诀。',
    solutionSteps: ['一个大盒子里有5袋，每袋2颗：2+2+2+2+2=10颗。', '3个大盒子共有10+10+10颗。', '10+10+10=30颗。'],
    hints: ['先数一个大盒子里的糖，不要一下子算3个盒子。', '每个盒子有5袋，每袋2颗。', '一个盒子10颗，3个盒子是10+10+10=30颗。'],
    numbers: [3, 5, 2], difficulty: 5, role: 'advanced', family: 'g2-nested-groups', tier: 2, method: 'representation',
  }),
  makeProgressionQuestion({
    id: 'prog_g2_u1_03', gradeBand: 'G2', unitId: 'g2-u1', skillKey: 'g2-u1:table-facts', domain: 'multiplication_division',
    text: '把数字2、3、5各用一次填进□×□+□，怎样填能得到最大的结果？', answer: 17,
    answerSentence: '最大结果是17。', answerSchema: { kind: 'integer', min: 0, max: 20 }, operation: 'multiplication', equation: '3×5+2=17；5×2+3=13；3×2+5=11',
    explanation: '加号后的数字越小，留给相乘的两数越大。三种乘积分别是3×5=15、5×2=10、3×2=6；加上剩余数字后得到17、13、11，最大是17。这里用到的乘法事实均含2、3或5。',
    solutionSteps: ['枚举乘号两边可选的数对：3和5、2和5、2和3。', '对应结果：3×5+2=17；2×5+3=13；2×3+5=11。', '最大结果是17。'],
    hints: ['先决定哪两个数字相乘，剩下的数字放在加号后。', '把三种可能分别算出来，不要重复交换乘号两边。', '三种结果是17、13、11，最大是17。'],
    numbers: [2, 3, 5], difficulty: 4, role: 'olympiad', family: 'g2-operator-placement-add', tier: 1, method: 'enumeration',
  }),
  makeProgressionQuestion({
    id: 'prog_g2_u1_04', gradeBand: 'G2', unitId: 'g2-u1', skillKey: 'g2-u1:equal-groups', domain: 'multiplication_division',
    text: '把数字2、3、5各用一次填进□×□−□，怎样填能得到最大的结果？', answer: 13,
    answerSentence: '最大结果是13。', answerSchema: { kind: 'integer', min: 0, max: 20 }, operation: 'subtraction', equation: '3×5−2=13；5×2−3=7；3×2−5=1',
    explanation: '枚举乘号两边的数对：3×5后减2得13；5×2后减3得7；3×2后减5得1。最大的结果是13。',
    solutionSteps: ['乘号两边可选3和5、2和5、2和3。', '逐项计算：15-2=13，10-3=7，6-5=1。', '最大结果是13。'],
    hints: ['先枚举乘号两边的数字组合。', '每种组合都要减去剩下的数字。', '三个结果比较后，最大的是13。'],
    numbers: [2, 3, 5], difficulty: 5, role: 'olympiad', family: 'g2-operator-placement-subtract', tier: 2, method: 'enumeration',
  }),
  makeProgressionQuestion({
    id: 'prog_g2_u1_05', gradeBand: 'G2', unitId: 'g2-u1', skillKey: 'g2-u1:equal-groups', domain: 'multiplication_division',
    text: '图示：●●● / ●●● / ●●● / ●●●。每行是一组，4组一样多。一共有几个圆点？', answer: 12,
    answerSentence: '一共有12个圆点。', answerSchema: { kind: 'integer', min: 0, max: 20 }, operation: 'addition',
    equation: '3+3+3+3=12', explanation: '图示有4行，每行3个圆点。逐行数：3、6、9、12，一共12个；这里用重复加法即可，不必预先会4×3。',
    solutionSteps: ['数清每行有3个圆点。', '把4行逐行相加：3+3+3+3。', '3+3+3+3=12个。'],
    hints: ['斜线把圆点分成几行？每行几个？', '共有4行，每行3个。', '3+3+3+3=12个圆点。'],
    numbers: [4, 3], difficulty: 2, role: 'foundation', family: 'g2-array-repeated-addition', tier: 1, method: 'representation',
  }),
  makeProgressionQuestion({
    id: 'prog_g2_u1_06', gradeBand: 'G2', unitId: 'g2-u1', skillKey: 'g2-u1:equal-groups', domain: 'multiplication_division',
    text: '3个盘子里各放4块饼干。请按盘子逐个数，3个盘子一共有多少块？', answer: 12,
    answerSentence: '一共有12块饼干。', answerSchema: { kind: 'integer', min: 0, max: 20 }, operation: 'addition',
    equation: '4+4+4=12', explanation: '三个盘子各有4块，按盘子数是4、8、12，因此一共有12块。',
    solutionSteps: ['第一个盘子有4块。', '第二个盘子再加4块，累计8块。', '第三个盘子再加4块，累计12块。'],
    hints: ['一次只数一个盘子的饼干。', '三个盘子的累计数依次是4、8、12。', '4+4+4=12块。'],
    numbers: [3, 4], difficulty: 2, role: 'foundation', family: 'g2-plate-equal-groups', tier: 1, method: 'representation',
  }),
  makeProgressionQuestion({
    id: 'prog_g2_u1_07', gradeBand: 'G2', unitId: 'g2-u1', skillKey: 'g2-u1:equal-groups', domain: 'multiplication_division',
    text: '4个小盒子里各有3支铅笔，另外桌上还有2支。所有铅笔一共有多少支？', answer: 14,
    answerSentence: '一共有14支铅笔。', answerSchema: { kind: 'integer', min: 0, max: 20 }, operation: 'addition',
    equation: '3+3+3+3+2=14', explanation: '先把4盒中的铅笔按盒逐个相加，3+3+3+3=12，再加桌上的2支，得到14支。',
    solutionSteps: ['四盒各3支：3+3+3+3=12支。', '桌上另有2支。', '12+2=14支。'],
    hints: ['先数盒子里的，再处理桌上的。', '按盒子相加是3+3+3+3。', '12+2=14支。'],
    numbers: [4, 3, 2], difficulty: 3, role: 'application', family: 'g2-equal-groups-extra', tier: 1, method: 'representation',
  }),
  makeProgressionQuestion({
    id: 'prog_g2_u1_08', gradeBand: 'G2', unitId: 'g2-u1', skillKey: 'g2-u1:equal-groups', domain: 'multiplication_division',
    text: '三袋弹珠一样多，另有2颗散珠，总数是17颗。每袋有几颗？请用“逐袋相加”检验。', answer: 5,
    answerSentence: '每袋有5颗。', answerSchema: { kind: 'integer', min: 0, max: 10 }, operation: 'subtraction',
    equation: '17-2=15；5+5+5=15', explanation: '先去掉2颗散珠，袋中共有15颗。三袋一样多，逐个尝试：4+4+4=12，5+5+5=15，所以每袋5颗。',
    solutionSteps: ['总数减去散珠：17-2=15颗在袋中。', '三袋一样多，尝试每袋4颗得到12，太少。', '每袋5颗时5+5+5=15，符合条件。'],
    hints: ['先从17颗里拿掉散珠。', '把剩下的15颗平均分成3个相同的组，可逐个试每组数量。', '5+5+5=15，所以每袋5颗。'],
    numbers: [17, 2, 3], difficulty: 5, role: 'olympiad', family: 'g2-equal-groups-inverse', tier: 1, method: 'enumeration',
  }),
  makeProgressionQuestion({
    id: 'prog_g2_u1_09', gradeBand: 'G2', unitId: 'g2-u1', skillKey: 'g2-u1:equal-groups', domain: 'multiplication_division',
    text: '5个杯子排成一排，每个杯子先放1颗豆子，再一轮轮继续放。放到每个杯子都有4颗时，一共放了多少颗？', answer: 20,
    answerSentence: '一共放了20颗。', answerSchema: { kind: 'integer', min: 0, max: 30 }, operation: 'addition', equation: '5+5+5+5=20',
    explanation: '每一轮给5个杯子各放1颗，共放5颗。每个杯子放4轮，就是5+5+5+5=20颗。',
    solutionSteps: ['每轮给5个杯子各放1颗，所以每轮用5颗。', '每个杯子要放4颗，需要4轮。', '4轮共5+5+5+5=20颗。'],
    hints: ['先数一轮需要多少颗。', '一轮5颗，共要放4轮。', '5+5+5+5=20颗。'],
    numbers: [5, 4], difficulty: 3, role: 'application', family: 'g2-repeated-rounds', tier: 1, method: 'representation',
  }),
  makeProgressionQuestion({
    id: 'prog_g2_u1_10', gradeBand: 'G2', unitId: 'g2-u1', skillKey: 'g2-u1:equal-groups', domain: 'multiplication_division',
    text: '3个篮子里各有4个橘子，另外2个篮子里的橘子也一样多。5个篮子一共有22个橘子。后2个篮子各有几个？', answer: 5,
    answerSentence: '后2个篮子各有5个。', answerSchema: { kind: 'integer', min: 0, max: 10 }, operation: 'subtraction', equation: '4+4+4=12；22−12=10；5+5=10',
    explanation: '前3篮共有4+4+4=12个；剩余22−12=10个，平均放进后2个篮子。相同数量逐个相加：5+5=10，所以每篮5个。',
    solutionSteps: ['先数前3篮：4+4+4=12个。', '后2篮一共22−12=10个。', '两个相同数相加为10：5+5=10，每篮5个。'],
    hints: ['先把前三个篮子的橘子数清楚。', '从总数22中减去前3篮，求后2篮合计。', '两个相同数相加得到10，每个是5。'],
    numbers: [3, 4, 2, 22], difficulty: 5, role: 'olympiad', family: 'g2-nested-equal-groups', tier: 2, method: 'enumeration',
  }),
];

const g2CoinEnumeration = makeProgressionQuestion({
  id: 'prog_g2_u6_01', gradeBand: 'G2', unitId: 'g2-u6', skillKey: 'g2-u6:enumeration-equivalence', domain: 'logic_reasoning',
  text: '用1元和2元硬币凑成6元，至少用一枚2元硬币。不同枚数的硬币算不同凑法，一共有几种？', answer: 3,
  answerSchema: { kind: 'integer', min: 0, max: 6 }, answerSentence: '一共有3种凑法。', operation: 'logic',
  equation: '2元硬币1枚配1元硬币4枚；2枚配2枚；3枚配0枚，共3种',
  explanation: '按2元硬币枚数逐个试：取1枚时剩4元，需4枚1元；取2枚时剩2元，需2枚1元；取3枚时正好6元，不用1元。至少用一枚2元硬币，所以共3种。',
  solutionSteps: ['2元硬币取1枚：还差4元，用4枚1元。', '取2枚：还差2元，用2枚1元。', '取3枚：正好6元，共列出3种。'],
  hints: ['把总金额按2元硬币枚数分类。', '2元硬币可取1、2或3枚。', '对应1元硬币枚数是4、2、0，共3种。'],
  numbers: [1, 2, 6], unit: '种', difficulty: 3, role: 'application', tier: 1, method: 'enumeration',
});

export const progressionGrade2Questions: Question[] = divisionSpecs.concat(shapeSpecs, multiplicationChallenges, g2TimeAndMeasurement, [g2CoinEnumeration]);

export const progressionGrade2Metadata: readonly QuestionLearningMetadata[] = [
  ...metadataFor('g2-u1', ['g2-u1:equal-groups', 'g2-u1:table-facts'], {
    foundation: ['g1ll_75', 'g1ll_79', multiplicationChallenges[4].id, multiplicationChallenges[5].id], application: [multiplicationChallenges[6].id, multiplicationChallenges[8].id],
    advanced: [multiplicationChallenges[0].id, multiplicationChallenges[1].id], olympiad: [multiplicationChallenges[2].id, multiplicationChallenges[3].id, multiplicationChallenges[7].id, multiplicationChallenges[9].id],
  }, { foundation: 'representation', application: 'pattern', advanced: 'equivalence', olympiad: 'optimization' }),
  ...metadataFor('g2-u2', ['g2-u2:equal-sharing', 'g2-u2:find-number-of-groups'], {
    foundation: [divisionSpecs[0].id, divisionSpecs[5].id, divisionSpecs[8].id], application: [divisionSpecs[1].id, divisionSpecs[6].id],
    advanced: [divisionSpecs[2].id, divisionSpecs[7].id], olympiad: [divisionSpecs[3].id, divisionSpecs[4].id],
  }, { foundation: 'representation', application: 'inverse', advanced: 'inverse', olympiad: 'enumeration' }),
  ...metadataFor('g2-u3', ['g2-u3:add-subtract-within-100', 'g2-u3:two-step-word-problems'], {
    foundation: ['g2_03', 'g2_14', 'g2_22'], application: ['g2_06', 'g2_16'],
    advanced: ['g2_10', 'g2_19'], olympiad: ['g2o_01', 'g2o_04'],
  }, { foundation: 'representation', application: 'inverse', advanced: 'inverse', olympiad: 'equivalence' }),
  ...metadataFor('g2-u4', ['g2-u4:length-units', 'g2-u4:elapsed-time'], {
    foundation: ['g1ll_83', 'g1ll_84', 'g1ll_86'], application: [g2TimeAndMeasurement[0].id, 'g2_18'],
    advanced: [g2TimeAndMeasurement[1].id, g2TimeAndMeasurement[2].id, 'g1ll_85'], olympiad: ['g2o_08', 'g2o_09'],
  }, { foundation: 'representation', application: 'inverse', advanced: 'classification', olympiad: 'spatial' }),
  ...metadataFor('g2-u5', ['g2-u5:shape-features', 'g2-u5:spatial-relations'], {
    foundation: [shapeSpecs[0].id, shapeSpecs[1].id, shapeSpecs[2].id], application: [shapeSpecs[3].id, shapeSpecs[4].id],
    advanced: [shapeSpecs[5].id, shapeSpecs[6].id], olympiad: [shapeSpecs[7].id, shapeSpecs[8].id],
  }, { foundation: 'spatial', application: 'representation', advanced: 'spatial', olympiad: 'enumeration' }),
  ...metadataFor('g2-u6', ['g2-u6:cycle-pattern', 'g2-u6:enumeration-equivalence'], {
    foundation: ['g2o_05', 'g2o_06', 'g2o_07'], application: ['g2o_19', 'g2o_20', g2CoinEnumeration.id],
    advanced: ['g2o_11', 'g2o_12'], olympiad: ['g2o_13', 'g2o_16'],
  }, { foundation: 'pattern', application: 'enumeration', advanced: 'inverse', olympiad: 'equivalence' }),
].map((entry) => {
  const verifiedPrerequisites: Record<string, string[]> = {
    'g2-u1': ['g1-u1:add-within-20'],
    'g2-u2': ['g2-u1:equal-groups', 'g2-u1:table-facts'],
    'g2-u3': ['g1-u2:add-subtract-100', 'g2-u1:table-facts', 'g2-u2:equal-sharing'],
    'g2-u4': ['g1-u5:time-and-quantity'],
    'g2-u5': ['g1-u4:plane-shape-features'],
    'g2-u6': ['g1-u6:repeat-pattern', 'g2-u1:equal-groups'],
  };
  const authored = progressionGrade2Questions.find((q)=>q.id===entry.questionId);
  const source = [...g1LowerLateQuestions, ...g2Questions, ...g2OlympiadQuestions].find((q)=>q.id===entry.questionId);
  const explicitFacts: Record<string,[number,number][]> = {
    'prog_g2_u1_03':[[3,5],[2,5],[2,3]], 'prog_g2_u1_04':[[3,5],[2,5],[2,3]],
  };
  const explicitTargets: Record<string,string> = {
    'prog_g2_u2_02': 'g2-u2:find-number-of-groups',
    'prog_g2_u2_07': 'g2-u2:find-number-of-groups',
    'prog_g2_u5_07': 'g2-u5:spatial-relations',
    'prog_g2_u5_08': 'g2-u5:spatial-relations',
    'prog_g2_u5_09': 'g2-u5:spatial-relations',
  };
  const tableRequirement = entry.unitId==='g2-u1' || entry.unitId==='g2-u2'
    ? (explicitFacts[entry.questionId] ? 'facts' as const : 'concept' as const)
    : undefined;
  return {
    ...entry,
    targetSkillKeys: explicitTargets[entry.questionId] ? [explicitTargets[entry.questionId]] : authored?.curriculumSkillIds ?? (source ? [inferTargetSkill(entry.unitId, source)] : entry.targetSkillKeys),
    ...(authored?.difficultyProfile?.transferLevel ? { tier: authored.difficultyProfile.transferLevel as 1 | 2 | 3 } : {}),
    ...(tableRequirement ? { tableRequirement } : {}),
    ...(explicitFacts[entry.questionId] ? { multiplicationFacts: explicitFacts[entry.questionId] } : {}),
    prerequisiteSkillKeys: verifiedPrerequisites[entry.unitId],
  };
});

