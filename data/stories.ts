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

  // ========== G3-G4 侦探主题 ==========
  {
    id: 'science_lab_data',
    title: '科学实验室数据疑案',
    theme: '科学',
    gradeBand: ['G3', 'G4'],
    introText: [
      '叮——科学实验室的警报器响了！',
      '"实验数据被人改动了！温度记录和长度测量全乱了！"',
      '教授急得团团转："下周就要发表论文了，数据必须精准！"',
      '侦探长戴上护目镜："科学实验最讲究精确。小侦探，仔细核对每一个数字！"',
    ],
    stepNarratives: {
      find_numbers: {
        title: '提取实验数据',
        description: '从实验记录中找出所有关键数值',
        instruction: '实验记录里有温度、长度、重量……把所有数字都圈出来！',
      },
      find_action_words: {
        title: '分析数据变化',
        description: '判断数据是升高还是降低、增加还是减少',
        instruction: '"升温"和"降温"、"增加"和"减少"——它们对应什么运算？',
      },
      simulation: {
        title: '还原实验过程',
        description: '模拟实验数据的增减变化',
        instruction: '温度计的水银柱在变化……长度在伸缩……观察这些变化！',
      },
      remove_noise: {
        title: '排除干扰记录',
        description: '实验记录里夹杂了无关的备注',
        instruction: '教授在记录旁写了实验日期和心情——这些对计算有用吗？擦掉它们！',
      },
      full_solve: {
        title: '还原真实数据',
        description: '综合所有线索，纠正被篡改的数据',
        instruction: '真相即将揭晓！用你的数学能力还原正确的实验数据！',
      },
    },
    completeText: '数据修复完成！教授激动地握住你的手："你救了我的论文！"实验室恢复了秩序。',
    rewardHint: '科学家的感谢：3 颗星星和一枚实验徽章！',
  },
  {
    id: 'charity_sale_ledger',
    title: '校园义卖账目谜案',
    theme: '校园',
    gradeBand: ['G3', 'G4'],
    introText: [
      '校园义卖会圆满结束，但会计部长急坏了！',
      '"各班交上来的账目对不上！有的班级收入多了，有的少了……"',
      '"总收入应该是多少？到底有没有钱不见了？"',
      '侦探长翻开了厚厚的账本："别急，数字不会说谎——只是需要正确的眼睛来看。"',
    ],
    stepNarratives: {
      find_numbers: {
        title: '核对账目数字',
        description: '从各班账本中找出收入和支出',
        instruction: '每班的收入、支出、成本——这些数字都在账本里，全找出来！',
      },
      find_action_words: {
        title: '收入还是支出',
        description: '判断每笔交易的数学含义',
        instruction: '"卖出"是收入，"进货"是支出。别搞混了！',
      },
      simulation: {
        title: '追踪资金流向',
        description: '看着钱箱里的钱进进出出',
        instruction: '钱箱里的钱一会儿多一会儿少……最后到底有多少？',
      },
      remove_noise: {
        title: '剔除无关备注',
        description: '账目旁边画了小图案和感叹号，不影响计算',
        instruction: '有同学在账目旁画了笑脸和感叹号——这些和算账有关系吗？擦掉！',
      },
      full_solve: {
        title: '算出最终账目',
        description: '综合全年级数据，算出正确总额',
        instruction: '所有线索都在你手里了！把正确的账目算出来！',
      },
    },
    completeText: '账目全部对上了！校长在晨会上表扬了你的数学侦探能力。义卖善款顺利捐给了慈善机构！',
    rewardHint: '校长奖励：3 颗星星和一张荣誉证书！',
  },
  {
    id: 'library_overdue_research',
    title: '图书馆借阅谜踪',
    theme: '校园',
    gradeBand: ['G3', 'G4'],
    introText: [
      '学校图书馆的管理员在清点图书时发现了问题！',
      '"本月借出的书和归还的书数量对不上……有几本失踪了？"',
      '"还有几位同学说书被续借了，但我记不清几次了……"',
      '侦探长拿起借阅记录卡："图书馆是最安静的案发现场。小侦探，打开记录本！"',
    ],
    stepNarratives: {
      find_numbers: {
        title: '统计借阅数据',
        description: '找出借出数、归还数、续借次数',
        instruction: '借阅记录上的日期、册数、续借次数——把数字都找出来！',
      },
      find_action_words: {
        title: '借出 vs 归还 vs 续借',
        description: '分析三种操作对应的数学运算',
        instruction: '"借出"减少库存，"归还"增加库存，"续借"不变。搞清楚了吗？',
      },
      simulation: {
        title: '追踪书架变化',
        description: '看书架上的书来来去去',
        instruction: '书被一本本借走，又一本本归还……最终书架上还剩几本？',
      },
      remove_noise: {
        title: '书的类型是干扰',
        description: '书的类别和封面颜色不影响计算',
        instruction: '这本书是小说还是科普？精装还是平装？——这和计数有关吗？',
      },
      full_solve: {
        title: '查清所有书籍下落',
        description: '综合线索，查明失踪的书籍',
        instruction: '最后一步！用你收集的所有数据，找出是哪本书不见了！',
      },
    },
    completeText: '书找到了！原来是被一位小书虫放在书包里忘记登记了。管理员笑着说："还好有你这位小侦探！"',
    rewardHint: '知识奖励：3 颗星星和一枚阅读徽章！',
  },
  {
    id: 'sports_day_scoring',
    title: '运动会计分迷局',
    theme: '运动',
    gradeBand: ['G3', 'G4'],
    introText: [
      '学校运动会正进行得热火朝天！',
      '"裁判长！接力赛的成绩好像算错了！总分和我们班算的不一样！"',
      '"还有跳远比赛——有人的成绩被记错了……"',
      '侦探长吹响口哨："体育比赛的数学最考验细心。小侦探，去记分板那里！"',
    ],
    stepNarratives: {
      find_numbers: {
        title: '收集比赛数据',
        description: '从记分板上找出所有比赛成绩',
        instruction: '接力赛时间、跳远距离、投掷远度——所有数字都不能漏！',
      },
      find_action_words: {
        title: '分析成绩变化',
        description: '判断成绩是提高还是下降',
        instruction: '"快了""远了""多了"是增加，"慢了""近了""少了"是减少！',
      },
      simulation: {
        title: '模拟比赛过程',
        description: '观察成绩如何一步步累加',
        instruction: '看！接力赛一棒一棒在累积时间……总分是怎么算出来的？',
      },
      remove_noise: {
        title: '加油口号不是数据',
        description: '观众席的呐喊和计算无关',
        instruction: '加油声、欢呼声、班级口号——这些能帮你算分吗？不能！擦掉！',
      },
      full_solve: {
        title: '还原真实成绩',
        description: '纠正错误，算出正确排名',
        instruction: '所有线索都齐了！帮裁判长算出正确的成绩和名次！',
      },
    },
    completeText: '成绩更正了！原来是一班的成绩被错记到了二班。裁判长竖起大拇指："小侦探，干得漂亮！"',
    rewardHint: '运动奖励：3 颗星星和一枚金牌徽章！',
  },

  // ========== G5-G6 进阶主题 ==========
  {
    id: 'observatory_data_cloud',
    title: '天文台数据疑云',
    theme: '科学',
    gradeBand: ['G5', 'G6'],
    introText: [
      '深夜，天文台的值班员打来紧急电话！',
      '"昨晚观测到的行星位置数据和预报差了0.03度！这不正常！"',
      '"还有小行星的轨道计算……比例好像被人动过……"',
      '侦探长望着星空："天文学是数学最浪漫的应用。小侦探，我们上天文台！"',
    ],
    stepNarratives: {
      find_numbers: {
        title: '提取天文数据',
        description: '从观测记录中提取轨道参数和测量值',
        instruction: '角度、距离、周期——这些都是带小数的精密数据，仔细记录！',
      },
      find_action_words: {
        title: '分析轨道变化',
        description: '判断天体是靠近还是远离',
        instruction: '"靠近"和"远离"、"缩小"和"扩大"——对应的运算是什么？',
      },
      simulation: {
        title: '模拟天体运行',
        description: '观察行星在轨道上的运动',
        instruction: '看！行星在轨道上运行，距离在变化……用数学追踪它的轨迹！',
      },
      remove_noise: {
        title: '天气描述不是数据',
        description: '观测记录里的天气描述是干扰',
        instruction: '"今晚多云""月光很亮"——这些描述和计算轨道有关吗？擦掉！',
      },
      full_solve: {
        title: '纠正被篡改的数据',
        description: '综合所有线索，恢复正确的轨道计算',
        instruction: '宇宙的真相就在数字之中！用你的数学能力解开这个星际谜案！',
      },
    },
    completeText: '数据修正了！原来是一位实习研究员在计算时输入错误。真正的轨道数据和预测完全吻合！星空恢复了宁静。',
    rewardHint: '星际奖励：4 颗星星和一枚天文徽章！',
  },
  {
    id: 'city_planning_ratio',
    title: '城市规划比例谜案',
    theme: '工程',
    gradeBand: ['G5', 'G6'],
    introText: [
      '市政府规划局打来电话——新城区的地图比例出了问题！',
      '"按1:500的比例，公园的面积应该是……等等，怎么和实际差了这么多？"',
      '"还有桥梁的长度，按比例放大后完全不对！"',
      '侦探长展开蓝图："比例和缩放是数学的魔法。小侦探，拿起比例尺！"',
    ],
    stepNarratives: {
      find_numbers: {
        title: '提取规划参数',
        description: '从蓝图中找出所有尺寸和比例',
        instruction: '比例尺、实际长度、图上长度——三组数字都要找出来！',
      },
      find_action_words: {
        title: '放大还是缩小',
        description: '判断图纸与实际的缩放关系',
        instruction: '"放大"是乘法，"缩小"是除法。比例尺告诉你怎么换算！',
      },
      simulation: {
        title: '模拟缩放过程',
        description: '看建筑按比例放大缩小',
        instruction: '看！图上的线条在按比例缩放……实际尺寸应该是多少？',
      },
      remove_noise: {
        title: '图纸装饰是干扰',
        description: '蓝图上的装饰线框不与计算相关',
        instruction: '蓝图边框的花纹、标题的艺术字——这些和尺寸计算有关吗？',
      },
      full_solve: {
        title: '还原正确尺寸',
        description: '用比例知识纠正所有错误标注',
        instruction: '最后的挑战！用比例和缩放的知识，把正确的尺寸算出来！',
      },
    },
    completeText: '规划图修正了！公园和桥梁的尺寸全部准确。规划局长说："这个项目能按时开工，多亏了你！"',
    rewardHint: '工程奖励：4 颗星星和一枚蓝图徽章！',
  },
  {
    id: 'bank_interest_case',
    title: '银行利率计算案',
    theme: '金融',
    gradeBand: ['G5', 'G6'],
    introText: [
      '本市银行打来电话——有人篡改了定期存款的利息计算！',
      '"一位客户存了三年定期，本金、利率都有记录，但利息算出来对不上！"',
      '"是不是有人动了我们的计算公式？"',
      '侦探长拿出金融计算器："百分数和利息——这是成年人都经常算错的数学。小心核对！"',
    ],
    stepNarratives: {
      find_numbers: {
        title: '提取金融数据',
        description: '找出本金、利率、存款年限',
        instruction: '本金是多少？年利率是百分之几？存了几年？把数字都找出来！',
      },
      find_action_words: {
        title: '增值还是扣税',
        description: '判断利息是增加还是扣减',
        instruction: '"利息"让钱变多，"手续费"让钱变少。分清楚每一笔！',
      },
      simulation: {
        title: '追踪账户变化',
        description: '看存款账户余额随时间增长',
        instruction: '看！每年本金都在增加利息……复利的力量！一步步算出最终余额。',
      },
      remove_noise: {
        title: '银行广告不是数据',
        description: '存款单上的广告语不影响计算',
        instruction: '"选择我们银行最划算"——这是广告，不是数据！擦掉它！',
      },
      full_solve: {
        title: '算出正确利息',
        description: '综合所有数据，纠正被篡改的计算',
        instruction: '真相只有一个！用百分数和乘法，算出客户应该得到多少利息！',
      },
    },
    completeText: '计算修正了！原来是实习柜员把年利率当成了月利率。客户拿到了正确的利息，满意地笑了！',
    rewardHint: '金融奖励：4 颗星星和一枚金算盘徽章！',
  },
  {
    id: 'map_scale_mystery',
    title: '藏宝图比例之谜',
    theme: '探险',
    gradeBand: ['G5', 'G6'],
    introText: [
      '一张古老的藏宝图被送到了侦探社！',
      '"这张图标注了从码头到藏宝点的方向和距离，但比例尺被撕掉了……"',
      '"图上写着1厘米代表……后面的数字被墨水盖住了！"',
      '侦探长拿起放大镜："用已知的距离倒推比例尺——这是数学侦探的看家本领！"',
    ],
    stepNarratives: {
      find_numbers: {
        title: '提取地图数据',
        description: '找出图上距离和已知的实际距离',
        instruction: '图上的厘米数、实际行走的公里数——这些数字藏着比例的秘密！',
      },
      find_action_words: {
        title: '换算图上与实际',
        description: '判断是放大还是缩小的关系',
        instruction: '从厘米到公里需要什么运算？乘以还是除以？找出规律！',
      },
      simulation: {
        title: '沿着地图探索',
        description: '在藏宝图上模拟前进路线',
        instruction: '沿着虚线从码头出发……走了图上3厘米，实际是多少公里？',
      },
      remove_noise: {
        title: '藏宝图的装饰是干扰',
        description: '图上画的怪物和船只是装饰',
        instruction: '图上的海怪、帆船、罗盘花纹——这些和计算距离有关吗？擦掉！',
      },
      full_solve: {
        title: '找到宝藏位置',
        description: '用比例恢复完整地图，定位宝藏',
        instruction: '比例尺的秘密就在数字里！解开它，宝藏的位置就清楚了！',
      },
    },
    completeText: '比例尺还原了！原来1厘米代表1.5公里。按照正确比例，宝藏就在老灯塔下！虽然只是一个装满旧硬币的铁盒子，但探险的乐趣无价！',
    rewardHint: '探险奖励：4 颗星星和一枚藏宝图徽章！',
  },
];
