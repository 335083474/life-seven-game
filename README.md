# 逆转人生 · 命运档案馆

从七岁开始，经历七个人生阶段的网页视觉交互原型。

## 运行

试玩：https://335083474.github.io/life-seven-game/

使用静态 HTTP 服务打开 `index.html`。网页连接独立的 Cloudflare Worker；MiniMax 密钥仅保存在服务端 Secret 中。

```sh
python -m http.server 8767
```

## 当前能力

- 初始卡牌、固定事件、自由事件与 D100 演示
- 黑天鹅、卡牌成长、人生手记、传记文字下载
- 桌面和手机布局

## MiniMax 命运司书

- 自由事件：输入行动、选择最多两张元素，点击“请司书评估”，阅读难度、卡牌匹配及成功率，再确认掷骰。
- 服务端依照原型的固定公式计算成功率，以加密随机数生成 D100；MiniMax-M3 只评价语义与撰写叙事，不能指定概率或骰点。
- 同一评估的骰点持久保存，网络错误后重试不会重新掷骰。失败不会伪装成本地 AI 回应。
- 人生传记页可点击“请司书撰写传记”，依据本局手记生成，支持复制和文字下载。
- 当前公开试玩每天最多 200 次模型调用，每个会话每天 30 次、每个 IP 每分钟 6 次；评估、叙事、传记各占一次。额度耗尽时明确停用 AI。
- 行动、投入元素与本局手记会发送至 MiniMax。服务端临时记录默认保存 24 小时，按日清理，不保存原始 IP；密钥和完整模型响应不写入日志。

这仍是规则原型：卡牌获取、黑天鹅及合作加成保留原型行为，完整权威存档、真实多人、完整奖惩规则、支付与广告未接入。浏览器中的游戏数据刷新后重置。

## 服务端维护

需要 Node 22+、Cloudflare 的 Workers/D1 权限及自己的 MiniMax 密钥：

```sh
npm ci
npm test
npm run migrate:remote
node scripts/configure-secrets.mjs
npm run deploy:api
```

配置位于 `backend/wrangler.jsonc`，复用时须更换 Cloudflare 账户和 D1 ID；前端接口地址位于 `ai-client.js`。配置密钥的脚本读取本机 mmx 已有配置，或 `AI_LIVE_MINIMAX_API_KEY` / `MINIMAX_API_KEY` 环境变量，通过标准输入传递，不写进文件或命令参数。不要将 `.dev.vars`、环境文件或 Wrangler 缓存提交到仓库。

接口：`POST /api/evaluate`、`POST /api/resolve`、`POST /api/biography`；请求使用每局随机 Bearer 标识。`GET /health` 只公开配置状态。评估和传记的 `requestId` 以及掷骰的 `assessmentId` 用于重试去重。错误、并发、跨会话访问、限流与概率边界均有自动化测试。

参考：[MiniMax 官方接口](https://platform.minimax.io/docs/api-reference/text-openai-api)、[Cloudflare Secret 配置](https://developers.cloudflare.com/workers/configuration/secrets/)。

原始文件来自 ChatGPT 对话“制作电子版游戏”中用户确认的网页视觉原型；发布时不改变设计和规则。
