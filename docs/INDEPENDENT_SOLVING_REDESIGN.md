# 数学侦探：独立作答与真实推理改造

日期：2026-10-21。基线：v2.13.3 / d31baa7。状态：教学机制已实现；发布验证以同一提交的构建、浏览器和 CI 证据为准。

## 1. 本次需求的优先级

依据用户附件最后一次纠正，覆盖旧的强制审题阶段及“连续点击三级文字提示”方案。每道题立即展示完整题干和 AnswerSchema 对应真实输入；独立作答是默认路径。求助无需先乱填一次，也不设置倒计时。帮助必须是 1–3 个有判定、有针对性反馈的微任务。完整讲解是独立的“这题我不会，查看完整讲解”操作，结束原题尝试、记录待巩固，不能再照抄原题获得独立正确。随后提供真实同构题；仍不会允许继续并安排复练。

保留 G1–G6 全部 655 题及正确答案、解析、reasoningFrame、历史记录、积分账本、奖励、装扮、打卡和家长设置。每日课程仍为六题，迁移是当前题的子状态。开发、测试、修复连续进行，不在规划完成后停止；验证通过后沿用用户既定授权提交 Git 并同步 Vercel，未通过不得标记发布。

## 2. 已审计事实与风险

| 位置 | 改造前事实 | 改造要求 |
| --- | --- | --- |
| `app/play/page.tsx` | 主课程页面，调用 HintSystem、ThreeQuestionFlow、AnswerInputRouter | 所有新题先进入真实答案区；旧教学组件只在请求帮助或复盘调用 |
| `lib/runtime.ts` | 默认 intro；three_question_flow 依次 known_facts、target、plan、answer | 默认 answer；恢复旧屏幕时兼容处理，不重建已完成课程 |
| `components/lesson/HintSystem.tsx` | light 常显，两错自动 medium，双击可 showFull | 不允许沿原链路揭示答案；新交互由已验证微任务驱动 |
| `components/ThreeQuestionFlow.tsx` | 使用 plan.firstStep、operationReason | 可能包含关键算式，不可直接作为答题前帮助 |
| `lib/lessonTransaction.ts` | 已有提交去重和完成事件；仅 full/support 视为 assisted | 任意求助污染独立证据；查看讲解成为事务终态；原题与迁移各有 identity |
| `lib/learningEvents.ts` | schemaVersion 1，严格事件类型与模式校验 | 扩展校验与导入导出，不静默丢弃新事件 |
| `lib/learningMetrics.ts` | 首答与完成分别统计；升级主要限制 full hint | 使用全部帮助、独立首答、迁移与待巩固信号 |
| `lib/mistakeReinforce.ts` | 同领域不足时放宽到同年级 | 不能把这种宽松选题当作同构迁移 |
| `README.md` / `docs/PRODUCT_DEFINITION.md` | 文档含早期年级定位、旧版本描述 | 当前代码和本合同优先；不能按旧低年级范围缩减产品 |

题库字段安全分级：`text`、经核验确实来自题干的 knownFacts、targetQuestion 可用于微任务；reasoningFrame.plan、operationReason、solutionStepsDetailed、explanation 与旧 hints 一律不直接当提示。已有 hints 中存在明确运算指导，explanation 明确含数字答案。禁止按句切解析、正则删等号后半段、仅屏蔽 answer 字符串后直接上线。数字可能既是已知条件又是答案，泄漏检测必须结合来源与用途，不能全局禁掉相同数字而破坏题意。

## 3. 文件所有权与 allowlist

三条 LUNA 工作线互不编辑对方文件；主代理最后集成。遇到实际依赖需要扩大 allowlist 时先说明原因并由主代理协调，避免同文件冲突。

1. 内容合同 LUNA：新增 `lib/independentSolving.ts`（类型及纯函数）、`tests/unit/independent-solving-content.test.ts`、`scripts/audit-independent-solving.ts`；必要时独占新增 `data/interactiveHelp.ts` / `data/transferRelations.ts`，不得整体覆写题库。
2. Runtime LUNA：`lib/types.ts`、`lib/runtime.ts`、`lib/lessonTransaction.ts`、`lib/lessonPlanner.ts`、`lib/learningEvents.ts`、`lib/learningMetrics.ts`、`lib/adaptiveDifficulty.ts`、`lib/learnerProfile.ts`、`lib/migrations.ts`、`lib/storage.ts`、`lib/dataTransfer.ts`、`lib/mistakeReview.ts`、`hooks/useGameState.ts`，及相应 unit/integration 测试。只有此工作线可修改公共 types。
3. UI LUNA：`app/play/page.tsx`、`components/lesson/InteractiveHelp.tsx`、`components/lesson/HintSystem.tsx`、`app/parent-report/page.tsx`、`app/mistakes/page.tsx` 及新 E2E 文件；AnswerInputRouter/MoneyInput 等仅必要修复，不另写答案解析器。
4. 主代理：集成协调、现有 E2E 语义迁移、验收脚本、报告、必要的 package scripts，以及本计划实施状态更新。

不清理既有脏文件、未跟踪文档、reports、用户手工资产。不改奖励经济、不改变既有积分。写产品代码前各工作线读取 `node_modules/next/dist/docs/` 中相关 Next 16.2.4 文档（客户端状态组件至少 `01-app/03-api-reference/01-directives/use-client.md`）。私人家庭学习项目不进入企业业务 Runtime。

## 4. 固定接口合同

`lib/independentSolving.ts` 导出以下共享类型，其他模块使用 import type，避免循环运行时依赖。

```ts
type MasteryStatus = 'independent' | 'assisted' | 'needs_reinforcement';
type SolvingPhase = 'attempt' | 'help' | 'review' | 'explanation' | 'transfer' | 'complete';
type SolvingOutcome = 'unresolved' | 'first_independent' | 'retry_correct'
  | 'hint_correct' | 'guided_correct' | 'explanation';
interface SolvingEvidence {
  phase: SolvingPhase;
  firstAttemptCorrect: boolean | null;
  independentCorrect: boolean;
  hintCount: number;
  maxHintLevel: 0 | 1 | 2 | 3;
  guidedSolutionUsed: boolean;
  fullExplanationViewedBeforeSolve: boolean;
  attemptCount: number;
  finalCorrect: boolean;
  masteryStatus: MasteryStatus;
  outcome: SolvingOutcome;
}
interface InteractiveHelpTask {
  id: string;
  skill: 'target' | 'condition' | 'relation' | 'intermediate';
  prompt: string;
  options: { id: string; label: string }[];
  correctOptionId: string;
  feedback: string;
  scaffold: string;
}
```

首版 choice 微任务可满足真实判断；若用输入微任务，显式 discriminated union 扩展并由主代理同步双方，不把任意字符串当答案。option ID 与显示文案分离，判定不依赖数组下标或“正确项永远第一项”；稳定按题实例打乱但刷新不变。

内容模块函数合同：`buildReasoningTasks(question): InteractiveHelpTask[]`、`evaluateReasoningTask(task, value): {correct, feedback, scaffold?}`、`selectTransferQuestion(question, candidates)`；`createSolvingEvidence()` 统一初始化证据。TransferSelection 区分 `{kind:'matched', questionId, reason}` 和 `{kind:'unavailable', reason, followupQuestionId?}`，不可用宽松题假充 matched。实际接口以 `lib/independentSolving.ts` 为准。

`LessonStep` 新增可选 `solving?: SolvingEvidence`、`transfer?: {questionId; questionInstanceId; parentQuestionInstanceId; status:'pending'|'answering'|'correct'|'deferred'; solving:SolvingEvidence}`。实际 UI 所需 helpTaskIndex、taskAttempts、已通过 ID、草稿持久化等可增加在独立 `helpProgress` 字段；不得用 React 临时状态作为完成证据。

LearningEvent 保留 schemaVersion 1 基础兼容，可选新增 `source:'original'|'transfer'`、`parentQuestionInstanceId`、`solvingEvidence`；completionMode 扩展 needs_reinforcement。记录 help 请求、微任务判定、讲解、迁移判定/放弃的事件（新 eventType 或现有 support 事件附细分类型，必须统一 validator）。事件 actionId 幂等，questionInstanceId 唯一且不随刷新变化。聚合忽略 legacy_unknown 的独立能力判断。

## 5. 状态与事务

默认 attempt（题干+控件）→答错仍 attempt；答对→review→下一题。帮助请求在事务中增加 hintCount、maxHintLevel 并进入 help，答案区始终可返回。未正确完成当前微任务不得解锁下一任务；微任务正确也不等于原题答对。1–3 项结束后仍需原题真实提交。

每个微任务首次错误给具体反馈；连续错误提供更短、明确指向题干条件的 scaffold，允许返回答题或独立查看讲解，不能无限强迫猜选项。guidedSolutionUsed 表示使用关系/中间量深入引导，不能仅点击入口就伪造完成。

查看完整讲解：同一事务先冻结原实例、写 fullExplanationViewedBeforeSolve=true / outcome=explanation / masteryStatus=needs_reinforcement / finalCorrect=false，再显示答案。原题提交入口隐藏且事务层拒绝后续 submit。显式标记 explained completion，不伪造 answerSubmitted=true 来绕过 AnswerGate。

AnswerGate 拓展为真实正确提交，或明确讲解结束且迁移已作答/已明确暂缓。不能因为看完任务或空值提交而推进。迁移有自己的真实 AnswerSchema 控件、attempt 事件、状态和草稿。迁移正确显示“学习后完成变式”，原实例仍是待巩固；迁移独立证据单列，不能洗回原题独立正确。迁移不会可选择“先继续，安排复练”，写待巩固记录与复练时间，不自动判正确。

课程完成与奖励沿用现有原子事务，六个原题槽位只完成一次。迁移不产生第七题课程奖，不增加虚构正确题数。保留用户既定“真实首答全对获得 1 积分”：互动帮助后首次真实答对仍可获得该奖励，但能力统计为 assisted；不得因求助扣除已有积分或擅自取消此奖励。查看完整讲解不等于原题首答正确，迁移也不能替原题补满分。`lib/familyPoints.ts` 归 Runtime 工作线检查此边界。错题本显示答案后的同次照抄也不得被记为独立纠正；与原有订正奖励兼容处理，不能凭新讲解操作发奖。双击/Enter+点击、刷新、返回、跨日期恢复、存储失败均不得重复奖励或丢失讲解状态。若写入失败，留在当前状态并提供重试，不提前显示成功。

## 6. 655 题内容覆盖与迁移

全量审计逐题列出：grade/semester/skill、schema、RF 可用性、1–3 个任务、来源、泄漏风险、relationKey、匹配迁移 ID 或不支持原因。禁止仅抽几道题声称覆盖全部。

任务优先来自题干与结构化已知条件、目标、关系。缺 RF 时可安全降级到“哪一条是题目已告诉我们的条件”等与该题真实内容有关的判断；干扰项必须可判且非荒诞的泛泛“先读题/猜题”。不能根据“吃掉”推导必用减法：求原来与求剩余必须分开。多字段、比较、分数百分数、几何/统计/规律、逆向、两步与奥数分别审计。缺乏可信关系不得虚构方法。

同构匹配要求同年级、兼容学期、相同课程 skill、operation、语义关系及相容答案 schema；原题 ID 不同、实际数值不同、答案不同且不是仅换人名。只匹配 operation 不够：求剩余与求差即使同为减法也不是相同关系。relationKey 来源于已审计显式映射/结构，而非猜测自由文本。

无严格匹配返回 unavailable，界面准确说明此题变式暂缺并安排已有同 skill 复练；不得临时替换数字造未经验证题。此项必须在覆盖报告披露；本次仍需以真实样本验证 G1–G6 不同关系的完整迁移路径，若无法做到则验收未完成。若补题，独立数据文件保留原 655 题，新增题须完整校验答案、schema 和关系。

## 7. 记录、报告、自适应与复练

独立掌握严格为无任何帮助且首次正确。无帮助重试正确保留 retry_correct，不升格首次独立；masteryStatus 可用 assisted 大类但家长细分显示“自行重试后正确”，避免误说用过帮助。hint_correct、guided_correct、explanation、transfer 独立正确分别保留。未结束的 unresolved 不加入已完成分母。

家长端并列显示首次独立正确率、真实最终答对率、帮助依赖率、迁移独立掌握率和待巩固数量。明确分母：新机制已结束原实例；迁移独立率仅使用已实际作答迁移实例，暂缓另列；没有新证据显示“暂无数据”，旧记录不能被假设独立。时间仅辅助，不作为急慢惩罚。

自适应升级继续使用多次、多会话证据窗口，任何帮助不能算独立首答。7/10 题依赖帮助而最终全对不得提升为熟练。迁移有正向学习信号但不能替代原题独立；连续弱项安排同年级同 skill 基础关系练习，不因少量错误自动退学期。复练队列保存 questionId、原实例、lessonId 和 dueAt；skill、原因与迁移表现通过题库和原始学习事件关联读取；次日课程编排实际消费该队列并去重。只显示“明天再练”文案不构成安排复练。

## 8. 兼容迁移与回滚

新增字段均可选，旧记录原样保留，不覆盖历史题目、积分、奖励或首错。旧首答与帮助来源未知时保留 legacy_unknown，禁止补独立成功。旧进行中课程保留题目与已完成槽；当前未完成题迁移为直接答题；若旧状态已看 full 提示，按 assisted/needs_reinforcement 保守继承，不能重置为独立。日期、profile signature 和缓存稳定性沿用现有保护。

迁移幂等；导出→导入后新事件与待复练队列完整；旧 app 可忽略新增字段但不支持新状态的回滚应先导出备份。回滚以代码回到基线为主，禁止清空 localStorage。恢复旧 reader 前提供向后兼容映射，保留新 evidence 原副本；新课程恢复不能发第二次奖励。

## 9. 测试与验收

先跑现有类型、内容、迁移、事务与奖励测试，再生产 build + 真实浏览器。旧 246 测试是基线，不以删除、skip、放宽断言或假造旧步骤掩盖产品变化。旧强制阶段测试迁移到“求助时训练且真判定”，仍保留原不跳答题、单提交、一次奖励意图。

新增 E2E：`independent-solving.spec.ts`、`progressive-hints.spec.ts`（名称保留，验证交互任务非连续揭示）、`guided-solving.spec.ts`、`answer-reveal-gate.spec.ts`、`mastery-tracking.spec.ts`、`transfer-question.spec.ts`。

验收矩阵必须包含：

- G1–G6、上/下学期默认立即可答；题干以外无完整解析、算式、答案暗藏在可访问 DOM/标题/aria 文案；此为普通使用防抄，不声称静态前端对开发者工具保密。
- 不求助直接一次提交；金额元角、多字段、选择、比较、分数/小数/百分比等真实 schema；输入 Enter/触屏按钮一致。
- 连续点帮助不推进；错微任务不解锁；正确 1–3 项后仍需原题提交；不同关系不反转加减。
- 讲解事务冻结原题，刷新也无法照抄获独立；显式放弃可继续且真实待巩固。
- 迁移匹配与不支持分支分别验证；真实不同数字/答案；迁移错可继续、复练明日实际选到；迁移成功不改写原题。
- 首次独立、重试、提示、深入引导、讲解、迁移各证据正确；报告/自适应/导出导入口径一致。
- 桌面与 360px 手机六题完整流程，特别第二关不跳答、第五关不双提交、第六关完成有效；刷新恢复和奖励一次。
- 所有旧积分/家长设置/历史/首错/装扮不变；存储失败不会伪成功；重复 action 不多写事件。

记录实际运行命令、构建版本、测试数/pass/fail/skipped、浏览器、截图/trace、覆盖报告及未覆盖项。只通过工具函数不能宣布完成；production build 下实际浏览器通过后才完成本地交付。线上发布状态以对应版本发布证据为准。

## 10. 实现与验证记录

- 已实现：默认真实作答、1–3项判定任务、讲解冻结原实例、独立迁移与明确暂缓、跨日续练和次日复练；旧课程已完成历史不伪造独立证据。
- 已贯通：学习事件、技能统计、家长报告、最近30个原题实例的能力画像、基于独立证据的升难，以及备份导入导出。复练队列表示待执行的练习，执行后真实答对可移出；不等于已独立掌握名单，原始讲解与辅助完成事件保留。
- 内容审计：655/655题有互动任务，其中G1–G6共625题、奥数入门30题；严格同构变式覆盖20/655题（3.05%）。其余题明确降级复练，不声称全部题都有变式。题库的原答案与解析未重写。
- 浏览器验收清单：保留原246项测试意图并新增42项，共288项、49个文件，覆盖桌面与手机。G1–G6变式成功使用真实题库内容的合成课程实例验证学习状态；各年级真实设置与六题选题另由原有完整课程用例验证。
- 发布构建使用隔离的 Next 输出目录（`.next-independent` 或 `.next-ci-repair`）；最终完整浏览器使用 `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3222`、`playwright.no-server.config.ts`、`--workers=4 --retries=0`。未完整结束的诊断轮次不计通过。
- 机器验证输出保存在 `reports/2026-10-21-independent-solving/`；发布记录绑定最终Git SHA、两条GitHub工作流与Vercel部署。只有完整运行的PASS结果才是验收依据，本计划不替代运行证据。