import type { Question } from '@/lib/types';
import { makeTransferEntry } from './helpers';
import { buildLegacyGrade1ExtraTransfers } from './legacy-grade1-extra';
import type { TransferBatch, TransferEntry, TransferGap, TransferProof, TransferRelation } from './types';

type AddSubRecipe = {
  operation: 'add' | 'sub';
  sourceFacts: { start: number; change: number };
  sourceAnchors: { start: string; change: string };
  variantFacts: { start: number; change: number };
  variantText: string;
  variantAnchors: { start: string; change: string };
  entity: string;
  answerType?: Question['answerType'];
  location: string;
  action: string;
  meaning: string;
  sourceMeaning?: string;
};

const recipes: Record<string, AddSubRecipe> = {
  g1_01: { operation: 'add', sourceFacts: { start: 6, change: 3 }, sourceAnchors: { start: '有6只小兔子', change: '又跑来了3只' }, variantFacts: { start: 5, change: 2 }, variantText: '草地上有5只小兔子，又跑来了2只，现在一共有几只小兔子？', variantAnchors: { start: '有5只小兔子', change: '又跑来了2只' }, entity: '只小兔子', location: '草地上一共有', action: '跑来了', meaning: '问总数' },
  g1_02: { operation: 'add', sourceFacts: { start: 5, change: 4 }, sourceAnchors: { start: '小明有5个苹果', change: '又给了他4个苹果' }, variantFacts: { start: 6, change: 2 }, variantText: '小明有6个苹果，妈妈又给了他2个苹果，小明现在有几个苹果？', variantAnchors: { start: '小明有6个苹果', change: '又给了他2个苹果' }, entity: '个苹果', location: '小明现在有', action: '给了', meaning: '问总数' },
  g1_03: { operation: 'add', sourceFacts: { start: 7, change: 2 }, sourceAnchors: { start: '树上有7只小鸟', change: '又飞来了2只' }, variantFacts: { start: 4, change: 2 }, variantText: '树上有4只小鸟，又飞来了2只，现在树上有几只小鸟？', variantAnchors: { start: '树上有4只小鸟', change: '又飞来了2只' }, entity: '只小鸟', location: '树上现在有', action: '飞来了', meaning: '问总数' },
  g1_04: { operation: 'sub', sourceFacts: { start: 10, change: 4 }, sourceAnchors: { start: '有10个桃子', change: '摘走了4个' }, variantFacts: { start: 12, change: 5 }, variantText: '树上有12个桃子，小猴子摘走了5个，树上还剩几个桃子？', variantAnchors: { start: '有12个桃子', change: '摘走了5个' }, entity: '个桃子', location: '树上还剩', action: '摘走了', meaning: '问还剩多少', sourceMeaning: '问还剩多少' },
  g1_05: { operation: 'sub', sourceFacts: { start: 8, change: 3 }, sourceAnchors: { start: '买了8个包子', change: '吃掉了3个' }, variantFacts: { start: 9, change: 2 }, variantText: '妈妈买了9个包子，小明吃掉了2个，还剩几个包子？', variantAnchors: { start: '买了9个包子', change: '吃掉了2个' }, entity: '个包子', location: '还剩', action: '吃掉了', meaning: '问还剩多少', sourceMeaning: '问还剩多少' },
  g1_06: { operation: 'add', sourceFacts: { start: 5, change: 3 }, sourceAnchors: { start: '有5朵小花', change: '又开了3朵' }, variantFacts: { start: 4, change: 3 }, variantText: '花园里有4朵小花，又开了3朵，现在花园里有几朵小花？', variantAnchors: { start: '有4朵小花', change: '又开了3朵' }, entity: '朵小花', location: '花园里现在有', action: '开了', meaning: '问总数' },
  g1_07: { operation: 'sub', sourceFacts: { start: 9, change: 4 }, sourceAnchors: { start: '有9只鸭子', change: '游走了4只' }, variantFacts: { start: 9, change: 2 }, variantText: '池塘里有9只鸭子，游走了2只，池塘里还剩几只鸭子？', variantAnchors: { start: '有9只鸭子', change: '游走了2只' }, entity: '只鸭子', location: '池塘里还剩', action: '游走了', meaning: '问还剩多少', sourceMeaning: '问还剩多少' },
  g1_08: { operation: 'add', sourceFacts: { start: 6, change: 4 }, sourceAnchors: { start: '有6个小朋友', change: '又进来了4个' }, variantFacts: { start: 5, change: 3 }, variantText: '教室里有5个小朋友，又进来了3个，教室里现在有几个小朋友？', variantAnchors: { start: '有5个小朋友', change: '又进来了3个' }, entity: '个小朋友', location: '教室里现在有', action: '进来了', meaning: '问总数' },
  g1_09: { operation: 'sub', sourceFacts: { start: 7, change: 3 }, sourceAnchors: { start: '有7支蜡笔', change: '用掉了3支' }, variantFacts: { start: 9, change: 2 }, variantText: '盒子里有9支蜡笔，妹妹用掉了2支，还剩几支蜡笔？', variantAnchors: { start: '有9支蜡笔', change: '用掉了2支' }, entity: '支蜡笔', location: '盒子里还剩', action: '用掉了', meaning: '问还剩多少', sourceMeaning: '问还剩多少' },
  g1_10: { operation: 'add', sourceFacts: { start: 4, change: 3 }, sourceAnchors: { start: '有4颗糖果', change: '又给了她3颗' }, variantFacts: { start: 5, change: 1 }, variantText: '妹妹有5颗糖果，姐姐又给了她1颗，妹妹现在有几颗糖果？', variantAnchors: { start: '有5颗糖果', change: '又给了她1颗' }, entity: '颗糖果', location: '妹妹现在有', action: '给了', meaning: '问总数' },
  g1_11: { operation: 'sub', sourceFacts: { start: 6, change: 2 }, sourceAnchors: { start: '有6块饼干', change: '吃掉了2块' }, variantFacts: { start: 8, change: 3 }, variantText: '桌上有8块饼干，小红吃掉了3块，桌上还剩几块饼干？', variantAnchors: { start: '有8块饼干', change: '吃掉了3块' }, entity: '块饼干', location: '桌上还剩', action: '吃掉了', meaning: '问还剩多少', sourceMeaning: '问还剩多少' },
  g1_12: { operation: 'add', sourceFacts: { start: 5, change: 3 }, sourceAnchors: { start: '有5条小鱼', change: '又加了3条' }, variantFacts: { start: 4, change: 5 }, variantText: '鱼缸里有4条小鱼，爸爸又加了5条，鱼缸里现在有几条小鱼？', variantAnchors: { start: '有4条小鱼', change: '又加了5条' }, entity: '条小鱼', location: '鱼缸里现在有', action: '加了', meaning: '问总数' },
  g1_14: { operation: 'add', sourceFacts: { start: 9, change: 4 }, sourceAnchors: { start: '有9辆玩具车', change: '又开来了4辆' }, variantFacts: { start: 9, change: 5 }, variantText: '停车场有9辆玩具车，又开来了5辆，现在停车场有几辆玩具车？', variantAnchors: { start: '有9辆玩具车', change: '又开来了5辆' }, entity: '辆玩具车', location: '停车场现在有', action: '开来了', meaning: '问总数' },
  g1_15: { operation: 'sub', sourceFacts: { start: 10, change: 4 }, sourceAnchors: { start: '有10个酸奶', change: '喝掉了4个' }, variantFacts: { start: 12, change: 5 }, variantText: '冰箱里有12个酸奶，喝掉了5个，还剩几个酸奶？', variantAnchors: { start: '有12个酸奶', change: '喝掉了5个' }, entity: '个酸奶', location: '冰箱里还剩', action: '喝掉了', meaning: '问还剩多少', sourceMeaning: '还剩几个' },
  g1_16: { operation: 'add', sourceFacts: { start: 8, change: 3 }, sourceAnchors: { start: '有8个皮球', change: '又拿来了3个' }, variantFacts: { start: 7, change: 5 }, variantText: '操场上有7个皮球，体育老师又拿来了5个，现在操场上有几个皮球？', variantAnchors: { start: '有7个皮球', change: '又拿来了5个' }, entity: '个皮球', location: '操场上现在有', action: '拿来了', meaning: '问总数' },
  g1_17: { operation: 'sub', sourceFacts: { start: 8, change: 3 }, sourceAnchors: { start: '有8只蝴蝶', change: '飞走了3只' }, variantFacts: { start: 9, change: 2 }, variantText: '花丛中有9只蝴蝶，飞走了2只，花丛中还剩几只蝴蝶？', variantAnchors: { start: '有9只蝴蝶', change: '飞走了2只' }, entity: '只蝴蝶', location: '花丛中还剩', action: '飞走了', meaning: '问还剩多少', sourceMeaning: '还有几只' },
  g1_18: { operation: 'sub', sourceFacts: { start: 11, change: 5 }, sourceAnchors: { start: '有11颗草莓', change: '吃掉了5颗' }, variantFacts: { start: 13, change: 6 }, variantText: '果盘里有13颗草莓，吃掉了6颗，还剩几颗草莓？', variantAnchors: { start: '有13颗草莓', change: '吃掉了6颗' }, entity: '颗草莓', location: '果盘里还剩', action: '吃掉了', meaning: '问还剩多少', sourceMeaning: '还剩几颗' },
  g1_19: { operation: 'sub', sourceFacts: { start: 15, change: 6 }, sourceAnchors: { start: '有15个小朋友', change: '走了6个' }, variantFacts: { start: 15, change: 7 }, variantText: '班上有15个小朋友，放学走了7个，还剩几个小朋友？', variantAnchors: { start: '有15个小朋友', change: '走了7个' }, entity: '个小朋友', location: '班上还剩', action: '走了', meaning: '问还剩多少', sourceMeaning: '还剩几个' },
  g1_21: { operation: 'add', sourceFacts: { start: 9, change: 5 }, sourceAnchors: { start: '有9只白兔', change: '又跑来了5只' }, variantFacts: { start: 8, change: 7 }, variantText: '草地上有8只白兔，又跑来了7只灰兔，现在草地上一共有几只兔子？', variantAnchors: { start: '有8只白兔', change: '又跑来了7只' }, entity: '只兔子', location: '草地上一共有', action: '跑来了', meaning: '问总数' },
  g1_22: { operation: 'add', sourceFacts: { start: 8, change: 3 }, sourceAnchors: { start: '有8个苹果', change: '又拿来3个苹果' }, variantFacts: { start: 7, change: 5 }, variantText: '桌上有7个梨，小红又拿来5个梨，桌上一共有多少个梨？', variantAnchors: { start: '有7个梨', change: '又拿来5个梨' }, entity: '个梨', location: '桌上一共有', action: '拿来', meaning: '问总数' },
  g1_23: { operation: 'sub', sourceFacts: { start: 6, change: 2 }, sourceAnchors: { start: '有6支铅笔', change: '用掉了2支' }, variantFacts: { start: 8, change: 3 }, variantText: '文具盒里有8支铅笔，用掉了3支，还剩多少支铅笔？', variantAnchors: { start: '有8支铅笔', change: '用掉了3支' }, entity: '支铅笔', location: '还剩', action: '用掉了', meaning: '问还剩多少', sourceMeaning: '还剩多少' },
  g1_24: { operation: 'add', sourceFacts: { start: 7, change: 4 }, sourceAnchors: { start: '有7条金鱼', change: '又买了4条金鱼' }, variantFacts: { start: 8, change: 5 }, variantText: '鱼缸里有8条金鱼，爸爸又买了5条放进去，鱼缸里现在有多少条金鱼？', variantAnchors: { start: '有8条金鱼', change: '又买了5条' }, entity: '条金鱼', location: '鱼缸里现在有', action: '买了', meaning: '问总数' },
  g1_25: { operation: 'sub', sourceFacts: { start: 10, change: 3 }, sourceAnchors: { start: '有10只小鸟', change: '飞走了3只' }, variantFacts: { start: 14, change: 5 }, variantText: '树上有14只小鸟，飞走了5只，树上还剩几只小鸟？', variantAnchors: { start: '有14只小鸟', change: '飞走了5只' }, entity: '只小鸟', location: '树上还剩', action: '飞走了', meaning: '问还剩多少', sourceMeaning: '还剩几只' },
  g1ll_01: { operation: 'sub', sourceFacts: { start: 11, change: 5 }, sourceAnchors: { start: '有11颗草莓', change: '吃掉了5颗' }, variantFacts: { start: 13, change: 6 }, variantText: '果盘里有13颗草莓，吃掉了6颗，还剩几颗草莓？', variantAnchors: { start: '有13颗草莓', change: '吃掉了6颗' }, entity: '颗草莓', location: '果盘里还剩', action: '吃掉了', meaning: '问还剩多少', sourceMeaning: '还剩几颗' },
  g1ll_02: { operation: 'sub', sourceFacts: { start: 13, change: 7 }, sourceAnchors: { start: '有13只小鸟', change: '飞走了7只' }, variantFacts: { start: 15, change: 8 }, variantText: '树上有15只小鸟，飞走了8只，树上还剩几只小鸟？', variantAnchors: { start: '有15只小鸟', change: '飞走了8只' }, entity: '只小鸟', location: '树上还剩', action: '飞走了', meaning: '问还剩多少', sourceMeaning: '还剩几只' },
  g1ll_03: { operation: 'sub', sourceFacts: { start: 15, change: 8 }, sourceAnchors: { start: '有15颗糖果', change: '送给小明8颗' }, variantFacts: { start: 14, change: 5 }, variantText: '小红有14颗糖果，送给小明5颗，小红还剩几颗糖果？', variantAnchors: { start: '有14颗糖果', change: '送给小明5颗' }, entity: '颗糖果', location: '小红还剩', action: '送给小明', meaning: '问还剩多少', sourceMeaning: '还剩几颗' },
  g1ll_04: { operation: 'sub', sourceFacts: { start: 16, change: 9 }, sourceAnchors: { start: '有16本书', change: '借出去了9本' }, variantFacts: { start: 14, change: 5 }, variantText: '图书角有14本书，借出去了5本，还剩多少本书？', variantAnchors: { start: '有14本书', change: '借出去了5本' }, entity: '本书', location: '还剩', action: '借出去', meaning: '问还剩多少', sourceMeaning: '还剩多少本' },
  g1ll_05: { operation: 'sub', sourceFacts: { start: 14, change: 6 }, sourceAnchors: { start: '有14支彩笔', change: '用掉了6支' }, variantFacts: { start: 15, change: 8 }, variantText: '盒子里有15支彩笔，小华用掉了8支，盒子里还剩几支彩笔？', variantAnchors: { start: '有15支彩笔', change: '用掉了8支' }, entity: '支彩笔', location: '盒子里还剩', action: '用掉了', meaning: '问还剩多少', sourceMeaning: '还剩几支' },
  g1ll_06: { operation: 'sub', sourceFacts: { start: 12, change: 5 }, sourceAnchors: { start: '有12个小朋友', change: '跑走了5个人' }, variantFacts: { start: 14, change: 6 }, variantText: '操场上有14个小朋友参加跑步比赛，跑走了6个人后，还剩几个人？', variantAnchors: { start: '有14个小朋友', change: '跑走了6个人' }, entity: '个人', location: '还剩', action: '跑走了', meaning: '问还剩多少', sourceMeaning: '还剩几个人' },
  g1ll_07: { operation: 'sub', sourceFacts: { start: 17, change: 9 }, sourceAnchors: { start: '有17只鸽子', change: '飞走了9只' }, variantFacts: { start: 18, change: 9 }, variantText: '公园里有18只鸽子，飞走了9只，公园里还剩几只鸽子？', variantAnchors: { start: '有18只鸽子', change: '飞走了9只' }, entity: '只鸽子', location: '公园里还剩', action: '飞走了', meaning: '问还剩多少', sourceMeaning: '还剩几只' },
  g1ll_08: { operation: 'sub', sourceFacts: { start: 18, change: 7 }, sourceAnchors: { start: '停了18辆汽车', change: '开走了7辆' }, variantFacts: { start: 18, change: 6 }, variantText: '停车场原来停了18辆汽车，又开走了6辆，停车场还剩多少辆汽车？', variantAnchors: { start: '停了18辆汽车', change: '开走了6辆' }, entity: '辆汽车', location: '停车场还剩', action: '开走了', meaning: '问还剩多少', sourceMeaning: '还剩多少辆' },
  g1ll_23: { operation: 'add', sourceFacts: { start: 20, change: 30 }, sourceAnchors: { start: '买了20个苹果', change: '又买了30个梨' }, variantFacts: { start: 30, change: 40 }, variantText: '妈妈买了30个梨，又买了40个桃子。水果一共有多少个？', variantAnchors: { start: '买了30个梨', change: '又买了40个桃子' }, entity: '个水果', location: '水果一共有', action: '买了', meaning: '问总数' },
  g1ll_24: { operation: 'sub', sourceFacts: { start: 50, change: 20 }, sourceAnchors: { start: '有50颗糖果', change: '送给小丽20颗' }, variantFacts: { start: 60, change: 20 }, variantText: '小红有60颗糖果，送给小丽20颗，小红还剩多少颗糖果？', variantAnchors: { start: '有60颗糖果', change: '送给小丽20颗' }, entity: '颗糖果', location: '小红还剩', action: '送给小丽', meaning: '问还剩多少', sourceMeaning: '还剩多少颗糖果' },
  g1ll_25: { operation: 'sub', sourceFacts: { start: 10, change: 5 }, sourceAnchors: { start: '付了10角钱', change: '铅笔5角钱' }, variantFacts: { start: 10, change: 7 }, variantText: '一支铅笔7角钱，小明付了10角钱，应找回多少钱？', variantAnchors: { start: '付了10角钱', change: '铅笔7角钱' }, entity: '角', answerType: 'text', location: '应找回', action: '付钱后减去笔价', meaning: '问还剩多少' },
  g1ll_26: { operation: 'add', sourceFacts: { start: 24, change: 5 }, sourceAnchors: { start: '有24张画片', change: '又送给他5张' }, variantFacts: { start: 23, change: 5 }, variantText: '小华原来有23张画片，同学又送给他5张，小华现在有多少张画片？', variantAnchors: { start: '有23张画片', change: '又送给他5张' }, entity: '张画片', location: '小华现在有', action: '送给他', meaning: '问总数' },
  g1ll_27: { operation: 'sub', sourceFacts: { start: 36, change: 8 }, sourceAnchors: { start: '有36本书', change: '借出去8本' }, variantFacts: { start: 42, change: 9 }, variantText: '学校图书馆有42本书，借出去9本后，图书馆还剩多少本书？', variantAnchors: { start: '有42本书', change: '借出去9本' }, entity: '本书', location: '图书馆还剩', action: '借出去', meaning: '问还剩多少', sourceMeaning: '还剩多少本书' },
  g1ll_28: { operation: 'add', sourceFacts: { start: 23, change: 30 }, sourceAnchors: { start: '有23元零花钱', change: '又给了他30元' }, variantFacts: { start: 34, change: 20 }, variantText: '小明有34元零花钱，奶奶又给了他20元，小明现在有多少元零花钱？', variantAnchors: { start: '有34元零花钱', change: '又给了他20元' }, entity: '元', location: '小明现在有', action: '给了', meaning: '问总数' },
  g1ll_29: { operation: 'add', sourceFacts: { start: 18, change: 5 }, sourceAnchors: { start: '有18朵红花', change: '又种了5朵黄花' }, variantFacts: { start: 18, change: 6 }, variantText: '公园里有18朵红花，又种了6朵黄花。公园里一共有多少朵花？', variantAnchors: { start: '有18朵红花', change: '又种了6朵黄花' }, entity: '朵花', location: '公园里一共有', action: '种了', meaning: '问总数' },
  g1ll_30: { operation: 'add', sourceFacts: { start: 8, change: 17 }, sourceAnchors: { start: '吃掉了8颗后还剩17颗', change: '吃掉了8颗后还剩17颗' }, variantFacts: { start: 7, change: 17 }, variantText: '小芳有一些糖果，吃掉了7颗后还剩17颗。小芳原来有多少颗糖果？', variantAnchors: { start: '吃掉了7颗后还剩17颗', change: '吃掉了7颗后还剩17颗' }, entity: '颗糖果', location: '小芳原来有', action: '把吃掉的加回剩下的', meaning: '问原来有多少' },
  g1ll_32: { operation: 'sub', sourceFacts: { start: 65, change: 8 }, sourceAnchors: { start: '爷爷今年65岁', change: '小明今年8岁' }, variantFacts: { start: 74, change: 9 }, variantText: '爷爷今年74岁，小明今年9岁。爷爷比小明大多少岁？', variantAnchors: { start: '爷爷今年74岁', change: '小明今年9岁' }, entity: '岁', location: '爷爷比小明大', action: '相差', meaning: '问相差多少' },
  g1ll_33: { operation: 'add', sourceFacts: { start: 24, change: 5 }, sourceAnchors: { start: '有24支', change: '又买来5支' }, variantFacts: { start: 23, change: 5 }, variantText: '一盒彩笔有23支，又买来5支。现在一共有多少支彩笔？', variantAnchors: { start: '有23支', change: '又买来5支' }, entity: '支彩笔', location: '现在一共有', action: '买来', meaning: '问总数' },
  g1ll_34: { operation: 'sub', sourceFacts: { start: 56, change: 20 }, sourceAnchors: { start: '有56棵桃树', change: '少20棵' }, variantFacts: { start: 64, change: 30 }, variantText: '果园里有64棵桃树，梨树比桃树少30棵。梨树有多少棵？', variantAnchors: { start: '有64棵桃树', change: '少30棵' }, entity: '棵', location: '梨树有', action: '比桃树少', meaning: '问较少的数量' },
  g1ll_35: { operation: 'add', sourceFacts: { start: 8, change: 12 }, sourceAnchors: { start: '小红有8颗糖果', change: '小明有12颗糖果' }, variantFacts: { start: 9, change: 13 }, variantText: '小红有9颗糖果，小明有13颗糖果。两人一共有多少颗糖果？', variantAnchors: { start: '小红有9颗糖果', change: '小明有13颗糖果' }, entity: '颗糖果', location: '两人一共有', action: '合起来', meaning: '问总数' },
  g1ll_36: { operation: 'sub', sourceFacts: { start: 15, change: 5 }, sourceAnchors: { start: '有15颗糖果', change: '送给同学5颗' }, variantFacts: { start: 17, change: 6 }, variantText: '小红有17颗糖果，送给同学6颗后，还剩多少颗？', variantAnchors: { start: '有17颗糖果', change: '送给同学6颗' }, entity: '颗糖果', location: '还剩', action: '送给同学', meaning: '问还剩多少', sourceMeaning: '还剩多少' },
  g1ll_37: { operation: 'sub', sourceFacts: { start: 13, change: 8 }, sourceAnchors: { start: '小红有13颗糖', change: '小明有8颗糖' }, variantFacts: { start: 16, change: 9 }, variantText: '小红有16颗糖，小明有9颗糖。小红比小明多几颗糖？', variantAnchors: { start: '小红有16颗糖', change: '小明有9颗糖' }, entity: '颗糖', location: '小红比小明多', action: '相差', meaning: '问相差多少' },
  g1ll_38: { operation: 'sub', sourceFacts: { start: 15, change: 4 }, sourceAnchors: { start: '小红有15颗糖', change: '小明比小红少4颗' }, variantFacts: { start: 18, change: 3 }, variantText: '小红有18颗糖，小明比小红少3颗。小明有多少颗糖？', variantAnchors: { start: '小红有18颗糖', change: '比小红少3颗' }, entity: '颗糖', location: '小明有', action: '比小红少', meaning: '求较少的数量' },
};

function result(facts: { start: number; change: number }, operation: 'add' | 'sub'): number {
  return operation === 'add' ? facts.start + facts.change : facts.start - facts.change;
}

function proof(facts: { start: number; change: number }, anchors: { start: string; change: string }, operation: 'add' | 'sub'): TransferProof {
  return {
    facts: { start: facts.start, change: facts.change }, anchors,
    result: { op: operation, args: [{ fact: 'start' }, { fact: 'change' }] },
    format: 'number',
  };
}

function relationFor(operation: 'add' | 'sub', sourceId: string): TransferRelation {
  const specific: Record<string, { family: string; target: string; roles: string[] }> = {
    g1ll_30: { family: 'recover-original-after-removal', target: 'original-count', roles: ['removed-count', 'remaining-count', 'original-count'] },
    g1ll_32: { family: 'compare-two-ages', target: 'age-difference', roles: ['older-age', 'younger-age', 'age-difference'] },
    g1ll_34: { family: 'find-smaller-from-difference', target: 'smaller-count', roles: ['larger-count', 'difference', 'smaller-count'] },
    g1ll_35: { family: 'combine-two-owners', target: 'combined-count', roles: ['first-owner-count', 'second-owner-count', 'combined-count'] },
    g1ll_37: { family: 'compare-two-owners', target: 'count-difference', roles: ['larger-count', 'smaller-count', 'count-difference'] },
    g1ll_38: { family: 'find-smaller-from-difference', target: 'smaller-count', roles: ['larger-count', 'difference', 'smaller-count'] },
    g1ll_25: { family: 'change-after-payment', target: 'change', roles: ['payment', 'price', 'change'] },
  };
  const role = specific[sourceId];
  if (role) return {
    family: role.family, targetRole: role.target, roles: role.roles,
    operations: [operation === 'add' ? 'addition' : 'subtraction'],
    units: [sourceId === 'g1ll_32' ? 'year' : sourceId === 'g1ll_25' ? 'jiao' : 'count'],
    invariants: ['保持题目所问的未知量角色', '已知条件的数量关系不变', '一次运算且进退位负担相同'],
  };
  return {
    family: operation === 'add' ? 'single-count-addition' : 'single-count-subtraction',
    targetRole: 'resulting-count',
    roles: ['initial-count', operation === 'add' ? 'added-count' : 'removed-count', 'resulting-count'],
    operations: [operation === 'add' ? 'addition' : 'subtraction'], units: ['count'],
    invariants: ['同类离散物品计数', '未知量是变化后的数量', '结果为非负整数', '一次运算', operation === 'add' ? '两个加数之和须保持同等进位负担' : '被减数与减数之差须保持同等借位负担'],
  };
}

function buildEntry(source: Question, recipe: AddSubRecipe): TransferEntry {
  const amount = result(recipe.variantFacts, recipe.operation);
  const operationSymbol = recipe.operation === 'add' ? '+' : '−';
  const sourceResult = result(recipe.sourceFacts, recipe.operation);
  const a = recipe.variantFacts.start, b = recipe.variantFacts.change;
  const specific: Record<string, { explanation: string; steps: string[]; hint: string }> = {
    g1ll_30: { explanation: `原来的糖果分成吃掉的${a}颗和剩下的${b}颗。把两部分合起来，${a}+${b}=${amount}颗。`, steps: [`吃掉${a}颗，剩下${b}颗。`, `原来有：${a}+${b}=${amount}颗。`], hint: '原来的糖果由吃掉的和剩下的两部分组成。' },
    g1ll_32: { explanation: `爷爷${a}岁，小明${b}岁。求两人年龄相差多少，用较大的年龄减去较小的年龄：${a}−${b}=${amount}岁。`, steps: [`爷爷${a}岁，小明${b}岁。`, `年龄差：${a}−${b}=${amount}岁。`], hint: '用爷爷的年龄减去小明的年龄，求年龄差。' },
    g1ll_34: { explanation: `桃树有${a}棵，梨树比桃树少${b}棵。梨树数量等于桃树数量减去相差的棵数：${a}−${b}=${amount}棵。`, steps: [`桃树${a}棵，梨树少${b}棵。`, `梨树有：${a}−${b}=${amount}棵。`], hint: '较少的数量等于较多的数量减去相差数量。' },
    g1ll_35: { explanation: `小红有${a}颗，小明有${b}颗。求两人的糖果总数，把两人各自的数量相加：${a}+${b}=${amount}颗。`, steps: [`小红${a}颗，小明${b}颗。`, `两人合计：${a}+${b}=${amount}颗。`], hint: '把两个人各自拥有的糖果合起来。' },
    g1ll_37: { explanation: `小红有${a}颗，小明有${b}颗。问小红多几颗，求的是两个数量的差：${a}−${b}=${amount}颗。`, steps: [`小红${a}颗，小明${b}颗。`, `相差：${a}−${b}=${amount}颗。`], hint: '求多多少，用较多的数量减去较少的数量。' },
    g1ll_38: { explanation: `小红有${a}颗，小明比小红少${b}颗。用小红的数量减去相差数量：${a}−${b}=${amount}颗。`, steps: [`小红${a}颗，小明少${b}颗。`, `小明有：${a}−${b}=${amount}颗。`], hint: '小明是较少的一方，用小红的数量减去少的颗数。' },
    g1ll_25: { explanation: `付款${a}角，铅笔价格${b}角。找回的钱等于付款减去价格：${a}−${b}=${amount}角。`, steps: [`付款${a}角，价格${b}角。`, `找回：${a}−${b}=${amount}角。`], hint: '付款分成商品价格和找回的钱两部分。' },
  };
  const teaching = specific[source.id];
  const entry = makeTransferEntry(source, {
    text: recipe.variantText,
    numbers: [recipe.variantFacts.start, recipe.variantFacts.change],
    answer: recipe.answerType === 'text' ? `${amount}${recipe.entity}` : amount,
    answerType: recipe.answerType || 'number',
    equation: `${recipe.variantFacts.start} ${operationSymbol} ${recipe.variantFacts.change} = ${amount}`,
    answerSentence: `${recipe.location}${amount}${recipe.entity}。`,
    explanation: teaching?.explanation ?? (recipe.operation === 'add'
      ? `原来有${recipe.variantFacts.start}${recipe.entity}，又${recipe.action}${recipe.variantFacts.change}${recipe.entity}，把两部分合起来：${recipe.variantFacts.start}+${recipe.variantFacts.change}=${amount}。`
      : `原来有${recipe.variantFacts.start}${recipe.entity}，${recipe.action}${recipe.variantFacts.change}${recipe.entity}，从原数中减去移走的数量：${recipe.variantFacts.start}−${recipe.variantFacts.change}=${amount}。`),
    solutionSteps: teaching?.steps ?? (recipe.operation === 'add'
      ? [`初始数量：${recipe.variantFacts.start}${recipe.entity}`, `增加数量：${recipe.variantFacts.change}${recipe.entity}`, `合并：${recipe.variantFacts.start}+${recipe.variantFacts.change}=${amount}`]
      : [`初始数量：${recipe.variantFacts.start}${recipe.entity}`, `移走数量：${recipe.variantFacts.change}${recipe.entity}`, `剩余：${recipe.variantFacts.start}−${recipe.variantFacts.change}=${amount}`]),
    hints: [teaching?.hint ?? (recipe.operation === 'add' ? '数量增加后，把原来有的和新增加的合起来。' : '先认清原来有多少，再减去移走的数量。')],
  }, relationFor(recipe.operation, source.id), {
    kind: 'arithmetic',
    source: proof(recipe.sourceFacts, recipe.sourceAnchors, recipe.operation),
    variant: proof(recipe.variantFacts, recipe.variantAnchors, recipe.operation),
  });
  entry.variant.questionMeaningOptions = [recipe.meaning, recipe.operation === 'add' ? '问还剩多少' : '问增加多少', '问比多少'];
  entry.variant.correctMeaning = recipe.meaning;
  entry.variant.lessonType = source.lessonType;
  entry.variant.keywordType = source.keywordType;
  entry.variant.stepCompatibility = source.stepCompatibility ? [...source.stepCompatibility] : undefined;
  entry.variant.problemType = source.problemType;
  entry.variant.sceneType = 'generic';
  entry.variant.themeTags = [];
  entry.variant.usefulPhrases = [recipe.variantAnchors.start, recipe.variantAnchors.change, recipe.meaning];
  // The source answer is only a drift assertion; both proof results are computed from explicit facts above.
  if (sourceResult !== source.answer) throw new Error(`${source.id}: source answer does not match its explicit arithmetic facts`);
  return entry;
}

export function buildLegacyGrade1Transfers(sources: readonly Question[]): TransferBatch {
  const byId = new Map(sources.filter(source => source.gradeBand === 'G1').map(source => [source.id, source]));
  const entries: TransferEntry[] = [];
  const gaps: TransferGap[] = [];
  for (const [sourceId, recipe] of Object.entries(recipes)) {
    const source = byId.get(sourceId);
    if (!source) {
      gaps.push({ sourceId, reason: 'source-missing', detail: '固定加减题合同对应的原题ID未出现在传入的legacy G1源集合。' });
      continue;
    }
    const expectedNumbers = [recipe.sourceFacts.start, recipe.sourceFacts.change].sort((a, b) => a - b);
    const actualNumbers = [...source.numbers].sort((a, b) => a - b);
    if (JSON.stringify(expectedNumbers) !== JSON.stringify(actualNumbers) || source.operation !== (recipe.operation === 'add' ? 'addition' : 'subtraction')) {
      gaps.push({ sourceId, reason: 'source-facts-drift', detail: '该手写题源算术合同的数字或加减方向与当前原题不一致，需重新核对题干后再生成。' });
      continue;
    }
    if (source.qualityStatus === 'unsafe' || source.qualityStatus === 'fail' || source.qualityStatus === 'needs_review') {
      gaps.push({ sourceId, reason: 'source-unsafe', detail: `原题质量标记为${source.qualityStatus}，不能用于已审核变式。` });
      continue;
    }
    entries.push(buildEntry(source, recipe));
  }
  const extra = buildLegacyGrade1ExtraTransfers(sources);
  return { entries: [...entries, ...extra.entries], gaps: [...gaps, ...extra.gaps] };
}
