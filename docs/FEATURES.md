# MermaidApp — 已完成功能汇总（本地记忆）

本文档汇总当前项目中已实现的功能，便于后续维护与迭代时快速回顾。

---

## 一、项目概览

- **技术栈**：Next.js、TypeScript、TailwindCSS、shadcn/ui、Zustand、Supabase、Mermaid、CodeMirror
- **路由**：`/dashboard` 仪表盘，`/project/[id]` 渲染页，`/project/[id]/edit` 编辑页，`/share/[shareId]` 分享页，`/login`、`/register` 认证

### AI 设置（本地、按账号）

- **Endpoint、API Key、Model** 保存在浏览器 **localStorage**，键：`mermaidapp:ai:v1:{Supabase user id}`（`lib/ai-local-settings.ts`）。
- **`AiSettingsHydrator`**（根 `app/layout.tsx`）在登录 / 切换账号时从本地恢复进 `useAiStore`；若本地无数据，再请求 **`GET /api/ai/settings`** 仅补 **endpoint + model**（便于从旧服务端配置迁移，**Key 需重新填一次**）。
- **`AISettingsDialog`** 保存时只写 localStorage + 更新 store，**不再把 API Key POST 到服务器**；未登录时提示先 Sign in。
- **`POST /api/ai/generate`**：请求体可带 `api_endpoint`、`api_key`、`model`（由 `AIPanel` 从 store 传入）。若未带 key，则回退读数据库 `ai_settings`（兼容历史数据）。
- **多轮对话**：请求体可带 **`conversation`**：`{ role: "user" | "assistant", content: string }[]`（最后一轮须为 `user`），服务端在前面拼接系统提示（`lib/ai/system-prompt.ts`）后调用兼容 OpenAI 的 `chat/completions` 流式接口；仍兼容仅传 **`prompt`** 的单轮调用。AI 面板展示会话气泡（可 **Clear** 清空），流式过程中同步更新画布 code。

---

## 二、画布与图表

### 2.1 缩放与拖拽

- **默认缩放**：图表默认缩放为 **1.5**（`DEFAULT_SCALE`），Fit 重置也恢复为 1.5。
- **缩放方式**：仅 **Ctrl + 滚轮** 可缩放图表；未按 Ctrl 时滚轮为页面滚动。
- **阻止浏览器缩放**：画布区域通过原生 `wheel` 监听且 `passive: false`，在 Ctrl+滚轮时 `preventDefault()`，避免浏览器整页缩放。
- **无滚动条**：画布使用 `overflow-hidden`，缩放后不出现横向/纵向滚动条；大图通过**拖拽**查看。
- **拖拽开关**：仅当顶部工具栏中**手势图标（Hand）**处于选中状态时，画布才支持拖拽；未选中时为默认光标、不响应拖拽。
- **记住视图**：编辑页与查看页（`/project/[id]`、`/project/[id]/edit`）按**图表 ID**将当前**缩放与平移**写入 `localStorage`（`lib/canvas-view-storage.ts`）；再次进入同一图表时自动恢复。离开路由、切到后台标签页或关闭页面前会保存。
- **右下角工具条（参考胶囊分组 UI）**：浅薄荷绿底 `bg-[#ecfdf5]`、圆角胶囊、竖线分组 — **撤销 / 重做**（视图：缩放 + 平移历史）、**缩小 / 放大 / 重置视图**（ScanSearch）、**全屏**。滚轮缩放 350ms 防抖入栈；平移在指针抬起且位移变化时入栈。

### 2.2 顶部工具栏（CanvasTopToolbar）

- **位置**：画布**顶部居中**（`left-1/2 top-4 -translate-x-1/2`）。
- **内容**：左侧手势图标（切换 pan 模式） + 竖线分隔 + 右侧主题选择（ThemeSelect）。
- **样式**：浅蓝圆角条（`bg-sky-50/90`、`border-sky-200/80`）。
- **使用场景**：渲染页、编辑页预览区、**分享页**（`/share/[shareId]`）均使用该工具栏；分享页与 `DiagramCanvas` 组合，支持 **Ctrl+滚轮缩放、手势拖动、右下角全屏/撤销重做**（与项目画布一致，不按图表 ID 持久化视图）。

### 2.3 主题

- 主题选项来自 `store/canvasStore`（Neo、Neo Dark、Redux、Redux Color 等），通过 ThemeSelect 切换，画布与 Mermaid 主题联动。
- **默认主题**：**Redux**（`useCanvasStore` 初始 `theme: "redux"`，对应 Mermaid 内置 `default` 主题）。

---

## 三、渲染页 `/project/[id]`

- **布局**：顶栏（面包屑、Export 下拉：PNG / SVG / .mmd、Share）+ 全屏画布 + 顶部居中 CanvasTopToolbar。
- **代码面板**：左下角「Edit Code」打开 **FloatingCodePanel**（Code / Use AI 双 Tab）；关闭时若代码有变更会 PATCH 保存。
- **FloatingCodePanel**：CodeMirror 编辑 + Use AI（AIPanel）；支持 `onBlur`（失焦保存）、`onAfterCodeGenerated`（**仅在整轮 AI 流式生成结束后** PATCH 一次，流式过程中只通过 `onCodePreview` 更新 code 预览）。
- **渲染页 AI 生成后**：`onAfterCodeGenerated={saveCodeWith}` 在**生成完成**后 PATCH，不在流式过程中反复保存。

---

## 四、编辑页 `/project/[id]/edit`

### 4.1 布局

- **左侧边栏**：History / AI 两个 Tab（HistoryPanel、AIPanel）。
- **主区**：顶栏（Dashboard 链接、项目名、View 按钮）+ Toolbar（Save、Export、Share、AI Settings）+ 预览区 + **代码弹窗**。

### 4.2 代码弹窗（默认打开）

- **默认状态**：进入编辑页后**默认打开**代码编辑弹窗（`codePanelOpen` 初始为 `true`，且在 `loaded` 后再次设为 `true` 以保证显示）。
- **位置与尺寸**：弹窗**垂直居中**，高度约 **85vh**（`h-[85vh] max-h-full`），宽度 `max-w-[520px]`，整体在内容区居中。
- **内容**：FloatingCodePanel（Code / Use AI），`variant="fill"` 填满弹窗容器。
- **关闭后**：左下角显示「Code」按钮，点击可再次打开弹窗。

### 4.3 项目名与保存

- **双击项目名**：可进入内联编辑，失焦或 Enter 保存（PATCH + store 更新），Escape 取消；`title="Double-click to edit name"`。
- **代码失焦自动保存**：FloatingCodePanel 的 `onBlur` 绑定 `handleSave`；仅当 `isDirty` 时执行 PATCH，避免无效请求。
- **AI 生成后自动保存**：FloatingCodePanel 将 `onCodePreview` 绑定 `onCodeChange`（流式预览）、`onCodeGenerated` 绑定 `onAfterCodeGenerated`（完成后**一次** PATCH）。

### 4.4 其他

- 导出 **PNG / SVG / Mermaid 源码（`.mmd`）**、分享、AI Settings 等与 Toolbar 和左侧 AI 面板联动；预览区使用 DiagramCanvas + CanvasTopToolbar。`.mmd` 为 UTF-8 纯文本，文件名基于图表标题（非法字符会替换为 `_`），逻辑见 `lib/export-mermaid.ts`。

---

## 五、EditorPageClient（独立编辑页）

- 左侧 History / AI Tab，主区 Toolbar + 左侧 MermaidEditor + 右侧 MermaidPreview。
- **MermaidEditor**：支持可选 `onBlur`，失焦时调用父级传入的保存逻辑（如 `handleSave`）；仅当 `isDirty` 时保存。
- **AIPanel**：`onCodePreview={setCode}`（流式更新）+ `onCodeGenerated={handleSaveWithCode}`（整轮结束后**一次**保存）。

---

## 六、Dashboard

- 项目列表网格、相对时间显示（英文：Just now, min ago, hr ago, days ago）。
- 「New diagram」创建新图表（POST 后跳转编辑页）。
- ProjectCard：缩略图、标题、时间、Open、Share、更多菜单（Edit diagram details、Duplicate、Fullscreen、Delete diagram）；编辑标题对话框（Title、Cancel、Save）；复制/删除等 toasts。

---

## 七、国际化与文案

- **按钮与菜单**：已统一为英文（Save、Export、Share、AI Settings、Code、Dashboard、History、Sign out、Cancel、Loading…、Saved、Share link copied 等）。
- **Toasts**：成功/失败提示均为英文。
- **相对时间**：`lib/relative-time.ts` 使用英文（Just now, min ago, hr ago, days ago），日期 `toLocaleDateString("en-US")`。
- **API 错误信息**：如 AI 生成接口的错误文案为英文。

---

## 八、自动保存策略汇总

| 场景           | 触发方式           | 实现位置 / 说明 |
|----------------|--------------------|------------------|
| 代码失焦       | 代码编辑区 onBlur  | FloatingCodePanel 容器 onBlur → `onBlur`（编辑页/渲染页）；MermaidEditor onBlur → `handleSave`（EditorPageClient）；保存前检查 `isDirty` 或等价逻辑。 |
| AI 生成完成    | 流式结束    | AIPanel：`onCodePreview` 更新 code；`onCodeGenerated` **仅结束时**调用一次 `onAfterCodeGenerated` / `handleSaveWithCode`（不再每 chunk 保存）。 |
| 关闭代码面板   | 渲染页关闭面板时   | `handleClosePanel` 内调用 `saveCode()`，若有变更则 PATCH。 |

---

## 九、关键文件索引

| 功能           | 主要文件 |
|----------------|----------|
| 画布缩放/拖拽  | `components/canvas/DiagramCanvas.tsx`，`store/canvasStore.ts`（panMode），`lib/canvas-view-storage.ts`（视图持久化） |
| 顶部工具栏     | `components/canvas/CanvasTopToolbar.tsx` |
| 主题选择       | `components/canvas/ThemeSelect.tsx`，`store/canvasStore.ts` |
| 浮动代码面板   | `components/project/FloatingCodePanel.tsx` |
| 编辑页         | `components/project/ProjectEditClient.tsx`，`app/project/[id]/edit/page.tsx` |
| 渲染页         | `app/project/[id]/page.tsx` |
| 独立编辑页     | `components/EditorPageClient.tsx` |
| 代码编辑器     | `components/editor/MermaidEditor.tsx` |
| AI 面板/设置   | `components/ai/AIPanel.tsx`，`components/ai/AISettingsDialog.tsx`，`components/ai/AiSettingsHydrator.tsx`，`lib/ai-local-settings.ts` |
| 历史           | `components/history/HistoryPanel.tsx` |
| 相对时间       | `lib/relative-time.ts` |

---

## 十、常量与配置（便于查找）

- **画布默认缩放**：`DEFAULT_SCALE = 1.5`（`DiagramCanvas.tsx`）
- **缩放范围**：`MIN_SCALE = 0.2`，`MAX_SCALE = 4`，`SCALE_STEP = 0.25`
- **编辑页代码弹窗高度**：`h-[85vh]`，容器 `max-w-[520px]`

---

*文档生成后可根据后续迭代继续在本文件中增补或修改条目，作为项目本地记忆使用。*
