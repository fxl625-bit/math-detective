import type { Question } from '@/lib/types';
import { makeTransferEntry, type TransferContent } from './helpers';
import { buildUpperArithmeticBatch, type UpperArithmeticRecipe } from './legacy-upper';
import type { TransferBatch, TransferExpression, TransferProof, TransferRelation } from './types';

const f = (fact: string) => ({ fact });
const op = (name: 'add'|'sub'|'mul'|'div'|'floor'|'ceil'|'pow'|'min'|'max', ...args: TransferExpression[]): TransferExpression => ({ op: name, args });
const recipes: UpperArithmeticRecipe[] = [
  {id:'g5_01',tree:op('mul',f('perBottle'),f('bottles')),sourceFacts:{perBottle:2.5,bottles:3},sourceAnchors:{perBottle:'果汁2.5升',bottles:'买了3瓶'},facts:{perBottle:3.2,bottles:4},anchors:{perBottle:'果汁3.2升',bottles:'买了4瓶'},text:'一瓶果汁3.2升，妈妈买了4瓶，一共有多少升果汁？',numbers:[3.2,4],unit:'升',relationText:'每瓶容量乘瓶数',sourceAnswer:7.5,decimals:1},
  {id:'g5_02',tree:op('div',f('length'),f('parts')),sourceFacts:{length:7.2,parts:6},sourceAnchors:{length:'长7.2米',parts:'平均锯成6段'},facts:{length:9.6,parts:6},anchors:{length:'长9.6米',parts:'平均锯成6段'},text:'一根钢管长9.6米，平均锯成6段，每段长多少米？',numbers:[9.6,6],unit:'米',relationText:'总长度平均分成段数',sourceAnswer:1.2,decimals:1},
  {id:'g5_03',tree:op('mul',f('price'),f('weight')),sourceFacts:{price:6.8,weight:2.5},sourceAnchors:{price:'苹果6.8元',weight:'买2.5斤'},facts:{price:7.2,weight:2.5},anchors:{price:'苹果7.2元',weight:'买2.5斤'},text:'一斤苹果7.2元，买2.5斤需要多少元？',numbers:[7.2,2.5],unit:'元',relationText:'每斤价格乘购买斤数',sourceAnswer:17,decimals:1},
  {id:'g5_05',tree:op('sub',op('sub',f('money'),f('book')),f('pen')),sourceFacts:{money:50,book:23.8,pen:6.5},sourceAnchors:{money:'带了50元',book:'花了23.8元',pen:'花了6.5元'},facts:{money:60,book:28.6,pen:7.8},anchors:{money:'带了60元',book:'花了28.6元',pen:'花了7.8元'},text:'小明带了60元去超市，买了一本书花了28.6元，又买了一支笔花了7.8元，还剩多少元？',numbers:[60,28.6,7.8],unit:'元',relationText:'带的钱连续减去两项花费',sourceAnswer:19.7,decimals:1},
  {id:'g5_06',tree:op('div',f('total'),f('price')),sourceFacts:{total:96,price:8},sourceAnchors:{total:'一共花了96元',price:'每本8元'},facts:{total:88,price:8},anchors:{total:'一共花了88元',price:'每本8元'},text:'学校买了x本图书，每本8元，一共花了88元。买了多少本图书？',numbers:[8,88],unit:'本',relationText:'总价除以每本价格',sourceAnswer:12},
  {id:'g5_08',tree:op('div',op('mul',f('base'),f('height')),2),sourceFacts:{base:12,height:8},sourceAnchors:{base:'底是12厘米',height:'高是8厘米'},facts:{base:14,height:6},anchors:{base:'底是14厘米',height:'高是6厘米'},text:'一个三角形标志牌的底是14厘米，高是6厘米，它的面积是多少平方厘米？',numbers:[14,6],unit:'平方厘米',relationText:'底乘高再除以2',sourceAnswer:48},
  {id:'g5_09',tree:op('div',op('mul',op('add',f('upper'),f('lower')),f('height')),2),sourceFacts:{upper:8,lower:12,height:5},sourceAnchors:{upper:'上底8米',lower:'下底12米',height:'高5米'},facts:{upper:9,lower:15,height:6},anchors:{upper:'上底9米',lower:'下底15米',height:'高6米'},text:'一块梯形菜地，上底9米、下底15米、高6米。它的面积是多少平方米？',numbers:[9,15,6],unit:'平方米',relationText:'上底与下底之和乘高再除以2',sourceAnswer:50},
  {id:'g5_10',tree:op('mul',op('mul',f('base'),f('height')),f('paintPerArea')),sourceFacts:{base:15,height:8,paintPerArea:0.6},sourceAnchors:{base:'底边15米',height:'高8米',paintPerArea:'每平方米刷油漆需要0.6千克'},facts:{base:12,height:9,paintPerArea:0.5},anchors:{base:'底边12米',height:'高9米',paintPerArea:'每平方米刷油漆需要0.5千克'},text:'一个平行四边形广告牌，底边12米，高9米。如果每平方米刷油漆需要0.5千克，一共需要多少千克油漆？',numbers:[12,9,0.5],unit:'千克',relationText:'底乘高求面积，再乘单位面积用漆量',sourceAnswer:72,decimals:1},
  {id:'g5_16',tree:op('mul',op('mul',f('edge'),f('edge')),f('edge')),sourceFacts:{edge:15},sourceAnchors:{edge:'棱长15厘米'},facts:{edge:12},anchors:{edge:'棱长12厘米'},text:'一个正方体收纳盒，棱长12厘米。它的体积是多少立方厘米？',numbers:[12],unit:'立方厘米',relationText:'棱长乘棱长再乘棱长',sourceAnswer:3375},
  {id:'g5_17',tree:op('mul',op('add',f('dailyA'),f('dailyB')),f('days')),sourceFacts:{dailyA:48,dailyB:52,days:5},sourceAnchors:{dailyA:'每天加工48个',dailyB:'每天加工52个',days:'合作加工了5天'},facts:{dailyA:68,dailyB:52,days:4},anchors:{dailyA:'每天加工68个',dailyB:'每天加工52个',days:'合作加工了4天'},text:'工厂加工一批零件，张师傅每天加工68个，李师傅每天加工52个。两人合作加工了4天，一共加工了多少个零件？',numbers:[68,52,4],unit:'个',relationText:'两人每日产量之和乘工作天数',sourceAnswer:500},
  {id:'g5_18',tree:op('div',f('distance'),op('add',f('speedA'),f('speedB'))),sourceFacts:{distance:680,speedA:90,speedB:80},sourceAnchors:{distance:'相距680千米',speedA:'每小时行90千米',speedB:'每小时行80千米'},facts:{distance:900,speedA:90,speedB:90},anchors:{distance:'相距900千米',speedA:'每小时行90千米',speedB:'每小时行90千米'},text:'两列火车从相距900千米的两地同时相向开出，甲车每小时行90千米，乙车每小时行90千米，几小时后两车相遇？',numbers:[900,90,90],unit:'小时',relationText:'相遇路程除以两车速度和',sourceAnswer:4},
  {id:'g5_07',tree:op('div',op('sub',f('total'),f('extra')),f('times')),sourceFacts:{total:59,extra:5,times:3},sourceAnchors:{total:'小明有59元',extra:'3倍还多5元',times:'是小红的3倍'},facts:{total:65,extra:5,times:3},anchors:{total:'小明有65元',extra:'3倍还多5元',times:'是小红的3倍'},text:'小红有x元钱，小明的钱是小红的3倍还多5元，小明有65元。小红有多少元？',numbers:[3,5,65],unit:'元',relationText:'小明的钱减去多出的5元，再除以倍数',sourceAnswer:18},
  {id:'g5_25',tree:op('div',op('sub',f('total'),op('mul',f('basketballs'),f('basketballPrice'))),f('footballs')),sourceFacts:{total:520,basketballs:5,basketballPrice:80,footballs:3},sourceAnchors:{total:'一共花了520元',basketballs:'买了5个篮球',basketballPrice:'每个篮球80元',footballs:'和3个足球'},facts:{total:560,basketballs:4,basketballPrice:90,footballs:4},anchors:{total:'一共花了560元',basketballs:'买了4个篮球',basketballPrice:'每个篮球90元',footballs:'和4个足球'},text:'操场上同学们正在热火朝天地跑步锻炼身体。学校买了4个篮球和4个足球，一共花了560元。每个篮球90元，每个足球多少元？',numbers:[4,4,560,90],unit:'元',relationText:'总价减去篮球总价，再除以足球数量',sourceAnswer:40},
  {id:'g5_19',tree:op('mul',op('mul',f('price'),0.85),f('count')),sourceFacts:{price:280,count:2},sourceAnchors:{price:'原价280元',count:'买了2件'},facts:{price:320,count:3},anchors:{price:'原价320元',count:'买了3件'},text:'五一劳动节到了，街上张灯结彩，热闹非凡。商场举行促销活动，一件原价320元的衣服打八五折出售，小明妈妈买了3件，一共花了多少元？',numbers:[320,3],unit:'元',relationText:'原价乘0.85折扣再乘件数',sourceAnswer:476},
  {id:'g5_20',tree:op('add',op('mul',f('length'),f('width')),op('div',op('mul',op('add',f('upper'),f('lower')),f('height')),2)),sourceFacts:{length:20,width:10,upper:10,lower:16,height:8},sourceAnchors:{length:'长方形长20米',width:'宽10米',upper:'梯形上底10米',lower:'下底16米',height:'高8米'},facts:{length:18,width:15,upper:11,lower:17,height:9},anchors:{length:'长方形长18米',width:'宽15米',upper:'梯形上底11米',lower:'下底17米',height:'高9米'},text:'一块不规则土地，可以分割成一个长方形和一个梯形。长方形长18米宽15米，梯形上底11米下底17米高9米。这块土地的总面积是多少平方米？',numbers:[18,15,11,17,9],unit:'平方米',relationText:'长方形面积加梯形面积',sourceAnswer:304},
  {id:'g5_22',tree:op('mul',op('mul',f('price'),0.85),f('count')),sourceFacts:{price:280,count:2},sourceAnchors:{price:'原价280元',count:'买了2件'},facts:{price:360,count:3},anchors:{price:'原价360元',count:'买了3件'},text:'科技节展览馆里人山人海，各种发明创造让人眼花缭乱。一件衣服原价360元，打八五折后，小明妈妈买了3件，一共花了多少元？',numbers:[360,3],unit:'元',relationText:'原价乘0.85折扣再乘件数',sourceAnswer:476},
  {id:'g5_23',tree:op('div',op('mul',op('mul',f('length'),f('width')),f('height')),1000),sourceFacts:{length:60,width:30,height:40},sourceAnchors:{length:'长60厘米',width:'宽30厘米',height:'高40厘米'},facts:{length:50,width:40,height:30},anchors:{length:'长50厘米',width:'宽40厘米',height:'高30厘米'},text:'学校的美术教室里挂满了学生的作品，五彩缤纷。一个长方体鱼缸，长50厘米，宽40厘米，高30厘米，这个鱼缸的容积是多少升？',numbers:[50,40,30],unit:'升',relationText:'长乘宽乘高求立方厘米，再除以1000换算升',sourceAnswer:72},
  {id:'g5o_28',tree:op('div',op('add',f('train'),f('bridge')),f('speed')),sourceFacts:{train:200,bridge:800,speed:20},sourceAnchors:{train:'火车长200米',bridge:'长800米大桥',speed:'速度20米/秒'},facts:{train:220,bridge:680,speed:20},anchors:{train:'火车长220米',bridge:'长680米大桥',speed:'速度20米/秒'},text:'火车长220米，速度20米/秒。通过长680米大桥需几秒？',numbers:[220,680,20],unit:'秒',relationText:'火车长度与桥长之和除以速度',sourceAnswer:50},
  {id:'g5o_30',tree:op('div',op('add',f('leftConstant'),f('rightConstant')),op('sub',f('rightCoefficient'),f('leftCoefficient'))),sourceFacts:{leftCoefficient:2,leftConstant:3,rightCoefficient:4,rightConstant:7},sourceAnchors:{leftCoefficient:'2x+',leftConstant:'2x+3',rightCoefficient:'4x-',rightConstant:'-7'},facts:{leftCoefficient:2,leftConstant:5,rightCoefficient:5,rightConstant:7},anchors:{leftCoefficient:'2x+',leftConstant:'2x+5',rightCoefficient:'5x-',rightConstant:'-7'},text:'2x+5=5x-7。x=?',numbers:[2,5,5,7],unit:'',relationText:'常数项和除以x的系数差',sourceAnswer:5},
  {id:'g5o_33',tree:op('div',op('mul',f('together'),f('soloA')),op('sub',f('soloA'),f('together'))),sourceFacts:{together:10,soloA:15},sourceAnchors:{together:'一件工作10天完成',soloA:'甲单独做需15天'},facts:{together:12,soloA:18},anchors:{together:'一件工作12天完成',soloA:'甲单独做需18天'},text:'甲乙合作一件工作12天完成。甲单独做需18天，乙单独做需几天？',numbers:[12,18],unit:'天',relationText:'合作天数乘甲单独天数再除以两者天数差',sourceAnswer:30},
  {id:'g5o_06',tree:op('div',f('remaining'),op('mul',op('sub',1,op('div',f('firstNum'),f('firstDen'))),op('sub',1,op('div',f('secondNum'),f('secondDen'))))),sourceFacts:{remaining:8,firstNum:1,firstDen:3,secondNum:1,secondDen:2},sourceAnchors:{remaining:'还剩8米',firstNum:'第一次剪去1/3',firstDen:'第一次剪去1/3',secondNum:'第二次剪去剩下的1/2',secondDen:'第二次剪去剩下的1/2'},facts:{remaining:9,firstNum:1,firstDen:3,secondNum:1,secondDen:2},anchors:{remaining:'还剩9米',firstNum:'第一次剪去1/3',firstDen:'第一次剪去1/3',secondNum:'第二次剪去剩下的1/2',secondDen:'第二次剪去剩下的1/2'},text:'一根绳子，第一次剪去1/3，第二次剪去剩下的1/2，还剩9米。原长多少？',numbers:[9],unit:'米',relationText:'剩余长度除以两次剪后保留比例的乘积',sourceAnswer:24},
  {id:'g5o_07',tree:op('div',f('remaining'),op('mul',op('sub',1,op('div',f('firstNum'),f('firstDen'))),op('sub',1,op('div',f('secondNum'),f('secondDen'))))),sourceFacts:{remaining:10,firstNum:1,firstDen:4,secondNum:2,secondDen:3},sourceAnchors:{remaining:'还剩10个',firstNum:'第一天吃了1/4',firstDen:'第一天吃了1/4',secondNum:'第二天吃了剩下的2/3',secondDen:'第二天吃了剩下的2/3'},facts:{remaining:12,firstNum:1,firstDen:4,secondNum:2,secondDen:3},anchors:{remaining:'还剩12个',firstNum:'第一天吃了1/4',firstDen:'第一天吃了1/4',secondNum:'第二天吃了剩下的2/3',secondDen:'第二天吃了剩下的2/3'},text:'一堆苹果，第一天吃了1/4，第二天吃了剩下的2/3，还剩12个。原来几个？',numbers:[12],unit:'个',relationText:'剩余苹果数除以两次吃后保留比例的乘积',sourceAnswer:40},
  {id:'g5o_12',tree:op('sub',f('soloB'),op('mul',f('together'),op('add',1,op('div',f('soloB'),f('soloA'))))),sourceFacts:{soloA:10,soloB:15,together:2},sourceAnchors:{soloA:'甲10天',soloB:'乙15天',together:'合作2天'},facts:{soloA:12,soloB:18,together:2},anchors:{soloA:'甲12天',soloB:'乙18天',together:'合作2天'},text:'甲12天乙18天完成工程。合作2天后甲离开，乙单独完成剩余需几天？',numbers:[12,18,2],unit:'天',relationText:'先把合作期间甲、乙完成的工作量折合成乙单独完成所需的天数，再用乙单独完成全工程的天数减去这段折合时间',sourceAnswer:10},
  {id:'g5o_10',tree:op('sub',op('mul',f('cost'),op('div',op('add',100,f('profitPercent')),100),op('div',f('discount'),10)),f('cost')),sourceFacts:{cost:200,profitPercent:25,discount:9},sourceAnchors:{cost:'进价200元',profitPercent:'按25%利润定价',discount:'打9折出售'},facts:{cost:240,profitPercent:25,discount:9},anchors:{cost:'进价240元',profitPercent:'按25%利润定价',discount:'打9折出售'},text:'一件商品进价240元，按25%利润定价后打9折出售。赚了多少元？',numbers:[240,25,9],unit:'元',relationText:'进价乘利润率形成定价，再乘折扣，最后减去进价',sourceAnswer:25},
  {id:'g5_21',tree:op('mul',f('perBottle'),f('bottles')),sourceFacts:{perBottle:2.5,bottles:4},sourceAnchors:{perBottle:'果汁2.5升',bottles:'买了4瓶'},facts:{perBottle:3.2,bottles:5},anchors:{perBottle:'果汁3.2升',bottles:'买了5瓶'},text:'春节前夕，超市里挤满了采购年货的人，热闹非凡。一瓶果汁3.2升，爸爸买了5瓶，一共有多少升果汁？',numbers:[3.2,5],unit:'升',relationText:'每瓶容量乘瓶数',sourceAnswer:10,decimals:1},
  {id:'extra_05',tree:op('mul',f('boxes'),f('perBox')),sourceFacts:{boxes:5,perBox:15},sourceAnchors:{boxes:'进了5箱苹果',perBox:'每箱苹果重15千克'},facts:{boxes:6,perBox:18},anchors:{boxes:'进了6箱苹果',perBox:'每箱苹果重18千克'},text:'水果店进了6箱苹果和3箱梨，每箱苹果重18千克，每箱梨重12千克，这些苹果一共重多少千克？',numbers:[6,18,3,12],unit:'千克',relationText:'苹果箱数乘每箱苹果重量',sourceAnswer:75},
  {id:'extra_06',tree:op('sub',f('money'),f('spent')),sourceFacts:{money:50,spent:28},sourceAnchors:{money:'带了50元',spent:'花了28元'},facts:{money:65,spent:37},anchors:{money:'带了65元',spent:'花了37元'},text:'小明和小红一起去文具店买了钢笔。小明带了65元，小红带了35元，小明买了一支钢笔花了37元，小明还剩多少钱？',numbers:[65,35,37],unit:'元',relationText:'小明带的钱减去他的花费',sourceAnswer:22},
];
export function buildLegacyGrade5Transfers(sources: readonly Question[]): TransferBatch {
  const batch = buildUpperArithmeticBatch(sources, 'G5', recipes);
  const source = sources.find(question => question.id === 'g5_12' && question.gradeBand === 'G5');
  if (source && String(source.answer) === '1/2米') {
    const tree = op('sub', f('full'), f('cut'));
    const sourceFacts = { full: 0.75, cut: 0.25 }, sourceAnchors = { full: '绳子长3/4米', cut: '剪掉1/4米' };
    const facts = { full: 1.75, cut: 0.25 }, anchors = { full: '绳子长7/4米', cut: '剪掉1/4米' };
    const relation: TransferRelation = { family: 'legacy-g5_12', targetRole: '剪后绳子长度', roles: ['full', 'cut'], operations: ['原长减去剪掉长度'], units: ['米'], invariants: ['保留同分母分数减法问题', '用题干中的两个分数计算剩余长度', '答案以分数表示'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result: tree, format: 'fraction' });
    batch.entries.push(makeTransferEntry(source, {
      text: '一根绳子长7/4米，剪掉1/4米，还剩多少米？', numbers: [7, 4, 1, 4], answer: '3/2米', answerType: 'text',
      equation: '7/4-1/4=6/4=3/2米', answerSentence: '还剩3/2米。',
      explanation: '同分母分数相减：7/4-1/4=6/4，约分得到3/2米。',
      solutionSteps: ['7/4-1/4=6/4', '约分：6/4=3/2米'], hints: ['同分母分数相减时，分母不变，分子相减，最后约分。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const unitPriceSource = sources.find(question => question.id === 'g5_04' && question.gradeBand === 'G5');
  if (unitPriceSource && String(unitPriceSource.answer).includes('6.4元')) {
    const unitPrice = op('div', f('total'), f('weight'));
    const result = { unit: unitPrice, total: op('mul', unitPrice, f('buy')) };
    const sourceFacts = { total: 32, weight: 5, buy: 3 }, sourceAnchors = { total: '5千克苹果卖32元', weight: '5千克苹果卖32元', buy: '买3千克' };
    const facts = { total: 42, weight: 5, buy: 4 }, anchors = { total: '5千克苹果卖42元', weight: '5千克苹果卖42元', buy: '买4千克' };
    const relation: TransferRelation = { family: 'legacy-g5_04', targetRole: '每千克单价和指定重量总价', roles: ['total', 'weight', 'buy'], operations: ['总价除以重量求单价，再乘购买重量'], units: ['元/千克', '元'], invariants: ['先求每千克单价，再用单价求指定重量总价', '保留单价和总价两个答案字段', '单价与总价均为一位小数'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(unitPriceSource, {
      text: '超市里5千克苹果卖42元，平均每千克苹果多少元？买4千克要多少元？', numbers: [42, 5, 4], answer: '每千克8.4元，4千克33.6元', answerType: 'multi_answer',
      answerSchema: { kind: 'multi_field', fields: [{ id: 'unit', label: '单价', kind: 'decimal' }, { id: 'total', label: '4千克价', kind: 'decimal' }] },
      subAnswers: [{ id: 'unit', label: '单价', answer: 8.4, unit: '元/千克' }, { id: 'total', label: '4千克价', answer: 33.6, unit: '元' }],
      equation: '42÷5=8.4元；8.4×4=33.6元', answerSentence: '平均每千克8.4元，买4千克要33.6元。',
      explanation: '先求单价：42÷5=8.4元。再求4千克总价：8.4×4=33.6元。', solutionSteps: ['单价：42÷5=8.4元', '4千克价：8.4×4=33.6元'], hints: ['先求每千克苹果的价格，再乘购买的千克数。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const sameDenSource = sources.find(question => question.id === 'g5_11' && question.gradeBand === 'G5');
  if (sameDenSource && String(sameDenSource.answer).includes('3/5')) {
    const a = op('div', f('aNum'), f('den'));
    const b = op('div', f('bNum'), f('den'));
    const result = { sum: op('add', a, b), diff: op('sub', a, b) };
    const sourceFacts = { aNum: 2, bNum: 1, den: 5 }, sourceAnchors = { aNum: '小明吃了蛋糕的2/5', bNum: '小红吃了蛋糕的1/5', den: '小明吃了蛋糕的2/5' };
    const facts = { aNum: 3, bNum: 1, den: 5 }, anchors = { aNum: '小明吃了蛋糕的3/5', bNum: '小红吃了蛋糕的1/5', den: '小明吃了蛋糕的3/5' };
    const relation: TransferRelation = { family: 'legacy-g5_11', targetRole: '同分母分数之和及差', roles: ['aNum', 'bNum', 'den'], operations: ['求两人所占分率之和及差'], units: ['分数'], invariants: ['同一分母下分别做加法和减法', '保留合计和差两个答案字段', '结果分数保持最简'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'fraction' });
    batch.entries.push(makeTransferEntry(sameDenSource, {
      text: '小明吃了蛋糕的3/5，小红吃了蛋糕的1/5，两人一共吃了蛋糕的几分之几？小明比小红多吃了几分之几？', numbers: [3, 5, 1], answer: '一共4/5，多2/5', answerType: 'multi_answer',
      subAnswers: [{ id: 'sum', label: '一共', answer: '4/5' }, { id: 'diff', label: '多', answer: '2/5' }], equation: '3/5+1/5=4/5；3/5-1/5=2/5',
      answerSentence: '两人一共吃了五分之四，小明比小红多吃了五分之二。', explanation: '同分母分数相加减，分母不变：3/5+1/5=4/5，3/5-1/5=2/5。',
      solutionSteps: ['一共：3/5+1/5=4/5', '相差：3/5-1/5=2/5'], hints: ['同分母分数加减时，分母不变，分子分别相加或相减。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const tankSource = sources.find(question => question.id === 'g5_15' && question.gradeBand === 'G5');
  if (tankSource && String(tankSource.answer).includes('72000立方厘米=72升')) {
    const volume = op('mul', op('mul', f('length'), f('width')), f('height'));
    const result = { volume, liters: op('div', volume, 1000) };
    const sourceFacts = { length: 60, width: 40, height: 30 }, sourceAnchors = { length: '长60厘米', width: '宽40厘米', height: '高30厘米' };
    const facts = { length: 80, width: 30, height: 40 }, anchors = { length: '长80厘米', width: '宽30厘米', height: '高40厘米' };
    const template = '{volume}立方厘米={liters}升';
    const relation: TransferRelation = { family: 'legacy-g5_15', targetRole: '长方体鱼缸容积及升数', roles: ['length', 'width', 'height'], operations: ['长乘宽乘高求立方厘米，再按每升1000立方厘米换算'], units: ['立方厘米', '升'], invariants: ['保留长宽高三维体积计算', '同时给出立方厘米和升两种等值单位', '升与立方厘米按固定换算关系转换'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'text', template });
    batch.entries.push(makeTransferEntry(tankSource, {
      text: '一个长方体鱼缸，长80厘米、宽30厘米、高40厘米，它的容积是多少立方厘米？合多少升？', numbers: [80, 30, 40],
      answer: '96000立方厘米=96升', answerType: 'text', answerSentence: '容积是96000立方厘米，合96升。',
      equation: '80×30×40=96000立方厘米；96000÷1000=96升', explanation: '长方体体积=长×宽×高=80×30×40=96000立方厘米。每升等于1000立方厘米，所以96000÷1000=96升。',
      solutionSteps: ['体积：80×30×40=96000立方厘米', '换算：96000÷1000=96升'], hints: ['先用长×宽×高求立方厘米，再除以1000换算成升。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const cookieSource = sources.find(question => question.id === 'g5_13' && question.gradeBand === 'G5');
  if (cookieSource && String(cookieSource.answer) === '吃了8块，剩16块') {
    const whole = f('whole'), fraction = op('div', f('numerator'), f('denominator'));
    const result = { eaten: op('mul', whole, fraction), left: op('sub', whole, op('mul', whole, fraction)) };
    const sourceFacts = { whole: 24, numerator: 1, denominator: 3 }, sourceAnchors = { whole: '一盒饼干有24块', numerator: '小明吃了1/3', denominator: '小明吃了1/3' };
    const facts = { whole: 42, numerator: 2, denominator: 3 }, anchors = { whole: '一盒饼干有42块', numerator: '小明吃了2/3', denominator: '小明吃了2/3' };
    const relation: TransferRelation = { family: 'legacy-g5_13', targetRole: '吃掉和剩下的饼干数', roles: ['whole', 'fraction'], operations: ['吃掉数量=总块数×所占分率；剩余=总块数-吃掉数量'], units: ['块'], invariants: ['保留吃掉数和剩余数两个答案字段', '部分量按总量乘分率计算', '剩余数由总量减去部分量得到'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(cookieSource, {
      text: '一盒饼干有42块，小明吃了2/3，他吃了多少块？还剩多少块？', numbers: [42], answer: '吃了28块，剩14块', answerType: 'multi_answer',
      subAnswers: [{ id: 'eaten', label: '吃了', answer: 28, unit: '块' }, { id: 'left', label: '剩', answer: 14, unit: '块' }],
      equation: '42×2/3=28；42-28=14', answerSentence: '小明吃了28块，还剩14块。',
      explanation: '求一个数的几分之几用乘法：42×2/3=28块。剩余：42-28=14块。',
      solutionSteps: ['吃掉：42×2/3=28块', '剩余：42-28=14块'], hints: ['先用总数乘分率求吃掉的数量，再求剩余。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const roadSource = sources.find(question => question.id === 'g5_14' && question.gradeBand === 'G5');
  if (roadSource && String(roadSource.answer) === '已修3/4，剩1/4') {
    const first = op('div', f('firstNum'), f('firstDen'));
    const second = op('div', f('secondNum'), f('secondDen'));
    const result = { done: op('add', first, second), left: op('sub', 1, op('add', first, second)) };
    const sourceFacts = { firstNum: 1, firstDen: 2, secondNum: 1, secondDen: 4 };
    const sourceAnchors = { firstNum: '第一天修了全长的1/2', firstDen: '第一天修了全长的1/2', secondNum: '第二天修了全长的1/4', secondDen: '第二天修了全长的1/4' };
    const facts = { firstNum: 2, firstDen: 5, secondNum: 1, secondDen: 4 };
    const anchors = { firstNum: '第一天修了全长的2/5', firstDen: '第一天修了全长的2/5', secondNum: '第二天修了全长的1/4', secondDen: '第二天修了全长的1/4' };
    const relation: TransferRelation = { family: 'legacy-g5_14', targetRole: '已修和剩余的全长分率', roles: ['firstNum', 'firstDen', 'secondNum', 'secondDen'], operations: ['两天已修分率相加，剩余分率=1-已修分率'], units: ['分数'], invariants: ['先合并两天修路分率，再求未修部分', '保留已修和剩余两个分数字段', '变式仍有一组异分母分数相加'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'fraction' });
    batch.entries.push(makeTransferEntry(roadSource, {
      text: '修一段路，第一天修了全长的2/5，第二天修了全长的1/4，两天一共修了全长的几分之几？还剩下几分之几没修？',
      numbers: [2, 5, 1, 4], answer: '已修13/20，剩7/20', answerType: 'multi_answer',
      subAnswers: [{ id: 'done', label: '已修', answer: '13/20' }, { id: 'left', label: '剩', answer: '7/20' }],
      equation: '2/5+1/4=8/20+5/20=13/20；1-13/20=7/20', answerSentence: '两天一共修了全长的13/20，还剩7/20没修。',
      explanation: '先通分：2/5=8/20，1/4=5/20。已修13/20，剩余1-13/20=7/20。',
      solutionSteps: ['通分：2/5=8/20，1/4=5/20', '已修：8/20+5/20=13/20', '剩余：1-13/20=7/20'], hints: ['异分母相加先通分，再用1减去已修分率。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const mooncakeSource = sources.find(question => question.id === 'g5_24' && question.gradeBand === 'G5');
  if (mooncakeSource && String(mooncakeSource.answer) === '一共5/8，剩3/8') {
    const first = op('div', f('firstNum'), f('denominator'));
    const second = op('div', f('secondNum'), f('denominator'));
    const result = { sum: op('add', first, second), left: op('sub', 1, op('add', first, second)) };
    const sourceFacts = { firstNum: 3, secondNum: 2, denominator: 8 };
    const sourceAnchors = { firstNum: '爸爸吃了3/8', secondNum: '妈妈吃了2/8', denominator: '爸爸吃了3/8' };
    const facts = { firstNum: 5, secondNum: 2, denominator: 8 };
    const anchors = { firstNum: '爸爸吃了5/8', secondNum: '妈妈吃了2/8', denominator: '爸爸吃了5/8' };
    const relation: TransferRelation = { family: 'legacy-g5_24', targetRole: '两人吃掉和剩余的月饼分率', roles: ['firstNum', 'secondNum', 'denominator'], operations: ['同分母分数相加，再用1减去已吃分率'], units: ['分数'], invariants: ['两个食用分率共用同一分母', '保留合计和剩余两个答案字段', '先求合计，再从整块月饼中扣除'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'fraction' });
    batch.entries.push(makeTransferEntry(mooncakeSource, {
      text: '中秋节晚上，天上挂着一轮圆圆的明月，全家人围坐在一起。一块月饼，爸爸吃了5/8，妈妈吃了2/8，两人一共吃了几分之几？还剩几分之几？',
      numbers: [5, 2, 8], answer: '一共7/8，剩1/8', answerType: 'multi_answer',
      subAnswers: [{ id: 'sum', label: '一共', answer: '7/8' }, { id: 'left', label: '剩', answer: '1/8' }],
      equation: '5/8+2/8=7/8；1-7/8=1/8', answerSentence: '两人一共吃了八分之七，还剩八分之一。',
      explanation: '同分母相加：5/8+2/8=7/8。剩余：1-7/8=1/8。',
      solutionSteps: ['同分母相加：5/8+2/8=7/8', '剩余：1-7/8=1/8'], hints: ['同分母加法分母不变，求剩余时用1减去已吃分率。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const brineSource = sources.find(question => question.id === 'g5o_14' && question.gradeBand === 'G5');
  if (brineSource && String(brineSource.answer) === '28%') {
    const result = op('div', op('div', op('add', op('mul', f('concentrationA'), f('massA')), op('mul', f('concentrationB'), f('massB'))), op('add', f('massA'), f('massB'))), 100);
    const sourceFacts = { concentrationA: 40, massA: 300, concentrationB: 10, massB: 200 }, sourceAnchors = { concentrationA: '40%盐水300克', massA: '40%盐水300克', concentrationB: '10%盐水200克', massB: '10%盐水200克' };
    const facts = { concentrationA: 50, massA: 200, concentrationB: 10, massB: 300 }, anchors = { concentrationA: '50%盐水200克', massA: '50%盐水200克', concentrationB: '10%盐水300克', massB: '10%盐水300克' };
    const relation: TransferRelation = { family: 'legacy-g5o_14', targetRole: '混合盐水的浓度', roles: ['concentrationA', 'massA', 'concentrationB', 'massB'], operations: ['分别求两份盐水中的盐质量，相加后除以混合总质量'], units: ['百分比'], invariants: ['盐的质量守恒', '混合质量为两份质量之和', '浓度按盐质量除以混合总质量计算'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'percent' });
    batch.entries.push(makeTransferEntry(brineSource, {
      text: '有50%盐水200克和10%盐水300克混合。混合后浓度多少？', numbers: [50, 200, 10, 300], answer: '26%', answerType: 'number',
      equation: '(200×50%+300×10%)÷(200+300)=130÷500=26%', answerSentence: '混合后浓度为26%。',
      explanation: '两份盐水中的盐分别是200×50%=100克、300×10%=30克。盐共130克，混合液共500克，浓度为130÷500=26%。',
      solutionSteps: ['第一份盐：200×50%=100克', '第二份盐：300×10%=30克', '混合总量：200+300=500克', '浓度：130÷500=26%'], hints: ['混合后盐的总质量不变；用盐质量除以混合后的总质量求浓度。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const evaporateSource = sources.find(question => question.id === 'g5o_15' && question.gradeBand === 'G5');
  if (evaporateSource && String(evaporateSource.answer) === '20%') {
    const result = op('div', op('div', op('mul', f('concentration'), f('mass')), op('sub', f('mass'), f('evaporatedWater'))), 100);
    const sourceFacts = { concentration: 15, mass: 400, evaporatedWater: 100 }, sourceAnchors = { concentration: '15%糖水400克', mass: '15%糖水400克', evaporatedWater: '蒸发掉100克水' };
    const facts = { concentration: 20, mass: 500, evaporatedWater: 100 }, anchors = { concentration: '20%糖水500克', mass: '20%糖水500克', evaporatedWater: '蒸发掉100克水' };
    const relation: TransferRelation = { family: 'legacy-g5o_15', targetRole: '蒸发后糖水浓度', roles: ['concentration', 'mass', 'evaporatedWater'], operations: ['糖的质量保持不变，新的总质量等于原质量减去蒸发水量'], units: ['百分比'], invariants: ['蒸发过程中糖质量不变', '蒸发水质量从总质量中扣除', '浓度为糖质量除以新总质量'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'percent' });
    batch.entries.push(makeTransferEntry(evaporateSource, {
      text: '有20%糖水500克。蒸发掉100克水后，浓度变为多少？', numbers: [20, 500, 100], answer: '25%', answerType: 'number',
      equation: '500×20%÷(500-100)=100÷400=25%', answerSentence: '浓度变为25%。',
      explanation: '糖的质量不变，原有糖500×20%=100克。蒸发后总质量为500-100=400克，浓度是100÷400=25%。',
      solutionSteps: ['糖的质量：500×20%=100克', '蒸发后总质量：500-100=400克', '浓度：100÷400=25%'], hints: ['蒸发掉的是水，糖的质量保持不变。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const grassSource1 = sources.find(question => question.id === 'g5o_01' && question.gradeBand === 'G5');
  if (grassSource1 && Number(grassSource1.answer) === 5) {
    const loadA = op('mul', f('cowsA'), f('daysA'));
    const loadB = op('mul', f('cowsB'), f('daysB'));
    const growth = op('div', op('sub', loadA, loadB), op('sub', f('daysA'), f('daysB')));
    const initial = op('sub', loadA, op('mul', growth, f('daysA')));
    const result = op('div', initial, op('sub', f('cowsC'), growth));
    const sourceFacts = { cowsA: 10, daysA: 20, cowsB: 15, daysB: 10, cowsC: 25 }, sourceAnchors = { cowsA: '10头牛吃20天', daysA: '10头牛吃20天', cowsB: '15头牛吃10天', daysB: '15头牛吃10天', cowsC: '25头牛' };
    const facts = { cowsA: 11, daysA: 12, cowsB: 12, daysB: 10, cowsC: 10 }, anchors = { cowsA: '11头牛吃12天', daysA: '11头牛吃12天', cowsB: '12头牛吃10天', daysB: '12头牛吃10天', cowsC: '10头牛' };
    const relation: TransferRelation = { family: 'legacy-g5o_01', targetRole: '剩余草地可供目标数量牛只吃的天数', roles: ['cowsA', 'daysA', 'cowsB', 'daysB', 'cowsC'], operations: ['利用两组牛头天数差求草每天生长量，再求原有草量，最后按目标牛群的净消耗量求天数'], units: ['天'], invariants: ['草地每天匀速生长', '两组观测共同确定生长量和初始草量', '目标牛群每日净消耗量为牛数减草生长量'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(grassSource1, {
      text: '一片草地每天匀速生长。11头牛吃12天，12头牛吃10天。10头牛吃几天？', numbers: [11, 12, 12, 10, 10], answer: 15, answerType: 'number',
      equation: '草速=(11×12-12×10)÷(12-10)=6；原有草=132-6×12=60；60÷(10-6)=15天', answerSentence: '10头牛吃15天。',
      explanation: '设每头牛每天吃1份。两组总吃草量分别为11×12=132份和12×10=120份，草每天生长(132-120)÷(12-10)=6份。原有草量为132-6×12=60份。10头牛每天净消耗10-6=4份，所以能吃60÷4=15天。',
      solutionSteps: ['两次总吃草量：11×12=132份，12×10=120份', '草每天生长：(132-120)÷(12-10)=6份', '原有草量：132-6×12=60份', '目标天数：60÷(10-6)=15天'], hints: ['先比较两组“牛头数×天数”求草每天生长量，再倒推原有草量。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const grassSource2 = sources.find(question => question.id === 'g5o_02' && question.gradeBand === 'G5');
  if (grassSource2 && Number(grassSource2.answer) === 15) {
    const loadA = op('mul', f('cowsA'), f('daysA'));
    const loadB = op('mul', f('cowsB'), f('daysB'));
    const growth = op('div', op('sub', loadB, loadA), op('sub', f('daysB'), f('daysA')));
    const initial = op('sub', loadA, op('mul', growth, f('daysA')));
    const result = op('div', initial, op('sub', f('cowsC'), growth));
    const sourceFacts = { cowsA: 24, daysA: 6, cowsB: 20, daysB: 10, cowsC: 18 }, sourceAnchors = { cowsA: '24头牛吃6天', daysA: '24头牛吃6天', cowsB: '20头牛吃10天', daysB: '20头牛吃10天', cowsC: '18头牛' };
    const facts = { cowsA: 21, daysA: 8, cowsB: 18, daysB: 12, cowsC: 16 }, anchors = { cowsA: '21头牛吃8天', daysA: '21头牛吃8天', cowsB: '18头牛吃12天', daysB: '18头牛吃12天', cowsC: '16头牛' };
    const relation: TransferRelation = { family: 'legacy-g5o_02', targetRole: '目标牛群吃完牧草的天数', roles: ['cowsA', 'daysA', 'cowsB', 'daysB', 'cowsC'], operations: ['由两组观测的总吃草量差求生长量，倒推存量后按目标牛群净消耗量计算天数'], units: ['天'], invariants: ['牧草每天匀速生长', '保留牛头数与天数的两组观测', '目标天数由存量除以牛数减生长量求得'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(grassSource2, {
      text: '一片牧场每天匀速长草。21头牛吃8天，18头牛吃12天。16头牛吃几天？', numbers: [21, 8, 18, 12, 16], answer: 18, answerType: 'number',
      equation: '草速=(18×12-21×8)÷(12-8)=12；原有草=21×8-12×8=72；72÷(16-12)=18天', answerSentence: '16头牛吃18天。',
      explanation: '两组总吃草量分别为21×8=168份、18×12=216份，所以草每天生长(216-168)÷(12-8)=12份。原有草量为168-12×8=72份；16头牛每天净消耗16-12=4份，因此可吃72÷4=18天。',
      solutionSteps: ['两组总吃草量：168份和216份', '草每天生长：(216-168)÷(12-8)=12份', '原有草量：168-12×8=72份', '目标天数：72÷(16-12)=18天'], hints: ['两组观测相减可以消去原有草量，先求草每天长多少。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const makeScalarProof = (facts: Record<string, number>, anchors: Record<string, string>, result: TransferExpression, format: TransferProof['format'] = 'number'): TransferProof => ({ facts, anchors, result, format });
  const addScalar = (sourceId: string, sourceAnswer: number, relation: TransferRelation, sourceProof: TransferProof, variantProof: TransferProof, variant: TransferContent): void => {
    const source = sources.find(question => question.id === sourceId && question.gradeBand === 'G5');
    if (source && Number(source.answer) === sourceAnswer) batch.entries.push(makeTransferEntry(source, variant, relation, { kind: 'arithmetic', source: sourceProof, variant: variantProof }));
  };
  const collabA = f('soloA'), collabB = f('soloB');
  const collabResult = op('div', 1, op('add', op('div', 1, collabA), op('div', 1, collabB)));
  addScalar('g5o_03', 6,
    { family: 'legacy-g5o_03', targetRole: '两人合作完成工程的天数', roles: ['soloA', 'soloB'], operations: ['单独完成时间取倒数得到效率，效率相加后取倒数'], units: ['天'], invariants: ['合作效率是两人效率之和', '结果仍为完成一项工程所需天数'] },
    makeScalarProof({ soloA: 10, soloB: 15 }, { soloA: '甲单独做10天完成', soloB: '乙单独做15天完成' }, collabResult),
    makeScalarProof({ soloA: 30, soloB: 45 }, { soloA: '甲单独做30天完成', soloB: '乙单独做45天完成' }, collabResult),
    { text: '一项工程，甲单独做30天完成，乙单独做45天完成。两人合作几天完成？', numbers: [30, 45], answer: 18, answerType: 'number', equation: '1÷(1/30+1/45)=1÷(3/90+2/90)=18天', answerSentence: '两人合作需要18天。', explanation: '甲每天完成1/30，乙每天完成1/45。合作效率为3/90+2/90=5/90=1/18，所以合作时间为1÷(1/18)=18天。', solutionSteps: ['甲效率：1/30', '乙效率：1/45', '合作效率：1/30+1/45=1/18', '合作时间：1÷(1/18)=18天'], hints: ['把两人单独完成时间分别转成每天完成的工程分率，再相加。'] });
  const stagedA = f('soloA'), stagedB = f('soloB'), firstDays = f('firstDays');
  const stagedResult = op('div', op('sub', 1, op('div', firstDays, stagedA)), op('add', op('div', 1, stagedA), op('div', 1, stagedB)));
  addScalar('g5o_04', 5.4,
    { family: 'legacy-g5o_04', targetRole: '乙加入后两人合作完成剩余工程的天数', roles: ['soloA', 'soloB', 'firstDays'], operations: ['先扣除甲已完成的工程分率，再除以合作效率'], units: ['天'], invariants: ['甲先独做指定天数', '剩余工程由甲乙按效率和共同完成'] },
    makeScalarProof({ soloA: 12, soloB: 18, firstDays: 3 }, { soloA: '甲12天完成', soloB: '乙18天完成', firstDays: '甲先做3天' }, stagedResult),
    makeScalarProof({ soloA: 12, soloB: 18, firstDays: 9 }, { soloA: '甲12天完成', soloB: '乙18天完成', firstDays: '甲先做9天' }, stagedResult),
    { text: '一项工程，甲12天完成，乙18天完成。甲先做9天，乙加入合作还需几天？', numbers: [12, 18, 9], answer: 1.8, answerType: 'number', equation: '(1-9/12)÷(1/12+1/18)=1.8天', answerSentence: '乙加入后还需1.8天完成。', explanation: '甲先做9天完成9/12=3/4，剩下1/4。合作效率为1/12+1/18=5/36，因此还需(1/4)÷(5/36)=9/5=1.8天。', solutionSteps: ['甲先做：9/12=3/4', '剩余：1-3/4=1/4', '合作效率：1/12+1/18=5/36', '合作时间：(1/4)÷(5/36)=1.8天'], hints: ['先算甲已完成的工程分率，再计算剩余工程除以合作效率。'] });
  const saltMass = f('mass'), saltPercent = f('saltPercent'), targetPercent = f('targetPercent');
  const addedSalt = op('sub', op('div', op('mul', saltMass, op('sub', 100, saltPercent)), op('sub', 100, targetPercent)), saltMass);
  addScalar('g5o_05', 50,
    { family: 'legacy-g5o_05', targetRole: '达到目标浓度所需加入的盐质量', roles: ['mass', 'saltPercent', 'targetPercent'], operations: ['由原盐水求水质量，水质量不变反求目标总质量，再减原质量'], units: ['克'], invariants: ['加盐过程中水的质量保持不变', '新盐水浓度使用目标百分比'] },
    makeScalarProof({ mass: 200, saltPercent: 25, targetPercent: 40 }, { mass: '200克25%盐水', saltPercent: '200克25%盐水', targetPercent: '变成40%盐水' }, addedSalt),
    makeScalarProof({ mass: 300, saltPercent: 26, targetPercent: 50 }, { mass: '300克26%盐水', saltPercent: '300克26%盐水', targetPercent: '变成50%盐水' }, addedSalt),
    { text: '300克26%盐水中加多少克盐，能变成50%盐水？', numbers: [300, 26, 50], answer: 144, answerType: 'number', equation: '300×(1-26%)÷(1-50%)-300=144克', answerSentence: '需要加入144克盐。', explanation: '原盐水中的水有300×74%=222克。加盐后水量不变；达到50%时总质量为222÷50%=444克，所以需加444-300=144克盐。', solutionSteps: ['水质量：300×(1-26%)=222克', '目标总质量：222÷(1-50%)=444克', '加盐：444-300=144克'], hints: ['加盐时水的质量不变，先求水有多少克。'] });
  const readFraction = (n: string, d: string) => op('div', f(n), f(d));
  const bookResult = op('div', f('remaining'), op('mul', op('sub', 1, readFraction('firstN', 'firstD')), op('sub', 1, readFraction('secondN', 'secondD'))));
  addScalar('g5o_18', 90,
    { family: 'legacy-g5o_18', targetRole: '原有頁數', roles: ['firstN', 'firstD', 'secondN', 'secondD', 'remaining'], operations: ['依次乘兩次閱讀後的剩餘分率，已知剩餘頁數反求全書頁數'], units: ['页'], invariants: ['第二天读的是第一天读后剩余部分的给定分率', '已知量是两天后剩余页数'] },
    makeScalarProof({ firstN: 1, firstD: 5, secondN: 1, secondD: 3, remaining: 48 }, { firstN: '第一天看1/5', firstD: '第一天看1/5', secondN: '第二天看剩下的1/3', secondD: '第二天看剩下的1/3', remaining: '还剩48页' }, bookResult),
    makeScalarProof({ firstN: 1, firstD: 5, secondN: 1, secondD: 3, remaining: 40 }, { firstN: '第一天看1/5', firstD: '第一天看1/5', secondN: '第二天看剩下的1/3', secondD: '第二天看剩下的1/3', remaining: '还剩40页' }, bookResult),
    { text: '一本书第一天看1/5，第二天看剩下的1/3，还剩40页。全书有多少页？', numbers: [1, 5, 1, 3, 40], answer: 75, answerType: 'number', equation: '40÷[(1-1/5)×(1-1/3)]=75页', answerSentence: '全书有75页。', explanation: '第一天后剩4/5，第二天后剩下4/5×2/3=8/15。40页对应全书的8/15，因此全书40÷(8/15)=75页。', solutionSteps: ['第一天后剩：1-1/5=4/5', '第二天后剩：4/5×(1-1/3)=8/15', '全书：40÷(8/15)=75页'], hints: ['把每天读后剩下的分率相乘，再用已知剩余页数除以这个分率。'] });
  const ropeResult = op('div', f('added'), op('sub', readFraction('nowN', 'nowD'), op('sub', 1, readFraction('cutN', 'cutD'))));
  addScalar('g5o_19', 36,
    { family: 'legacy-g5o_19', targetRole: '绳子原长', roles: ['cutN', 'cutD', 'added', 'nowN', 'nowD'], operations: ['现长与剪后剩余的原长分率之差等于接回长度，再反求原长'], units: ['米'], invariants: ['剪去比例按原长计算', '接回长度使现长达到给定原长分率'] },
    makeScalarProof({ cutN: 1, cutD: 3, added: 6, nowN: 5, nowD: 6 }, { cutN: '剪去1/3', cutD: '剪去1/3', added: '又接上6米', nowN: '现在是原来的5/6', nowD: '现在是原来的5/6' }, ropeResult),
    makeScalarProof({ cutN: 1, cutD: 3, added: 9, nowN: 5, nowD: 6 }, { cutN: '剪去1/3', cutD: '剪去1/3', added: '又接上9米', nowN: '现在是原来的5/6', nowD: '现在是原来的5/6' }, ropeResult),
    { text: '一根绳子剪去1/3后又接上9米，现在是原来的5/6。原长多少米？', numbers: [1, 3, 9, 5, 6], answer: 54, answerType: 'number', equation: '9÷(5/6-2/3)=54米', answerSentence: '绳子原长54米。', explanation: '剪后剩原长的2/3。接回9米后是原长的5/6，所以9米对应5/6-2/3=1/6。原长为9÷1/6=54米。', solutionSteps: ['剪后剩：1-1/3=2/3', '接回部分占原长：5/6-2/3=1/6', '原长：9÷1/6=54米'], hints: ['先比较现长和剪后剩余的分率，差就是接回的9米。'] });
  const numberResult = op('div', op('mul', f('difference'), op('add', op('mul', 10, f('multiplier')), 1)), op('mul', 9, op('sub', f('multiplier'), 1)));
  addScalar('g5o_23', 62,
    { family: 'legacy-g5o_23', targetRole: '满足位数关系的原两位数', roles: ['multiplier', 'difference'], operations: ['用十位与个位系数表示原数和倒序数，相减求个位后还原原数'], units: [''], invariants: ['十位数字是个位数字的给定整数倍', '倒序后数值比原数小给定差'] },
    makeScalarProof({ multiplier: 3, difference: 36 }, { multiplier: '十位数字是个位的3倍', difference: '新数比原数少36' }, numberResult),
    makeScalarProof({ multiplier: 4, difference: 54 }, { multiplier: '十位数字是个位的4倍', difference: '新数比原数少54' }, numberResult),
    { text: '一个两位数，十位数字是个位的4倍。交换数字后所得新数比原数少54。求原数。', numbers: [4, 54], answer: 82, answerType: 'number', equation: '个位=54÷[9×(4-1)]=2；原数=41×2=82', answerSentence: '原数是82。', explanation: '设个位数字为x，十位是4x。原数为(40+1)x=41x，倒序数为(10+4)x=14x，差为27x。由27x=54得x=2，原数为41×2=82。', solutionSteps: ['两数差：9×(4-1)×个位=54', '个位：54÷27=2', '原数：41×2=82'], hints: ['设个位数字为x，先写出原数与倒序数的十位、个位组成。'] });
  const unknownResult = op('div', f('difference'), op('sub', readFraction('leftN', 'leftD'), readFraction('rightN', 'rightD')));
  addScalar('g5o_31', 30,
    { family: 'legacy-g5o_31', targetRole: '使两部分量相差给定值的数', roles: ['leftN', 'leftD', 'rightN', 'rightD', 'difference'], operations: ['两分率相减得到单位量分率，再用已知差除以分率差'], units: [''], invariants: ['两部分都来自同一个未知数', '较大分率减较小分率等于已知差'] },
    makeScalarProof({ leftN: 2, leftD: 3, rightN: 1, rightD: 2, difference: 5 }, { leftN: '2/3比它的1/2多5', leftD: '2/3比它的1/2多5', rightN: '2/3比它的1/2多5', rightD: '2/3比它的1/2多5', difference: '多5' }, unknownResult),
    makeScalarProof({ leftN: 2, leftD: 3, rightN: 1, rightD: 2, difference: 7 }, { leftN: '2/3比它的1/2多7', leftD: '2/3比它的1/2多7', rightN: '2/3比它的1/2多7', rightD: '2/3比它的1/2多7', difference: '多7' }, unknownResult),
    { text: '一个数的2/3比它的1/2多7。这个数是多少？', numbers: [2, 3, 1, 2, 7], answer: 42, answerType: 'number', equation: '(2/3-1/2)x=7，x=42', answerSentence: '这个数是42。', explanation: '2/3-1/2=1/6，未知数的1/6等于7，因此未知数是7÷1/6=42。', solutionSteps: ['分率差：2/3-1/2=1/6', '1/6对应7', '未知数：7÷1/6=42'], hints: ['先求两个分率的差，再用已知差除以分率差。'] });
  const ratioParts = (leftA: string, leftB: string, rightA: string, rightB: string) => ({
    a: f(leftA),
    b: f(leftB),
    c: op('div', op('mul', f(leftB), f(rightB)), f(rightA)),
  });
  const ratioProof = (facts: Record<string, number>, anchors: Record<string, string>, result: TransferProof['result']): TransferProof => ({ facts, anchors, result, format: 'text', template: '{a}:{b}:{c}' });
  const ratiosSource = sources.find(question => question.id === 'g5o_08' && question.gradeBand === 'G5');
  if (ratiosSource && String(ratiosSource.answer) === '3:4:6') {
    const result = ratioParts('abA', 'abB', 'bcA', 'bcB');
    const sourceFacts = { abA: 3, abB: 4, bcA: 2, bcB: 3 }, sourceAnchors = { abA: '甲:乙=3:4', abB: '甲:乙=3:4', bcA: '乙:丙=2:3', bcB: '乙:丙=2:3' };
    const facts = { abA: 5, abB: 6, bcA: 3, bcB: 4 }, anchors = { abA: '甲:乙=5:6', abB: '甲:乙=5:6', bcA: '乙:丙=3:4', bcB: '乙:丙=3:4' };
    const relation: TransferRelation = { family: 'legacy-g5o_08', targetRole: '甲乙丙三数的最简整数比', roles: ['abA', 'abB', 'bcA', 'bcB'], operations: ['按乙的份数统一两个比例，再合并得到三项之比'], units: [''], invariants: ['两个已知比例的中间量乙必须相同', '输出甲:乙:丙整数份数比'] };
    batch.entries.push(makeTransferEntry(ratiosSource, { text: '甲:乙=5:6，乙:丙=3:4。甲:乙:丙的最简整数比是多少？', numbers: [5, 6, 3, 4], answer: '5:6:8', equation: '甲:乙=5:6；乙:丙=3:4，扩成6:8；所以甲:乙:丙=5:6:8', answerSentence: '甲:乙:丙=5:6:8。', explanation: '两个比例中的乙份数统一为6。乙:丙=3:4等比扩大2倍为6:8，与甲:乙=5:6合并得5:6:8。', solutionSteps: ['甲:乙=5:6', '乙:丙=3:4，两项乘2得到6:8', '甲:乙:丙=5:6:8'], hints: ['先把两个比例里的乙份数统一。' ] }, relation, { kind: 'arithmetic', source: ratioProof(sourceFacts, sourceAnchors, result), variant: ratioProof(facts, anchors, result) }));
  }
  const acSource = sources.find(question => question.id === 'g5o_20' && question.gradeBand === 'G5');
  if (acSource && String(acSource.answer) === '8:15') {
    const result = { a: op('mul', f('abA'), f('bcA')), c: op('mul', f('abB'), f('bcB')) };
    const sourceFacts = { abA: 2, abB: 3, bcA: 4, bcB: 5 }, sourceAnchors = { abA: '甲:乙=2:3', abB: '甲:乙=2:3', bcA: '乙:丙=4:5', bcB: '乙:丙=4:5' };
    const facts = { abA: 3, abB: 4, bcA: 5, bcB: 7 }, anchors = { abA: '甲:乙=3:4', abB: '甲:乙=3:4', bcA: '乙:丙=5:7', bcB: '乙:丙=5:7' };
    const relation: TransferRelation = { family: 'legacy-g5o_20', targetRole: '甲与丙的比', roles: ['abA', 'abB', 'bcA', 'bcB'], operations: ['利用两个比例的中间项消去乙，得到甲与丙的比'], units: [''], invariants: ['甲:乙与乙:丙的乙项相互抵消', '输出最简整数比'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'text', template: '{a}:{c}' });
    batch.entries.push(makeTransferEntry(acSource, { text: '甲:乙=3:4，乙:丙=5:7。甲:丙=?', numbers: [3, 4, 5, 7], answer: '15:28', equation: '3×5=15；4×7=28；甲:丙=15:28', answerSentence: '甲:丙=15:28。', explanation: '由甲:乙=3:4、乙:丙=5:7，消去乙得到甲:丙=3×5:4×7=15:28，已是最简整数比。', solutionSteps: ['甲份数与丙份数分别相乘：3×5=15，4×7=28', '甲:丙=15:28'], hints: ['把甲:乙与乙:丙相乘，约去中间的乙。'] }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const boatResult = { boat: op('div', op('add', op('div', f('downDistance'), f('downHours')), op('div', f('upDistance'), f('upHours'))), 2), water: op('div', op('sub', op('div', f('downDistance'), f('downHours')), op('div', f('upDistance'), f('upHours'))), 2) };
  const boatRelation = (family: string): TransferRelation => ({ family, targetRole: '船在静水中的速度与水流速度', roles: ['downDistance', 'downHours', 'upDistance', 'upHours'], operations: ['分别求顺水和逆水速度，和的一半是船速，差的一半是水速'], units: ['千米/小时'], invariants: ['顺水速度等于船速加水速', '逆水速度等于船速减水速', '同时求船速和水速'] });
    const makeBoatProof = (facts: Record<string, number>, anchors: Record<string, string>): TransferProof => ({ facts, anchors, result: boatResult, format: 'text', template: '船{boat}水{water}' });
  const boatSource = sources.find(question => question.id === 'g5o_09' && question.gradeBand === 'G5');
  if (boatSource && String(boatSource.answer) === '船18水2') {
    const sourceFacts = { downDistance: 80, downHours: 4, upDistance: 80, upHours: 5 }, sourceAnchors = { downDistance: '顺水4小时行80千米', downHours: '顺水4小时行80千米', upDistance: '逆水5小时行80千米', upHours: '逆水5小时行80千米' };
    const facts = { downDistance: 88, downHours: 4, upDistance: 80, upHours: 5 }, anchors = { downDistance: '顺水4小时行88千米', downHours: '顺水4小时行88千米', upDistance: '逆水5小时行80千米', upHours: '逆水5小时行80千米' };
    batch.entries.push(makeTransferEntry(boatSource, { text: '一条船顺水4小时行88千米，逆水5小时行80千米。船速和水速各是多少？', numbers: [88, 4, 80, 5], answer: '船19水3', answerSchema: { kind: 'multi_field', fields: [{ id: 'boatspeed', label: '船速', kind: 'integer' }, { id: 'waterspeed', label: '水速', kind: 'integer' }] }, subAnswers: [{ id: 'boatspeed', label: '船速', answer: 19, unit: '千米/小时' }, { id: 'waterspeed', label: '水速', answer: 3, unit: '千米/小时' }], equation: '顺水速度=88÷4=22；逆水速度=80÷5=16；船速=(22+16)÷2=19，水速=(22-16)÷2=3', answerSentence: '船速19千米/小时，水速3千米/小时。', explanation: '顺水速度是船速与水速之和，逆水速度是两者之差。顺水速度22，逆水速度16，所以船速(22+16)÷2=19，水速(22-16)÷2=3。', solutionSteps: ['顺水：88÷4=22', '逆水：80÷5=16', '船速：(22+16)÷2=19', '水速：(22-16)÷2=3'], hints: ['先分别求顺水、逆水速度，再用和差关系求船速与水速。'] }, boatRelation('legacy-g5o_09'), { kind: 'arithmetic', source: makeBoatProof(sourceFacts, sourceAnchors), variant: makeBoatProof(facts, anchors) }));
  }
  const boatSource2 = sources.find(question => question.id === 'g5o_22' && question.gradeBand === 'G5');
  if (boatSource2 && String(boatSource2.answer) === '船16水4') {
    const sourceFacts = { downDistance: 100, downHours: 5, upDistance: 96, upHours: 8 }, sourceAnchors = { downDistance: '顺水5小时行100千米', downHours: '顺水5小时行100千米', upDistance: '逆水8小时行96千米', upHours: '逆水8小时行96千米' };
    const facts = { downDistance: 110, downHours: 5, upDistance: 96, upHours: 6 }, anchors = { downDistance: '顺水5小时行110千米', downHours: '顺水5小时行110千米', upDistance: '逆水6小时行96千米', upHours: '逆水6小时行96千米' };
    batch.entries.push(makeTransferEntry(boatSource2, { text: '一条船顺水5小时行110千米，逆水6小时行96千米。船速和水速各是多少？', numbers: [110, 5, 96, 6], answer: '船19水3', answerSchema: { kind: 'multi_field', fields: [{ id: 'boatspeed', label: '船速', kind: 'integer' }, { id: 'waterspeed', label: '水速', kind: 'integer' }] }, subAnswers: [{ id: 'boatspeed', label: '船速', answer: 19, unit: '千米/小时' }, { id: 'waterspeed', label: '水速', answer: 3, unit: '千米/小时' }], equation: '顺水速度=110÷5=22；逆水速度=96÷6=16；船速=(22+16)÷2=19，水速=(22-16)÷2=3', answerSentence: '船速19千米/小时，水速3千米/小时。', explanation: '顺水速度是船速与水速之和，逆水速度是两者之差。顺水速度22，逆水速度16，所以船速(22+16)÷2=19，水速(22-16)÷2=3。', solutionSteps: ['顺水：110÷5=22', '逆水：96÷6=16', '船速：(22+16)÷2=19', '水速：(22-16)÷2=3'], hints: ['先分别求顺水、逆水速度，再用和差关系求船速与水速。'] }, boatRelation('legacy-g5o_22'), { kind: 'arithmetic', source: makeBoatProof(sourceFacts, sourceAnchors), variant: makeBoatProof(facts, anchors) }));
  }
  const geometrySource = sources.find(question => question.id === 'g5o_25' && question.gradeBand === 'G5');
  if (geometrySource) batch.gaps.push({ sourceId: geometrySource.id, reason: 'difficulty-not-preserved', detail: '要保留三边互异、单个边长数字、三组面乘积的加法进位型态（连续两次进位）以及棱长整除切块，逐项检查一位偶数边长2/4/6/8后，唯一满足两次连续进位的不同数值组合仍是原来的8、6、4的排列，答案也因此不变；换边长会改变两次加法进位或引入一位数乘积，保持进位的近邻组12、8、6则引入两位边长和两位乘数。小正方体棱长改为1会使切块数直接等于已求总体积，省去原需除以8的分装步骤；棱长3仅有一位互异倍数3、6、9且面和仅1次进位，棱长至少4无法给出3个互异的一位倍数。把三边改成相等虽可切块却会化为正方体、减少三组不同面面积的比较。没有同时改变答案并保持原算术和几何负担的安全变式。' });
  const pumpSource = sources.find(question => question.id === 'g5o_11' && question.gradeBand === 'G5');
  if (pumpSource && String(pumpSource.answer) === '7.5') {
    const firstTotal = op('mul', f('pumpA'), f('timeA'));
    const inflow = op('div', op('sub', firstTotal, op('mul', f('pumpB'), f('timeB'))), op('sub', f('timeA'), f('timeB')));
    const initialWater = op('sub', firstTotal, op('mul', inflow, f('timeA')));
    const result = op('div', initialWater, op('sub', f('targetPumps'), inflow));
    const sourceFacts = { pumpA: 5, timeA: 20, pumpB: 8, timeB: 10, targetPumps: 10 };
    const sourceAnchors = { pumpA: '用5台抽水机20分钟', timeA: '用5台抽水机20分钟', pumpB: '用8台抽水机10分钟', timeB: '用8台抽水机10分钟', targetPumps: '用10台几分钟' };
    const facts = { pumpA: 5, timeA: 20, pumpB: 6, timeB: 10, targetPumps: 12 };
    const anchors = { pumpA: '用5台抽水机20分钟', timeA: '用5台抽水机20分钟', pumpB: '用6台抽水机10分钟', timeB: '用6台抽水机10分钟', targetPumps: '用12台几分钟' };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    const relation: TransferRelation = { family: 'legacy-g5o_11', targetRole: '持续进水时抽干水池所需时间', roles: Object.keys(facts), operations: ['两组抽水量差除以时间差求进水速度，再求水池原水量，最后除以净抽水速度'], units: ['台', '分钟'], invariants: ['进水在两次抽水过程中持续且速度不变', '抽水总量按机器数乘时间计算', '目标抽水速度需扣除进水速度'] };
    batch.entries.push(makeTransferEntry(pumpSource, {
      text: '一水池有进水管匀速注水。用5台抽水机20分钟抽干，用6台抽水机10分钟抽干。用12台几分钟抽干？', numbers: [5, 20, 6, 10, 12], answer: '2.5',
      equation: '进水速度=(5×20−6×10)÷(20−10)=4；原有水量=5×20−4×20=20；所需时间=20÷(12−4)=2.5分钟', answerSentence: '用12台抽水机2.5分钟抽干。',
      explanation: '设每台抽水机每分钟抽1份。5台20分钟抽100份，6台10分钟抽60份。两次抽水量相差40份、时间相差10分钟，所以进水速度是4份/分钟。水池原有100−4×20=20份水。12台抽水时净抽水速度是12−4=8份/分钟，需20÷8=2.5分钟。',
      solutionSteps: ['抽水量：5×20=100份，6×10=60份。', '进水速度：(100−60)÷(20−10)=4份/分钟。', '原有水量：100−4×20=20份。', '净抽水速度：12−4=8份/分钟；时间：20÷8=2.5分钟。'],
      hints: ['先由两次抽水总量的差求进水速度，再扣除进水量求水池原有水量。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const paintedCube = sources.find(question => question.id === 'g5o_26' && question.gradeBand === 'G5');
  if (paintedCube && String(paintedCube.answer) === '8,36,54,27') {
    const n = op('div', f('edge'), f('unit'));
    const inner = op('sub', n, 2);
    const paintedResult = { three: op('pow', 2, 3), two: op('mul', 12, inner), one: op('mul', 6, op('pow', inner, 2)), zero: op('pow', inner, 3) };
    const sourceFacts = { edge: 5, unit: 1 }, sourceAnchors = { edge: '棱长5厘米', unit: '棱长1厘米小正方体' };
    const facts = { edge: 4, unit: 1 }, anchors = { edge: '棱长4厘米', unit: '棱长1厘米的小正方体' };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result: paintedResult, format: 'text', template: '{three},{two},{one},{zero}' });
    const relation: TransferRelation = { family: 'legacy-g5o_26', targetRole: '切开后各面涂色情况的小正方体个数', roles: ['edge', 'unit'], operations: ['由每条棱上的小正方体数量减去两端角块，计算棱、面和内部块数量'], units: ['个'], invariants: ['三面红块为8个角', '两面红块位于12条棱的内部', '一面红块位于6个面的内部', '零面红块位于立方体内部'] };
    batch.entries.push(makeTransferEntry(paintedCube, { text: '正方体棱长4厘米。表面涂红后切成棱长1厘米的小正方体。三面红、两面红、一面红、零面红的各有几个？', numbers: [4, 1], answer: '8,24,24,8', answerSchema: { kind: 'multi_field', fields: [{ id: 'three', label: '三面红', kind: 'integer' }, { id: 'two', label: '两面红', kind: 'integer' }, { id: 'one', label: '一面红', kind: 'integer' }, { id: 'zero', label: '零面红', kind: 'integer' }] }, subAnswers: [{ id: 'three', label: '三面红', answer: 8, unit: '个' }, { id: 'two', label: '两面红', answer: 24, unit: '个' }, { id: 'one', label: '一面红', answer: 24, unit: '个' }, { id: 'zero', label: '零面红', answer: 8, unit: '个' }], equation: '角8个，棱12×(4-2)=24个，面6×(4-2)²=24个，内部(4-2)³=8个', answerSentence: '三面红8个，两面红24个，一面红24个，零面红8个。', explanation: '三面红的是8个角块；两面红的在12条棱的内部，每条有4-2=2个，共24个；一面红的在6个面的内部，共6×2²=24个；内部无红的是2³=8个。总数为64=4³。', solutionSteps: ['三面红：8个角块', '两面红：12×(4-2)=24个', '一面红：6×(4-2)²=24个', '零面红：(4-2)³=8个'], hints: ['角块有三面红；棱内部有两面红；面内部有一面红；完全内部没有红色。'] }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const profitSource = sources.find(question => question.id === 'g5o_16' && question.gradeBand === 'G5');
  if (profitSource && String(profitSource.answer) === '18元,12%') {
    const cost = f('cost'), profitRate = f('profitRate'), discount = f('discount');
    const marked = op('div', op('mul', cost, op('add', 100, profitRate)), 100);
    const sale = op('div', op('mul', marked, discount), 10);
    const profit = op('sub', sale, cost);
    const result = { profit, rate: op('div', op('mul', profit, 100), cost) };
    const sourceFacts = { cost: 150, profitRate: 40, discount: 8 }, sourceAnchors = { cost: '进价150元', profitRate: '按40%利润定价', discount: '打8折' };
    const facts = { cost: 250, profitRate: 30, discount: 8 }, anchors = { cost: '进价250元', profitRate: '按30%利润定价', discount: '打8折' };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'text', template: '{profit}元,{rate}%' });
    const relation: TransferRelation = { family: 'legacy-g5o_16', targetRole: '打折后利润金额和利润率', roles: ['cost', 'profitRate', 'discount'], operations: ['进价按利润率形成定价，按折扣求售价，售价减进价求利润，利润除进价求利润率'], units: ['元', '百分比'], invariants: ['打折售价以提价后的定价为基数', '利润率以进价为基数', '同时返回利润金额和百分比'] };
    batch.entries.push(makeTransferEntry(profitSource, { text: '一件衣服进价250元，按30%利润定价，打8折后仍赚多少？利润率多少？', numbers: [250, 30, 8], answer: '10元,4%', answerSchema: { kind: 'multi_field', fields: [{ id: 'profit', label: '赚', kind: 'integer' }, { id: 'rate', label: '利润率', kind: 'percent' }] }, subAnswers: [{ id: 'profit', label: '赚', answer: 10, unit: '元' }, { id: 'rate', label: '利润率', answer: 4, unit: '%' }], equation: '定价=250×1.3=325；售价=325×0.8=260；利润=10元，利润率=10÷250=4%', answerSentence: '打折后赚10元，利润率为4%。', explanation: '定价为250×1.3=325元，打8折后售价325×0.8=260元。利润为260-250=10元，利润率为10÷250=4%。', solutionSteps: ['定价：250×(1+30%)=325元', '售价：325×0.8=260元', '利润：260-250=10元', '利润率：10÷250=4%'], hints: ['先算利润定价，再按折扣算售价；利润率以进价为基数。'] }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const ringSource = sources.find(question => question.id === 'g5o_27' && question.gradeBand === 'G5');
  if (ringSource && String(ringSource.answer) === '200秒,2.5圈') {
    const time = op('div', f('track'), op('sub', f('fast'), f('slow')));
    const result = { seconds: time, laps: op('div', op('mul', f('fast'), time), f('track')) };
    const sourceFacts = { track: 400, fast: 5, slow: 3 }, sourceAnchors = { track: '环形跑道长400米', fast: '甲每秒5米', slow: '乙每秒3米' };
    const facts = { track: 600, fast: 5, slow: 3 }, anchors = { track: '环形跑道长600米', fast: '甲每秒5米', slow: '乙每秒3米' };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'text', template: '{seconds}秒,{laps}圈' });
    const relation: TransferRelation = { family: 'legacy-g5o_27', targetRole: '追及所需时间及甲跑过的圈数', roles: ['track', 'fast', 'slow'], operations: ['跑道周长除以速度差求追上时间，再以甲路程除周长求圈数'], units: ['秒', '圈'], invariants: ['同向追及的相对速度为速度差', '追上时多跑一圈', '同时返回时间和甲行驶圈数'] };
    batch.entries.push(makeTransferEntry(ringSource, { text: '环形跑道长600米。甲每秒5米，乙每秒3米，同向出发。甲第一次追上乙需几秒？此时甲跑了几圈？', numbers: [600, 5, 3], answer: '300秒,2.5圈', answerSchema: { kind: 'multi_field', fields: [{ id: 'time', label: '时间', kind: 'integer' }, { id: 'laps', label: '圈数', kind: 'decimal' }] }, subAnswers: [{ id: 'time', label: '时间', answer: 300, unit: '秒' }, { id: 'laps', label: '圈数', answer: 2.5, unit: '圈' }], equation: '600÷(5-3)=300秒；5×300÷600=2.5圈', answerSentence: '甲300秒后追上乙，此时跑了2.5圈。', explanation: '同向追及速度为5-3=2米/秒。追上一圈需600÷2=300秒。甲跑了5×300=1500米，1500÷600=2.5圈。', solutionSteps: ['速度差：5-3=2米/秒', '追及时间：600÷2=300秒', '甲路程：5×300=1500米', '甲圈数：1500÷600=2.5圈'], hints: ['同向追及用速度差；追上后用甲的路程除以跑道周长。'] }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const anglesSource = sources.find(question => question.id === 'g5o_21' && question.gradeBand === 'G5');
  if (anglesSource && String(anglesSource.answer) === '80°,锐角') {
    const maxAngle = op('div', op('mul', 180, f('largest')), op('add', f('first'), f('second'), f('largest')));
    const result = { maximum: maxAngle };
    const sourceFacts = { first: 2, second: 3, largest: 4 }, sourceAnchors = { first: '角度数比2:3:4', second: '角度数比2:3:4', largest: '角度数比2:3:4' };
    const facts = { first: 1, second: 2, largest: 2 }, anchors = { first: '1份', second: '2份', largest: '2份' };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'text', template: '{maximum}°,锐角' });
    const relation: TransferRelation = { family: 'legacy-g5o_21', targetRole: '三角形最大内角及三角形类型', roles: ['first', 'second', 'largest'], operations: ['按三角形内角和180度求每份角度，再判断最大角是否小于90度'], units: ['度', '角类型'], invariants: ['三角形内角和为180度', '最大角对应比例中最大份数', '三个内角均小于90度时为锐角三角形'] };
    batch.entries.push(makeTransferEntry(anglesSource, { text: '三角形三个内角的度数比是1:2:2，分别对应1份、2份、2份。最大角是多少度？是什么三角形？', numbers: [1, 2, 2], answer: '72°,锐角', answerSchema: { kind: 'multi_field', fields: [{ id: 'angle', label: '最大角', kind: 'integer' }, { id: 'type', label: '三角形类型', kind: 'text' }] }, subAnswers: [{ id: 'angle', label: '最大角', answer: 72, unit: '°' }, { id: 'type', label: '三角形类型', answer: '锐角' }], equation: '每份=180÷(1+2+2)=36°；最大角=2×36=72°，三角形是锐角三角形', answerSentence: '最大角是72°，这是锐角三角形。', explanation: '内角总份数为1+2+2=5，每份180÷5=36°。三个内角为36°、72°、72°，都小于90°，所以是锐角三角形。', solutionSteps: ['总份数：1+2+2=5', '每份：180÷5=36°', '最大角：2×36=72°', '三个角都小于90°，是锐角三角形'], hints: ['先求总份数和每份度数，再用最大份数求最大角。'] }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const roundingSource = sources.find(question => question.id === 'g5o_17' && question.gradeBand === 'G5');
  if (roundingSource && String(roundingSource.answer) === '135.3%') {
    const result = op('div', op('add', 100, f('profitPercent')), f('discountPercent'));
    const sourceFacts = { discountPercent: 85, profitPercent: 15 }, sourceAnchors = { discountPercent: '按定价的85%出售', profitPercent: '仍赚15%' };
    const facts = { discountPercent: 90, profitPercent: 20 }, anchors = { discountPercent: '按定价的90%出售', profitPercent: '仍赚20%' };
    const relation: TransferRelation = { family: 'legacy-g5o_17', targetRole: '定价占进价的百分比', roles: ['discountPercent', 'profitPercent'], operations: ['由利润率求售价相对进价比例，再除以折扣比例求定价倍数'], units: ['百分比'], invariants: ['售价等于定价乘折扣率', '售价同时等于进价乘(1+利润率)', '最终百分比保留一位小数'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'percent', precision: 1 });
    batch.entries.push(makeTransferEntry(roundingSource, { text: '商品按定价的90%出售仍赚20%。定价是进价的百分之几？结果保留一位小数。', numbers: [90, 20], answer: '133.3%', equation: '定价/进价=(1+20%)÷90%，按要求保留一位小数为133.3%', answerSentence: '定价是进价的133.3%。', explanation: '售价占进价120%，又等于定价的90%。所以定价占进价120%÷90%=133.333…%，按要求保留一位小数为133.3%。', solutionSteps: ['售价占进价：100%+20%=120%', '定价占进价：120%÷90%=133.333…%', '保留一位小数：133.3%'], hints: ['把进价看作100%，再用售价百分比除以折扣率。'] }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const pigeonholePeople = sources.find(question => question.id === 'g5o_29' && question.gradeBand === 'G5');
  if (pigeonholePeople && Number(pigeonholePeople.answer) === 3) {
    const result = op('ceil', op('div', f('people'), f('signs')));
    const sourceFacts = { people: 25, signs: 12 }, sourceAnchors = { people: '任意25个人', signs: '共12生肖' };
    const facts = { people: 37, signs: 12 }, anchors = { people: '任意37个人', signs: '共12生肖' };
    const relation: TransferRelation = { family: 'legacy-g5o_29', targetRole: '至少有多少人属相相同', roles: ['people', 'signs'], operations: ['把人数均匀分配到属相类别，向上取整得到保证同属相的人数'], units: ['人'], invariants: ['每个人恰有一个属相', '使用抽屉原理的最坏情况均分', '答案为人数除以类别数向上取整'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(pigeonholePeople, { text: '任意37个人中，至少有几个人的屬相相同？（共12生肖）', numbers: [37, 12], answer: 4, equation: '37÷12=3余1，所以至少4人属相相同', answerSentence: '至少有4人属相相同。', explanation: '最坏情况下，12个生肖各放3人共36人；第37人无论属什么生肖，都会使一个生肖有4人。', solutionSteps: ['每个生肖先放3人，共12×3=36人', '再放第37人必使某个生肖达到4人', '至少有4人属相相同'], hints: ['抽屉原理：先看每个类别最多能各放多少人而仍不保证更多。'] }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const congruenceSource = sources.find(question => question.id === 'g5o_24' && question.gradeBand === 'G5');
  if (congruenceSource && Number(congruenceSource.answer) === 27) {
    const relation: TransferRelation = { family: 'legacy-g5o_24', targetRole: '同时满足两个余数条件的最小自然数', roles: ['divisors', 'remainders'], operations: ['在一个完整的最小公倍周期内枚举候选数，找出最小同时满足两个余数条件的自然数'], units: ['自然数'], invariants: ['两个除数5和6保持不变', '同时满足两项余数关系', '从0开始覆盖完整周期以证明首个解最小'] };
    const sourceModel = { divisors: [5, 6], remainders: [2, 3], conditionAnchors: ['除以5余2', '除以6余3'], target: 'least-natural' };
    const variantModel = { divisors: [5, 6], remainders: [1, 2], conditionAnchors: ['除以5余1', '除以6余2'], target: 'least-natural' };
    batch.entries.push(makeTransferEntry(congruenceSource, {
      text: '一个自然数除以5余1，除以6余2。这个数最小是多少？', numbers: [5, 1, 6, 2], answer: 26,
      equation: '在0到29内检查：1除以5余1但除以6余1；26同时除以5余1、除以6余2。', answerSentence: '这个数最小是26。',
      explanation: '两个除数的最小公倍数是30；每30个数，两个余数会同时重复。逐一检查0到29的完整周期，最小同时满足条件的正自然数是26：26÷5余1，26÷6余2。因此更大的周期不会出现更小解。',
      solutionSteps: ['两个除数5和6的最小公倍数是30，所以检查0到29即可覆盖一个完整周期。', '在这个周期中找到同时满足两项余数条件的候选数26。', '26是周期内最小解；后续解至少比它大30。'], hints: ['利用余数周期只需检查一个完整周期，并从小到大寻找第一个符合两项条件的数。'],
    }, relation, { kind: 'enumeration', model: 'least-natural-congruence-v1', source: sourceModel, variant: variantModel }, 'structural-proof'));
  }
  return batch;
}
