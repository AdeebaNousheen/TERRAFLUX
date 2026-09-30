# Connecting KIE chat models to local agents

KIE (`api.kie.ai`) serves its chat models over the model vendors' own wire
protocols. When the agent's protocol matches the model's, no adapter is needed.
When it does not, a local translating proxy sits between them — see
[Mismatched wire protocols](#mismatched-wire-protocols).

One section per agent, each self-contained: how to list the models that agent can
run on, the config it takes, and the way it fails. **Codex CLI, Claude Code, and
Grok Build are documented**; others are added as sections alongside them. The
mismatch section is shared; a new agent does not get its own pairing table.

中文版:[../SKILL.md](../SKILL.md)

## Prerequisites

A KIE API key from <https://kie.ai/api-key>, exported as `KIE_API_KEY`, and the
agent you want to configure installed.

The listing snippets need `curl` and `jq` on `PATH`. `jq` is not preinstalled on
most systems: `brew install jq`, `apt install jq`, or `winget install jqlang.jq`.

PowerShell's `curl` is an alias for `Invoke-WebRequest` and rejects these flags.
Call `curl.exe` instead, as the Windows snippets below do. `cmd.exe` needs the
snippets rewritten, not pasted.

## Codex CLI

Codex speaks the OpenAI Responses protocol, which is what KIE serves its Codex
models over. Codex reaches them through a custom provider defined in
`config.toml`.

### Critical rules

1. **Discover models through `GET https://api.kie.ai/openai/v1/models`. Never write
   a model name from memory or training data.** That endpoint is the list Codex can
   actually run on. The general `taskType=Chat` catalog is a different, wider list:
   it carries models that are not served on this endpoint, and it omits models this
   endpoint offers.
2. **Authenticate with `Authorization: Bearer`.** That one header carries the API
   key on every KIE endpoint, including the models listing. A header literally named
   `apikey` is rejected with a 401.
3. **Set `model` explicitly.** Codex's built-in default model name is not one KIE
   serves, so a provider that is otherwise correct still fails on every request
   until `model` names a slug from the listing.
4. **Put the provider in the user-level config.** Codex ignores `model_provider`
   and `model_providers` in a project-local `.codex/config.toml`.

### Listing the available models

```bash
curl -s -H "Authorization: Bearer $KIE_API_KEY" \
  https://api.kie.ai/openai/v1/models |
  jq -r '.models[] | [.slug, .display_name, (.context_window | tostring),
                      .default_reasoning_level,
                      ([.supported_reasoning_levels[].effort] | join(","))] | @tsv'
```

On Windows (PowerShell), the same request with `curl.exe`:

```powershell
curl.exe -s -H "Authorization: Bearer $env:KIE_API_KEY" `
  https://api.kie.ai/openai/v1/models | jq -r '.models[].slug'
```

The response carries the same models twice. `.data[]` is the OpenAI-compatible
shape, where `id` is the only field that identifies the model — the rest
(`created`, `object`, `owned_by`) is boilerplate. `.models[]` is the richer listing
and is the one to read: `slug` is the value to put in `model`, and `context_window`,
`default_reasoning_level`, and `supported_reasoning_levels` describe what the model
accepts.

Present the slugs to the user and let them choose. Run this listing every time
rather than reusing an earlier answer — the set of models changes.

### Writing the config

Codex takes a custom provider as a table in `config.toml`, and the model at the top
level:

```toml
model = "gpt-5.5"
model_provider = "kie"

[model_providers.kie]
name = "KIE"
base_url = "https://api.kie.ai/openai/v1"
env_key = "KIE_API_KEY"
wire_api = "responses"
```

`base_url` is the root Codex sends requests to, and Codex appends `/responses`
itself, so the configured value is `https://api.kie.ai/openai/v1` and not the full
request URL `https://api.kie.ai/openai/v1/responses`.

`env_key` names the variable Codex reads the credential from and sends as a bearer
token; it does not hold the key itself.

`wire_api = "responses"` matches the protocol KIE serves. It is also Codex's
default, so it may be omitted — write it out to keep the table self-explanatory.

The provider id — `kie` here — is yours to pick, but `openai`, `ollama`, and
`lmstudio` are reserved and cannot be overridden.

#### macOS and Linux

The file is `~/.codex/config.toml`. Export the credential in the same shell that
launches `codex`, or in your shell profile:

```bash
export KIE_API_KEY=…
```

Set `CODEX_HOME` to keep the config somewhere other than `~/.codex`.

#### Windows (PowerShell)

The file is `%USERPROFILE%\.codex\config.toml`, with identical contents.

```powershell
$env:KIE_API_KEY = "…"
setx KIE_API_KEY "…"
```

### Reasoning effort

`model_reasoning_effort` sets how much reasoning the model applies:

```toml
model_reasoning_effort = "high"
```

Codex accepts `low`, `medium`, `high`, `xhigh`, and — since Codex 0.154 — `max`;
`max` is passed through to the backend as-is (verified against `gpt-6-astra`).
Choose one the model lists in `supported_reasoning_levels`, or leave the key out
to take the model's `default_reasoning_level`. On Codex 0.153 and earlier, `max`
is rejected as an unknown value — upgrade Codex before configuring it.

### Confirming the configuration

`codex doctor` reports what Codex loaded and whether it can reach the provider. The
`auth` section should show the provider env var as present. The `reachability`
section probes `base_url` + `/models` and should report the provider as reachable.

The provider is confirmed by a real request: start `codex` from a shell that has
`KIE_API_KEY` set and send one message.

Codex may print `Model metadata for '…' not found. Defaulting to fallback
metadata.` on startup. That is Codex saying the slug is absent from its own bundled
model table — as every KIE slug is; the session runs normally.

### Common pitfalls

1. **A header literally named `apikey`.** KIE answers 401. The key goes in
   `Authorization: Bearer`.
2. **The full request URL in `base_url`.** Codex appends `/responses` itself, so a
   `base_url` ending in `/responses` produces `/responses/responses`.
3. **Leaving Codex's built-in default model in place.** `model` has to name a slug
   from the listing even when the credential and base URL are right.
4. **Provider config in a project-local file.** Codex ignores `model_provider` and
   `model_providers` outside the user-level config, so a provider defined in a
   project `.codex/config.toml` is silently skipped.
5. **Reusing a reserved provider id.** `openai`, `ollama`, and `lmstudio` cannot be
   overridden — name the table something else.
6. **`env_key` holding the key.** It names an environment variable; the key itself
   lives in that variable, not in the config file.
7. **`setx` not reaching the current window.** It applies to windows opened after
   it runs. Set `$env:` as well to use the value immediately.
8. **PowerShell's `curl`.** It is an alias for `Invoke-WebRequest` and rejects
   these flags. Use `curl.exe`.

To run a model from a listing that is not this protocol, see
[Mismatched wire protocols](#mismatched-wire-protocols).

## Claude Code

Claude Code speaks the Anthropic Messages protocol, which is what KIE serves its
Claude models over. Claude Code reaches them by setting `ANTHROPIC_BASE_URL` and
a credential variable.

### Critical rules

1. **Discover models through `GET https://api.kie.ai/anthropic/v1/models`. Never
   write a model name from memory or training data.** That endpoint is the list
   Claude Code can actually run on. The general `taskType=Chat` catalog is a
   different, wider list: it carries models that are not served on this endpoint.
2. **Authenticate with `Authorization: Bearer`.** That one header carries the API
   key on every KIE endpoint, including the models listing. A header literally named
   `apikey` is rejected with a 401. Claude Code sends this header from
   `ANTHROPIC_AUTH_TOKEN` and prefixes `Bearer ` itself, so the value is the raw key.
   `ANTHROPIC_API_KEY` is sent as `X-Api-Key` instead; KIE accepts that header only
   when the value starts with `Bearer ` (space included).
3. **Set `ANTHROPIC_BASE_URL` to `https://api.kie.ai/anthropic`.** Claude Code
   appends `/v1/messages` itself. The listing and the request share that prefix:
   `GET /anthropic/v1/models` and `POST /anthropic/v1/messages`.

### Listing the available models

```bash
curl -s -H "Authorization: Bearer $KIE_API_KEY" \
  https://api.kie.ai/anthropic/v1/models |
  jq -r '.data[] | [.id, .display_name, (.max_input_tokens | tostring),
                    (.max_tokens | tostring)] | @tsv'
```

On Windows (PowerShell), the same request with `curl.exe`:

```powershell
curl.exe -s -H "Authorization: Bearer $env:KIE_API_KEY" `
  https://api.kie.ai/anthropic/v1/models | jq -r '.data[].id'
```

The response is Anthropic-shaped. `.data[]` is the listing: `id` is the model name
Claude Code sends, and `display_name`, `max_input_tokens`, and `max_tokens`
describe the model. `type` and `created_at` are boilerplate. If `has_more` is true,
request again with `after_id` set to `last_id`.

Those ids match Anthropic's. Present them when the user wants to pick a model.
Run this listing every time rather than reusing an earlier answer — the set of
models changes.

### Writing the config

Claude Code takes the base URL, credential, and model as environment variables:

```bash
export ANTHROPIC_BASE_URL=https://api.kie.ai/anthropic
export ANTHROPIC_AUTH_TOKEN=$KIE_API_KEY
```

`ANTHROPIC_BASE_URL` is the root Claude Code sends requests to, and Claude Code
appends `/v1/messages` itself, so the configured value is
`https://api.kie.ai/anthropic` and not the full request URL
`https://api.kie.ai/anthropic/v1/messages`.

`ANTHROPIC_AUTH_TOKEN` holds the key. Claude Code sends it as
`Authorization: Bearer`. Do not put `Bearer ` in the value — that produces
`Bearer Bearer …`.

The alternative credential variable is `ANTHROPIC_API_KEY`, sent as `X-Api-Key`.
Its value must be `Bearer ` followed by the key.

KIE serves the models under the same ids Anthropic uses, so Claude Code's built-in
aliases (`sonnet`, `opus`, `haiku`, `fable`) work without remapping. Set
`ANTHROPIC_MODEL` to an id from the listing, or switch with `--model` / `/model`,
only when you want a specific model. The `model` key in a settings file is used
when `ANTHROPIC_MODEL` is unset.

The same variables can live under `env` in a settings file:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.kie.ai/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "…"
  }
}
```

When the same variable is set in both the shell and a settings file, the
settings-file value applies. Do not put the credential in a project's
`.claude/settings.json` — that file is committed. Use the user-level file or
`.claude/settings.local.json`.

#### macOS and Linux

The user-level file is `~/.claude/settings.json`. Export the variables in the
same shell that launches `claude`, or in your shell profile:

```bash
export ANTHROPIC_BASE_URL=https://api.kie.ai/anthropic
export ANTHROPIC_AUTH_TOKEN=$KIE_API_KEY
```

#### Windows (PowerShell)

The file is `%USERPROFILE%\.claude\settings.json`, with identical contents.

```powershell
$env:ANTHROPIC_BASE_URL = "https://api.kie.ai/anthropic"
$env:ANTHROPIC_AUTH_TOKEN = $env:KIE_API_KEY
setx ANTHROPIC_BASE_URL "https://api.kie.ai/anthropic"
setx ANTHROPIC_AUTH_TOKEN "$env:KIE_API_KEY"
```

`setx` applies to windows opened after it runs. Set `$env:` as well to use the
values immediately.

### Confirming the configuration

Start `claude` from a shell that has the variables set and run `/status`. The
Status tab should show `Anthropic base URL` as `https://api.kie.ai/anthropic` and
an auth line naming `ANTHROPIC_AUTH_TOKEN` (or `ANTHROPIC_API_KEY` if that is the
variable you set). Then send one message.

A login prompt for an Anthropic account means the variables did not reach the
process. Fully quit the terminal and relaunch it from a shell that has them set.

`claude --debug` prints the requests Claude Code sends.

### Common pitfalls

1. **A raw `ANTHROPIC_API_KEY` or a header literally named `apikey`.** KIE answers
   401. Prefer `ANTHROPIC_AUTH_TOKEN` set to the raw key. If you use
   `ANTHROPIC_API_KEY`, the value must start with `Bearer `.
2. **The full request URL in `ANTHROPIC_BASE_URL`.** Claude Code appends
   `/v1/messages` itself, so a value ending in `/v1` or `/v1/messages` produces
   `/v1/v1/messages`.
3. **A `model not found` error.** Claude Code asked for an id this endpoint does
   not serve. Run `/model` and pick one from the listing.
4. **The credential in a project's `.claude/settings.json`.** That file is
   committed. Use the user-level file or `.claude/settings.local.json`.
5. **`Bearer ` inside `ANTHROPIC_AUTH_TOKEN`.** Claude Code prefixes `Bearer `
   itself, so the header becomes `Bearer Bearer …`.
6. **`setx` not reaching the current window.** It applies to windows opened after
   it runs. Set `$env:` as well to use the values immediately.
7. **PowerShell's `curl`.** It is an alias for `Invoke-WebRequest` and rejects
   these flags. Use `curl.exe`.
8. **A login prompt for an Anthropic account.** The variables are unset in that
   process. Quit every terminal, including editor-hosted ones, and reopen from a
   shell that has them.

To run a model from a listing that is not this protocol, see
[Mismatched wire protocols](#mismatched-wire-protocols).

## Grok Build

Grok Build speaks the Responses protocol when `api_backend = "responses"`, which
is what KIE serves its Grok models over. Grok Build reaches them through a
`[model.*]` table in `config.toml`.

### Critical rules

1. **Discover models through `GET https://api.kie.ai/xai/v1/models`. Never write a
   model name from memory or training data.** That endpoint is the list Grok Build
   can actually run on at this prefix. The general `taskType=Chat` catalog is a
   different, wider list: it carries models that are not served on this endpoint.
2. **Authenticate with `Authorization: Bearer`.** That one header carries the API
   key on every KIE endpoint, including the models listing. A header literally named
   `apikey` is rejected with a 401.
3. **Set `api_backend = "responses"`.** Grok Build's default backend is
   `chat_completions`, which posts to `/v1/chat/completions`. KIE serves these
   models at `/xai/v1/responses`.
4. **Set the `model` field to an `id` from the listing.** That field is the name
   sent to KIE. It is not the `[model.<name>]` table key, and it is not Grok
   Build's bundled spelling (for example `grok-4.6`). The listing uses a different
   id (for example `grok-4-6`). Copy the listing `id`; a bundled name is rejected
   even when `base_url` is right.
5. **Put the table in the user-level config.** Project `.grok/config.toml` only
   contributes MCP, plugins, and permission keys — a `[model.*]` block there is
   not the inference config.

### Listing the available models

```bash
curl -s -H "Authorization: Bearer $KIE_API_KEY" \
  https://api.kie.ai/xai/v1/models |
  jq -r '.data[] | .id'
```

On Windows (PowerShell), the same request with `curl.exe`:

```powershell
curl.exe -s -H "Authorization: Bearer $env:KIE_API_KEY" `
  https://api.kie.ai/xai/v1/models | jq -r '.data[].id'
```

The response is OpenAI-shaped. `.data[]` is the listing: `id` is the value to put
in `model`. `object`, `owned_by`, `created`, and `aliases` are boilerplate.

Present the ids to the user and let them choose. Run this listing every time
rather than reusing an earlier answer — the set of models changes.

### Writing the config

Grok Build takes a custom model as a `[model.<name>]` table. `<name>` is the
picker key; `model` is the id sent to KIE:

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

`base_url` is the root Grok Build sends requests to, and with
`api_backend = "responses"` Grok Build appends `/responses` itself, so the
configured value is `https://api.kie.ai/xai/v1` and not the full request URL
`https://api.kie.ai/xai/v1/responses`.

`env_key` names the variable Grok Build reads the credential from and sends as a
bearer token; it does not hold the key itself. Prefer it over inline `api_key`.

The picker key — `kie` here — is yours to pick. `[models] default` must name that
key (or another `[model.*]` key), not a built-in Grok catalog name, or new
sessions still hit xAI instead of KIE.

#### macOS and Linux

The file is `~/.grok/config.toml`. Export the credential in the same shell that
launches `grok`, or in your shell profile:

```bash
export KIE_API_KEY=…
```

Set `GROK_HOME` to keep the config somewhere other than `~/.grok`.

#### Windows (PowerShell)

The file is `%USERPROFILE%\.grok\config.toml`, with identical contents.

```powershell
$env:KIE_API_KEY = "…"
setx KIE_API_KEY "…"
```

### Confirming the configuration

`grok models` should list the custom key. `grok inspect` reports which config
file won. Start `grok` from a shell that has `KIE_API_KEY` set and send one
message, or `grok -p "…" -m kie`.

`RUST_LOG=debug GROK_LOG_FILE=/tmp/grok.log grok` writes request traces. Look for
the `base_url` and the model id.

### Common pitfalls

1. **A header literally named `apikey`.** KIE answers 401. The key goes in
   `Authorization: Bearer`.
2. **The full request URL in `base_url`.** Grok Build appends `/responses` itself
   when `api_backend = "responses"`, so a `base_url` ending in `/responses`
   produces `/responses/responses`.
3. **Omitting `api_backend`.** The default is `chat_completions`, which posts to
   `/v1/chat/completions`, not `/xai/v1/responses`.
4. **Putting a bundled Grok name in `model`.** The field KIE reads is
   `[model.<name>].model`, and it must be a listing `id`. A bundled spelling such
   as `grok-4.6` is not that id.
5. **`[model.*]` in a project `.grok/config.toml`.** That file does not carry
   inference config. Use `~/.grok/config.toml`.
6. **`env_key` holding the key.** It names an environment variable; the key itself
   lives in that variable, not in the config file.
7. **`setx` not reaching the current window.** It applies to windows opened after
   it runs. Set `$env:` as well to use the values immediately.
8. **PowerShell's `curl`.** It is an alias for `Invoke-WebRequest` and rejects
   these flags. Use `curl.exe`.

To run a model from a listing that is not this protocol, see
[Mismatched wire protocols](#mismatched-wire-protocols).

## Mismatched wire protocols

Each agent in this skill speaks one wire protocol, and each KIE listing is served
over one protocol. When they match, configure the agent as that agent's section
says and send traffic to `api.kie.ai`. When they do not, a local translating proxy
is required.

### When a proxy is required

1. Read the agent's section for the protocol it speaks and the path it appends.
2. Read the model's listing for the protocol KIE serves.
3. Same protocol: no proxy. Different protocol: tell the user a local translating
   proxy is required, and **ask before writing one**. They may already have a
   proxy, or they may not want one written in this session. Do not generate proxy
   code unsolicited.
4. If they already have a proxy, or after they ask you to write one, the agent's
   base URL points at the proxy, not at `api.kie.ai`.
5. List models from the **model's** listing, not the agent's native listing. Put
   an id from that listing in the agent's model setting — the agent's built-in
   names and aliases belong to its native protocol.

### What the proxy must expose

| Model listing | KIE request | Protocol |
|---|---|---|
| `GET /openai/v1/models` | `POST /openai/v1/responses` | Responses |
| `GET /anthropic/v1/models` | `POST /anthropic/v1/messages` | Messages |
| `GET /xai/v1/models` | `POST /xai/v1/responses` | Responses |

The proxy listens for the path the **agent** appends, and forwards to the KIE
request for the **model's** listing. It translates both directions, including
streaming and tool calls the agent actually sends. Authenticate to KIE with
`Authorization: Bearer $KIE_API_KEY`.

A later agent adds a row to this table when its listing is not already here. The
rules in this section do not change.

### Writing a proxy

Write one only after the user asked. Keep the mapping honest; do not invent
platform behaviour.

1. **Learn the two shapes from a real agent request and the official protocol,
   not from memory.** Capture what the agent actually posts (`claude --debug`,
   Codex logs, `GROK_LOG_FILE`) and what KIE expects on the model's path.
   Incomplete field maps
   from training data are the usual failure.
2. **Forward the model id unchanged.** Do not hard-code a default name, and do
   not rewrite `sonnet` / `opus` / `claude-*` into a GPT slug or the reverse.
3. **If you expose `GET /models`, return the agent's listing shape, filled from
   the model's KIE listing.** A passthrough of the other protocol's document is
   the wrong shape. A failed listing is an error, not a fake one-model list.
4. **Tool calls must round-trip.** Keep `id` / `call_id` / `tool_use_id` stable
   across the request and the next turn's tool result. Do not drop `tools`.
   If KIE rejects tools, return that error.
5. **Streaming must end the way the agent ends a turn.** Emit the event sequence
   that agent consumes, including a terminal event. If KIE errors or hangs up
   mid-stream, the agent must see a failure, not HTTP 200 with a completed empty
   turn.
6. **Do not inject new user or assistant content to paper over a protocol
   mismatch.** Some Messages models reject a conversation that ends on an
   assistant turn. Inventing a follow-up user message makes the request valid
   and changes the turn — Codex then keeps continuing. Either reshape
   losslessly or return the upstream error.

### Pointing the agent at the proxy

The listen URL is whatever the proxy binds to. The agent's base URL is the root
it already documents — Claude Code appends `/v1/messages` to `ANTHROPIC_BASE_URL`,
Codex appends `/responses` to `base_url`, Grok Build appends `/responses` when
`api_backend = "responses"` — so do not put that suffix in the value.

Applying the rule to Claude Code on a Responses model:

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:<port>
export ANTHROPIC_AUTH_TOKEN=$KIE_API_KEY
export ANTHROPIC_MODEL=…
```

`ANTHROPIC_MODEL` is an id from `GET /openai/v1/models`. Claude Code's `sonnet` /
`opus` aliases are not.

Applying the rule to Codex CLI on a Messages model:

```toml
model = "…"
model_provider = "kie"

[model_providers.kie]
name = "KIE"
base_url = "http://127.0.0.1:<port>/v1"
env_key = "KIE_API_KEY"
wire_api = "responses"
```

`model` is an id from `GET /anthropic/v1/models`. `base_url` still omits
`/responses`.

Do not leave the agent's base URL on `api.kie.ai` while sending an id from the
other listing, and do not point the agent at the model's KIE prefix without a
translator.

### What this skill does not provide

This skill does not include, generate, or name a translating proxy. It states the
listen path, the KIE path, which listing to read, and which config key holds the
proxy URL. Write proxy code only when the user asked for it.

