# Claude Voice Commander

一个给 Claude Code 用的语音输入工具：
- 音频转写（本地 Python ASR Worker，优先 `faster-whisper`）
- 语气词清理（如“嗯”“那个”等）
- 语音编辑命令识别与执行（删除前句、取消输入、重新输入等）
- 严格模式下高风险命令二次确认

---

## 1. 安装与启动

在项目目录执行：

```bash
cd /root/claude-voice-commander
npm install
```

启动 MCP Server（stdio）：

```bash
npm run mcp
```

> 该服务会暴露一组 `voice_*` MCP tools，供 Claude Code 调用。

---

## 2. 在 Claude Code 中接入

将本项目作为一个 **stdio MCP Server** 加到 Claude Code：

- **command**: `npm`
- **args**: `--prefix`, `/root/claude-voice-commander`, `run`, `mcp`

如果你使用的是可编辑的 MCP 配置文件，核心就是上述 command/args。

---

## 3. 可用工具（MCP）

服务入口在 `apps/mcp-server/src/server.ts`，当前工具包括：

- `voice_start`：开始语音输入会话
- `voice_stop`：停止语音输入会话
- `voice_status`：查看当前状态
- `voice_ingest_text`：注入文本（模拟识别结果）
- `voice_transcribe_file`：转写本地音频并注入流程
- `voice_commit`：提交当前缓冲区
- `voice_cancel`：取消当前输入
- `voice_retry`：清空并重新输入
- `voice_confirm_pending`：确认/拒绝待确认命令
- `voice_set_strict_mode`：设置严格模式

---

## 4. 在 Claude Code 里的典型使用流程

1. `voice_start`
2. `voice_transcribe_file`（传音频路径）或 `voice_ingest_text`（文本模拟）
3. 如返回 `pendingCommand`，调用 `voice_confirm_pending`
4. `voice_commit` 提交结果
5. `voice_stop`

---

## 5. CLI（本地调试）

### 交互模式

```bash
npm run cli
```

支持：
- `/file <音频路径>`
- `/commit` `/cancel` `/retry`
- `/confirm yes|no`
- `/strict on|off`
- `/status` `/start` `/stop` `/exit`

### 一次性模式

```bash
npm run cli -- --file ./sample.wav --model small --language zh --beam-size 3
npm run cli -- --text "嗯 我们先把项目骨架搭起来"
```

---

## 6. 测试与构建

```bash
npm run test
npm run build
```

可选回归脚本：

```bash
npm run asr:regression
npm run asr:regression -- ./your-audio-1.wav ./your-audio-2.wav
```

---

## 7. 项目结构

- `apps/cli`：CLI 入口
- `apps/mcp-server`：MCP Server
- `packages/core`：清理/识别/编辑核心逻辑
- `services/asr-worker`：Python ASR Worker
- `tests`：单元与集成测试
