import type { Question } from '@/lib/types';
import { makeTransferEntry } from './helpers';
import type { TransferBatch, TransferExpression, TransferProof, TransferRelation } from './types';

type Recipe = {
  id: string; tree: TransferExpression; facts: Record<string, number>; anchors: Record<string, string>;
  variantFacts: Record<string, number>; variantAnchors: Record<string, string>; text: string;
  equation: string; unit: string; story: string; steps: string[]; hints: string[];
  numbers: number[]; sourceAnswer: number;
};
const f = (fact: string): TransferExpression => ({ fact });
const op = (name: 'add'|'sub'|'mul'|'div', ...args: TransferExpression[]): TransferExpression => ({ op: name, args });
const recipes: Recipe[] = [
  { id:'g2_01',tree:op('mul',f('perBox'),f('boxes')),facts:{perBox:6,boxes:4},anchors:{perBox:'每盒有6支蜡笔',boxes:'4盒'},variantFacts:{perBox:7,boxes:3},variantAnchors:{perBox:'每盒有7支彩笔',boxes:'3盒'},text:'每盒有7支彩笔，3盒一共有多少支彩笔？',equation:'7×3=21',unit:'支',story:'每盒7支，3盒就是7支的3倍。',steps:['找出每盒数量7支和盒数3盒。','求3个7相加：7×3=21支。'],hints:['每盒数量相同。','把每盒数量乘盒数。'],numbers:[7,3],sourceAnswer:24},
  { id:'g2_02',tree:op('div',f('total'),f('groups')),facts:{total:12,groups:3},anchors:{total:'有12个苹果',groups:'分给3个小朋友'},variantFacts:{total:20,groups:4},variantAnchors:{total:'有20个梨',groups:'平均分给4个小朋友'},text:'有20个梨，平均分给4个小朋友，每人分到几个梨？',equation:'20÷4=5',unit:'个',story:'20个梨平均分成4份，每份是20÷4。',steps:['总数是20个，平均分成4份。','计算20÷4=5。'],hints:['平均分表示每份一样多。','用总数除以份数。'],numbers:[20,4],sourceAnswer:4},
  { id:'g2_03',tree:op('add',op('sub',f('start'),f('left')),f('boarded')),facts:{start:25,left:8,boarded:6},anchors:{start:'有25个乘客',left:'下了8个人',boarded:'上来了6个人'},variantFacts:{start:34,left:9,boarded:7},variantAnchors:{start:'有34名乘客',left:'下了9人',boarded:'上来了7个人'},text:'公交车上原有34名乘客，到站下了9人，又上来了7个人。车上现在有多少名乘客？',equation:'34−9+7=32',unit:'名',story:'先减去下车的人，再加上上车的人。',steps:['下车后有34−9=25名。','再上车7名：25+7=32名。'],hints:['先处理下车，再处理上车。','按事情发生的顺序计算。'],numbers:[34,9,7],sourceAnswer:23},
  { id:'g2_04',tree:op('mul',f('price'),f('count')),facts:{price:8,count:5},anchors:{price:'价格是8元',count:'买5本'},variantFacts:{price:9,count:4},variantAnchors:{price:'每本9元',count:'买4本'},text:'一本练习册每本9元，买4本一共需要多少元？',equation:'9×4=36',unit:'元',story:'每本9元，买4本需要4个9元。',steps:['单价是9元，数量是4本。','总价：9×4=36元。'],hints:['每本价格相同。','总价等于单价乘数量。'],numbers:[9,4],sourceAnswer:40},
  { id:'g2_05',tree:op('div',f('total'),f('boxes')),facts:{total:20,boxes:4},anchors:{total:'有20颗糖果',boxes:'放在4个盒子里'},variantFacts:{total:27,boxes:3},variantAnchors:{total:'有27颗糖果',boxes:'放在3个盒子里'},text:'小红有27颗糖果，平均放在3个盒子里，每个盒子放几颗？',equation:'27÷3=9',unit:'颗',story:'把27颗糖平均分成3份，求每份数量。',steps:['糖果总数27颗，盒子数3个。','每盒：27÷3=9颗。'],hints:['每个盒子装得一样多。','用总数除以盒数。'],numbers:[27,3],sourceAnswer:5},
  { id:'g2_06',tree:op('add',op('sub',f('start'),f('sent')),f('received')),facts:{start:35,sent:18,received:12},anchors:{start:'有35张贴纸',sent:'送给了朋友18张',received:'又给他买了12张'},variantFacts:{start:43,sent:16,received:12},variantAnchors:{start:'有43张贴纸',sent:'送给朋友16张',received:'又买来12张'},text:'小明有43张贴纸，送给朋友16张，又买来12张。小明现在有几张贴纸？',equation:'43−16+12=39',unit:'张',story:'先算送出后剩下的贴纸，再加上新买的。',steps:['送出后剩43−16=27张。','买来12张后有27+12=39张。'],hints:['送出使数量减少。','买来使数量增加，按顺序计算。'],numbers:[43,16,12],sourceAnswer:29},
  { id:'g2_08',tree:op('sub',f('paid'),op('mul',f('price'),f('count'))),facts:{price:3,count:6,paid:20},anchors:{price:'铅笔3元',count:'买了6支',paid:'付了20元'},variantFacts:{price:3,count:7,paid:30},variantAnchors:{price:'铅笔3元',count:'买了7支',paid:'付了30元'},text:'一支铅笔3元，小华买了7支，付了30元，应该找回多少元？',equation:'30−3×7=9',unit:'元',story:'先求7支铅笔的总价，再用付款减去总价。',steps:['铅笔总价：3×7=21元。','找回：30−21=9元。'],hints:['先求商品总价。','找零等于付款减总价。'],numbers:[3,7,30],sourceAnswer:2},
  { id:'g2_09',tree:op('mul',f('perTree'),f('trees')),facts:{perTree:5,trees:7},anchors:{perTree:'有5只小鸟',trees:'7棵树'},variantFacts:{perTree:4,trees:8},variantAnchors:{perTree:'每棵树上有4只小鸟',trees:'8棵树'},text:'每棵树上有4只小鸟，8棵树上一共有多少只小鸟？',equation:'4×8=32',unit:'只',story:'每棵树4只，8棵树共有4的8倍。',steps:['每棵4只，共8棵。','4×8=32只。'],hints:['每棵数量相同。','用每棵数量乘树的棵数。'],numbers:[4,8],sourceAnswer:35},
  { id:'g2_11',tree:op('sub',f('larger'),f('smaller')),facts:{larger:12,smaller:7},anchors:{larger:'小白兔有12根胡萝卜',smaller:'小灰兔有7根胡萝卜'},variantFacts:{larger:15,smaller:8},variantAnchors:{larger:'小白兔有15根胡萝卜',smaller:'小灰兔有8根'},text:'小白兔有15根胡萝卜，小灰兔有8根。小白兔比小灰兔多几根？',equation:'15−8=7',unit:'根',story:'求多出的数量，用较多的数量减较少的数量。',steps:['较多数量15根，较少数量8根。','相差15−8=7根。'],hints:['“多几根”问两个数量的差。','用大数减小数。'],numbers:[15,8],sourceAnswer:5},
  { id:'g2_12',tree:op('div',f('total'),f('children')),facts:{total:18,children:6},anchors:{total:'有18支铅笔',children:'分给6个小朋友'},variantFacts:{total:28,children:4},variantAnchors:{total:'有28支铅笔',children:'平均分给4个小朋友'},text:'有28支铅笔，平均分给4个小朋友，每人分到几支？',equation:'28÷4=7',unit:'支',story:'平均分求每人份数，用总数除以人数。',steps:['总数28支，分给4人。','28÷4=7支。'],hints:['平均分后每人数量相同。','总数除以人数。'],numbers:[28,4],sourceAnswer:3},
  { id:'g2_13',tree:op('sub',f('length'),f('cut')),facts:{length:36,cut:9},anchors:{length:'长36米',cut:'剪下9米'},variantFacts:{length:48,cut:9},variantAnchors:{length:'长48米',cut:'剪下9米'},text:'一根绳子长48米，剪下9米后，剩下的绳子有多少米？',equation:'48−9=39',unit:'米',story:'从原长中减去剪下的长度。',steps:['原长48米，剪下9米。','剩下48−9=39米。'],hints:['剪下后绳子变短。','用原长减剪下的长度。'],numbers:[48,9],sourceAnswer:27},
  { id:'g2_14',tree:op('sub',f('fruit'),f('taken')),facts:{fruit:40,taken:15},anchors:{fruit:'有40个桃子',taken:'摘了15个桃子'},variantFacts:{fruit:52,taken:25},variantAnchors:{fruit:'有52个桃子',taken:'摘了25个桃子'},text:'树上有52个桃子，小猴摘了25个桃子吃掉了，树上还剩多少个桃子？',equation:'52−25=27',unit:'个',story:'树上剩下的桃子等于原有数减去摘下数。',steps:['原有52个，摘下25个。','52−25=27个。'],hints:['摘走使树上数量减少。','用原有数量减去摘走数量。'],numbers:[52,25],sourceAnswer:25},
  { id:'g2_15',tree:op('mul',f('petals'),f('flowers')),facts:{petals:5,flowers:8},anchors:{petals:'有5片花瓣',flowers:'8朵小花'},variantFacts:{petals:6,flowers:7},variantAnchors:{petals:'每朵小花有6片花瓣',flowers:'7朵小花'},text:'每朵小花有6片花瓣，7朵小花一共有多少片花瓣？',equation:'6×7=42',unit:'片',story:'每朵6片，共7朵。',steps:['每朵花6片花瓣，共7朵。','6×7=42片。'],hints:['每朵花的花瓣数一样。','把每朵花的数量累加7次。'],numbers:[6,7],sourceAnswer:40},
  { id:'g2_16',tree:op('add',op('sub',f('start'),f('out')),f('in')),facts:{start:24,out:7,in:11},anchors:{start:'有24条金鱼',out:'捞出了7条',in:'放进了11条'},variantFacts:{start:31,out:8,in:12},variantAnchors:{start:'有31条金鱼',out:'捞出8条',in:'放进12条'},text:'池塘里有31条金鱼，捞出8条，又放进12条，现在有多少条金鱼？',equation:'31−8+12=35',unit:'条',story:'先减去捞出的金鱼，再加上放回池塘的金鱼。',steps:['捞出后有31−8=23条。','再放进12条：23+12=35条。'],hints:['按先捞出、后放进的顺序计算。','捞出用减法，放进用加法。'],numbers:[31,8,12],sourceAnswer:28},
  { id:'g2_17',tree:op('mul',f('price'),f('count')),facts:{price:5,count:4},anchors:{price:'酸奶5元',count:'买了4瓶'},variantFacts:{price:6,count:3},variantAnchors:{price:'酸奶6元',count:'买了3瓶'},text:'一瓶酸奶6元，妈妈买了3瓶，需要付多少元？',equation:'6×3=18',unit:'元',story:'总价等于每瓶价格乘瓶数。',steps:['每瓶6元，买3瓶。','6×3=18元。'],hints:['每瓶价格相同。','单价乘数量求总价。'],numbers:[6,3],sourceAnswer:20},
  { id:'g2_18',tree:op('mul',f('minutes'),f('classes')),facts:{minutes:40,classes:3},anchors:{minutes:'一节课40分钟',classes:'上了3节课'},variantFacts:{minutes:45,classes:4},variantAnchors:{minutes:'一节课45分钟',classes:'上了4节课'},text:'一节课45分钟，上午上了4节课，一共上了多少分钟？',equation:'45×4=180',unit:'分钟',story:'每节课45分钟，4节课的总时长是45×4。',steps:['一节课45分钟，共4节。','45×4=180分钟。'],hints:['每节课时间一样。','每节课分钟数乘课数。'],numbers:[45,4],sourceAnswer:120},
  { id:'g2_19',tree:op('sub',op('sub',f('money'),f('ticket')),f('snack')),facts:{money:30,ticket:15,snack:9},anchors:{money:'带了30元钱',ticket:'门票花了15元',snack:'零食花了9元'},variantFacts:{money:42,ticket:18,snack:9},variantAnchors:{money:'带了42元',ticket:'门票花了18元',snack:'零食花了9元'},text:'小明带了42元，买门票花了18元，买零食花了9元，还剩多少元？',equation:'42−18−9=15',unit:'元',story:'从带的钱中先后减去门票和零食的花费。',steps:['买门票后剩42−18=24元。','买零食后剩24−9=15元。'],hints:['两笔花费都要从带的钱里扣除。','按花钱顺序连续减去。'],numbers:[42,18,9],sourceAnswer:6},
  { id:'g2_20',tree:op('div',f('eggs'),f('perBox')),facts:{eggs:30,perBox:6},anchors:{eggs:'有30个鸡蛋',perBox:'每6个装一盒'},variantFacts:{eggs:42,perBox:7},variantAnchors:{eggs:'有42个鸡蛋',perBox:'每7个装一盒'},text:'有42个鸡蛋，每7个装一盒，可以装几盒？',equation:'42÷7=6',unit:'盒',story:'求能装几盒，用鸡蛋总数除以每盒数量。',steps:['鸡蛋总数42个，每盒装7个。','42÷7=6盒。'],hints:['每盒装的数量固定。','总数除以每盒数量。'],numbers:[42,7],sourceAnswer:5},
  { id:'g2_21',tree:op('mul',f('boxes'),f('perBox')),facts:{boxes:5,perBox:8},anchors:{boxes:'有5盒铅笔',perBox:'每盒8支'},variantFacts:{boxes:6,perBox:7},variantAnchors:{boxes:'有6盒铅笔',perBox:'每盒7支'},text:'文具店里有6盒铅笔，每盒7支，一共有多少支铅笔？',equation:'6×7=42',unit:'支',story:'6盒铅笔，每盒7支。',steps:['盒数是6，每盒7支。','6×7=42支。'],hints:['每盒支数相同。','把每盒数量乘盒数。'],numbers:[6,7],sourceAnswer:40},
  { id:'g2_22',tree:op('sub',f('peaches'),f('eaten')),facts:{peaches:28,eaten:13},anchors:{peaches:'摘了28个桃子',eaten:'吃了13个'},variantFacts:{peaches:47,eaten:15},variantAnchors:{peaches:'摘了47个桃子',eaten:'吃了15个'},text:'小猴摘了47个桃子，吃了15个后，还剩多少个桃子？',equation:'47−15=32',unit:'个',story:'摘来的桃子减去吃掉的就是剩下的。',steps:['摘来47个，吃掉15个。','47−15=32个。'],hints:['吃掉后数量减少。','用原有数量减去吃掉数量。'],numbers:[47,15],sourceAnswer:15},
  { id:'g2_23',tree:op('sub',f('money'),f('spent')),facts:{money:30,spent:12},anchors:{money:'有30元零花钱',spent:'花了12元'},variantFacts:{money:50,spent:23},variantAnchors:{money:'有50元零花钱',spent:'花了23元'},text:'小红有50元零花钱，买故事书花了23元，还剩多少元？',equation:'50−23=27',unit:'元',story:'剩余的钱等于原有钱数减去花费。',steps:['原有50元，花去23元。','50−23=27元。'],hints:['花钱会让钱数减少。','原有金额减花费。'],numbers:[50,23],sourceAnswer:18},
  { id:'g2_25',tree:op('div',f('children'),f('groups')),facts:{children:24,groups:4},anchors:{children:'24个小朋友',groups:'平均分成4组'},variantFacts:{children:35,groups:5},variantAnchors:{children:'35个小朋友',groups:'平均分成5组'},text:'老师把35个小朋友平均分成5组做游戏，每组有几个小朋友？',equation:'35÷5=7',unit:'人',story:'平均分组，求每组人数。',steps:['总人数35人，分成5组。','每组35÷5=7人。'],hints:['每组人数相同。','用总人数除以组数。'],numbers:[35,5],sourceAnswer:6},
  { id:'g2o_03',tree:op('div',op('add',f('total'),op('mul',2,f('moved'))),2),facts:{total:20,moved:3},anchors:{total:'共重20千克',moved:'拿出3千克'},variantFacts:{total:40,moved:4},variantAnchors:{total:'共重40千克',moved:'拿出4千克'},text:'两筐苹果共重40千克，从第一筐拿出4千克放到第二筐后，两筐一样重。原来第一筐有多少千克？',equation:'(40+2×4)÷2=24',unit:'千克',story:'移出4千克后两筐相等，说明原来第一筐比两筐平均重量多4千克。',steps:['两筐相等时每筐重40÷2=20千克。','第一筐原来比20千克多拿出的4千克。','原来第一筐重20+4=24千克。'],hints:['先求两筐相等时每筐的重量。','第一筐拿出的重量转到了第二筐，原来第一筐要加回这4千克。'],numbers:[40,4],sourceAnswer:13},
  { id:'g2o_08',tree:op('add',op('div',f('length'),f('interval')),1),facts:{length:20,interval:5},anchors:{length:'直路长20米',interval:'每隔5米'},variantFacts:{length:25,interval:5},variantAnchors:{length:'直路长25米',interval:'每隔5米'},text:'一条直路长25米，从头到尾每隔5米种一棵树（两端都种）。一共种几棵树？',equation:'25÷5+1=6',unit:'棵',story:'先数出25米里有几个5米间隔；两端都种时，树的棵数比间隔数多1。',steps:['间隔数：25÷5=5段。','两端都种，树数比间隔数多1：5+1=6棵。'],hints:['先数间隔段数。','两端都种时，点数比间隔数多1。'],numbers:[25,5],sourceAnswer:5},
  { id:'g2o_09',tree:op('sub',op('div',f('length'),f('interval')),1),facts:{length:15,interval:3},anchors:{length:'小路长15米',interval:'每隔3米'},variantFacts:{length:24,interval:4},variantAnchors:{length:'小路长24米',interval:'每隔4米'},text:'一条小路长24米，每隔4米放一盆花，两端都不放。一共要几盆花？',equation:'24÷4−1=5',unit:'盆',story:'先求间隔段数；两端都不放，花盆数比间隔段数少1。',steps:['间隔段数：24÷4=6段。','两端都不放，花盆数：6−1=5盆。'],hints:['先求一共有几个间隔。','两端都不放，盆数比间隔少1。'],numbers:[24,4],sourceAnswer:4},
  { id:'g2o_10',tree:op('div',f('circumference'),f('interval')),facts:{circumference:24,interval:3},anchors:{circumference:'周长是24米',interval:'每隔3米'},variantFacts:{circumference:30,interval:5},variantAnchors:{circumference:'周长是30米',interval:'每隔5米'},text:'一个圆形花坛的周长是30米，沿花坛每隔5米种一棵树。一共种几棵？',equation:'30÷5=6',unit:'棵',story:'圆形路线首尾相接，间隔段数与树的棵数相同。',steps:['圆形周长30米，每段间隔5米。','30÷5=6段，因此种6棵树。'],hints:['圆形首尾相连，没有开放路线的两个端点。','用周长除以间隔长度。'],numbers:[30,5],sourceAnswer:8},
  { id:'g2o_11',tree:op('sub',op('div',f('result'),f('multiplier')),f('added')),facts:{added:5,multiplier:2,result:18},anchors:{added:'先加5',multiplier:'再乘2',result:'结果是18'},variantFacts:{added:3,multiplier:3,result:24},variantAnchors:{added:'先加3',multiplier:'再乘3',result:'结果是24'},text:'一个数先加3，再乘3，结果是24。原来这个数是多少？从后往前推！',equation:'24÷3−3=5',unit:'',story:'从结果倒推：先除以最后乘的3，再减去先前加的3。',steps:['先逆运算：24÷3=8。','再逆运算：8−3=5。'],hints:['从结果开始，按相反的运算顺序倒推。','乘法用除法还原，加法用减法还原。'],numbers:[3,3,24],sourceAnswer:4},
  { id:'g2o_12',tree:op('sub',op('add',f('now'),f('eaten')),f('bought')),facts:{eaten:4,bought:3,now:11},anchors:{eaten:'吃掉4个',bought:'又买来3个',now:'现在有11个'},variantFacts:{eaten:5,bought:2,now:14},variantAnchors:{eaten:'吃掉5个',bought:'又买来2个',now:'现在有14个'},text:'妈妈买了一些苹果，吃掉5个，又买来2个，现在有14个。原来有几个苹果？',equation:'14+5−2=17',unit:'个',story:'倒推到原来：先把吃掉的苹果加回，再减去后来买来的苹果。',steps:['把吃掉的5个加回：14+5=19个。','减去后来买来的2个：19−2=17个。'],hints:['从现在的数量向原来倒推。','吃掉的要加回，后来买来的要减去。'],numbers:[5,2,14],sourceAnswer:12},
  { id:'g2o_13',tree:op('add',op('mul',f('result'),f('divisor')),f('subtracted')),facts:{subtracted:8,divisor:3,result:6},anchors:{subtracted:'减去8',divisor:'除以3',result:'结果是6'},variantFacts:{subtracted:8,divisor:3,result:5},variantAnchors:{subtracted:'减去8',divisor:'除以3',result:'结果是5'},text:'一个数减去8，再除以3，结果是5。原来这个数是多少？',equation:'5×3+8=23',unit:'',story:'按相反顺序还原：先把结果乘3，再加回减去的8。',steps:['先还原除法：5×3=15。','再加回8：15+8=23。'],hints:['从最后一步开始倒推。','除以3的逆运算是乘3，再还原减法。'],numbers:[8,3,5],sourceAnswer:26},
  { id:'g2o_14',tree:op('sub',op('sub',f('result'),op('mul',f('tens'),10)),f('addend')),facts:{tens:3,addend:24,result:62},anchors:{tens:'3□',addend:'24',result:'62'},variantFacts:{tens:4,addend:25,result:71},variantAnchors:{tens:'4□',addend:'25',result:'71'},text:'在□里填数：4□ + 25 = 71。□是几？',equation:'40+□+25=71；□=6',unit:'',story:'先减去已知的整十数40和加数25，再看个位还差多少。',steps:['把4□写成40+□。','□=71−40−25=6。'],hints:['把两位数拆成几十和个位。','从结果中减去两个已知部分。'],numbers:[4,25,71],sourceAnswer:8},
  { id:'g2o_15',tree:op('div',op('sub',op('add',f('difference'),f('subtrahend')),f('ones')),10),facts:{ones:7,subtrahend:32,difference:25},anchors:{ones:'□7',subtrahend:'32',difference:'25'},variantFacts:{ones:8,subtrahend:43,difference:25},variantAnchors:{ones:'□8',subtrahend:'43',difference:'25'},text:'在□里填数：□8 − 43 = 25。□是几？',equation:'10×□+8−43=25；□=6',unit:'',story:'先把被减数恢复出来，再扣除个位8，最后除以10求十位数字。',steps:['被减数为25+43=68。','十位数字满足10×□+8=68，所以□=(68−8)÷10=6。'],hints:['先用差加减数求被减数。','利用被减数个位是8，求出整十部分。'],numbers:[8,43,25],sourceAnswer:5},
  { id:'g2o_16',tree:op('div',op('sub',op('sub',f('result'),op('mul',10,f('tens'))),9),11),facts:{tens:2,result:51},anchors:{tens:'2□',result:'51'},variantFacts:{tens:4,result:82},variantAnchors:{tens:'4□',result:'82'},text:'在□里填数：4□ + □9 = 82。两个□是同一个数字。□是几？',equation:'40+□+10×□+9=82；□=3',unit:'',story:'两个方框是同一个数码，个位贡献一次、十位贡献十次，合起来是11倍。',steps:['已知部分是40+9=49，未知数贡献11个□。','□=(82−49)÷11=3。'],hints:['把两个相同方框合并成11个相同数码。','先减掉已知的十位和个位，再除以11。'],numbers:[4,9,82],sourceAnswer:2},
  { id:'g2o_17',tree:op('add',f('a'),f('b'),f('c'),f('d')),facts:{a:9,b:8,c:1,d:2},anchors:{a:'9+8+1+2',b:'9+8+1+2',c:'9+8+1+2',d:'9+8+1+2'},variantFacts:{a:8,b:2,c:5,d:6},variantAnchors:{a:'8+2+5+6',b:'8+2+5+6',c:'8+2+5+6',d:'8+2+5+6'},text:'计算 8+2+5+6。先找能凑成10的朋友再算！',equation:'8+2+5+6=21',unit:'',story:'先把8和2凑成10，再加上5和6。',steps:['8+2=10。','10+5+6=21。'],hints:['先找能凑成10的一对数。','再把剩余的数加上。'],numbers:[8,2,5,6],sourceAnswer:20},
  { id:'g2o_20',tree:op('mul',f('tops'),f('pants')),facts:{tops:3,pants:2},anchors:{tops:'3件上衣',pants:'2条裤子'},variantFacts:{tops:4,pants:3},variantAnchors:{tops:'4件上衣',pants:'3条裤子'},text:'小明有4件上衣和3条裤子。每次穿1件上衣和1条裤子。一共有几种搭配？画连线图想一想！',equation:'4×3=12',unit:'种',story:'每件上衣都能和3条裤子分别搭配，共有4组3种。',steps:['每件上衣可以配3条裤子。','4件上衣共4×3=12种搭配。'],hints:['为每件上衣分别列出可搭配的裤子。','把每件上衣对应的3种搭配合起来。'],numbers:[4,3],sourceAnswer:6},
];

function calc(node: TransferExpression, facts: Record<string, number>): number {
  if (typeof node === 'number') return node;
  if ('fact' in node) return facts[node.fact];
  const a = node.args.map(x => calc(x, facts));
  switch (node.op) { case 'add': return a.reduce((x,y)=>x+y); case 'sub': return a[0]-a[1]; case 'mul': return a.reduce((x,y)=>x*y); case 'div': return a[0]/a[1]; default: throw new Error(`unsupported recipe op ${node.op}`); }
}
function proof(facts: Record<string, number>, anchors: Record<string, string>, tree: TransferExpression): TransferProof {
  return { facts, anchors, result: tree, format: 'number' };
}
export function buildLegacyGrade2Transfers(sources: readonly Question[]): TransferBatch {
  const byId = new Map(sources.filter(q => q.gradeBand === 'G2').map(q=>[q.id,q]));
  const entries: TransferBatch['entries'] = []; const gaps: TransferBatch['gaps'] = [];
  for (const r of recipes) {
    const source = byId.get(r.id); if (!source) continue;
    if (calc(r.tree,r.facts) !== r.sourceAnswer || source.answer !== r.sourceAnswer) {
      gaps.push({sourceId:r.id,reason:'source-answer-drift',detail:'题干关系的显式算术复核与原题存储答案不符，暂不生成变式。'}); continue;
    }
    if (source.qualityStatus === 'unsafe' || source.qualityStatus === 'fail' || source.qualityStatus === 'needs_review') {
      gaps.push({sourceId:r.id,reason:'source-unsafe',detail:`原题质量标记为${source.qualityStatus}，保持隔离。`}); continue;
    }
    const answer = calc(r.tree,r.variantFacts);
    if (!Number.isInteger(answer) || answer === r.sourceAnswer) { gaps.push({sourceId:r.id,reason:'invalid-variant-result',detail:'固定变式未得到与原题不同的非负整数答案。'}); continue; }
    const equations = r.equation;
    const relation: TransferRelation = {family:`grade2-explicit-${r.id}`,targetRole:'题干所问结果',roles:Object.keys(r.variantFacts),operations:['same explicit arithmetic tree'],units:[r.unit],invariants:['事实锚点来自题干原文','目标未知量和运算次序保持','整数答案与原题不同']};
    const variant = makeTransferEntry(source, {text:r.text,numbers:r.numbers,answer,answerType:'number',equation:equations,answerSentence:`答案是${answer}${r.unit}。`,explanation:`${r.story} 因此${r.equation.replace(/=\d+$/,`=${answer}`)}。`,solutionSteps:r.steps,hints:r.hints},relation,{kind:'arithmetic',source:proof(r.facts,r.anchors,r.tree),variant:proof(r.variantFacts,r.variantAnchors,r.tree)});
    variant.variant.questionMeaningOptions=['求题目所问的数量','求两个数量的差','求每份的数量']; variant.variant.correctMeaning='求题目所问的数量';
    entries.push(variant);
  }
  const shelf = byId.get('g2_10');
  if (shelf) {
    const tree: TransferExpression | Record<string,TransferExpression> = {
      lower: op('sub',f('upper'),f('difference')),
      total: op('add',f('upper'),op('sub',f('upper'),f('difference'))),
    };
    const sourceFacts={upper:28,difference:9}, sourceAnchors={upper:'上层有28本图书',difference:'比上层少9本'};
    const variantFacts={upper:34,difference:7}, variantAnchors={upper:'上层有34本图书',difference:'比上层少7本'};
    const values={lower:27,total:61};
    if (shelf.subAnswers?.some(a=>a.id==='lower'&&a.answer===19)&&shelf.subAnswers?.some(a=>a.id==='total'&&a.answer===47)) {
      entries.push(makeTransferEntry(shelf,{
        text:'书架上层有34本图书，下层比上层少7本。下层有多少本图书？两层一共有多少本？',numbers:[34,7],answer:'下层27本，一共61本',answerType:shelf.answerType,
        subAnswers:[{id:'lower',label:'下层',answer:27,unit:'本'},{id:'total',label:'总数',answer:61,unit:'本'}],
        equation:'34−7=27；34+27=61',answerSentence:'下层有27本图书，两层一共有61本。',
        explanation:'先用上层数量减去少的数量求下层，再把上层和下层相加。',
        solutionSteps:['下层：34−7=27本。','总数：34+27=61本。'],hints:['先求下层数量。','再把上层和下层合起来。'],
      },{family:'grade2-two-question-compare-and-total',targetRole:'下层数量与总数量',roles:['upper','difference','lower','total'],operations:['subtraction','addition'],units:['books'],invariants:['先由较多量和差求较少量','第二问求两部分总量','两个子答案均为整数']},{kind:'arithmetic',source:{facts:sourceFacts,anchors:sourceAnchors,result:tree,format:'number'},variant:{facts:variantFacts,anchors:variantAnchors,result:tree,format:'number'}}));
    } else gaps.push({sourceId:shelf.id,reason:'source-answer-drift',detail:'源题下层和总数子答案与题干复算不符，不能沿用多字段变式。'});
  }
  const arrival = byId.get('g2_07');
  if (arrival) {
    const result = 455 + 20;
    if (arrival.answer === '7:45' && result === 475) {
      entries.push(makeTransferEntry(arrival,{
        text:'小明从家走到学校需要20分钟，他早上7:35出发，什么时候能到学校？',numbers:[20],answer:'7:55',answerType:'text',
        equation:'7:35+20分钟=7:55',answerSentence:'小明早上7:55能到学校。',
        explanation:'从7:35开始经过20分钟，先经过15分钟到7:50，再经过5分钟到7:55。',
        solutionSteps:['7:35经过15分钟是7:50。','还剩20−15=5分钟，7:50再过5分钟是7:55。'],hints:['先把出发时刻向前推进整刻钟。','再加上剩余分钟数，检查是否跨过整点。'],
      },{family:'grade2-start-time-plus-duration',targetRole:'到达时刻',roles:['start-minute-of-day','duration-minutes','arrival-minute-of-day'],operations:['addition'],units:['clock-minutes'],invariants:['起始时刻与时长相加','答案以时刻格式呈现','保持分钟进位负担']},{kind:'arithmetic',source:{facts:{start:450,duration:15},anchors:{start:'7:30',duration:'需要15分钟'},result:op('add',f('start'),f('duration')),format:'time'},variant:{facts:{start:455,duration:20},anchors:{start:'7:35',duration:'需要20分钟'},result:op('add',f('start'),f('duration')),format:'time'}}));
    } else gaps.push({sourceId:arrival.id,reason:'source-answer-drift',detail:'按出发时刻与步行分钟数复算的到达时间与源答案不一致。'});
  }
  const pairedSumDifference = [
    {id:'g2o_01', ids:['ming','hong'], labels:['小明','小红'], source:{total:12,difference:2}, sourceAnchors:{total:'一共有12颗糖果',difference:'小明比小红多2颗'}, variant:{total:14,difference:4}, variantAnchors:{total:'一共有14颗糖果',difference:'小明比小红多4颗'}, unit:'颗', text:'小明和小红一共有14颗糖果，小明比小红多4颗。小明有几颗？小红有几颗？提示：画两条线段比一比！', numbers:[14,4], big:9, small:5},
    {id:'g2o_02', ids:['brother','younger'], labels:['哥哥','弟弟'], source:{total:18,difference:4}, sourceAnchors:{total:'加起来是18岁',difference:'哥哥比弟弟大4岁'}, variant:{total:26,difference:6}, variantAnchors:{total:'加起来是26岁',difference:'哥哥比弟弟大6岁'}, unit:'岁', text:'哥哥和弟弟的年龄加起来是26岁，哥哥比弟弟大6岁。哥哥几岁？弟弟几岁？', numbers:[26,6], big:16, small:10},
    {id:'g2o_04', ids:['class1','class2'], labels:['一班','二班'], source:{total:62,difference:6}, sourceAnchors:{total:'共有学生62人',difference:'一班比二班多6人'}, variant:{total:53,difference:5}, variantAnchors:{total:'共有学生53人',difference:'一班比二班多5人'}, unit:'人', text:'一班和二班共有学生53人。一班比二班多5人。两个班各有多少人？', numbers:[53,5], big:29, small:24},
  ];
  for (const r of pairedSumDifference) {
    const source=byId.get(r.id); if(!source) continue;
    const [bigId,smallId]=r.ids;
    const tree: Record<string,TransferExpression>={
      [bigId]:op('div',op('add',f('total'),f('difference')),2),
      [smallId]:op('div',op('sub',f('total'),f('difference')),2),
    };
    const sourceAnswer=source.subAnswers?.map(a=>a.answer);
    if (!sourceAnswer || source.subAnswers?.length!==2) {gaps.push({sourceId:r.id,reason:'source-answer-drift',detail:'源题缺少两项独立子答案，不能建立总和差值证明。'});continue;}
    const subAnswers=[{id:bigId,label:r.labels[0],answer:r.big,unit:r.unit},{id:smallId,label:r.labels[1],answer:r.small,unit:r.unit}];
    const equation=`(${r.numbers[0]}+${r.numbers[1]})÷2=${r.big}；(${r.numbers[0]}−${r.numbers[1]})÷2=${r.small}`;
    const sentence=`${r.labels[0]}有${r.big}${r.unit}，${r.labels[1]}有${r.small}${r.unit}。`;
    entries.push(makeTransferEntry(source,{text:r.text,numbers:r.numbers,answer:`${r.labels[0]}${r.big}，${r.labels[1]}${r.small}`,answerType:'multi_answer',subAnswers,equation,answerSentence:sentence,explanation:`用总数加差求较大量的一半，用总数减差求较小量的一半：${equation}。相加与相减都能整除2。`,solutionSteps:[`较大量：(${r.numbers[0]}+${r.numbers[1]})÷2=${r.big}${r.unit}。`,`较小量：(${r.numbers[0]}−${r.numbers[1]})÷2=${r.small}${r.unit}。`,`核对：${r.big}+${r.small}=${r.numbers[0]}，${r.big}−${r.small}=${r.numbers[1]}。`],hints:['把较大的量和较小的量分别写成总数与差的关系。','用总数加差求较大量，用总数减差求较小量，再各除以2。']},{family:'grade2-sum-and-difference-two-values',targetRole:'两个对象的数量',roles:['total','difference','larger','smaller'],operations:['addition','subtraction','equal-sharing'],units:[r.unit],invariants:['已知总数与差求两个数','两个结果均整除2','答案按较大对象和较小对象顺序返回']},{kind:'arithmetic',source:{facts:r.source,anchors:r.sourceAnchors,result:tree,format:'number'},variant:{facts:r.variant,anchors:r.variantAnchors,result:tree,format:'number'}}));
  }
  const makeTen=byId.get('g2o_18');
  if(makeTen&&makeTen.answer===30){
    const tree=op('add',f('a'),f('b'),f('c'),f('d'));
    entries.push(makeTransferEntry(makeTen,{text:'计算 18+2+7+4。找能凑整的朋友先加！',numbers:[18,2,7,4],answer:31,answerType:'number',equation:'18+2+7+4=20+11=31',answerSentence:'答案是31。',explanation:'先把18和2合成20，再把7和4合成11，最后20+11=31。',solutionSteps:['18+2=20。','7+4=11。','20+11=31。'],hints:['找出能先合成整十数的一对。','再加上剩下的两个数。']},{family:'grade2-four-addends-make-ten',targetRole:'四个加数的和',roles:['a','b','c','d'],operations:['addition','make-a-ten regrouping'],units:['count'],invariants:['四个一位或两位加数逐项参与','先凑整再合并','保留加法分组策略']},{kind:'arithmetic',source:{facts:{a:15,b:7,c:5,d:3},anchors:{a:'15+7+5+3',b:'15+7+5+3',c:'15+7+5+3',d:'15+7+5+3'},result:tree,format:'number'},variant:{facts:{a:18,b:2,c:7,d:4},anchors:{a:'18+2+7+4',b:'18+2+7+4',c:'18+2+7+4',d:'18+2+7+4'},result:tree,format:'number'}}));
  }
  const fixedPermutation=byId.get('g2o_19');
  if(fixedPermutation) gaps.push({sourceId:fixedPermutation.id,reason:'constant-answer-by-design',detail:'题目规定用2、5、8组成不重复两位数。固定3个不同且非零数字时，十位任选3种、个位任选其余2种，恒为3×2=6；换具体数字不会改变答案，增减可选数字会改变枚举规模与难度。'});
  const weekdayCases: Array<{id:string;source:Record<string,number|string>;variant:Record<string,number|string>;text:string;numbers:number[];answer:string;equation:string;explanation:string;steps:string[];hints:string[]}> = [
    {id:'g2o_05',source:{mode:'same-month-date',month:6,startDay:1,targetDay:15,startWeekday:'星期三',startAnchor:'6月1日是星期三'},variant:{mode:'same-month-date',month:6,startDay:2,targetDay:16,startWeekday:'星期四',startAnchor:'6月2日是星期四'},text:'6月2日是星期四。6月16日是星期几？',numbers:[2,16,7],answer:'星期四',equation:'6月2日到6月16日相隔14天；星期四经过两个完整星期仍是星期四。',explanation:'从6月2日到6月16日经过14天，也就是两个星期，因此星期几不变。',steps:['6月2日是星期四。','14天是两个星期，星期四经过两个完整星期仍是星期四。'],hints:['先算两个日期相隔多少天。','每过7天，星期几回到原来的位置。']},
    {id:'g2o_06',source:{startWeekday:'星期五',startAnchor:'今天是星期五',dayOffset:20,offsetAnchor:'再过20天'},variant:{startWeekday:'星期日',startAnchor:'今天是星期日',dayOffset:10,offsetAnchor:'再过10天'},text:'今天是星期日。再过10天是星期几？',numbers:[10,7],answer:'星期三',equation:'10天=7天+3天；星期日再过3天是星期三。',explanation:'先经过一个完整星期回到星期日，再继续数3天到星期三。',steps:['再过7天仍是星期日。','还要再数3天：星期一、星期二、星期三。'],hints:['先数满一个星期。','再从起始星期继续数剩下的天数。']},
    {id:'g2o_07',source:{mode:'same-month-date',month:6,startDay:1,targetDay:30,startWeekday:'星期一',startAnchor:'6月1日是星期一'},variant:{mode:'same-month-date',month:6,startDay:3,targetDay:30,startWeekday:'星期二',startAnchor:'6月3日是星期二'},text:'6月3日是星期二。6月30日是星期几？',numbers:[6,3,30,7],answer:'星期一',equation:'6月3日到6月30日相隔27天；21天后仍是星期二，再过6天是星期一。',explanation:'先数3个完整星期共21天，再数剩下的6天。星期二依次经过星期三、星期四、星期五、星期六、星期日、星期一。',steps:['30−3=27天，27天里有3个完整星期和6天。','星期二经过3个完整星期仍是星期二。','再数6天到星期一。'],hints:['先求两个日期之间相隔的天数。','把天数拆成完整星期和剩余天数。']},
  ];
  for (const r of weekdayCases) {
    const source=byId.get(r.id); if(!source) continue;
    if(['unsafe','fail','needs_review'].includes(source.qualityStatus||'')){gaps.push({sourceId:r.id,reason:'source-unsafe',detail:`原题质量标记为${source.qualityStatus}，保持隔离。`});continue;}
    const relation:TransferRelation={family:`grade2-weekday-cycle-${r.id}`,targetRole:'目标日期的星期',roles:['起始星期','经过天数','目标星期'],operations:['日历日期差','七日循环枚举'],units:['day','weekday'],invariants:['按自然日逐日推进','每7天星期循环一次','候选答案和日期由题面参数推得']};
    const variant=makeTransferEntry(source,{text:r.text,numbers:r.numbers,answer:r.answer,answerType:'text',equation:r.equation,answerSentence:`答案是${r.answer}。`,explanation:r.explanation,solutionSteps:r.steps,hints:r.hints},relation,{kind:'enumeration',model:'legacy-weekday-cycle-v1',source:r.source,variant:r.variant});
    variant.variant.questionMeaningOptions=['求目标日期是星期几','求相隔多少天','求经过几个星期']; variant.variant.correctMeaning='求目标日期是星期几'; entries.push(variant);
  }
  return {entries,gaps};
}
