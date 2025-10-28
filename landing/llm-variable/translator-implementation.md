# LLM Variable 翻译器实现

> **核心职责**：实现四层翻译器架构，将JSON黄金标准指令翻译为不同平台的可执行格式

---

## 🎯 架构总览

```typescript
// 翻译器管道
LLM JSON输出 → Parser → Validator → Translator → Executor
     ↓           ↓          ↓           ↓          ↓
  原始文本    JSON对象   验证结果    平台指令    执行结果
```

---

## 📦 核心类型定义

```typescript
// JSON指令标准格式
interface JSONInstruction {
  op: 'assign' | 'get' | 'delete' | 'merge' | 'push' | 'pop' | 'splice' | 'callback';
  path: string[];
  value?: any;
  old?: any;
  reason?: string;
  metadata?: Record<string, any>;
}

// 解析结果
interface ParseResult {
  instructions: JSONInstruction[];
  errors: ParseError[];
  metadata: {
    totalFound: number;
    parseTime: number;
  };
}

// 验证结果
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// 执行结果
interface ExecutionResult {
  success: boolean;
  instruction: JSONInstruction;
  result?: any;
  error?: string;
  duration?: number;
}
```

---

## 🔧 Layer 1: JSON解析层

```typescript
/**
 * JSON解析层
 * 职责：从LLM输出中提取并解析JSON指令
 */
class JSONParserLayer {
  /**
   * 解析LLM输出
   */
  parse(llmOutput: string): ParseResult {
    const startTime = performance.now();
    const instructions: JSONInstruction[] = [];
    const errors: ParseError[] = [];

    try {
      // 提取JSON块
      const jsonBlocks = this.extractJSONBlocks(llmOutput);

      // 解析每个块
      for (const block of jsonBlocks) {
        try {
          const parsed = JSON.parse(block);
          
          // 支持单条或批量
          const items = Array.isArray(parsed) ? parsed : [parsed];
          
          // 过滤出有效的指令
          items.forEach(item => {
            if (this.isValidJSONInstruction(item)) {
              instructions.push(item);
            }
          });
        } catch (error) {
          errors.push({
            block,
            error: error.message,
            position: this.findPosition(llmOutput, block)
          });
        }
      }

      return {
        instructions,
        errors,
        metadata: {
          totalFound: jsonBlocks.length,
          parseTime: performance.now() - startTime
        }
      };
    } catch (error) {
      throw new ParseError('Failed to parse LLM output', error);
    }
  }

  /**
   * 从文本中提取JSON块
   */
  private extractJSONBlocks(text: string): string[] {
    const blocks: string[] = [];

    // 模式1: Markdown JSON代码块
    const markdownPattern = /```json\s*\n([\s\S]*?)\n```/g;
    let match;
    while ((match = markdownPattern.exec(text)) !== null) {
      blocks.push(match[1].trim());
    }

    // 模式2: 直接的JSON对象（以{开头，包含"op"）
    const directPattern = /\{[^{}]*"op"\s*:\s*"[^"]+"[^{}]*\}/g;
    while ((match = directPattern.exec(text)) !== null) {
      blocks.push(match[0]);
    }

    // 模式3: JSON数组（包含op字段）
    const arrayPattern = /\[\s*\{[^[\]]*"op"\s*:\s*"[^"]+"[^[\]]*\}[^[\]]*\]/g;
    while ((match = arrayPattern.exec(text)) !== null) {
      blocks.push(match[0]);
    }

    // 去重（避免重复提取）
    return [...new Set(blocks)];
  }

  /**
   * 基础验证：检查是否为有效的JSON指令
   */
  private isValidJSONInstruction(obj: any): obj is JSONInstruction {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'op' in obj &&
      'path' in obj &&
      Array.isArray(obj.path)
    );
  }

  /**
   * 查找JSON块在原文中的位置
   */
  private findPosition(text: string, block: string): number {
    return text.indexOf(block);
  }
}

// 使用示例
const parser = new JSONParserLayer();
const llmOutput = `
玩家升级了！

\`\`\`json
{
  "op": "assign",
  "path": ["player", "level"],
  "value": 2,
  "old": 1
}
\`\`\`
`;

const result = parser.parse(llmOutput);
console.log('Parsed instructions:', result.instructions);
```

---

## ✅ Layer 2: 指令验证层

```typescript
/**
 * 指令验证层
 * 职责：验证指令的合法性和安全性
 */
class InstructionValidatorLayer {
  private readonly VALID_OPERATIONS = [
    'assign', 'get', 'delete', 'merge', 
    'push', 'pop', 'splice', 'callback'
  ];

  private readonly DANGEROUS_KEYWORDS = [
    '__proto__', 'constructor', 'prototype',
    'eval', 'Function', 'setTimeout', 'setInterval'
  ];

  /**
   * 验证单条指令
   */
  validate(instruction: JSONInstruction): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. 验证操作类型
    if (!this.VALID_OPERATIONS.includes(instruction.op)) {
      errors.push(`Invalid operation type: ${instruction.op}`);
    }

    // 2. 验证路径
    const pathValidation = this.validatePath(instruction.path);
    if (!pathValidation.valid) {
      errors.push(...pathValidation.errors);
    }

    // 3. 验证必需字段
    const requiredFields = this.getRequiredFields(instruction.op);
    for (const field of requiredFields) {
      if (!(field in instruction)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // 4. 验证值类型
    if ('value' in instruction) {
      const typeValidation = this.validateValueType(instruction);
      if (!typeValidation.valid) {
        errors.push(...typeValidation.errors);
      }
    }

    // 5. 安全检查
    const securityCheck = this.performSecurityCheck(instruction);
    if (!securityCheck.safe) {
      errors.push(...securityCheck.risks);
    }

    // 6. 最佳实践检查（警告）
    const practiceCheck = this.checkBestPractices(instruction);
    warnings.push(...practiceCheck);

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * 批量验证
   */
  validateBatch(instructions: JSONInstruction[]): ValidationResult[] {
    return instructions.map(inst => this.validate(inst));
  }

  /**
   * 验证路径
   */
  private validatePath(path: any): ValidationResult {
    const errors: string[] = [];

    // 必须是数组
    if (!Array.isArray(path)) {
      errors.push('Path must be an array');
      return { valid: false, errors };
    }

    // 不能为空
    if (path.length === 0) {
      errors.push('Path cannot be empty');
    }

    // 每个元素必须是字符串
    if (!path.every(p => typeof p === 'string')) {
      errors.push('All path elements must be strings');
    }

    // 不能包含空字符串
    if (path.some(p => p.length === 0)) {
      errors.push('Path elements cannot be empty strings');
    }

    // 深度限制
    if (path.length > 10) {
      errors.push('Path depth exceeds maximum limit (10)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取操作所需的必需字段
   */
  private getRequiredFields(op: string): string[] {
    const fieldMap: Record<string, string[]> = {
      assign: ['value'],
      get: [],
      delete: [],
      merge: ['value'],
      push: ['value'],
      pop: [],
      splice: ['value'],
      callback: ['value']
    };

    return fieldMap[op] || [];
  }

  /**
   * 验证值类型
   */
  private validateValueType(instruction: JSONInstruction): ValidationResult {
    const errors: string[] = [];
    const { op, value } = instruction;

    // 特定操作的类型要求
    switch (op) {
      case 'merge':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push('merge operation requires value to be an object');
        }
        break;

      case 'splice':
        if (typeof value !== 'object' || !('start' in value)) {
          errors.push('splice operation requires value with start property');
        }
        break;

      case 'callback':
        if (!Array.isArray(value)) {
          errors.push('callback operation requires value to be an array of arguments');
        }
        break;
    }

    // 值必须是JSON可序列化的
    try {
      JSON.stringify(value);
    } catch {
      errors.push('Value must be JSON serializable');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 安全检查
   */
  private performSecurityCheck(instruction: JSONInstruction): {
    safe: boolean;
    risks: string[];
  } {
    const risks: string[] = [];

    // 检查路径中的危险关键词
    for (const segment of instruction.path) {
      if (this.DANGEROUS_KEYWORDS.some(kw => segment.includes(kw))) {
        risks.push(`Dangerous keyword detected in path: ${segment}`);
      }
    }

    // 检查回调函数名
    if (instruction.op === 'callback') {
      const funcName = instruction.path[0];
      if (this.DANGEROUS_KEYWORDS.some(kw => funcName.includes(kw))) {
        risks.push(`Dangerous callback function name: ${funcName}`);
      }
    }

    // 检查值中的危险内容
    if (typeof instruction.value === 'string') {
      if (instruction.value.includes('<script') || instruction.value.includes('javascript:')) {
        risks.push('Potential XSS in value');
      }
    }

    return {
      safe: risks.length === 0,
      risks
    };
  }

  /**
   * 最佳实践检查
   */
  private checkBestPractices(instruction: JSONInstruction): string[] {
    const warnings: string[] = [];

    // 建议添加reason
    if (!instruction.reason && instruction.op !== 'get') {
      warnings.push('Consider adding a "reason" field to explain the operation');
    }

    // assign操作建议提供old值
    if (instruction.op === 'assign' && instruction.old === undefined) {
      warnings.push('Consider providing "old" value for validation');
    }

    // 路径命名检查
    const path = instruction.path;
    if (path.some(p => /^\d+$/.test(p))) {
      warnings.push('Using numeric array indices in path - consider alternative approach');
    }

    return warnings;
  }
}

// 使用示例
const validator = new InstructionValidatorLayer();

const instruction: JSONInstruction = {
  op: 'assign',
  path: ['player', 'hp'],
  value: 80,
  old: 100
};

const validation = validator.validate(instruction);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
if (validation.warnings) {
  console.warn('Validation warnings:', validation.warnings);
}
```

---

## 🔄 Layer 3: 平台翻译层

```typescript
/**
 * 平台翻译器接口
 */
interface PlatformTranslator {
  readonly name: string;
  translate(instruction: JSONInstruction): any;
  translateBatch(instructions: JSONInstruction[]): any;
}

/**
 * MVU翻译器 - 兼容现有MVU格式
 */
class MVUTranslator implements PlatformTranslator {
  readonly name = 'MVU';

  /**
   * 将JSON指令翻译为MVU格式
   */
  translate(instruction: JSONInstruction): string {
    const { op, path, value, old, reason } = instruction;
    const pathStr = path.join('.');
    const reasonComment = reason ? ` // ${reason}` : '';

    switch (op) {
      case 'assign':
        return `_.set('${pathStr}', ${this.toJS(old)}, ${this.toJS(value)});${reasonComment}`;

      case 'get':
        return `_.get('${pathStr}');`;

      case 'delete':
        return `_.delete('${pathStr}');${reasonComment}`;

      case 'merge':
        return `_.merge('${pathStr}', ${this.toJS(old)}, ${this.toJS(value)});${reasonComment}`;

      case 'push':
        return `_.push('${pathStr}', ${this.toJS(value)});${reasonComment}`;

      case 'pop':
        return `_.pop('${pathStr}');${reasonComment}`;

      case 'callback':
        const funcName = path[0];
        const args = Array.isArray(value) ? value : [value];
        const argsStr = args.map(a => this.toJS(a)).join(', ');
        return `_.callback('${funcName}', ${argsStr});${reasonComment}`;

      default:
        throw new Error(`Unsupported operation for MVU: ${op}`);
    }
  }

  /**
   * 批量翻译
   */
  translateBatch(instructions: JSONInstruction[]): string {
    return instructions
      .map(inst => this.translate(inst))
      .join('\n');
  }

  /**
   * 将JavaScript值转换为字符串表示
   */
  private toJS(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `'${this.escapeString(value)}'`;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  /**
   * 转义字符串中的特殊字符
   */
  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
}

/**
 * 直接执行翻译器 - 直接调用variable API
 */
class DirectExecutionTranslator implements PlatformTranslator {
  readonly name = 'Direct';

  constructor(private variableManager: VariableManager) {}

  /**
   * 将JSON指令翻译为variable API调用
   */
  translate(instruction: JSONInstruction): VariableOperation {
    const { op, path, value } = instruction;
    const pathStr = path.join('.');

    switch (op) {
      case 'assign':
        return {
          type: 'update',
          data: this.pathToObject(path, value),
          options: {
            scope: this.inferScope(path[0])
          }
        };

      case 'get':
        return {
          type: 'get',
          path: pathStr,
          options: {
            scope: this.inferScope(path[0])
          }
        };

      case 'delete':
        return {
          type: 'update',
          data: this.pathToObject(path, null),
          options: {
            scope: this.inferScope(path[0])
          }
        };

      case 'merge':
        return {
          type: 'merge',
          data: this.pathToObject(path, value),
          options: {
            scope: this.inferScope(path[0])
          }
        };

      case 'push':
        return {
          type: 'array_push',
          path: pathStr,
          value: value,
          options: {
            scope: this.inferScope(path[0])
          }
        };

      case 'pop':
        return {
          type: 'array_pop',
          path: pathStr,
          options: {
            scope: this.inferScope(path[0])
          }
        };

      default:
        throw new Error(`Unsupported operation for Direct execution: ${op}`);
    }
  }

  /**
   * 批量翻译
   */
  translateBatch(instructions: JSONInstruction[]): VariableOperation[] {
    return instructions.map(inst => this.translate(inst));
  }

  /**
   * 将路径数组转换为嵌套对象
   */
  private pathToObject(path: string[], value: any): Record<string, any> {
    const result: any = {};
    let current = result;

    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = {};
      current = current[path[i]];
    }

    current[path[path.length - 1]] = value;
    return result;
  }

  /**
   * 从路径推断作用域
   */
  private inferScope(firstKey: string): VariableScope {
    if (firstKey.startsWith('global_')) return VariableScope.GLOBAL;
    if (firstKey.startsWith('chat_')) return VariableScope.CHAT;
    if (firstKey.startsWith('_')) return VariableScope.SCRIPT;
    return VariableScope.CHARACTER;
  }
}

/**
 * 翻译器工厂
 */
class TranslatorFactory {
  private translators: Map<string, PlatformTranslator> = new Map();

  register(translator: PlatformTranslator): void {
    this.translators.set(translator.name, translator);
  }

  get(name: string): PlatformTranslator {
    const translator = this.translators.get(name);
    if (!translator) {
      throw new Error(`Translator not found: ${name}`);
    }
    return translator;
  }

  getAvailable(): string[] {
    return Array.from(this.translators.keys());
  }
}

// 使用示例
const factory = new TranslatorFactory();
factory.register(new MVUTranslator());
factory.register(new DirectExecutionTranslator(variableManager));

const translator = factory.get('MVU');
const mvuCommand = translator.translate({
  op: 'assign',
  path: ['player', 'hp'],
  value: 80,
  old: 100,
  reason: '受到伤害'
});
console.log('MVU command:', mvuCommand);
// 输出: _.set('player.hp', 100, 80); // 受到伤害
```

---

## ⚡ Layer 4: 执行层

```typescript
/**
 * 执行层
 * 职责：执行翻译后的指令
 */
class ExecutionLayer {
  constructor(
    private translator: PlatformTranslator,
    private variableManager?: VariableManager,
    private callbacks?: Map<string, Function>
  ) {}

  /**
   * 执行单条指令
   */
  async execute(instruction: JSONInstruction): Promise<ExecutionResult> {
    const startTime = performance.now();

    try {
      // 特殊处理callback
      if (instruction.op === 'callback') {
        return await this.executeCallback(instruction, startTime);
      }

      // 翻译指令
      const command = this.translator.translate(instruction);

      // 执行命令
      const result = await this.executeCommand(command);

      return {
        success: true,
        instruction,
        result,
        duration: performance.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        instruction,
        error: error.message,
        duration: performance.now() - startTime
      };
    }
  }

  /**
   * 批量执行
   */
  async executeBatch(instructions: JSONInstruction[]): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const instruction of instructions) {
      const result = await this.execute(instruction);
      results.push(result);

      // 如果有错误，可以选择继续或中断
      if (!result.success) {
        console.error('Execution failed:', result.error);
        // 可以选择: break; 来中断后续执行
      }
    }

    return results;
  }

  /**
   * 执行回调函数
   */
  private async executeCallback(
    instruction: JSONInstruction,
    startTime: number
  ): Promise<ExecutionResult> {
    if (!this.callbacks) {
      return {
        success: false,
        instruction,
        error: 'Callback system not initialized',
        duration: performance.now() - startTime
      };
    }

    const funcName = instruction.path[0];
    const callback = this.callbacks.get(funcName);

    if (!callback) {
      return {
        success: false,
        instruction,
        error: `Callback not registered: ${funcName}`,
        duration: performance.now() - startTime
      };
    }

    const args = Array.isArray(instruction.value) ? instruction.value : [instruction.value];
    const result = await callback(...args);

    return {
      success: true,
      instruction,
      result,
      duration: performance.now() - startTime
    };
  }

  /**
   * 执行命令
   */
  private async executeCommand(command: any): Promise<any> {
    if (typeof command === 'string') {
      // MVU格式：通过eval执行（需要安全沙箱）
      return this.executeMVUCommand(command);
    } else if (typeof command === 'object') {
      // 直接格式：调用variable API
      return this.executeDirectCommand(command);
    }

    throw new Error('Unknown command format');
  }

  /**
   * 执行MVU格式命令
   */
  private async executeMVUCommand(command: string): Promise<any> {
    // 这里需要实现MVU命令的执行逻辑
    // 在实际环境中，这会调用现有的MVU解析器
    console.log('Executing MVU command:', command);
    
    // 示例：如果有全局的MVU执行器
    if (typeof window !== 'undefined' && (window as any).executeMVUCommand) {
      return (window as any).executeMVUCommand(command);
    }

    throw new Error('MVU executor not available');
  }

  /**
   * 执行直接命令
   */
  private async executeDirectCommand(command: VariableOperation): Promise<any> {
    if (!this.variableManager) {
      throw new Error('VariableManager not available');
    }

    switch (command.type) {
      case 'update':
        return await this.variableManager.update(command.data, command.options);

      case 'get':
        return await this.variableManager.get(command.path, command.options?.scope);

      case 'merge':
        return await this.variableManager.merge(command.data, command.options);

      case 'array_push':
      case 'array_pop':
        // 调用数组操作方法
        return await this.variableManager.arrayOperation(
          command.path,
          command.type,
          command.value,
          command.options
        );

      default:
        throw new Error(`Unknown command type: ${(command as any).type}`);
    }
  }
}
```

---

## 🎮 完整管道实现

```typescript
/**
 * 完整的翻译器管道
 */
class TranslatorPipeline {
  private parser: JSONParserLayer;
  private validator: InstructionValidatorLayer;
  private translator: PlatformTranslator;
  private executor: ExecutionLayer;

  constructor(
    translator: PlatformTranslator,
    variableManager?: VariableManager,
    callbacks?: Map<string, Function>
  ) {
    this.parser = new JSONParserLayer();
    this.validator = new InstructionValidatorLayer();
    this.translator = translator;
    this.executor = new ExecutionLayer(translator, variableManager, callbacks);
  }

  /**
   * 完整流程：解析 → 验证 → 翻译 → 执行
   */
  async process(llmOutput: string): Promise<PipelineResult> {
    const startTime = performance.now();

    // 1. 解析
    const parseResult = this.parser.parse(llmOutput);
    if (parseResult.errors.length > 0) {
      console.warn('Parse errors:', parseResult.errors);
    }

    // 2. 验证
    const validations = parseResult.instructions.map(inst => ({
      instruction: inst,
      validation: this.validator.validate(inst)
    }));

    const validInstructions = validations
      .filter(v => v.validation.valid)
      .map(v => v.instruction);

    const invalidInstructions = validations
      .filter(v => !v.validation.valid);

    // 3. 执行有效的指令
    const executionResults = await this.executor.executeBatch(validInstructions);

    // 4. 汇总结果
    return {
      success: invalidInstructions.length === 0 && 
               executionResults.every(r => r.success),
      parsed: parseResult.instructions.length,
      validated: validInstructions.length,
      executed: executionResults.filter(r => r.success).length,
      errors: [
        ...parseResult.errors,
        ...invalidInstructions.map(v => v.validation.errors).flat(),
        ...executionResults.filter(r => !r.success).map(r => r.error!)
      ],
      results: executionResults,
      duration: performance.now() - startTime
    };
  }
}

interface PipelineResult {
  success: boolean;
  parsed: number;
  validated: number;
  executed: number;
  errors: string[];
  results: ExecutionResult[];
  duration: number;
}

// 完整使用示例
async function example() {
  // 1. 初始化
  const variableManager = new VariableManager(adapter);
  const callbacks = new Map<string, Function>();
  callbacks.set('showMessage', (msg: string) => console.log(msg));

  // 2. 创建管道（选择MVU翻译器）
  const pipeline = new TranslatorPipeline(
    new MVUTranslator(),
    variableManager,
    callbacks
  );

  // 3. LLM输出
  const llmOutput = `
玩家升级了！

\`\`\`json
[
  {
    "op": "assign",
    "path": ["player", "level"],
    "value": 2,
    "old": 1,
    "reason": "升到2级"
  },
  {
    "op": "callback",
    "path": ["showMessage"],
    "value": ["恭喜升级！"]
  }
]
\`\`\`
  `;

  // 4. 处理
  const result = await pipeline.process(llmOutput);

  // 5. 输出结果
  console.log('Pipeline result:', {
    success: result.success,
    parsed: result.parsed,
    validated: result.validated,
    executed: result.executed,
    duration: result.duration
  });

  if (!result.success) {
    console.error('Errors:', result.errors);
  }
}
```

---

## 📊 性能优化

```typescript
/**
 * 带缓存的翻译器
 */
class CachedTranslator implements PlatformTranslator {
  private cache: Map<string, any> = new Map();

  constructor(private baseTranslator: PlatformTranslator) {}

  get name(): string {
    return `${this.baseTranslator.name}+Cache`;
  }

  translate(instruction: JSONInstruction): any {
    const key = this.getCacheKey(instruction);
    
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const result = this.baseTranslator.translate(instruction);
    this.cache.set(key, result);
    return result;
  }

  translateBatch(instructions: JSONInstruction[]): any {
    return this.baseTranslator.translateBatch(instructions);
  }

  private getCacheKey(instruction: JSONInstruction): string {
    return JSON.stringify(instruction);
  }

  clearCache(): void {
    this.cache.clear();
  }
}
```

---

## 📚 相关文档

- [`json-instruction-spec.md`](./json-instruction-spec.md) - JSON指令格式规范
- [`wrapper.md`](./wrapper.md) - 原MVU实现参考
- [`adapter.md`](./adapter.md) - 规则注入系统

---

> **总结**：四层翻译器架构实现了从JSON黄金标准到各平台格式的无缝转换，保证了系统的灵活性和可扩展性。