# 订婚计划安排

宁忠瑞与吴南的订婚筹备网页。第一阶段包含首页和共享宾客名单，页面适合电脑及 iPad 横屏使用。

本目录是网页工程根目录；同级的 `welcome_board/` 预留给迎宾展板，当前不参与网页构建。

## 已完成

- 首页：封面照片、订婚标题、姓名、日期和酒店地图；酒店名称可打开高德地图。
- 宾客名单：男方/女方分栏，列表自然增高，不使用内部滚动条。
- 宾客操作：添加、回车保存、空白校验、删除确认、保存失败时保留输入。
- 共享同步：使用 Supabase Postgres + Realtime，所有拿到网址的人无需登录即可读取、新增、删除。
- 导航：首页、宾客名单、物料准备、议程安排、主持词已实现；人员安排暂显示“正在准备中”。
- 物料准备：衣物、装饰摆件、文案、其他四类共享物料，支持直接编辑、状态、删除和 Realtime 同步。
- 议程安排：共享时间表，支持直接编辑、删除、触摸友好的拖拽排序和排序同步。
- 主持词：共享 Markdown 编辑器，左右实时预览、自动保存、Realtime 同步和安全 HTML 清理。

## 技术与结构

项目使用 Vite、原生 JavaScript、CSS 和 Supabase JS 客户端。新增 `sortablejs` 用于鼠标/iPad 触摸排序，`marked` 用于 Markdown 解析，`dompurify` 用于渲染结果清理。

```text
src/
├── components/
│   ├── cover/cover.js          # 顶部封面
│   ├── map/map.js              # 高德地图加载与占位
│   ├── navigation/navigation.js
│   ├── delete-dialog/delete-dialog.js
│   └── table/table.css
├── css/global.css
├── js/
│   ├── app.js                  # hash 页面切换
│   ├── config.js               # 活动、Supabase、高德配置
│   ├── guest-store.js          # 宾客云端读写、Realtime、重连
│   ├── supabase-client.js      # 唯一 Supabase client 和通用表 store
│   ├── materials-store.js
│   ├── schedule-store.js
│   ├── host-script-store.js
│   └── guest-validation.js
├── pages/
│   ├── home/{home.html,home.css,home.js}
│   ├── guests/{guests.html,guests.css,guests.js}
│   ├── materials/{materials.html,materials.css,materials.js}
│   ├── schedule/{schedule.html,schedule.css,schedule.js}
│   └── host-script/{host-script.html,host-script.css,host-script.js}
└── photos/cover.png
config/
└── .env.example                # 环境变量模板
.github/workflows/
└── deploy-pages.yml             # GitHub Pages 自动部署
supabase/schema.sql              # 数据表、权限和 Realtime 设置
```

## 本地运行

需要 Node.js 18 或更新版本。项目已包含依赖锁文件：

```bash
cd website
pnpm install
pnpm dev
```

然后打开终端显示的本地网址。生产构建：

```bash
pnpm build
pnpm preview
```

也可以复制 `config/.env.example` 为项目根目录的 `.env.local`，填写配置。附件中提供的 Supabase URL 和 publishable key 已作为默认值写入配置，前端没有使用管理员 service role key。

## Supabase 配置

`supabase/schema.sql` 包含 `public.guests`、`public.materials`、`public.schedules` 和 `public.host_script` 四张表，并为新模块授予公开 `anon` 角色读取、新增、修改、删除权限，同时启用 Realtime。宾客名单仍保持第一阶段的只读、新增、删除权限。

若以后新建 Supabase 项目：

1. 打开该项目的 SQL Editor。
2. 运行 `supabase/schema.sql`（脚本可重复运行）。
3. 在 `.env.local` 中设置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`。

公开名单意味着任何拿到网址的人都能修改名单，这是本项目的有意设计。不要把 service role key 放到浏览器或 `.env` 中提交到 Git。

## 地图配置

酒店信息在 `src/js/config.js` 的 `eventConfig.hotel` 中修改，当前已配置为喜雁之约宴会酒店：

```js
hotel: {
  name: '喜雁之约宴会酒店',
  address: '枣庄市市中区人民西路21号',
  longitude: 117.523382,
  latitude: 34.830948,
}
```

高德 Web JS API Key 和安全密钥通过环境变量提供，不写入仓库；请在高德控制台限制允许的域名。自定义样式 ID 已配置，设置 `VITE_AMAP_KEY` 后地图会优先使用高德 JS API 并应用该样式。公开页内置了一张按该样式生成的高德地图底图，因此即使没有部署 Key 也能看到自定义样式；配置 Key 后会升级为可交互地图。安全密钥可通过 `VITE_AMAP_SECURITY_JS_CODE` 放在未提交的 `.env.local`，或使用 `VITE_AMAP_SERVICE_HOST` 代理。GitHub Pages 工作流只读取 Key、样式 ID 和代理地址，不把安全密钥注入公开构建；如果 Key 强制要求安全密钥，请配置代理。地图下方只显示酒店名称，链接使用高德 URI API：电脑打开网页，手机尝试唤起高德 App，未安装时继续使用网页。

本机的 `config/amap_web_js_api_key.json` 仅用于保存密钥，已加入忽略规则，不会被提交；其中的 `password` 不应复制到前端代码。

## Git 与部署

源代码仓库：`https://github.com/ZhongruiNing/engagement_plan`。提交和推送：

```bash
git add .
git commit -m "feat: build engagement plan home and guest list"
git push github main
```

Gitee 目前只作为源代码仓库使用，Gitee Pages 有暂停服务记录。当前 Sites 地址可能被 Cloudflare 安全策略拦截，因此不作为稳定公开入口。

Supabase 继续负责宾客数据，不作为网页托管：Supabase Storage 的公开 URL 适合图片等静态资源，但 HTML 文件会按纯文本返回，不能直接替代 GitHub Pages。

仓库已包含 `.github/workflows/deploy-pages.yml`。将代码推送到一个公开 GitHub 仓库后，在仓库 Settings → Pages 中选择 GitHub Actions，工作流会自动构建并发布到：

```text
https://<你的 GitHub 用户名>.github.io/<仓库名>/
```

本项目当前已启用 GitHub Pages，公开网址是：

```text
https://zhongruining.github.io/engagement_plan/
```

直接把上面的地址粘贴到 Chrome、Edge 或 Safari 地址栏即可查看；以后推送到 `main` 分支后，GitHub Actions 会自动重新发布。

`package.json` 和 `pnpm-lock.yaml` 必须留在 `website/` 根目录，GitHub Actions 已从该目录安装依赖并构建。`website/.openai/hosting.json` 只用于管理旧的 Sites 项目，已从网页构建内容中隔离；如果以后仍需 Sites 管理则保留即可。

## 第二阶段模块说明

### 物料准备

四个分类共用 `materials` 表：`category`、`name`、`remark`、`status`、时间字段。首次没有数据时只显示表头；添加、编辑、状态变化和删除都直接写入 Supabase，并通过 Realtime 通知其他页面。列表使用自然增长布局，没有内部垂直滚动条。

### 议程安排

`schedules` 表保存 `time`、`content`、`remark` 和 `sort_order`。行可以直接编辑、删除，也可以用鼠标或触摸手柄拖拽排序；排序完成后保存到 `sort_order`，刷新后仍按该字段显示。

### 主持词

`host_script` 使用固定 UUID 保存唯一共享文稿。左侧编辑 Markdown，右侧实时预览；输入停止约 800ms 后自动保存。`marked` 关闭原始 HTML，`DOMPurify` 再清理 HTML，避免主持词内容执行脚本。普通 Realtime 更新会同步到其他页面；多人同时编辑时采用最后一次保存覆盖的协作模型。

## 后续修改位置

- 首页文字、日期、酒店：`src/js/config.js`。
- 封面照片：`src/photos/cover.png`。
- 颜色、字体、布局：`src/css/global.css` 及对应页面 CSS。
- 宾客数据：通过网页操作，数据保存在 Supabase，不要改用 localStorage。
- 新增模块：在 `src/pages/` 创建自己的 HTML/CSS/JS，在 `src/js/app.js` 注册路由，再在 `src/components/navigation/navigation.js` 添加导航项。
