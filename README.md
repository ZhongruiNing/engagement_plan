# 订婚计划安排

宁忠瑞与吴南的订婚筹备网页。第一阶段包含首页和共享宾客名单，页面适合电脑及 iPad 横屏使用。

## 已完成

- 首页：封面照片、订婚标题、姓名、日期和可配置的酒店地图占位。
- 宾客名单：男方/女方分栏，列表自然增高，不使用内部滚动条。
- 宾客操作：添加、回车保存、空白校验、删除确认、保存失败时保留输入。
- 共享同步：使用 Supabase Postgres + Realtime，所有拿到网址的人无需登录即可读取、新增、删除。
- 导航：首页、宾客名单已实现；人员安排、物料准备、议程安排、主持词暂显示“正在准备中”。

## 技术与结构

项目使用 Vite、原生 JavaScript、CSS 和 Supabase JS 客户端。

```text
src/
├── components/
│   ├── cover/cover.js          # 顶部封面
│   ├── map/map.js              # 高德地图加载与占位
│   └── navigation/navigation.js
├── css/global.css
├── js/
│   ├── app.js                  # hash 页面切换
│   ├── config.js               # 活动、Supabase、高德配置
│   ├── guest-store.js          # 云端读写、Realtime、重连
│   └── guest-validation.js
├── pages/
│   ├── home/{home.html,home.css,home.js}
│   └── guests/{guests.html,guests.css,guests.js}
└── photos/cover.png
supabase/schema.sql             # 数据表、权限和 Realtime 设置
tests/                           # 单元、浏览器和真实云端验收脚本
```

## 本地运行

需要 Node.js 18 或更新版本。项目已包含依赖锁文件：

```bash
pnpm install
pnpm dev
```

然后打开终端显示的本地网址。生产构建：

```bash
pnpm build
pnpm preview
```

也可以复制 `.env.example` 为 `.env.local`，填写配置。附件中提供的 Supabase URL 和 publishable key 已作为默认值写入配置，前端没有使用管理员 service role key。

## Supabase 配置

`supabase/schema.sql` 已在本项目中运行成功。它创建 `public.guests` 表，并仅授予公开 `anon` 角色读取、新增、删除权限，同时启用 Realtime；没有开放更新权限。

若以后新建 Supabase 项目：

1. 打开该项目的 SQL Editor。
2. 运行 `supabase/schema.sql`。
3. 在 `.env.local` 中设置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`。

公开名单意味着任何拿到网址的人都能修改名单，这是本项目的有意设计。不要把 service role key 放到浏览器或 `.env` 中提交到 Git。

## 地图配置

酒店信息在 `src/js/config.js` 的 `eventConfig.hotel` 中修改：

```js
hotel: {
  name: '酒店名称',
  address: '酒店地址',
  longitude: 116.3974,
  latitude: 39.9093,
}
```

填写高德 Web JS API Key 后，设置 `VITE_AMAP_KEY`。生产环境还应设置高德安全密钥代理地址 `VITE_AMAP_SERVICE_HOST`；不要把安全密钥直接暴露在静态网页。未配置时页面会显示优雅的地图占位和高德路线链接。

## 测试

```bash
pnpm test                         # 姓名校验
node tests/live.mjs               # 真实 Supabase 双客户端读写/Realtime 验收
pnpm test:ui                      # Chromium + WebKit 多尺寸 UI 测试
```

`tests/live.mjs` 只创建带唯一 ID 的临时记录，并在结束时删除；不会修改已有宾客。浏览器测试使用拦截的测试数据，不会污染云端。

## Git 与部署

源代码仓库：`https://gitee.com/ZhongruiNing/engagement_plan`。提交和推送：

```bash
git add .
git commit -m "feat: build engagement plan home and guest list"
git push origin main
```

Gitee Pages 当前有暂停服务记录，因此发布使用 Sites 静态托管；构建目录为 `dist/`，部署配置在 `.openai/hosting.json`。后续修改后重新构建、提交并发布即可。

## 后续修改位置

- 首页文字、日期、酒店：`src/js/config.js`。
- 封面照片：`src/photos/cover.png`。
- 颜色、字体、布局：`src/css/global.css` 及对应页面 CSS。
- 宾客数据：通过网页操作，数据保存在 Supabase，不要改用 localStorage。
- 新增模块：在 `src/pages/` 创建自己的 HTML/CSS/JS，在 `src/js/app.js` 注册路由，再在 `src/components/navigation/navigation.js` 添加导航项。
