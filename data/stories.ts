import { CaseStory } from '@/lib/storySystem';

export const allStories: CaseStory[] = [
  // ========== G1-G2 森林主题 ==========
  {
    id: 'forest_shop_theft',
    title: '森林商店失窃案',
    theme: '森林',
    gradeBand: ['G1', 'G2'],
    introText: [
      '叮铃铃——森林商店的老板松鼠大叔打来电话！',
      '"不好了！昨晚商店里的坚果被人偷走了一部分！"',
      '侦探长拍了拍你的肩膀："小侦探，跟我去现场看看！"',
      '到了森林商店，地上散落着一些坚果壳……你能找出线索吗？',
    ],
    stepNarratives: {
      find_numbers: {
        title: '清点库存数字',
        description: '数一数商店里还剩多少坚果，原来有多少',
        instruction: '先把现场的数字都找出来！原来有多少？现在有多少？',
      },
      find_action_words: {
        title: '判断发生了什么',
        description: '根据关键词判断坚果是增加了还是减少了',
        instruction: '看看题目里有没有"偷走""拿走"这样的词？它们告诉你该怎么算！',
      },
      simulation: {
        title: '还原案发现场',
        description: '观察坚果数量的变化过程',
        instruction: '看！这些坚果在动——它们是变多了还是变少了？',
      },
      remove_noise: {
        title: '排除无关线索',
        description: '松鼠大叔说了很多话，哪些是破案需要的？',
        instruction: '松鼠大叔很着急，说了很多话。擦掉和破案无关的信息！',
      },
      full_solve: {
        title: '破案！查出丢失的坚果',
        description: '综合所有线索，算出被偷了多少坚果',
        instruction: '现在所有线索都齐了！用你学到的技能，算出结果吧！',
      },
    },
    completeText: '太棒了！你成功算出了丢失的坚果数量，松鼠大叔感动得送了你一袋松果！案件告破！',
    rewardHint: '松鼠大叔送了你 3 颗星星和一颗侦探徽章！',
  },
  {
    id: 'pond_duckling_mystery',
    title: '池塘小鸭失踪事件',
    theme: '森林',
    gradeBand: ['G1', 'G2'],
    introText: [
      '鸭妈妈急急忙忙地跑进侦探社："我的小鸭子们不见了！"',
      '"早上我带它们去池塘游泳，可现在数量不对了！"',
      '侦探长戴上帽子："别急，鸭妈妈。我们去池塘边看看。"',
      '池塘边有几片羽毛，水面上还有涟漪……小侦探，该你出手了！',
    ],
    stepNarratives: {
      find_numbers: {
        title: '数清鸭子数量',
        description: '找出早上和现在鸭子数量的线索',
        instruction: '先找出题目里所有的数字！早上几只？现在几只？',
      },
      find_action_words: {
        title: '判断鸭子去向',
        description: '找到关键词判断是游走了还是游来了',
        instruction: '"游走"和"游来"的意思一样吗？找到那个关键词！',
      },
      simulation: {
        title: '观察池塘变化',
        description: '看着鸭子在水面上游来游去',
        instruction: '看池塘里的鸭子在变化，你能判断出发生了什么吗？',
      },
      remove_noise: {
        title: '忽略天气信息',
        description: '鸭妈妈说了天气情况，这些和数学有关吗？',
        instruction: '鸭妈妈提到今天天气很好——这和算鸭子数量有关系吗？擦掉无关的！',
      },
      full_solve: {
        title: '完整破解鸭子失踪案',
        description: '一步步找出答案',
        instruction: '所有线索都掌握了！现在完整地破解这个案件吧！',
      },
    },
    completeText: '找到了！你算出了正确的鸭子数量，鸭妈妈开心地带着小鸭子们回家了。你又破了一个案子！',
    rewardHint: '鸭妈妈送了你一枚闪亮的羽毛徽章！',
  },
  {
    id: 'bunny_carrot_garden',
    title: '兔子庄园胡萝卜疑案',
    theme: '森林',
    gradeBand: ['G1', 'G2'],
    introText: [
      '兔子庄园的管理员兔奶奶发来求助！',
      '"我种了一片胡萝卜，今天去数的时候发现数量不对！"',
      '"不知道是小兔子们偷吃了，还是隔壁的田鼠偷走了……"',
      '侦探长推了推眼镜："有意思，我们去兔子庄园调查一下。"',
    ],
    stepNarratives: {
      find_numbers: {
        title: '点数胡萝卜',
        description: '找出胡萝卜原来和现在的数量',
        instruction: '找出题目里关于胡萝卜数量的所有数字！',
      },
      find_action_words: {
        title: '判断谁吃了胡萝卜',
        description: '通过关键词判断增减',
        instruction: '"拔走""吃掉"这些词告诉你什么？是增加了还是减少了？',
      },
      simulation: {
        title: '还原胡萝卜地',
        description: '看看胡萝卜怎么变少的',
        instruction: '看地里的胡萝卜一根一根在减少……这是用了什么运算？',
      },
      remove_noise: {
        title: '排除兔奶奶的闲聊',
        description: '兔奶奶说了很多胡萝卜的品种，这些和算数有关吗？',
        instruction: '兔奶奶说到胡萝卜的品种和颜色……擦掉这些干扰信息！',
      },
      full_solve: {
        title: '破解胡萝卜失踪案',
        description: '综合全部线索，算出结果',
        instruction: '真相只有一个！用你的侦探技能找到答案吧！',
      },
    },
    completeText: '破案了！你精确算出了被吃掉的胡萝卜数量。兔奶奶送了你一篮新鲜的胡萝卜（胡萝卜蛋糕也不错！）',
    rewardHint: '兔奶奶的感谢礼：3 颗星星和一块侦探勋章！',
  },

  // ========== G1-G2 海洋主题 ==========
  {
    id: 'ocean_shell_treasure',
    title: '海底贝壳宝藏',
    theme: '海洋',
    gradeBand: ['G1', 'G2'],
    introText: [
      '小美人鱼泡泡游进侦探社："我发现了好多漂亮的贝壳！"',
      '"可是潮水来的时候冲走了一些……我不知道原来有多少个。"',
      '侦探长拿起放大镜："海底的案件最有意思了！走，去珊瑚礁看看。"',
      '珊瑚礁旁边散落着闪闪发光的贝壳……小侦探，仔细找线索！',
    ],
    stepNarratives: {
      find_numbers: {
        title: '清点贝壳数量',
        description: '找出贝壳的数量变化',
        instruction: '数一数题目里提到了几个数字？它们分别代表什么？',
      },
      find_action_words: {
        title: '潮水是帮手还是捣蛋鬼',
        description: '通过关键词判断贝壳被冲走还是冲来',
        instruction: '"冲走"是什么意思？它告诉你该用加法还是减法？',
      },
      simulation: {
        title: '看潮水冲贝壳',
        description: '观察贝壳被海水冲动的动画',
        instruction: '看海浪把贝壳冲走了！你能算出还剩多少吗？',
      },
      remove_noise: {
        title: '贝壳的颜色不重要',
        description: '美人鱼说了贝壳的颜色，和数学有关吗？',
        instruction: '贝壳是粉色、紫色还是白色——这和算数量有关系吗？擦掉无关信息！',
      },
      full_solve: {
        title: '完整破解贝壳谜题',
        description: '综合所有线索',
        instruction: '线索收集完毕！像真正的侦探一样，一步步破案吧！',
      },
    },
    completeText: '完美！你算出了正确的贝壳数量，美人鱼泡泡开心地送你一颗最漂亮的珍珠！',
    rewardHint: '奖励：一颗美人鱼珍珠和 3 颗星星！',
  },
  {
    id: 'crab_sandcastle',
    title: '螃蟹先生的沙堡谜案',
    theme: '海洋',
    gradeBand: ['G1', 'G2'],
    introText: [
      '海滩上，螃蟹先生气呼呼地挥舞着大钳子！',
      '"我堆的沙堡被人动过了！有的被踩塌了，有的被加高了！"',
      '侦探长蹲下来仔细观察沙堡的痕迹："嗯，这里留下了小脚印……"',
      '你也蹲下来，用手电筒照了照沙堡的每个角落。开始调查吧！',
    ],
    stepNarratives: {
      find_numbers: {
        title: '统计沙堡数量',
        description: '找出原来和现在的沙堡数字',
        instruction: '找出所有数字！原来的沙堡数量和新增加/减少的数量都要找出来！',
      },
      find_action_words: {
        title: '判断沙堡变化',
        description: '关键词告诉你沙堡变多了还是变少了',
        instruction: '"踩塌"和"堆了"——一个表示减少，一个表示增加！',
      },
      simulation: {
        title: '观察沙堡变化',
        description: '看沙堡被踩塌又被堆起来',
        instruction: '看沙堡在变化！有些被踩塌了，有些被堆高了。算算现在有几个？',
      },
      remove_noise: {
        title: '螃蟹的钳子大小不是线索',
        description: '螃蟹先生说了他的钳子尺寸，这有关吗？',
        instruction: '螃蟹先生炫耀他的大钳子——这和沙堡数量有关吗？擦掉它！',
      },
      full_solve: {
        title: '沙堡谜案大结局',
        description: '用所有线索解开谜题',
        instruction: '最后的考验！把学到的技能都用上，破解沙堡谜案！',
      },
    },
    completeText: '沙堡谜案成功告破！螃蟹先生开心地堆了一个新沙堡送给你（还刻了你的名字！）',
    rewardHint: '螃蟹先生的谢礼：2 颗星星和一枚沙滩纪念章！',
  },

  // ========== G1-G2 校园主题 ==========
  {
    id: 'school_canteen_mystery',
    title: '食堂点心失踪案',
    theme: '校园',
    gradeBand: ['G1', 'G2'],
    introText: [
      '午餐时间，食堂阿姨慌张地打来电话！',
      '"今天做的蛋挞数量和端出去的不一样！有谁多拿了？"',
      '侦探长闻了闻空气中的蛋挞香味："嗯……这个案子很香啊！"',
      '你跟着侦探长走进食堂，开始调查点心失踪事件……',
    ],
    stepNarratives: {
      find_numbers: {
        title: '点数蛋挞',
        description: '找出蛋挞的总数和被拿走的数量',
        instruction: '厨房做了多少蛋挞？端出去多少？把这些数字找出来！',
      },
      find_action_words: {
        title: '分析蛋挞去向',
        description: '关键词告诉你蛋挞的去向',
        instruction: '"拿走""分给"这些词是增加还是减少？仔细想想！',
      },
      simulation: {
        title: '看蛋挞一个个消失',
        description: '托盘上的蛋挞一个个被取走',
        instruction: '托盘上的蛋挞越来越少了……这是减法！算算还剩几个？',
      },
      remove_noise: {
        title: '蛋挞的口味是干扰信息',
        description: '食堂阿姨介绍了蛋挞口味，这对计算有帮助吗？',
        instruction: '蛋挞有原味、抹茶味、巧克力味——这些和算数量有关系吗？',
      },
      full_solve: {
        title: '点心失踪案终结',
        description: '综合破解，找出答案',
        instruction: '所有线索都在你手中了！像名侦探一样破解这个案子！',
      },
    },
    completeText: '破案成功！你找出了蛋挞数量不对的原因——原来是二班多领了一盘！食堂阿姨请你吃了一个热乎乎的蛋挞！',
    rewardHint: '香甜的奖励：2 颗星星和一张蛋挞优惠券（虚拟）！',
  },
  {
    id: 'playground_ball_mystery',
    title: '操场上的球去哪了',
    theme: '校园',
    gradeBand: ['G1', 'G2'],
    introText: [
      '体育课结束后，体育老师数了数球筐："咦？篮球数量不对啊！"',
      '"上课前我拿了几个出来，下课后有几个没还回来……"',
      '侦探长吹响了口哨："运动器材失踪案！这可是常见的校园案件。"',
      '你拿起了记录本，准备去操场调查……',
    ],
    stepNarratives: {
      find_numbers: {
        title: '统计球的数量',
        description: '找出球筐里原来的球和借出的球',
        instruction: '题目里有两个关键数字，把它们找出来！',
      },
      find_action_words: {
        title: '借走还是还回来',
        description: '分析动作词判断增减',
        instruction: '"借走"和"还回来"——一个减少一个增加，你分得清吗？',
      },
      simulation: {
        title: '看着球筐的变化',
        description: '球从筐里被取出又放回',
        instruction: '球筐里的球在减少……又有球被还回来。最终筐里有多少？',
      },
      remove_noise: {
        title: '球的品牌是干扰',
        description: '老师说了球的品牌，这和数量有关吗？',
        instruction: '这个篮球是什么牌子的——对算数量有帮助吗？擦掉它！',
      },
      full_solve: {
        title: '彻底查清球的下落',
        description: '一步步完整破案',
        instruction: '是时候展现真正的侦探水平了！从头到尾破解这个案子！',
      },
    },
    completeText: '案件解决！所有篮球都找到了——原来是小明多借了两个忘了登记。体育老师表扬了你的细心！',
    rewardHint: '体育老师的谢礼：2 颗星星和一枚运动徽章！',
  },

  // ========== G1-G2 零食/玩具主题 ==========
  {
    id: 'candy_shop_inventory',
    title: '糖果店库存谜案',
    theme: '零食',
    gradeBand: ['G1', 'G2'],
    introText: [
      '糖果店的老板熊猫阿姨打来电话！',
      '"今天上午卖了一些糖果，下午又进了一批，我搞不清楚现在有多少了！"',
      '侦探长舔了舔嘴角："糖果店……这是个甜蜜的案子，小侦探！"',
      '推开糖果店的门，五颜六色的糖果罐子在阳光下闪闪发光……',
    ],
    stepNarratives: {
      find_numbers: {
        title: '清点糖果库存',
        description: '找出早上的糖果数、卖出的和进货的数字',
        instruction: '这个案子有三个数字！仔细找，一个都不能漏掉！',
      },
      find_action_words: {
        title: '卖出 vs 进货',
        description: '卖出减少，进货增加，两步都要算',
        instruction: '"卖出"和"进货"——一个是减法一个是加法，你看出来了吗？',
      },
      simulation: {
        title: '糖果罐的变化',
        description: '看罐子里的糖果先减少又增加',
        instruction: '糖果罐里的糖先变少又变多，动动脑筋算出最终数量！',
      },
      remove_noise: {
        title: '糖果的口味描述是废话',
        description: '熊猫阿姨描述了每种糖的味道，算库存需要这些吗？',
        instruction: '草莓味的很甜、薄荷味的很清凉——这些对算库存数量有用吗？',
      },
      full_solve: {
        title: '糖果店库存大揭秘',
        description: '综合所有信息，算出正确库存',
        instruction: '最后一步！把找到的数字和关键词组合起来，算出正确答案！',
      },
    },
    completeText: '库存清楚了！你帮熊猫阿姨算出了精确的糖果数量。熊猫阿姨开心地送了你一颗最大的棒棒糖！',
    rewardHint: '甜蜜奖励：3 颗星星和一枚糖果侦探徽章！',
  },
  {
    id: 'toy_store_puzzle',
    title: '玩具店整理大作战',
    theme: '玩具',
    gradeBand: ['G1', 'G2'],
    introText: [
      '玩具店的河马老板正在发愁！',
      '"昨天进了新玩具，今天又卖掉了一些，还有几个被小朋友玩坏了退回来了……"',
      '"我这个账本乱七八糟的，侦探先生帮帮我吧！"',
      '侦探长翻开了皱巴巴的账本："交给我们的小侦探，他最擅长理清数字了！"',
    ],
    stepNarratives: {
      find_numbers: {
        title: '找出账本中的数字',
        description: '在混乱的账本中找到所有数字',
        instruction: '账本上有好几个数字！进货数、卖出数、退货数……都找出来！',
      },
      find_action_words: {
        title: '进货、卖出、退货',
        description: '分析不同动作对应的运算',
        instruction: '三个动作词：进货（加）、卖出（减）、退货（加）——分清楚了吗？',
      },
      simulation: {
        title: '看玩具架的变化',
        description: '玩具架上的玩具来来去去',
        instruction: '看玩具架上的玩偶在变化——进货多了，卖出的少了……',
      },
      remove_noise: {
        title: '玩具的颜色和大小',
        description: '河马老板记了太多无关细节',
        instruction: '玩具的颜色、大小、材质——这些账本备注和计算有关吗？擦掉！',
      },
      full_solve: {
        title: '整理出最终库存',
        description: '完整地算出玩具店现有库存',
        instruction: '一切都清楚了！用你收集的所有线索，算出最终答案！',
      },
    },
    completeText: '账本理清了！河马老板感激地送了你一个侦探玩偶（戴着侦探帽的小熊！）。玩具店又恢复了秩序！',
    rewardHint: '河马老板的赠礼：3 颗星星和一只迷你侦探熊玩偶！',
  },

  // ========== G1-G2 其他场景 ==========
  {
    id: 'birthday_party_math',
    title: '生日派对数学谜',
    theme: '派对',
    gradeBand: ['G1', 'G2'],
    introText: [
      '小象朵朵的生日派对正在进行中！',
      '"我邀请了朋友，有的来了有的没来……蛋糕分了几块出去……"',
      '"派对结束后我完全搞不清还剩下多少东西了！"',
      '侦探长戴上派对帽："生日案件总是充满惊喜。小侦探，戴上你的派对帽！"',
    ],
    stepNarratives: {
      find_numbers: {
        title: '派对数字搜查',
        description: '找出邀请人数、到场人数、蛋糕数量等',
        instruction: '派对上有好多数字！邀请了多少朋友？到了几个？蛋糕切了几块？',
      },
      find_action_words: {
        title: '来了还是没来',
        description: '判断到场和缺席的数学含义',
        instruction: '"来了"和"没来"——来了是加法，没来要减掉。你明白了吗？',
      },
      simulation: {
        title: '蛋糕被一块块分走',
        description: '看着蛋糕逐渐减少',
        instruction: '蛋糕被朋友们一块一块拿走……这是最直观的减法！',
      },
      remove_noise: {
        title: '派对装饰不是线索',
        description: '气球的颜色和彩带的长度与计算无关',
        instruction: '小象说了气球颜色和彩带长度——擦掉这些派对装饰的细节！',
      },
      full_solve: {
        title: '派对数学案终结',
        description: '综合破解，圆满结案',
        instruction: '派对快结束了，用你所学的技能，完成最后的计算！',
      },
    },
    completeText: '派对数学案破解！你帮小象算清楚了所有数字。小象送了你一块最大的生日蛋糕！',
    rewardHint: '派对礼物：2 颗星星和一块虚拟生日蛋糕！',
  },
  {
    id: 'pet_shop_adventure',
    title: '宠物店大冒险',
    theme: '宠物',
    gradeBand: ['G1', 'G2'],
    introText: [
      '宠物店的猫咪店员打翻了账本！',
      '"喵——今天有小动物被领养走了，也有新的小动物来了……"',
      '"我现在数不清楚店里到底有多少小动物了，喵……"',
      '侦探长摸了摸猫咪的头："别急，我们侦探社最擅长理清这种乱账！"',
    ],
    stepNarratives: {
      find_numbers: {
        title: '数数小动物',
        description: '找出宠物店里各种动物的数量',
        instruction: '店里有小狗、小猫、小兔子……找出所有数字！',
      },
      find_action_words: {
        title: '领养 vs 新来',
        description: '被领养是减少，新来是增加',
        instruction: '"领养走了"是减少，"新来了"是增加。分清楚了吗？',
      },
      simulation: {
        title: '看小动物来来去去',
        description: '笼子里的小动物数量在变化',
        instruction: '看！小狗被领养走了，又来了一窝小兔子……数量怎么变？',
      },
      remove_noise: {
        title: '小动物的名字不重要',
        description: '每只宠物的名字和计算无关',
        instruction: '小狗叫旺财、小猫叫咪咪——这些名字和算数量有关系吗？',
      },
      full_solve: {
        title: '宠物店数量终极挑战',
        description: '完整破解宠物店数量谜',
        instruction: '猫咪店员的麻烦就靠你了！运用所有侦探技能，解开谜题！',
      },
    },
    completeText: '账本理清了！猫咪店员开心地蹭了蹭你的腿。宠物店的每一只小动物都归位了！',
    rewardHint: '可爱奖励：3 颗星星和一枚小爪印徽章！',
  },
  {
    id: 'supermarket_price_puzzle',
    title: '超市购物价格谜案',
    theme: '购物',
    gradeBand: ['G1', 'G2'],
    introText: [
      '小熊妈妈带着小熊去超市购物！',
      '"我买了水果和零食，还用了优惠券……最后花了多少钱我有点糊涂了。"',
      '"小侦探，你能帮我算一算吗？"',
      '侦探长拿出了计算器："购物的数学在生活中最重要了！开始调查！"',
    ],
    stepNarratives: {
      find_numbers: {
        title: '找出价格标签',
        description: '从购物清单中找到所有价格数字',
        instruction: '苹果的价格、饼干的价格、优惠券的金额……所有数字都找出来！',
      },
      find_action_words: {
        title: '买了 vs 优惠',
        description: '买东西是加法，优惠券是减法',
        instruction: '"买了"是花钱（加），"优惠"是省钱（减）。你看懂了吗？',
      },
      simulation: {
        title: '购物车的变化',
        description: '看购物金额增加又减少',
        instruction: '购物车的总价先增加（买东西）再减少（优惠券），最终是多少？',
      },
      remove_noise: {
        title: '超市的装修描述',
        description: '小熊妈妈说超市很漂亮，这和算账有关吗？',
        instruction: '超市的灯光很亮、货架很整齐——这些和算钱有关系吗？擦掉！',
      },
      full_solve: {
        title: '算出最终付款金额',
        description: '综合所有价格信息',
        instruction: '最后的挑战！帮小熊妈妈算出到底花了多少钱！',
      },
    },
    completeText: '账算清了！小熊妈妈开心地多买了一包饼干送给你。生活中的数学果然最重要！',
    rewardHint: '购物奖励：2 颗星星和一张虚拟超市优惠券！',
  },
];
