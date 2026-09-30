---
name: kie-models
description: 在 KIE 平台(api.kie.ai)上发现、查价并调用 AI 模型。当用户提到 KIE 或 kie.ai,问"X 用哪个 KIE 模型"、"列出 KIE 模型"、"在 KIE 上跑模型",或需要某个模型的 schema、价格、成功率时使用。
---

# 在 KIE 上调用 AI 模型

KIE(`api.kie.ai`)托管了 200 多个图像、视频、音乐、语音和文本模型。本文覆盖模型发现,
以及走统一任务接口的模型的完整调用流程。

English: [references/en.md](references/en.md)

## 重要规则

1. **通过目录接口发现模型,不要凭记忆或训练数据写模型名。** 目录持续变动——模型会新增、
   改名、下线。你"记得"的名字可能已经不存在。
2. **调用前先拉 schema,并按它返回的 path 调用。** 不是所有模型都走
   `/api/v1/jobs/createTask`,同步聊天和 Gemini 系列模型各有自己的路径。
   假设只有一条路径,必然出错。
3. **必填字段以 schema 的 `required` 数组为准。** 各模型不一致。`callBackUrl` 对统一任务
   接口是可选的,同步接口则没有这个字段。
4. **模型名里的斜杠不要 URL 编码。** `wan/v2-2-t2v` 原样拼进路径:
   `/api/v1/models/wan/v2-2-t2v/schema`。
5. **读 `data` 之前先判响应体里的 `code`。** 所有接口都返回 `{code, msg, data}`。
   HTTP 200 不代表调用成功。
6. **schema 从不描述如何取结果。** 见[取结果](#取结果)。

## 先决条件

下文的代码片段都是 POSIX shell,需要 `PATH` 上有 `curl` 和 `jq`。多数系统不预装
`jq`:`brew install jq`、`apt install jq` 或 `winget install jqlang.jq`。

Windows 上请在 WSL 或 Git Bash 里运行。PowerShell 的 `curl` 是 `Invoke-WebRequest`
的别名,不接受这些参数——要写 `curl.exe`。`cmd.exe` 下片段必须重写,不能直接粘贴。

## 鉴权

每个请求都需要 bearer token:

```
Authorization: Bearer $KIE_API_KEY
```

API key 在 <https://kie.ai/api-key> 创建。base URL 是 `https://api.kie.ai`,
schema 的 `servers` 字段里也有声明。

## 发现模型

### 查询目录

```bash
curl -s -H "Authorization: Bearer $KIE_API_KEY" \
  'https://api.kie.ai/api/v1/models'
```

可选筛选参数,可组合,均不分页:

| 参数 | 含义 |
|---|---|
| `taskType` | 任务类型。多值用逗号分隔。**空格必须百分号编码**——`taskType=Text%20to%20Video,Image%20to%20Video`。裸空格会让 curl 在发出请求前就失败(`http=000`)。用 `+` 也可以,或者交给 curl 编码:`curl -G … --data-urlencode 'taskType=Text to Video'` |
| `provider` | 供应商名,如 `Kling`、`Suno`、`Google` |
| `q` | 关键词模糊匹配 |

响应:

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "total": 202,
    "models": [
      {
        "model": "kling/v2-1-master-text-to-video",
        "slug": "kling/v2-1-master-text-to-video",
        "title": "Affordable Kling 2.1 Master API — Premium Text-to-Video Generation",
        "provider": "Kling",
        "taskType": ["Text to Video"],
        "description": "…",
        "pricingDesc": "A 5-second video costs 160 credits (0.80 USD), …"
      }
    ]
  }
}
```

- `model` 是后续所有接口使用的标识符。一段或两段(`gpt-image-2-text-to-image`、
  `wan/v2-2-t2v`)。
- `description` 可能为 `null`,不要依赖它。
- `pricingDesc` 是文案不是数字,但与实际扣费一致,可以用来估算预算。
- `total` 会随模型的新增、改名、下线而变化。从中读到的任何数量(包括上面示例里的
  那个)都只是某一时刻的快照。
- 筛选条件无匹配时返回 `total: 0` 和空的 `models` 列表;接口故障则以非 200 的
  `code` 返回——空列表永远不是错误。

### 查报价与成功率

```bash
curl -s -H "Authorization: Bearer $KIE_API_KEY" \
  'https://api.kie.ai/api/v1/models/veo-3-1/price'

curl -s -H "Authorization: Bearer $KIE_API_KEY" \
  'https://api.kie.ai/api/v1/models/veo-3-1/success-rate'
```

`price` 返回 `{model, pricingDesc}`,文案与目录接口同源。

`success-rate` 返回最近 24 小时,10 分钟一个采样点,最多 144 个:

```json
{
  "model": "veo-3-1",
  "points": [
    {
      "start": "2026-09-08T07:30:00Z",
      "end": "2026-09-08T07:40:00Z",
      "successRate": 100.0,
      "errorRate": 0.0,
      "isNormal": true
    }
  ]
}
```

无流量的采样点,`successRate` 和 `errorRate` 为 `null`。`points` 为空列表表示没有监控
数据,不代表成功率为零。

### 查余额

提交任务前,把账户余额和模型 `pricingDesc` 对一下:

```bash
curl -s -H "Authorization: Bearer $KIE_API_KEY" \
  'https://api.kie.ai/api/v1/chat/credit'
# → {"code": 200, "msg": "success", "data": 2450}
```

`data` 是余额本身(数字)。目录接口返回的 `pricingDesc` 是单次调用的价格(例如
"A 5-second video costs 160 credits")。发 `createTask` 前先比一下——余额不足时任务
会返回 `code` 402。

## 读 schema

```bash
curl -s -H "Authorization: Bearer $KIE_API_KEY" \
  'https://api.kie.ai/api/v1/models/gpt-image-2-text-to-image/schema'
```

返回 `{model, openapi}`,其中 **`openapi` 就是 OpenAPI 文档本身,以 JSON 对象内联返回**——
直接读 `data.openapi.paths`,无需再解析一层。模型文档尚未同步时该字段为 `null`,此时
如实说明,不要凭空编一个调用路径。有值时它是该模型单个接口的完整 OpenAPI 3.1 文档,
也是以下信息的权威来源:

- 准确的调用路径与方法(`paths`)
- 每个请求字段的类型、说明、是否必填
- 投递到 `callBackUrl` 的回调 payload 结构(`operation.callbacks`)
- 业务错误码(401 未授权、402 额度不足、404 资源不存在、422 参数校验失败、
  429 频率超限、433 子 key 超限、455 服务不可用)
- base URL(`servers`)与鉴权方式(`components.securitySchemes`)

部分模型的 `input` 是 `oneOf` 多选一结构(例如按 task-id 或按 image-url 两种入参形态)。
每个分支有各自的 `required` 列表——只满足其中一个分支,不要跨分支混填字段。

### 解析 `$ref`

`$ref` **未预内联**。它们指向同一份文档的 `components`,一定能在文档内解析——但需要你
自己做解引用。

组件键名是字面量,必须精确匹配:

- 空格被百分号编码:`#/components/schemas/response%20not%20with%20recordId`。
  查找前需对每段路径做 URL 解码。
- 有的键名以空格结尾:`#/components/responses/Error `。匹配时不要 trim 空白。

### 两类模型形态

看 `paths` 区分:

| `paths` 的键 | 形态 |
|---|---|
| `/api/v1/jobs/createTask` | **任务制。** 提交拿 `taskId`,再轮询取结果。下文详述。 |
| 其他 | 同步返回的 chat/completions 接口,结果直接在响应体里。见[统一接口之外的模型](#统一接口之外的模型)。 |

## 图/视频模型的文件上传

目录里约 78 个模型(46 个图生视频、32 个图生图)需要在 `input` 里传一个文件 URL。
不同模型的字段名不一致——`image_url`、`input_image`、`image`、`video_url`、
`first_frame_image` 等等——**必须去 schema 的 `input` 里查准确字段名,不要猜。**

用户已经有公开 HTTPS URL 时直接用。没有就先把文件传到 KIE 的临时文件服务,拿到 URL
再塞进 `input`。

**上传接口在另一个域名:`https://kieai.redpandaai.co`,不是 `api.kie.ai`。**
沿用同一个 bearer token。上传的文件 24h 后自动删除——够用来立刻发一次任务,但不是长期
存储。

| 接口 | 场景 |
|---|---|
| `POST /api/file-base64-upload` | 文件在内存里,小(≤10MB)。JSON body,base64 或 data URL |
| `POST /api/file-stream-upload` | 文件在磁盘上,大(>10MB)。`multipart/form-data` |
| `POST /api/file-url-upload` | 把一个公开 URL 转存到 KIE 的 CDN。JSON body |

三个接口返回同一结构:

```json
{
  "success": true,
  "code": 200,
  "msg": "File uploaded successfully",
  "data": {
    "downloadUrl": "https://tempfile.redpandaai.co/…/my-image.png",
    "fileName": "my-image.png",
    "filePath": "images/user-uploads/my-image.png",
    "fileSize": 154832,
    "mimeType": "image/png",
    "uploadedAt": "2026-09-22T12:00:00.000Z"
  }
}
```

**把 `data.downloadUrl` 填到模型 `input` 里对应的字段**——具体字段名以 schema 为准。

公共 body 字段(三个接口都有):`uploadPath`——必填,前后都不带斜杠(如
`images/user-uploads`);`fileName`——可选,包含扩展名。接口独有:`base64Data`
(base64)、`file`(stream 的表单字段)、`fileUrl`(url)。

```bash
# base64:内存里的小文件
curl -s -X POST 'https://kieai.redpandaai.co/api/file-base64-upload' \
  -H "Authorization: Bearer $KIE_API_KEY" -H 'Content-Type: application/json' \
  -d '{"base64Data": "data:image/png;base64,iVBORw0K…",
       "uploadPath": "images/user-uploads",
       "fileName": "input.png"}'

# stream:磁盘上的大文件
curl -s -X POST 'https://kieai.redpandaai.co/api/file-stream-upload' \
  -H "Authorization: Bearer $KIE_API_KEY" \
  -F "file=@/path/to/input.png" \
  -F "uploadPath=images/user-uploads" \
  -F "fileName=input.png"

# url 转存:从其他站点抓到 KIE
curl -s -X POST 'https://kieai.redpandaai.co/api/file-url-upload' \
  -H "Authorization: Bearer $KIE_API_KEY" -H 'Content-Type: application/json' \
  -d '{"fileUrl": "https://example.com/photo.jpg",
       "uploadPath": "images/downloaded"}'
```

拿到 `downloadUrl` 直接喂给 `createTask`:

```bash
UPLOAD_URL=$(curl -s -X POST 'https://kieai.redpandaai.co/api/file-stream-upload' \
  -H "Authorization: Bearer $KIE_API_KEY" \
  -F "file=@/path/to/input.png" -F "uploadPath=images/user-uploads" \
  | jq -r .data.downloadUrl)

curl -s -X POST 'https://api.kie.ai/api/v1/jobs/createTask' \
  -H "Authorization: Bearer $KIE_API_KEY" -H 'Content-Type: application/json' \
  -d "{\"model\":\"kling/v2-1-master-image-to-video\",
       \"input\":{\"image_url\":\"$UPLOAD_URL\",\"prompt\":\"…\"}}"
```

## 调用模型

对 schema 中 `paths` 为 `/api/v1/jobs/createTask` 的模型:

```bash
curl -s -X POST 'https://api.kie.ai/api/v1/jobs/createTask' \
  -H "Authorization: Bearer $KIE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "gpt-image-2-text-to-image",
    "input": {
      "prompt": "A single red maple leaf resting on wet slate, macro photograph",
      "resolution": "1K",
      "aspect_ratio": "1:1"
    }
  }'
```

请求体字段:

| 字段 | 必填 | 说明 |
|---|---|---|
| `model` | 是 | 与目录接口返回的完全一致 |
| `input` | 是 | **嵌套对象。** 内部字段来自 schema,各模型不同 |
| `callBackUrl` | 否 | 填了则任务完成时 KIE 会 POST 结果到此地址。payload 结构见 schema 的 `callbacks` |

响应:

```json
{"code": 200, "msg": "success", "data": {"taskId": "e931f4f2…", "recordId": "e931f4f2…"}}
```

用 `taskId` 轮询。`recordId` 不是轮询用的键。

## 取结果

```bash
curl -s -H "Authorization: Bearer $KIE_API_KEY" \
  'https://api.kie.ai/api/v1/jobs/recordInfo?taskId=e931f4f2…'
```

终态响应:

```json
{
  "code": 200,
  "data": {
    "taskId": "e931f4f24b0f6d5bc4744c719d3f67f3",
    "model": "gpt-image-2-text-to-image",
    "state": "success",
    "successFlag": 1,
    "costTime": 59,
    "creditsConsumed": 3.0,
    "createTime": 1788941299171,
    "completeTime": 1788941358629,
    "failCode": null,
    "failMsg": null,
    "resultJson": "{\"resultUrls\":[\"https://…/images/….png\"]}",
    "response": {"resultUrls": ["https://…/images/….png"]}
  }
}
```

### 状态机

| `state` | `successFlag` | 是否终态 |
|---|---|---|
| `waiting` | 0 | 否 |
| `queuing` | 0 | 否 |
| `generating` | 0 | 否 |
| `success` | 1 | 是 |
| `fail` | 3 | 是 |

按 `state` 轮询。遇 `success` 或 `fail` 停止,其余一律视为仍在运行。`fail` 时读
`failCode` 和 `failMsg`。

一个可用的轮询循环。它把响应写进文件而不是变量,原因见下方警告:

```bash
out=$(mktemp)
deadline=$(( $(date +%s) + 300 ))
while :; do
  if curl -sf -H "Authorization: Bearer $KIE_API_KEY" \
       "https://api.kie.ai/api/v1/jobs/recordInfo?taskId=$TASK_ID" -o "$out"; then
    [ "$(jq -r .code "$out")" = 200 ] || { jq -r .msg "$out" >&2; break; }
    case $(jq -r .data.state "$out") in
      success) jq -r '.data.response.resultUrls[]?' "$out"; break ;;
      fail)    jq -r '.data.failMsg' "$out" >&2; break ;;
    esac
  fi
  [ "$(date +%s)" -ge "$deadline" ] && { echo '等待超时' >&2; break; }
  sleep 3
done
rm -f "$out"
```

3 秒是合适的间隔。`recordInfo` 限流为每秒 10 次,一张 1K 图端到端通常在一分钟左右。
300 秒的截止时间适用于图像任务——视频和音乐耗时更长,要调大;没有它,遇到永远到不了
终态的任务就会无限空转。`curl -sf` 把 HTTP 层的失败变成一次重试,而不是拿空文件去解析
报错;`code` 不是 200 就停下并打印 `msg`——否则一个被拒绝的请求会被当成"仍在运行"。
`resultUrls[]?` 里的 `?` 保证循环对 Suno 系列同样可用——它们的结果在别的字段,见
[读取产出](#读取产出)。所有出口都是 `break`,既能直接粘进交互式 shell,也保证走到
`rm`。

**不要用 `echo` 把 KIE 的响应喂给 jq。** `recordInfo` 返回的 `param` 字段是 JSON 套
JSON,原始字节含有 `\\\"`;zsh、dash、busybox ash 会展开这些转义,jq 随即报
`Invalid numeric literal`。bash 的内建 `echo` 不展开,所以换一个 shell 运行之前可能
都不会暴露。按上面的写法把响应落到文件,或者用 `printf '%s' "$r" | jq …`。

### 读取产出

- `response` 是 `resultJson` 解析后的结果,优先用它。
- 多数模型把生成文件放在 `response.resultUrls`。**Suno 的音频生成类任务使用
  自己的结果结构**:generate、extend、sounds 以及 upload-and-cover/extend
  系列的音轨在 `response.data[].audio_url`,每首附带 `stream_audio_url`、封面
  `image_url`、`title` 和 `duration`。Suno 的文本与分析类任务(歌词生成、MIDI
  提取)返回 `response.resultObject`,歌词在 `resultObject.lyricsData[].text`。
  Suno 的文件工具类任务(WAV 转换、人声分离、封面图、音乐视频)和其他模型一样用
  `resultUrls`。所有模型的 `state` / `successFlag` 状态机是一致的。任务成功但
  没有 `resultUrls` 时,按上述结构从 `response` 中取结果。
- **生成的媒体文件保存 14 天后自动删除**,需要的内容请下载保存,不要把 URL 当作
  长期地址。日志记录(即 `recordInfo` 返回的文本与元数据)保存 2 个月。

### 拿产物的直接下载链接

有时 `resultUrls` 里的链接不能直接给浏览器或下游系统流式下载。这个接口把它转成
一个短期有效的直下载链接:

```bash
curl -s -X POST 'https://api.kie.ai/api/v1/common/download-url' \
  -H "Authorization: Bearer $KIE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://tempfile.redpandaai.co/…/output.png"}'
# → {"code": 200, "msg": "success", "data": "https://tempfile.…"}
```

- 入参 `url` **必须是 KIE 自家的 URL**(`resultUrls` 里的,或上传接口返回的
  `downloadUrl`)。外部 URL 直接 422。
- 返回的下载链接**有效期 20 分钟**。它不延长底层文件的 14 天保存期,只是给一条
  新鲜的直下载链接。
- `data` 是字符串本身(URL),不是对象。

## 统一接口之外的模型

不是所有模型都走 `/api/v1/jobs/createTask`。其余的是**同步接口**——
`/claude/v1/messages`、`/codex/v1/responses`、`/grok/v1/responses` 以及 Gemini
系列路径。按 schema 的 `paths` 提交、按 schema 描述构造请求体,结果直接在响应体里
返回——没有任务可轮询,也没有单独的取结果步骤。

## 限流

以下是默认额度。超限的请求会被拒绝,`code` 为 429——注意 429 在**响应体里**,HTTP
状态可能仍是 200,判 `code` 而不是状态行。被拒绝的请求**不会进入队列**,需要自行重试。
如需更高额度,可联系官方支持申请。

| 接口 | 限流 | 计数维度 |
|---|---|---|
| `models`、`schema`、`price`、`success-rate` | 1 次 / 秒,**四个接口共用一份额度** | 账户 |
| `createTask` | 20 次 / 10 秒 | 账户 |
| `recordInfo` | 10 次 / 秒 | **taskId** |

`createTask` 这一档通常支持 100 个以上任务同时运行。发现类接口的共享额度是最紧的一档:
一次目录调用和一次 schema 调用消耗的是同一份每秒 1 次的配额,连续做发现类调用时,
请求间隔至少 1.1 秒。目录接口一次就返回全量——需要多种筛选视图时,不带参数拉一次、
在本地过滤,别为每个筛选条件各花一格配额。

## 常见错误

最常见的失败就是违反[重要规则](#重要规则),那六条这里不再重复。下面是容易忽略的响应
格式细节。

1. **`openapi` 可能为 `null`。** 模型可能已进目录但文档尚未同步。读
   `data.openapi.paths` 前先判 `null`。
2. **`param.input` 回来是字符串。** 请求时传的是对象,回显的是 JSON *文本*,读回自己
   的参数要再解析一层。
3. **`progress` 不填充。** `recordInfo` 有这个字段,但不会填值。轮询 `state`。
4. **结果 URL 14 天后失效。** 拿到就下载,不要存 URL。
5. **对同一个 taskId 轮询超过 10 次/秒**会被限流。
6. **`echo` 会破坏响应。** zsh、dash、busybox ash 都会展开 `param` 里的反斜杠转义,
   jq 随即解析失败。改用文件或 `printf '%s'`。
7. **查询串里的裸空格会让 curl 在发出请求前就失败。** 要百分号编码:
   `taskType=Text%20to%20Video`。
8. **`response` 不一定是 `resultUrls`。** Suno 音频生成类任务的音轨在
   `response.data[].audio_url`,文本与分析类任务的结果在
   `response.resultObject`。见[读取产出](#读取产出)。
