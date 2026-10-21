import type { Question } from '@/lib/types';
import { makeTransferEntry } from './helpers';
import { buildUpperArithmeticBatch, type UpperArithmeticRecipe } from './legacy-upper';
import type { TransferBatch, TransferExpression, TransferProof, TransferRelation } from './types';

const f = (fact: string) => ({ fact });
const op = (name: 'add'|'sub'|'mul'|'div'|'floor'|'ceil'|'pow'|'min'|'max', ...args: TransferExpression[]): TransferExpression => ({ op: name, args });
const recipes: UpperArithmeticRecipe[] = [
  {id:'g6_01',tree:op('div',op('mul',f('length'),f('num')),f('den')),sourceFacts:{length:6,num:2,den:3},sourceAnchors:{length:'长6米',num:'用去了2/3',den:'用去了2/3'},facts:{length:9,num:2,den:3},anchors:{length:'长9米',num:'用去了2/3',den:'用去了2/3'},text:'一根绳子长9米，用去了2/3，用去了多少米？',numbers:[9],unit:'米',relationText:'总长乘用去的分子再除以分母',sourceAnswer:4},
  {id:'g6_03',tree:op('div',op('mul',f('distance'),f('den')),f('num')),sourceFacts:{distance:40,num:2,den:3},sourceAnchors:{distance:'行驶了40千米',num:'2/3小时',den:'2/3小时'},facts:{distance:54,num:3,den:4},anchors:{distance:'行驶了54千米',num:'3/4小时',den:'3/4小时'},text:'一辆汽车3/4小时行驶了54千米，这辆汽车平均每小时行驶多少千米？',numbers:[54],unit:'千米/小时',relationText:'路程乘用时分母再除以分子',sourceAnswer:60},
  {id:'g6_04',tree:op('div',op('mul',f('juice'),f('waterPart')),f('juicePart')),sourceFacts:{juice:400,juicePart:2,waterPart:3},sourceAnchors:{juice:'有橙汁400毫升',juicePart:'橙汁和水的比是2:3',waterPart:'橙汁和水的比是2:3'},facts:{juice:540,juicePart:3,waterPart:4},anchors:{juice:'有橙汁540毫升',juicePart:'橙汁和水的比是3:4',waterPart:'橙汁和水的比是3:4'},text:'调配一种橙汁饮料，橙汁和水的比是3:4。如果有橙汁540毫升，需要加多少毫升水？',numbers:[540,3,4],unit:'毫升',relationText:'橙汁量除以橙汁份数再乘水的份数',sourceAnswer:600},
  {id:'g6_05',tree:op('div',op('mul',f('total'),f('cement')),op('add',f('cement'),f('sand'),f('stone'))),sourceFacts:{total:200,cement:2,sand:3,stone:5},sourceAnchors:{total:'需要配制200千克',cement:'按2:3:5配制',sand:'按2:3:5配制',stone:'按2:3:5配制'},facts:{total:300,cement:3,sand:3,stone:4},anchors:{total:'需要配制300千克',cement:'按3:3:4配制',sand:'按3:3:4配制',stone:'按3:3:4配制'},text:'一种混凝土由水泥、沙子和石子按3:3:4配制。如果需要配制300千克混凝土，需要水泥多少千克？',numbers:[300,3,3,4],unit:'千克',relationText:'总量乘水泥份数再除以各份数之和',sourceAnswer:40},
  {id:'g6_06',tree:op('div',f('passed'),f('total')),sourceFacts:{passed:186,total:200},sourceAnchors:{passed:'达标的有186人',total:'学生200人'},facts:{passed:198,total:220},anchors:{passed:'达标的有198人',total:'学生220人'},text:'六年级有学生220人，体育达标的有198人，达标率是多少？',numbers:[198,220],unit:'%',relationText:'达标人数除以总人数',sourceAnswer:0.93,format:'percent'},
  {id:'g6_07',tree:op('div',op('mul',f('original'),8),10),sourceFacts:{original:4500},sourceAnchors:{original:'原价4500元'},facts:{original:5200},anchors:{original:'原价5200元'},text:'一台电脑原价5200元，现在打八折出售，现在的售价是多少元？',numbers:[5200],unit:'元',relationText:'原价乘8再除以10',sourceAnswer:3600},
  {id:'g6_08',tree:op('div',op('mul',f('lastYear'),115),100),sourceFacts:{lastYear:4800},sourceAnchors:{lastYear:'去年收水稻4800千克'},facts:{lastYear:5200},anchors:{lastYear:'去年收水稻5200千克'},text:'李叔叔家去年收水稻5200千克，今年比去年增产一成五，今年收水稻多少千克？',numbers:[5200],unit:'千克',relationText:'去年产量乘115再除以100',sourceAnswer:5520},
  {id:'g6_09',tree:op('mul',f('principal'),1.05),sourceFacts:{principal:2000},sourceAnchors:{principal:'存入银行2000元'},facts:{principal:2400},anchors:{principal:'存入银行2400元'},text:'存入银行2400元，存期两年，年利率是2.5%。到期后一共可以取回本金和利息共多少元？（不计利息税）',numbers:[2400,2],unit:'元',relationText:'按固定两年年利率计算本息合计',sourceAnswer:2100},
  {id:'g6_11',tree:op('div',f('circumference'),6.28),sourceFacts:{circumference:62.8},sourceAnchors:{circumference:'周长是62.8米'},facts:{circumference:94.2},anchors:{circumference:'周长是94.2米'},text:'一个圆形喷水池的周长是94.2米，它的半径是多少米？（π取3.14）',numbers:[94.2],unit:'米',relationText:'周长除以2π求半径',sourceAnswer:10},
  {id:'g6_13',tree:op('div',op('mul',f('mapCm'),50000),100000),sourceFacts:{mapCm:4},sourceAnchors:{mapCm:'距离是4厘米'},facts:{mapCm:6},anchors:{mapCm:'距离是6厘米'},text:'在一幅比例尺为1:50000的地图上，小明家到学校的距离是6厘米。小明家到学校的实际距离是多少千米？',numbers:[6],unit:'千米',relationText:'图上厘米乘比例尺后换算为千米',sourceAnswer:2},
  {id:'g6_15',tree:op('div',f('poured'),op('add',op('div',f('n1'),f('d1')),op('div',f('n2'),f('d2')))),sourceFacts:{poured:35,n1:1,d1:4,n2:1,d2:3},sourceAnchors:{poured:'两次一共倒出35升',n1:'第一次倒出原来全桶的1/4',d1:'第一次倒出原来全桶的1/4',n2:'第二次也倒出原来全桶的1/3',d2:'第二次也倒出原来全桶的1/3'},facts:{poured:70,n1:1,d1:4,n2:1,d2:3},anchors:{poured:'两次一共倒出70升',n1:'第一次倒出原来全桶的1/4',d1:'第一次倒出原来全桶的1/4',n2:'第二次也倒出原来全桶的1/3',d2:'第二次也倒出原来全桶的1/3'},text:'一桶油，第一次倒出原来全桶的1/4，第二次也倒出原来全桶的1/3，两次一共倒出70升。这桶油原来有多少升？',numbers:[70],unit:'升',relationText:'两次倒出总量除以原桶所占分率之和',sourceAnswer:60},
  {id:'g6_17',tree:op('div',op('mul',f('people'),f('mountain')),op('add',f('mountain'),f('museum'))),sourceFacts:{people:240,mountain:5,museum:3},sourceAnchors:{people:'一共240人',mountain:'按5:3分成两组',museum:'按5:3分成两组'},facts:{people:320,mountain:3,museum:5},anchors:{people:'一共320人',mountain:'按3:5分成两组',museum:'按3:5分成两组'},text:'秋高气爽，万里无云，学校组织六年级同学去郊游。一共320人，按3:5分成两组活动，一组去爬山，另一组去参观博物馆。去爬山的有多少人？',numbers:[320,3,5],unit:'人',relationText:'总人数乘爬山组份数再除以各组份数之和',sourceAnswer:150},
  {id:'g6_20',tree:op('div',op('sub',op('mul',op('add',f('paid'),op('floor',op('div',f('paid'),3))),f('price')),op('mul',f('paid'),f('price'))),op('add',f('paid'),op('floor',op('div',f('paid'),3)))),sourceFacts:{paid:12,price:4},sourceAnchors:{paid:'付12瓶饮料的钱',price:'每瓶原价4元'},facts:{paid:12,price:8},anchors:{paid:'付12瓶饮料的钱',price:'每瓶原价8元'},text:'春节到了，到处张灯结彩，喜气洋洋。超市促销：买3送1。妈妈按促销规则付12瓶饮料的钱，赠品另计；每瓶原价8元。算一算，相当于每瓶省了多少钱？',numbers:[12,8],unit:'元',relationText:'实得瓶数与付款瓶数的总价差平均到每瓶',sourceAnswer:1},
  {id:'g6_21',tree:op('div',f('passed'),f('total')),sourceFacts:{passed:230,total:250},sourceAnchors:{passed:'达标的有230人',total:'有250人参加了体能测试'},facts:{passed:252,total:280},anchors:{passed:'达标的有252人',total:'有280人参加了体能测试'},text:'学校礼堂里正在举行隆重的颁奖典礼，掌声雷动。六年级有280人参加了体能测试，达标的有252人，达标率是多少？',numbers:[252,280],unit:'%',relationText:'达标人数除以总人数',sourceAnswer:0.92,format:'percent'},
  {id:'g6_22',tree:op('div',op('mul',f('principal'),f('rate')),100),sourceFacts:{principal:2000,rate:3.5},sourceAnchors:{principal:'2000元',rate:'年利率是3.5%'},facts:{principal:2400,rate:2.5},anchors:{principal:'2400元',rate:'年利率是2.5%'},text:'银行大厅里金碧辉煌，工作人员热情地接待每一位客户。小明把2400元压岁钱存入银行，年利率是2.5%，存一年后利息是多少元？',numbers:[2400,2.5],unit:'元',relationText:'本金乘年利率再除以100，存一年',sourceAnswer:70},
  {id:'g6_23',tree:op('div',op('mul',f('total'),f('cement')),op('add',f('cement'),f('sand'),f('stone'))),sourceFacts:{total:200,cement:2,sand:3,stone:5},sourceAnchors:{total:'配制200吨',cement:'比是2:3:5',sand:'比是2:3:5',stone:'比是2:3:5'},facts:{total:350,cement:4,sand:2,stone:4},anchors:{total:'配制350吨',cement:'比是4:2:4',sand:'比是4:2:4',stone:'比是4:2:4'},text:'建筑工地上塔吊林立，工人们忙得热火朝天。一种混凝土按水泥、沙子、石子的比是4:2:4配制的，要配制350吨这样的混凝土，需要水泥多少吨？',numbers:[350,4,2,4],unit:'吨',relationText:'总量乘水泥份数再除以各份数之和',sourceAnswer:40},
  {id:'g6_25',tree:op('div',op('mul',f('lastYear'),op('add',100,f('increase'))),100),sourceFacts:{lastYear:4800,increase:15},sourceAnchors:{lastYear:'去年有图书4800册',increase:'增加了15%'},facts:{lastYear:5200,increase:15},anchors:{lastYear:'去年有图书5200册',increase:'增加了15%'},text:'同学们排着整齐的队伍走向操场，每个人脸上都写满了期待。学校图书馆去年有图书5200册，今年增加了15%，今年有图书多少册？',numbers:[5200,15],unit:'册',relationText:'先求增长后的百分率：100%+15%=115%；今年册数=去年册数×115%（也就是去年册数×(100+15)÷100）',sourceAnswer:5520},
  {id:'extra_07',tree:op('div',op('mul',f('original'),f('fold')),10),sourceFacts:{original:200,fold:8},sourceAnchors:{original:'原价200元',fold:'打8折出售'},facts:{original:260,fold:8},anchors:{original:'原价260元',fold:'打8折出售'},text:'超市打折促销，原价260元的书包打8折出售，同时还有一个原价150元的笔袋打9折，买这个书包要付多少钱？',numbers:[260,8,150,9],unit:'元',relationText:'书包原价乘折数再除以10',sourceAnswer:160},
];
export function buildLegacyGrade6Transfers(sources: readonly Question[]): TransferBatch {
  const batch = buildUpperArithmeticBatch(sources, 'G6', recipes);
  const percentChangeSource = sources.find(question => question.id === 'g6_16' && question.gradeBand === 'G6');
  if (percentChangeSource && String(percentChangeSource.answer) === '96元，比原价低') {
    const newPrice = op('mul', f('price'), op('div', op('add', 100, f('increase')), 100), op('div', op('sub', 100, f('decrease')), 100));
    const result = { now: newPrice };
    const sourceFacts = { price: 100, increase: 20, decrease: 20 }, sourceAnchors = { price: '原价是100元', increase: '先提价20%', decrease: '又降价20%' };
    const facts = { price: 200, increase: 20, decrease: 20 }, anchors = { price: '原价是200元', increase: '先提价20%', decrease: '又降价20%' };
    const relation: TransferRelation = { family: 'legacy-g6_16', targetRole: '先提价再降价后的价格及相对原价高低', roles: ['price', 'increase', 'decrease'], operations: ['依次按原价和提价后价格乘变化率，比较最终价与原价'], units: ['元', '相对高低'], invariants: ['第二次降价以提价后的价格为基数', '两个百分率相同但先后顺序作用于不同价格基数', '最终价格低于原价'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'text', template: '{now}元，比原价低' });
    batch.entries.push(makeTransferEntry(percentChangeSource, { text: '一件商品先提价20%，然后又降价20%。现在的价格比原价高了还是低了？如果原价是200元，现在是多少元？', numbers: [200], answer: '192元，比原价低', answerType: 'multi_answer', answerSchema: { kind: 'multi_field', fields: [{ id: 'now', label: '现价', kind: 'integer' }, { id: 'comparison', label: '与原价比较', kind: 'text' }] }, subAnswers: [{ id: 'now', label: '现价', answer: 192, unit: '元' }, { id: 'comparison', label: '与原价比较', answer: '低' }], equation: '200×(1+20%)×(1-20%)=192元，低于原价200元', answerSentence: '现在价格是192元，比原价低了。', explanation: '提价后价格为200×1.2=240元。再降价20%时，按240元为基数，现价为240×0.8=192元。192元比原价200元少8元，所以现价低于原价。', solutionSteps: ['提价后：200×1.2=240元', '降价后：240×0.8=192元', '现价比原价少：200−192=8元，因此比原价低'], hints: ['先算提价后的价格，再以这个新价格为基数计算降价，并与原价比较。'] }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const grainSource = sources.find(question => question.id === 'g6_19' && question.gradeBand === 'G6');
  if (grainSource && Number(grainSource.answer) === 20.724) {
    const radius = op('div', f('circumference'), 2 * 3.14);
    const result = op('div', op('mul', 3.14, op('pow', radius, 2), f('height'), f('density')), 1000);
    const sourceFacts = { circumference: 12.56, height: 3, density: 550 }, sourceAnchors = { circumference: '底面周长12.56米', height: '高3米', density: '每立方米稻谷重550千克' };
    const facts = { circumference: 18.84, height: 4, density: 500 }, anchors = { circumference: '底面周长18.84米', height: '高4米', density: '每立方米稻谷重500千克' };
    const relation: TransferRelation = { family: 'legacy-g6_19', targetRole: '圆柱粮囤可装稻谷的吨数', roles: ['circumference', 'height', 'density'], operations: ['周长除以2π求半径，再算圆柱体积，乘单位体积质量并换算吨'], units: ['吨'], invariants: ['固定π=3.14', '圆柱体积=底面积乘高', '稻谷质量由体积乘密度得到', '最终答案精确到0.001吨'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number', precision: 3 });
    batch.entries.push(makeTransferEntry(grainSource, { text: '一个圆柱形粮囤，底面周长18.84米，高4米。如果每立方米稻谷重500千克，这个粮囤最多能装多少吨稻谷？（π固定取3.14，答案精确到0.001吨）', numbers: [18.84, 4, 500], answer: 56.52, answerType: 'number', equation: 'r=18.84÷(2×3.14)=3米；V=3.14×3²×4=113.04立方米；质量=113.04×500÷1000=56.520吨', answerSentence: '这个粮囤最多能装56.520吨稻谷。', explanation: '半径为18.84÷3.14÷2=3米。体积为3.14×3²×4=113.04立方米。稻谷质量为113.04×500=56520千克，即56.520吨。', solutionSteps: ['半径：18.84÷3.14÷2=3米', '体积：3.14×3²×4=113.04立方米', '质量：113.04×500=56520千克', '换算：56520÷1000=56.520吨'], hints: ['先用底面周长求半径，再依次算体积、稻谷质量和吨数。'] }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const workRateSource = sources.find(question => question.id === 'g6_14' && question.gradeBand === 'G6');
  if (workRateSource && Number(workRateSource.answer) === 6) {
    const result = op('div', 1, op('add', op('div', 1, f('teamA')), op('div', 1, f('teamB'))));
    const sourceFacts = { teamA: 10, teamB: 15 }, sourceAnchors = { teamA: '甲队单独做需要10天完成', teamB: '乙队单独做需要15天完成' };
    const facts = { teamA: 30, teamB: 45 }, anchors = { teamA: '甲队单独做需要30天完成', teamB: '乙队单独做需要45天完成' };
    const relation: TransferRelation = { family: 'legacy-g6_14', targetRole: '两队合作完成工程所需天数', roles: ['teamA', 'teamB'], operations: ['将各队单独完成时间转为每日工作效率，相加后求倒数'], units: ['天'], invariants: ['两队效率分别为每天完成工程的1/单独天数', '合作效率等于效率之和', '结果为合作完成整项工程所需时间', '保留分数通分与约分负担'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(workRateSource, {
      text: '一项工程，甲队单独做需要30天完成，乙队单独做需要45天完成。两队合作，需要几天完成？', numbers: [30, 45], answer: 18, answerType: 'number',
      equation: '1÷(1/30+1/45)=1÷(3/90+2/90)=18天', answerSentence: '两队合作需要18天完成。',
      explanation: '甲队每天完成工程的1/30，乙队每天完成1/45。通分得3/90+2/90=5/90=1/18，所以合作需要1÷(1/18)=18天。',
      solutionSteps: ['甲队效率：1/30', '乙队效率：1/45', '合作效率：1/30+1/45=3/90+2/90=1/18', '合作天数：1÷(1/18)=18'], hints: ['先求两队每天完成工程的分率之和，再用1除以合作效率。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const flourSource = sources.find(question => question.id === 'g6_02' && question.gradeBand === 'G6');
  if (flourSource && String(flourSource.answer) === '3/8千克') {
    const result = op('mul', op('div', f('bagNum'), f('bagDen')), op('div', f('usedNum'), f('usedDen')));
    const sourceFacts = { bagNum: 3, bagDen: 4, usedNum: 1, usedDen: 2 };
    const sourceAnchors = { bagNum: '重3/4千克', bagDen: '重3/4千克', usedNum: '用去了1/2袋', usedDen: '用去了1/2袋' };
    const facts = { bagNum: 1, bagDen: 4, usedNum: 3, usedDen: 5 };
    const anchors = { bagNum: '重1/4千克', bagDen: '重1/4千克', usedNum: '用去了3/5袋', usedDen: '用去了3/5袋' };
    const relation: TransferRelation = { family: 'legacy-g6_02', targetRole: '用去的面粉重量', roles: ['bagNum', 'bagDen', 'usedNum', 'usedDen'], operations: ['一袋面粉重量乘用去的袋数分率'], units: ['千克'], invariants: ['分数乘分数求部分量', '答案按最简分数表示', '两分数均由题干中的分子和分母给定'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'fraction' });
    batch.entries.push(makeTransferEntry(flourSource, {
      text: '一袋面粉重1/4千克，做蛋糕用去了3/5袋，用去了多少千克？', numbers: [1, 4, 3, 5], answer: '3/20千克', answerType: 'text',
      equation: '1/4×3/5=3/20千克', answerSentence: '用去了二十分之三千克。', explanation: '分数乘分数：1/4×3/5=3/20千克。',
      solutionSteps: ['用去重量=一袋面粉重量×用去袋数分率', '1/4×3/5=3/20千克'], hints: ['用一袋面粉的重量乘用去的分率，分子乘分子，分母乘分母。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const pipeSource = sources.find(question => question.id === 'g6_18' && question.gradeBand === 'G6');
  if (pipeSource && String(pipeSource.answer) === '24/7') {
    const result = op('div', 1, op('add', op('div', 1, f('pipeA')), op('div', 1, f('pipeB'))));
    const sourceFacts = { pipeA: 6, pipeB: 8 }, sourceAnchors = { pipeA: '甲管6小时注满', pipeB: '乙管8小时注满' };
    const facts = { pipeA: 6, pipeB: 9 }, anchors = { pipeA: '甲管6小时注满', pipeB: '乙管9小时注满' };
    const relation: TransferRelation = { family: 'legacy-g6_18', targetRole: '两管同时注满水池的时间', roles: ['pipeA', 'pipeB'], operations: ['注水效率相加后取倒数'], units: ['小时'], invariants: ['两管效率分别为每小时1/单管时间', '合作效率等于效率之和', '最终答案为最简分数'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'fraction' });
    batch.entries.push(makeTransferEntry(pipeSource, {
      text: '一个水池装有甲、乙两个进水管。单开甲管6小时注满，单开乙管9小时注满。两管同时开，几小时可以注满水池？答案用最简分数表示。', numbers: [6, 9], answer: '18/5', answerType: 'number',
      equation: '1÷(1/6+1/9)=1÷5/18=18/5小时', answerSentence: '两管同时开需要18/5小时注满。',
      explanation: '甲管每小时注入1/6池，乙管每小时注入1/9池。合作效率为1/6+1/9=3/18+2/18=5/18池/小时，注满需要1÷(5/18)=18/5小时。',
      solutionSteps: ['甲管效率：1/6池/小时', '乙管效率：1/9池/小时', '合作效率：1/6+1/9=5/18池/小时', '时间：1÷(5/18)=18/5小时'], hints: ['先把两管每小时注水量相加，再用1除以合作效率。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const cylinderSource = sources.find(question => question.id === 'g6_12' && question.gradeBand === 'G6');
  if (cylinderSource && String(cylinderSource.answer).includes('62.8立方分米=62.8升')) {
    const volume = op('mul', 3.14, f('radius'), f('radius'), f('height'));
    const result = { volume, liters: volume };
    const sourceFacts = { radius: 2, height: 5 }, sourceAnchors = { radius: '底面半径2分米', height: '高5分米' };
    const facts = { radius: 6, height: 5 }, anchors = { radius: '底面半径6分米', height: '高5分米' };
    const template = '{volume}立方分米={liters}升';
    const relation: TransferRelation = { family: 'legacy-g6_12', targetRole: '圆柱形水桶的容积及升数', roles: ['radius', 'height'], operations: ['π乘半径平方再乘高，立方分米与升数值相同'], units: ['立方分米', '升'], invariants: ['保留圆柱底面半径平方乘高的体积关系', '同时给出立方分米和升', 'π固定取3.14且1立方分米等于1升'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'text', template });
    batch.entries.push(makeTransferEntry(cylinderSource, {
      text: '一个圆柱形水桶，底面半径6分米，高5分米。它的体积是多少立方分米？合多少升？（π取3.14）', numbers: [6, 5],
      answer: '565.2立方分米=565.2升', answerType: 'text', answerSentence: '体积是565.2立方分米，合565.2升。',
      equation: '3.14×6×6×5=565.2立方分米；565.2立方分米=565.2升', explanation: '圆柱体积=πr²h=3.14×6×6×5=565.2立方分米。1立方分米等于1升，所以容积是565.2升。',
      solutionSteps: ['底面积：3.14×6×6=113.04平方分米', '体积：113.04×5=565.2立方分米', '换算：565.2立方分米=565.2升'], hints: ['圆柱体积=π×底面半径×底面半径×高，1立方分米等于1升。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const circleSource = sources.find(question => question.id === 'g6_10' && question.gradeBand === 'G6');
  if (circleSource && String(circleSource.answer).includes('31.4') && String(circleSource.answer).includes('78.5')) {
    const result = { perimeter: op('mul', 2, 3.14, f('radius')), area: op('mul', 3.14, f('radius'), f('radius')) };
    const sourceFacts = { radius: 5 }, sourceAnchors = { radius: '半径是5米' };
    const facts = { radius: 6 }, anchors = { radius: '半径是6米' };
    const relation: TransferRelation = { family: 'legacy-g6_10', targetRole: '圆形花坛周长和面积', roles: ['radius'], operations: ['周长=2πr，面积=πr²'], units: ['米', '平方米'], invariants: ['周长和面积均由同一半径计算', '保留两个答案字段', 'π固定取3.14'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(circleSource, {
      text: '一个圆形花坛的半径是6米，它的周长是多少米？面积是多少平方米？（π取3.14）', numbers: [6], answer: '周长37.68米，面积113.04平方米', answerType: 'multi_answer',
      subAnswers: [{ id: 'perimeter', label: '周长', answer: 37.68, unit: '米' }, { id: 'area', label: '面积', answer: 113.04, unit: '平方米' }],
      equation: '周长：2×3.14×6=37.68；面积：3.14×6×6=113.04', answerSentence: '周长37.68米，面积113.04平方米。',
      explanation: '圆周长=2πr=2×3.14×6=37.68米。圆面积=πr²=3.14×6×6=113.04平方米。',
      solutionSteps: ['周长：2×3.14×6=37.68米', '面积：3.14×6×6=113.04平方米'], hints: ['圆周长用2πr，圆面积用πr²。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const source = sources.find(question => question.id === 'g6_24' && question.gradeBand === 'G6');
  if (source) {
    const diameter = f('diameter');
    const result = { perimeter: op('mul', 3.14, diameter), area: op('mul', 3.14, op('pow', op('div', diameter, 2), 2)) };
    const sourceFacts = { diameter: 10 }, sourceAnchors = { diameter: '圆形花坛的直径是10米' };
    const facts = { diameter: 12 }, anchors = { diameter: '圆形花坛的直径是12米' };
    const relation: TransferRelation = { family: 'legacy-g6_24', targetRole: '圆形花坛周长和面积', roles: ['diameter'], operations: ['周长=π×直径，面积=π×(直径÷2)²'], units: ['米', '平方米'], invariants: ['周长和面积使用同一圆形直径', 'π固定为3.14', '题目仍同时求周长与面积'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    batch.entries.push(makeTransferEntry(source, {
      text: '公园里有一座漂亮的圆形喷泉，水花在阳光下闪闪发光。圆形花坛的直径是12米，它的周长是多少米？面积是多少平方米？',
      numbers: [12], answer: '周长37.68米，面积113.04平方米', answerType: 'multi_answer',
      subAnswers: [{ id: 'perimeter', label: '周长', answer: 37.68, unit: '米' }, { id: 'area', label: '面积', answer: 113.04, unit: '平方米' }],
      equation: '周长：3.14×12=37.68；面积：3.14×(12÷2)²=113.04', answerSentence: '花坛的周长是37.68米，面积是113.04平方米。',
      explanation: '喷泉描写是干扰。周长=πd=3.14×12=37.68米；半径=12÷2=6米，面积=πr²=3.14×6²=113.04平方米。',
      solutionSteps: ['去掉喷泉的描写', '周长：C=πd=3.14×12=37.68米', '半径：12÷2=6米', '面积：S=πr²=3.14×6²=113.04平方米'], hints: ['周长用直径乘π，面积先把直径除以2求半径。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  return batch;
}
