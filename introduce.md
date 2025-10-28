# CharacterAPI 规范总览与底层包装集成（v0.2 更新）

本文是对角色卡跨平台 API 标准（CharacterAPI）的总览，并给出与本项目“底层包装”的融合方案。此次更新将“包装层等于规范”的理念前置，并补充 generation 模块的事件与能力协商细节，使规范更易落地与测试。

参考文档：

- RFC 公告：[RFC_ANNOUNCEMENT.md](./RFC_ANNOUNCEMENT.md)
- 规范草案（本页）：[CHARACTER_API_RFC.md](./CHARACTER_API_RFC.md)
- 生成模块四层模型索引：[index.md](./landing/generation/index.md)

## 1. 背景与动机

角色卡在不同平台（SillyTavern、Agnaistic 等）之间迁移时存在 API 差异、状态读写不一致、事件命名不统一等问题。CharacterAPI 旨在：

- 建立统一抽象层，消除平台锁定。
- 简化脚本编写，提升可维护性。
- 为生态扩展（插件、工具链）提供稳定的接入点。
- 将包装层的“事件/日志/状态”行为规范化，便于跨平台一致性验证。

## 2. 理念

- 平台识别：各平台提供 `window.platformAndInformation()`，统一识别宿主环境。
- 抽象层与包装层融合：角色卡仅依赖 `CharacterAPI.*`；适配器负责翻译平台特性；包装层行为（事件、日志结构、降级策略）纳入规范参考。
- 能力协商与降级：通过 `generation.getCapabilities()` 与特性检测，进行运行时协商；不支持的能力需有明确降级与日志记录。
- 统一语义：例如，对应LLM请求与响应，支持增量（token_incremental）与完整快照（token_full）两种流式模式；可单独或并发启用。

## 3. 核心思想：四层模型

- 通用四层：应用层 → 包装层 → 平台适配层 → 底层。核心目标是将业务与平台解耦，确保可移植、可测试、可替换。示意图与职责如下。
  
```text
┌─────────────────────────────────────────────┐
│              应用层                          
│  • Vue组件 • 业务逻辑 • 用户交互 • 界面状态    
└─────────────────┬───────────────────────────┘
                  │ 调用统一接口
┌─────────────────▼───────────────────────────┐
│               包装层          
│  • 统一接口 • 状态管理 • 事件系统 • 错误处理   
└─────────────────┬───────────────────────────┘
                  │ 平台无关调用
┌─────────────────▼───────────────────────────┐
│              平台适配层          
│  • 平台检测 • 接口转换 • 参数适配 • 差异抹平      
└─────────────────┬───────────────────────────┘
                  │ 原生API调用
┌─────────────────▼───────────────────────────┐
│                底层          
│  • SillyTavern • 酒馆助手 • 自定义API    
└─────────────────────────────────────────────┘
```

- 应用层（Application）：聚焦业务与 UI 交互，通过包装层统一接口进行调用与订阅。
- 包装层（Wrapper）：对外提供稳定的统一接口，内聚状态/事件/错误/重试/日志等“非业务增强”，对下仅依赖适配层。
- 平台适配层（Adapter）：完成平台识别、接口转换、参数适配与错误标准化，屏蔽差异。
- 底层（Platform）：SillyTavern / 酒馆助手 / 自定义 API / 第三方服务等原生功能与限制。

:::info
在 CharacterAPI 的所有模块中，默认遵循该四层模型进行组织：规范接口由“包装层”承载，“适配层”负责编码平台差异，“底层”为原生实现，“应用层”为业务集成与 UI 显示。这与教程第三章保持一致的单向依赖、接口隔离、职责单一、可替换性原则。

该拆分确保：

- “包装 = 规范接口”，具备统一语义、日志结构、事件命名与降级策略；
- “适配 = 平台翻译”，通过能力协商与降级在运行时达成一致行为；
- “应用 = 业务集成”，通过事件订阅与并发隔离完成 UI 与交互的一致性。

:::

## 4. 标准模块总览

CharacterAPI 将一个全局对象划分为以下模块：

- **变量管理（variable）** ⭐⭐⭐：提供统一、可扩展的变量操作接口，支持多作用域（chat/global/character/message/script）、批量操作、数据校验、变量监听等高级特性。封装平台差异，提供类型安全的数据读写操作。
- **事件系统（events）** ⭐⭐⭐：标准事件总线（包含 generation、stream、variable 相关事件）。
- **对话历史（chat）** ⭐⭐：检索与插入历史消息。
- **AI 生成（generation）** ⭐⭐：统一生成调用（预设/原始），含选项扩展与能力协商。
- **参数策略（parameters）** ⭐⭐：生成参数默认值/校验/归一化与能力协商桥接。
- **UI 交互（ui）** ⭐：通知等基础 UI。
- **运行时（runtime）** ⭐：后端执行、最终提示词获取。

详见规范草案各模块的函数签名与示例。

### 变量管理模块重点

变量管理（`CharacterAPI.variable`）是 v0.2 版本的重要更新，它替代了原有的简单状态管理（state），提供了更强大和灵活的能力：

- **多作用域支持**：chat、global、character、message、script 五种作用域
- **批量操作**：通过 `batch()` 方法支持事务性批量操作
- **变量监听**：通过 `watch()` 方法实现响应式变量监听
- **能力协商**：通过 `getCapabilities()` 进行运行时能力发现
- **结果封装**：统一的 `VariableResult` 结构，包含详细的元数据
- **事件集成**：自动触发 `state:changed` 和 `variable:error` 事件

详见：[变量操作完整规范](./landing/variable/index.md)

## 5. 我们的"底层包装"如何与规范融合

本项目已有一套底层模块（variable、events、history、generation、promptManager、secondaryLlmApi、ui-checks 等）。将其作为 CharacterAPI 的"参考实现"，通过适配器（即适配层的核心实现集，按平台进行划分）暴露统一接口，并对以下行为进行约束：

- **变量管理标准化**：`variable:get/update/batch/watch` 接口，支持 `VariableResult` 结果封装和 `VariableCapabilities` 能力协商。
- **事件标准化**：`generation:started/progress/ended/error`、`stream:token_incremental/token_full`、`state:changed`、`variable:error` 等标准事件。
- **日志结构**：统一的 LogEntry 建议结构，支持"历史+日志"双向追踪。
- **能力协商**：在初始化或首次调用时发现并缓存各模块的 `Capabilities`（如 `GenerationCapabilities`、`VariableCapabilities`）。
- **降级策略**：对不支持的扩展字段（image/overrides/injects/stop、encryption/ttl 等）进行明确降级与记录。

说明：具体命名与职责以当前代码为准，上述为对齐方向与整合入口。

### 5.1 统一的初始化流程

1. 平台实现 `window.platformAndInformation()`。
2. 包装层提供 `CharacterAPI.init()`，完成平台识别与适配器绑定。
3. 适配器填充 `variable/events/chat/generation/ui/runtime/parameters` 的具体实现。
4. 可选：在各模块初始化时调用 `getCapabilities()`，缓存能力信息（如 `CharacterAPI.variable.getCapabilities()`、`CharacterAPI.generation.getCapabilities()`）。

### 5.2 适配器注册与加载

- 每个平台提供一个适配器对象（如 `sillytavern-adapter`）。
- 初始化阶段，根据 `platform.name` 动态选择适配器。
- 适配器仅做“翻译”，不承载业务；业务置于包装层核心模块。

## 6. 与教程 Chapter-3（日志系统）的结合

- 在 `events` 层挂载监听，将标准事件写入日志（含 generation/stream/variable 事件）。
- 在 `variable` 层记录操作（含 scope、key、operation、metadata 与能力协商结果）。
- 在 `generation` 层记录请求/结果（含 prompt、options、generation_id 与能力协商结果）。
- 在 `runtime.getFinalPrompt` 处记录"最终提示词"，便于问题追踪与上下文还原。

建议实践：

- 定义统一的 LogEntry 结构体，让 `events/variable/generation/runtime` 输出一致形态。
- 使用"会话维度"的日志分片，与 `chat.getHistory` 联动，实现"历史+日志"的双向追踪。
- 对降级行为（如忽略 image/overrides/injects、encryption/ttl 等）进行警告级别的日志记录。
- 记录变量操作的批量事务，便于追踪数据一致性问题。

## 7. 开发者使用流程（最小示例，含扩展）

```ts
await CharacterAPI.init();
const caps = await CharacterAPI.generation.getCapabilities?.();

await CharacterAPI.chat.addMessage({ role: 'user', text: '今天的修炼计划是什么？' }, 'last');

const reply = await CharacterAPI.generation.generateWithPreset(
  '请给出今日修炼建议',
  {
    stream: true,
    generation_id: 'gen-001',
    delivery: { stream_use_incremental: true, stream_use_full: false },
    overrides: { temperature: 0.7 },
    injects: [{ content: '请以导师口吻作答。' }],
    max_chat_history: 10
  }
);

await CharacterAPI.chat.addMessage({ role: 'assistant', text: reply }, 'last');
```

## 8. 版本与扩展

- **版本控制**：在 `window.CharacterAPI.version` 暴露语义化版本，适配器基于能力检测决定启用范围。
- **高级能力**：允许适配器通过 `features` 暴露平台特性（GroupChat、WorldInfo、VariableEncryption 等），包装层按需启用。
- **数据结构**：对复杂对象（如世界信息、变量作用域）定义通用 schema，并提供转换工具以屏蔽平台差异。
- **能力矩阵**：各模块通过 `getCapabilities()` 方法暴露支持的功能特性，实现运行时协商。

## 9. 路线图

- **v0.2**（当前版本）：
  - ✅ 将 generation 事件与能力协商纳入规范
  - ✅ 引入变量管理模块（variable），替代简单的状态管理
  - ✅ 完善日志与复盘路径
  - ✅ 提供参考实现链接和详细文档
  
- **v0.3**（规划中）：
  - 补充复杂对象的通用 schema 与转换工具
  - 扩展 UI 与 runtime 的标准接口
  - 完善变量加密和 TTL 支持的规范
  
- **v1.0**（目标）：
  - 稳定 API，发布类型定义与参考实现
  - 推动社区适配，支持更多平台
  - 建立完整的测试套件和兼容性矩阵

## 10. 参考链接

- 公告：[RFC_ANNOUNCEMENT.md](./RFC_ANNOUNCEMENT.md)
- 规范：[CHARACTER_API_RFC.md](./CHARACTER_API_RFC.md)
- 变量管理详细规范：[variable/index.md](./landing/variable/index.md)
- 生成模块详细规范：[generation/index.md](./landing/generation/index.md)
- 教程：`logging-system-docs.md`（待补充）

---

维护者注：

- 本总览作为入口文档，后续将补充子页面：模块详解、适配器规范、日志结构约定、案例库等。
- 欢迎在 Discussions 中提出意见与改进建议。
