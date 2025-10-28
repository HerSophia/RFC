# 酒馆助手 API 文档

本文档整理了酒馆助手（TavernHelper）的核心功能API，基于JS-Slash-Runner文档。仅供参考，开发时请优先查阅官方在线文档。

## 目录

1. [变量操作](#变量操作)
   - [修改变量](#修改变量)
   - [删除变量](#删除变量)
   - [获取变量](#获取变量)
2. [请求生成](#请求生成)
3. [事件系统](#事件系统)
4. [酒馆正则](#酒馆正则)
5. [注入提示词](#注入提示词)
6. [角色卡信息](#角色卡信息)

---

## 变量操作

### 修改变量

#### setVariable

设置变量的值。

```typescript
function setVariable(
  name: string,
  value: string,
  scope?: VariableScope
): Promise<void>;
```

**参数：**

- `name`: 变量名
- `value`: 变量值
- `scope`: 变量作用域，默认为 `'chat'`

**作用域类型：**

```typescript
type VariableScope = 'chat' | 'global' | 'message' | 'character' | 'script';
```

**示例：**

```typescript
// 设置聊天变量
await setVariable('playerName', '张三');

// 设置全局变量
await setVariable('gameVersion', '1.0.0', 'global');

// 设置角色变量
await setVariable('characterLevel', '10', 'character');
```

#### setVariables

批量设置变量。

```typescript
function setVariables(
  variables: Record<string, string>,
  scope?: VariableScope
): Promise<void>;
```

**示例：**

```typescript
await setVariables({
  'playerName': '张三',
  'playerLevel': '5',
  'playerGold': '1000'
}, 'chat');
```

### 删除变量

#### deleteVariable

删除指定的变量。

```typescript
function deleteVariable(
  name: string,
  scope?: VariableScope
): Promise<void>;
```

**参数：**

- `name`: 要删除的变量名
- `scope`: 变量作用域，默认为 `'chat'`

**示例：**

```typescript
// 删除聊天变量
await deleteVariable('tempData');

// 删除全局变量
await deleteVariable('oldConfig', 'global');
```

#### deleteVariables

批量删除变量。

```typescript
function deleteVariables(
  names: string[],
  scope?: VariableScope
): Promise<void>;
```

**示例：**

```typescript
await deleteVariables(['temp1', 'temp2', 'temp3'], 'chat');
```

### 获取变量

#### getVariable

获取变量的值。

```typescript
function getVariable(
  name: string,
  scope?: VariableScope
): Promise<string | undefined>;
```

**参数：**

- `name`: 变量名
- `scope`: 变量作用域，默认为 `'chat'`

**返回值：**

- 变量值（字符串）或 `undefined`（如果变量不存在）

**示例：**

```typescript
// 获取聊天变量
const playerName = await getVariable('playerName');

// 获取全局变量
const gameVersion = await getVariable('gameVersion', 'global');

// 获取角色变量
const characterLevel = await getVariable('characterLevel', 'character');
```

#### getVariables

批量获取变量。

```typescript
function getVariables(
  names: string[],
  scope?: VariableScope
): Promise<Record<string, string | undefined>>;
```

**示例：**

```typescript
const variables = await getVariables(['playerName', 'playerLevel', 'playerGold']);
console.log(variables.playerName); // '张三'
```

#### getAllVariables

获取指定作用域的所有变量。

```typescript
function getAllVariables(
  scope?: VariableScope
): Promise<Record<string, string>>;
```

**示例：**

```typescript
// 获取所有聊天变量
const chatVars = await getAllVariables('chat');

// 获取所有全局变量
const globalVars = await getAllVariables('global');
```

---

## 请求生成

酒馆助手提供了函数用于更加灵活地请求AI生成回复，你可以通过它来自定义生成时要采用的提示词配置。

**注意：** 目前仅支持聊天补全(Chat Completion)。

### generate

使用SillyTavern当前启用的预设，让AI生成一段文本。

```typescript
function generate(config: GenerateConfig): Promise<string>;
```

**GenerateConfig类型：**

```typescript
type GenerateConfig = {
  /** 用户输入 */
  user_input?: string;
  /**
   * 图片输入，支持以下格式:
   * - File 对象：通过 input[type="file"] 获取的文件对象
   * - Base64 字符串：图片的 base64 编码
   * - URL 字符串：图片的在线地址
   */
  image?: File | string | (File | string)[];
  /**
   * 是否启用流式传输；默认为 false.
   *
   * 若启用流式传输，每次得到流式传输结果时，函数将会发送事件：
   * - iframe_events.STREAM_TOKEN_RECEIVED_FULLY: 监听它可以得到流式传输的当前完整文本
   * - iframe_events.STREAM_TOKEN_RECEIVED_INCREMENTALLY: 监听它可以得到流式传输的当前增量文本
   */
  should_stream?: boolean;
  /**
   * 覆盖选项。若设置，则 overrides 中给出的字段将会覆盖对应的提示词。
   * 如 overrides.char_description = '覆盖的角色描述'; 将会覆盖角色描述。
   */
  overrides?: Overrides;
  /** 要额外注入的提示词 */
  injects?: Omit<InjectionPrompt, 'id'>[];
  /** 最多使用多少条聊天历史；默认为 'all' */
  max_chat_history?: 'all' | number;
  /** 自定义API配置 */
  custom_api?: CustomApiConfig;
  /**
   * 唯一id
   *
   * 可以并发生成，并可以通过stopGenerateById停止特定生成，不设置默认生成uuid，在发送的事件中也会返回该id
   */
  generation_id?: string;
};
```

**参数详解：**

- `user_input?`: 用户输入
- `image?`: 图片输入，支持File对象、Base64字符串、URL字符串，可以是数组形式输入多张图片
- `should_stream?`: 是否启用流式传输，默认为false
- `overrides?`: 覆盖选项，用于覆盖对应的提示词
- `injects?`: 要额外注入的提示词
- `max_chat_history?`: 最多使用多少条聊天历史
- `custom_api?`: 自定义API配置
- `generation_id?`: 生成ID，用于事件监听和中止特定请求

**示例：**

```typescript
// 基本生成
const result = await generate({
  user_input: "你好",
  should_stream: true
});

// 带图片的生成
const result = await generate({
  user_input: "你好",
  image: "https://example.com/image.jpg"
});

// 复杂配置生成
const result = await generate({
  user_input: '你好',
  injects: [{
    role: 'system',
    content: '思维链...',
    position: 'in_chat',
    depth: 0,
    should_scan: true
  }],
  overrides: {
    char_personality: '温柔',
    world_info_before: '',
    chat_history: {
      prompts: []
    }
  }
});
```

### generateRaw

不使用SillyTavern当前启用的预设，让AI生成一段文本。

```typescript
function generateRaw(config: GenerateRawConfig): Promise<string>;
```

**GenerateRawConfig类型：**

```typescript
type GenerateRawConfig = {
  /**
   * 用户输入。
   *
   * 如果设置，则无论 ordered_prompts 中是否有 'user_input' 都会加入该用户输入提示词；默认加入在 'chat_history' 末尾。
   */
  user_input?: string;
  /**
   * 图片输入，支持以下格式:
   * - File 对象：通过 input[type="file"] 获取的文件对象
   * - Base64 字符串：图片的 base64 编码
   * - URL 字符串：图片的在线地址
   */
  image?: File | string | (File | string)[];
  /**
   * 是否启用流式传输；默认为 false.
   */
  should_stream?: boolean;
  /**
   * 覆盖选项。若设置，则 overrides 中给出的字段将会覆盖对应的提示词。
   * 如 overrides.char_description = '覆盖的角色描述'; 将会覆盖提示词
   */
  overrides?: Overrides;
  injects?: Omit<InjectionPrompt, 'id'>[];
  /**
   * 一个提示词数组，数组元素将会按顺序发给ai，因而相当于自定义预设。该数组允许存放两种类型:
   * - BuiltinPrompt: 内置提示词。由于不使用预设，如果需要 "角色描述" 等提示词，你需要自己指定要用哪些并给出顺序
   * 如果不想自己指定，可通过 builtin_prompt_default_order 得到酒馆默认预设所使用的顺序 (但对于这种情况，也许你更应该用 generate)。
   * - RolePrompt: 要额外给定的提示词。
   */
  ordered_prompts?: (BuiltinPrompt | RolePrompt)[];
  /** 最多使用多少条聊天历史；默认为 'all' */
  max_chat_history?: 'all' | number;
  /** 自定义API配置 */
  custom_api?: CustomApiConfig;
  /**
   * 唯一id
   *
   * 可以并发生成，并可以通过stopGenerateById停止特定生成，不设置默认生成uuid，在发送的事件中也会返回该id
   */
  generation_id?: string;
};
```

**示例：**

```typescript
// 自定义内置提示词顺序，未在 ordered_prompts 中给出的将不会被使用
const result = await generateRaw({
  user_input: "你好",
  ordered_prompts: [
    "char_description",
    { role: "system", content: "系统提示" },
    "chat_history",
    "user_input"
  ]
});
```

### 通过事件获取生成结果

生成函数在执行过程中将会发送以下事件：

```typescript
// 事件类型定义
[iframe_events.GENERATION_STARTED]: (generation_id: string) => void;
[iframe_events.STREAM_TOKEN_RECEIVED_FULLY]: (full_text: string, generation_id: string) => void;
[iframe_events.STREAM_TOKEN_RECEIVED_INCREMENTALLY]: (incremental_text: string, generation_id: string) => void;
[iframe_events.GENERATION_ENDED]: (text: string, generation_id: string) => void;
```

**事件说明：**

- `GENERATION_STARTED`: 生成开始
- `STREAM_TOKEN_RECEIVED_FULLY`: 流式传输的当前完整文本（如："这是"，"这是一条"，"这是一条流式传输"）
- `STREAM_TOKEN_RECEIVED_INCREMENTALLY`: 流式传输的当前增量文本（如："这是"，"一条"，"流式传输"）
- `GENERATION_ENDED`: 生成结束，监听它可以得到生成的最终文本

### 参数详情

#### Overrides

覆盖选项，用于覆盖对应的提示词：

```typescript
type Overrides = {
  world_info_before?: string;      // 世界书(角色定义前)
  persona_description?: string;    // 用户描述
  char_description?: string;       // 角色描述
  char_personality?: string;       // 角色性格
  scenario?: string;               // 场景
  world_info_after?: string;       // 世界书(角色定义后)
  dialogue_examples?: string;      // 对话示例
  chat_history?: {                 // 聊天历史
    with_depth_entries?: boolean;  // 是否启用世界书中按深度插入的条目；默认为true
    author_note?: string;          // 若设置，覆盖"作者注释"为给定的字符串
    prompts?: RolePrompt[];        // 若设置，覆盖"聊天历史"为给定的提示词
  };
};
```

#### RolePrompt

角色提示词格式：

```typescript
type RolePrompt = {
  role: 'system' | 'assistant' | 'user';  // 角色
  content: string;                         // 提示词内容
};
```

#### BuiltinPrompt

内置提示词类型，默认顺序：

```typescript
const builtin_prompt_default_order: BuiltinPrompt[] = [
  "world_info_before",    // 世界书(角色定义前)
  "persona_description",  // 用户描述
  "char_description",     // 角色描述
  "char_personality",     // 角色性格
  "scenario",             // 场景
  "world_info_after",     // 世界书(角色定义后)
  "dialogue_examples",    // 对话示例
  "chat_history",         // 聊天历史 (含世界书中按深度插入的条目、作者注释)
  "user_input"            // 用户输入
];

type BuiltinPrompt =
  | "world_info_before"    // 世界书(角色定义前)
  | "persona_description"  // 用户描述
  | "char_description"     // 角色描述
  | "char_personality"     // 角色性格
  | "scenario"             // 场景
  | "world_info_after"     // 世界书(角色定义后)
  | "dialogue_examples"    // 对话示例
  | "chat_history"         // 聊天历史
  | "user_input";          // 用户输入
```

**user_input与chat_history的关系：**

在generateRaw中，user_input可以自由选择放置的位置：

- 当chat_history不在ordered_prompts时：
  - 如果user_input未在ordered_prompts中：将自动添加到所有提示词的最后面
  - 如果user_input在ordered_prompts中：以user_input在ordered_prompts中的位置为准

- 当chat_history在ordered_prompts时：
  - 如果user_input未在ordered_prompts中：将自动插入到最新一条聊天记录后
  - 如果user_input在ordered_prompts中：user_input和chat_history会分别插入到ordered_prompts中指示的位置

#### CustomApiConfig

自定义API配置：

```typescript
type CustomApiConfig = {
  apiurl?: string;  // 自定义API地址
  key?: string;     // API密钥
  model?: string;   // 模型名称
  source?: string;  // API源，默认为'openai'
};
```

**注意：** source参数用于指定API源，目前支持的源包括openai、claude、makersuite(gemini)、deepseek等主流API。

---

## 事件系统

### 监听事件

#### eventOn

监听事件。

```typescript
function eventOn(
  eventName: string,
  callback: (...args: any[]) => void
): void;
```

**示例：**

```typescript
// 监听聊天变化事件
eventOn('CHAT_CHANGED', () => {
  console.log('聊天已变化');
});

// 监听消息发送事件
eventOn('MESSAGE_SENT', (message) => {
  console.log('消息已发送:', message);
});
```

#### eventOnce

监听事件（仅一次）。

```typescript
function eventOnce(
  eventName: string,
  callback: (...args: any[]) => void
): void;
```

#### eventOff

取消监听事件。

```typescript
function eventOff(
  eventName: string,
  callback?: (...args: any[]) => void
): void;
```

### 发送事件

#### eventEmit

发送事件。

```typescript
function eventEmit(
  eventName: string,
  ...args: any[]
): void;
```

**示例：**

```typescript
// 发送自定义事件
eventEmit('CUSTOM_EVENT', { data: 'some data' });

// 发送带多个参数的事件
eventEmit('PLAYER_LEVEL_UP', playerName, newLevel, rewards);
```

### 常用事件类型

```typescript
// 酒馆事件
const tavern_events = {
  CHAT_CHANGED: 'CHAT_CHANGED',
  MESSAGE_SENT: 'MESSAGE_SENT',
  MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
  GENERATION_STARTED: 'GENERATION_STARTED',
  GENERATION_ENDED: 'GENERATION_ENDED',
  GENERATION_AFTER_COMMANDS: 'GENERATION_AFTER_COMMANDS',
  CHARACTER_MESSAGE_RENDERED: 'CHARACTER_MESSAGE_RENDERED',
  USER_MESSAGE_RENDERED: 'USER_MESSAGE_RENDERED',
  IMPERSONATE_READY: 'IMPERSONATE_READY',
  CHAT_COMPLETION_READY: 'CHAT_COMPLETION_READY',
  // ... 更多事件
};

// iframe事件
const iframe_events = {
  CUSTOM_EVENT: 'CUSTOM_EVENT',
  // ... 自定义事件
};
```

---

## 酒馆正则

### formatAsTavernRegexedString

对文本应用酒馆正则。

```typescript
function formatAsTavernRegexedString(
  text: string,
  source: 'user_input' | 'ai_output' | 'slash_command' | 'world_info' | 'reasoning',
  destination: 'display' | 'prompt',
  options?: FormatAsTavernRegexedStringOption
): string;
```

**参数：**

- `text`: 要应用酒馆正则的文本
- `source`: 文本来源
- `destination`: 文本用途
- `options`: 可选选项

**选项类型：**

```typescript
type FormatAsTavernRegexedStringOption = {
  depth?: number; // 文本所在的深度
  character_name?: string; // 角色卡名称
};
```

**示例：**

```typescript
// 对AI输出应用正则用于显示
const processedText = formatAsTavernRegexedString(
  "Hello world!",
  'ai_output',
  'display'
);

// 对用户输入应用正则用于提示词
const processedInput = formatAsTavernRegexedString(
  userInput,
  'user_input',
  'prompt'
);
```

### getTavernRegexes

获取酒馆正则列表。

```typescript
function getTavernRegexes(
  option?: GetTavernRegexesOption
): TavernRegex[];
```

**选项类型：**

```typescript
type GetTavernRegexesOption = {
  scope?: "all" | "global" | "character"; // 按所在区域筛选正则
  enable_state?: "all" | "enabled" | "disabled"; // 按是否被开启筛选正则
};
```

**TavernRegex类型：**

```typescript
type TavernRegex = {
  id: string;
  script_name: string;
  enabled: boolean;
  run_on_edit: boolean;
  scope: "global" | "character";
  find_regex: string;
  replace_string: string;
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

### replaceTavernRegexes

完全替换酒馆正则。

```typescript
function replaceTavernRegexes(
  regexes: TavernRegex[],
  options: ReplaceTavernRegexesOption
): Promise<void>;
```

**注意：** 这是一个很慢的操作！尽量对正则做完所有事后再一次性调用。

### updateTavernRegexesWith

使用更新函数更新酒馆正则。

```typescript
function updateTavernRegexesWith(
  updater: TavernRegexUpdater,
  option?: ReplaceTavernRegexesOption
): Promise<TavernRegex[]>;
```

**更新函数类型：**

```typescript
type TavernRegexUpdater = 
  | ((regexes: TavernRegex[]) => TavernRegex[])
  | ((regexes: TavernRegex[]) => Promise<TavernRegex[]>);
```

**示例：**

```typescript
// 启用所有包含特定名称的正则
await updateTavernRegexesWith((regexes) => {
  regexes.forEach((regex) => {
    if (regex.script_name.includes("舞台少女")) {
      regex.enabled = true;
    }
  });
  return regexes;
});
```

### isCharacterTavernRegexesEnabled

判断局部正则是否被启用。

```typescript
function isCharacterTavernRegexesEnabled(): Promise<boolean>;
```

---

## 注入提示词

### injectPrompts

注入提示词到当前聊天。

```typescript
function injectPrompts(
  prompts: InjectionPrompt[],
  options?: injectPromptsOptions
): void;
```

**参数：**

- `prompts`: 要注入的提示词数组
- `options`: 可选选项

**选项类型：**

```typescript
type injectPromptsOptions = {
  once?: boolean; // 是否只在下一次请求生成中有效，默认为false
};
```

**InjectionPrompt类型：**

```typescript
type InjectionPrompt = {
  id: string;
  /** 要注入的位置
   * - 'in_chat': 插入到聊天中
   * - 'none': 不会发给AI，但能用来激活世界书条目
   */
  position: 'in_chat' | 'none';
  depth: number;
  role: 'system' | 'assistant' | 'user';
  content: string;
  /** 提示词在什么情况下启用；默认为始终 */
  filter?: (() => boolean) | (() => Promise<boolean>);
  /** 是否作为欲扫描文本，加入世界书绿灯条目扫描文本中；默认为任意 */
  should_scan?: boolean;
};
```

**示例：**

```typescript
// 注入系统提示词
injectPrompts([
  {
    id: 'system-prompt-1',
    position: 'in_chat',
    depth: 0,
    role: 'system',
    content: '你是一个友善的助手。'
  }
]);

// 注入临时提示词（仅一次生效）
injectPrompts([
  {
    id: 'temp-prompt',
    position: 'in_chat',
    depth: 1,
    role: 'user',
    content: '请用简短的方式回答。'
  }
], { once: true });
```

### uninjectPrompts

移除注入的提示词。

```typescript
function uninjectPrompts(ids: string[]): void;
```

**参数：**

- `ids`: 要移除的提示词ID列表

**示例：**

```typescript
// 移除特定的注入提示词
uninjectPrompts(['system-prompt-1', 'temp-prompt']);
```

---

## 角色卡信息

### getCharData

根据角色卡的名称获取对应角色卡信息。

```typescript
function getCharData(
  name: LiteralUnion<'current' | string>, 
  allowAvatar: boolean = false
): Promise<v1CharData | null>;
```

**参数：**

- `name`: 角色卡的名称，如果未提供，则返回当前打开的角色卡信息
- `allowAvatar`: 是否将name视为准确的头像文件名进行查找，用于存在同名角色卡的情况；默认为false

**返回值：**

- 角色卡数据：`v1CharData | null` - 包含角色卡信息的对象，找不到角色卡时返回null

**v1CharData类型定义：**

```typescript
interface v1CharData {
  name: string;              // 角色卡名称
  description: string;       // 角色卡描述
  personality: string;       // 角色卡个性
  scenario: string;          // 角色卡背景
  first_mes: string;         // 角色卡开场白
  mes_example: string;       // 角色卡对话示例
  creator_notes: string;     // 角色卡创建者备注
  tags: string[];            // 角色卡标签
  talkativeness: number;     // 角色卡话痨程度
  fav: boolean | string;     // 角色卡是否被收藏
  create_date: string;       // 角色卡创建日期
  data: v2CharData;          // v2角色卡数据扩展
  chat: string;              // 当前聊天文件名
  avatar: string;            // 角色卡头像文件名
  json_data: string;         // 角色卡原始JSON数据
}
```

**v2CharData类型定义：**

```typescript
interface v2CharData {
  name: string;                        // 角色卡名称
  description: string;                 // 角色卡描述
  character_version: string;           // 角色卡版本
  personality: string;                 // 角色卡个性
  scenario: string;                    // 角色卡背景
  first_mes: string;                   // 角色卡开场白
  mes_example: string;                 // 角色卡对话示例
  creator_notes: string;               // 角色卡创建者备注
  tags: string[];                      // 角色卡标签
  system_prompt: string;               // 角色卡系统提示覆盖
  post_history_instructions: string;   // 角色卡越狱提示词覆盖
  creator: string;                     // 角色卡创建者
  alternate_greetings: string[];       // 可选开场白
  character_book: v2WorldInfoBook;     // 角色卡世界信息
  extensions: v2CharDataExtensionInfos; // 角色卡扩展信息
}
```

**示例：**

```typescript
// 获取当前角色卡信息
const charData = await getCharData();
console.log(charData);

// 获取指定角色卡信息
const charData = await getCharData("少女歌剧");
console.log(charData);

// 通过头像文件名获取角色卡信息
const charDataWithAvatar = await getCharData("少女歌剧2.png", true);
console.log(charDataWithAvatar);
```

### getCharAvatarPath

获取角色头像的URL路径。

```typescript
function getCharAvatarPath(
  name: LiteralUnion<'current' | string>, 
  allowAvatar: boolean = false
): Promise<string | null>;
```

**参数：**

- `name`: 角色卡的名称，如果未提供，则返回当前打开的角色卡信息
- `allowAvatar`: 是否将name视为准确的头像文件名进行查找，用于存在同名角色卡的情况；默认为false

**返回值：**

- 头像路径：`string | null` - 角色头像的URL路径信息，可直接用于img标签的src属性，找不到角色卡时返回null

**示例：**

```typescript
const avatarPath = await getCharAvatarPath("少女歌剧");
console.log(avatarPath);
```

### getChatHistoryBrief

获取与角色的聊天历史概要信息。

```typescript
function getChatHistoryBrief(
  name: LiteralUnion<'current' | string>, 
  allowAvatar: boolean = false
): Promise<ChatHistoryBrief[] | null>;
```

**ChatHistoryBrief类型定义：**

```typescript
interface ChatHistoryBrief {
  chat_item: number;    // 楼层总数
  file_name: string;    // 聊天文件名
  file_size: string;    // 文件大小
  last_mes: string;     // 最后一条消息的时间
  mes: string;          // 最后一条消息的内容
}
```

**参数：**

- `name`: 角色卡的名称，如果未提供，则返回当前打开的角色卡信息
- `allowAvatar`: 是否将name视为准确的头像文件名进行查找，用于存在同名角色卡的情况；默认为false

**返回值：**

- 聊天历史概要：`ChatHistoryBrief[] | null` - 包含聊天历史概要信息的数组，找不到角色卡或聊天历史时返回null

**示例：**

```typescript
const historyBrief = await getChatHistoryBrief("少女歌剧");
console.log(historyBrief);
```

### getChatHistoryDetail

根据聊天文件名，获取详细的聊天历史信息。

```typescript
function getChatHistoryDetail(
  data: any[], 
  isGroupChat: boolean = false
): Promise<Record<string, ChatHistoryDetail[]> | null>;
```

**ChatHistoryDetail类型定义：**

```typescript
interface ChatHistoryDetail {
  name: string;           // 发送者名称
  is_user: boolean;       // 是否用户发送的消息
  is_system: boolean;     // 是否系统消息
  send_date: string;      // 消息发送日期时间
  mes: string;            // 消息内容
  extra: {                // 额外信息
    bias: string;         // 消息偏置设置
  };
  swipe_id: number;       // 当前选中的swipe索引
  swipes: string[];       // 可选择的消息内容数组
  swipe_info: any[];      // swipe相关信息
  // 可能存在扩展引入的额外字段
}
```

**参数：**

- `data`: 聊天历史数据，通常是从getChatHistoryBrief获取的结果，也可以是其他数据，但必须包含file_name字段
- `isGroupChat`: 指定是否获取群聊的历史记录；默认为false

**返回值：**

- 聊天历史详情：`Promise<Record<string, ChatHistoryDetail[]> | null>` - 返回一个对象，其中键是聊天文件名，值是包含聊天消息的数组，找不到聊天历史时返回null

**注意：** getChatHistoryDetail根据file_name来获取头像名，因此不支持存在多个同名角色卡时，对聊天记录的精确获取，函数将始终返回最早创建的角色卡的聊天记录。

**示例：**

```typescript
// 获取单个角色的聊天历史详情
const historyBrief = await getChatHistoryBrief("少女歌剧");
const historyDetail = await getChatHistoryDetail(historyBrief);

// 获取多个角色的聊天历史详情
const charNames = ["少女歌剧", "舞台少女"];
const allHistoryBriefs = [];
for (const name of charNames) {
  const historyBrief = await getChatHistoryBrief(name);
  allHistoryBriefs.push(...historyBrief);
}
const historyDetail = await getChatHistoryDetail(allHistoryBriefs);
```

---

## 使用注意事项

1. **变量作用域**：
   - `chat`: 聊天级别变量，仅在当前聊天中有效
   - `global`: 全局变量，在所有聊天中共享
   - `character`: 角色变量，与特定角色绑定
   - `message`: 消息级别变量
   - `script`: 脚本级别变量

2. **事件监听**：
   - 使用 `eventOn` 监听持续事件
   - 使用 `eventOnce` 监听一次性事件
   - 记得使用 `eventOff` 清理不需要的监听器

3. **正则操作**：
   - `replaceTavernRegexes` 是重操作，会重新加载聊天
   - 建议使用 `updateTavernRegexesWith` 进行批量更新

4. **提示词注入**：
   - 注入的提示词仅在当前聊天文件中有效
   - 跨聊天需要监听 `CHAT_CHANGED` 事件重新注入
   - 使用 `once: true` 选项创建临时提示词

5. **异步操作**：
   - 大部分API都是异步的，记得使用 `await` 或 `.then()`
   - 变量操作、生成请求等都需要等待完成

*本文档基于 JS-Slash-Runner 官方文档整理，版本信息以官方文档为准。*
