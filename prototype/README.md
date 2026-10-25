# 命运之书 · Three.js 交互样章

独立试玩入口：<https://335083474.github.io/life-seven-game/book/>

这次交付用于评审桌面构图、材质、开书、弯曲翻页、选卡与掷骰。它不使用正式游戏的存档、规则引擎、MiniMax、广告或支付接口。三个目标及其短故事是演示内容，不能当成已经确认的完整规则。

## 本地开发

在仓库根目录执行：

```sh
npm ci --prefix prototype
npm run dev --prefix prototype
npm test --prefix prototype
npm run build --prefix prototype
```

Vite 使用 127.0.0.1:8770。构建输出写入独立的 `book/`，供现有静态 GitHub Pages 发布。正式游戏的根入口不变。

## 实现边界

- Three.js 0.186.1，原生 TypeScript；游戏状态与场景分开。
- 主书使用 [Book — victorberdugo1](https://sketchfab.com/3d-models/book-7f702789fd444ad3b1c4cb3987d955fc)（CC BY 4.0），保留原作羊皮纸、装饰封面和金属细节。烛台、怀表、百科旧书、桌面材质及 HDR 环境来自 Poly Haven（CC0）。卡面由原书纹理和原创排版组合；骰子加载授权模型。
- 原主书是静态模型。本项目保留纹理和命名部件，按书脊拆分网格并添加铰接开合，另建可弯曲的翻页网格；没有把原作描述为自带动画。模型使用 Meshopt、WebP 压缩，实际来源、修改和文件 SHA256 见 `public/assets/manifest.json`。
- 卡面复用主书原作的羊皮纸和装饰边框（同属 CC BY 4.0 衍生），叠加原创中文排版与元素图标。骰子默认使用下述古铜雕刻套装；原回退骰子改编自 [Pointy Metal/Crystal Dice — Tenshinzo](https://sketchfab.com/3d-models/pointy-metalcrystal-dice-a4f0e91b8cad44a682f09d9bae14c114)（CC BY 4.0），加载独立 GLB 的实体数字和骰身，缩短轴向比例，增加铜框、卷草浮雕、宝石端帽与深色金属材质。两份 GLB 合计约220KB，来源与原文件哈希见资产记录。
- “骰子外观”可预览、拖动旋转和缩放。独立预览只在打开时渲染。D100 保留十位和个位两枚骰子，20个原模型数字面经过校准，结算和骰面朝向分开处理；选中卡仍以抬升和书页中的槽位反馈。
- 封面独立铰接；书页用分段网格变形，不是整张平面绕轴旋转。正文使用与摄像机同步的 CSS3D DOM，可选择、可使用键盘操作。
- 桌面显示双页，390×844 手机竖屏聚焦右页并将卡牌分两排。书内采用手抄卷册排版：书法章题、文楷正文、棕黑墨色、朱砂印记、星盘版画和中文页码；选项与掷骰作为页内批注呈现。
- 字体本地加载：标题由 Ma Shan Zheng、正文由 LXGW WenKai 制作样章字符子集，均遵循 SIL OFL 1.1，并重命名为 Fate Archive Display / Body。两份 WOFF2 合计约311KB；完整许可证、原字体哈希和来源随站点提供。可用 `python prototype/scripts/prepare-book-fonts.py` 在增改文案后重建子集；未包含字符回退到系统楷体。页面文字、卡面与翻页纹理使用相同字体。
- 两枚十面骰分别表示十位和个位，00 与 0 记为100。先用加密随机数和拒绝采样确定 D100，再搜索实际落在对应骰面的 Rapier 刚体轨迹并按120Hz记录回放。重力、摩擦、碰撞与角阻尼决定转动和休眠，不在最后强改朝向。
- 只允许选两张卡，掷骰期间锁定操作，结果不能在同一轮重掷。Ⅰ级与Ⅱ级贡献、三个目标的匹配度都为演示参数。
- 支持开关声音、左右方向键、Escape 合书、帮助与重新开始；尊重减少动态效果偏好，后台停止渲染，静止场景以24fps更新烛光和钟针。像素比上限1.6。投掷时保持镜头稳定，结果落定后停顿、翻页并逐渐显出文字。
- 不承诺所有手机的帧率；尚未在真实 iOS/Android 设备上验收，也未对外部正式 AI API 做联调。

Three.js 的 MIT 许可和美术署名随构建附于 `THIRD_PARTY_NOTICES.txt`，帮助窗口也有可见署名。`scripts/prepare-assets.mjs` 从本机保留的原始下载生成压缩文件；原始下载不随站点发布。`scripts/asset-manifest.mjs` 更新发布资产的哈希记录。

## 验证

状态单元检查覆盖两张卡上限、未知卡拒绝、加密随机数拒绝采样边界、单次结算锁定，以及成功/大成功/大失败边界。浏览器人工操作检查覆盖桌面和手机竖屏的开书、翻页、选卡、掷骰与结果；结果页数字与两枚骰子对应。


## 骰子外观选择（2026-10-26）

- “骰子外观”统一提供古铜雕刻选用与暗色符文预览。默认使用古铜雕刻；成功选用后记住外观。外观加载失败时保留原有可用骰子并允许重试。
- 古铜雕刻使用 Felipe Carim (Capygon) 的原始 d10 与百分骰，CC BY 4.0，原作纹理和雕刻保留。运行 `node prototype/scripts/prepare-dice-skins.mjs bronze` 复现；配置中的20个数字面已经视觉校准。
- 暗色符文使用 JayDesigns3D 原作百分骰，CC BY 4.0；明确标为“仅供预览 · 待补齐”，不替换桌面骰子、不保存为可玩外观。需补齐个位骰并完成数字标定后才能开放选用。
- 原始下载和来源哈希保留在忽略目录 artifacts/dice-skins/source，发行资源和署名见 public/assets/dice-skins.json 与 manifest.json。不提交临时签名下载地址。
- /calibrate.html 是开发用逐面核对工具；rune-audit.html 为原作检查页。两者不进入 Vite 发布入口。
- 发布检查：构建通过，14项测试通过，覆盖48条物理轨迹、未完成外观禁止选用、存储不可用与刷新恢复。桌面及390×844手机视角已核验预览和实际投掷。


### 暗色符文模型检查（2026-10-25）

用户下载的原始 GLB 已收到，并保存在忽略目录 `artifacts/dice-skins/source/rune/original.glb`；源文件未修改。原包中的 `d10` 实际为 00–90 百分骰，不包含配套 0–9 个位骰。`prepare-dice-skins.mjs rune` 目前只输出用于检查的 `percentile`，不是可发布的整副骰子。已转换旧 Specular/Glossiness 材质、修正发白的 IOR 和几乎不透明的混合模式。部分连体刻字不能简单删除末尾零来获得完整个位字形。

物理检查：使用两份同一百分骰几何做碰撞检查（并非声称原包有两颗），12 条指定面轨迹通过；最终游戏数字映射尚未冻结。暗色符文目前只开放预览；补齐配套个位骰后才能选用。独立审查预览：`rune-audit.html`。
