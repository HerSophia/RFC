---
layout: doc
---

# 🏗️ Platform - 平台层分析

> **定位**：分析各平台原生正则系统的能力与实现细节，为适配层设计提供依据

## 📋 内容概览

- [TavernHelper 正则系统](#tavernhelper-正则系统)
- [SillyTavern 正则系统](#sillytavern-正则系统)
- [平台能力对比](#平台能力对比)
- [设计考量](#设计考量)

---

## 🔍 TavernHelper 正则系统

### 核心API

TavernHelper 提供了完整的正则表达式管理系统，基于 SillyTavern 的正则功能。

#### 获取正则列表

```typescript
function getTavernRegexes(
  option?: GetTavernRegexesOption
): TavernRegex[];

type GetTavernRegexesOption = {
  scope?: "all" | "global" | "character";
  enable_state?: "all" | "enabled" | "disabled";
};
```

#### 正则数据结构

```typescript
type TavernRegex = {
  id: string;
  script_name: string;          // 规则名称
  enabled: boolean;             // 是否启用
  run_on_edit: boolean;         // 编辑时是否执行
  scope: "global" | "character"; // 作用域
  find_regex: string;           // 正则表达式
  replace_string: string;       // 替换字符串
  
  source: {
    user_input: boolean;
    ai_output: boolean;
    slash_command: boolean;
    world_info: boolean;
  };
  
  destination: {
    display: boolean;
    prompt: boolean;
  };
  
  min_depth: number | null;
  max_depth: number | null;
};
```

#### 应用正则

```typescript
function formatAsTavernRegexedString(
  text: string,
  source: 'user_input' | 'ai_output' | 'slash_command' | 'world_info' | 'reasoning',
  destination: 'display' | 'prompt',
  options?: FormatAsTavernRegexedStringOption
): string;

type FormatAsTavernRegexedStringOption = {
  depth?: number;
  character_name?: string;
};
```

#### 更新正则

```typescript
// 批量更新（推荐）
function updateTavernRegexesWith(
  updater: TavernRegexUpdater,
  option?: ReplaceTavernRegexesOption
): Promise<TavernRegex[]>;

type TavernRegexUpdater = 
  | ((regexes: TavernRegex[]) => TavernRegex[])
  | ((regexes: TavernRegex[]) => Promise<TavernRegex[]>);

// 完全替换（慢操作）
function replaceTavernRegexes(
  regexes: TavernRegex[],
  options: ReplaceTavernRegexesOption
): Promise<void>;
```

#### 角色正则控制

```typescript
function isCharacterTavernRegexesEnabled(): Promise<boolean>;
```

### 特性分析

#### ✅ 支持的功能

- ✅ **双维度过滤**：source × destination 组合控制
- ✅ **深度控制**：min_depth/max_depth 支持
- ✅ **作用域管理**：global/character 两种作用域
- ✅ **编辑时执行**：run_on_edit 控制
- ✅ **批量更新**：updateTavernRegexesWith 高效更新
- ✅ **实时应用**：formatAsTavernRegexedString 即时处理

#### ⚠️ 限制与注意事项

- ⚠️ **性能问题**：replaceTavernRegexes 会重新加载聊天，非常慢
- ⚠️ **正则语法**：使用 JavaScript 正则语法
- ⚠️ **作用域绑定**：character 作用域与当前角色绑定

---

## 🎯 SillyTavern 正则系统

SillyTavern 提供了原生的正则表达式管理功能，TavernHelper 的正则系统基于此实现。

### 核心特性

#### 数据结构

SillyTavern 的正则数据结构与 TavernHelper 相同，存储在：
- **全局正则**：`/data/default-user/regex/`
- **角色正则**：角色卡 JSON 的 `extensions.regex` 字段

#### 应用时机

```typescript
// 正则应用的生命周期点
1. 用户输入 → user_input/prompt
2. AI生成 → ai_output/display
3. 斜杠命令 → slash_command
4. 世界书激活 → world_info
5. 消息编辑 → run_on_edit
```

#### 深度计算

```typescript
// 深度从最新消息开始计算
depth = 0: 最新消息
depth = 1: 倒数第二条
depth = n: 倒数第 n+1 条

// min_depth/max_depth 过滤
if (depth < min_depth || depth > max_depth) {
  skip_this_regex;
}
```

### API 访问方式

```typescript
// SillyTavern 内部对象访问
window.SillyTavern = {
  getContext: () => ({
    chat: [...], // 聊天历史
    characters: {...}, // 角色列表
    // ... 其他上下文
  }),
  
  // 正则相关
  extension_settings: {
    regex: [...], // 全局正则列表
    character_regex_enabled: boolean
  }
};
```

---

## 📊 平台能力对比

| 功能特性 | TavernHelper | SillyTavern | 其他平台 |
|---------|-------------|-------------|----------|
| **基础正则** | ✅ 完整 | ✅ 完整 | ⚠️ 需实现 |
| **作用域控制** | ✅ global/character | ✅ global/character | ❌ 仅global |
| **深度过滤** | ✅ min/max_depth | ✅ min/max_depth | ❌ 不支持 |
| **source过滤** | ✅ 4种source | ✅ 4种source | ⚠️ 简化 |
| **destination过滤** | ✅ display/prompt | ✅ display/prompt | ⚠️ 简化 |
| **编辑时执行** | ✅ run_on_edit | ✅ run_on_edit | ❌ 不支持 |
| **批量更新** | ✅ 高效API | ✅ 高效API | ⚠️ 需实现 |
| **实时格式化** | ✅ formatAsTavernRegexedString | ✅ 内置 | ⚠️ 需实现 |

### 兼容性矩阵

```typescript
interface PlatformRegexSupport {
  TavernHelper: {
    all_features: true;
    performance: 'excellent';
    api_stability: 'stable';
  };
  
  SillyTavern: {
    all_features: true;
    performance: 'excellent';
    api_stability: 'stable';
  };
  
  OtherPlatforms: {
    basic_regex: 'possible';
    advanced_features: 'limited';
    requires_adapter: true;
  };
}
```

---

## 🎨 设计考量

### 统一抽象的挑战

#### 1. **数据结构差异**

```typescript
// CharacterAPI 统一格式
interface RegexRule {
  id: string;
  name: string;  // 统一命名
  pattern: string;  // 统一字段名
  replacement: string;
  flags?: string;  // 新增：支持正则标志
  // ...
}

// TavernHelper 原生格式
interface TavernRegex {
  id: string;
  script_name: string;  // 需映射
  find_regex: string;  // 需映射
  replace_string: string;
  // ...
}
```

#### 2. **能力降级策略**

```typescript
// 不支持深度过滤的平台
if (!platform.supports.depth_filter) {
  // 忽略 min_depth/max_depth
  // 记录降级日志
  console.warn('Platform does not support depth filtering');
}

// 不支持作用域的平台
if (!platform.supports.scopes.character) {
  // 所有规则视为全局
  // 记录降级日志
}
```

#### 3. **性能优化**

```typescript
// 缓存编译的正则对象
class RegexCache {
  private cache = new Map<string, RegExp>();
  
  get(pattern: string, flags?: string): RegExp {
    const key = `${pattern}:${flags || ''}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, new RegExp(pattern, flags));
    }
    return this.cache.get(key)!;
  }
}
```

### 适配器设计原则

#### 📦 **最小转换原则**

适配器应尽量使用平台原生格式，只在必要时转换：

```typescript
class TavernHelperRegexAdapter {
  // 直接返回原生格式，包装层负责转换
  async getPlatformRegexes(): Promise<TavernRegex[]> {
    return getTavernRegexes();
  }
  
  // 只做必要的字段映射
  toCharacterAPIFormat(native: TavernRegex): RegexRule {
    return {
      id: native.id,
      name: native.script_name,
      pattern: native.find_regex,
      replacement: native.replace_string,
      // ...
    };
  }
}
```

#### 🔄 **双向转换**

```typescript
interface RegexAdapter {
  // 平台 → CharacterAPI
  toCharacterAPI(native: PlatformRegex): RegexRule;
  
  // CharacterAPI → 平台
  toPlatform(rule: RegexRule): PlatformRegex;
}
```

---

## 💡 实施建议

### 对于 TavernHelper/SillyTavern

✅ **完全支持所有特性**

```typescript
class TavernHelperRegexAdapter implements RegexAdapter {
  async getRegexes(options?: RegexConfig): Promise<RegexRule[]> {
    const native = getTavernRegexes({
      scope: options?.scope || 'all',
      enable_state: options?.enabled === true ? 'enabled' 
        : options?.enabled === false ? 'disabled' : 'all'
    });
    
    return native.map(this.toCharacterAPI);
  }
  
  async formatText(text: string, options: FormatTextOptions): Promise<string> {
    return formatAsTavernRegexedString(
      text,
      options.source,
      options.destination,
      {
        depth: options.depth,
        character_name: options.character_name
      }
    );
  }
}
```

### 对于其他平台

⚠️ **基础实现 + 降级处理**

```typescript
class BasicRegexAdapter implements RegexAdapter {
  private rules: RegexRule[] = [];
  
  async formatText(text: string, options: FormatTextOptions): Promise<string> {
    let result = text;
    
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      
      // 简化：忽略深度和source/destination细分
      try {
        const regex = new RegExp(rule.pattern, rule.flags || 'g');
        result = result.replace(regex, rule.replacement);
      } catch (error) {
        console.error(`Regex error in rule ${rule.id}:`, error);
      }
    }
    
    return result;
  }
}
```

---

## 🔗 相关资源

- [TavernHelper 正则文档](../../resource/TAVERNHELPER.md#酒馆正则)
- [适配层设计](./adapter.md)
- [包装层实现](./wrapper.md)

---

<style scoped>
.vp-doc h2 {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--vp-c-divider);
}

.vp-doc table {
  font-size: 0.9em;
}
</style>