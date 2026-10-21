import type { Question } from '@/lib/types';
import { makeTransferEntry } from './helpers';
import { buildUpperArithmeticBatch, type UpperArithmeticRecipe } from './legacy-upper';
import type { TransferBatch, TransferExpression, TransferProof, TransferRelation } from './types';

const f = (fact: string) => ({ fact });
const op = (name: 'add'|'sub'|'mul'|'div'|'floor'|'ceil'|'pow'|'min'|'max', ...args: TransferExpression[]): TransferExpression => ({ op: name, args });
const recipes: UpperArithmeticRecipe[] = [
  {id:'g4_01',tree:op('mul',f('speed'),f('hours')),sourceFacts:{speed:60,hours:3},sourceAnchors:{speed:'每小时行60千米',hours:'3小时'},facts:{speed:72,hours:4},anchors:{speed:'每小时行72千米',hours:'4小时'},text:'一辆汽车每小时行72千米，4小时行多少千米？',numbers:[72,4],unit:'千米',relationText:'速度乘行驶时间',sourceAnswer:180},
  {id:'g4_02',tree:op('mul',f('length'),f('width')),sourceFacts:{length:12,width:8},sourceAnchors:{length:'长12米',width:'宽8米'},facts:{length:14,width:9},anchors:{length:'长14米',width:'宽9米'},text:'一个长方形花坛长14米、宽9米，它的面积是多少平方米？',numbers:[14,9],unit:'平方米',relationText:'长乘宽求长方形面积',sourceAnswer:96},
  {id:'g4_03',tree:op('mul',f('price'),f('books')),sourceFacts:{price:12.5,books:4},sourceAnchors:{price:'价格是12.5元',books:'买了4本'},facts:{price:13.5,books:4},anchors:{price:'价格是13.5元',books:'买了4本'},text:'一本图书的价格是13.5元，小红买了4本，一共需要多少元？',numbers:[13.5,4],unit:'元',relationText:'单价乘数量',sourceAnswer:50,decimals:1},
  {id:'g4_04',tree:op('add',f('apples'),op('div',f('apples'),f('multiple'))),sourceFacts:{apples:120,multiple:3},sourceAnchors:{apples:'有苹果树120棵',multiple:'是梨树的3倍'},facts:{apples:132,multiple:3},anchors:{apples:'有苹果树132棵',multiple:'是梨树的3倍'},text:'果园里有苹果树132棵，是梨树的3倍。苹果树和梨树一共有多少棵？',numbers:[132,3],unit:'棵',relationText:'苹果树棵数加梨树棵数',sourceAnswer:160},
  {id:'g4_15',tree:op('div',op('mul',f('lengthMeters'),100),f('segmentCm')),sourceFacts:{lengthMeters:4,segmentCm:25},sourceAnchors:{lengthMeters:'钢管长4米',segmentCm:'每段长25厘米'},facts:{lengthMeters:5,segmentCm:25},anchors:{lengthMeters:'钢管长5米',segmentCm:'每段长25厘米'},text:'一根钢管长5米，截成每段长25厘米的短管，可以截成几段？',numbers:[5,25],unit:'段',relationText:'钢管米数换算成厘米后除以每段长度',sourceAnswer:16},
  {id:'g4_16',tree:op('add',op('mul',f('appleKg'),f('applePrice')),op('mul',f('berryKg'),f('berryPrice'))),sourceFacts:{appleKg:3,applePrice:8,berryKg:2,berryPrice:15},sourceAnchors:{appleKg:'买了3千克苹果',applePrice:'每千克8元',berryKg:'买了2千克草莓',berryPrice:'每千克15元'},facts:{appleKg:4,applePrice:8,berryKg:3,berryPrice:11},anchors:{appleKg:'买了4千克苹果',applePrice:'每千克8元',berryKg:'买了3千克草莓',berryPrice:'每千克11元'},text:'妈妈去超市买了4千克苹果，每千克8元；买了3千克草莓，每千克11元。妈妈一共花了多少元？',numbers:[4,8,3,11],unit:'元',relationText:'两种水果分别按重量乘单价，再合计',sourceAnswer:54},
  {id:'g4_18',tree:op('sub',op('add',f('math'),f('chineseExtra')),f('englishLess')),sourceFacts:{math:25,chineseExtra:8,englishLess:5},sourceAnchors:{math:'数学作业用了25分钟',chineseExtra:'语文作业比数学多用了8分钟',englishLess:'英语作业比语文少用了5分钟'},facts:{math:32,chineseExtra:9,englishLess:6},anchors:{math:'数学作业用了32分钟',chineseExtra:'语文作业比数学多用了9分钟',englishLess:'英语作业比语文少用了6分钟'},text:'周末阳光明媚，小鸟在窗外唱歌。小明做数学作业用了32分钟，做语文作业比数学多用了9分钟，做英语作业比语文少用了6分钟。小明做英语作业用了多少分钟？',numbers:[32,9,6],unit:'分钟',relationText:'数学作业时间加语文多用时间，再减英语少用时间',sourceAnswer:28},
  {id:'g4_07',tree:op('add',op('mul',f('daily'),f('days')),f('remaining')),sourceFacts:{daily:85,days:12,remaining:320},sourceAnchors:{daily:'每天修85米',days:'修了12天',remaining:'还剩下320米'},facts:{daily:63,days:10,remaining:210},anchors:{daily:'每天修63米',days:'修了10天',remaining:'还剩下210米'},text:'工人叔叔修一条公路，每天修63米，已经修了10天，还剩下210米没修。这条公路全长多少米？',numbers:[63,10,210],unit:'米',relationText:'已修长度加剩余长度',sourceAnswer:1340},
  {id:'g4_08',tree:op('mul',op('mul',f('length'),f('width')),f('perArea')),sourceFacts:{length:200,width:150,perArea:4},sourceAnchors:{length:'长200米',width:'宽150米',perArea:'每平方米种4棵白菜'},facts:{length:180,width:120,perArea:5},anchors:{length:'长180米',width:'宽120米',perArea:'每平方米种5棵白菜'},text:'一块地长180米、宽120米。如果每平方米种5棵白菜，这块地一共可以种多少棵白菜？',numbers:[180,120,5],unit:'棵',relationText:'长乘宽求面积，再乘每平方米棵数',sourceAnswer:120000},
  {id:'g4_12',tree:op('mul',op('mul',op('mul',f('base'),f('height')),0.5),f('perArea')),sourceFacts:{base:10,height:6,perArea:3},sourceAnchors:{base:'底边长10米',height:'高6米',perArea:'每平方米种3棵小花'},facts:{base:12,height:8,perArea:2},anchors:{base:'底边长12米',height:'高8米',perArea:'每平方米种2棵小花'},text:'一个三角形花坛底边长12米，高8米。如果每平方米种2棵小花，这个花坛可以种多少棵？',numbers:[12,8,2],unit:'棵',relationText:'底乘高除以2求面积，再乘每平方米棵数',sourceAnswer:90},
  {id:'g4_14',tree:op('sub',f('full'),f('poured')),sourceFacts:{full:2.5,poured:0.8},sourceAnchors:{full:'果汁2.5升',poured:'倒出了0.8升'},facts:{full:3.6,poured:1.8},anchors:{full:'果汁3.6升',poured:'倒出了1.8升'},text:'一瓶果汁3.6升，倒出了1.8升，瓶里还剩多少升果汁？',numbers:[3.6,1.8],unit:'升',relationText:'原有果汁减去倒出量',sourceAnswer:1.7,decimals:1},
  {id:'g4_19',tree:op('mul',f('perMinute'),f('minutes')),sourceFacts:{perMinute:60,minutes:45},sourceAnchors:{perMinute:'每分钟打60个字',minutes:'打了45分钟'},facts:{perMinute:72,minutes:35},anchors:{perMinute:'每分钟打72个字',minutes:'打了35分钟'},text:'工作总量 = 工作效率 × 时间。一位打字员每分钟打72个字，打了35分钟，一共打了多少个字？',numbers:[72,35],unit:'个字',relationText:'每分钟字数乘分钟数',sourceAnswer:2700},
  {id:'g4_21',tree:op('div',op('mul',f('boxes'),f('perBox')),f('classes')),sourceFacts:{boxes:5,perBox:24,classes:6},sourceAnchors:{boxes:'买了5箱饮料',perBox:'每箱24瓶',classes:'分给6个班级'},facts:{boxes:6,perBox:28,classes:7},anchors:{boxes:'买了6箱饮料',perBox:'每箱28瓶',classes:'分给7个班级'},text:'学校一年一度的义卖活动热闹极了，家长们都来帮忙布置摊位。买了6箱饮料，每箱28瓶，平均分给7个班级，每班分到多少瓶？',numbers:[6,28,7],unit:'瓶',relationText:'总瓶数除以班级数',sourceAnswer:20},
  {id:'g4_22',tree:op('mul',f('length'),f('width')),sourceFacts:{length:15,width:8},sourceAnchors:{length:'长15米',width:'宽8米'},facts:{length:18,width:7},anchors:{length:'长18米',width:'宽7米'},text:'爷爷家的菜园子绿油油的，一眼望过去都是新鲜的蔬菜。一块长方形菜地长18米，宽7米，面积是多少平方米？',numbers:[18,7],unit:'平方米',relationText:'长乘宽求长方形面积',sourceAnswer:120},
  {id:'g4_24',tree:op('mul',op('mul',f('length'),2),f('roundTrips')),sourceFacts:{length:50,roundTrips:4},sourceAnchors:{length:'游泳池长50米',roundTrips:'游了4个来回'},facts:{length:55,roundTrips:5},anchors:{length:'游泳池长55米',roundTrips:'游了5个来回'},text:'游泳馆里水花四溅，孩子们游得可欢了。一个游泳池长55米，小华游了5个来回，一共游了多少米？',numbers:[55,5],unit:'米',relationText:'池长乘往返两程再乘来回数',sourceAnswer:400},
  {id:'g4_25',tree:op('mul',f('speed'),f('hours')),sourceFacts:{speed:80,hours:3},sourceAnchors:{speed:'每小时行80千米',hours:'用了3小时'},facts:{speed:75,hours:4},anchors:{speed:'每小时行75千米',hours:'用了4小时'},text:'国庆节到了，大街上到处挂满了五星红旗，喜气洋洋。一辆大巴车每小时行75千米，从A城到B城用了4小时，两城相距多少千米？',numbers:[75,4],unit:'千米',relationText:'速度乘时间',sourceAnswer:240},
  {id:'g4o_04',tree:op('div',op('mul',f('leadSpeed'),f('leadMinutes')),op('sub',f('chaserSpeed'),f('leadSpeed'))),sourceFacts:{leadSpeed:60,leadMinutes:10,chaserSpeed:80},sourceAnchors:{leadSpeed:'小明每分钟走60米',leadMinutes:'先出发10分钟',chaserSpeed:'小红每分钟走80米'},facts:{leadSpeed:50,leadMinutes:12,chaserSpeed:75},anchors:{leadSpeed:'小明每分钟走50米',leadMinutes:'先出发12分钟',chaserSpeed:'小红每分钟走75米'},text:'小明每分钟走50米，先出发12分钟。小红每分钟走75米同方向追。几分钟追上？',numbers:[50,12,75],unit:'分钟',relationText:'先行距离除以速度差',sourceAnswer:30},
  {id:'g4o_05',tree:op('div',op('mul',f('truckSpeed'),f('headStart')),op('sub',f('carSpeed'),f('truckSpeed'))),sourceFacts:{carSpeed:90,truckSpeed:60,headStart:2},sourceAnchors:{carSpeed:'轿车每小时90千米',truckSpeed:'货车每小时60千米',headStart:'货车先出发2小时'},facts:{carSpeed:96,truckSpeed:72,headStart:3},anchors:{carSpeed:'轿车每小时96千米',truckSpeed:'货车每小时72千米',headStart:'货车先出发3小时'},text:'轿车每小时96千米，货车每小时72千米。货车先出发3小时，轿车同方向追。几小时追上？',numbers:[96,72,3],unit:'小时',relationText:'货车先行路程除以速度差',sourceAnswer:4},
  {id:'g4o_27',tree:op('sub',op('mul',f('targetAverage'),5),op('mul',f('pastAverage'),4)),sourceFacts:{pastAverage:85,targetAverage:88},sourceAnchors:{pastAverage:'前4次数学测验平均85分',targetAverage:'平均分达到88分'},facts:{pastAverage:80,targetAverage:75},anchors:{pastAverage:'前4次数学测验平均80分',targetAverage:'平均分达到75分'},text:'小明前4次数学测验平均80分。第5次考多少分能使5次测验的平均分达到75分？（每次满分100分。）',numbers:[80,75,100],unit:'分',relationText:'先算达到目标平均分所需的总分，再减去前四次实际总分',sourceAnswer:100},
  {id:'g4o_01',tree:op('div',f('distance'),op('add',f('speedA'),f('speedB'))),sourceFacts:{distance:360,speedA:50,speedB:40},sourceAnchors:{distance:'相距360千米',speedA:'每小时行50千米',speedB:'每小时行40千米'},facts:{distance:400,speedA:40,speedB:40},anchors:{distance:'相距400千米',speedA:'每小时行40千米',speedB:'每小时行40千米'},text:'甲乙两地相距400千米。A车从甲地每小时行40千米，B车从乙地每小时行40千米，两车同时相向而行。几小时后相遇？',numbers:[400,40,40],unit:'小时',relationText:'路程除以相向速度和',sourceAnswer:4},
  {id:'g4o_02',tree:op('div',f('distance'),op('add',f('speedA'),f('speedB'))),sourceFacts:{distance:480,speedA:65,speedB:55},sourceAnchors:{distance:'相距480米',speedA:'每分钟走65米',speedB:'每分钟走55米'},facts:{distance:700,speedA:75,speedB:65},anchors:{distance:'相距700米',speedA:'每分钟走75米',speedB:'每分钟走65米'},text:'小明和小红从相距700米的两地同时出发，相向而行。小明每分钟走75米，小红每分钟走65米。几分钟后相遇？',numbers:[700,75,65],unit:'分钟',relationText:'路程除以相向速度和',sourceAnswer:4},
  {id:'g4o_03',tree:op('div',f('distance'),op('add',f('speedA'),f('speedB'))),sourceFacts:{distance:520,speedA:80,speedB:50},sourceAnchors:{distance:'相距520千米',speedA:'快车每小时80千米',speedB:'慢车每小时50千米'},facts:{distance:700,speedA:90,speedB:50},anchors:{distance:'相距700千米',speedA:'快车每小时90千米',speedB:'慢车每小时50千米'},text:'两列火车从相距700千米的两城同时相向开出。快车每小时90千米，慢车每小时50千米。几小时相遇？',numbers:[700,90,50],unit:'小时',relationText:'路程除以相向速度和',sourceAnswer:4},
  {id:'g4o_12',tree:op('mul',f('storyBooks'),f('scienceBooks')),sourceFacts:{storyBooks:3,scienceBooks:4},sourceAnchors:{storyBooks:'从3本不同的故事书',scienceBooks:'和4本不同的科普书'},facts:{storyBooks:5,scienceBooks:6},anchors:{storyBooks:'从5本不同的故事书',scienceBooks:'和6本不同的科普书'},text:'从5本不同的故事书和6本不同的科普书中各选1本。有几种选法？',numbers:[5,6],unit:'种',relationText:'两类书的选择数相乘',sourceAnswer:12},
  {id:'g4o_24',tree:op('div',op('mul',f('last'),op('add',f('last'),1)),2),sourceFacts:{last:100},sourceAnchors:{last:'100'},facts:{last:120},anchors:{last:'120'},text:'计算1+2+3+...+119+120。高斯是怎么算的？',numbers:[120],unit:'',relationText:'末项乘末项加1再除以2',sourceAnswer:5050},
  {id:'g4_10',tree:op('mul',op('add',f('boys'),f('girls')),f('classes')),sourceFacts:{classes:6,boys:4,girls:4},sourceAnchors:{classes:'有6个班参加接力赛',boys:'每班派出4名男生和4名女生',girls:'每班派出4名男生和4名女生'},facts:{classes:7,boys:5,girls:3},anchors:{classes:'有7个班参加接力赛',boys:'每班派出5名男生和3名女生',girls:'每班派出5名男生和3名女生'},text:'春季运动会真是热闹极了，操场上彩旗飘飘。四年级有7个班参加接力赛，每班派出5名男生和3名女生。四年级一共有多少名同学参加接力赛？',numbers:[7,5,3],unit:'名',relationText:'先合并每班男女生人数，再乘班数',sourceAnswer:48},
  {id:'extra_03',tree:op('div',f('books'),f('grades')),sourceFacts:{books:184,grades:4},sourceAnchors:{books:'有184本书',grades:'分给4个年级'},facts:{books:216,grades:4},anchors:{books:'有216本书',grades:'分给4个年级'},text:'学校图书馆有216本书要分给4个年级，图书馆长说每个书架能放50本书，每个年级能分到几本书？',numbers:[216,4],unit:'本',relationText:'图书总数平均分给年级数',sourceAnswer:46},
  {id:'extra_04',tree:op('mul',f('perRow'),f('rows')),sourceFacts:{perRow:8,rows:12},sourceAnchors:{perRow:'每排站8人',rows:'一共站12排'},facts:{perRow:9,rows:11},anchors:{perRow:'每排站9人',rows:'一共站11排'},text:'运动会方阵表演，每排站9人，一共站11排，体育老师今年35岁，方阵一共有多少人？',numbers:[9,11,35],unit:'人',relationText:'每排人数乘排数',sourceAnswer:96},
];
export function buildLegacyGrade4Transfers(sources: readonly Question[]): TransferBatch {
  const batch = buildUpperArithmeticBatch(sources, 'G4', recipes);
  const threeTimesSource = sources.find(question => question.id === 'g4o_06' && question.gradeBand === 'G4');
  if (threeTimesSource && String(threeTimesSource.answer).includes('甲36乙10')) {
    const yi = op('div', op('sub', f('difference'), f('extra')), op('sub', f('times'), 1));
    const result = { jia: op('add', op('mul', f('times'), yi), f('extra')), yi };
    const sourceFacts = { times: 3, extra: 6, difference: 26 }, sourceAnchors = { times: '甲数比乙数的3倍', extra: '多6', difference: '甲比乙大26' };
    const facts = { times: 4, extra: 5, difference: 35 }, anchors = { times: '甲数比乙数的4倍', extra: '多5', difference: '甲比乙大35' };
    const relation: TransferRelation = { family: 'legacy-g4o_06', targetRole: '甲数和乙数', roles: ['times', 'extra', 'difference'], operations: ['先由两数差减去多出的常数，再除以倍数差求乙数；甲数=倍数×乙数+常数'], units: ['数'], invariants: ['保留倍数关系和加数关系联立求两数', '两个数都由题干中的差与倍数条件求出', '答案包含甲乙两个字段'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(threeTimesSource, {
      text: '甲数比乙数的4倍多5，甲比乙大35。甲乙各多少？', numbers: [4, 5, 35], answer: '甲45乙10', answerType: 'multi_answer',
      subAnswers: [{ id: 'jia', label: '甲数', answer: 45 }, { id: 'yi', label: '乙数', answer: 10 }], equation: '(35-5)÷(4-1)=10；4×10+5=45',
      answerSentence: '甲45，乙10。', explanation: '甲比乙多出的部分是乙的3倍加5，等于35。乙=(35-5)÷(4-1)=10；甲=4×10+5=45。验证：45-10=35。',
      solutionSteps: ['先去掉常数差：35-5=30', '乙数：30÷(4-1)=10', '甲数：4×10+5=45'], hints: ['把甲数写成“倍数×乙数+常数”，再用甲乙差列式。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const surplusSource = sources.find(question => question.id === 'g4o_08' && question.gradeBand === 'G4');
  if (surplusSource && String(surplusSource.answer).includes('4人26个')) {
    const people = op('div', op('sub', f('extraA'), f('extraB')), op('sub', f('perB'), f('perA')));
    const result = { people, apples: op('add', op('mul', f('perA'), people), f('extraA')) };
    const sourceFacts = { perA: 4, extraA: 10, perB: 6, extraB: 2 }, sourceAnchors = { perA: '每人4个', extraA: '多10个', perB: '每人6个', extraB: '多2个' };
    const facts = { perA: 6, extraA: 11, perB: 7, extraB: 2 }, anchors = { perA: '每人6个', extraA: '多11个', perB: '每人7个', extraB: '多2个' };
    const relation: TransferRelation = { family: 'legacy-g4o_08', targetRole: '分苹果的人数和苹果总数', roles: ['perA', 'extraA', 'perB', 'extraB'], operations: ['两种分法剩余量之差除以每人分配数之差求人数，再求苹果总数'], units: ['人', '个'], invariants: ['保留两种分法均有剩余的盈盈关系', '人数和苹果总数两个答案字段', '总苹果数由任一已知分法计算'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(surplusSource, {
      text: '分苹果。每人6个多11个，每人7个多2个。几人？几个苹果？', numbers: [6, 11, 7, 2], answer: '9人65个', answerType: 'multi_answer',
      subAnswers: [{ id: 'people', label: '人数', answer: 9 }, { id: 'apples', label: '苹果数', answer: 65 }], equation: '(11-2)÷(7-6)=9人；6×9+11=65个',
      answerSentence: '9人，65个苹果。', explanation: '两种分法的剩余量相差11-2=9个，每人分配数相差7-6=1个，所以人数为9÷1=9人。苹果总数：6×9+11=65个。',
      solutionSteps: ['剩余量差：11-2=9', '每人分配量差：7-6=1', '人数：9÷1=9', '苹果：6×9+11=65'], hints: ['用两次分法的剩余量之差除以每人分配量之差求人数。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const shortageSource = sources.find(question => question.id === 'g4o_09' && question.gradeBand === 'G4');
  if (shortageSource && String(shortageSource.answer).includes('10人42本')) {
    const people = op('div', op('add', f('short'), f('surplus')), op('sub', f('perA'), f('perB')));
    const result = { people, books: op('sub', op('mul', f('perA'), people), f('short')) };
    const sourceFacts = { perA: 5, short: 8, perB: 4, surplus: 2 }, sourceAnchors = { perA: '每人5本', short: '少8本', perB: '每人4本', surplus: '多2本' };
    const facts = { perA: 6, short: 7, perB: 5, surplus: 3 }, anchors = { perA: '每人6本', short: '少7本', perB: '每人5本', surplus: '多3本' };
    const relation: TransferRelation = { family: 'legacy-g4o_09', targetRole: '分书人数和书本总数', roles: ['perA', 'short', 'perB', 'surplus'], operations: ['一亏一盈的亏盈总差除以分配数差求人数，再由亏损条件求书本总数'], units: ['人', '本'], invariants: ['保留一亏一盈分配模型', '人数和书本总数两个答案字段', '亏损及盈余条件均参与求解'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(shortageSource, {
      text: '分书。每人6本少7本，每人5本多3本。几人？几本书？', numbers: [6, 7, 5, 3], answer: '10人53本', answerType: 'multi_answer',
      subAnswers: [{ id: 'people', label: '人数', answer: 10 }, { id: 'books', label: '书数', answer: 53 }], equation: '(7+3)÷(6-5)=10人；6×10-7=53本',
      answerSentence: '10人，53本书。', explanation: '一亏一盈：亏盈合计7+3=10本，每人分配数相差6-5=1本，所以人数为10÷1=10人。书本总数：6×10-7=53本。',
      solutionSteps: ['亏盈合计：7+3=10', '每人分配数之差：6-5=1', '人数：10÷1=10', '书本总数：6×10-7=53'], hints: ['一亏一盈时，把亏数和盈数相加，再除以每人分配数之差。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const animalsSource = sources.find(question => question.id === 'g4o_14' && question.gradeBand === 'G4');
  if (animalsSource && String(animalsSource.answer).includes('鸡16兔11')) {
    const rabbits = op('div', op('sub', f('legs'), op('mul', 2, f('rabbitsMore'))), 6);
    const result = { ji: op('add', rabbits, f('rabbitsMore')), tu: rabbits };
    const sourceFacts = { rabbitsMore: 5, legs: 76 }, sourceAnchors = { rabbitsMore: '鸡比兔多5只', legs: '共76条腿' };
    const facts = { rabbitsMore: 4, legs: 68 }, anchors = { rabbitsMore: '鸡比兔多4只', legs: '共68条腿' };
    const relation: TransferRelation = { family: 'legacy-g4o_14', targetRole: '鸡和兔的只数', roles: ['rabbitsMore', 'legs'], operations: ['总腿数减去多出的鸡对应的腿数，再除以每增加一只兔子相对鸡的腿数差'], units: ['只'], invariants: ['鸡兔两类动物数量由总腿数和数量差确定', '同时给出鸡和兔的只数', '分别验证总数差和腿数关系'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(animalsSource, {
      text: '鸡兔同笼，鸡比兔多4只，共68条腿。鸡兔各几只？', numbers: [4, 68], answer: '鸡14兔10', answerType: 'multi_answer',
      subAnswers: [{ id: 'ji', label: '鸡', answer: 14 }, { id: 'tu', label: '兔', answer: 10 }], equation: '设兔10只、鸡14只；14×2+10×4=68', answerSentence: '鸡14只，兔10只。',
      explanation: '设兔有r只，则鸡有r+4只。腿数关系是2(r+4)+4r=68，解得r=10，所以鸡有14只。', solutionSteps: ['设兔为r，鸡为r+4', '列腿数关系：2(r+4)+4r=68', '解得兔10只，鸡14只', '验算：14×2+10×4=68'], hints: ['用兔的只数表示鸡的只数，再根据总腿数列式。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const spidersSource = sources.find(question => question.id === 'g4o_15' && question.gradeBand === 'G4');
  if (spidersSource && String(spidersSource.answer).includes('蜘蛛5蜻蜓13')) {
    const spiders = op('div', op('sub', f('legs'), op('mul', f('dragonflyLegs'), f('animals'))), op('sub', f('spiderLegs'), f('dragonflyLegs')));
    const result = { spider: spiders, dragonfly: op('sub', f('animals'), spiders) };
    const sourceFacts = { spiderLegs: 8, dragonflyLegs: 6, animals: 18, legs: 118 }, sourceAnchors = { spiderLegs: '蜘蛛8条腿', dragonflyLegs: '蜻蜓6条腿', animals: '共18只', legs: '118条腿' };
    const facts = { spiderLegs: 8, dragonflyLegs: 6, animals: 26, legs: 168 }, anchors = { spiderLegs: '蜘蛛8条腿', dragonflyLegs: '蜻蜓6条腿', animals: '共26只', legs: '168条腿' };
    const relation: TransferRelation = { family: 'legacy-g4o_15', targetRole: '蜘蛛和蜻蜓的只数', roles: ['spiderLegs', 'dragonflyLegs', 'animals', 'legs'], operations: ['总腿数减去全部按蜻蜓腿数计算的腿数，再除以每只蜘蛛多出的腿数'], units: ['只'], invariants: ['根据总只数和总腿数求两类动物数量', '保留蜘蛛数和蜻蜓数两个答案', '翅膀数量作为独立校验事实保留'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(spidersSource, {
      text: '蜘蛛8条腿，蜻蜓6条腿、2对翅。共26只，168条腿，40对翅。各几只？', numbers: [8, 6, 2, 26, 168, 40], answer: '蜘蛛6蜻蜓20', answerType: 'multi_answer',
      subAnswers: [{ id: 'spider', label: '蜘蛛', answer: 6 }, { id: 'dragonfly', label: '蜻蜓', answer: 20 }], equation: '设蜘蛛x只：8x+6(26-x)=168，得x=6；蜻蜓20只', answerSentence: '蜘蛛6只，蜻蜓20只。',
      explanation: '设蜘蛛x只，蜻蜓26-x只。由腿数：8x+6(26-x)=168，解得x=6，蜻蜓为20只。检验：6×8+20×6=168，20×2=40对翅。',
      solutionSteps: ['设蜘蛛x只，蜻蜓26-x只', '由总腿数列式：8x+6(26-x)=168', '解得蜘蛛6只、蜻蜓20只', '验算腿数和翅膀数'], hints: ['先由总只数和总腿数列方程，再用翅膀数检查蜻蜓只数。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const boatSource = sources.find(question => question.id === 'g4o_17' && question.gradeBand === 'G4');
  if (boatSource && String(boatSource.answer).includes('4h,6h')) {
    const result = { downstream: op('div', f('distance'), op('add', f('still'), f('current'))), upstream: op('div', f('distance'), op('sub', f('still'), f('current'))) };
    const sourceFacts = { still: 15, current: 3, distance: 72 }, sourceAnchors = { still: '静水中每小时15千米', current: '水流每小时3千米', distance: '72千米' };
    const facts = { still: 14, current: 4, distance: 90 }, anchors = { still: '静水中每小时14千米', current: '水流每小时4千米', distance: '90千米' };
    const relation: TransferRelation = { family: 'legacy-g4o_17', targetRole: '顺水和逆水航行时间', roles: ['still', 'current', 'distance'], operations: ['顺水速度=静水速度+水流速度；逆水速度=静水速度-水流速度；时间=路程÷速度'], units: ['小时'], invariants: ['同时计算顺水与逆水两个方向', '船速与水速组合关系保持不变', '两程路程相同'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(boatSource, {
      text: '船在静水中每小时14千米，水流每小时4千米。顺水航行90千米需几小时？逆水返回需几小时？', numbers: [14, 4, 90], answer: '5h,9h', answerType: 'multi_answer',
      subAnswers: [{ id: 'downstream', label: '顺水', answer: 5 }, { id: 'upstream', label: '逆水', answer: 9 }], equation: '顺水：90÷(14+4)=5小时；逆水：90÷(14-4)=9小时', answerSentence: '顺水5小时，逆水9小时。',
      explanation: '顺水速度=14+4=18千米/小时，时间=90÷18=5小时。逆水速度=14-4=10千米/小时，时间=90÷10=9小时。',
      solutionSteps: ['顺水速度：14+4=18，时间：90÷18=5小时', '逆水速度：14-4=10，时间：90÷10=9小时'], hints: ['顺水把水流速度加上，逆水把水流速度减去。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const decimalPair = sources.find(question => question.id === 'g4_05' && question.gradeBand === 'G4');
  if (decimalPair && String(decimalPair.answer).includes('多6.7元')) {
    const result = { diff: op('sub', f('red'), f('blue')), total: op('add', f('red'), f('blue')) };
    const sourceFacts = { red: 15.6, blue: 8.9 }, sourceAnchors = { red: '小红有15.6元', blue: '小明有8.9元' };
    const facts = { red: 17.2, blue: 9.8 }, anchors = { red: '小红有17.2元', blue: '小明有9.8元' };
    const relation: TransferRelation = { family: 'legacy-g4_05', targetRole: '两人的钱数之差和合计', roles: ['red', 'blue'], operations: ['较多钱数减较少钱数求差，两人钱数相加求总额'], units: ['元'], invariants: ['同一组数分别回答差与和', '保留差和总额两个答案字段', '金额运算保留一位小数'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(decimalPair, {
      text: '小红有17.2元，小明有9.8元，小红比小明多多少元？两人一共有多少元？', numbers: [17.2, 9.8], answer: '多7.4元，共27.0元', answerType: 'multi_answer',
      subAnswers: [{ id: 'diff', label: '多多少', answer: 7.4, unit: '元' }, { id: 'total', label: '总共', answer: 27, unit: '元' }],
      equation: '17.2-9.8=7.4；17.2+9.8=27.0', answerSentence: '小红比小明多7.4元，两人一共有27.0元。',
      explanation: '相差：17.2-9.8=7.4元。合计：17.2+9.8=27.0元。', solutionSteps: ['比多少：17.2-9.8=7.4元', '一共：17.2+9.8=27.0元'], hints: ['小数点对齐后，分别做减法和加法。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const tileSource = sources.find(question => question.id === 'g4_06' && question.gradeBand === 'G4');
  if (tileSource && String(tileSource.answer).includes('面积900平方厘米')) {
    const tileArea = op('mul', f('edge'), f('edge'));
    const groundArea = op('mul', op('mul', f('lengthMeters'), 100), op('mul', f('widthMeters'), 100));
    const result = { area: tileArea, count: op('ceil', op('div', groundArea, tileArea)) };
    const sourceFacts = { edge: 30, lengthMeters: 3, widthMeters: 2 };
    const sourceAnchors = { edge: '边长是30厘米', lengthMeters: '长3米', widthMeters: '宽2米' };
    const facts = { edge: 31, lengthMeters: 4, widthMeters: 2 };
    const anchors = { edge: '边长是31厘米', lengthMeters: '长4米', widthMeters: '宽2米' };
    const relation: TransferRelation = { family: 'legacy-g4_06', targetRole: '单块地砖面积和估算购砖数', roles: ['edge', 'lengthMeters', 'widthMeters'], operations: ['正方形边长平方求砖面积；地面长宽换成厘米后除以单块面积并向上取整'], units: ['平方厘米', '块'], invariants: ['保留地砖面积和整块购砖数两个答案', '单位统一为厘米后按总面积估算', '允许裁切拼接且忽略切割损耗'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(tileSource, {
      text: '一块正方形地砖的边长是31厘米，它的面积是多少平方厘米？铺一个长4米、宽2米的地面，按总面积估算，忽略切割损耗且允许裁切拼接，至少需购多少整块地砖？', numbers: [31, 4, 2],
      answer: '面积961平方厘米，至少购84整块', answerType: 'multi_answer',
      subAnswers: [{ id: 'area', label: '面积', answer: 961, unit: '平方厘米' }, { id: 'count', label: '块数', answer: 84, unit: '块' }],
      equation: '31×31=961；(400×200)÷961≈83.25，向上取整得84', answerSentence: '每块地砖面积961平方厘米，按总面积估算至少需购84整块。',
      explanation: '单块面积：31×31=961平方厘米。地面统一成厘米后为400×200=80000平方厘米。80000÷961≈83.25，购买整块数向上取整为84块。题目允许裁切拼接并忽略切割损耗，因此按总面积估算。',
      solutionSteps: ['单块面积：31×31=961平方厘米', '统一单位：4米=400厘米，2米=200厘米', '地面面积：400×200=80000平方厘米', '80000÷961≈83.25，向上取整为84块'], hints: ['先统一长度单位，再求单块面积；整块地砖数按总面积向上取整。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const yogurtSource = sources.find(question => question.id === 'g4_09' && question.gradeBand === 'G4');
  if (yogurtSource && String(yogurtSource.answer).includes('6000毫升=6升')) {
    const ml = op('mul', f('perBottle'), f('bottles'));
    const result = { ml, liter: op('div', ml, 1000) };
    const sourceFacts = { perBottle: 250, bottles: 24 }, sourceAnchors = { perBottle: '净含量是250毫升', bottles: '一箱有24瓶' };
    const facts = { perBottle: 350, bottles: 20 }, anchors = { perBottle: '净含量是350毫升', bottles: '一箱有20瓶' };
    const relation: TransferRelation = { family: 'legacy-g4_09', targetRole: '整箱酸奶总毫升数和升数', roles: ['perBottle', 'bottles'], operations: ['每瓶毫升数乘瓶数求總量，再除以1000换算升'], units: ['毫升', '升'], invariants: ['保留毫升和升两个等值答案字段', '总量由每瓶容量乘瓶数计算', '1000毫升等于1升'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(yogurtSource, {
      text: '一瓶酸奶的净含量是350毫升，一箱有20瓶，这一箱酸奶一共有多少毫升？合多少升？', numbers: [350, 20], answer: '7000毫升=7升', answerType: 'multi_answer',
      subAnswers: [{ id: 'ml', label: '毫升', answer: 7000, unit: '毫升' }, { id: 'liter', label: '升', answer: 7, unit: '升' }],
      equation: '350×20=7000毫升；7000÷1000=7升', answerSentence: '一共有7000毫升，合7升。',
      explanation: '总量：350×20=7000毫升。1000毫升=1升，所以7000÷1000=7升。', solutionSteps: ['总量：350×20=7000毫升', '换算：7000÷1000=7升'], hints: ['先算整箱的毫升数，再用1000毫升换算成1升。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const pandaSource = sources.find(question => question.id === 'g4_17' && question.gradeBand === 'G4');
  if (pandaSource && String(pandaSource.answer).includes('能吃12天')) {
    const result = { days: op('div', f('supplies'), f('daily')), extra: op('mul', f('daily'), f('additionalDays')) };
    const sourceFacts = { daily: 15, supplies: 180, additionalDays: 3 }, sourceAnchors = { daily: '每天吃15千克竹子', supplies: '准备了180千克竹子', additionalDays: '多喂3天' };
    const facts = { daily: 16, supplies: 240, additionalDays: 4 }, anchors = { daily: '每天吃16千克竹子', supplies: '准备了240千克竹子', additionalDays: '多喂4天' };
    const relation: TransferRelation = { family: 'legacy-g4_17', targetRole: '现有竹子可喂天数和追加竹子量', roles: ['daily', 'supplies', 'additionalDays'], operations: ['现有竹子除以日用量求天数；日用量乘追加天数求追加量'], units: ['天', '千克'], invariants: ['保留两个不同单位的答案字段', '先按现有竹子计算可喂天数', '追加量按每日用量乘增加天数'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(pandaSource, {
      text: '动物园里一只熊猫每天吃16千克竹子，饲养员准备了240千克竹子，够这只熊猫吃几天？如果还要多喂4天，需要再准备多少千克竹子？', numbers: [16, 240, 4], answer: '能吃15天，需追加64千克', answerType: 'multi_answer',
      subAnswers: [{ id: 'days', label: '天数', answer: 15, unit: '天' }, { id: 'extra', label: '追加量', answer: 64, unit: '千克' }],
      equation: '240÷16=15天；16×4=64千克', answerSentence: '够吃15天，再多喂4天需要再准备64千克竹子。',
      explanation: '天数：240÷16=15天。再喂4天需要：16×4=64千克竹子。', solutionSteps: ['现有竹子能喂：240÷16=15天', '4天需要：16×4=64千克'], hints: ['先用现有竹子总量除以每天用量，再算增加天数需要的竹子。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const stationerySource = sources.find(question => question.id === 'g4_23' && question.gradeBand === 'G4');
  if (stationerySource && String(stationerySource.answer).includes('花30元，剩20元')) {
    const spent = op('add', f('pen'), f('notebook'));
    const result = { spent, left: op('sub', f('budget'), spent) };
    const sourceFacts = { budget: 50, pen: 18, notebook: 12 }, sourceAnchors = { budget: '带了50元', pen: '钢笔18元', notebook: '笔记本12元' };
    const facts = { budget: 70, pen: 26, notebook: 14 }, anchors = { budget: '带了70元', pen: '钢笔26元', notebook: '笔记本14元' };
    const relation: TransferRelation = { family: 'legacy-g4_23', targetRole: '文具花费和剩余金额', roles: ['budget', 'pen', 'notebook'], operations: ['两件文具价格相加，再用带的钱减去花费'], units: ['元'], invariants: ['同时回答已花和剩余金额', '剩余由预算减去两项花费', '背景描写不进入数量关系'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(stationerySource, {
      text: '文具店的橱窗布置得特别漂亮，吸引了许多小朋友。小明带了70元，买了一支钢笔26元，又买了一本笔记本14元，他花了多少钱？还剩多少钱？', numbers: [70, 26, 14], answer: '花40元，剩30元', answerType: 'multi_answer',
      subAnswers: [{ id: 'spent', label: '花了', answer: 40, unit: '元' }, { id: 'left', label: '剩', answer: 30, unit: '元' }], equation: '26+14=40元；70-40=30元', answerSentence: '他一共花了40元，还剩30元。',
      explanation: '橱窗和小朋友是背景描写。先算花的：26+14=40元，再算剩余：70-40=30元。', solutionSteps: ['花费：26+14=40元', '剩余：70-40=30元'], hints: ['先把两件文具价格相加，再从带的钱里减去。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const source = sources.find(question => question.id === 'g4_11' && question.gradeBand === 'G4');
  if (source && String(source.answer) === '销售额256元，利润102.4元') {
    const f = (fact: string): TransferExpression => ({ fact });
    const op = (name: 'add'|'sub'|'mul'|'div', ...args: TransferExpression[]): TransferExpression => ({ op: name, args });
    const result = { revenue: op('mul', f('price'), f('quantity')), profit: op('mul', op('sub', f('price'), f('cost')), f('quantity')) };
    const sourceFacts = { price: 2, quantity: 128, cost: 1.2 }, sourceAnchors = { price: '每支售价2元', quantity: '一天卖了128支', cost: '成本是1.2元' };
    const facts = { price: 3, quantity: 120, cost: 1.5 }, anchors = { price: '每支售价3元', quantity: '一天卖了120支', cost: '成本是1.5元' };
    const variantText = '一种铅笔每支售价3元，文具店一天卖了120支，这一天的销售额是多少元？如果每支铅笔的成本是1.5元，利润是多少元？';
    const relation: TransferRelation = { family: 'legacy-g4_11', targetRole: '销售额和总利润', roles: ['price', 'quantity', 'cost'], operations: ['销售额=售价×销量；利润=(售价-成本)×销量'], units: ['元'], invariants: ['两个答案字段与源题含义相同', '销售额与利润分别按已知量计算', '价格保留一位小数'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    const variant = makeTransferEntry(source, {
      text: variantText, numbers: [3, 120, 1.5], answer: '销售额360元，利润180元', answerType: 'multi_answer',
      subAnswers: [{ id: 'revenue', label: '销售额', answer: 360, unit: '元' }, { id: 'profit', label: '利润', answer: 180, unit: '元' }],
      equation: '销售额：3×120=360；利润：(3-1.5)×120=180', answerSentence: '销售额360元，利润180元。',
      explanation: '销售额：3×120=360元。每支利润：3-1.5=1.5元；总利润：1.5×120=180元。',
      solutionSteps: ['销售额：3×120=360元', '每支利润：3-1.5=1.5元', '总利润：1.5×120=180元'], hints: ['先分别求销售额和每支利润，再计算总利润。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) });
    batch.entries.push(variant);
  }
  const busSource = sources.find(question => question.id === 'g4_13' && question.gradeBand === 'G4');
  if (busSource && String(busSource.answer) === '能坐540人，需要12辆') {
    const f = (fact: string): TransferExpression => ({ fact });
    const op = (name: 'mul'|'div'|'ceil', ...args: TransferExpression[]): TransferExpression => ({ op: name, args });
    const result = { capacity: op('mul', f('seats'), f('buses')), needed: op('ceil', op('div', f('students'), f('seats'))) };
    const sourceFacts = { seats: 45, buses: 12, students: 520 }, sourceAnchors = { seats: '客车可以坐45人', buses: '12辆这样的客车', students: '全校有520人出游' };
    const facts = { seats: 54, buses: 12, students: 500 }, anchors = { seats: '客车可以坐54人', buses: '12辆这样的客车', students: '全校有500人出游' };
    const relation: TransferRelation = { family: 'legacy-g4_13', targetRole: '总座位数和所需车辆数', roles: ['seats', 'buses', 'students'], operations: ['总座位数=每车座位×车辆数；车辆数=学生人数除以每车座位后向上取整'], units: ['人', '辆'], invariants: ['保留两个答案字段', '人数无法整除时要增加一辆车', '座位和学生数量均由题干提供'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(busSource, {
      text: '一辆客车可以坐54人，12辆这样的客车可以坐多少人？如果全校有500人出游，需要多少辆这样的客车？', numbers: [54, 12, 500],
      answer: '能坐648人，需要10辆', answerType: 'multi_answer',
      subAnswers: [{ id: 'capacity', label: '能坐', answer: 648, unit: '人' }, { id: 'needed', label: '需要', answer: 10, unit: '辆' }],
      equation: '54×12=648；500÷54=9余14，所以需要10辆', answerSentence: '12辆能坐648人，500人出游需要10辆客车。',
      explanation: '总座位：54×12=648人。所需车辆：500÷54=9余14，有余数还要增加一辆，因此需要10辆。',
      solutionSteps: ['总座位：54×12=648人', '500÷54=9余14', '有余数需增加一辆：9+1=10辆'], hints: ['计算所需车辆时，不能整除就向上增加一辆。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const sequenceSource = sources.find(question => question.id === 'g4o_18' && question.gradeBand === 'G4');
  if (sequenceSource && String(sequenceSource.answer).includes('公差4,第10项44')) {
    const difference = op('div', op('sub', f('knownTerm'), f('first')), op('sub', f('knownIndex'), 1));
    const result = { diff: difference, term10: op('add', f('first'), op('mul', op('sub', f('targetIndex'), 1), difference)) };
    const sourceFacts = { first: 8, knownTerm: 24, knownIndex: 5, targetIndex: 10 }, sourceAnchors = { first: '首项=8', knownTerm: '第5项=24', knownIndex: '第5项', targetIndex: '第10项' };
    const facts = { first: 9, knownTerm: 21, knownIndex: 5, targetIndex: 10 }, anchors = { first: '首项=9', knownTerm: '第5项=21', knownIndex: '第5项', targetIndex: '第10项' };
    const relation: TransferRelation = { family: 'legacy-g4o_18', targetRole: '等差数列的公差和第10项', roles: ['first', 'knownTerm', 'knownIndex', 'targetIndex'], operations: ['两项差除以项数差求公差，再由首项和目标项号求数列项'], units: ['数'], invariants: ['用已知项和首项求同一等差数列公差', '再求目标项', '同时回答公差和目标项'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(sequenceSource, {
      text: '等差数列：首项=9，第5项=21。公差是多少？第10项是多少？', numbers: [9, 5, 21, 10], answer: '公差3,第10项36', answerType: 'multi_answer',
      subAnswers: [{ id: 'diff', label: '公差', answer: 3 }, { id: 'term10', label: '第10项', answer: 36 }], equation: '(21-9)÷(5-1)=3；9+(10-1)×3=36',
      answerSentence: '公差是3，第10项是36。', explanation: '第5项与首项相差21-9=12，对应4个公差，所以公差为3。第10项比首项多9个公差：9+9×3=36。',
      solutionSteps: ['公差：(21-9)÷(5-1)=3', '第10项：9+(10-1)×3=36'], hints: ['先用已知两项的差求公差，再代入目标项公式。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const exchangeSource = sources.find(question => question.id === 'g4o_19' && question.gradeBand === 'G4');
  if (exchangeSource && String(exchangeSource.answer) === '2.25') {
    const result = { answer: op('div', op('div', op('mul', f('apples'), f('orangesPerApples')), f('applesPerGroup')), f('orangesPerPineapple')) };
    const sourceFacts = { apples: 6, applesPerGroup: 2, orangesPerApples: 3, orangesPerPineapple: 4 }, sourceAnchors = { apples: '6个苹果', applesPerGroup: '2个苹果=3个橘子', orangesPerApples: '2个苹果=3个橘子', orangesPerPineapple: '4个橘子=1个菠萝' };
    const facts = { apples: 8, applesPerGroup: 4, orangesPerApples: 3, orangesPerPineapple: 8 }, anchors = { apples: '8个苹果', applesPerGroup: '4个苹果=3个橘子', orangesPerApples: '4个苹果=3个橘子', orangesPerPineapple: '8个橘子=1个菠萝' };
    const relation: TransferRelation = { family: 'legacy-g4o_19', targetRole: '苹果可换算的菠萝个数', roles: ['apples', 'applesPerGroup', 'orangesPerApples', 'orangesPerPineapple'], operations: ['先用等量关系把苹果换成橘子，再按第二个等量关系换算为菠萝'], units: ['个'], invariants: ['保持两步等量代换', '中间量橘子作为桥梁', '允许以小数表示菠萝个数'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(exchangeSource, {
      text: '4个苹果=3个橘子，8个橘子=1个菠萝。8个苹果等于几个菠萝？', numbers: [4, 3, 8, 1, 8], answer: 0.75, answerType: 'number',
      equation: '8×3÷4÷8=6/8=0.75（个）', answerSentence: '8个苹果等于0.75个菠萝。', explanation: '4个苹果换3个橘子，所以8个苹果对应8×3÷4=6个橘子。每8个橘子换1个菠萝，6÷8=0.75个菠萝。',
      solutionSteps: ['苹果换橘子：8×3÷4=6个橘子', '橘子换菠萝：6÷8=0.75个菠萝'], hints: ['先按第一组比例把苹果换成橘子，再按第二组比例把橘子换成菠萝。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const distanceSource = sources.find(question => question.id === 'g4o_22' && question.gradeBand === 'G4');
  if (distanceSource && String(distanceSource.answer) === '2h,2.8h') {
    const speed = op('add', f('speedA'), f('speedB'));
    const result = { before: op('div', op('sub', f('distance'), f('gap')), speed), after: op('div', op('add', f('distance'), f('gap')), speed) };
    const sourceFacts = { distance: 240, gap: 40, speedA: 40, speedB: 60 }, sourceAnchors = { distance: 'AB两地相距240千米', gap: '相距40千米', speedA: '每小时40千米', speedB: '每小时60千米' };
    const facts = { distance: 340, gap: 40, speedA: 40, speedB: 60 }, anchors = { distance: 'AB两地相距340千米', gap: '相距40千米', speedA: '每小时40千米', speedB: '每小时60千米' };
    const relation: TransferRelation = { family: 'legacy-g4o_22', targetRole: '相遇前后相距指定路程的两个时刻', roles: ['distance', 'gap', 'speedA', 'speedB'], operations: ['相遇前用总路程减间距，相遇后用总路程加间距，再除以相向速度和'], units: ['小时'], invariants: ['保留相遇前和相遇后两种情况', '两人相向速度相加', '分别计算两种时刻'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(distanceSource, {
      text: 'AB两地相距340千米。甲从A到B每小时40千米，乙从B到A每小时60千米，同时出发。几小时相距40千米？提示：有两种可能！', numbers: [340, 40, 40, 60], answer: '3h,3.8h', answerType: 'multi_answer',
      subAnswers: [{ id: 'before', label: '相遇前', answer: 3 }, { id: 'after', label: '相遇后', answer: 3.8 }], equation: '(340-40)÷100=3h；(340+40)÷100=3.8h',
      answerSentence: '相遇前3小时相距40千米，相遇后再走0.8小时再次相距40千米。', explanation: '相遇前两人共走340-40=300千米，时间300÷100=3小时。相遇后再拉开40千米，共走340+40=380千米，时间380÷100=3.8小时。',
      solutionSteps: ['相遇前：(340-40)÷(40+60)=3小时', '相遇后：(340+40)÷(40+60)=3.8小时'], hints: ['分别考虑相遇前还差40千米，以及相遇后又拉开40千米。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const rectangleSource = sources.find(question => question.id === 'g4o_20' && question.gradeBand === 'G4');
  if (rectangleSource && Number(rectangleSource.answer) === 10) {
    const result = { answer: op('div', op('mul', op('add', f('length'), f('grow')), f('reduce')), f('grow')) };
    const sourceFacts = { length: 12, grow: 3, reduce: 2 }, sourceAnchors = { length: '原长12米', grow: '长增加3米', reduce: '宽减少2米' };
    const facts = { length: 14, grow: 4, reduce: 2 }, anchors = { length: '原长14米', grow: '长增加4米', reduce: '宽减少2米' };
    const relation: TransferRelation = { family: 'legacy-g4o_20', targetRole: '原长方形的宽', roles: ['length', 'grow', 'reduce'], operations: ['由面积相等列方程，原宽等于(原长+增加量)乘减少量再除以增加量'], units: ['米'], invariants: ['长方形面积变化前后相等', '长增加、宽减少的方向保持不变', '由同一个面积等式解原宽'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(rectangleSource, {
      text: '长方形长增加4米，宽减少2米，面积不变。原长14米，原宽多少？', numbers: [4, 2, 14], answer: 9, answerType: 'number',
      equation: '14×w=(14+4)(w-2)，解得w=9米', answerSentence: '原宽9米。验算：14×9=126，18×7=126。',
      explanation: '设原宽为w米。面积不变，所以14w=(14+4)(w-2)=18w-36。两边移项得4w=36，w=9米。原面积14×9=126平方米，新面积18×7=126平方米。',
      solutionSteps: ['原面积：14w', '新面积：18(w-2)', '面积相等：14w=18(w-2)', '解得原宽w=9米并验算面积'], hints: ['分别写出变化前和变化后的面积，再令两者相等。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const newOperationSource = sources.find(question => question.id === 'g4o_16' && question.gradeBand === 'G4');
  if (newOperationSource && String(newOperationSource.answer) === '23,59') {
    const defined = (left: TransferExpression, right: TransferExpression): TransferExpression => op('add', op('add', op('mul', left, right), left), right);
    const inner = defined(f('c'), f('d'));
    const result = { first: defined(f('a'), f('b')), second: defined(inner, f('e')) };
    const sourceFacts = { a: 5, b: 3, c: 2, d: 3, e: 4 }, sourceAnchors = { a: '5※3', b: '5※3', c: '(2※3)', d: '(2※3)', e: '※4' };
    const facts = { a: 4, b: 2, c: 3, d: 3, e: 2 }, anchors = { a: '4※2', b: '4※2', c: '(3※3)', d: '(3※3)', e: '※2' };
    const relation: TransferRelation = { family: 'legacy-g4o_16', targetRole: '两个新运算式的值', roles: ['a', 'b', 'c', 'd', 'e'], operations: ['按照a※b=a×b+a+b逐层代入计算'], units: ['数'], invariants: ['新运算定义不变', '保留一次直接运算和一次嵌套运算', '两个表达式均按相同规则展开'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(newOperationSource, {
      text: '定义a※b=a×b+a+b。计算4※2=? 和 (3※3)※2=?', numbers: [4, 2, 3, 3, 2], answer: '14,47', answerType: 'multi_answer',
      answerSchema: { kind: 'multi_field', fields: [{ id: 'first', label: '4※2', kind: 'integer' }, { id: 'second', label: '(3※3)※2', kind: 'integer' }] },
      subAnswers: [{ id: 'first', label: '4※2', answer: 14 }, { id: 'second', label: '(3※3)※2', answer: 47 }], equation: '4※2=8+4+2=14；3※3=15，15※2=30+15+2=47',
      answerSentence: '4※2=14，(3※3)※2=47。', explanation: '按定义代入：4※2=4×2+4+2=14。先算3※3=3×3+3+3=15，再算15※2=15×2+15+2=47。',
      solutionSteps: ['4※2=4×2+4+2=14', '3※3=3×3+3+3=15', '15※2=15×2+15+2=47'], hints: ['每遇到※都按同一个定义展开，嵌套式先算括号里的。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const budgetSource = sources.find(question => question.id === 'g4_20' && question.gradeBand === 'G4');
  if (budgetSource && String(budgetSource.answer).includes('还剩5元')) {
    const spending = op('add', op('add', f('bag'), f('pen')), f('notebook'));
    const result = { remaining: op('sub', f('budget'), spending) };
    const sourceFacts = { budget: 50, bag: 25, pen: 8, notebook: 12 }, sourceAnchors = { budget: '带了50元', bag: '25元的书包', pen: '8元的钢笔', notebook: '12元的笔记本' };
    const facts = { budget: 60, bag: 28, pen: 7, notebook: 14 }, anchors = { budget: '带了60元', bag: '28元的书包', pen: '7元的钢笔', notebook: '14元的笔记本' };
    const template = '够，还剩{remaining}元';
    const relation: TransferRelation = { family: 'legacy-g4_20', targetRole: '购买全部文具后的余额及是否够钱', roles: ['budget', 'bag', 'pen', 'notebook'], operations: ['先求三件文具总价，再从所带金额中扣除'], units: ['元'], invariants: ['三件商品均计入总价', '比较总价与预算', '保留够买后的余额'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'text', template });
    batch.entries.push(makeTransferEntry(budgetSource, {
      text: '小明带了60元，买了一个28元的书包和一支7元的钢笔，他还想买一本14元的笔记本。他的钱够吗？如果够，买完还剩多少元；如果不够，还差多少元？', numbers: [60, 28, 7, 14], answer: '够，还剩11元', answerType: 'multi_answer',
      answerSchema: { kind: 'multi_field', fields: [{ id: 'enough', label: '够买吗', kind: 'text' }, { id: 'remaining', label: '剩余', kind: 'integer' }] },
      subAnswers: [{ id: 'enough', label: '够买吗', answer: '够' }, { id: 'remaining', label: '剩余', answer: 11, unit: '元' }],
      equation: '28+7+14=49元；60-49=11元，够', answerSentence: '钱够了，还剩11元。', explanation: '三件文具总价为28+7+14=49元。60-49=11元，所以钱够，买完还剩11元。',
      solutionSteps: ['总花费：28+7+14=49元', '余额：60-49=11元', '余额为正，所以钱够'], hints: ['先计算三件文具的总价，再与所带的钱比较。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const threeValuesSource = sources.find(question => question.id === 'g4o_07' && question.gradeBand === 'G4');
  if (threeValuesSource && String(threeValuesSource.answer).includes('乙27.5')) {
    const yi = op('div', op('sub', f('total'), f('extra')), op('add', f('factor'), 2));
    const result = { jia: op('mul', f('factor'), yi), yi, bing: op('add', yi, f('extra')) };
    const sourceFacts = { total: 120, factor: 2, extra: 10 }, sourceAnchors = { total: '三数之和是120', factor: '甲是乙的2倍', extra: '丙比乙多10' };
    const facts = { total: 124, factor: 2, extra: 10 }, anchors = { total: '三数之和是124', factor: '甲是乙的2倍', extra: '丙比乙多10' };
    const relation: TransferRelation = { family: 'legacy-g4o_07', targetRole: '甲乙丙三个数', roles: ['total', 'factor', 'extra'], operations: ['把三个数都用乙表示，先由总和求乙，再求甲和丙'], units: ['数'], invariants: ['甲乙倍数关系保持不变', '丙与乙的差保持不变', '总和方程同时确定三个数'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(threeValuesSource, {
      text: '三数之和是124。甲是乙的2倍，丙比乙多10。三数各是多少？', numbers: [124, 2, 10], answer: '乙28.5甲57丙38.5', answerType: 'multi_answer',
      subAnswers: [{ id: 'jia', label: '甲', answer: 57 }, { id: 'yi', label: '乙', answer: 28.5 }, { id: 'bing', label: '丙', answer: 38.5 }], equation: '设乙=x：2x+x+(x+10)=124，4x=114，x=28.5',
      answerSentence: '甲=57，乙=28.5，丙=38.5。', explanation: '设乙为x，则甲为2x，丙为x+10。总和为4x+10=124，所以x=28.5，甲为57，丙为38.5。',
      solutionSteps: ['设乙=x，甲=2x，丙=x+10', '4x+10=124，得到4x=114', '乙=28.5，甲=57，丙=38.5'], hints: ['把三个数都用乙表示，再用总和列方程。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const digitPermutationSource = sources.find(question => question.id === 'g4o_13' && question.gradeBand === 'G4');
  if (digitPermutationSource) batch.gaps.push({ sourceId: digitPermutationSource.id, reason: 'constant-answer-by-design', detail: '固定使用四个互异数字且其中恰有0，首位不能为0时，百位有3种、十位3种、个位2种，答案恒为18。仅改变数字标签不会改变排列数；改变数字个数、重复限制或首位约束会改变枚举规模或题型。' });
  const pigeonholeSource = sources.find(question => question.id === 'g4o_28' && question.gradeBand === 'G4');
  if (pigeonholeSource) batch.gaps.push({ sourceId: pigeonholeSource.id, reason: 'constant-answer-by-design', detail: '题目有3种颜色并保证摸到3个同色；保留每色至少2个的原容量范围时，最坏情况总能先取每色2个共6个，第7个保证三同色，答案恒为7。把某色减到2个以下需额外处理该色不足2个的容量分支，改变原推理负担，因此不纳入本轮同难度变式。' });
  const powerUnitSource = sources.find(question => question.id === 'g4o_25' && question.gradeBand === 'G4');
  if (powerUnitSource) {
    const exponent = f('exponent');
    const remainder = op('sub', exponent, op('mul', 4, op('floor', op('div', exponent, 4))));
    const result = op('pow', 3, remainder);
    const sourceFacts = { exponent: 2026 }, sourceAnchors = { exponent: '3的2026次方' };
    const facts = { exponent: 2025 }, anchors = { exponent: '3的2025次方' };
    const relation: TransferRelation = { family: 'legacy-g4o_25', targetRole: '幂的个位数字', roles: ['exponent'], operations: ['利用个位数字每四次循环，求指数除以4的余数并计算对应的小次幂'], units: ['个位数字'], invariants: ['底数3不变', '个位循环为3、9、7、1且周期为4', '按指数除以4的余数选择周期位置'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(powerUnitSource, {
      text: '3的2025次方的个位数字是几？找规律：3¹=3，3²=9，3³=27，3⁴=81，3⁵=243……', numbers: [2025, 3], answer: 3,
      equation: '3的个位按3、9、7、1循环；2025÷4=506余1，所以个位是3。', answerSentence: '3的2025次方的个位数字是3。',
      explanation: '3的幂的个位每4次循环一次：3、9、7、1。2025除以4余1，因此对应周期中的第1个数，个位是3。',
      solutionSteps: ['个位循环：3、9、7、1，每4次一轮。', '2025÷4=506余1。', '余数1对应周期第1个数，个位是3。'], hints: ['先找个位数字的循环长度，再看指数除以循环长度的余数。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const liarRankingSource = sources.find(question => question.id === 'g4o_11' && question.gradeBand === 'G4');
  if (liarRankingSource && String(liarRankingSource.answer) === '丙') {
    const relation: TransferRelation = { family: 'legacy-g4o_11', targetRole: '唯一说谎者条件下的第一名', roles: ['甲', '乙', '丙'], operations: ['枚举三人的名次并逐句判定真假，保留恰有一句假话的排列'], units: ['名次'], invariants: ['三人各占一个名次', '恰有一人说谎', '按所有陈述逐一检验并得到唯一名次顺序'] };
    const sourceModel = { people: ['甲', '乙', '丙'], statements: ['甲:not-ranks:1', '乙:not-ranks:3', '丙:rank:乙:1'], liarCount: 1, target: 'first' };
    const variantModel = { people: ['甲', '乙', '丙'], statements: ['甲:not-ranks:2', '乙:not-ranks:3', '丙:rank:乙:2'], liarCount: 1, target: 'first' };
    batch.entries.push(makeTransferEntry(liarRankingSource, {
      text: '甲说：“我不是第二名。”乙说：“我不是最后一名。”丙说：“乙是第二名。”只有一人说谎。谁是第一名？', numbers: [], answer: '乙',
      equation: '唯一名次顺序为乙、丙、甲；甲、乙的话真，丙的话假。', answerSentence: '乙是第一名。',
      explanation: '若丙的话真，则乙第二，甲和乙的话也都真，便没有人说谎，矛盾。因此丙的话假，乙不是第二名。若乙排第三，乙“不是最后一名”也是假话，会有两人说谎，所以乙只能第一。甲不能第二，否则甲的话也是假；于是甲第三、丙第二。唯一顺序为乙、丙、甲。',
      solutionSteps: ['丙若说真话，则乙第二，甲、乙两句话也都为真，与恰有一人说谎矛盾。', '所以丙说谎，乙不在第二名。', '乙若在第三名，乙的话也是假，会出现两人说谎；故乙第一。', '甲不能第二，否则甲也说谎；于是丙第二、甲第三。'],
      hints: ['把每个候选名次顺序代入三句话，统计说谎人数是否恰好为一。'],
    }, relation, { kind: 'enumeration', model: 'legacy-truth-ranking-v1', source: sourceModel, variant: variantModel }, 'structural-proof'));
  }
  const fiveRunnerSource = sources.find(question => question.id === 'g4o_26' && question.gradeBand === 'G4');
  if (fiveRunnerSource && String(fiveRunnerSource.answer) === 'A') {
    const relation: TransferRelation = { family: 'legacy-g4o_26', targetRole: '真话名次约束下的第一名', roles: ['A', 'B', 'C', 'D', 'E'], operations: ['固定已核实名次、枚举其余排列，再按名次真假规则检查五句话'], units: ['名次'], invariants: ['D固定为第三名', '第一和第五名说谎，其余名次说真话', '五人名次互不重复且唯一满足全部陈述'] };
    const sourceModel = { people: ['A', 'B', 'C', 'D', 'E'], statements: ['A:not-ranks:1,5', 'B:before:C', 'C:before:E', 'D:rank:3', 'E:before:A'], knownRanks: ['D:3'], liarPositions: [1, 5], target: 'first' };
    const variantModel = { people: ['A', 'B', 'C', 'D', 'E'], statements: ['A:not-ranks:1,5', 'B:before:C', 'C:after:E', 'D:rank:3', 'E:before:A'], knownRanks: ['D:3'], liarPositions: [1, 5], target: 'first' };
    batch.entries.push(makeTransferEntry(fiveRunnerSource, {
      text: '5个小朋友赛跑。A说“我不是第1和第5”。B说“我比C快”。C说“E比我快”。D说“我是第3名”，已核实D确实是第3名。E说“我比A快”。已知第1和第5说谎，其他人说真话。谁是第1？', numbers: [], answer: 'C',
      equation: '唯一名次顺序为C、E、D、A、B；C和B说谎，A、D、E说真话。', answerSentence: 'C是第一名。',
      explanation: 'D固定第三后，逐一检查其余24种排列，并按名次判断每句话的真假。唯一满足“第1和第5说谎、其余人说真话”的顺序是C、E、D、A、B：C说E比自己快是假话，B说自己比C快也是假话；A、D、E的话都是真话。因此第一名是C。',
      solutionSteps: ['固定D为第三名，列出其余四人的24种排列。', '将各排列逐一代入五句话，统计第1和第5是否说谎、其余人是否说真话。', '唯一符合条件的顺序是C、E、D、A、B。', '第一名是C。'],
      hints: ['先固定D，再按首尾说谎、中间说真话筛掉不可能名次。'],
    }, relation, { kind: 'enumeration', model: 'legacy-truth-ranking-v1', source: sourceModel, variant: variantModel }, 'structural-proof'));
  }
  const truthSource = sources.find(question => question.id === 'g4o_10' && question.gradeBand === 'G4');
  if (truthSource && String(truthSource.answer) === 'B') {
    const relation: TransferRelation = { family: 'legacy-g4o_10', targetRole: '唯一说真话的人', roles: ['A', 'B', 'C'], operations: ['枚举三句话的真假组合，按每句话对其他陈述的判断检查唯一真话条件'], units: ['人'], invariants: ['三人各有一句陈述', '恰有一人说真话', '两句为否定判断，一句为合取否定判断'] };
    const sourceModel = { people: ['A', 'B', 'C'], statements: ['A:not:B', 'B:not:C', 'C:and-not:A,B'], truthCount: 1, target: 'true-person' };
    const variantModel = { people: ['A', 'B', 'C'], statements: ['A:not:C', 'B:not:C', 'C:and-not:A,B'], truthCount: 1, target: 'true-person' };
    batch.entries.push(makeTransferEntry(truthSource, {
      text: 'A说：“C在说谎。”B说：“C在说谎。”C说：“A和B都在说谎。”只有一人说真话。谁说真话？', numbers: [], answer: 'C',
      equation: '唯一满足条件的真假组合是A假、B假、C真。', answerSentence: 'C说真话。',
      explanation: '若C说真话，则A、B都说谎；A和B都在说C说谎，因此两句话都为假，与C所说相符，恰有C一人说真话。若C说谎，则“A和B都说谎”为假，至少A或B有一人说真话；但A、B说的是同一句“C在说谎”，真假相同，于是两人都真，违背只有一人说真话。故唯一真话者是C。',
      solutionSteps: ['A和B的陈述内容相同，真假必相同。', '若A、B都真，则C所说“A和B都说谎”为假，恰有两句真话，矛盾。', '所以A、B都假，C真，且恰有一句真话。'], hints: ['先注意A、B两句话是否指向相同的事实，再检查唯一真话条件。'],
    }, relation, { kind: 'enumeration', model: 'legacy-boolean-truth-v1', source: sourceModel, variant: variantModel }, 'structural-proof'));
  }
  const vennSource = sources.find(question => question.id === 'g4o_21' && question.gradeBand === 'G4');
  if (vennSource && Number(vennSource.answer) === 6) {
    const singles = op('add', f('basketball'), f('football'), f('volleyball'));
    const pairRemoved = op('sub', op('sub', op('sub', singles, f('basketballFootball')), f('basketballVolleyball')), f('footballVolleyball'));
    const union = op('add', pairRemoved, f('allThree'));
    const result = op('sub', f('people'), union);
    const sourceFacts = { people: 100, basketball: 58, football: 45, volleyball: 38, basketballFootball: 22, basketballVolleyball: 18, footballVolleyball: 15, allThree: 8 };
    const sourceAnchors = { people: '100人中', basketball: '爱篮球58人', football: '爱足球45人', volleyball: '爱排球38人', basketballFootball: '篮球+足球22人', basketballVolleyball: '篮球+排球18人', footballVolleyball: '足球+排球15人', allThree: '三项都爱8人' };
    const facts = { people: 120, basketball: 59, football: 46, volleyball: 39, basketballFootball: 23, basketballVolleyball: 19, footballVolleyball: 16, allThree: 9 };
    const anchors = { people: '120人中', basketball: '爱篮球59人', football: '爱足球46人', volleyball: '爱排球39人', basketballFootball: '篮球+足球23人', basketballVolleyball: '篮球+排球19人', footballVolleyball: '足球+排球16人', allThree: '三项都爱9人' };
    const relation: TransferRelation = { family: 'legacy-g4o_21', targetRole: '三项都不爱的人数', roles: Object.keys(facts), operations: ['三量容斥求至少爱一项的人数，再从总人数中扣除'], units: ['人'], invariants: ['并集人数按加单项、减两两交集、加三重交集', '答案为总人数减至少爱一项的人数'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(vennSource, { text: '120人中，爱篮球59人，爱足球46人，爱排球39人。爱篮球+足球23人，爱篮球+排球19人，爱足球+排球16人，三项都爱9人。三项都不爱几人？', numbers: [120, 59, 46, 39, 23, 19, 16, 9], answer: 25, equation: '至少爱一项=59+46+39-23-19-16+9=95；都不爱=120-95=25', answerSentence: '三项都不爱的有25人。', explanation: '用三量容斥：至少爱一项=59+46+39-23-19-16+9=95人。总人数120人，三项都不爱的人数为120-95=25人。', solutionSteps: ['单项人数相加：59+46+39=144', '减去两两交集：144-23-19-16=86', '加回三重交集：86+9=95', '都不爱：120-95=25'], hints: ['三量容斥：单项相加，减去两两交集，再加回三重交集。'] }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const reverseProductSource = sources.find(question => question.id === 'g4o_23' && question.gradeBand === 'G4');
  if (reverseProductSource && String(reverseProductSource.answer) === '1089') {
    const relation: TransferRelation = { family: 'legacy-g4o_23', targetRole: '乘积恰为数字反序的四位数', roles: ['factor'], operations: ['在四位数字互异且首位非零的约束下枚举满足乘积反序的数'], units: ['四位数'], invariants: ['四位数字各不相同', '首位非零', '乘积为原四位数的数字反序', '保留唯一解的枚举约束'] };
    const sourceModel = { factor: 9, target: 'unique-number' };
    const variantModel = { factor: 4, target: 'unique-number' };
    batch.entries.push(makeTransferEntry(reverseProductSource, {
      text: 'ABCD×4=DCBA。A、B、C、D各代表不同数字（A≠0）。求ABCD。', numbers: [4], answer: '2178', answerType: 'number',
      equation: '2178×4=8712，恰为2178的数字反序。', answerSentence: 'ABCD=2178。验证：2178×4=8712。',
      explanation: '逐位相乘并记录进位：8×4=32，写2进3；7×4+3=31，写1进3；1×4+3=7；2×4=8，得到8712。四个数字2、1、7、8互不相同，且8712正好是2178的反序。在所有四位数中按题设条件检查，只有2178满足。',
      solutionSteps: ['个位：8×4=32，写2进3。', '十位：7×4+3=31，写1进3。', '百位：1×4+3=7；千位：2×4=8。', '得到8712，数字与2178反序且互异。'], hints: ['逐位列出乘法进位，同时利用每位数字互不相同和乘积反序筛选。'],
    }, relation, { kind: 'enumeration', model: 'legacy-four-digit-reverse-product-v1', source: sourceModel, variant: variantModel }, 'structural-proof'));
  }
  return batch;
}
