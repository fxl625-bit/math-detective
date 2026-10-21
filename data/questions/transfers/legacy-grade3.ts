import type { Question } from '@/lib/types';
import { makeTransferEntry } from './helpers';
import type { TransferBatch, TransferExpression, TransferProof, TransferRelation } from './types';

type Recipe = {
  id: string; tree: TransferExpression; sourceFacts: Record<string, number>; sourceAnchors: Record<string, string>;
  facts: Record<string, number>; anchors: Record<string, string>; text: string; numbers: number[];
  unit: string; operation: string; sourceAnswer: number;
};
const f = (fact: string): TransferExpression => ({ fact });
const op = (name: 'add'|'sub'|'mul'|'div'|'floor'|'ceil'|'pow'|'min'|'max', ...args: TransferExpression[]): TransferExpression => ({ op: name, args });
const recipes: Recipe[] = [
  {id:'g3_01',tree:op('div',op('sub',f('length'),f('cut')),f('parts')),sourceFacts:{length:36,cut:9,parts:3},sourceAnchors:{length:'长36米',cut:'剪下9米',parts:'平均分成3段'},facts:{length:42,cut:9,parts:3},anchors:{length:'长42米',cut:'剪下9米',parts:'平均分成3段'},text:'一根绳子长42米，剪下9米后，剩下的绳子平均分成3段，每段多少米？',numbers:[42,9,3],unit:'米',operation:'剪后余长平均分段',sourceAnswer:9},
  {id:'g3_03',tree:op('mul',op('add',f('length'),f('width')),2),sourceFacts:{length:8,width:6},sourceAnchors:{length:'长是8米',width:'宽是6米'},facts:{length:9,width:7},anchors:{length:'长是9米',width:'宽是7米'},text:'一个长方形花坛的长是9米，宽是7米，它的周长是多少米？',numbers:[9,7],unit:'米',operation:'长与宽之和乘2求周长',sourceAnswer:28},
  {id:'g3o_05',tree:op('mul',2,op('add',op('div',f('road'),f('spacing')),1)),sourceFacts:{road:200,spacing:5},sourceAnchors:{road:'马路长200米',spacing:'每隔5米种一棵'},facts:{road:210,spacing:6},anchors:{road:'马路长210米',spacing:'每隔6米种一棵'},text:'一条马路长210米，两侧从头到尾每隔6米种一棵树（两端都种）。两侧共种多少棵？',numbers:[210,6],unit:'棵',operation:'每侧间隔数加首尾树数，再乘两侧',sourceAnswer:82},
  {id:'g3o_06',tree:op('mul',2,op('add',op('div',f('bridge'),f('spacing')),1)),sourceFacts:{bridge:50,spacing:2},sourceAnchors:{bridge:'桥长50米',spacing:'每隔2米装一盏'},facts:{bridge:60,spacing:3},anchors:{bridge:'桥长60米',spacing:'每隔3米装一盏'},text:'一座桥长60米，桥两侧每隔3米装一盏路灯（两端都装）。共装多少盏？',numbers:[60,3],unit:'盏',operation:'每侧间隔数加首尾灯数，再乘两侧',sourceAnswer:52},
  {id:'g3o_07',tree:op('div',op('mul',f('side'),4),f('spacing')),sourceFacts:{side:60,spacing:4},sourceAnchors:{side:'池塘边长60米',spacing:'每隔4米种一棵柳树'},facts:{side:72,spacing:6},anchors:{side:'池塘边长72米',spacing:'每隔6米种一棵柳树'},text:'一个正方形池塘边长72米，沿池塘边每隔6米种一棵柳树。能种几棵？',numbers:[72,6],unit:'棵',operation:'正方形周长除以环绕间隔',sourceAnswer:60},
  {id:'g3o_08',tree:op('add',f('first'),op('mul',op('sub',f('term'),1),f('difference'))),sourceFacts:{first:5,difference:4,term:10},sourceAnchors:{first:'数列5,9,13,17',difference:'公差=4',term:'第10项'},facts:{first:6,difference:3,term:10},anchors:{first:'数列6,9,12,15',difference:'公差=3',term:'第10项'},text:'数列6,9,12,15...第10项是多少？（公差=3）',numbers:[6,3,10],unit:'',operation:'首项+(项数−1)×公差',sourceAnswer:41},
  {id:'g3o_09',tree:op('add',op('div',op('sub',f('last'),f('first')),f('difference')),1),sourceFacts:{first:3,difference:4,last:23},sourceAnchors:{first:'数列3,7,11,15',difference:'公差=4',last:'...23'},facts:{first:4,difference:5,last:39},anchors:{first:'数列4,9,14,19',difference:'公差=5',last:'...39'},text:'数列4,9,14,19...39。共几项？（公差=5）',numbers:[4,5,39],unit:'项',operation:'(末项−首项)÷公差+1',sourceAnswer:6},
  {id:'g3_04',tree:op('div',f('pages'),f('daily')),sourceFacts:{pages:120,daily:15},sourceAnchors:{pages:'有120页',daily:'每天看15页'},facts:{pages:144,daily:16},anchors:{pages:'有144页',daily:'每天看16页'},text:'一本图书有144页，小明每天看16页，几天能看完？',numbers:[144,16],unit:'天',operation:'总页数除以每日页数',sourceAnswer:8},
  {id:'g3_05',tree:op('sub',op('mul',f('perBag'),f('bags')),f('used')),sourceFacts:{perBag:25,bags:4,used:60},sourceAnchors:{perBag:'重25千克',bags:'买了4袋',used:'用去了60千克'},facts:{perBag:28,bags:4,used:52},anchors:{perBag:'重28千克',bags:'买了4袋',used:'用去了52千克'},text:'一袋面粉重28千克，食堂买了4袋面粉，用去了52千克，还剩多少千克？',numbers:[28,4,52],unit:'千克',operation:'总重量减去用量',sourceAnswer:40},
  {id:'g3_07',tree:op('mul',op('mul',f('side'),4),f('laps')),sourceFacts:{side:9,laps:3},sourceAnchors:{side:'边长是9米',laps:'跑了3圈'},facts:{side:8,laps:4},anchors:{side:'边长是8米',laps:'跑了4圈'},text:'一个正方形花坛的边长是8米，小明绕着花坛跑了4圈，一共跑了多少米？',numbers:[8,4],unit:'米',operation:'正方形周长乘圈数',sourceAnswer:108},
  {id:'g3_08',tree:op('sub',f('tall'),f('short')),sourceFacts:{tall:135,short:128},sourceAnchors:{tall:'身高135厘米',short:'身高128厘米'},facts:{tall:142,short:134},anchors:{tall:'身高142厘米',short:'身高134厘米'},text:'小明身高142厘米，小红身高134厘米，小明比小红高多少厘米？',numbers:[142,134],unit:'厘米',operation:'较高身高减较矮身高',sourceAnswer:7},
  {id:'g3_09',tree:op('sub',op('mul',f('perBox'),f('boxes')),f('sold')),sourceFacts:{perBox:24,boxes:5,sold:68},sourceAnchors:{perBox:'每箱有24瓶',boxes:'进了5箱',sold:'卖掉了68瓶'},facts:{perBox:26,boxes:5,sold:72},anchors:{perBox:'每箱有26瓶',boxes:'进了5箱',sold:'卖掉了72瓶'},text:'每箱有26瓶酸奶，超市进了5箱，卖掉了72瓶，还剩多少瓶酸奶？',numbers:[26,5,72],unit:'瓶',operation:'总数减去卖出数',sourceAnswer:52},
  {id:'g3_11',tree:op('div',f('total'),f('perBag')),sourceFacts:{total:96,perBag:8},sourceAnchors:{total:'有96颗糖果',perBag:'每8颗装一袋'},facts:{total:72,perBag:9},anchors:{total:'有72颗糖果',perBag:'每9颗装一袋'},text:'有72颗糖果，每9颗装一袋，可以装几袋？',numbers:[72,9],unit:'袋',operation:'总数除以每袋数量',sourceAnswer:12},
  {id:'g3_14',tree:op('sub',f('height'),f('down')),sourceFacts:{height:8,down:3},sourceAnchors:{height:'树高8米',down:'又飞下来3米'},facts:{height:9,down:2},anchors:{height:'树高9米',down:'又飞下来2米'},text:'一棵树高9米，一只小鸟从地面飞到树顶，又飞下来2米，现在小鸟离地面多少米？',numbers:[9,2],unit:'米',operation:'树高减去下降距离',sourceAnswer:5},
  {id:'g3_15',tree:op('div',op('mul',f('classes'),f('perClass')),f('perTeam')),sourceFacts:{classes:4,perClass:36,perTeam:9},sourceAnchors:{classes:'有4个班',perClass:'每班36人',perTeam:'每9人排成一队'},facts:{classes:5,perClass:32,perTeam:8},anchors:{classes:'有5个班',perClass:'每班32人',perTeam:'每8人排成一队'},text:'三年级有5个班，每班32人。如果每8人排成一队做操，全年级一共可以排多少队？',numbers:[5,32,8],unit:'队',operation:'总人数除以每队人数',sourceAnswer:16},
  {id:'g3_17',tree:op('add',op('sub',f('morning'),f('left')),f('arrived')),sourceFacts:{morning:85,left:37,arrived:52},sourceAnchors:{morning:'上午有85人',left:'中午走了37人',arrived:'下午又来了52人'},facts:{morning:96,left:28,arrived:43},anchors:{morning:'上午有96人',left:'中午走了28人',arrived:'下午又来了43人'},text:'学校图书馆是一个安静漂亮的地方，同学们都喜欢在这里看书。上午有96人来看书，中午走了28人，下午又来了43人，现在图书馆里有多少人？',numbers:[96,28,43],unit:'人',operation:'先减离开人数再加到达人数',sourceAnswer:100},
  {id:'g3_18',tree:op('mul',op('add',f('length'),f('width')),2,f('laps')),sourceFacts:{length:50,width:30,laps:2},sourceAnchors:{length:'长50米',width:'宽30米',laps:'跑了2圈'},facts:{length:46,width:22,laps:3},anchors:{length:'长46米',width:'宽22米',laps:'跑了3圈'},text:'一个长方形操场长46米、宽22米，小明沿着操场跑了3圈，一共跑了多少米？',numbers:[46,22,3],unit:'米',operation:'长方形周长乘圈数',sourceAnswer:320},
  {id:'g3_19',tree:op('mul',op('mul',f('perDay'),f('rabbits')),f('days')),sourceFacts:{perDay:3,rabbits:9,days:5},sourceAnchors:{perDay:'每天吃3根',rabbits:'9只小兔子',days:'5天'},facts:{perDay:4,rabbits:8,days:6},anchors:{perDay:'每天吃4根',rabbits:'8只小兔子',days:'6天'},text:'一只小兔子每天吃4根胡萝卜，8只小兔子6天一共吃多少根胡萝卜？',numbers:[4,8,6],unit:'根',operation:'每只每日数量乘兔数和天数',sourceAnswer:135},
  {id:'g3_20',tree:op('sub',op('mul',f('boxes'),f('perBox')),op('add',f('morning'),f('afternoon'))),sourceFacts:{boxes:15,perBox:20,morning:180,afternoon:95},sourceAnchors:{boxes:'有苹果15箱',perBox:'每箱20个',morning:'上午卖了180个',afternoon:'下午又卖了95个'},facts:{boxes:16,perBox:19,morning:180,afternoon:98},anchors:{boxes:'有苹果16箱',perBox:'每箱19个',morning:'上午卖了180个',afternoon:'下午又卖了98个'},text:'夏天的午后，蝉在树上叫个不停。水果店有苹果16箱，每箱19个。上午卖了180个苹果，下午又卖了98个，还剩多少个苹果？',numbers:[16,19,180,98],unit:'个',operation:'总数减去两次售出总数',sourceAnswer:25},
  {id:'g3_21',tree:op('div',op('sub',f('length'),f('cut')),f('parts')),sourceFacts:{length:48,cut:12,parts:4},sourceAnchors:{length:'长48米',cut:'剪下12米',parts:'平均分成4段'},facts:{length:55,cut:15,parts:5},anchors:{length:'长55米',cut:'剪下15米',parts:'平均分成5段'},text:'学校组织春游，同学们兴高采烈地坐上了大巴车。一根绳子长55米，剪下15米后，剩下的绳子平均分成5段，每段多少米？',numbers:[55,15,5],unit:'米',operation:'剪后余长平均分段',sourceAnswer:9},
  {id:'g3_22',tree:op('add',op('sub',f('morning'),f('left')),f('arrived')),sourceFacts:{morning:256,left:89,arrived:134},sourceAnchors:{morning:'上午有256人',left:'中午走了89人',arrived:'下午又来了134人'},facts:{morning:267,left:89,arrived:134},anchors:{morning:'上午有267人',left:'中午走了89人',arrived:'下午又来了134人'},text:'运动会那天操场上彩旗飘扬，大家都很激动。上午有267人参加比赛，中午走了89人，下午又来了134人，现在有多少人？',numbers:[267,89,134],unit:'人',operation:'先减离开人数再加到达人数',sourceAnswer:301},
  {id:'g3_23',tree:op('mul',f('rows'),f('perRow')),sourceFacts:{rows:5,perRow:18},sourceAnchors:{rows:'书架有5层',perRow:'每层放18本书'},facts:{rows:6,perRow:16},anchors:{rows:'书架有6层',perRow:'每层放16本书'},text:'图书馆里的书整整齐齐地排列着，给人一种安静的感觉。书架有6层，每层放16本书，这个书架一共放了多少本书？',numbers:[6,16],unit:'本',operation:'层数乘每层本数',sourceAnswer:90},
  {id:'g3_mul_01',tree:op('mul',f('perBox'),f('boxes')),sourceFacts:{perBox:12,boxes:3},sourceAnchors:{perBox:'每盒水彩笔有12支',boxes:'买了3盒'},facts:{perBox:14,boxes:4},anchors:{perBox:'每盒水彩笔有14支',boxes:'买了4盒'},text:'文具店里每盒水彩笔有14支，老师买了4盒，一共有多少支水彩笔？',numbers:[14,4],unit:'支',operation:'每盒数量乘盒数',sourceAnswer:36},
  {id:'g3_mul_02',tree:op('mul',f('perRow'),f('rows')),sourceFacts:{perRow:8,rows:5},sourceAnchors:{perRow:'每行站8人',rows:'站了5行'},facts:{perRow:9,rows:4},anchors:{perRow:'每行站9人',rows:'站了4行'},text:'小朋友们在操场上排队做操，每行站9人，一共站了4行，操场上有多少小朋友？',numbers:[9,4],unit:'人',operation:'每行人数乘行数',sourceAnswer:40},
  {id:'g3_mul_03',tree:op('mul',f('perBox'),f('boxes')),sourceFacts:{perBox:6,boxes:4},sourceAnchors:{perBox:'一盒蛋糕有6块',boxes:'买了4盒'},facts:{perBox:7,boxes:5},anchors:{perBox:'一盒蛋糕有7块',boxes:'买了5盒'},text:'蛋糕店今天特价！一盒蛋糕有7块，小明的妈妈买了5盒准备分给同学们，一共有多少块蛋糕？',numbers:[7,5],unit:'块',operation:'每盒数量乘盒数',sourceAnswer:24},
  {id:'g3_mul_04',tree:op('mul',f('perPanda'),f('pandas')),sourceFacts:{perPanda:7,pandas:5},sourceAnchors:{perPanda:'每天给每只熊猫喂7根',pandas:'5只熊猫'},facts:{perPanda:8,pandas:6},anchors:{perPanda:'每天给每只熊猫喂8根',pandas:'6只熊猫'},text:'动物园的饲养员每天给每只熊猫喂8根竹子，6只熊猫一天要吃多少根竹子？',numbers:[8,6],unit:'根',operation:'每只数量乘只数',sourceAnswer:35},
  {id:'g3_mul_05',tree:op('mul',f('perShelf'),f('shelves')),sourceFacts:{perShelf:9,shelves:6},sourceAnchors:{perShelf:'每个书架有9本书',shelves:'有6个书架'},facts:{perShelf:8,shelves:7},anchors:{perShelf:'每个书架有8本书',shelves:'有7个书架'},text:'图书馆每个书架有8本书，现在有7个书架，一共有多少本书？',numbers:[8,7],unit:'本',operation:'每架本数乘书架数',sourceAnswer:54},
  {id:'g3_mul_06',tree:op('mul',f('perTeam'),f('classes')),sourceFacts:{perTeam:10,classes:4},sourceAnchors:{perTeam:'每队需要10人',classes:'有4个班参加'},facts:{perTeam:12,classes:5},anchors:{perTeam:'每队需要12人',classes:'有5个班参加'},text:'运动会拔河比赛，每队需要12人参加，三年级有5个班参加，一共有多少人参加拔河？',numbers:[12,5],unit:'人',operation:'每班人数乘班数',sourceAnswer:40},
  {id:'g3_mul_07',tree:op('mul',f('bags'),f('perBag')),sourceFacts:{bags:8,perBag:5},sourceAnchors:{bags:'买了8袋糖果',perBag:'每袋有5颗糖'},facts:{bags:7,perBag:6},anchors:{bags:'买了7袋糖果',perBag:'每袋有6颗糖'},text:'妈妈买了7袋糖果，每袋有6颗糖，妈妈一共买了多少颗糖？',numbers:[7,6],unit:'颗',operation:'袋数乘每袋数量',sourceAnswer:40},
  {id:'g3_div_01',tree:op('div',f('total'),f('children')),sourceFacts:{total:24,children:6},sourceAnchors:{total:'24支铅笔',children:'分给6个同学'},facts:{total:40,children:8},anchors:{total:'40支铅笔',children:'分给8个同学'},text:'老师把40支铅笔平均分给8个同学，每个同学分到几支铅笔？',numbers:[40,8],unit:'支',operation:'总数平均分给人数',sourceAnswer:4},
  {id:'g3_div_02',tree:op('div',f('flowers'),f('perBouquet')),sourceFacts:{flowers:30,perBouquet:5},sourceAnchors:{flowers:'30朵玫瑰花',perBouquet:'每束5朵'},facts:{flowers:42,perBouquet:6},anchors:{flowers:'42朵玫瑰花',perBouquet:'每束6朵'},text:'花店阿姨把42朵玫瑰花扎成花束，每束6朵，可以扎成几束？',numbers:[42,6],unit:'束',operation:'总数除以每束数量',sourceAnswer:6},
  {id:'g3_div_03',tree:op('div',f('eggs'),f('perBox')),sourceFacts:{eggs:35,perBox:7},sourceAnchors:{eggs:'35个鸡蛋',perBox:'每7个装一盒'},facts:{eggs:48,perBox:8},anchors:{eggs:'48个鸡蛋',perBox:'每8个装一盒'},text:'农场里有48个鸡蛋，每8个装一盒，需要几个盒子才能装完？',numbers:[48,8],unit:'盒',operation:'总数除以每盒数量',sourceAnswer:5},
  {id:'g3o_17',tree:op('sub',op('div',op('add',f('target'),f('subtract')),f('times')),f('add')),sourceFacts:{target:40,subtract:5,times:3,add:7},sourceAnchors:{target:'得40',subtract:'减5',times:'乘3',add:'加7'},facts:{target:62,subtract:2,times:4,add:9},anchors:{target:'得62',subtract:'减2',times:'乘4',add:'加9'},text:'一个数加9乘4减2得62。原数多少？',numbers:[9,4,2,62],unit:'',operation:'按运算顺序倒推：先加回减数，再除以乘数，最后减去加数',sourceAnswer:8},
  {id:'g3o_19',tree:op('sub',op('add',op('mul',f('frontAverage'),f('segmentCount')),op('mul',f('backAverage'),f('segmentCount'))),op('mul',f('overallAverage'),f('totalCount'))),sourceFacts:{frontAverage:24,segmentCount:3,backAverage:30,overallAverage:28,totalCount:5},sourceAnchors:{frontAverage:'前3个平均数是24',segmentCount:'前3个',backAverage:'后3个平均数是30',overallAverage:'平均数是28',totalCount:'5个数'},facts:{frontAverage:26,segmentCount:3,backAverage:30,overallAverage:29,totalCount:5},anchors:{frontAverage:'前3个平均数是26',segmentCount:'前3个',backAverage:'后3个平均数是30',overallAverage:'平均数是29',totalCount:'5个数'},text:'5个数的平均数是29，前3个平均数是26，后3个平均数是30。第3个数是多少？',numbers:[5,29,3,26,30],unit:'',operation:'前3项总和加后3项总和，再减去全部5项总和',sourceAnswer:22},
  {id:'g3o_22',tree:op('sub',f('son'),op('div',op('sub',f('father'),f('son')),op('sub',f('multiple'),1))),sourceFacts:{father:35,son:7,multiple:8},sourceAnchors:{father:'爸爸今年35岁',son:'儿子7岁',multiple:'是儿子的8倍'},facts:{father:41,son:6,multiple:8},anchors:{father:'爸爸今年41岁',son:'儿子6岁',multiple:'是儿子的8倍'},text:'爸爸今年41岁，儿子6岁。几年前爸爸年龄是儿子的8倍？',numbers:[41,6,8],unit:'年前',operation:'年龄差除以倍数差求当时儿子年龄，再与当前年龄相减',sourceAnswer:3},
  {id:'g3o_23',tree:op('add',op('div',op('sub',f('mother'),3),f('multiple')),3),sourceFacts:{mother:39,multiple:4},sourceAnchors:{mother:'妈妈今年39岁',multiple:'年龄是女儿的4倍'},facts:{mother:35,multiple:4},anchors:{mother:'妈妈今年35岁',multiple:'年龄是女儿的4倍'},text:'三年前妈妈的年龄是女儿的4倍。妈妈今年35岁。女儿今年几岁？',numbers:[35,4,3],unit:'岁',operation:'妈妈今年年龄减去固定的三年后除以倍数，再加回三年',sourceAnswer:12},
  {id:'g3o_24',tree:op('mul',op('div',op('div',f('output'),f('baseMachines')),f('baseHours')),f('newMachines'),f('newHours')),sourceFacts:{output:72,baseMachines:3,baseHours:4,newMachines:5,newHours:6},sourceAnchors:{output:'加工72个零件',baseMachines:'3台机器',baseHours:'4小时',newMachines:'5台机器',newHours:'6小时'},facts:{output:90,baseMachines:3,baseHours:5,newMachines:6,newHours:4},anchors:{output:'加工90个零件',baseMachines:'3台机器',baseHours:'5小时',newMachines:'6台机器',newHours:'4小时'},text:'3台机器5小时加工90个零件。6台机器4小时加工多少个？',numbers:[3,5,90,6,4],unit:'个',operation:'先求每台机器每小时产量，再乘新台数和新工时',sourceAnswer:180},
  {id:'extra_01',tree:op('sub',f('ming'),f('hong')),sourceFacts:{ming:15,hong:8},sourceAnchors:{ming:'有15张贴纸',hong:'有8张贴纸'},facts:{ming:17,hong:9},anchors:{ming:'有17张贴纸',hong:'有9张贴纸'},text:'小明有17张贴纸，小红有9张贴纸，今天天气很好，小明比小红多几张？',numbers:[17,9],unit:'张',operation:'两个数量求差',sourceAnswer:7},
  {id:'extra_08',tree:op('add',f('geese'),f('newGeese')),sourceFacts:{geese:7,newGeese:5},sourceAnchors:{geese:'有7只白鹅',newGeese:'又来了5只白鹅'},facts:{geese:8,newGeese:6},anchors:{geese:'有8只白鹅',newGeese:'又来了6只白鹅'},text:'池塘里有8只白鹅和4只鸭子，又来了6只白鹅，白鹅一共有多少只？',numbers:[8,4,6],unit:'只白鹅',operation:'原有白鹅加新来的白鹅',sourceAnswer:12},
];

function calculate(node: TransferExpression, facts: Record<string, number>): number {
  if (typeof node === 'number') return node;
  if ('fact' in node) return facts[node.fact];
  const args = node.args.map(arg => calculate(arg, facts));
  switch (node.op) {
    case 'add': return args.reduce((a, b) => a + b, 0);
    case 'sub': return args[0] - args[1];
    case 'mul': return args.reduce((a, b) => a * b, 1);
    case 'div': return args[0] / args[1];
    default: throw new Error(`unsupported operation: ${node.op}`);
  }
}
function proof(facts: Record<string, number>, anchors: Record<string, string>, result: TransferExpression): TransferProof {
  return { facts, anchors, result, format: 'number' };
}
export function buildLegacyGrade3Transfers(sources: readonly Question[]): TransferBatch {
  const byId = new Map(sources.filter(source => source.gradeBand === 'G3').map(source => [source.id, source]));
  const entries: TransferBatch['entries'] = [];
  const gaps: TransferBatch['gaps'] = [];
  for (const recipe of recipes) {
    const source = byId.get(recipe.id);
    if (!source) continue;
    if (calculate(recipe.tree, recipe.sourceFacts) !== recipe.sourceAnswer || Number(source.answer) !== recipe.sourceAnswer) {
      gaps.push({ sourceId: recipe.id, reason: 'source-proof-conflict', detail: '逐项事实关系与当前原题答案不一致，需先校订该固定事实见证。' });
      continue;
    }
    const answer = calculate(recipe.tree, recipe.facts);
    if (!Number.isInteger(answer) || answer < 0 || answer === recipe.sourceAnswer) {
      gaps.push({ sourceId: recipe.id, reason: 'variant-domain-conflict', detail: '此题型的候选数值未同时满足非负整数与答案差异约束。' });
      continue;
    }
    const formula = `按题意列式计算，结果为${answer}${recipe.unit}。`;
    const relation: TransferRelation = { family: `legacy-${recipe.id}`, targetRole: '题干要求的数量', roles: Object.keys(recipe.facts), operations: [recipe.operation], units: [recipe.unit], invariants: ['事实逐项锚定于题干', '未知量与运算次序不变', '候选答案为不同的非负整数'] };
    entries.push(makeTransferEntry(source, { text: recipe.text, numbers: recipe.numbers, answer, answerType: 'number', equation: `${recipe.operation} = ${answer}`, answerSentence: `答案是${answer}${recipe.unit}。`, explanation: `${recipe.operation}，得到${answer}${recipe.unit}。`, solutionSteps: [`根据题干所给数量，保持原题的${recipe.operation}关系。`, formula], hints: ['先找出题目中对应的已知数量。', `按${recipe.operation}关系列式。`] }, relation, { kind: 'arithmetic', source: proof(recipe.sourceFacts, recipe.sourceAnchors, recipe.tree), variant: proof(recipe.facts, recipe.anchors, recipe.tree) }));
  }
  const timeSource = byId.get('g3_10');
  if (timeSource && String(timeSource.answer) === '1小时45分') {
    const tree = op('sub', f('endMinutes'), f('startMinutes'));
    const sourceFacts = { endMinutes: 240, startMinutes: 135 }, sourceAnchors = { endMinutes: '4:00结束', startMinutes: '2:15开始' };
    const facts = { endMinutes: 205, startMinutes: 110 }, anchors = { endMinutes: '3:25结束', startMinutes: '1:50开始' };
    const relation: TransferRelation = { family: 'legacy-g3_10', targetRole: '电影放映时长', roles: ['endMinutes', 'startMinutes'], operations: ['结束时刻减去开始时刻，按分钟计时'], units: ['分钟', '小时和分钟'], invariants: ['时刻先换算成当天分钟数再相减', '保留跨小时借位的时刻减法', '结果用小时和分钟表示'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result: tree, format: 'time' });
    entries.push(makeTransferEntry(timeSource, {
      text: '一场电影从1:50开始，到3:25结束，这场电影放映了多长时间？', numbers: [1, 50, 3, 25], answer: '1小时35分', answerType: 'text',
      equation: '3:25-1:50=95分钟=1小时35分', answerSentence: '这场电影放映了1小时35分钟。',
      explanation: '把结束时刻和开始时刻换算成分钟：205-110=95分钟，即1小时35分钟。',
      solutionSteps: ['开始时刻1:50是110分钟', '结束时刻3:25是205分钟', '205-110=95分钟=1小时35分'], hints: ['把两个时刻换成分钟，再相减。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const weightsSource = byId.get('g3_12');
  if (weightsSource && String(weightsSource.answer) === '2千克和8千克') {
    const result = { diff: op('sub', f('rice'), f('flour')), total: op('add', f('rice'), f('flour')) };
    const sourceFacts = { rice: 5, flour: 3 }, sourceAnchors = { rice: '大米重5千克', flour: '面粉重3千克' };
    const facts = { rice: 6, flour: 3 }, anchors = { rice: '大米重6千克', flour: '面粉重3千克' };
    const relation: TransferRelation = { family: 'legacy-g3_12', targetRole: '两袋粮食的重量差和合计重量', roles: ['rice', 'flour'], operations: ['相差用减法，合计用加法'], units: ['千克'], invariants: ['保留差值和总重两个答案字段', '两个结果都由题干中的两种重量推导'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    entries.push(makeTransferEntry(weightsSource, {
      text: '一袋大米重6千克，一袋面粉重3千克，大米比面粉重多少千克？买一袋大米和一袋面粉共重多少千克？', numbers: [6, 3], answer: '3千克和9千克', answerType: 'multi_answer',
      subAnswers: [{ id: 'diff', label: '相差', answer: 3, unit: '千克' }, { id: 'total', label: '总重', answer: 9, unit: '千克' }],
      equation: '6-3=3；6+3=9', answerSentence: '大米比面粉重3千克，一共重9千克。',
      explanation: '第一问：6-3=3千克；第二问：6+3=9千克。',
      solutionSteps: ['求相差：6-3=3千克', '求合计：6+3=9千克'], hints: ['一个问题求相差，一个问题求两袋合计。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const strawberrySource = byId.get('g3_13');
  if (strawberrySource && String(strawberrySource.answer) === '1/4和3个') {
    const result = { fraction: op('div', 1, f('people')), count: op('div', f('strawberries'), f('people')) };
    const sourceFacts = { strawberries: 12, people: 4 }, sourceAnchors = { strawberries: '12个草莓', people: '平均分给4个人' };
    const facts = { strawberries: 15, people: 5 }, anchors = { strawberries: '15个草莓', people: '平均分给5个人' };
    const relation: TransferRelation = { family: 'legacy-g3_13', targetRole: '每人分到的蛋糕分率和草莓个数', roles: ['strawberries', 'people'], operations: ['每人占总份数的1/人数；每人个数=草莓总数÷人数'], units: ['分数', '个'], invariants: ['同时回答每人所占分率和具体个数', '平均分配，参与人数决定分率分母', '具体个数由总数除以人数得到'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'fraction' });
    entries.push(makeTransferEntry(strawberrySource, {
      text: '妈妈把15个草莓平均分给5个人，每人分到草莓的几分之几？每人分到几个草莓？', numbers: [15, 5], answer: '1/5和3个', answerType: 'multi_answer',
      subAnswers: [{ id: 'fraction', label: '几分之几', answer: '1/5' }, { id: 'count', label: '个数', answer: 3, unit: '个' }],
      equation: '1÷5=1/5；15÷5=3个', answerSentence: '每人分到五分之一，也就是3个草莓。',
      explanation: '平均分给5个人，每人是整体的1/5；草莓数量平均分配：15÷5=3个。',
      solutionSteps: ['每人所占分率：1÷5=1/5', '每人草莓数：15÷5=3个'], hints: ['先看平均分成几份，再分别求每份的分率和个数。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const fractionSource = byId.get('g3_06');
  if (fractionSource) {
    const tree = op('div', f('eaten'), f('pieces'));
    const sourceFacts = { pieces: 8, eaten: 3 }, sourceAnchors = { pieces: '蛋糕平均切成8块', eaten: '小红吃了3块' };
    const facts = { pieces: 8, eaten: 5 }, anchors = { pieces: '蛋糕平均切成8块', eaten: '小红吃了5块' };
    const relation: TransferRelation = { family: 'legacy-g3_06', targetRole: '吃掉的蛋糕占整块蛋糕的分率', roles: ['eaten', 'pieces'], operations: ['吃掉的块数除以平均分成的总块数'], units: ['分数'], invariants: ['分子表示吃掉的份数，分母表示总份数', '源题和变式使用同一除法关系', '事实锚点逐项存在于题干'] };
    const fractionProof = (proofFacts: Record<string, number>, anchorsForFacts: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: anchorsForFacts, result: tree, format: 'fraction' });
    entries.push(makeTransferEntry(fractionSource, {
      text: '一块蛋糕平均切成8块，小红吃了5块，她吃了这块蛋糕的几分之几？', numbers: [8, 5], answer: '5/8', answerType: 'number',
      equation: '吃掉的份数÷总份数=5÷8=5/8', answerSentence: '她吃了这块蛋糕的八分之五。',
      explanation: '总共平均分成8份，吃掉5份，所以所占分率是5/8。',
      solutionSteps: ['分母是总份数8', '分子是吃掉的份数5', '写成分数5/8'], hints: ['分数的分母表示总份数，分子表示取出的份数。'],
    }, relation, { kind: 'arithmetic', source: fractionProof(sourceFacts, sourceAnchors), variant: fractionProof(facts, anchors) }));
  }
  const quotientSource = byId.get('g3_02');
  if (quotientSource) {
    const remainderExpr: TransferExpression = op('sub', op('sub', f('total'), f('sold')), op('mul', f('boxes'), op('floor', op('div', op('sub', f('total'), f('sold')), f('boxes')))));
    const quotientExpr: TransferExpression = op('floor', op('div', op('sub', f('total'), f('sold')), f('boxes')));
    const result = { quotient: quotientExpr, remainder: remainderExpr };
    const sourceFacts = { total: 48, sold: 25, boxes: 5 }, sourceAnchors = { total: '商店有48支铅笔', sold: '卖出25支', boxes: '装进5个盒子' };
    const facts = { total: 58, sold: 24, boxes: 8 }, anchors = { total: '商店有58支铅笔', sold: '卖出24支', boxes: '装进8个盒子' };
    const relation: TransferRelation = { family: 'legacy-g3_02', targetRole: '每盒商数和余数', roles: ['total', 'sold', 'boxes'], operations: ['总数减去卖出数，再作有余数的平均分配'], units: ['支'], invariants: ['先计算剩余铅笔数，再以盒数作除数', '同时给出商和余数', '商与余数由同一除法式推导'] };
    const multiProof = (proofFacts: Record<string, number>, anchorsForFacts: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: anchorsForFacts, result, format: 'number' });
    entries.push(makeTransferEntry(quotientSource, {
      text: '商店有58支铅笔，卖出24支后，剩下的平均装进8个盒子里。每盒最多装几支，还剩几支？', numbers: [58, 24, 8], answer: '每盒最多装4支，还剩2支', answerType: 'multi_answer',
      subAnswers: [{ id: 'quotient', label: '每盒最多装', answer: 4, unit: '支' }, { id: 'remainder', label: '还剩', answer: 2, unit: '支' }],
      equation: '(58 - 24) ÷ 8 = 4余2', answerSentence: '每盒最多装4支，还剩2支。',
      explanation: '先算剩下：58-24=34支。再平均装进8个盒子：34÷8=4余2，所以每盒最多装4支，还剩2支。',
      solutionSteps: ['先求剩下的铅笔：58-24=34支', '34÷8=4余2', '每盒最多装4支，还剩2支'], hints: ['先求剩下的数量，再算有余数的除法。'],
    }, relation, { kind: 'arithmetic', source: multiProof(sourceFacts, sourceAnchors), variant: multiProof(facts, anchors) }));
  }
  const averageSource = byId.get('g3o_18');
  if (averageSource) {
    const result = { answer: op('sub', op('sub', op('mul', f('average'), f('subjects')), f('chinese')), f('math')) };
    const sourceFacts = { average: 90, subjects: 3, chinese: 88, math: 94 };
    const sourceAnchors = { average: '三科平均90分', subjects: '三科', chinese: '语文88分', math: '数学94分' };
    const facts = { average: 80, subjects: 3, chinese: 88, math: 94 };
    const anchors = { average: '三科平均80分', subjects: '三科', chinese: '语文88分', math: '数学94分' };
    const relation: TransferRelation = { family: 'legacy-g3o_18', targetRole: '英语成绩', roles: ['average', 'subjects', 'chinese', 'math'], operations: ['平均分乘科目数得到总分，再依次减去语文和数学成绩'], units: ['分'], invariants: ['由三科平均分确定总分', '两个已知学科分数均参与求未知分数', '答案仍为一个学科成绩'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    entries.push(makeTransferEntry(averageSource, {
      text: '小明语数英三科成绩：语文88分，数学94分，三科平均80分。英语多少分？', numbers: [88, 94, 80, 3], answer: 58, answerType: 'number',
      equation: '80×3-88-94=58（分）', answerSentence: '英语58分。',
      explanation: '三科总分是80×3=240分。语文和数学共88+94=182分，因此英语成绩是240-182=58分。',
      solutionSteps: ['三科总分：80×3=240分', '语文和数学共：88+94=182分', '英语：240-182=58分'], hints: ['先用平均分乘科目数求总分，再减去已知两科的分数。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const ballSource = byId.get('g3_16');
  if (ballSource) {
    const soccer = op('mul', f('ballPrice'), f('factor'));
    const result = { soccer, total: op('add', soccer, f('ballPrice')) };
    const sourceFacts = { ballPrice: 18, factor: 4 }, sourceAnchors = { ballPrice: '皮球18元', factor: '足球的价格是皮球的4倍' };
    const facts = { ballPrice: 19, factor: 4 }, anchors = { ballPrice: '皮球19元', factor: '足球的价格是皮球的4倍' };
    const relation: TransferRelation = { family: 'legacy-g3_16', targetRole: '足球价格和两球总价', roles: ['ballPrice', 'factor'], operations: ['皮球单价乘倍数求足球价格，再加皮球价格'], units: ['元'], invariants: ['先求倍数足球价格', '价格倍数關係不變', '同時回答足球價格和兩球總價'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    entries.push(makeTransferEntry(ballSource, {
      text: '一个皮球19元，一个足球的价格是皮球的4倍。一个足球多少元？买一个足球和一个皮球共多少元？', numbers: [19, 4], answer: '足球76元，总价95元', answerType: 'multi_answer',
      subAnswers: [{ id: 'soccer', label: '足球价格', answer: 76, unit: '元' }, { id: 'total', label: '总价', answer: 95, unit: '元' }],
      equation: '19×4=76元；76+19=95元', answerSentence: '足球76元，买一个足球和一个皮球共95元。',
      explanation: '足球价格是皮球的4倍：19×4=76元。再加上皮球价格，76+19=95元。',
      solutionSteps: ['足球价格：19×4=76元', '总价：76+19=95元'], hints: ['先根据倍数关系求足球价格，再把两个球的价格相加。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const oilSource = byId.get('g3_24');
  if (oilSource) {
    const used = op('add', f('usedKg'), op('div', f('usedGrams'), 1000));
    const result = { answer: op('sub', f('weight'), used) };
    const sourceFacts = { weight: 5, usedKg: 2, usedGrams: 500 }, sourceAnchors = { weight: '一桶油重5千克', usedKg: '用去了2千克', usedGrams: '500克' };
    const facts = { weight: 8, usedKg: 3, usedGrams: 500 }, anchors = { weight: '一桶油重8千克', usedKg: '用去了3千克', usedGrams: '500克' };
    const relation: TransferRelation = { family: 'legacy-g3_24', targetRole: '剩余油的质量', roles: ['weight', 'usedKg', 'usedGrams'], operations: ['把千克和克分别换算为千克后，从总质量中减去已用质量'], units: ['千克'], invariants: ['保留质量单位换算和减法', '用量以千克和克组合给出', '答案精确到十分之一千克'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    entries.push(makeTransferEntry(oilSource, {
      text: '一桶油重8千克，用去了3千克500克，还剩多少千克？', numbers: [8, 3.5], answer: 4.5, answerType: 'number',
      equation: '8-3.5=4.5（千克）', answerSentence: '还剩4.5千克。', explanation: '3千克500克等于3.5千克，所以剩下8-3.5=4.5千克。',
      solutionSteps: ['把3千克500克换成3.5千克', '计算：8-3.5=4.5千克'], hints: ['先把千克和克统一换算成千克，再做减法。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const chalkSource = byId.get('g3_25');
  if (chalkSource) {
    const result = { answer: op('div', op('mul', f('perBox'), f('boxes')), f('grades')) };
    const sourceFacts = { boxes: 6, perBox: 24, grades: 3 }, sourceAnchors = { boxes: '买了6箱粉笔', perBox: '每箱24盒', grades: '平均分给3个年级' };
    const facts = { boxes: 8, perBox: 21, grades: 4 }, anchors = { boxes: '买了8箱粉笔', perBox: '每箱21盒', grades: '平均分给4个年级' };
    const relation: TransferRelation = { family: 'legacy-g3_25', targetRole: '每个年级分到的盒数', roles: ['boxes', 'perBox', 'grades'], operations: ['每箱盒数乘箱数求总数，再平均分给年级数'], units: ['盒'], invariants: ['先求总盒数再平均分', '总数可被年级数整除', '保留两个步骤的乘除关系'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    entries.push(makeTransferEntry(chalkSource, {
      text: '学校买了8箱粉笔，每箱21盒，平均分给4个年级，每个年级分到多少盒？', numbers: [8, 21, 4], answer: 42, answerType: 'number',
      equation: '21×8÷4=42（盒）', answerSentence: '每个年级分到42盒。', explanation: '先求粉笔总盒数：21×8=168盒；再平均分给4个年级：168÷4=42盒。',
      solutionSteps: ['总盒数：21×8=168盒', '每个年级：168÷4=42盒'], hints: ['先求全部粉笔盒数，再平均分给年级。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const setSource = byId.get('g3o_15');
  if (setSource) {
    const result = { answer: op('sub', f('total'), op('sub', op('add', f('math'), f('chinese')), f('both'))) };
    const sourceFacts = { total: 50, math: 28, chinese: 25, both: 8 }, sourceAnchors = { total: '50人中', math: '数学28人', chinese: '语文25人', both: '两科都参加8人' };
    const facts = { total: 60, math: 34, chinese: 27, both: 7 }, anchors = { total: '60人中', math: '数学34人', chinese: '语文27人', both: '两科都参加7人' };
    const relation: TransferRelation = { family: 'legacy-g3o_15', targetRole: '两科都没参加的人数', roles: ['total', 'math', 'chinese', 'both'], operations: ['两项人数相加后减去重复计算的交集，再从总人数中扣除至少参加一项的人数'], units: ['人'], invariants: ['交集人数只计一次', '两项已知参与人数和交集共同参与计算', '用总人数减至少参加一项的人数'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    entries.push(makeTransferEntry(setSource, {
      text: '60人中，参加数学34人，语文27人，两科都参加7人。两科都没参加多少人？', numbers: [60, 34, 27, 7], answer: 6, answerType: 'number',
      equation: '60-(34+27-7)=6（人）', answerSentence: '两科都没参加的有6人。', explanation: '至少参加一科的人数为34+27-7=54人，减去总人数60-54=6人两科都没参加。',
      solutionSteps: ['至少参加一科：34+27-7=54人', '两科都没参加：60-54=6人'], hints: ['两科都参加的人在两个科目人数中重复计了一次，要减去一次。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const squareSource = byId.get('g3o_21');
  if (squareSource) {
    const result = op('sub', op('mul', f('side'), 4), 4);
    const sourceFacts = { side: 10 }, sourceAnchors = { side: '最外层每边10人' };
    const facts = { side: 13 }, anchors = { side: '最外层每边13人' };
    const relation: TransferRelation = { family: 'legacy-g3o_21', targetRole: '正方形方阵最外层人数', roles: ['side'], operations: ['四边人数相加后减去四个重复计算的角点'], units: ['人'], invariants: ['正方形四边结构不变', '每个角点在相邻两边中重复计数一次', '求最外层总人数'] };
    entries.push(makeTransferEntry(squareSource, {
      text: '同学们排成正方形方阵。最外层每边13人，最外层共多少人？', numbers: [13, 4], answer: 48,
      equation: '13×4−4=48（人）', answerSentence: '最外层共48人。',
      explanation: '把四边人数相加时，四个角上的同学各被相邻两边重复算了一次，所以要减去4人：13×4−4=48人。',
      solutionSteps: ['四边合计：13×4=52人', '减去重复计算的四个角：52−4=48人'], hints: ['先把四边人数相加，再减去四个角上重复计算的人数。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors, result), variant: proof(facts, anchors, result) }));
  }
  const ratioSum = byId.get('g3o_01');
  if (ratioSum) {
    const each = op('div', f('total'), op('add', f('factor'), 1));
    const result = { jia: op('mul', each, f('factor')), yi: each };
    const sourceFacts = { factor: 3, total: 48 }, sourceAnchors = { factor: '乙数的3倍', total: '两数和是48' };
    const facts = { factor: 4, total: 65 }, anchors = { factor: '乙数的4倍', total: '两数和是65' };
    const relation: TransferRelation = { family: 'legacy-g3o_01', targetRole: '甲数和乙数', roles: ['factor', 'total'], operations: ['和除以两数份数和求乙数，再乘倍数求甲数'], units: ['数'], invariants: ['总和按1份与倍数份分配', '同时求两个数', '两数之和与倍数关系均满足题干'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    entries.push(makeTransferEntry(ratioSum, {
      text: '甲数是乙数的4倍，两数和是65。甲、乙各是多少？', numbers: [4, 65], answer: '甲52乙13', answerType: 'multi_answer',
      subAnswers: [{ id: 'jia', label: '甲数', answer: 52 }, { id: 'yi', label: '乙数', answer: 13 }], equation: '65÷(4+1)=13；13×4=52',
      answerSentence: '甲数是52，乙数是13。', explanation: '乙数看作1份，甲数是4份，共5份。每份65÷5=13，所以乙数13，甲数13×4=52。',
      solutionSteps: ['总份数：4+1=5份', '乙数：65÷5=13', '甲数：13×4=52'], hints: ['先求两数一共对应多少份，再用总和除以份数。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const treeRatio = byId.get('g3o_02');
  if (treeRatio) {
    const pear = op('div', f('total'), op('add', f('factor'), 1));
    const result = { tao: op('mul', pear, f('factor')), li: pear };
    const sourceFacts = { factor: 4, total: 120 }, sourceAnchors = { factor: '桃树是梨树的4倍', total: '共120棵' };
    const facts = { factor: 4, total: 135 }, anchors = { factor: '桃树是梨树的4倍', total: '共135棵' };
    const relation: TransferRelation = { family: 'legacy-g3o_02', targetRole: '桃树和梨树的棵数', roles: ['factor', 'total'], operations: ['总棵数除以份数总量求梨树，再乘倍数求桃树'], units: ['棵'], invariants: ['桃树与梨树的倍数关系保持不变', '两类树木总数等于题干总棵数', '同时回答两类树的棵数'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    entries.push(makeTransferEntry(treeRatio, {
      text: '果园里桃树和梨树共135棵，桃树是梨树的4倍。两种树各有多少棵？', numbers: [135, 4], answer: '桃108梨27', answerType: 'multi_answer',
      subAnswers: [{ id: 'tao', label: '桃树', answer: 108 }, { id: 'li', label: '梨树', answer: 27 }], equation: '135÷(4+1)=27；27×4=108',
      answerSentence: '桃树108棵，梨树27棵。', explanation: '梨树1份，桃树4份，共5份。每份135÷5=27棵，桃树为27×4=108棵。',
      solutionSteps: ['总份数：1+4=5份', '梨树：135÷5=27棵', '桃树：27×4=108棵'], hints: ['把梨树看作1份，桃树就是4份。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const ratioDifference = byId.get('g3o_03');
  if (ratioDifference) {
    const each = op('div', f('difference'), op('sub', f('factor'), 1));
    const result = { jia: op('mul', each, f('factor')), yi: each };
    const sourceFacts = { factor: 4, difference: 27 }, sourceAnchors = { factor: '甲数是乙数的4倍', difference: '甲比乙多27' };
    const facts = { factor: 5, difference: 32 }, anchors = { factor: '甲数是乙数的5倍', difference: '甲比乙多32' };
    const relation: TransferRelation = { family: 'legacy-g3o_03', targetRole: '甲数和乙数', roles: ['factor', 'difference'], operations: ['两数倍数差除以份数差求乙数，再乘倍数求甲数'], units: ['数'], invariants: ['差对应倍数份数之差', '两数的倍数和差关系同时成立', '同时求两个数'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    entries.push(makeTransferEntry(ratioDifference, {
      text: '甲数是乙数的5倍，甲比乙多32。甲、乙各是多少？', numbers: [5, 32], answer: '甲40乙8', answerType: 'multi_answer',
      subAnswers: [{ id: 'jia', label: '甲数', answer: 40 }, { id: 'yi', label: '乙数', answer: 8 }], equation: '32÷(5-1)=8；8×5=40',
      answerSentence: '甲数是40，乙数是8。', explanation: '甲比乙多出的部分是5-1=4份，对应32。每份32÷4=8，所以乙数8，甲数8×5=40。',
      solutionSteps: ['份数差：5-1=4份', '乙数：32÷4=8', '甲数：8×5=40'], hints: ['先算甲乙相差几份，再用已知差除以份数差。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const ageRatio = byId.get('g3o_04');
  if (ageRatio) {
    const son = op('div', f('difference'), op('sub', f('factor'), 1));
    const result = { son, dad: op('mul', son, f('factor')) };
    const sourceFacts = { factor: 5, difference: 28 }, sourceAnchors = { factor: '爸爸的年龄是小明的5倍', difference: '爸爸比小明大28岁' };
    const facts = { factor: 4, difference: 24 }, anchors = { factor: '爸爸的年龄是小明的4倍', difference: '爸爸比小明大24岁' };
    const relation: TransferRelation = { family: 'legacy-g3o_04', targetRole: '小明和爸爸的年龄', roles: ['factor', 'difference'], operations: ['年龄差除以倍数份差求小明年龄，再乘倍数求爸爸年龄'], units: ['岁'], invariants: ['父子年龄倍数关系不变', '年龄差对应两者的份数差', '同时回答两人的年龄'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    entries.push(makeTransferEntry(ageRatio, {
      text: '爸爸的年龄是小明的4倍，爸爸比小明大24岁。小明和爸爸各多少岁？', numbers: [4, 24], answer: '小明8爸爸32', answerType: 'multi_answer',
      subAnswers: [{ id: 'son', label: '小明', answer: 8 }, { id: 'dad', label: '爸爸', answer: 32 }], equation: '24÷(4-1)=8；8×4=32',
      answerSentence: '小明8岁，爸爸32岁。', explanation: '爸爸比小明多4-1=3份，对应24岁。每份24÷3=8岁，所以小明8岁，爸爸8×4=32岁。',
      solutionSteps: ['倍数差：4-1=3份', '小明：24÷3=8岁', '爸爸：8×4=32岁'], hints: ['把年龄差看作爸爸比小明多出的几份。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const candySource = byId.get('g3o_13');
  if (candySource) {
    const people = op('div', op('add', f('extra'), f('short')), op('sub', f('perB'), f('perA')));
    const result = { people, candy: op('add', op('mul', f('perA'), people), f('extra')) };
    const sourceFacts = { perA: 3, extra: 4, perB: 5, short: 6 }, sourceAnchors = { perA: '每人3颗', extra: '多4颗', perB: '每人5颗', short: '少6颗' };
    const facts = { perA: 4, extra: 6, perB: 6, short: 4 }, anchors = { perA: '每人4颗', extra: '多6颗', perB: '每人6颗', short: '少4颗' };
    const relation: TransferRelation = { family: 'legacy-g3o_13', targetRole: '分糖人数和糖果总数', roles: ['perA', 'extra', 'perB', 'short'], operations: ['盈亏和除以分配数差求人数，再用一种分法求糖果总数'], units: ['人', '颗'], invariants: ['同时保留一多一少的盈亏关系', '两种分法共同确定人数', '人数和糖果总数均作答'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    entries.push(makeTransferEntry(candySource, {
      text: '老师分糖。每人4颗多6颗，每人6颗少4颗。多少人？多少糖？', numbers: [4, 6, 6, 4], answer: '5人26颗', answerType: 'multi_answer',
      subAnswers: [{ id: 'people', label: '人数', answer: 5 }, { id: 'candy', label: '糖数', answer: 26 }], equation: '(6+4)÷(6-4)=5人；4×5+6=26颗',
      answerSentence: '5个小朋友，26颗糖。', explanation: '盈亏合计6+4=10颗，每人分配数相差6-4=2颗，所以有10÷2=5人。糖果总数为4×5+6=26颗。',
      solutionSteps: ['盈亏合计：6+4=10颗', '每人差：6-4=2颗', '人数：10÷2=5人', '糖果：4×5+6=26颗'], hints: ['一多一少时，把多出的和少的合起来，再除以两次分配数之差。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const pencilSource = byId.get('g3o_14');
  if (pencilSource) {
    const people = op('div', op('add', f('extra'), f('short')), op('sub', f('perB'), f('perA')));
    const result = { people, pencils: op('add', op('mul', f('perA'), people), f('extra')) };
    const sourceFacts = { perA: 5, extra: 6, perB: 7, short: 4 }, sourceAnchors = { perA: '每人5支', extra: '多6支', perB: '每人7支', short: '少4支' };
    const facts = { perA: 4, extra: 8, perB: 6, short: 6 }, anchors = { perA: '每人4支', extra: '多8支', perB: '每人6支', short: '少6支' };
    const relation: TransferRelation = { family: 'legacy-g3o_14', targetRole: '分铅笔人数和铅笔总数', roles: ['perA', 'extra', 'perB', 'short'], operations: ['盈亏和除以分配数差求人数，再由一种分法求铅笔总数'], units: ['人', '支'], invariants: ['同时保留一多一少的盈亏关系', '人数和铅笔总数均作答', '两种分配条件推出同一总支数'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    entries.push(makeTransferEntry(pencilSource, {
      text: '分铅笔。每人4支多8支，每人6支少6支。几人？几支？', numbers: [4, 8, 6, 6], answer: '7人36支', answerType: 'multi_answer',
      subAnswers: [{ id: 'people', label: '人数', answer: 7 }, { id: 'pencils', label: '铅笔数', answer: 36 }], equation: '(8+6)÷(6-4)=7人；4×7+8=36支',
      answerSentence: '7人，36支铅笔。', explanation: '多出的和少的合计8+6=14支，每人分配数相差6-4=2支，所以有14÷2=7人。铅笔总数为4×7+8=36支。',
      solutionSteps: ['盈亏合计：8+6=14支', '每人差：6-4=2支', '人数：14÷2=7人', '铅笔：4×7+8=36支'], hints: ['先用盈亏合计除以两种分法的每人数量差。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const chickenSource = byId.get('g3o_10');
  if (chickenSource) {
    const rabbits = op('div', op('sub', f('legs'), op('mul', 2, f('animals'))), 2);
    const result = { ji: op('sub', f('animals'), rabbits), tu: rabbits };
    const sourceFacts = { animals: 10, legs: 28 }, sourceAnchors = { animals: '共10只', legs: '28条腿' };
    const facts = { animals: 12, legs: 34 }, anchors = { animals: '共12只', legs: '34条腿' };
    const relation: TransferRelation = { family: 'legacy-g3o_10', targetRole: '鸡和兔的只数', roles: ['animals', 'legs'], operations: ['先假设全是鸡求多出的腿数，再除以兔与鸡的腿数差求兔数'], units: ['只'], invariants: ['鸡兔总只数固定为给定人数', '每换一只兔比鸡多2条腿', '同时求两种动物数量'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    entries.push(makeTransferEntry(chickenSource, {
      text: '鸡和兔共12只，34条腿。鸡兔各几只？', numbers: [12, 34], answer: '鸡7兔5', answerType: 'multi_answer',
      subAnswers: [{ id: 'ji', label: '鸡', answer: 7 }, { id: 'tu', label: '兔', answer: 5 }], equation: '(34-2×12)÷2=5只兔；12-5=7只鸡',
      answerSentence: '鸡7只，兔5只。', explanation: '假设全是鸡，共有2×12=24条腿，实际多34-24=10条。每只兔比鸡多2条腿，所以兔有10÷2=5只，鸡有12-5=7只。',
      solutionSteps: ['假设全是鸡：2×12=24条腿', '多出的腿：34-24=10条', '兔：10÷2=5只', '鸡：12-5=7只'], hints: ['先把每只动物都按鸡算腿，再用多出的腿数求兔子只数。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const vehicleSource = byId.get('g3o_11');
  if (vehicleSource) {
    const cars = op('div', op('sub', f('wheels'), op('mul', 3, f('vehicles'))), 1);
    const result = { tricycle: op('sub', f('vehicles'), cars), car: cars };
    const sourceFacts = { vehicles: 15, wheels: 50 }, sourceAnchors = { vehicles: '共15辆', wheels: '50个轮子' };
    const facts = { vehicles: 18, wheels: 61 }, anchors = { vehicles: '共18辆', wheels: '61个轮子' };
    const relation: TransferRelation = { family: 'legacy-g3o_11', targetRole: '三轮车和汽车的辆数', roles: ['vehicles', 'wheels'], operations: ['先假设全是三轮车求多出的轮子，再用每辆汽车多1个轮子求汽车数'], units: ['辆'], invariants: ['车辆总数由题干给出', '三轮车与汽车的车轮数差为1', '同时给出两类车辆数量'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    entries.push(makeTransferEntry(vehicleSource, {
      text: '三轮车和汽车共18辆，61个轮子。各几辆？', numbers: [18, 61], answer: '三轮11汽车7', answerType: 'multi_answer',
      subAnswers: [{ id: 'tricycle', label: '三轮车', answer: 11 }, { id: 'car', label: '汽车', answer: 7 }], equation: '(61-3×18)÷(4-3)=7辆汽车；18-7=11辆三轮车',
      answerSentence: '三轮车11辆，汽车7辆。', explanation: '假设全是三轮车，共3×18=54个轮子，比实际少7个。每辆汽车比三轮车多1个轮子，所以汽车有7辆，三轮车有18-7=11辆。',
      solutionSteps: ['假设全是三轮车：3×18=54个轮子', '多出的轮子：61-54=7个', '汽车：7÷1=7辆', '三轮车：18-7=11辆'], hints: ['假设全部车辆都是三轮车，汽车每辆多出来的1个轮子可以用来求汽车数。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const billSource = byId.get('g3o_12');
  if (billSource) {
    const fives = op('div', op('sub', f('total'), op('mul', 2, f('bills'))), 3);
    const result = { five: fives, two: op('sub', f('bills'), fives) };
    const sourceFacts = { bills: 18, total: 66 }, sourceAnchors = { bills: '共18张', total: '共66元' };
    const facts = { bills: 21, total: 75 }, anchors = { bills: '共21张', total: '共75元' };
    const relation: TransferRelation = { family: 'legacy-g3o_12', targetRole: '5元和2元纸币的张数', roles: ['bills', 'total'], operations: ['假设全是2元求差额，再除以两种面值差求5元张数'], units: ['张'], invariants: ['纸币总张数和总金额共同确定两种张数', '5元张数加2元张数等于总张数', '总金额与各面值数量相符'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    entries.push(makeTransferEntry(billSource, {
      text: '5元和2元纸币共21张，共75元。各几张？', numbers: [21, 75], answer: '5元11张2元10张', answerType: 'multi_answer',
      subAnswers: [{ id: 'five', label: '5元', answer: 11 }, { id: 'two', label: '2元', answer: 10 }], equation: '(75-2×21)÷(5-2)=11张；21-11=10张',
      answerSentence: '5元11张，2元10张。', explanation: '假设全是2元，共2×21=42元，实际多75-42=33元。每张5元比2元多3元，所以5元纸币有33÷3=11张，2元纸币有21-11=10张。',
      solutionSteps: ['假设全是2元：2×21=42元', '金额差：75-42=33元', '5元张数：33÷3=11张', '2元张数：21-11=10张'], hints: ['先按较小面值计算总金额，再用差额除以两种面值差。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const hobbySource = byId.get('g3o_16');
  if (hobbySource) {
    const result = { answer: op('sub', f('total'), op('sub', op('add', f('basketball'), f('soccer')), f('both'))) };
    const sourceFacts = { total: 40, basketball: 25, soccer: 20, both: 10 }, sourceAnchors = { total: '全班40人', basketball: '爱打篮球25人', soccer: '爱踢足球20人', both: '两项都爱10人' };
    const facts = { total: 60, basketball: 33, soccer: 25, both: 14 }, anchors = { total: '全班60人', basketball: '爱打篮球33人', soccer: '爱踢足球25人', both: '两项都爱14人' };
    const relation: TransferRelation = { family: 'legacy-g3o_16', targetRole: '两项爱好都不爱的人数', roles: ['total', 'basketball', 'soccer', 'both'], operations: ['两项人数相加后减去重复计数的交集，再从全班人数中扣除至少爱一项的人数'], units: ['人'], invariants: ['两项爱好可重叠，交集只算一次', '各爱好人数与都爱人数均参与运算', '用全班人数减至少爱一项的人数'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    entries.push(makeTransferEntry(hobbySource, {
      text: '全班60人，爱打篮球33人，爱踢足球25人，两项都爱14人。两项都不爱几人？', numbers: [60, 33, 25, 14], answer: 16, answerType: 'number',
      equation: '60-(33+25-14)=16（人）', answerSentence: '两项都不爱的有16人。', explanation: '至少爱一项的人数为33+25-14=44人，减去全班60-44=16人两项都不爱。',
      solutionSteps: ['至少爱一项：33+25-14=44人', '两项都不爱：60-44=16人'], hints: ['先把两项人数相加并减去重复的交集，再从全班人数中减去。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const digitRiddle = byId.get('g3o_20');
  if (digitRiddle && String(digitRiddle.answer) === 'A=5,B=3') {
    const digitSum = op('div', f('reversedSum'), 11);
    const result = { A: op('div', op('add', digitSum, f('difference')), 2), B: op('div', op('sub', digitSum, f('difference')), 2) };
    const sourceFacts = { reversedSum: 88, difference: 2 }, sourceAnchors = { reversedSum: 'AB+BA=88', difference: 'A比B大2' };
    const facts = { reversedSum: 99, difference: 1 }, anchors = { reversedSum: 'AB+BA=99', difference: 'A比B大1' };
    const relation: TransferRelation = { family: 'legacy-g3o_20', targetRole: '两个数字谜的数字A和B', roles: ['reversedSum', 'difference'], operations: ['AB+BA=11(A+B)，由A+B与A-B联立求A和B'], units: ['数字'], invariants: ['保留AB和BA互换相加的数字结构', 'A与B是不同的一位数字', '和与差两个条件共同确定唯一的A、B'] };
    const template = 'A={A},B={B}';
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'text', template });
    entries.push(makeTransferEntry(digitRiddle, {
      text: '竖式谜：AB+BA=99。A和B是两个不同的数字，A比B大1。A和B各是几？', numbers: [99, 1], answer: 'A=5,B=4', answerType: 'number',
      equation: 'AB+BA=11(A+B)=99，所以A+B=9；A-B=1，因此A=5，B=4', answerSentence: 'A=5，B=4。验证：54+45=99，且5-4=1。',
      explanation: 'AB+BA=(10A+B)+(10B+A)=11(A+B)=99，因此A+B=9。又A-B=1，两式相加得2A=10，所以A=5，B=4。二者是不同的一位数字，且满足两个条件。',
      solutionSteps: ['AB+BA=11(A+B)=99，得到A+B=9', '由题意A-B=1', '联立得2A=10，所以A=5、B=4', '验证：54+45=99且5-4=1'], hints: ['先把两个逆序两位数都写成十位与个位的和，再和差联立。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const extraInfoSource = sources.find(question => question.id === 'extra_02' && question.gradeBand === 'G3');
  if (extraInfoSource && Number(extraInfoSource.answer) === 9) {
    const result = op('sub', f('apples'), f('pears'));
    const sourceFacts = { apples: 12, pears: 3 }, sourceAnchors = { apples: '买了12个苹果', pears: '和3个梨' };
    const facts = { apples: 14, pears: 6 }, anchors = { apples: '买了14个苹果', pears: '和6个梨' };
    const relation: TransferRelation = { family: 'legacy-extra_02', targetRole: '苹果比梨多的个数', roles: ['apples', 'pears'], operations: ['用苹果数量减梨的数量'], units: ['个'], invariants: ['比较两种水果的数量差', '题干保留无关的花费叙述', '花费金额不参与数量差计算'] };
    const proof = (proofFacts: Record<string, number>, proofAnchors: Record<string, string>): TransferProof => ({ facts: proofFacts, anchors: proofAnchors, result, format: 'number' });
    entries.push(makeTransferEntry(extraInfoSource, {
      text: '妈妈买了14个苹果和6个梨，花了42元钱，苹果比梨多几个？', numbers: [14, 6, 42], answer: 8, answerType: 'number',
      equation: '14−6=8（个）；42元是花费信息，与水果数量差无关。', answerSentence: '苹果比梨多8个。',
      explanation: '比较数量只用苹果和梨的个数：14−6=8个。42元是购买花费，不影响数量差。',
      solutionSteps: ['找到苹果14个和梨6个。', '花费42元与“多几个”无关。', '苹果比梨多：14−6=8个。'], hints: ['判断题目问的是数量差还是花费，再选对应的数字。'],
    }, relation, { kind: 'arithmetic', source: proof(sourceFacts, sourceAnchors), variant: proof(facts, anchors) }));
  }
  const calendarSource = sources.find(question => question.id === 'g3o_25' && question.gradeBand === 'G3');
  if (calendarSource && String(calendarSource.answer) === '周日,5个') {
    const relation: TransferRelation = { family: 'legacy-g3o_25', targetRole: '指定日期的星期和该月星期一的日期数', roles: ['year', 'month', 'startDay', 'startWeekday', 'targetDay', 'countWeekday'], operations: ['按公历核实月初星期，从月初逐日推进并枚举目标星期日期'], units: ['星期', '天数'], invariants: ['使用真实公历年月与月初日期', '星期按七日循环', '同时求目标日星期和月内指定星期的出现次数'] };
    const sourceModel = { year: 2026, month: 6, startDay: 1, startWeekday: 1, targetDay: 28, countWeekday: 1, target: 'weekday-and-month-count' };
    const variantModel = { year: 2027, month: 6, startDay: 1, startWeekday: 2, targetDay: 28, countWeekday: 1, target: 'weekday-and-month-count' };
    entries.push(makeTransferEntry(calendarSource, {
      text: '一周有7天。2027年6月1日周二。这年的6月28日是周几？6月有几个周一？', numbers: [2027, 6, 1, 28, 7], answer: '周一,4个', answerType: 'multi_answer',
      answerSchema: { kind: 'multi_field', fields: [{ id: 'weekday', label: '周几', kind: 'text' }, { id: 'count', label: '周一数', kind: 'integer' }] },
      subAnswers: [{ id: 'weekday', label: '周几', answer: '周一' }, { id: 'count', label: '周一数', answer: 4, unit: '个' }],
      equation: '28−1=27=3×7+6；周二往后6天是周一。周一日期为1+6、1+13、1+20、1+27，即7、14、21、28日，共4个。', answerSentence: '6月28日是周一，6月有4个周一。',
      explanation: '2027年6月1日是周二。从1日到28日经过27天，27÷7=3余6，周二往后6天是周一。该月周一日期是7、14、21、28日，共4个。',
      solutionSteps: ['经过天数：28−1=27，27÷7=3余6。', '周二往后6天是周一，所以6月28日是周一。', '该月周一是7、14、21、28日，共4个。'], hints: ['先用题干给出的月初星期逐日推进，再每隔7天列出这个月所有周一。'],
    }, relation, { kind: 'enumeration', model: 'legacy-calendar-weekday-and-count-v1', source: sourceModel, variant: variantModel }, 'structural-proof'));
  }
  return { entries, gaps };
}
