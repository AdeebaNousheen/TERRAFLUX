# Running AI models on KIE

KIE (`api.kie.ai`) hosts 200+ models for image, video, music, speech, and text.
This skill covers discovering models and running the ones that use the unified
job API.

中文版:[../SKILL.md](../SKILL.md)

## Critical rules

1. **Discover models through the catalog API. Never write a model name from
   memory or training data.** The catalog changes continuously — models are added,
   renamed, and retired. A name you "know" may not exist.
2. **Fetch the schema before calling a model, and call the path it returns.**
   Not every model uses `/api/v1/jobs/createTask` — the synchronous chat and
   Gemini models use paths of their own. Assuming a single path will fail.
3. **Take required fields from the schema's `required` arrays.** They differ per
   model. `callBackUrl` is optional for the unified job API and does not exist on
   the synchronous endpoints.
4. **Do not URL-encode the slash in a model name.** `wan/v2-2-t2v` goes into the
   path as-is: `/api/v1/models/wan/v2-2-t2v/schema`.
5. **Check `code` in the response body before reading `data`.** Every endpoint
   returns `{code, msg, data}`. HTTP 200 does not mean the call succeeded.
6. **The schema never documents how to fetch results.** See
   [Getting the result](#getting-the-result).

## Prerequisites

The snippets below are POSIX shell and need `curl` and `jq` on `PATH`. `jq` comes
not preinstalled on most systems: `brew install jq`, `apt install jq`, or
`winget install jqlang.jq`.

On Windows, run them from WSL or Git Bash. PowerShell's `curl` is an alias for
`Invoke-WebRequest` and rejects these flags — call `curl.exe`. `cmd.exe` needs
the snippets rewritten, not pasted.

## Authentication

Every request needs a bearer token:

```
Authorization: Bearer $KIE_API_KEY
```

Create an API key at <https://kie.ai/api-key>. The base URL is
`https://api.kie.ai`; the schema also declares it under `servers`.

## Discovering models

### List the catalog

```bash
curl -s -H "Authorization: Bearer $KIE_API_KEY" \
  'https://api.kie.ai/api/v1/models'
```

Optional filters, all combinable, none paginated:

| Param | Meaning |
|---|---|
| `taskType` | Task type. Comma-separate for multiple values. **Percent-encode the spaces** — `taskType=Text%20to%20Video,Image%20to%20Video`. A raw space aborts curl before it sends anything (`http=000`). `+` works too, as does letting curl encode for you: `curl -G … --data-urlencode 'taskType=Text to Video'` |
| `provider` | Provider name, e.g. `Kling`, `Suno`, `Google` |
| `q` | Free-text keyword |

Response:

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

- `model` is the identifier you use everywhere else. It has one or two segments
  (`gpt-image-2-text-to-image`, `wan/v2-2-t2v`).
- `description` is sometimes `null`. Don't rely on it.
- `pricingDesc` is prose, not a number, but it matches what the job is billed.
  Use it to budget.
- `total` changes as models are added, renamed, and retired. Treat any count read
  from it — including the one in the example above — as a snapshot.
- Filters that match nothing return `total: 0` with an empty `models` list. A
  failure comes back as a non-200 `code` instead — an empty list is never an error.

### Check price or reliability

```bash
curl -s -H "Authorization: Bearer $KIE_API_KEY" \
  'https://api.kie.ai/api/v1/models/veo-3-1/price'

curl -s -H "Authorization: Bearer $KIE_API_KEY" \
  'https://api.kie.ai/api/v1/models/veo-3-1/success-rate'
```

`price` returns `{model, pricingDesc}` — the same text as the catalog.

`success-rate` returns the last 24 hours as 10-minute buckets, at most 144 points:

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

Buckets with no traffic have `successRate` and `errorRate` set to `null`. An empty
`points` list means no monitoring data, not zero success.

### Check your balance

Before submitting a task, compare account credits to the model's `pricingDesc`:

```bash
curl -s -H "Authorization: Bearer $KIE_API_KEY" \
  'https://api.kie.ai/api/v1/chat/credit'
# → {"code": 200, "msg": "success", "data": 2450}
```

`data` is the raw credit balance (a number). `pricingDesc` from the catalog gives
the per-job cost (e.g. "A 5-second video costs 160 credits"). Compare before
calling `createTask` — a task with insufficient credits comes back as `code` 402.

## Reading the schema

```bash
curl -s -H "Authorization: Bearer $KIE_API_KEY" \
  'https://api.kie.ai/api/v1/models/gpt-image-2-text-to-image/schema'
```

Returns `{model, openapi}` where **`openapi` is the OpenAPI document itself,
inlined as a JSON object** — read `data.openapi.paths` directly, no extra parse
step. It can be `null` for a model whose document has not been synced yet; say so
rather than inventing a call path. When present it is a complete OpenAPI 3.1
document for that one model and is the authoritative source for:

- the exact path and method to call (`paths`)
- every request field, its type, description, and whether it is required
- the callback payload delivered to your `callBackUrl` (`operation.callbacks`)
- the business error codes (401 unauthorized, 402 insufficient quota, 404 not found,
  422 validation error, 429 rate limited, 433 subkey limit, 455 service unavailable)
- the base URL (`servers`) and auth scheme (`components.securitySchemes`)

Some models declare `input` as a `oneOf` of alternative shapes (for example
task-id-based vs image-url-based). Each branch carries its own `required` list —
satisfy exactly one branch and do not mix fields across branches.

### Resolving `$ref`

`$ref` pointers are **not pre-inlined**. They point into the same document's
`components`, so they always resolve locally — but you must resolve them yourself.

Component key names are literal. Match them exactly:

- Spaces are percent-encoded: `#/components/schemas/response%20not%20with%20recordId`.
  URL-decode each path segment before lookup.
- Some keys end in a space: `#/components/responses/Error `. Do not trim
  whitespace when matching.

### Two shapes of model

Read `paths` to tell them apart:

| `paths` key | Shape |
|---|---|
| `/api/v1/jobs/createTask` | **Job-based.** Submit, get a `taskId`, poll for the result. Covered below. |
| Anything else | A synchronous chat/completions endpoint — the result comes back in the response body. See [Models outside the unified API](#models-outside-the-unified-api). |

## Uploading files for image/video models

About 78 catalog models (46 image-to-video, 32 image-to-image) require a file URL
inside `input`. The schema names that field differently per model — `image_url`,
`input_image`, `image`, `video_url`, `first_frame_image`, etc. — **read the
schema's `input` to find the exact key; do not guess it.**

If the user already has a public HTTPS URL, use it directly. Otherwise upload
the file to KIE's temp file service, which hands back a URL you plug into
`input`.

**The upload endpoints live on a different host: `https://kieai.redpandaai.co`,
not `api.kie.ai`.** Same bearer token. Uploaded files auto-delete after 24h —
fine for a job you submit immediately, not permanent storage.

| Endpoint | When |
|---|---|
| `POST /api/file-base64-upload` | File already in memory, small (≤10MB). JSON body, base64 or data URL. |
| `POST /api/file-stream-upload` | File on disk, large (>10MB). `multipart/form-data`. |
| `POST /api/file-url-upload` | Rehost a public URL to KIE's CDN. JSON body. |

All three return the same shape:

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

**Put `data.downloadUrl` into the model's `input`** at whatever key the schema
requires.

Common body fields (all three endpoints): `uploadPath` — required, no leading or
trailing slashes (e.g. `images/user-uploads`); `fileName` — optional, includes
extension. Endpoint-specific: `base64Data` (base64), `file` (stream — form
field), `fileUrl` (url).

```bash
# Base64: small in-memory file
curl -s -X POST 'https://kieai.redpandaai.co/api/file-base64-upload' \
  -H "Authorization: Bearer $KIE_API_KEY" -H 'Content-Type: application/json' \
  -d '{"base64Data": "data:image/png;base64,iVBORw0K…",
       "uploadPath": "images/user-uploads",
       "fileName": "input.png"}'

# Stream: large file on disk
curl -s -X POST 'https://kieai.redpandaai.co/api/file-stream-upload' \
  -H "Authorization: Bearer $KIE_API_KEY" \
  -F "file=@/path/to/input.png" \
  -F "uploadPath=images/user-uploads" \
  -F "fileName=input.png"

# URL rehost: pull from another host into KIE storage
curl -s -X POST 'https://kieai.redpandaai.co/api/file-url-upload' \
  -H "Authorization: Bearer $KIE_API_KEY" -H 'Content-Type: application/json' \
  -d '{"fileUrl": "https://example.com/photo.jpg",
       "uploadPath": "images/downloaded"}'
```

Then feed `downloadUrl` back into `createTask`:

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

## Calling a model

For models whose schema declares `/api/v1/jobs/createTask`:

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

Body fields:

| Field | Required | Notes |
|---|---|---|
| `model` | yes | Exactly as returned by the catalog |
| `input` | yes | **Nested object.** Its fields come from the schema, and differ per model |
| `callBackUrl` | no | If set, KIE POSTs the result here on completion. Payload structure is in the schema's `callbacks` |

Response:

```json
{"code": 200, "msg": "success", "data": {"taskId": "e931f4f2…", "recordId": "e931f4f2…"}}
```

Poll with `taskId`. `recordId` is not the polling key.

## Getting the result

```bash
curl -s -H "Authorization: Bearer $KIE_API_KEY" \
  'https://api.kie.ai/api/v1/jobs/recordInfo?taskId=e931f4f2…'
```

Terminal-state response:

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

### State machine

| `state` | `successFlag` | Terminal |
|---|---|---|
| `waiting` | 0 | no |
| `queuing` | 0 | no |
| `generating` | 0 | no |
| `success` | 1 | yes |
| `fail` | 3 | yes |

Poll on `state`. Stop on `success` or `fail`; treat everything else as still
running. On `fail`, read `failCode` and `failMsg`.

A working loop. It writes the response to a file rather than a variable — see the
warning below:

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
  [ "$(date +%s)" -ge "$deadline" ] && { echo 'gave up waiting' >&2; break; }
  sleep 3
done
rm -f "$out"
```

Three seconds is a good interval. `recordInfo` allows 10 requests per second, and
a 1K image typically completes in about a minute. The 300-second deadline suits
image jobs — raise it for video and music, which take longer. Without it the loop
spins forever on a task that never reaches a terminal state. `curl -sf` makes an
HTTP-level failure a retry instead of a parse error on an empty file, and a
non-200 `code` stops the loop and prints `msg` — otherwise a rejected request
reads as "still running". The `?` in `resultUrls[]?` keeps the loop working for
Suno models, whose results live at a different key — see
[Reading the output](#reading-the-output). Every exit is a `break`, so the loop
is safe to paste into an interactive shell and always reaches the `rm`.

**Do not pipe a KIE response through `echo`.** `recordInfo` returns a `param`
field holding JSON-inside-JSON, so its raw bytes contain `\\\"`; zsh, dash, and
busybox ash expand those escapes and jq then fails with `Invalid numeric
literal`. Bash's builtin `echo` does not expand them, so the problem may not
surface until the snippet runs under a different shell. Write the response to a
file as above, or use `printf '%s' "$r" | jq …`.

### Reading the output

- `response` is `resultJson` already parsed. Prefer it.
- Most models put the generated files at `response.resultUrls`. **Suno's
  audio-generating tasks use their own result structure**: generate, extend,
  sounds, and the upload-and-cover/extend tasks return their tracks at
  `response.data[].audio_url`, each with `stream_audio_url`, cover `image_url`,
  `title`, and `duration`. Suno's text and analysis tasks (lyrics generation,
  MIDI extraction) return `response.resultObject`, with lyrics at
  `resultObject.lyricsData[].text`. Suno's file utilities (WAV conversion,
  vocal separation, cover images, music video) use `resultUrls` like everything
  else. The `state` / `successFlag` machine is the same for every model. When a
  successful task has no `resultUrls`, take the result from the model's
  structure in `response`.
- **Generated media files are stored for 14 days and then deleted
  automatically** — download what you need rather than storing the URL as a
  permanent reference. Log records, meaning the text and metadata `recordInfo`
  returns, are kept for 2 months.

### Fetching a persistent download link

Result URLs in `resultUrls` sometimes need to be handed to a browser or a
downstream system that can't stream them directly. This endpoint turns one into
a short-lived direct-download link:

```bash
curl -s -X POST 'https://api.kie.ai/api/v1/common/download-url' \
  -H "Authorization: Bearer $KIE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://tempfile.redpandaai.co/…/output.png"}'
# → {"code": 200, "msg": "success", "data": "https://tempfile.…"}
```

- Input `url` **must be a KIE-hosted URL** (from `resultUrls` or an upload's
  `downloadUrl`). External URLs come back as `code` 422.
- The returned link is valid for **20 minutes**. It does not extend the underlying
  file's 14-day retention — it is a fresh direct-download link, not a longer TTL.
- `data` is the URL as a bare string, not an object.

## Models outside the unified API

Not every model uses `/api/v1/jobs/createTask`. The rest are **synchronous
endpoints** — `/claude/v1/messages`, `/codex/v1/responses`, `/grok/v1/responses`,
and the Gemini paths. Submit to the path from `paths` with the body the schema
describes; the result comes back in the response body. There is no task to poll
and no separate result step.

## Rate limits

Default limits. A request over the limit is rejected with `code` 429 **in the
response body** — the HTTP status can still be 200, so check `code`, not the
status line. Rejected requests do **not** enter the queue; retry them yourself.
Contact support to request a higher limit.

| Endpoints | Limit | Counted per |
|---|---|---|
| `models`, `schema`, `price`, `success-rate` | 1 request / second, **one budget shared by all four** | account |
| `createTask` | 20 requests / 10 seconds | account |
| `recordInfo` | 10 requests / second | **taskId** |

The `createTask` limit typically allows 100+ tasks running concurrently. The
shared discovery budget is the tightest: a catalog call and a schema call count
against the same one-per-second allowance, so when chaining discovery calls,
space them at least 1.1 seconds apart. The catalog comes back complete in one
response — when you need several filtered views, fetch it once unfiltered and
filter locally instead of spending one budget slot per filter.

## Common pitfalls

Breaking a [critical rule](#critical-rules) is the most common way to fail; those
six are not repeated here. These are the response-format details that are easy to
miss.

1. **`openapi` can be `null`.** A model can appear in the catalog before its
   OpenAPI document is synced. Check for `null` before reading `data.openapi.paths`.
2. **`param.input` comes back as a string.** You send `input` as an object; the
   echoed copy is JSON *text*. Parse it again to read your own parameters.
3. **`progress` is not populated.** The field exists on `recordInfo` but is not
   filled in. Poll `state`.
4. **Result URLs expire after 14 days.** Download the file; do not store the URL.
5. **Polling faster than 10/s on one taskId** gets you rate-limited.
6. **`echo` corrupts a response.** zsh, dash, and busybox ash expand the backslash
   escapes in `param`, and jq then fails to parse. Use a file or `printf '%s'`.
7. **A raw space in a query string aborts curl** before it sends. Percent-encode
   it: `taskType=Text%20to%20Video`.
8. **`response` is not always `resultUrls`.** Suno's audio-generating tasks
   deliver their tracks at `response.data[].audio_url`; its text and analysis
   tasks put results under `response.resultObject`. See
   [Reading the output](#reading-the-output).
