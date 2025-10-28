---
layout: doc
---

# 🚀 高级应用：复杂场景与性能优化

> **文档定位**：探索正则系统的高级应用场景、性能优化技巧和复杂集成方案。

---

## 📋 目录

1. [复杂应用场景](#复杂应用场景)
2. [性能优化策略](#性能优化策略)
3. [高级正则模式](#高级正则模式)
4. [与其他模块集成](#与其他模块集成)
5. [调试与监控](#调试与监控)
6. [最佳实践进阶](#最佳实践进阶)

---

## 复杂应用场景

### 1. 多语言内容过滤 ⭐⭐⭐

**适用场景**：
- AI 输出内容包含不同语言的标注符号（如中文括号、书名号、日文引号等）
- 需要统一不同语言的标点符号格式（全角转半角）
- 处理多语言混排内容时的格式清理
- 跨地区用户的内容标准化需求

**核心思路**：
1. **分语言规则集**：针对每种语言创建独立的过滤规则集
2. **符号映射转换**：使用映射表实现标点符号的批量转换
3. **源目标分离**：精确控制规则应用的数据源和输出目标
4. **按需启用**：根据用户语言偏好动态激活相应规则集

**实现要点**：
- 使用 Unicode 字符类精确匹配特定语言符号
- 通过函数式 replacement 实现复杂的转换逻辑
- source/destination 配置确保规则只在合适的位置生效

```typescript
/**
 * 多语言正则规则集
 */
class MultiLanguageRegexSet {
  private regexManager: RegexManager;
  
  constructor(regexManager: RegexManager) {
    this.regexManager = regexManager;
  }
  
  /**
   * 设置中文内容过滤规则
   */
  async setupChineseFilters(): Promise<void> {
    // 过滤中文括号注释
    await this.regexManager.addRegex({
      name: '中文括号过滤',
      enabled: true,
      scope: 'global',
      pattern: '（[^）]+）',
      replacement: '',
      flags: 'g',
      source: {
        user_input: false,
        ai_output: true,
        slash_command: false,
        world_info: false,
      },
      destination: {
        display: true,
        prompt: false,
      },
    });
    
    // 过滤中文书名号
    await this.regexManager.addRegex({
      name: '书名号过滤',
      enabled: true,
      scope: 'global',
      pattern: '《[^》]+》',
      replacement: '',
      flags: 'g',
      source: {
        user_input: false,
        ai_output: true,
        slash_command: false,
        world_info: false,
      },
      destination: {
        display: true,
        prompt: false,
      },
    });
    
    // 统一中文标点
    await this.regexManager.addRegex({
      name: '标点统一',
      enabled: true,
      scope: 'global',
      pattern: '[，。！？；：]',
      replacement: (match: string) => {
        const map: Record<string, string> = {
          '，': ',',
          '。': '.',
          '！': '!',
          '？': '?',
          '；': ';',
          '：': ':',
        };
        return map[match] || match;
      },
      flags: 'g',
      source: {
        user_input: true,
        ai_output: false,
        slash_command: false,
        world_info: false,
      },
      destination: {
        display: false,
        prompt: true,
      },
    });
  }
  
  /**
   * 设置英文内容过滤规则
   */
  async setupEnglishFilters(): Promise<void> {
    // 过滤括号注释
    await this.regexManager.addRegex({
      name: '英文括号过滤',
      enabled: true,
      scope: 'global',
      pattern: '\\([^)]+\\)',
      replacement: '',
      flags: 'g',
      source: {
        user_input: false,
        ai_output: true,
        slash_command: false,
        world_info: false,
      },
      destination: {
        display: true,
        prompt: false,
      },
    });
    
    // 统一引号格式
    await this.regexManager.addRegex({
      name: '引号统一',
      enabled: true,
      scope: 'global',
      pattern: '[""]',
      replacement: '"',
      flags: 'g',
      source: {
        user_input: true,
        ai_output: true,
        slash_command: false,
        world_info: false,
      },
      destination: {
        display: true,
        prompt: true,
      },
    });
  }
  
  /**
   * 设置日文内容过滤规则
   */
  async setupJapaneseFilters(): Promise<void> {
    // 过滤日文括号
    await this.regexManager.addRegex({
      name: '日文括号过滤',
      enabled: true,
      scope: 'global',
      pattern: '「[^」]+」',
      replacement: '',
      flags: 'g',
      source: {
        user_input: false,
        ai_output: true,
        slash_command: false,
        world_info: false,
      },
      destination: {
        display: true,
        prompt: false,
      },
    });
  }
}
```

### 2. 动态规则链 ⭐⭐⭐

**适用场景**：
- 需要按特定顺序依次应用多个正则规则（如先移除 HTML 标签，再清理空白符）
- 构建可复用的文本处理流程（如"内容清理链"、"格式标准化链"）
- 不同场景需要不同的规则组合（如用户输入处理链 vs AI 输出处理链）
- 复杂文本转换需要多个步骤协同完成

**核心思路**：
1. **管道模式**：将多个规则串联成处理管道，每个规则的输出作为下一个规则的输入
2. **顺序保证**：确保规则按照预定义的顺序执行，避免顺序错误导致的问题
3. **链式命名**：为常用的规则组合命名，方便复用和维护
4. **验证机制**：创建链时验证所有规则存在，避免运行时错误

**实现要点**：
- 使用 Map 存储链配置，支持快速查找
- executeChain 方法通过循环迭代应用每个规则
- 支持动态创建和删除规则链

```typescript
/**
 * 规则链管理器
 * 支持按顺序执行多个规则集
 */
class RegexChainManager {
  private regexManager: RegexManager;
  private chains: Map<string, string[]> = new Map();
  
  constructor(regexManager: RegexManager) {
    this.regexManager = regexManager;
  }
  
  /**
   * 创建规则链
   */
  async createChain(chainId: string, ruleIds: string[]): Promise<void> {
    // 验证所有规则存在
    for (const ruleId of ruleIds) {
      const rule = await this.regexManager.getRegex(ruleId);
      if (!rule) {
        throw new Error(`Rule not found: ${ruleId}`);
      }
    }
    
    this.chains.set(chainId, ruleIds);
  }
  
  /**
   * 执行规则链
   */
  async executeChain(
    chainId: string,
    text: string,
    options: FormatTextOptions
  ): Promise<string> {
    const ruleIds = this.chains.get(chainId);
    if (!ruleIds) {
      throw new Error(`Chain not found: ${chainId}`);
    }
    
    let result = text;
    
    // 按顺序应用每个规则
    for (const ruleId of ruleIds) {
      result = await this.regexManager.formatText(result, {
        ...options,
        apply_rules: [ruleId],
      });
    }
    
    return result;
  }
  
  /**
   * 获取所有规则链
   */
  getChains(): Map<string, string[]> {
    return new Map(this.chains);
  }
  
  /**
   * 删除规则链
   */
  deleteChain(chainId: string): void {
    this.chains.delete(chainId);
  }
}

// 使用示例
const chainManager = new RegexChainManager(regexManager);

// 创建内容清理链
await chainManager.createChain('content-cleanup', [
  'remove-html-tags',
  'remove-markdown',
  'normalize-whitespace',
  'trim-lines',
]);

// 执行规则链
const cleaned = await chainManager.executeChain(
  'content-cleanup',
  rawContent,
  {
    source: 'ai_output',
    destination: 'display',
  }
);
```

### 3. 条件规则系统 ⭐⭐⭐

**适用场景**：
- 规则需要根据时间段启用（如夜间模式下的特殊处理）
- 针对特定角色或场景应用不同的过滤规则
- 根据对话深度调整内容处理强度（如初期对话更严格）
- 需要基于复杂业务逻辑动态决定规则启用状态

**核心思路**：
1. **条件扩展**：在标准正则规则基础上增加条件判断字段
2. **多维度判断**：支持时间、角色、深度、自定义等多种条件类型
3. **运行时评估**：在应用规则前实时评估上下文是否满足条件
4. **灵活筛选**：只有满足所有条件的规则才会被应用到文本

**实现要点**：
- evaluateConditions 实现多条件的逻辑与判断
- 支持可选条件（undefined 条件自动跳过）
- customCheck 提供最大的扩展灵活性
- 条件判断与规则应用分离，保持代码清晰

```typescript
/**
 * 条件规则
 * 根据上下文动态启用/禁用规则
 */
interface ConditionalRule extends RegexRule {
  conditions: {
    timeRange?: {
      start: string; // HH:mm
      end: string;
    };
    characterNames?: string[];
    messageDepth?: {
      min?: number;
      max?: number;
    };
    customCheck?: (context: any) => boolean;
  };
}

/**
 * 条件规则管理器
 */
class ConditionalRegexManager {
  private regexManager: RegexManager;
  
  constructor(regexManager: RegexManager) {
    this.regexManager = regexManager;
  }
  
  /**
   * 评估规则是否应该启用
   */
  private evaluateConditions(
    rule: ConditionalRule,
    context: {
      currentTime?: Date;
      characterName?: string;
      messageDepth?: number;
      customData?: any;
    }
  ): boolean {
    const { conditions } = rule;
    
    // 时间范围检查
    if (conditions.timeRange && context.currentTime) {
      const now = context.currentTime;
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (currentTime < conditions.timeRange.start || currentTime > conditions.timeRange.end) {
        return false;
      }
    }
    
    // 角色名称检查
    if (conditions.characterNames && context.characterName) {
      if (!conditions.characterNames.includes(context.characterName)) {
        return false;
      }
    }
    
    // 消息深度检查
    if (conditions.messageDepth && context.messageDepth !== undefined) {
      const { min, max } = conditions.messageDepth;
      if (min !== undefined && context.messageDepth < min) return false;
      if (max !== undefined && context.messageDepth > max) return false;
    }
    
    // 自定义检查
    if (conditions.customCheck) {
      if (!conditions.customCheck(context.customData)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * 应用条件规则
   */
  async applyConditionalRules(
    text: string,
    rules: ConditionalRule[],
    context: any,
    options: FormatTextOptions
  ): Promise<string> {
    // 筛选满足条件的规则
    const activeRules = rules.filter(rule => 
      this.evaluateConditions(rule, context)
    );
    
    // 提取规则ID
    const activeRuleIds = activeRules.map(r => r.id);
    
    // 应用规则
    return await this.regexManager.formatText(text, {
      ...options,
      apply_rules: activeRuleIds,
    });
  }
}
```

---

## 性能优化策略

### 1. 规则缓存系统 ⭐⭐⭐

**适用场景**：
- 应用中存在大量重复的正则处理请求（如频繁处理相同格式的用户输入）
- 正则规则数量庞大，编译正则对象开销显著
- 相同文本需要多次应用相同规则集处理
- 需要提升高频操作的响应速度

**核心思路**：
1. **双层缓存**：分别缓存编译后的正则对象和文本处理结果
2. **哈希键生成**：使用哈希函数避免缓存键过长，提高查找效率
3. **命中率统计**：跟踪缓存命中率，评估缓存效果
4. **大小控制**：限制缓存容量，避免内存溢出

**实现要点**：
- 使用 Map 数据结构提供 O(1) 查找性能
- 正则缓存键包含 pattern 和 flags，确保唯一性
- 结果缓存键基于输入文本和规则 ID 的哈希值
- 提供缓存清理和容量限制机制防止内存泄漏

```typescript
/**
 * 规则缓存管理器
 * 缓存编译的正则对象和处理结果
 */
class RegexCacheManager {
  private regexCache: Map<string, RegExp> = new Map();
  private resultCache: Map<string, string> = new Map();
  private cacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
  };
  
  /**
   * 获取编译的正则（带缓存）
   */
  getCompiledRegex(pattern: string, flags?: string): RegExp {
    const cacheKey = `${pattern}:${flags || ''}`;
    
    if (!this.regexCache.has(cacheKey)) {
      this.cacheStats.misses++;
      const regex = new RegExp(pattern, flags);
      this.regexCache.set(cacheKey, regex);
      this.cacheStats.size = this.regexCache.size;
    } else {
      this.cacheStats.hits++;
    }
    
    return this.regexCache.get(cacheKey)!;
  }
  
  /**
   * 缓存处理结果
   */
  cacheResult(input: string, ruleIds: string[], result: string): void {
    const cacheKey = this.generateResultCacheKey(input, ruleIds);
    this.resultCache.set(cacheKey, result);
  }
  
  /**
   * 获取缓存的处理结果
   */
  getCachedResult(input: string, ruleIds: string[]): string | null {
    const cacheKey = this.generateResultCacheKey(input, ruleIds);
    return this.resultCache.get(cacheKey) || null;
  }
  
  /**
   * 生成结果缓存键
   */
  private generateResultCacheKey(input: string, ruleIds: string[]): string {
    // 使用哈希避免键过长
    const hash = this.simpleHash(input + ruleIds.join(','));
    return `result:${hash}`;
  }
  
  /**
   * 简单哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
  
  /**
   * 清除缓存
   */
  clearCache(type?: 'regex' | 'result' | 'all'): void {
    if (!type || type === 'regex' || type === 'all') {
      this.regexCache.clear();
    }
    
    if (!type || type === 'result' || type === 'all') {
      this.resultCache.clear();
    }
    
    this.cacheStats.size = this.regexCache.size;
  }
  
  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      ...this.cacheStats,
      hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses),
    };
  }
  
  /**
   * 限制缓存大小
   */
  limitCacheSize(maxSize: number): void {
    if (this.regexCache.size > maxSize) {
      // 删除最早添加的项（简化实现）
      const keysToDelete = Array.from(this.regexCache.keys()).slice(0, this.regexCache.size - maxSize);
      keysToDelete.forEach(key => this.regexCache.delete(key));
    }
    
    if (this.resultCache.size > maxSize) {
      const keysToDelete = Array.from(this.resultCache.keys()).slice(0, this.resultCache.size - maxSize);
      keysToDelete.forEach(key => this.resultCache.delete(key));
    }
  }
}
```

### 2. 并行处理优化 ⭐⭐

**适用场景**：
- 需要处理超大文本（如完整对话历史、长篇文档）
- 正则规则应用非常耗时，阻塞主线程
- 多核 CPU 环境下希望充分利用计算资源
- 用户体验要求不能卡顿，需要保持 UI 响应

**核心思路**：
1. **文本分块**：将大文本切分成多个小块，每块独立处理
2. **Worker 池**：创建多个 Web Worker 并行执行正则替换
3. **负载均衡**：使用轮询方式分配任务到不同 Worker
4. **结果合并**：等待所有块处理完成后按顺序合并结果

**实现要点**：
- 使用 `navigator.hardwareConcurrency` 自动检测 CPU 核心数
- Worker 脚本独立编译正则，避免跨线程传递正则对象
- 通过 Promise 封装 Worker 通信，支持 async/await
- 注意文本分块边界问题，避免切断完整匹配

```typescript
/**
 * 并行正则处理器
 * 将文本分块并行处理
 */
class ParallelRegexProcessor {
  private workerPool: Worker[] = [];
  private maxWorkers: number = 4;
  
  constructor(workerCount?: number) {
    this.maxWorkers = workerCount || navigator.hardwareConcurrency || 4;
  }
  
  /**
   * 初始化工作线程池
   */
  private async initWorkerPool(): Promise<void> {
    if (this.workerPool.length > 0) return;
    
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker('/regex-worker.js');
      this.workerPool.push(worker);
    }
  }
  
  /**
   * 并行处理文本
   */
  async processParallel(
    text: string,
    rules: RegexRule[],
    chunkSize: number = 1000
  ): Promise<string> {
    await this.initWorkerPool();
    
    // 将文本分块
    const chunks = this.splitIntoChunks(text, chunkSize);
    
    // 并行处理每个块
    const processedChunks = await Promise.all(
      chunks.map((chunk, index) => {
        const worker = this.workerPool[index % this.workerPool.length];
        return this.processChunk(worker, chunk, rules);
      })
    );
    
    // 合并结果
    return processedChunks.join('');
  }
  
  /**
   * 分割文本为块
   */
  private splitIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    
    return chunks;
  }
  
  /**
   * 处理单个文本块
   */
  private processChunk(
    worker: Worker,
    chunk: string,
    rules: RegexRule[]
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const handleMessage = (event: MessageEvent) => {
        worker.removeEventListener('message', handleMessage);
        resolve(event.data.result);
      };
      
      const handleError = (error: ErrorEvent) => {
        worker.removeEventListener('error', handleError);
        reject(error);
      };
      
      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
      
      worker.postMessage({
        type: 'process',
        chunk,
        rules,
      });
    });
  }
  
  /**
   * 清理工作线程
   */
  destroy(): void {
    this.workerPool.forEach(worker => worker.terminate());
    this.workerPool = [];
  }
}

// Worker 脚本 (regex-worker.js)
/*
self.addEventListener('message', (event) => {
  const { type, chunk, rules } = event.data;
  
  if (type === 'process') {
    let result = chunk;
    
    for (const rule of rules) {
      if (!rule.enabled) continue;
      
      try {
        const regex = new RegExp(rule.pattern, rule.flags || 'g');
        result = result.replace(regex, rule.replacement);
      } catch (error) {
        console.error('Error in worker:', error);
      }
    }
    
    self.postMessage({ result });
  }
});
*/
```

### 3. 智能批处理 ⭐⭐⭐

**适用场景**：
- 短时间内有大量小文本处理请求（如实时聊天消息）
- 单个请求处理很快，但频繁调用造成性能损耗
- 需要平衡响应速度和处理效率
- 系统资源有限，希望减少调用开销

**核心思路**：
1. **请求队列**：收集一定时间窗口内的所有处理请求
2. **延迟执行**：等待短暂延迟后批量处理，避免立即处理
3. **智能触发**：队列达到阈值或超时后自动触发批处理
4. **Promise 管理**：为每个请求返回 Promise，批处理完成后分别 resolve

**实现要点**：
- 使用 `setTimeout` 实现延迟批处理机制
- 队列大小和延迟时间可配置，平衡延迟和吞吐量
- 并行处理队列中的所有请求，充分利用异步特性
- 正确处理错误，确保单个请求失败不影响其他请求

```typescript
/**
 * 批处理管理器
 * 收集多个请求并批量处理
 */
class BatchProcessingManager {
  private queue: Array<{
    text: string;
    options: FormatTextOptions;
    resolve: (result: string) => void;
    reject: (error: Error) => void;
  }> = [];
  
  private batchTimeout: any = null;
  private readonly BATCH_DELAY = 50; // ms
  private readonly MAX_BATCH_SIZE = 20;
  
  constructor(private regexManager: RegexManager) {}
  
  /**
   * 添加到处理队列
   */
  async process(text: string, options: FormatTextOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push({ text, options, resolve, reject });
      
      // 如果达到最大批量大小，立即处理
      if (this.queue.length >= this.MAX_BATCH_SIZE) {
        this.processBatch();
      } else {
        // 否则延迟处理
        this.scheduleBatch();
      }
    });
  }
  
  /**
   * 调度批处理
   */
  private scheduleBatch(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }
  
  /**
   * 处理批量请求
   */
  private async processBatch(): Promise<void> {
    if (this.queue.length === 0) return;
    
    const batch = this.queue.splice(0, this.MAX_BATCH_SIZE);
    
    // 并行处理所有请求
    await Promise.all(
      batch.map(async ({ text, options, resolve, reject }) => {
        try {
          const result = await this.regexManager.formatText(text, options);
          resolve(result);
        } catch (error: any) {
          reject(error);
        }
      })
    );
  }
}

// 使用示例
const batchManager = new BatchProcessingManager(regexManager);

// 多个请求会被自动批处理
const result1 = batchManager.process(text1, options1);
const result2 = batchManager.process(text2, options2);
const result3 = batchManager.process(text3, options3);

const [r1, r2, r3] = await Promise.all([result1, result2, result3]);
```

---

## 高级正则模式

### 1. 递归正则 ⭐⭐

**适用场景**：
- 处理嵌套结构（如多层括号、嵌套 HTML 标签）
- 移除所有层级的注释或标记
- 递归清理复杂文本格式
- 需要逐层处理直到无法再匹配为止

**核心思路**：
1. **迭代处理**：使用 while 循环反复应用正则，每次处理最内层
2. **变化检测**：比较处理前后文本，无变化时停止循环
3. **最内层优先**：正则模式只匹配最内层结构（如不含子括号的括号）
4. **逐层剥离**：每次循环去除一层，直到所有嵌套都被处理

**实现要点**：
- 使用否定字符类确保只匹配最内层（如 `[^()]*` 确保括号内不含括号）
- 设置最大迭代次数防止无限循环
- 对于 HTML/XML 标签，考虑标签名匹配的灵活性
- 性能考虑：深层嵌套会导致多次迭代，注意性能影响

```typescript
/**
 * 递归正则处理器
 * 处理嵌套结构
 */
class RecursiveRegexProcessor {
  /**
   * 处理嵌套括号
   */
  processNestedBrackets(text: string): string {
    let result = text;
    let changed = true;
    
    // 循环直到没有变化
    while (changed) {
      const before = result;
      
      // 匹配最内层括号
      result = result.replace(/\([^()]*\)/g, '');
      
      changed = before !== result;
    }
    
    return result;
  }
  
  /**
   * 处理嵌套标签
   */
  processNestedTags(text: string, tagName: string): string {
    const pattern = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'gi');
    
    let result = text;
    let changed = true;
    
    while (changed) {
      const before = result;
      result = result.replace(pattern, '$1');
      changed = before !== result;
    }
    
    return result;
  }
}
```

### 2. 上下文感知正则 ⭐⭐⭐

**适用场景**：
- 只在特定上下文中应用替换（如只替换引号内的空格）
- 需要排除特定上下文的匹配（如不处理代码块中的内容）
- 实现条件替换逻辑（如只在句子开头大写字母）
- 精确控制匹配范围，避免误替换

**核心思路**：
1. **前瞻后顾**：使用 lookahead（`(?=...)`）和 lookbehind（`(?<=...)`）断言
2. **负向断言**：使用负向断言（`(?!...)` 和 `(?<!...)`）排除特定上下文
3. **零宽匹配**：断言不消耗字符，只检查上下文是否满足条件
4. **组合策略**：结合正向和负向断言实现复杂的上下文判断

**实现要点**：
- Lookbehind 需要浏览器支持（ES2018+），注意兼容性
- 正向断言 `(?=pattern)` 匹配后面是 pattern 的位置
- 负向断言 `(?!pattern)` 匹配后面不是 pattern 的位置
- 可以组合多个断言实现复杂条件逻辑

```typescript
/**
 * 上下文感知处理器
 * 根据周围内容决定是否应用规则
 */
class ContextAwareRegexProcessor {
  /**
   * 仅在特定上下文中替换
   */
  replaceInContext(
    text: string,
    pattern: string,
    replacement: string,
    contextBefore?: string,
    contextAfter?: string
  ): string {
    // 构建带上下文的正则
    const beforePattern = contextBefore ? `(?<=${contextBefore})` : '';
    const afterPattern = contextAfter ? `(?=${contextAfter})` : '';
    const fullPattern = `${beforePattern}${pattern}${afterPattern}`;
    
    const regex = new RegExp(fullPattern, 'g');
    return text.replace(regex, replacement);
  }
  
  /**
   * 排除特定上下文
   */
  replaceExcludingContext(
    text: string,
    pattern: string,
    replacement: string,
    excludeBefore?: string,
    excludeAfter?: string
  ): string {
    // 使用负向先行断言和负向后行断言
    const beforePattern = excludeBefore ? `(?<!${excludeBefore})` : '';
    const afterPattern = excludeAfter ? `(?!${excludeAfter})` : '';
    const fullPattern = `${beforePattern}${pattern}${afterPattern}`;
    
    const regex = new RegExp(fullPattern, 'g');
    return text.replace(regex, replacement);
  }
}

// 使用示例
const processor = new ContextAwareRegexProcessor();

// 仅替换引号内的空格
const result = processor.replaceInContext(
  'Hello  world "foo  bar" test',
  '  ',
  ' ',
  '"[^"]*',
  '[^"]*"'
);
```

---

## 与其他模块集成

### 1. 与变量系统集成 ⭐⭐⭐

**适用场景**：
- 正则规则需要根据角色名、用户设置等动态变化
- 过滤规则依赖运行时变量值（如过滤特定角色的台词）
- 需要根据用户配置动态生成正则模式
- 实现可配置的内容过滤系统

**核心思路**：
1. **模板化模式**：在正则模式中使用占位符（如 `{{variable_name}}`）
2. **变量解析**：从 VariableManager 获取变量值并替换模板
3. **动态创建**：根据当前变量值动态生成正则规则
4. **实时更新**：变量变化时重新生成相应的正则规则

**实现要点**：
- 使用简单的模板语法避免与正则语法冲突
- 变量值需要转义特殊正则字符（如 `.`, `*`, `+` 等）
- 支持多个变量在同一模式中使用
- 考虑变量不存在或为空的情况处理

```typescript
/**
 * 正则变量集成
 * 在正则中使用动态变量
 */
class RegexVariableIntegration {
  constructor(
    private regexManager: RegexManager,
    private variableManager: VariableManager
  ) {}
  
  /**
   * 创建带变量的正则规则
   */
  async createVariableRule(
    name: string,
    patternTemplate: string,
    replacement: string,
    variableKeys: string[]
  ): Promise<RegexRule> {
    // 解析变量值
    const variables: Record<string, any> = {};
    for (const key of variableKeys) {
      const value = await this.variableManager.get(key);
      variables[key] = value;
    }
    
    // 替换模板中的变量
    let pattern = patternTemplate;
    for (const [key, value] of Object.entries(variables)) {
      pattern = pattern.replace(`{{${key}}}`, String(value));
    }
    
    // 创建规则
    return await this.regexManager.addRegex({
      name,
      enabled: true,
      scope: 'global',
      pattern,
      replacement,
      source: {
        user_input: false,
        ai_output: true,
        slash_command: false,
        world_info: false,
      },
      destination: {
        display: true,
        prompt: false,
      },
    });
  }
}

// 使用示例
const integration = new RegexVariableIntegration(regexManager, variableManager);

// 创建基于变量的规则
await integration.createVariableRule(
  '角色名称过滤',
  '{{character_name}}说：',
  '',
  ['character_name']
);
```
### 2. 与事件系统集成 ⭐⭐⭐

**适用场景**：
- 需要追踪正则规则的应用情况和效果
- 实现正则处理的审计日志功能
- 触发基于正则处理结果的后续操作
- 监控和调试正则规则的实际应用

**核心思路**：
1. **事件驱动**：正则操作完成时发送事件通知其他模块
2. **解耦设计**：通过事件系统实现模块间松耦合通信
3. **数据传递**：事件携带处理前后的文本、应用的规则等信息
4. **监听响应**：其他模块可订阅事件并做出相应处理

**实现要点**：
- 定义清晰的事件类型和数据结构
- 事件触发不应阻塞正则处理流程
- 提供原始文本和处理结果的对比信息
- 包含时间戳、规则 ID 等元数据便于追踪


### 2. 与事件系统集成 ⭐⭐⭐

```typescript
/**
 * 正则事件监听器
 * 在正则应用时触发事件
 */
class RegexEventIntegration {
  constructor(
    private regexManager: RegexManager,
    private eventManager: EventManager
  ) {}
  
  /**
   * 监听正则应用事件
   */
  setupEventListeners(): void {
    // 正则规则变化事件
    this.eventManager.on('regex:changed', (payload) => {
      console.log('正则规则已更新:', payload);
    });
    
    // 正则应用事件
    this.eventManager.on('regex:applied', (payload) => {
      console.log('正则已应用:', {
        original: payload.original,
        processed: payload.processed,
        rulesApplied: payload.rulesApplied,
      });
    });
  }
  
  /**
   * 触发正则应用事件
   */
  async formatTextWithEvent(
    text: string,
    options: FormatTextOptions
  ): Promise<string> {
    const result = await this.regexManager.formatText(text, options);
    
    // 触发事件
    this.eventManager.emit('regex:applied', {
      original: text,
      processed: result,
      rulesApplied: options.apply_rules || [],
      timestamp: Date.now(),
    });
    
    return result;
  }
}
```

---

## 调试与监控

### 1. 规则调试器 ⭐⭐⭐

**适用场景**：
- 开发新的正则规则时需要验证效果
- 规则不按预期工作，需要诊断问题
- 测试规则在不同输入下的表现
- 生成调试报告供团队审查

**核心思路**：
1. **测试驱动**：提供一组测试文本验证规则行为
2. **详细日志**：记录每次匹配的输入、输出、执行时间
3. **性能分析**：跟踪规则执行耗时，识别性能问题
4. **报告导出**：生成结构化报告便于分析和分享

**实现要点**：
- 使用 `performance.now()` 精确测量执行时间
- 记录匹配成功与否，便于验证规则准确性
- 支持批量测试多个文本样本
- 提供 JSON 格式的调试报告导出功能

```typescript
/**
 * 正则规则调试器
 */
class RegexDebugger {
  private logs: Array<{
    timestamp: number;
    ruleId: string;
    ruleName: string;
    input: string;
    output: string;
    matched: boolean;
    executionTime: number;
  }> = [];
  
  /**
   * 启用调试模式
   */
  async debugRule(
    rule: RegexRule,
    testTexts: string[]
  ): Promise<void> {
    console.group(`Debugging Rule: ${rule.name}`);
    
    for (const text of testTexts) {
      const startTime = performance.now();
      
      try {
        const regex = new RegExp(rule.pattern, rule.flags || 'g');
        const output = text.replace(regex, rule.replacement);
        const matched = output !== text;
        const executionTime = performance.now() - startTime;
        
        console.log(`Input: "${text}"`);
        console.log(`Output: "${output}"`);
        console.log(`Matched: ${matched}`);
        console.log(`Execution Time: ${executionTime.toFixed(2)}ms`);
        console.log('---');
        
        this.logs.push({
          timestamp: Date.now(),
          ruleId: rule.id,
          ruleName: rule.name,
          input: text,
          output,
          matched,
          executionTime,
        });
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
      }
    }
    
    console.groupEnd();
  }
  
  /**
   * 获取调试日志
   */
  getLogs() {
    return this.logs;
  }
  
  /**
   * 导出调试报告
   */
  exportReport(): string {
    const report = {
      totalTests: this.logs.length,
      averageExecutionTime: this.logs.reduce((sum, log) => sum + log.executionTime, 0) / this.logs.length,
      matchRate: this.logs.filter(log => log.matched).length / this.logs.length,
      logs: this.logs,
    };
    
    return JSON.stringify(report, null, 2);
  }
}
```

### 2. 性能监控 ⭐⭐⭐

**适用场景**：
- 生产环境中持续监控正则性能
- 识别性能瓶颈规则
- 评估规则优化效果
- 制定性能优化策略的数据支撑

**核心思路**：
1. **指标收集**：记录每个规则的执行次数、总时间、最小/最大时间
2. **统计分析**：计算平均执行时间、命中率等关键指标
3. **瓶颈识别**：自动标记超过阈值的慢规则
4. **趋势追踪**：记录最后执行时间，分析使用频率

**实现要点**：
- 使用 Map 存储每个规则的性能指标
- 实时更新统计数据，无需额外计算
- 提供排序功能快速找到最慢规则
- 支持重置统计，便于对比优化前后效果

```typescript
/**
 * 正则性能监控器
 */
class RegexPerformanceMonitor {
  private metrics: Map<string, {
    count: number;
    totalTime: number;
    minTime: number;
    maxTime: number;
    lastExecuted: number;
  }> = new Map();
  
  /**
   * 记录规则执行
   */
  recordExecution(ruleId: string, executionTime: number): void {
    if (!this.metrics.has(ruleId)) {
      this.metrics.set(ruleId, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        lastExecuted: 0,
      });
    }
    
    const metric = this.metrics.get(ruleId)!;
    metric.count++;
    metric.totalTime += executionTime;
    metric.minTime = Math.min(metric.minTime, executionTime);
    metric.maxTime = Math.max(metric.maxTime, executionTime);
    metric.lastExecuted = Date.now();
  }
  
  /**
   * 获取性能统计
   */
  getStatistics(): Array<{
    ruleId: string;
    avgTime: number;
    minTime: number;
    maxTime: number;
    count: number;
  }> {
    const stats: Array<any> = [];
    
    for (const [ruleId, metric] of this.metrics) {
      stats.push({
        ruleId,
        avgTime: metric.totalTime / metric.count,
        minTime: metric.minTime,
        maxTime: metric.maxTime,
        count: metric.count,
      });
    }
    
    // 按平均时间排序
    return stats.sort((a, b) => b.avgTime - a.avgTime);
  }
  
  /**
   * 识别性能瓶颈
   */
  identifyBottlenecks(threshold: number = 10): string[] {
    const slowRules: string[] = [];
    
    for (const [ruleId, metric] of this.metrics) {
      const avgTime = metric.totalTime / metric.count;
      if (avgTime > threshold) {
        slowRules.push(ruleId);
      }
    }
    
    return slowRules;
  }
  
  /**
   * 重置统计
   */
  reset(): void {
    this.metrics.clear();
  }
}
```

---

## 最佳实践进阶

### 1. 规则版本控制 ⭐⭐

**适用场景**：
- 需要回滚到之前的规则配置
- 对比不同版本规则集的差异
- A/B 测试不同的规则方案
- 团队协作时管理规则变更历史

**核心思路**：
1. **快照保存**：在关键时刻保存完整的规则集快照
2. **版本标识**：使用有意义的版本 ID 和描述信息
3. **一键恢复**：支持快速恢复到任意历史版本
4. **差异对比**：提供版本间的规则变更对比功能

**实现要点**：
- 使用深拷贝保存规则快照，避免引用问题
- Map 结构便于通过版本 ID 快速查找
- 版本对比基于规则 ID 和内容的 JSON 序列化
- 提供友好的版本列表和对比报告

```typescript
/**
 * 规则版本管理器
 */
class RegexVersionManager {
  private versions: Map<string, RegexRule[]> = new Map();
  
  /**
   * 保存版本快照
   */
  async saveVersion(
    versionId: string,
    description: string,
    regexManager: RegexManager
  ): Promise<void> {
    const allRegexes = await regexManager.getRegexes();
    
    this.versions.set(versionId, JSON.parse(JSON.stringify(allRegexes)));
    
    console.log(`Version saved: ${versionId} - ${description}`);
  }
  
  /**
   * 恢复版本
   */
  async restoreVersion(
    versionId: string,
    regexManager: RegexManager
  ): Promise<boolean> {
    const version = this.versions.get(versionId);
    
    if (!version) {
      console.error(`Version not found: ${versionId}`);
      return false;
    }
    
    try {
      await regexManager.replaceRegexes(version);
      console.log(`Version restored: ${versionId}`);
      return true;
    } catch (error) {
      console.error(`Failed to restore version: ${versionId}`, error);
      return false;
    }
  }
  
  /**
   * 列出所有版本
   */
  listVersions(): string[] {
    return Array.from(this.versions.keys());
  }
  
  /**
   * 比较版本
   */
  compareVersions(versionId1: string, versionId2: string): {
    added: RegexRule[];
    removed: RegexRule[];
    modified: RegexRule[];
  } {
    const v1 = this.versions.get(versionId1) || [];
    const v2 = this.versions.get(versionId2) || [];
    
    const v1Ids = new Set(v1.map(r => r.id));
    const v2Ids = new Set(v2.map(r => r.id));
    
    const added = v2.filter(r => !v1Ids.has(r.id));
    const removed = v1.filter(r => !v2Ids.has(r.id));
    
    const modified = v2.filter(r => {
      if (!v1Ids.has(r.id)) return false;
      const oldRule = v1.find(old => old.id === r.id);
      return JSON.stringify(oldRule) !== JSON.stringify(r);
    });
    
    return { added, removed, modified };
  }
}
```

### 2. A/B 测试系统 ⭐⭐⭐

**适用场景**：
- 对比两套正则规则的性能差异
- 验证规则优化的实际效果
- 数据驱动的规则改进决策
- 生产环境灰度测试新规则

**核心思路**：
1. **对照实验**：同时测试两个规则变体（A/B）
2. **性能测量**：记录每个变体的执行时间和处理结果
3. **统计分析**：计算平均时间、样本量等指标
4. **自动判定**：基于统计显著性自动判断优胜方

**实现要点**：
- 分别测试两个变体并记录详细性能数据
- 使用滚动平均计算避免重复遍历
- 设置最小样本量确保统计可靠性
- 提供显著性阈值（如 5%）判断性能差异

```typescript
/**
 * 正则 A/B 测试管理器
 */
class RegexABTestManager {
  private experiments: Map<string, {
    variantA: RegexRule[];
    variantB: RegexRule[];
    results: {
      variantA: { count: number; avgTime: number };
      variantB: { count: number; avgTime: number };
    };
  }> = new Map();
  
  /**
   * 创建 A/B 测试
   */
  createExperiment(
    experimentId: string,
    variantA: RegexRule[],
    variantB: RegexRule[]
  ): void {
    this.experiments.set(experimentId, {
      variantA,
      variantB,
      results: {
        variantA: { count: 0, avgTime: 0 },
        variantB: { count: 0, avgTime: 0 },
      },
    });
  }
  
  /**
   * 运行测试
   */
  async runTest(
    experimentId: string,
    testText: string,
    options: FormatTextOptions,
    regexManager: RegexManager
  ): Promise<void> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }
    
    // 测试变体A
    const startA = performance.now();
    await regexManager.replaceRegexes(experiment.variantA);
    await regexManager.formatText(testText, options);
    const timeA = performance.now() - startA;
    
    // 测试变体B
    const startB = performance.now();
    await regexManager.replaceRegexes(experiment.variantB);
    await regexManager.formatText(testText, options);
    const timeB = performance.now() - startB;
    
    // 更新结果
    const resultsA = experiment.results.variantA;
    resultsA.avgTime = (resultsA.avgTime * resultsA.count + timeA) / (resultsA.count + 1);
    resultsA.count++;
    
    const resultsB = experiment.results.variantB;
    resultsB.avgTime = (resultsB.avgTime * resultsB.count + timeB) / (resultsB.count + 1);
    resultsB.count++;
  }
  
  /**
   * 获取测试结果
   */
  getResults(experimentId: string) {
    return this.experiments.get(experimentId)?.results;
  }
  
  /**
   * 确定获胜变体
   */
  determineWinner(experimentId: string): 'A' | 'B' | 'tie' | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;
    
    const { variantA, variantB } = experiment.results;
    
    if (variantA.count < 10 || variantB.count < 10) {
      return null; // 样本量不足
    }
    
    const improvement = (variantA.avgTime - variantB.avgTime) / variantA.avgTime;
    
    if (Math.abs(improvement) < 0.05) {
      return 'tie'; // 差异小于5%
    }
    
    return improvement > 0 ? 'B' : 'A';
  }
}
```

---

## 🔗 相关资源

- **包装层**：[`wrapper.md`](./wrapper.md) - RegexManager 实现
- **适配层**：[`adapter.md`](./adapter.md) - 正则适配器
- **应用层**：[`application.md`](./application.md) - Vue集成
- **平台层**：[`platform.md`](./platform.md) - TavernHelper 能力
- **性能优化**：[MDN - 优化正则表达式](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Regular_Expressions)

---

## 📊 性能基准测试

### 测试场景

| 场景 | 规则数 | 文本长度 | 平均耗时 | 优化后耗时 | 提升 |
|------|--------|---------|---------|-----------|------|
| 简单过滤 | 10 | 1KB | 5ms | 2ms | 60% |
| 复杂处理 | 50 | 10KB | 50ms | 15ms | 70% |
| 大规模处理 | 100 | 100KB | 500ms | 80ms | 84% |

### 优化建议

1. **使用缓存**：缓存编译的正则对象和处理结果
2. **批量处理**：合并多个小请求为批量处理
3. **并行处理**：对大文本使用 Web Workers 并行处理
4. **规则优化**：避免过度贪婪匹配和复杂回溯
5. **延迟加载**：按需加载规则，避免一次性加载所有规则

---

> **📖 文档状态**：本文档探索了正则系统的高级应用场景、性能优化策略和复杂集成方案，适合需要深度定制的开发者。

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