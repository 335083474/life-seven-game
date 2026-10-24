# 开发文档 V1.0 对照与补漏记录

核对基线：用户于 2026-10-24 提供的 `LIFE-GDD-PRD-001 V1.0`（70 条验收、26 项待决）。原文 SHA-256：`e96e0ef612090481f757fded2b5276ec0d1102817006715380d5a1b67fd73cb7`。原附件保留在本机，不把整段聊天发布到仓库。

当前交付为 **solo-1.1-preview 单人技术预览**。文档第13章对原始HTML的评价不代表这次核对前的服务端现状。已实现的单人权威引擎、MiniMax、家庭结算和存档逐项重新核验；不因此把真实联机、广告、支付或PDF标成完成。

## 本轮修正

- 孩子按出生时间和实际年龄独立；晚育不强制幼童离家，已独立/父母已逝不重复扣牌。
- 夫妻双方同回合的黑天鹅先收集，再自动共享健康；两份扣两份，合计最后一份可抵双方；离婚停止共享。
- 健康卡合并/转赠保留真实剩余次数，不能用两张耗尽卡造出新保护；拒绝未知交易方向。
- NPC保留自己的年龄、升学/辍学分支、职业、个人机会；合作同意不自动等于同意花掉机遇。
- 测试参数集中在 `backend/settings.mjs`，每局和每次行动保留快照。掷骰前的完整方案、选卡和公式以SHA-256绑定；客观事实链只追加。旧档迁入只标记迁入校验，不追认此前未留存的证明。
- 逐卡说明、四档D100概率、草稿恢复、手记搜索/章节筛选、未竟尝试和故事来源入口已补。
- 新叙事/七章传记保存事实ID、来源哈希、模型/提示词版本与用量；先核对亲属/婚姻/成败等结构化状态，再接纳正文；格式或来源不合格时按明确合同重试一次，仍不合格就保留结算事实并允许玩家稍后重试。来源核验不等于对文学语义作100%保证。
- 文档尚未确认的重大亲子连锁默认关闭；保留普通孩子/快乐独立变化。

## 验证范围

自动检查 **55项**（包含既有回归）。真实MiniMax中文及英文各跑九回合与七章传记，验证新匹配理由和来源合同；真实模型检查使用独立内存数据库，测试骰值不对线上开放。已核对浏览器草稿恢复、逐卡理由、概率、来源弹窗和手记搜索；公开站点15份资源已逐一核对SHA-256；正式API用真实D100完成九回合、七章MiniMax传记、刷新续玩一致性及终局48小时保留期核验。模型偶发不合格输出会被拒绝，可在原结算事实不变的情况下重试。

以下“已核验”只适用于单人范围；“测试方案已核验”不表示数值已正式定稿。计数：测试方案已核验 25；单人已核验 23；待实现联机 7；部分覆盖 11；等待规则定稿 2；待实现商业化 2。

## 70条验收映射

| 用例 | 状态 | 现状、差异与证据 |
|---|---|---|
| T-001 | 测试方案已核验 | 服务端父母+3种不重复天赋；开局无额外自由/黑天鹅；牌池仍为候选。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-002 | 单人已核验 | 界面分别显示章、年龄、回合与三环节。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [game.js](../game.js) |
| T-003 | 待实现联机 | 无真实房间与全员屏障，不用单人推进冒充联机。  |
| T-004 | 单人已核验 | 三位有固定ID的系统人物可合作、结婚、共同养育。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-005 | 待实现联机 | 真人邀请/接受流程未实现；系统人物在掷骰前由语义评估同意。  |
| T-006 | 部分覆盖 | NPC正式合作在roll锁定时占用机会；尚无真人房间。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-007 | 部分覆盖 | NPC usedRound会拒绝重复占用；真人跨行动事务待联机。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-008 | 部分覆盖 | 单人接口最多邀请2位NPC，第四位参与者被参数校验阻止；真人房间待做。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-009 | 待实现联机 | 真人全员确认与确认失效机制尚未做。  |
| T-010 | 部分覆盖 | 玩家换卡只重算概率，NPC按其方案自动选卡；真人自主选卡/确认待做。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [game.js](../game.js) |
| T-011 | 单人已核验 | 同目标在本回合缓存基础难度；关系类型/对象区分缓存。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-012 | 单人已核验 | 换目标重新评估难度、奖励和风险，不能沿用旧方案掷骰。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-013 | 测试方案已核验 | 前后端限制每人至多2卡，配偶借卡不额外加人或复制贡献。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [game.js](../game.js) |
| T-014 | 单人已核验 | 名单、关系卡奖励及候选持有资格均由服务端验证。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-015 | 单人已核验 | D1原子CAS和requestId回执；重试不重复结算。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-016 | 待实现联机 | 尚无两名真人共同事件，单人双标签CAS不是该用例的完整替代。  |
| T-017 | 测试方案已核验 | 基础25、知识II16+技能I4，经0.8为41%；独立公式测试覆盖。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [gdd.test.mjs](../tests/gdd.test.mjs) |
| T-018 | 等待规则定稿 | 保留exact=50.2、测试舍入50；统一用于显示/成功/大失败。最终取整规则仍需产品定稿。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [gdd.test.mjs](../tests/gdd.test.mjs) |
| T-019 | 测试方案已核验 | 16+8*0.5+8*0.25=22，按强度而非加入顺序排序。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [gdd.test.mjs](../tests/gdd.test.mjs) |
| T-020 | 测试方案已核验 | 当前传奇上限例为17%。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [gdd.test.mjs](../tests/gdd.test.mjs) |
| T-021 | 测试方案已核验 | 当前简单例原始95，候选封顶90。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [gdd.test.mjs](../tests/gdd.test.mjs) |
| T-022 | 单人已核验 | 01优先判定大成功。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [api.test.mjs](../tests/api.test.mjs) |
| T-023 | 单人已核验 | 低于50时96—100大失败；候选骰前锁定。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [api.test.mjs](../tests/api.test.mjs) |
| T-024 | 单人已核验 | 普通失败只消耗行动，不直接扣牌。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [api.test.mjs](../tests/api.test.mjs) |
| T-025 | 单人已核验 | 65%时98为普通失败。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [api.test.mjs](../tests/api.test.mjs) |
| T-026 | 单人已核验 | 100为大失败。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [api.test.mjs](../tests/api.test.mjs) |
| T-027 | 单人已核验 | 统一整数50%时96为普通失败。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [api.test.mjs](../tests/api.test.mjs) |
| T-028 | 等待规则定稿 | 实现为可复现的nearest-integer测试策略；尚不能标记最终批准。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [gdd.test.mjs](../tests/gdd.test.mjs) |
| T-029 | 单人已核验 | 整场无合法候选则骰前422，无骰子或状态损失。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-030 | 单人已核验 | SHA-256绑定完整事前评估、选卡、公式；改动后拒绝结算。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [gdd.test.mjs](../tests/gdd.test.mjs) |
| T-031 | 部分覆盖 | NPC团队一张直接失牌；3:1:1精确抽样验证。权重未定稿，真人公共事务未实现。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [gdd.test.mjs](../tests/gdd.test.mjs) |
| T-032 | 部分覆盖 | NPC合作同意与机遇花费同意分离；真人同时授权竞态待联机。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [gdd.test.mjs](../tests/gdd.test.mjs) |
| T-033 | 测试方案已核验 | 先100再20可保留成功，只结算一次，无首次惩罚残留。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-034 | 测试方案已核验 | 首次已成功不能使用机遇追01。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-035 | 部分覆盖 | 验证机遇ID/归属/先前回合，语义关联交MiniMax判断；未完成大量异目标基准评测。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-036 | 部分覆盖 | 每位NPC合作者可分别记录personId/成就；实际真人合作和文学质量仍待验收。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-037 | 单人已核验 | 按不同卡名数而非等级数判定生存。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-038 | 单人已核验 | 父母不能进入普通自由事件风险池。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-039 | 单人已核验 | 只有骰前许可且父母仍健在/有卡才可自愿代偿；文案说明不等于死亡。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-040 | 单人已核验 | 骰后不能创建父母代偿资格。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-041 | 单人已核验 | 支持耗尽与真实离世分开；已离世分支不会再次写死亡或扣卡。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [gdd.test.mjs](../tests/gdd.test.mjs) |
| T-042 | 单人已核验 | parentsAlive为false时禁止代偿，即使遗留错误状态仍持牌。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [gdd.test.mjs](../tests/gdd.test.mjs) |
| T-043 | 测试方案已核验 | 已有快乐不升级/重复发；共享同一个孩子实体。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-044 | 测试方案已核验 | 双方各处理孩子和快乐，人物实体只建一次；满手分别处理。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-045 | 测试方案已核验 | 孩子、快乐后续独立变化。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-046 | 测试方案已核验 | 先失家庭，再各抽合法非孩子牌。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-047 | 测试方案已核验 | 按离婚损失后的快乐状态分配主要抚养。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-048 | 测试方案已核验 | 双方无快乐默认共同抚养，卡不自动恢复，孩子未死亡。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-049 | 测试方案已核验 | 按bornAge算实际年龄，未成年不强制离家；早育成年可提前独立且不重复扣。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [gdd.test.mjs](../tests/gdd.test.mjs) |
| T-050 | 测试方案已核验 | 普通失孩子不扣快乐；未确认的重大亲子连锁默认关闭。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [gdd.test.mjs](../tests/gdd.test.mjs) |
| T-051 | 单人已核验 | 升级保留已用次数；I用1次后II仍剩1次。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-052 | 测试方案已核验 | 真实失去再合法重新获得可重置；转移不作为重获。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-053 | 测试方案已核验 | 有效婚姻健康自动共享，先自用再配偶；每卡记录实际花费者。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-054 | 测试方案已核验 | 同回合先收集夫妻双方独立骰，两份可用则扣两份。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [gdd.test.mjs](../tests/gdd.test.mjs) |
| T-055 | 测试方案已核验 | 同回合两人均符合，合计最后1次可救双方，并留共同记录。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [gdd.test.mjs](../tests/gdd.test.mjs) |
| T-056 | 测试方案已核验 | 同回合批次结算；spent跨回合保留，不能复用。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [gdd.test.mjs](../tests/gdd.test.mjs) |
| T-057 | 测试方案已核验 | 离婚即停止共享，前配偶次数不被借用。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [gdd.test.mjs](../tests/gdd.test.mjs) |
| T-058 | 测试方案已核验 | 非健康类事件不消耗健康，不触发劫后余生。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [gdd.test.mjs](../tests/gdd.test.mjs) |
| T-059 | 部分覆盖 | 新增factIds、factsCheck和来源哈希；生死等状态错误会拒绝。自由文学文本仍需人工抽验，不宣称语义100%正确。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [gdd.test.mjs](../tests/gdd.test.mjs) |
| T-060 | 待实现联机 | 暂无真实多人及各真人私有传记。  |
| T-061 | 部分覆盖 | 保存原目标、每次结果、未竟尝试和事实来源；文学是否妥善表达遗憾仍需语义抽检。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [gdd.test.mjs](../tests/gdd.test.mjs) |
| T-062 | 测试方案已核验 | 死亡也保留成就并可生成七章；死亡路径完整阅读在测试覆盖。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-063 | 单人已核验 | 完整事实和AI传记均无付费墙。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [game.js](../game.js) |
| T-064 | 单人已核验 | 摘要只导出本人结局、本人特殊成就和典藏；暂无向外自动分享行为。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) [game.js](../game.js) |
| T-065 | 待实现商业化 | 未接激励广告/权益核销/无填充回退，不能显示假广告解锁。  |
| T-066 | 待实现商业化 | 未接订单、支付、PDF排版与下载权益，不伪造完成。  |
| T-067 | 测试方案已核验 | 当前测试从最终结算起48小时；过期不可读，定时实际清理状态和全部故事回执。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |
| T-068 | 待实现联机 | 无真实多人隐私权限与公共导出，不宣称通过。  |
| T-069 | 待实现联机 | 单人已可恢复/防重试；真实房间恢复与同步尚未实现。  |
| T-070 | 部分覆盖 | 主角/NPC/孩子使用稳定ID，AI不能新增参与者；局中改名和真人别名转换未做。 [life.test.mjs](../tests/life.test.mjs) [life-api.test.mjs](../tests/life-api.test.mjs) |

## 26项未决台账

这些项目仍保持 open。下表写的是预览默认处理，不是替用户永久拍板。

| 决策 | 当前预览处理/仍欠缺内容 |
|---|---|
| O-01 | 固定事件数组驱动当前9回合，开局只抽卡；不将9回合升格为正式设计。 |
| O-02 | 候选nearest-integer，exact值留档；同一整数用于显示、成功和50%门槛。 |
| O-03 | 整场无候选骰前阻断；部分成员无候选时排除该成员重分权重，仅为测试处理。 |
| O-04 | 发起者3、合作者各1，版本化候选。 |
| O-05 | 普通成功每人最多1张；满7格显式放弃或替换；必要家庭选择须腾位。 |
| O-06 | 同回合先收集夫妻骰→自动健康→自愿父母→承受损失/已批准联动；正式优先级仍未定。 |
| O-07 | 普通I→II→III，III后仍III；默认整张失去。第四次转换未定。 |
| O-08 | 父母/家庭/孩子暂不升级，爱情按普通卡；健康III暂与II同2次，均非定稿。 |
| O-09 | 借配偶计入本人2卡；不多加人数，同卡去重；真人配偶额外参与资格未定。 |
| O-10 | 双方用爱情或各一张普通卡转换家庭，系统人物同意记录；正式双人方案仍未定。 |
| O-11 | 离婚暂排除孩子/家庭；空池不凭空扣卡；白名单仍待确认。 |
| O-12 | 当前只支持本局一个孩子、有效婚姻生育；多人/多胎/未婚育儿未实现。 |
| O-13 | 重大亲子连锁默认关闭，白名单确认后才可启用；普通失孩子不连扣快乐。 |
| O-14 | 按出生年龄算，成年18为测试值；可提前独立，未成年/已独立/无孩子均有分支。 |
| O-15 | 夫妻黑天鹅统一收集并一次结算，最后1份稀有保护已测；其他复合条件继续保留为候选。 |
| O-16 | 后续用户明确不要正向奖励，因此不恢复文档参考的好运；01–65静、66–100厄运仍是测试分布。 |
| O-17 | 机遇个人持有、后续相关事件首次失败、自愿且一场一次；NPC另有花费同意。库存上限/多人竞争顺序未定。 |
| O-18 | 本局按personId保存事件成就，死亡保留；未做跨局永久收集。 |
| O-19 | 普通卡可转赠/交换，健康按真实剩余次数合并，未知方向请求被拒绝；未建商业股权/分红系统。 |
| O-20 | 固定3个NPC候选，各有年龄/教育/职业/资源/行动；固定婚恋为系统角色规则，尚无通用社交规划器或NPC数量设置。 |
| O-21 | 无真实房间，超时、退出与真人取消策略整体待联机设计。 |
| O-22 | 单人NPC资料无真人隐私；预先风险概况、事后可按需核验。真人可见性仍待定。 |
| O-23 | 逐卡reason由AI提供并校验；分数由程序；尚需30–50组语义匹配质量基准。 |
| O-24 | 不加理想七张胜负规则；保留为候选产品增强。 |
| O-25 | 界面中英文均为临时项目名称；正式品牌/素材/IP核验未完成，不宣称正式商业发行。 |
| O-26 | 免费完整阅读/摘要、当前48h终局起算已实现；广告、订单、PDF、权益恢复待接入，不提供假成功。 |

## 仍不能宣称完成的部分

真实多人房间、真人邀请与最终确认、统一房间屏障、断线超时、多人故事隐私，仍待实施。广告权益、订单支付、精装PDF及失败恢复，仍待接入。正式品牌、素材/IP核验与所有未决规则不属于本次自动批准。

M0/M1/M2为单人预览层面的实现与核验；M3未实现；M4已有七章、来源与未竟尝试，但文学质量基准和真人私密视角仍未完成；M5仅免费摘要/48小时清理部分已做。

机器可读映射见 [development-audit.json](development-audit.json)。运行 `node scripts/verify-gdd-audit.mjs` 检查70/26覆盖与证据路径；运行 `npm test` 执行规则/API回归；真实模型合同验收用 `node scripts/verify-gdd-live.mjs` / `--en`。
