# Claude Code 语音输入插件项目计划书

## 1. 项目目标

实现一个面向 Claude Code 的“语音输入插件”（工程形态：本地语音输入 companion + MCP 服务 + Skill 调用），支持：

1. 连续语音转文字（中文优先）。
2. 自动清理语气词/口头禅（如“嗯”“那个”“就是”等）。
3. 识别语音控制命令并执行编辑动作：
   - 删除这段话
   - 删除前面一句
   - 取消输入
   - 重新输入
4. 可扩展命令词库与语气词词库。
5. 在 Claude Code 中低延迟、可回退、可审计。

---

## 2. 关键约束与实现策略

### 2.1 约束

- Claude Code 当前更适合通过 **MCP + Skill + 本地守护进程** 扩展，而非依赖单一“官方 GUI 插件 API”。
- 语音命令误触发风险高（“删除”类命令必须有防误触机制）。
- 中文语气词具有上下文依赖，不能简单全量删除（避免删掉真实语义）。

### 2.2 策略

采用“三层架构”：

1. **音频与识别层**：麦克风采集 + VAD + ASR。
2. **文本理解与编辑层**：语气词清理 + 命令识别 + 编辑动作引擎。
3. **Claude Code 集成层**：MCP 工具暴露 + Skill 编排 + 可选热键触发。

---

## 3. 技术栈建议

## 3.1 核心栈

- **Node.js 22 + TypeScript**：主工程、MCP Server、命令路由、状态管理。
- **Python 3 + faster-whisper**：高质量中文 ASR（离线可用，性价比高）。
- **Silero VAD / webrtcvad**：语音端点检测（降低空白音频开销）。
- **WebSocket / stdio IPC**：Node 与 Python ASR worker 通信。

## 3.2 可选能力

- **OpenAI Whisper API**（云端）作为备选识别通道。
- **onnxruntime + punctuation model** 用于断句增强。
- **SQLite**（轻量本地）存储用户词典、命令规则、审计日志。

## 3.3 UI 形态（优先级从高到低）

1. **无 UI CLI 模式（MVP）**：通过命令启动/停止录音与提交。
2. 轻量 TUI（后续）：展示实时转写、命令命中、撤销栈。
3. 桌面 overlay（远期）：按键说话、悬浮状态提示。

---

## 4. 系统架构设计

## 4.1 模块划分

1. `audio-capture`
   - 麦克风采集
   - 增益/降噪（可选）
   - 分帧推送

2. `asr-worker`（Python）
   - VAD 分段
   - 流式识别
   - 输出部分结果与最终结果

3. `normalizer`
   - 文本标准化（全角半角、标点、空格）
   - 语气词清理（规则+上下文保护）

4. `intent-parser`
   - 命令词识别（优先精确规则）
   - 冲突消解（命令 vs 普通语句）

5. `editor-engine`
   - 缓冲区模型
   - 操作栈（undo/redo）
   - 句级删除、段级删除、重输

6. `mcp-server`
   - 暴露工具：`voice_start`, `voice_stop`, `voice_commit`, `voice_cancel`, `voice_retry`
   - 返回结构化状态给 Claude Code

7. `skill`
   - 组合 MCP 工具形成用户可调用流程
   - 定义推荐提示词与安全确认模板

## 4.2 数据流

1. 用户按键开始录音 → `audio-capture`。
2. 音频帧传给 `asr-worker`。
3. 识别文本进入 `normalizer` 清理语气词。
4. 进入 `intent-parser` 判定是否命令。
5. 若是命令，`editor-engine` 执行动作；否则写入输入缓冲区。
6. 用户确认后 `voice_commit`，将最终文本提交到 Claude Code 输入框。

---

## 5. 语气词清理与命令识别设计

## 5.1 语气词清理

采用“分级清理”策略：

- **强删除词**（默认删）：`嗯`, `呃`, `啊`（独立成词时）。
- **弱删除词**（条件删）：`就是`, `然后`, `那个`（仅在句首或重复出现时删除）。
- **保护短语**（不删）：如“就是这样”“那个年代”这类语义固定搭配。

处理流程：

1. 分词与断句。
2. 规则引擎逐层处理。
3. 可选小模型/统计打分，判断是否保留。
4. 输出前后 diff 供调试。

## 5.2 命令识别

优先用**显式命令语法**（减少误删）：

- `命令：删除前面一句`
- `命令：取消输入`

同时支持自然说法，但走低置信度路径：

- “把前面一句删掉”
- “重来一遍”

风险动作（删除整段、取消输入）执行前增加二次确认（可配置：严格模式开启）。

---

## 6. 分阶段实施计划

## Phase 0：项目初始化（0.5~1 天）

- 创建工程骨架（Node + TS + Python worker）。
- 统一日志与配置体系（`.env` + `config.yaml`）。
- 约定模块接口与 IPC 协议。

交付：可运行空壳程序与基础目录结构。

## Phase 1：MVP 语音转写（2~3 天）

- 接通麦克风采集。
- faster-whisper 实时/准实时转写。
- 命令行打印 partial/final 结果。

交付：稳定语音转文字链路。

## Phase 2：文本清理与编辑引擎（2~3 天）

- 语气词清理规则 v1。
- 输入缓冲区 + 删除前一句/删除段落/取消/重输。
- undo 支持。

交付：可编辑、可回退的文本缓冲区。

## Phase 3：命令识别与安全控制（2 天）

- 命令词库与别名。
- 置信度阈值。
- 高风险动作确认机制。

交付：可控命令执行，不易误触。

## Phase 4：Claude Code 集成（2 天）

- 实现 MCP Server 工具。
- 增加 Skill 脚本，封装常见流程。
- 实测在 Claude Code 会话中可调用。

交付：Claude Code 可直接用的语音输入插件能力。

## Phase 5：质量与发布（2 天）

- 单元测试（清理规则、命令解析、编辑引擎）。
- 集成测试（端到端语音→文本→命令）。
- 文档与安装脚本。

交付：可复现安装、可回归测试、可发布版本。

---

## 7. 目录建议

```text
claude-voice-commander/
  README.md
  package.json
  tsconfig.json
  .env.example
  apps/
    mcp-server/
      src/
    cli/
      src/
  services/
    asr-worker/
      requirements.txt
      main.py
  packages/
    core/
      src/
        normalizer/
        intent/
        editor/
    shared/
      src/
  skills/
    voice-input/
      SKILL.md
  test/
    unit/
    integration/
  docs/
    architecture.md
    command-spec.md
    cleanup-rules.md
```

---

## 8. 关键难点与应对

1. **命令误触发**
   - 应对：显式命令前缀 + 置信度阈值 + 高风险二次确认。

2. **中文语气词误删语义**
   - 应对：强/弱删除分层 + 保护短语 + diff 回看。

3. **实时性与准确率平衡**
   - 应对：partial 先展示、final 再提交；模型可配置（small/medium）。

4. **跨平台音频兼容**（macOS/Linux/WSL）
   - 应对：抽象音频驱动层，提供设备探测与回退策略。

5. **与 Claude Code 输入流整合**
   - 应对：MCP 工具先闭环，再逐步增强热键与自动提交。

---

## 9. 测试策略

- **单元测试**
  - 语气词清理：输入/输出快照测试。
  - 命令识别：多说法映射测试。
  - 编辑引擎：操作序列与撤销恢复测试。

- **集成测试**
  - 音频片段回放 -> ASR -> 清理 -> 命令执行。
  - MCP 接口契约测试。

- **验收标准（DoD）**
  - 普通口述识别可用；
  - 4 个核心命令稳定可执行；
  - 误触发率在可接受范围（需定义阈值）；
  - 整体流程在 Claude Code 中可运行。

---

## 10. 首批里程碑（建议）

- M1：完成语音转写链路（可看见实时文本）。
- M2：完成语气词清理 + 4 个命令动作。
- M3：完成 MCP 集成，Claude Code 内可一键调用。
- M4：完成测试和首版发布（v0.1.0）。

---

## 11. 下一步可立即执行的任务清单

1. 初始化 Node+TS 主工程与 Python worker。
2. 定义 ASR worker IPC 协议（JSON schema）。
3. 实现 MVP：录音 10 秒 -> 输出清理后文本。
4. 实现命令识别最小集（删除前句、取消输入、重新输入）。
5. 接入 MCP Server 并在本地 Claude Code 会话验证。
