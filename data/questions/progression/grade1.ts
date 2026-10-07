import type { Question } from '@/lib/types';
import type { QuestionLearningMetadata } from './helpers';
import { inferTargetSkill, makeProgressionQuestion, metadataFor } from './helpers';
import { g1Questions } from '@/data/questions/g1';
import { g1LowerLateQuestions } from '@/data/questions/g1-lower-late';
import { g1ThinkingQuestions } from '@/data/questions/g1-thinking';

const u4ShapeA = makeProgressionQuestion({
  id: 'prog_g1_u4_01', gradeBand: 'G1', unitId: 'g1-u4', skillKey: 'g1-u4:classify-shapes',
  domain: 'geometry', text: '桌上有3张三角形卡、2张正方形卡和4张圆形卡。三角形每张有3条直边，正方形每张有4条直边。三角形卡和正方形卡一共有多少条直边？',
  answer: 17, answerSentence: '三角形卡和正方形卡一共有17条直边。', answerSchema: { kind: 'integer', min: 0, max: 30 },
  operation: 'addition', equation: '3+3+3+4+4=17（条）', explanation: '三张三角形卡的边数逐张相加是3+3+3=9；两张正方形卡是4+4=8；9+8=17条。圆形没有直边，也不属于题目要求的两类。',
  solutionSteps: ['三角形卡的边数是3+3+3=9条。', '正方形卡的边数是4+4=8条。', '9+8=17条；圆形卡不计入直边总数。'],
  hints: ['先只看题目要计算的两类卡片。', '把每张卡的边数逐张相加，不需要乘法。', '3+3+3=9，4+4=8，9+8=17条。'],
  numbers: [3, 2, 4], unit: '条', difficulty: 3, role: 'advanced', family: 'g1-u4-repeated-edge-count', tier: 1, method: 'representation', variantIndex: 1,
});

const u4ShapeB = makeProgressionQuestion({
  id: 'prog_g1_u4_02', gradeBand: 'G1', unitId: 'g1-u4', skillKey: 'g1-u4:plane-shape-features',
  domain: 'geometry', text: '两张一样大的正方形纸片各有4条边。把它们沿一整条边拼在一起，共用的边藏在里面。把一张小正方形的一条边看作1段，拼好后外框露出多少段？',
  answer: 6, answerSentence: '拼好后的外框露出6段小正方形边。', answerSchema: { kind: 'integer', min: 0, max: 8 },
  operation: 'geometry', equation: '4+4-2=6（段）', explanation: '两张正方形纸片分开时共有4+4=8段边；共用的一整条边在8段中各算过一次，但拼好后两段都藏在里面，所以外框露出8-2=6段小边。',
  solutionSteps: ['两张正方形分开共有4+4=8段小边。', '拼接处的一条边在两张纸片上各算一段。', '这两段都在里面，8-2=6段外框边露在外面。'],
  hints: ['把每张小正方形的边都当作一段来数。', '拼接处有两段边藏在里面。', '4+4-2=6段小边露在外框。'],
  numbers: [4, 4, 2], unit: '段', difficulty: 3, role: 'advanced', family: 'g1-u4-shared-edge', tier: 2, method: 'spatial', variantIndex: 2,
});

const u4ShapeC = makeProgressionQuestion({
  id: 'prog_g1_u4_03', gradeBand: 'G1', unitId: 'g1-u4', skillKey: 'g1-u4:plane-shape-features',
  domain: 'geometry', text: '4张卡片只可能是三角形或正方形。三角形每张有3条直边，正方形每张有4条直边。4张卡共有14条直边，正方形卡有几张？',
  answer: 2, answerSentence: '正方形卡有2张，三角形卡也有2张。', answerSchema: { kind: 'integer', min: 0, max: 4 },
  operation: 'addition', equation: '3+3+4+4=14（条）', explanation: '先假设4张都是三角形，会有12条边；每把一张三角形换成正方形，边数多1条。要从12条增加到14条，需要换2张，所以三角形和正方形各2张。也可逐个试正方形张数0、1、2、3、4，对应总边数12、13、14、15、16。',
  solutionSteps: ['4张三角形共有3+3+3+3=12条边。', '每换成一张正方形，边数多1条；14比12多2条。', '换2张正方形，剩下2张是三角形；检查3+3+4+4=14。'],
  hints: ['从4张都是三角形开始数，总边数是多少？', '把一张三角形换成正方形，边数增加几条？', '总数要增加2条，所以换2张；剩下2张是三角形。'],
  numbers: [4, 3, 4, 14], unit: '张', difficulty: 4, role: 'olympiad', family: 'g1-u4-classification-enumeration', tier: 1, method: 'enumeration', variantIndex: 1,
});

const u4ShapeD = makeProgressionQuestion({
  id: 'prog_g1_u4_04', gradeBand: 'G1', unitId: 'g1-u4', skillKey: 'g1-u4:plane-shape-features',
  domain: 'geometry', text: '4张一样大的正方形纸片拼成T形：下面横着排3张，第4张放在中间那张的正上方，并沿整条边相接。把一张小正方形的一条边看作1段，T形外框露出多少段？',
  answer: 10, answerSentence: 'T形外框露出10段小正方形边。', answerSchema: { kind: 'integer', min: 0, max: 16 },
  operation: 'geometry', equation: '4+4+4+4-2-2-2=10（段）', explanation: '4张纸片分开共有16段边。按文字摆放形成T形后，有3处相邻纸片共用整边；每处的两段边都藏在里面，16-2-2-2=10段露在外框。',
  solutionSteps: ['4张正方形共有4+4+4+4=16段小边。', '按题意摆好后，T形里有3处整边相接。', '3处各有2段藏在里面：16-2-2-2=10段露在外框。'],
  hints: ['按题目描述摆出T形，每张纸片的边看作一段。', '数一数有几处共用的整边；每处会藏起两段。', '4张共16段，减去3处的6段，外框露出10段。'],
  numbers: [4, 4, 3], unit: '段', difficulty: 5, role: 'olympiad', family: 'g1-u4-polyomino-boundary', tier: 2, method: 'spatial', variantIndex: 1,
});

const u5Time = makeProgressionQuestion({
  id: 'prog_g1_u5_01', gradeBand: 'G1', unitId: 'g1-u5', skillKey: 'g1-u5:time-and-quantity',
  domain: 'time', text: '小安8:20开始读书，读了30分钟。读书结束时是几时几分？',
  answer: '8:50', answerSentence: '读书结束时是8:50。', answerType: 'text', answerSchema: { kind: 'text', acceptedAnswers: ['8:50', '8时50分'] },
  operation: 'addition', equation: '8:20+30分钟=8:50', explanation: '从8:20起经过10分钟到8:30，还剩20分钟，到8:50；合计经过30分钟。',
  solutionSteps: ['8:20到8:30经过10分钟。', '30-10=20分钟。', '8:30再过20分钟是8:50。'],
  hints: ['先数到下一个整十分钟。', '8:20到8:30是10分钟，还剩20分钟。', '8:30再过20分钟，答案是8:50。'],
  numbers: [8, 20, 30], unit: '时分', difficulty: 3, role: 'application', family: 'g1-u5-elapsed-time', tier: 1, method: 'representation', variantIndex: 1,
});

const u5MoneyChallenge = makeProgressionQuestion({
  id: 'prog_g1_u5_02', gradeBand: 'G1', unitId: 'g1-u5', skillKey: 'g1-u5:rmb-yuan-jiao',
  domain: 'money', text: '一本故事书8元。小安只能用5元和1元的整元纸币付款。刚好付8元至少要几张纸币？',
  answer: 4, answerSentence: '刚好付款至少要4张纸币。', answerSchema: { kind: 'integer', min: 1, max: 8 },
  operation: 'addition', equation: '5+1+1+1=8；共4张', explanation: '一张5元纸币后还差3元，必须用3张1元纸币补齐，共1+3=4张。若不用5元，需要8张1元；所以4张最少。',
  solutionSteps: ['用1张5元纸币后，还差8-5=3元。', '3元要用3张1元纸币。', '1张5元加3张1元，共4张；全用1元要8张，因此4张最少。'],
  hints: ['比较用5元纸币和全用1元纸币两种办法。', '用1张5元后还差3元。', '补3张1元，共4张；不用5元要8张，所以4张最少。'],
  numbers: [8, 5, 1], unit: '张', difficulty: 4, role: 'olympiad', family: 'g1-u5-minimum-payment', tier: 2, method: 'optimization', variantIndex: 1,
});

const u5ElapsedChallenge = makeProgressionQuestion({
  id: 'prog_g1_u5_03', gradeBand: 'G1', unitId: 'g1-u5', skillKey: 'g1-u5:time-and-quantity',
  domain: 'time', text: '演出从8:10开始，到9:00结束。中间有3个节目，每个节目10分钟。两段休息时间合起来一共几分钟？',
  answer: 20, answerSentence: '两段休息时间一共20分钟。', answerSchema: { kind: 'integer', min: 0, max: 50 },
  operation: 'subtraction', equation: '8:10到9:00是50分钟；10+10+10=30；50-30=20（分钟）', explanation: '演出共经过50分钟。三个节目各10分钟，逐段相加是30分钟；剩下50-30=20分钟就是两段休息的总长。',
  solutionSteps: ['8:10到9:00经过50分钟。', '节目用时10+10+10=30分钟。', '50-30=20分钟，两段休息合计20分钟。'],
  hints: ['先求从开始到结束一共经过几分钟。', '把3个节目各10分钟逐段相加。', '50分钟减去3段共30分钟，剩20分钟。'],
  numbers: [8, 10, 9, 0, 3], unit: '分钟', difficulty: 4, role: 'olympiad', family: 'g1-u5-event-schedule', tier: 2, method: 'optimization', variantIndex: 1,
});

const u2Consecutive = makeProgressionQuestion({
  id: 'prog_g1_u2_01', gradeBand: 'G1', unitId: 'g1-u2', skillKey: 'g1-u2:number-place-value-100',
  domain: 'comparison', text: '两个连续的整数相加等于75，较大的那个整数是多少？', answer: 38,
  answerSentence: '较大的整数是38。', answerSchema: { kind: 'integer', min: 0, max: 100 }, operation: 'addition', equation: '37+38=75',
  explanation: '从中间数38试起，前后两个连续整数是37和38，37+38=75；较大的是38。',
  solutionSteps: ['75的一半在37和38之间。', '检查相邻整数37和38：37+38=75。', '所以较大的整数是38。'],
  hints: ['连续整数相差1，先找75附近的一半。', '试37和38，它们相差1。', '37+38=75，较大的是38。'],
  numbers: [75], unit: '个', difficulty: 4, role: 'olympiad', family: 'g1-u2-consecutive-sum', tier: 2, method: 'equivalence', variantIndex: 1,
});

const u2DigitPuzzle = makeProgressionQuestion({
  id: 'prog_g1_u2_02', gradeBand: 'G1', unitId: 'g1-u2', skillKey: 'g1-u2:number-place-value-100',
  domain: 'comparison', text: '一个两位数，十位数字与个位数字相加得10，十位数字比个位数字大2。这个两位数是多少？', answer: 64,
  answerSentence: '这个两位数是64。', answerSchema: { kind: 'integer', min: 10, max: 99 }, operation: 'addition', equation: '6+4=10；6-4=2；组成64',
  explanation: '十位和个位两个数字相差2、合起来是10。试6和4：6+4=10且6-4=2，因此十位是6、个位是4，组成64。若十位更大，可能的有序数字对只有6和4。',
  solutionSteps: ['把条件分别记住：两位数字合起来10，十位还要大2。', '试6和4：合起来正好10，且6比4大2。', '十位放6、个位放4，得到64。'],
  hints: ['十位和个位一共是10。', '十位比个位多2，试一对相差2且合计10的数字。', '6和4满足条件，所以两位数是64。'],
  numbers: [10, 2], unit: '个', difficulty: 4, role: 'olympiad', family: 'g1-u2-place-value-enumeration', tier: 1, method: 'enumeration', variantIndex: 1,
});

const u1EqualAddends = makeProgressionQuestion({
  id: 'prog_g1_u1_01', gradeBand: 'G1', unitId: 'g1-u1', skillKey: 'g1-u1:add-within-20',
  domain: 'addition_subtraction', text: '三个相同的数相加等于9。这个数是多少？可以从1、2、3依次试一试。', answer: 3,
  answerSentence: '这个数是3。', answerSchema: { kind: 'integer', min: 1, max: 9 }, operation: 'addition', equation: '3+3+3=9',
  explanation: '按提示逐个试：1+1+1=3，2+2+2=6，3+3+3=9，所以相同的数是3。',
  solutionSteps: ['试1：1+1+1=3，不是9。', '试2：2+2+2=6，还不到9。', '试3：3+3+3=9，所以答案是3。'],
  hints: ['三个数要相同，可以从小到大试。', '试1和2：三个1是3，三个2是6。', '三个3相加正好是9。'],
  numbers: [3, 9], unit: '个', difficulty: 3, role: 'olympiad', family: 'g1-u1-equal-addends', tier: 1, method: 'enumeration', variantIndex: 1,
});

const u1BalanceParts = makeProgressionQuestion({
  id: 'prog_g1_u1_02', gradeBand: 'G1', unitId: 'g1-u1', skillKey: 'g1-u1:add-within-20',
  domain: 'logic_reasoning', text: '盒子里有12颗红色和蓝色玻璃珠，红色比蓝色多2颗。红色玻璃珠有几颗？', answer: 7,
  answerSentence: '红色玻璃珠有7颗。', answerSchema: { kind: 'integer', min: 0, max: 12 }, operation: 'addition', equation: '6+6=12；7+5=12；7-5=2',
  explanation: '先把12颗平均想成红、蓝各6颗；若红色比蓝色多2颗，就从蓝色一边移1颗到红色一边，得到红7颗、蓝5颗。检查7+5=12且7比5多2。',
  solutionSteps: ['若红蓝一样多，12颗可分成6和6。', '要让红色比蓝色多2，把1颗从蓝色一边移到红色一边。', '红色7颗、蓝色5颗；7+5=12且相差2。'],
  hints: ['先想红、蓝一样多时各有多少颗。', '现在红色要比蓝色多2颗，想想从哪边移几颗。', '移1颗后是7和5；7+5=12，差2。'],
  numbers: [12, 2], unit: '颗', difficulty: 4, role: 'olympiad', family: 'g1-u1-equal-parts-difference', tier: 2, method: 'representation', variantIndex: 1,
});

const u3SumAndDifference = makeProgressionQuestion({
  id: 'prog_g1_u3_01', gradeBand: 'G1', unitId: 'g1-u3', skillKey: 'g1-u3:compare-difference',
  domain: 'comparison', text: '小红和小明一共有19张贴纸，小红比小明多5张。小红有多少张？', answer: 12,
  answerSentence: '小红有12张贴纸。', answerSchema: { kind: 'integer', min: 0, max: 19 }, operation: 'addition', equation: '7+12=19；12-7=5',
  explanation: '有序试数满足“和是19、相差5”的一对数。试7和12：7+12=19，而且12-7=5，所以小红有较多的12张。',
  solutionSteps: ['较多的一方要比另一方多5张。', '检查7张和12张：7+12=19。', '12-7=5，符合条件，所以小红有12张。'],
  hints: ['找一对数，合起来是19并相差5。', '可以从相差5的一对数开始检查。', '7和12合起来19、相差5；小红多，所以她有12张。'],
  numbers: [19, 5], unit: '张', difficulty: 4, role: 'olympiad', family: 'g1-u3-sum-difference', tier: 2, method: 'enumeration', variantIndex: 1,
});

const u3ComparisonChain = makeProgressionQuestion({
  id: 'prog_g1_u3_02', gradeBand: 'G1', unitId: 'g1-u3', skillKey: 'g1-u3:compare-difference',
  domain: 'comparison', text: '小花有4张卡片。小明比小花多2张，小红比小明多3张。小红有多少张卡片？', answer: 9,
  answerSentence: '小红有9张卡片。', answerSchema: { kind: 'integer', min: 0, max: 12 }, operation: 'addition', equation: '4+2=6；6+3=9',
  explanation: '先从小花到小明增加2张：4+2=6。小红再比小明多3张：6+3=9。倒着检查，小红9张、小明6张、小花4张，分别相差3和2。',
  solutionSteps: ['小花有4张。', '小明比小花多2张，所以小明有4+2=6张。', '小红比小明多3张，所以小红有6+3=9张。'],
  hints: ['关系是一层接一层的，先从已知的小花开始。', '先加上小明多的2张。', '再加上小红比小明多的3张：4+2+3=9。'],
  numbers: [4, 2, 3], unit: '张', difficulty: 4, role: 'advanced', family: 'g1-u3-comparison-chain', tier: 1, method: 'representation', variantIndex: 1,
});

const u5MoneyChange = makeProgressionQuestion({
  id: 'prog_g1_u5_04', gradeBand: 'G1', unitId: 'g1-u5', skillKey: 'g1-u5:rmb-yuan-jiao',
  domain: 'money', text: '一本故事书3元5角。小安买两本，付了10元，应找回多少钱？', answer: '3元',
  answerSentence: '应找回3元。', answerType: 'money', answerSchema: { kind: 'money', currency: 'CNY', inputMode: 'yuan_jiao', allowEquivalentFormats: true },
  operation: 'subtraction', equation: '3元5角+3元5角=7元；10元-7元=3元', explanation: '两本书的钱逐本相加：3元5角+3元5角=7元。用10元付款，找回10-7=3元。',
  solutionSteps: ['每本3元5角，两本是3元5角+3元5角。', '5角+5角=10角，也就是1元；3元+3元+1元=7元。', '10元-7元=3元。'],
  hints: ['先把两本书的钱合起来。', '两个5角正好换成1元，所以两本共7元。', '10元减去7元，应找回3元。'],
  numbers: [3, 5, 2, 10], unit: '元', difficulty: 4, role: 'advanced', family: 'g1-u5-yuan-jiao-change', tier: 2, method: 'equivalence', variantIndex: 1,
});

const u6PatternCorrectA = makeProgressionQuestion({
  id: 'prog_g1_u6_01', gradeBand: 'G1', unitId: 'g1-u6', skillKey: 'g1-u6:repeat-pattern',
  domain: 'pattern', text: '图形按“○、△、□、○、△、□……”重复排列。第10个图形是什么？', answer: '○',
  answerSentence: '第10个图形是圆形。', answerType: 'text', answerSchema: { kind: 'text', acceptedAnswers: ['○', '圆形', '圆'] }, operation: 'addition', equation: '逐个列出：1○ 2△ 3□ 4○ 5△ 6□ 7○ 8△ 9□ 10○',
  explanation: '按顺序每三个图形一组：第1至3个是○、△、□，第4至6个重复，第7至9个再重复；第10个回到○。可直接逐个写到第10个核对。',
  solutionSteps: ['先写第一组：○、△、□。', '继续重复到第9个：○、△、□。', '第10个是新一组的第1个，所以是○。'],
  hints: ['从第1个开始，把三个图形逐个写下。', '第4、5、6个与第1、2、3个相同。', '第7至9个又是○、△、□，第10个是○。'],
  numbers: [10], difficulty: 3, role: 'advanced', family: 'g1-u6-three-shape-cycle', tier: 1, method: 'pattern', variantIndex: 1,
});

const u6PatternCorrectB = makeProgressionQuestion({
  id: 'prog_g1_u6_02', gradeBand: 'G1', unitId: 'g1-u6', skillKey: 'g1-u6:repeat-pattern',
  domain: 'pattern', text: '图形按“○、△、□、◇”四个一组重复。第11个图形是什么？', answer: '□',
  answerSentence: '第11个图形是正方形。', answerType: 'text', answerSchema: { kind: 'text', acceptedAnswers: ['□', '正方形', '方形'] }, operation: 'addition', equation: '逐个列出：1○ 2△ 3□ 4◇ 5○ 6△ 7□ 8◇ 9○ 10△ 11□',
  explanation: '每组四个。前三组是位置1–4、5–8、9–12；第11个在第三组的第3位，对应□。直接按文字逐个列到第11个也得到□。',
  solutionSteps: ['第一组：○、△、□、◇。', '第二组在第5至8位重复，第三组从第9位开始。', '第9、10、11位依次是○、△、□，所以第11个是□。'],
  hints: ['每数完四个图形，就重新从○开始。', '第9个是新一组的第1个。', '第11个是这一组的第3个图形：□。'],
  numbers: [11, 4], difficulty: 4, role: 'advanced', family: 'g1-u6-four-shape-cycle', tier: 2, method: 'pattern', variantIndex: 1,
});

const u2AddWithin100 = makeProgressionQuestion({ id: 'prog_g1_u2_03', gradeBand: 'G1', unitId: 'g1-u2', skillKey: 'g1-u2:add-subtract-100', domain: 'word_problem_reading', text: '图书角原有36本书，又放进27本。现在有多少本？', answer: 63, answerSchema: { kind: 'integer', min: 0, max: 100 }, answerSentence: '现在有63本。', operation: 'addition', equation: '36+27=63', explanation: '把个位和十位分别相加：6+7=13，向十位进1；3+2+1=6十，所以合计63本。', solutionSteps: ['个位6+7=13，写3并向十位进1。', '十位3+2+1=6。', '总数是63本。'], hints: ['先算个位6+7。', '个位满十要向十位进1。', '十位3+2+1，答案是63。'], numbers: [36, 27], unit: '本', difficulty: 2, role: 'foundation', tier: 1, method: 'representation' });
const u2SubtractWithin100 = makeProgressionQuestion({ id: 'prog_g1_u2_04', gradeBand: 'G1', unitId: 'g1-u2', skillKey: 'g1-u2:add-subtract-100', domain: 'word_problem_reading', text: '盒里有62颗珠子，拿走28颗。盒里还剩多少颗？', answer: 34, answerSchema: { kind: 'integer', min: 0, max: 100 }, answerSentence: '还剩34颗。', operation: 'subtraction', equation: '62−28=34', explanation: '个位2不够减8，从6个十借1个十，变成12−8=4；十位剩5−2=3，所以是34颗。', solutionSteps: ['个位2不够减8，向十位借1个十。', '12−8=4，十位剩5个十。', '5−2=3，还剩34颗。'], hints: ['从个位开始减。', '2不够减8时，向十位借一个十。', '12−8=4，十位计算后得34。'], numbers: [62, 28], unit: '颗', difficulty: 3, role: 'application', tier: 1, method: 'representation' });

export const progressionGrade1Questions: Question[] = [u4ShapeA, u4ShapeB, u4ShapeC, u4ShapeD, u5Time, u5MoneyChallenge, u5ElapsedChallenge, u2Consecutive, u2DigitPuzzle, u1EqualAddends, u1BalanceParts, u3SumAndDifference, u3ComparisonChain, u5MoneyChange, u6PatternCorrectA, u6PatternCorrectB, u2AddWithin100, u2SubtractWithin100];

export const progressionGrade1Metadata: readonly QuestionLearningMetadata[] = [
  ...metadataFor('g1-u1', ['g1-u1:add-within-20', 'g1-u1:subtract-within-20'], {
    foundation: ['g1_01', 'g1_02', 'g1_03'], application: ['g1_04', 'g1_05'],
    advanced: ['g1ll_09', 'g1ll_10'], olympiad: [u1EqualAddends.id, u1BalanceParts.id],
  }, { foundation: 'representation', application: 'representation', advanced: 'inverse', olympiad: 'equivalence' }),
  ...metadataFor('g1-u2', ['g1-u2:number-place-value-100', 'g1-u2:add-subtract-100'], {
    foundation: ['g1ll_11', 'g1ll_12', u2AddWithin100.id], application: ['g1ll_14', u2SubtractWithin100.id, 'g1ll_20'],
    advanced: ['g1ll_16', 'g1ll_18'], olympiad: [u2DigitPuzzle.id, u2Consecutive.id],
  }, { foundation: 'representation', application: 'classification', advanced: 'pattern', olympiad: 'enumeration' }),
  ...metadataFor('g1-u3', ['g1-u3:compare-difference', 'g1-u3:find-unknown'], {
    foundation: ['g1ll_37', 'g1ll_21', 'g1t_07'], application: ['g1ll_38', 'g1ll_42'],
    advanced: ['g1ll_39', 'g1ll_40', u3ComparisonChain.id], olympiad: ['g1ll_44', u3SumAndDifference.id],
  }, { foundation: 'representation', application: 'inverse', advanced: 'inverse', olympiad: 'equivalence' }),
  ...metadataFor('g1-u4', ['g1-u4:plane-shape-features', 'g1-u4:classify-shapes'], {
    foundation: ['g1ll_54', 'g1ll_55', 'g1ll_56'], application: ['g1ll_58', 'g1t_10'],
    advanced: [u4ShapeA.id, u4ShapeB.id], olympiad: [u4ShapeC.id, u4ShapeD.id],
  }, { foundation: 'spatial', application: 'classification', advanced: 'spatial', olympiad: 'spatial' }),
  ...metadataFor('g1-u5', ['g1-u5:rmb-yuan-jiao', 'g1-u5:time-and-quantity'], {
    foundation: ['g1ll_45', 'g1ll_46', 'g1ll_48'], application: ['g1ll_49', 'g1ll_51', u5Time.id],
    advanced: ['g1ll_50', u5MoneyChange.id], olympiad: [u5MoneyChallenge.id, u5ElapsedChallenge.id],
  }, { foundation: 'representation', application: 'inverse', advanced: 'equivalence', olympiad: 'optimization' }),
  ...metadataFor('g1-u6', ['g1-u6:repeat-pattern', 'g1-u6:ordered-enumeration'], {
    foundation: ['g1ll_61', 'g1ll_62', 'g1ll_63'], application: ['g1ll_64', 'g1ll_66', 'g1t_28'],
    advanced: [u6PatternCorrectA.id, u6PatternCorrectB.id], olympiad: ['g1ll_68', 'g1t_27'],
  }, { foundation: 'pattern', application: 'pattern', advanced: 'pattern', olympiad: 'enumeration' }),
].map((entry) => {
  const unitPrereqs: Record<string, string[]> = {
    'g1-u1': [],
    'g1-u2': ['g1-u1:add-within-20', 'g1-u1:subtract-within-20'],
    'g1-u3': ['g1-u1:add-within-20', 'g1-u1:subtract-within-20'],
    'g1-u4': [],
    'g1-u5': ['g1-u1:add-within-20'],
    'g1-u6': [],
  };
  const authored = progressionGrade1Questions.find((question) => question.id === entry.questionId);
  const source = [...g1Questions, ...g1LowerLateQuestions, ...g1ThinkingQuestions].find((question) => question.id === entry.questionId);
  const explicitTargets: Record<string, string[]> = {
    g1ll_66: ['g1-u6:repeat-pattern'],
    g1t_27: ['g1-u6:ordered-enumeration'],
    g1t_28: ['g1-u6:ordered-enumeration'],
  };
  const targetSkillKeys = explicitTargets[entry.questionId] ?? authored?.curriculumSkillIds ?? (source ? [inferTargetSkill(entry.unitId, source)] : entry.targetSkillKeys);
  return { ...entry, targetSkillKeys, prerequisiteSkillKeys: unitPrereqs[entry.unitId] };
});

