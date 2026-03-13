# MermaidApp — 已完成功能汇总（本地记忆）

本文档汇总当前项目中已实现的功能，便于后续维护与迭代时快速回顾。

---

## 一、项目概览

- **技术栈**：Next.js、TypeScript、TailwindCSS、shadcn/ui、Zustand、Supabase、Mermaid、CodeMirror
- **路由**：`/dashboard` 仪表盘，`/project/[id]` 渲染页，`/project/[id]/edit` 编辑页，`/share/[shareId]` 分享页，`/login`、`/register` 认证

---

## 二、画布与图表

### 2.1 缩放与拖拽

- **默认缩放**：图表默认缩放为 **1.5**（`DEFAULT_SCALE`），Fit 重置也恢复为 1.5。
- **缩放方式**：仅 **Ctrl + 滚轮** 可缩放图表；未按 Ctrl 时滚轮为页面滚动。
- **阻止浏览器缩放**：画布区域通过原生 `wheel` 监听且 `passive: false`，在 Ctrl+滚轮时 `preventDefault()`，避免浏览器整页缩放。
- **无滚动条**：画布使用 `overflow-hidden`，缩放后不出现横向/纵向滚动条；大图通过**拖拽**查看。
- **拖拽开关**：仅当顶部工具栏中**手势图标（Hand）**处于选中状态时，画布才支持拖拽；未选中时为默认光标、不响应拖拽。

### 2.2 顶部工具栏（CanvasTopToolbar）

- **位置**：画布**顶部居中**（`left-1/2 top-4 -translate-x-1/2`）。
- **内容**：左侧手势图标（切换 pan 模式） + 竖线分隔 + 右侧主题选择（ThemeSelect）。
- **样式**：浅蓝圆角条（`bg-sky-50/90`、`border-sky-200/80`）。
- **使用场景**：渲染页、编辑页预览区均使用该工具栏。

### 2.3 主题

- 主题选项来自 `store/canvasStore`（Neo、Neo Dark、Redux 等），通过 ThemeSelect 切换，画布与 Mermaid 主题联动。

---

## 三、渲染页 `/project/[id]`

- **布局**：顶栏（面包屑、Export、Share）+ 全屏画布 + 顶部居中 CanvasTopToolbar。
- **代码面板**：左下角「Edit Code」打开 **FloatingCodePanel**（Code / Use AI 双 Tab）；关闭时若代码有变更会 PATCH 保存。
- **FloatingCodePanel**：CodeMirror 编辑 + Use AI（AIPanel）；支持 `onBlur`（失焦保存）、`onAfterCodeGenerated`（AI 生成后保存）。
- **渲染页 AI 生成后**：通过 `onAfterCodeGenerated={saveCodeWith}` 在生成完成后自动 PATCH 保存当前 code。

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
- **AI 生成后自动保存**：FloatingCodePanel 的 `onAfterCodeGenerated` 绑定 `handleSaveWithCode(newCode)`，用新生成的 code 直接 PATCH 保存。

### 4.4 其他

- 导出 SVG/PNG、分享、AI Settings 等与 Toolbar 和左侧 AI 面板联动；预览区使用 DiagramCanvas + CanvasTopToolbar。

---

## 五、EditorPageClient（独立编辑页）

- 左侧 History / AI Tab，主区 Toolbar + 左侧 MermaidEditor + 右侧 MermaidPreview。
- **MermaidEditor**：支持可选 `onBlur`，失焦时调用父级传入的保存逻辑（如 `handleSave`）；仅当 `isDirty` 时保存。
- **AIPanel**：`onCodeGenerated={(newCode) => { setCode(newCode); handleSaveWithCode(newCode); }}`，AI 生成后更新 store 并立即保存（PATCH 或 POST）。

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
| AI 生成完成    | AI 返回 code 后    | FloatingCodePanel：`handleCodeGenerated` 内调用 `onAfterCodeGenerated(code)`；编辑页/渲染页传入 `handleSaveWithCode` / `saveCodeWith`；EditorPageClient 的 AIPanel 使用 `onCodeGenerated` 中 `setCode` + `handleSaveWithCode`。 |
| 关闭代码面板   | 渲染页关闭面板时   | `handleClosePanel` 内调用 `saveCode()`，若有变更则 PATCH。 |

---

## 九、关键文件索引

| 功能           | 主要文件 |
|----------------|----------|
| 画布缩放/拖拽  | `components/canvas/DiagramCanvas.tsx`，`store/canvasStore.ts`（panMode） |
| 顶部工具栏     | `components/canvas/CanvasTopToolbar.tsx` |
| 主题选择       | `components/canvas/ThemeSelect.tsx`，`store/canvasStore.ts` |
| 浮动代码面板   | `components/project/FloatingCodePanel.tsx` |
| 编辑页         | `components/project/ProjectEditClient.tsx`，`app/project/[id]/edit/page.tsx` |
| 渲染页         | `app/project/[id]/page.tsx` |
| 独立编辑页     | `components/EditorPageClient.tsx` |
| 代码编辑器     | `components/editor/MermaidEditor.tsx` |
| AI 面板/设置   | `components/ai/AIPanel.tsx`，`components/ai/AISettingsDialog.tsx` |
| 历史           | `components/history/HistoryPanel.tsx` |
| 相对时间       | `lib/relative-time.ts` |

---

## 十、常量与配置（便于查找）

- **画布默认缩放**：`DEFAULT_SCALE = 1.5`（`DiagramCanvas.tsx`）
- **缩放范围**：`MIN_SCALE = 0.2`，`MAX_SCALE = 4`，`SCALE_STEP = 0.25`
- **编辑页代码弹窗高度**：`h-[85vh]`，容器 `max-w-[520px]`

---

*文档生成后可根据后续迭代继续在本文件中增补或修改条目，作为项目本地记忆使用。*
