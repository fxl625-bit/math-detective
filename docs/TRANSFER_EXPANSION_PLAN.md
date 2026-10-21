# G1–G6 同构变式扩展实施合同

日期：2026-10-21。规划角色：Astra；独立审核：SOL；具体实现：LUNA。基线 HEAD：`b58038cf854ec36829ccbfe3c041814817f3e2fc`（v2.14.0）。本文是开发与验收合同，不是已实现或已发布报告。

目标：逐道处理全部 625 道 G1–G6 原题，尽量为每道题提供数学关系、目标未知量、难度和作答方式一致的安全变式。不能实现的逐题说明原因；不靠放宽 signature、改答案文案、虚构数字或缩小分母达到“100%”。用户已经授权实现、测试、Git 和 Vercel，内部审核门槛不另向用户逐卡请示。

## 1. 已核对基线与根因

以运行时导入 `data/questions/index.ts` 得到的 `allQuestions` 为准，不用正则数源码对象。这个集合合并 legacy、225 道 progression、G1 annotation，随后修补少量 legacy answerSchema。总数 655，其中 G1–G6 为 625，独立 `OlympiadIntro` 为 30。`isExtendedThinking` 的 G1–G6 题仍计入各自年级，不重复计入独立 OlympiadIntro 分母。

| 年级 | 原题数 | 当前严格匹配 | 未匹配 |
| --- | ---: | ---: | ---: |
| G1 | 147 | 8 | 139 |
| G2 | 91 | 4 | 87 |
| G3 | 107 | 2 | 105 |
| G4 | 105 | 2 | 103 |
| G5 | 106 | 2 | 104 |
| G6 | 69 | 2 | 67 |
| 合计 | 625 | 20 | 605 |

原题来源：legacy 400 / progression 225。625 道中只有 88 道有 reasoningFrame，368 道有 curriculumSkillIds 或 skillIds。不能把“无 RF”直接解释为数学上不能生成；但也不能只复制一个同构标签就称为验证。

| domain | 数量 | domain | 数量 | domain | 数量 |
| --- | ---: | --- | ---: | --- | ---: |
| addition_subtraction | 85 | comparison | 32 | money | 15 |
| geometry | 75 | pattern | 33 | multiplication_division | 99 |
| measurement | 37 | logic_reasoning | 122 | word_problem_reading | 13 |
| time | 11 | fractions | 31 | decimals | 28 |
| equation_thinking | 10 | ratio | 21 | percent | 13 |

运算标签：addition 104、subtraction 102、comparison 23、mixed 187、logic 50、multiplication 79、division 52、geometry 22、fraction 5、ratio 1。它们只是路由线索，不能作为数学模型；例如旧题中换算、周期题也可能标为 addition。

答案 UI 类型：integer 443、decimal 28、multi_field 50、text 62、fraction 12、percent 5、choice 5、ordering 4、comparison_symbol 3、money 3、ratio 1、not_enough_information 9。数字型答案不等于单步四则运算；文本型答案也可能是分数、时间、多个数量或逻辑身份。

现有 `selectTransferQuestion` 要求年级、兼容学期、技能交集、operation、domain、答案 family、relationSignature 一致，并要求 `numbers` 的排序集合不同且 `String(answer)` 不同。它没有验证实际数学正确性、数值负担、具体 schema 结构、difficulty、原题/候选安全性。`answerSchemaFamily` 将 integer/decimal 合并，multi_field 仅检查 kind 序列，也不足以证明同构。保留其严格意图并补强，不删除门槛。

运行入口：`lessonTransaction.start_transfer` 目前传 `allQuestions`，而 audit 传 `safeQuestions`；选中 ID 后，`submit_transfer`、`app/play` 与恢复路径通过 `getQuestionById` 取题。只改选择器而不扩展 lookup 会出现“选中了但找不到”。把变式加入 `allQuestions` 又会污染日课、推荐、历史统计及审计分母，必须避免。

`checkAnswer` 证明“输入符合存储的答案”；`validateAnswerSchema` 与现有题库 validators 证明字段和规则一致，都不是独立数学 oracle。禁止以 `checkAnswer(String(q.answer), q)` 作为答案正确的证据。

## 2. 先处理源题问题，明确不可承诺项

当前安全 G1–G6 是 **620**，不是 621：除四个 unsafeQuestionIds 外，g5o_32 有不安全质量标记。以下原题不能直接获得新变式背书：

| ID | 已见问题 | 本轮处理 |
| --- | --- | --- |
| g1ll_65 | ○△□周期第10个存为□，按题干应为○ | 不安全源题；修复须另建内容修订记录及回归，旧历史快照不改写 |
| g1ll_67 | 1红2黄周期第7颗存黄色，应为红色 | 同上 |
| g2_24 | 问“上课到下课”却把40分钟课与10分钟课间相加 | 先明确题干目标再修，不自动取50 |
| g5o_13 | 合作时间应由 x(1/15+1/20)+3/15=1 求得48/7，存5.4 | 不扩散错误，修订应保留精确分数与可用输入 |
| g5o_32 | 进价×(1.3×0.9−1)=39，精确进价3900/17；229.4没有题干舍入约定 | 不把近似值当精确答案 |
| g3o_20 | AB+BA=88、A>B至少有(5,3)、(6,2)、(7,1)三组；存单解5,3 | SOL已独立穷举；source-invalid，不能只给变式添约束而原题仍有多解 |
| g4o_11 | 三人名次及只有一人说谎约束唯一排序为丙、乙、甲，存第一名乙 | SOL已独立穷举；正确第一名为丙，先修源题或隔离 |
| g4o_15 | 18只118腿得蜘蛛5蜻蜓13，但20对翅要求蜻蜓10 | SOL已独立穷举无解；必须修题干，不能只改答案 |
| g1t_25 | 没有明确两条线的几何拓扑，题称三小三角且总4可能漏组合三角 | topology-unverified；补清楚构造及独立几何枚举前不覆盖 |
| g4_06 | 3米×2米地面、30厘米砖用面积除法取约67，缺裁切/余料复用约定 | tiling-assumption-unverified；先确定铺法再允许对应变式 |

后三组新增问题不得静默从 625 分母删除。由 SOL 决定最小更正或继续 quarantine；本计划不授权覆写历史事件/已保存作答。源题修订和变式扩展分开记录。该清单是已发现问题，不是“其余615已审完”的声明。

9 道信息不足题：`g1t_11`、`miss_01`–`miss_08`。它们可以有好的信息不足练习，但正确语义答案仍是“无法判断/无法计算”。不能以换同义词、给答案加原因或新造数字满足 differentNumbers。保持当前“数字及答案均不同”的严格变式定义时，这 9 道明确为 `constant-answer-by-design`，另列练习也不能计入 strictTransferMatched。

以下需要逐题人工合同，不能通用替数；未核准前标记 `review-required`：

- 固定几何性质或固定结构计数：g1ll_53、g1ll_54、g1ll_83、g1t_10、g1t_26、prog_g1_u4_02、prog_g1_u4_04、prog_g2_u5_01、prog_g2_u5_02、prog_g2_u5_05、prog_g4_u4_01、prog_g4_u4_09。长方形四条边、直角90度、等腰直角三角形底角45度等不能通过改尺寸得到不同答案。改成另一性质或另一拓扑不自动算同构。
- 无数字的纯关系题：g1t_01、g1t_02、g1t_15、g4o_10、g4o_26。换名字/颜色虽可能保持逻辑结构，但 `numbers=[]` 未变；不能往 numbers 写不存在的序号。需明确是否有真正同结构、带可变参数的变式，否则保持严格不可用。
- 固定答案分类：prog_g4_u4_02、prog_g4_u4_03、prog_g4_u4_05；改变边/角是否引入新的图形类别和推理步骤须审，不把“等腰”换“等边”直接算同构。
- 排列计数题仅替换三个非零数字依然得到6，不能计覆盖；必须对允许的对象数/取数数目作有界变换并验证阅读和枚举负担，或保留 unavailable。包括 g1t_27、g2o_19、prog_g3_u6_04、prog_g3_u6_09、prog_g5_u6_02 等。

因此“不放宽既有严格定义且不改变源题”时，625/625 不能诚实承诺。交付必须逐题穷尽可支持方法并展示真实覆盖；禁止为达到预设数字而改变范围。源题修复后可以重新评估，但同答案性质题仍不算严格不同答案变式。

## 3. 推荐实现：离线生成、固定发布、按原题绑定

优先新增固定审核过的变式库。允许编写确定性的离线生成器，但运行时不生成随机题，不用 LLM 即时出题，不从中文题干正则推断数学模型后自动发布。

1. 对每个 sourceId 写显式 recipe，先定义事实变量、关系图、目标未知量、单位、常量、边界和答案类型。输入为已审过的 facts；`numbers` 仅辅助检查，不能当唯一数学输入。
2. 每个 recipe 默认只输出1道完整固定 Question。需要更丰富练习可以输出2–3道，但先保证原题覆盖，不能用大量简单重复题冲变式总量。
3. 参数从有限候选表选取，按稳定顺序寻找通过约束且答案不同的组合。没有候选则返回明确拒绝原因，不扩大范围或随机重试。
4. 生成完整题干、answer、answerSentence、equation、explanation、solutionSteps、hints、solutionStepsDetailed、schema、subAnswers、meaning options、RF/条件文本；不得浅拷贝旧题后只改 text/answer/numbers。旧 metadata 若含数字、单位、角色、排序、视觉对象，必须重建或明确不适用。
5. 新题使用稳定 ID：`transfer_<sourceId>_v1_01`。内容后续改变用 v2 ID；已发布旧 ID 保持可 lookup。sourceId 永远指原题，不允许指向 transfer ID。
6. 正式交付为纯 TS/JSON 数据，无 Node fs、crypto、eval 和生成器依赖进入客户端 bundle。新增实现前阅读安装版 Next 指南；本规划已读 `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`。

### 3.1 文件与接口合同

建议目录（可在 SOL 审核后收敛，不能多个实现者自行设计互不兼容接口）：

```text
data/questions/transfer/types.ts             // 纯类型
data/questions/transfer/grade1.ts ... grade6.ts // 固定 Question + 每源合同
data/questions/transfer/index.ts             // 汇总注册表，不导入 data/questions/index
lib/transferContract.ts                      // 纯、轻量、无副作用验证及选择
scripts/generate-transfer-variants.ts        // 可选离线生成入口
scripts/transfer-recipes/grade1.ts ... grade6.ts
tests/content/transfer-oracle.ts             // SOL独立求解器
tests/content/transfer-proof-fixtures.ts     // 原题/变式独立事实见证
tests/content/transfer-variants.test.ts
tests/unit/transfer-registry.test.ts
tests/e2e/transfer-expansion.spec.ts
scripts/audit-transfer-coverage.ts
```

最小接口示意（实现时将 formula/model 改为穷尽 discriminated union，不用任意 expression 字符串）：

```ts
type TransferGapReason =
  | 'source-invalid' | 'source-unsafe' | 'constant-answer-by-design'
  | 'no-distinct-numeric-variant' | 'topology-unverified'
  | 'difficulty-not-preserved' | 'oracle-not-implemented' | 'review-required';

type SourceTransferEntry = {
  sourceId: string;
  sourceContentVersion: string; // 稳定内容摘要；构建测试验证源题未漂移
  status: 'verified' | 'unavailable';
  variantIds: readonly string[];
  reason?: TransferGapReason;
  detail?: string;             // 每道缺口具体可读原因
  contract: {
    familyId: string;          // 数学模型，不是笼统operation或sourceId
    targetRole: string;
    roleOrder: readonly string[];
    relationGraph: RelationGraph; // 带操作顺序、常量、单位维度及未知节点
    answerContract: AnswerContract;
    difficultyContract: DifficultyContract;
  };
  proofId?: string;            // 与SOL独立oracle见证关联
};

type TransferVariant = {
  sourceId: string;
  version: 1;
  question: Question;
};
```

`sourceId` 相同仅是绑定关系，不足以判定正确。只有完整审核合同通过且 sourceContentVersion 与当前源题对应，entry 才可为 verified；生成器自己写 `verified:true` 不构成审核。

原题缺 skill/RF 时，显式审核合同可以提供精确数学身份，但必须有独立事实建模证据，不能仅把两题都贴成 `source:<id>`。旧原题本身不必批量增添虚构 RF。

### 3.2 安全选择与 lookup

- `allQuestions`、`safeQuestions`、questionsByGrade、progression metadata 保持只含原题；不得把 transferVariants spread 进这些集合。
- 在 `getQuestionById` 中先查原题，再查独立 transfer map。两者 ID 必须无交集，未知 ID 返回 undefined。保留所有历史原题和已发布变式 ID 的解析。
- `selectTransferQuestion` 保持公共返回形状。先拒绝 transfer 原题/不安全源题，再查其 verified 定向变式；验证 source binding、完整年级/学期/领域/operation/schema/难度合同。然后可保留经复核的旧20匹配 fallback，不再任意扩大旧泛匹配。
- 原题 safe 与候选 safe 要在 selector 内保障，不能依赖调用者传 safeQuestions。needs_review 必须从严格变式候选中拒绝，原题是否沿用日课旧策略由 SOL 单独决定。
- 未进入注册表或合同不完整的题，返回 unavailable 及精确原因。不得以同skill followupQuestionId 算 strict matched。
- `differentNumbers` 不仅比较旧 numbers，还核对改变的是可见事实或明确数学参数；答案按数学语义比较（1/2与2/4、0.5与50%在同目标语义下不得伪造不同）。保留既有数值和答案都须不同的门槛。
- `lessonTransaction` 使用同一安全 selector；lookup、刷新、备份恢复、错题回看都能解析变式。运行时不执行重型 oracle，审核发生在构建/CI，轻量合同检查拒绝坏候选。

### 3.3 防递归、历史与统计

变式仅属于当前原题 step 的 transfer 状态，不插入新的核心 step，不生成变式的变式，不增加日课题量，不触发第二份奖励。`questionInstanceId` 继续以原题实例为父，并保留 `attemptRole='transfer'`。

错题/复习队列若由transfer产生，不允许直接把transfer当新日课原题：采用父sourceId作为后续学习入口并保留原变式快照。不要在本轮改写用户旧事件，统计仍按 original/transfer 分层。

在 generator、selector、lessonPlanner 三层断言：source不是transfer；normal lesson pools没有transfer；即使外部传入含transfer的pool，也不会递归。读取旧课和原题恢复逻辑保持兼容。

## 4. 数学模型、变换边界与独立证明

任何一类都必须同时证明源题和变式正确；源题错误不能因为变式算对了就通过。

| 模型 | 允许变化与必须保持 | 独立oracle |
| --- | --- | --- |
| 单步加减/比较 | 事实值有界变化；保持求初始/变化/结果/差的未知角色、大小方向、位数、进退位结构；不把“多多少”换“多少倍” | 整数计算并代回关系等式；穷举小范围未知量唯一性 |
| 等量分组/平均分/包含除 | 保持每份、份数、总量的角色；整数商/带余数/向上取整/向下取整分开；非零、余数范围和单位正确 | 乘法逆验，q*d+r=n且0≤r<d；按场景核ceil/floor |
| 两步/多步 | 保持有序运算图、同一未知节点和依赖结构，不仅operation=mixed；整数/小数/中间负数边界固定 | 逐节点精确计算+把答案代回原约束；给出所有中间量 |
| 小数/分数/百分数/比例 | 有理数精确表示；分母、约分、通分、百分率作用基数、比例方向保持；不得把常数100当可变参数 | 独立BigInt分数或整数缩放；化简与交叉乘验证；禁止浮点epsilon掩盖算错 |
| 钱/计量/时间 | 固定合法单位换算常数(10/100/1000/60)，可改实际金额/时刻；保持借位、跨小时/天数、数量维度 | 统一角/分、最小长度单位、分钟复算，再独立格式化并还原 |
| 周期/数列 | 固定周期长度与问第n项/缺中项结构；改序号须保持推理负担且答案变；递推不变，不能换规律 | 从序列首项逐项生成到n；不用生成器的闭式公式 |
| 整除/因数/倍数/余数 | 取数范围有限；保持零/非零首位、重复限制、余数条件和唯一性 | 从域枚举所有解；分解/LCM生成时测试用逐整数扫描 |
| 均值/中位数/众数/统计 | 样本数及排序位置结构保持；均值总和必须可整除(若要求整数)；唯一众数/并列、缺失量/噪声负担固定 | 排序/频数/求和独立实现；反代全部事实及不等式 |
| 面积/周长/体积 | 固定图形拓扑、维度、半径或直径角色、相接/相减关系；三角形合法、内外半径次序、相同π约定 | 基本公式与分解/坐标/单元计数双检；圆类精确π=314/100 |
| 空间计数/切割/涂色 | 明确栅格/立方格/线段模型；固定共享边、重叠、切口及可见面规则；不借改形状跳题型 | 枚举格点矩形、外边暴露、每个小立方体涂色面数；组合公式与枚举交叉 |
| 排列组合/逻辑/真假话 | 所有对象、陈述、约束、问目标都结构化；唯一解或明确全部解；小域有限参数化 | 枚举全排列/真值分配/选择集合；不得调用原生成公式 |
| 鸡兔/盈亏/年龄/工程/牛吃草等 | 每题独立有量纲模型；保持人数整数、年龄正、速度/效率正、总量守恒；不把常量腿数/生肖数替掉 | 代数生成与有界枚举/守恒方程组核查独立；效率用精确分数 |
| 最优化/抽屉 | 明确可行域、整数/连续、含端点、至少/最多、唯一最优或容许多最优 | 枚举可行域并保留全部最优解；检测遗漏边界、未满足约束的极值 |

不采用全题“乘2”“数字+1”或“同operation套统一模板”。线性缩放也不普遍安全：面积/体积维度、比例结果不变、钱币面值、月份天数、星期周期、腿数、进位、分数约分、枚举解数和百分数基数都可能被破坏。

对于复杂 legacy 题，优先固定人工变式和独立oracle，而不是扩建一个通用中文算式解释器。geometry/logic_reasoning 共197题只是domain统计，不意味着197题都需手写，也不意味着它们能共享一个模板。

## 5. 难度合同（必须比现有标签细）

必须相同：gradeBand、兼容且不越级的学期、domain、operation、目标技能、difficulty、assessmentTier、isExtendedThinking、isTwoStep、已存在的difficultyProfile六维。缺字段不能靠“双方undefined”证明难度一致，要在entry补人工审核负担。

还要检查：整数位数和零的特殊性、加减进退位位置/次数、乘法口诀范围、除法整除/余数类别、数字小数位与结果精度、分数分母规模和通分步骤、表达式括号与运算先后、条件数/干扰项数、阅读长度区间、枚举域规模、方案唯一性、正反向求解和中间量个数。不能把原难度1乘9×9答案81的题变为两位数乘法只保留difficulty=1。

缺少可行变参时允许对同技能进行固定情境改写，但仍须有实际不同数字与不同答案、保持数学模型和负担，才可计严格匹配。只换人名、物品、题目编号不能计。

schema 兼容比较不能照搬现有family：integer/decimal默认不能混换；multi_field要匹配字段id/顺序/语义/单位/kind；fraction/percent/ratio不能因答案值相同混用；text acceptedAnswers必须按新答案重建。min/max可因等难度数值区间合理更新，但必须覆盖真实答案且不扩大难度边界。

## 6. LUNA任务卡与串行集成

所有任务先读当前git diff，不覆盖用户文件。共享热文件（data/questions/index.ts、lib/independentSolving.ts、lib/lessonTransaction.ts、package.json）仅由集成卡修改。各卡不得提交、部署或修改其他卡文件；交付给SOL审查后主代理集成。发现接口变更先回传Astra/SOL冻结合同。

| 卡 | allowlist | 具体合同与验收 | 退回条件 |
| --- | --- | --- | --- |
| T00 清单 | 新scripts/audit-transfer-coverage.ts、reports/.../source-inventory.json | 625唯一ID逐条状态；分年级/domain/schema；含原文摘要与安全状态；不写旧audit | 漏ID/重复ID/分母被变式污染 |
| T01 注册基础 | transfer/types.ts、transfer/index.ts、lib/transferContract.ts、tests/unit/transfer-registry.test.ts | 纯函数、无barrel循环、稳定版本ID、source绑定、安全及难度拒绝、unavailable理由；先用小fixture | 仅sourceId相同即通过；运行期重型生成/Node依赖 |
| T02 G1 | transfer/grade1.ts、scripts/transfer-recipes/grade1.ts | 147个源ID全登记；数域、进退位、钱币、图形性质边界；按支持类型逐批交付 | 不安全源题通过；重复答案伪覆盖；中文条件与答案不一致 |
| T03 G2 | transfer/grade2.ts、scripts/transfer-recipes/grade2.ts | 91个源ID全登记；口诀、平均分与包含除、余数、长度/时间、入门枚举 | 用商变余数或跨未学乘法范围 |
| T04 G3 | transfer/grade3.ts、scripts/transfer-recipes/grade3.ts | 107个源ID全登记；单位换算、两步、和倍/差倍/鸡兔、源题歧义隔离 | 离散对象变小数、原题多解被忽略 |
| T05 G4 | transfer/grade4.ts、scripts/transfer-recipes/grade4.ts | 105个源ID全登记；整数运算律、小数、角、均值、真假话、周期/组合 | 真假约束错、固定性质凑不同答案、裁切假设遗漏 |
| T06 G5 | transfer/grade5.ts、scripts/transfer-recipes/grade5.ts | 106个源ID全登记；分数、小数、工程、牛吃草、涂色、优化 | 浮点近似掩盖精确结果、单位维度错 |
| T07 G6 | transfer/grade6.ts、scripts/transfer-recipes/grade6.ts | 69个源ID全登记；分数比百分数、圆柱、连续百分率基数、最优化 | 百分率直接加减、半径直径混用、漏边界最优 |
| T08 独立oracle | tests/content/transfer-oracle.ts、transfer-proof-fixtures.ts、transfer-variants.test.ts | SOL定义并审核；LUNA仅按固定oracle合同实现；不得导入生成器计算函数 | 同源计算代码自证、只checkAnswer(q.answer)、未验源题 |
| T09 集成 | data/questions/index.ts、lib/independentSolving.ts、lib/lessonTransaction.ts、data/questions.ts、package.json | 独立lookup与定向selector；原题池不变；统一安全过滤；所有旧20匹配复核 | daily混入variants、递归、历史lookup失效、过滤绕过 |
| T10 浏览器/恢复 | tests/e2e/transfer-expansion.spec.ts、必要测试helper | G1–G6至少各一个新变式，所有实际schema类别操作；刷新/幂等/不泄答案/奖励不重复 | 只fixtures静态通过而真实UI未提交 |

顺序：T00/T01冻结接口→六年级按卡实现（可按领域复用纯helper，但不得共改同文件）→每批T08独立审→T09串行接线→T10完整验收→发布。先覆盖简单高可信题，再逐题消化复杂题，直至625项没有“未处理”状态。最终仍缺项必须是已审的具体理由，不能笼统“复杂”。

## 7. 独立oracle与反例测试设计

1. 独立事实见证写出源题/变式的已知条件及期望unknown，禁止从 q.answer、q.equation、q.explanation 提取正确答案。共享纯类型允许；共享生成器计算函数不允许。生成器公式与oracle枚举尽量使用不同算法。
2. 每题核验源题事实、变式事实→唯一结果→所有 answer/subAnswers→answerSentence/解题步骤中所有数量→输入schema→`checkAnswer`真实可提交。文本叙述与facts之间由逐题审核/锚点断言负责，不能假设数学模型自然覆盖中文题干。
3. 多字段：oracle产生每字段值；正确JSON全通过；仅一字段错、缺字段、字段交换、带错误单位全部拒绝。排序需实际option ID/人名顺序输入；fraction/ratio/percent测试等价格式和错误前缀，decimal测试精确值，money测试单位转换。
4. 给每个模型注入坏数据：改答案±1、交换减数被减数、用总量百分率代替剩余量、漏半径除2、少一个单位转换、错ceil/floor、丢条件、改唯一解为多解、错误示例图拓扑。oracle必须失败；只检查正例不合格。
5. selector负例：跨年级/学期、同operation不同unknown、integer变decimal、多字段顺序/单位变、难度增加、相同语义答案、虚造numbers、unsafe/needs_review、孤儿variant、循环source、未知version、source内容漂移全部拒绝。
6. registry全量：625原题各恰好一个entry；verified至少一个可查且已验证variant；unavailable有具体原因且无候选漏选；variants ID唯一、source存在；allQuestions仍655、G1–G6仍625、日课池从无variant。
7. 恢复/事务：加载旧v2.14课；开始变式后刷新；错答再答对；重复actionId；重复点击；导出/导入后仍能答；完成原题/变式不重复奖励；变式成绩不提升原题firstAttemptCorrect/independentCorrect；开始变式最多一次。
8. 浏览器生产构建测试各年级和每种新增schema，而不只integer；例外展示“暂没有确认过的同结构变式”，不能空白/死按钮。视觉/逻辑题的必要图形实际可见，提示不展示最终答案。

## 8. 真实覆盖与发布门槛

每次audit输出：HEAD、源集合内容摘要、原题数、当前安全数、每年级matched/unavailable、matched类型(existing/new)、缺口ID+原因、variant数量、oracle failures、schema failures、difficulty failures、source-invalid IDs。保留`strictMatched/625`主指标，同时另列`strictMatchedSafe/currentSafeCount`；不能仅展示安全分母把坏题隐藏。

每年级分别过关：G1 147、G2 91、G3 107、G4 105、G5 106、G6 69条全部审计有结论。30道独立OlympiadIntro独立报告，不偷偷加入目标，也不把它们的通过算到G1–G6。G1–G6内奥数/提高题同等需要处理。

完成定义：所有可验证模型有固定安全变式；其他625项均有经过SOL审的精确拒绝理由；没有pending/review-required泛占位；每道matched源题和候选均通过独立数学oracle及难度合同；没有已知错误继续作为新课/新变式发放；全量回归通过。若剩余oracle-not-implemented而仍能继续实现，应继续工作，不以“已列原因”替代完成。

最低回归集合：新增transfer内容/registry/oracle测试；现有typecheck、lint、validate:questions、validate:reasoning-frame、validate:semantic-skills、validate:numeric-skill-labels、validate:hints、validate:child-ui、validate:lesson-generation、validate:release；independent-content/runtime、solving-metrics、mistake-explanation、状态事务、奖励完成、备份和课程生成测试；生产build及完整既有E2E。以package与CI实际脚本为准，脚本名存在不代表已运行。

Git发布：只stage本轮明确文件，不`git add .`带入已有未跟踪产品文档/报告/用户产物；保留手工工作。提交后同SHA CI和E2E成功再部署/提升Vercel；记录提交SHA、部署ID/URL、线上版本与原题/变式覆盖摘要。线上至少真实验证G1–G6转入变式、答案提交与刷新恢复；HTTP200或本地绿灯不能替代线上交互证明。若平台真实限制，明确说明已完成层级及未证实项，不伪称全发布验收。

回滚：优先切回先前已验证部署；原题和已发布变式lookup兼容数据保留；不清用户localStorage、不重置学习历史、不删除旧变式ID。任何内容修订另增版本而不使旧课失去可读性。
