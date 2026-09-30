---
name: kie-chat-agents
description: 当用户想让本地 coding agent 跑在 KIE 的 chat 模型(api.kie.ai)上、询问某个 agent 能用哪些 KIE 模型,或询问如何为其配置 base URL、API key、provider 表或模型名时使用。目前覆盖 Codex CLI、Claude Code 和 Grok Build。模型的 wire 协议与 agent 不一致、需要本地翻译代理时也使用本 skill。
---

# 把 KIE 的 chat 模型接入本地 agent

KIE(`api.kie.ai`)的 chat 模型按各家厂商自己的 wire 协议对外提供。agent 的协议和模型
的协议一致时,不需要适配层;不一致时,中间要放一个本地翻译代理,见
[协议不一致时](#协议不一致时)。

一个 agent 一节,每节自成一体:怎么列出该 agent 能跑的模型、它要什么配置、它会怎么失
败。**目前覆盖了 Codex CLI、Claude Code 和 Grok Build**;其他 agent 后续作为并列的章节
加进来。
协议不一致那一节是共用的,新 agent 不必再写一张配对表。

English: [references/en.md](references/en.md)

## 先决条件

一个 <https://kie.ai/api-key> 上创建的 KIE API key,导出为 `KIE_API_KEY`,以及装好你要
配置的那个 agent。

列模型的片段需要 `PATH` 上有 `curl` 和 `jq`。多数系统不预装 `jq`:`brew install jq`、
`apt install jq` 或 `winget install jqlang.jq`。

PowerShell 的 `curl` 是 `Invoke-WebRequest` 的别名,不接受这些参数。要像下面的 Windows
片段那样写 `curl.exe`。`cmd.exe` 下片段必须重写,不能直接粘贴。

## Codex CLI

Codex 说的是 OpenAI Responses 协议,KIE 的 Codex 模型正是按这个协议提供的。Codex 通过
`config.toml` 里定义的一个自定义 provider 连过来。

### 重要规则

1. **通过 `GET https://api.kie.ai/openai/v1/models` 发现模型,不要凭记忆或训练数据写
   模型名。** 这个接口给出的才是 Codex 真正能跑的那份列表。
2. **用 `Authorization: Bearer` 认证。** KIE 的所有接口都靠这一个请求头携带 API key,
   列模型接口也一样。名字就叫 `apikey` 的请求头会被 401 拒掉。
3. **必须显式设 `model`。** Codex 内置的默认模型名不是 KIE 提供的名字,所以 provider
   哪怕其余都对,在 `model` 写成列表里的 slug 之前,每一次请求都会失败。
4. **provider 要写进用户级配置。** 项目级 `.codex/config.toml` 里的 `model_provider`
   和 `model_providers` 会被 Codex 忽略。

### 列出可用模型

```bash
curl -s -H "Authorization: Bearer $KIE_API_KEY" \
  https://api.kie.ai/openai/v1/models |
  jq -r '.models[] | [.slug, .display_name, (.context_window | tostring),
                      .default_reasoning_level,
                      ([.supported_reasoning_levels[].effort] | join(","))] | @tsv'
```

Windows(PowerShell)下用 `curl.exe` 发同样的请求:

```powershell
curl.exe -s -H "Authorization: Bearer $env:KIE_API_KEY" `
  https://api.kie.ai/openai/v1/models | jq -r '.models[].slug'
```

同一份模型在响应里出现两次。`.data[]` 是 OpenAI 兼容的形状,其中只有 `id` 能标识模型,
其余(`created`、`object`、`owned_by`)是样板字段。`.models[]` 是信息更全的那份,要读的
是它:`slug` 就是填进 `model` 的值,`context_window`、`default_reasoning_level`、
`supported_reasoning_levels` 说明这个模型接受什么。

把 slug 列给用户去选。每次都重新跑这个列表,不要复用之前的答案——模型集合会变。

### 写配置

Codex 通过 `config.toml` 里的一张表配置自定义 provider,模型写在顶层:

```toml
model = "gpt-5.5"
model_provider = "kie"

[model_providers.kie]
name = "KIE"
base_url = "https://api.kie.ai/openai/v1"
env_key = "KIE_API_KEY"
wire_api = "responses"
```

`base_url` 是发请求的根路径,Codex 会自己往后面拼 `/responses`,所以这里配的是
`https://api.kie.ai/openai/v1`,不是完整的请求 URL `https://api.kie.ai/openai/v1/responses`。

`env_key` 指的是 Codex 从哪个环境变量里读凭证并作为 bearer token 发出去,它本身不存放
密钥。

`wire_api = "responses"` 对应的正是 KIE 提供的协议。它同时也是 Codex 的默认值,可以
省略——写出来是为了让这张表自己讲清楚。

provider 的 id——这里的 `kie`——由你自己取,但 `openai`、`ollama`、`lmstudio` 是保留
的,覆盖不了。

#### macOS 与 Linux

文件是 `~/.codex/config.toml`。在启动 `codex` 的同一个 shell 里导出凭证,或者写进 shell
profile:

```bash
export KIE_API_KEY=…
```

设 `CODEX_HOME` 可以把配置放到 `~/.codex` 以外的地方。

#### Windows(PowerShell)

文件是 `%USERPROFILE%\.codex\config.toml`,内容完全一致。

```powershell
$env:KIE_API_KEY = "…"
setx KIE_API_KEY "…"
```

### 推理强度

`model_reasoning_effort` 决定模型投入多少推理:

```toml
model_reasoning_effort = "high"
```

Codex 接受 `low`、`medium`、`high`、`xhigh`,以及**从 Codex 0.154 起**支持的
`max`——`max` 会原样透传给后端(已在 `gpt-6-astra` 上实测通过)。从该模型
`supported_reasoning_levels` 里挑一个,或者干脆不写这个键,走模型的
`default_reasoning_level`。Codex 0.153 及更早版本会把 `max` 判为未知值拒掉——
要用先升级 Codex。

### 确认配置生效

`codex doctor` 会报告 Codex 加载到了什么、以及能不能连上 provider。`auth` 那一节应该
显示 provider 的环境变量已存在。`reachability` 那一节探测的是 `base_url` 拼上
`/models`,配对了就会报可达。

provider 是否可用由一次真实请求确认:在设好 `KIE_API_KEY` 的 shell 里启动 `codex`,
发一条消息。

Codex 启动时可能打印 `Model metadata for '…' not found. Defaulting to fallback
metadata.`。那是 Codex 在说这个 slug 不在它自带的模型表里——KIE 的每个 slug 都不在;
会话照常运行。

### 常见坑

1. **名字就叫 `apikey` 的请求头。** KIE 会返回 401。key 要放进
   `Authorization: Bearer`。
2. **把完整请求 URL 写进 `base_url`。** Codex 自己会拼 `/responses`,所以 `base_url`
   以 `/responses` 结尾会拼成 `/responses/responses`。
3. **没换掉 Codex 内置的默认模型名。** 即使凭证和 base URL 都对,`model` 也必须是列表
   里的某个 slug。
4. **provider 配置写进了项目级文件。** Codex 会忽略用户级配置以外的 `model_provider`
   和 `model_providers`,写在项目 `.codex/config.toml` 里的 provider 是被静默跳过的。
5. **用了保留的 provider id。** `openai`、`ollama`、`lmstudio` 覆盖不了,表名要换一个。
6. **把密钥直接写进 `env_key`。** 它填的是环境变量名,密钥本身在那个变量里,不在配置
   文件里。
7. **`setx` 不影响当前窗口。** 它对此后新开的窗口生效。想立刻用上,同时设 `$env:`。
8. **PowerShell 的 `curl`。** 它是 `Invoke-WebRequest` 的别名,不接受这些参数。用
   `curl.exe`。

要用不是本协议的 listing 里的模型,见[协议不一致时](#协议不一致时)。

## Claude Code

Claude Code 说的是 Anthropic Messages 协议,KIE 的 Claude 模型正是按这个协议提供的。
Claude Code 通过 `ANTHROPIC_BASE_URL` 和一个凭据变量连过来。

### 重要规则

1. **通过 `GET https://api.kie.ai/anthropic/v1/models` 发现模型,不要凭记忆或训练数据写
   模型名。** 这个接口给出的才是 Claude Code 真正能跑的那份列表。通用的
   `taskType=Chat` 目录是另一份更宽的列表:里面有这个接口并不提供的模型。
2. **用 `Authorization: Bearer` 认证。** KIE 的所有接口都靠这一个请求头携带 API key,
   列模型接口也一样。名字就叫 `apikey` 的请求头会被 401 拒掉。Claude Code 从
   `ANTHROPIC_AUTH_TOKEN` 读这个头,并自己加上 `Bearer ` 前缀,所以变量里放原始 key。
   `ANTHROPIC_API_KEY` 会作为 `X-Api-Key` 发出;KIE 只在这个头的值以 `Bearer ` 开头
   (含空格)时才接受。
3. **`ANTHROPIC_BASE_URL` 要写成 `https://api.kie.ai/anthropic`。** Claude Code 会自己
   往后面拼 `/v1/messages`。列模型和发请求共用这一前缀:`GET /anthropic/v1/models` 和
   `POST /anthropic/v1/messages`。

### 列出可用模型

```bash
curl -s -H "Authorization: Bearer $KIE_API_KEY" \
  https://api.kie.ai/anthropic/v1/models |
  jq -r '.data[] | [.id, .display_name, (.max_input_tokens | tostring),
                    (.max_tokens | tostring)] | @tsv'
```

Windows(PowerShell)下用 `curl.exe` 发同样的请求:

```powershell
curl.exe -s -H "Authorization: Bearer $env:KIE_API_KEY" `
  https://api.kie.ai/anthropic/v1/models | jq -r '.data[].id'
```

响应是 Anthropic 兼容的形状。`.data[]` 就是列表:`id` 是 Claude Code 发出去的模型名,
`display_name`、`max_input_tokens`、`max_tokens` 说明这个模型接受什么。`type` 和
`created_at` 是样板字段。若 `has_more` 为 true,把 `after_id` 设成 `last_id` 再请求
下一页。

这些 id 和 Anthropic 官方的一致。用户要指定模型时再把 id 列出来。每次都重新跑这个
列表,不要复用之前的答案——模型集合会变。

### 写配置

Claude Code 用环境变量接收 base URL、凭据和模型:

```bash
export ANTHROPIC_BASE_URL=https://api.kie.ai/anthropic
export ANTHROPIC_AUTH_TOKEN=$KIE_API_KEY
```

`ANTHROPIC_BASE_URL` 是发请求的根路径,Claude Code 会自己往后面拼 `/v1/messages`,
所以这里配的是 `https://api.kie.ai/anthropic`,不是完整的请求 URL
`https://api.kie.ai/anthropic/v1/messages`。

`ANTHROPIC_AUTH_TOKEN` 存放密钥。Claude Code 把它作为 `Authorization: Bearer` 发出去。
不要在值里再写 `Bearer `——那样会变成 `Bearer Bearer …`。

另一个凭据变量是 `ANTHROPIC_API_KEY`,作为 `X-Api-Key` 发出,值必须是 `Bearer ` 加上
key。

KIE 用的 id 和 Anthropic 官方一致,所以 Claude Code 内置的 `sonnet`、`opus`、`haiku`、
`fable` 别名不用重映射就能用。只有要指定某个模型时,才把 `ANTHROPIC_MODEL` 设成列表
里的 id,或用 `--model` / `/model` 切换。settings 文件里的 `model` 键只在
`ANTHROPIC_MODEL` 未设置时生效。

同样的变量可以写进 settings 文件的 `env`:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.kie.ai/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "…"
  }
}
```

同一个变量在 shell 和 settings 文件里都设了时,以 settings 文件为准。不要把凭据写进
项目级 `.claude/settings.json`——那个文件会进仓库。用用户级文件或
`.claude/settings.local.json`。

#### macOS 与 Linux

用户级文件是 `~/.claude/settings.json`。在启动 `claude` 的同一个 shell 里导出这些
变量,或者写进 shell profile:

```bash
export ANTHROPIC_BASE_URL=https://api.kie.ai/anthropic
export ANTHROPIC_AUTH_TOKEN=$KIE_API_KEY
```

#### Windows(PowerShell)

文件是 `%USERPROFILE%\.claude\settings.json`,内容完全一致。

```powershell
$env:ANTHROPIC_BASE_URL = "https://api.kie.ai/anthropic"
$env:ANTHROPIC_AUTH_TOKEN = $env:KIE_API_KEY
setx ANTHROPIC_BASE_URL "https://api.kie.ai/anthropic"
setx ANTHROPIC_AUTH_TOKEN "$env:KIE_API_KEY"
```

`setx` 对此后新开的窗口生效。想立刻用上,同时设 `$env:`。

### 确认配置生效

在设好这些变量的 shell 里启动 `claude`,运行 `/status`。Status 页应显示
`Anthropic base URL` 为 `https://api.kie.ai/anthropic`,以及一行点名
`ANTHROPIC_AUTH_TOKEN` 的鉴权信息(若用的是 `ANTHROPIC_API_KEY`,则点那个名字)。然后
发一条消息。

若弹出 Anthropic 账号登录,说明变量没有进到这个进程。彻底退出终端,从已导出变量的
shell 里重新打开。

`claude --debug` 会打印 Claude Code 实际发出的请求。

### 常见坑

1. **裸的 `ANTHROPIC_API_KEY`,或名字就叫 `apikey` 的请求头。** KIE 会返回 401。优先
   把原始 key 放进 `ANTHROPIC_AUTH_TOKEN`。若用 `ANTHROPIC_API_KEY`,值必须以
   `Bearer ` 开头。
2. **把完整请求 URL 写进 `ANTHROPIC_BASE_URL`。** Claude Code 自己会拼
   `/v1/messages`,所以值以 `/v1` 或 `/v1/messages` 结尾会拼成 `/v1/v1/messages`。
3. **报 `model not found`。** Claude Code 要的 id 这个接口没有。运行 `/model`,从列表
   里挑一个。
4. **凭据写进了项目级 `.claude/settings.json`。** 那个文件会进仓库。用用户级文件或
   `.claude/settings.local.json`。
5. **在 `ANTHROPIC_AUTH_TOKEN` 里写了 `Bearer `。** Claude Code 自己会加前缀,请求头
   会变成 `Bearer Bearer …`。
6. **`setx` 不影响当前窗口。** 它对此后新开的窗口生效。想立刻用上,同时设 `$env:`。
7. **PowerShell 的 `curl`。** 它是 `Invoke-WebRequest` 的别名,不接受这些参数。用
   `curl.exe`。
8. **弹出 Anthropic 账号登录。** 这个进程里变量是空的。关掉所有终端,包括编辑器里的,
   从已导出变量的 shell 里重开。

要用不是本协议的 listing 里的模型,见[协议不一致时](#协议不一致时)。

## Grok Build

Grok Build 在 `api_backend = "responses"` 时说的是 Responses 协议,KIE 的 Grok 模型
正是按这个协议提供的。Grok Build 通过 `config.toml` 里的 `[model.*]` 表连过来。

### 重要规则

1. **通过 `GET https://api.kie.ai/xai/v1/models` 发现模型,不要凭记忆或训练数据写
   模型名。** 这个接口给出的才是 Grok Build 在这个前缀上能跑的那份列表。通用的
   `taskType=Chat` 目录是另一份更宽的列表:里面有这个接口并不提供的模型。
2. **用 `Authorization: Bearer` 认证。** KIE 的所有接口都靠这一个请求头携带 API key,
   列模型接口也一样。名字就叫 `apikey` 的请求头会被 401 拒掉。
3. **必须设 `api_backend = "responses"`。** Grok Build 的默认后端是
   `chat_completions`,会往 `/v1/chat/completions` 发。KIE 在 `/xai/v1/responses`
   上提供这些模型。
4. **`model` 字段要填 listing 里的 `id`。** 这才是发给 KIE 的名字,既不是表名
   `[model.<name>]`,也不是 Grok Build 自带的拼法(例如 `grok-4.6`)。listing 用的是
   另一套 id(例如 `grok-4-6`)。照抄列表里的 `id`;填自带名字时,就算 `base_url` 对了
   KIE 也会拒。
5. **表要写进用户级配置。** 项目级 `.grok/config.toml` 只贡献 MCP、插件和权限相关
   键,写在那里的 `[model.*]` 不是推理配置。

### 列出可用模型

```bash
curl -s -H "Authorization: Bearer $KIE_API_KEY" \
  https://api.kie.ai/xai/v1/models |
  jq -r '.data[] | .id'
```

Windows(PowerShell)下用 `curl.exe` 发同样的请求:

```powershell
curl.exe -s -H "Authorization: Bearer $env:KIE_API_KEY" `
  https://api.kie.ai/xai/v1/models | jq -r '.data[].id'
```

响应是 OpenAI 兼容的形状。`.data[]` 就是列表:`id` 是填进 `model` 的值。`object`、
`owned_by`、`created`、`aliases` 是样板字段。

把 id 列给用户去选。每次都重新跑这个列表,不要复用之前的答案——模型集合会变。

### 写配置

Grok Build 用 `[model.<name>]` 表配自定义模型。`<name>` 是选择器里的键,`model` 是
发给 KIE 的 id:

```toml
[models]
default = "kie"

[model.kie]
model = "grok-4-6"
base_url = "https://api.kie.ai/xai/v1"
name = "KIE"
api_backend = "responses"
env_key = "KIE_API_KEY"
```

`base_url` 是发请求的根路径,`api_backend = "responses"` 时 Grok Build 会自己往后面
拼 `/responses`,所以这里配的是 `https://api.kie.ai/xai/v1`,不是完整的请求 URL
`https://api.kie.ai/xai/v1/responses`。

`env_key` 指的是 Grok Build 从哪个环境变量里读凭证并作为 bearer token 发出去,它本
身不存放密钥。优先用它,不要把密钥写进 `api_key`。

选择器的键——这里的 `kie`——由你自己取。`[models] default` 必须是这个键(或另一个
`[model.*]` 的键),不能是 Grok 内置目录里的名字,否则新会话仍会打到 xAI 而不是
KIE。

#### macOS 与 Linux

文件是 `~/.grok/config.toml`。在启动 `grok` 的同一个 shell 里导出凭证,或者写进
shell profile:

```bash
export KIE_API_KEY=…
```

设 `GROK_HOME` 可以把配置放到 `~/.grok` 以外的地方。

#### Windows(PowerShell)

文件是 `%USERPROFILE%\.grok\config.toml`,内容完全一致。

```powershell
$env:KIE_API_KEY = "…"
setx KIE_API_KEY "…"
```

### 确认配置生效

`grok models` 应列出这个自定义键。`grok inspect` 会报告哪份配置文件生效。在设好
`KIE_API_KEY` 的 shell 里启动 `grok` 发一条消息,或 `grok -p "…" -m kie`。

`RUST_LOG=debug GROK_LOG_FILE=/tmp/grok.log grok` 会写下请求轨迹。看 `base_url` 和
模型 id。

### 常见坑

1. **名字就叫 `apikey` 的请求头。** KIE 会返回 401。key 要放进
   `Authorization: Bearer`。
2. **把完整请求 URL 写进 `base_url`。** `api_backend = "responses"` 时 Grok Build
   自己会拼 `/responses`,所以 `base_url` 以 `/responses` 结尾会拼成
   `/responses/responses`。
3. **没写 `api_backend`。** 默认是 `chat_completions`,会往 `/v1/chat/completions`
   发,不是 `/xai/v1/responses`。
4. **把 Grok 自带的名字填进了 `model`。** KIE 读的是 `[model.<name>]` 里的 `model`
   字段,必须是 listing 的 `id`。自带拼法例如 `grok-4.6` 不是那个 id。
5. **`[model.*]` 写进了项目级 `.grok/config.toml`。** 那个文件不承载推理配置。用
   `~/.grok/config.toml`。
6. **把密钥直接写进 `env_key`。** 它填的是环境变量名,密钥本身在那个变量里,不在配置
   文件里。
7. **`setx` 不影响当前窗口。** 它对此后新开的窗口生效。想立刻用上,同时设 `$env:`。
8. **PowerShell 的 `curl`。** 它是 `Invoke-WebRequest` 的别名,不接受这些参数。用
   `curl.exe`。

要用不是本协议的 listing 里的模型,见[协议不一致时](#协议不一致时)。

## 协议不一致时

本 skill 里每个 agent 说一种 wire 协议,KIE 的每份 listing 也按一种协议提供。两者
一致时,按该 agent 那一节配置,流量打到 `api.kie.ai`。不一致时,需要一个本地翻译代理。

### 什么时候需要代理

1. 读该 agent 那一节:它说什么协议、会往后面拼哪一段。
2. 读模型的 listing:KIE 按什么协议提供。
3. 协议相同:不需要代理。协议不同:告诉用户需要本地翻译代理,并且 **动手写之前先问**。
   用户可能已经有代理,也可能这次并不想写。未经询问不要生成代理代码。
4. 用户已有代理,或明确要求写一个之后,agent 的 base URL 指到代理,不指到
   `api.kie.ai`。
5. 列模型走 **模型那一侧** 的 listing,不走 agent 原生 listing。agent 的模型配置填
   那份列表里的 id——它内置的默认名和别名只对原生协议成立。

### 代理要暴露什么

| 模型 listing | KIE 请求 | 协议 |
|---|---|---|
| `GET /openai/v1/models` | `POST /openai/v1/responses` | Responses |
| `GET /anthropic/v1/models` | `POST /anthropic/v1/messages` | Messages |
| `GET /xai/v1/models` | `POST /xai/v1/responses` | Responses |

代理听的是 **agent 会拼出来的那条路径**,转到 **该 listing 对应的 KIE 请求**。两个
方向都要翻译,包括 agent 实际会发的流式和 tool 调用。打到 KIE 的鉴权是
`Authorization: Bearer $KIE_API_KEY`。

以后新 agent 的 listing 不在这张表里时,加一行即可。这一节的规则不用改。

### 写代理时

只有用户明确要求时才写。映射要诚实,不要发明平台行为。

1. **两种协议的形状从真实 agent 请求和官方协议里学,不要凭记忆填字段。** 抓 agent
   实际发出的请求(`claude --debug`、Codex 日志、`GROK_LOG_FILE`)和 KIE 在模型路径上
   要的形状。凭训练数据拼出来的字段表通常是残的。
2. **`model` id 原样转发。** 不要写死默认模型名,也不要把 `sonnet` / `opus` /
   `claude-*` 改写成 GPT slug,反过来也不要。
3. **若代理要接 `GET /models`,返回的是 agent 期望的列表形状,数据来自模型那一侧的
   KIE listing。** 把另一边的文档原样转过去形状是错的。listing 失败就是错误,不要
   编一条假模型。
4. **工具调用必须能走完一轮。** `id` / `call_id` / `tool_use_id` 在请求和下一轮的
   tool result 里保持一致。不要丢掉 `tools`。KIE 若拒绝 tools,把那个错误传回去。
5. **流式必须按 agent 结束一轮的方式收尾。** 发出该 agent 会消费的事件序列,包括
   终态事件。KIE 中途报错或断流时,agent 必须看到失败,而不是 HTTP 200 加一轮空的
   completed。
6. **不要为了绕过协议限制而塞进新的 user/assistant 内容。** 有的 Messages 模型拒
   绝以 assistant 收尾的对话。编一条后续 user 能让请求合法,但会改掉这一轮的语义
   ——Codex 会因此不停续写。要么无损改形状,要么把上游错误原样返回。

### 把 agent 指到代理

监听地址是代理自己绑的。agent 的 base URL 仍按它那一节的规则写——Claude Code 会给
`ANTHROPIC_BASE_URL` 拼 `/v1/messages`,Codex 会给 `base_url` 拼 `/responses`,Grok
Build 在 `api_backend = "responses"` 时也会给 `base_url` 拼 `/responses`——所以值里
不要带上这段后缀。

把规则用到 Claude Code 跑 Responses 模型:

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:<port>
export ANTHROPIC_AUTH_TOKEN=$KIE_API_KEY
export ANTHROPIC_MODEL=…
```

`ANTHROPIC_MODEL` 是 `GET /openai/v1/models` 里的 id,不是 Claude Code 的 `sonnet` /
`opus` 别名。

把规则用到 Codex CLI 跑 Messages 模型:

```toml
model = "…"
model_provider = "kie"

[model_providers.kie]
name = "KIE"
base_url = "http://127.0.0.1:<port>/v1"
env_key = "KIE_API_KEY"
wire_api = "responses"
```

`model` 是 `GET /anthropic/v1/models` 里的 id。`base_url` 仍然不要带 `/responses`。

不要一边让 agent 的 base URL 还指着 `api.kie.ai`,一边发另一份 listing 里的 id;也不
要把 agent 直接指到模型那一侧的 KIE 前缀而不经翻译。

### 本 skill 不提供什么

本 skill 不包含、不生成、也不点名任何翻译代理。它只声明监听路径、KIE 路径、该读哪
份 listing,以及 agent 里哪个配置项填代理地址。只有用户明确要求时才写代理代码。
