# Flash Go SDK

Official Go SDK for the [Flash sandbox engine](../../README.md) — a
self-hosted sandbox platform: claim an isolated sandbox from a warm pool in
under 2 seconds, run commands, read/write files, open a live browser preview,
and destroy it. Dependency-free (stdlib only), fully context-aware.

```go
import flash "github.com/guvi-geek/flash/sdk/go"

client, _ := flash.New() // FLASH_API_KEY + FLASH_BASE_URL from env

sbx, err := client.Sandboxes.Create(ctx, flash.CreateSandboxOpts{
    Template: "q1",
    Timeout:  10 * time.Minute,
    Metadata: map[string]string{"purpose": "ci"},
})
defer sbx.Kill(ctx)

res, _ := sbx.Run(ctx, "node -e 'console.log(40+2)'")
fmt.Print(res.Stdout) // "42\n" — res.ExitCode is a result, not an error

sbx.Files().Write(ctx, "notes.txt", []byte("hello"))
b, _ := sbx.Files().Read(ctx, "notes.txt")
fmt.Println(sbx.PreviewURL) // frontend templates: live browser preview
```

## Services

| Service | Surface |
|---|---|
| `client.Sandboxes` | `Create / Connect / List`; on a `Sandbox`: `Run / Exec / Files() / SetTimeout / Kill / Refresh` |
| `client.Templates` | `List / Create / Scale` (warm-pool floor) |
| `client.APIKeys` | `Create / List / Revoke` (raw key shown once) |
| `client.Assessments` | the scoring layer: `CreateSession`, `Session.Submit`, `Session.WaitForScore` |

## Tests

The test suite is fully end-to-end against a live orchestrator (real
containers — no mocks):

```bash
FLASH_E2E=1 FLASH_BASE_URL=http://127.0.0.1:8090 FLASH_API_KEY=flash_… \
    go test ./... -v
```

## API reference

A generated, browsable API reference for every exported type and method lives
at **https://guvi-geek.github.io/flash/** (published from `main` by the
[`docs` workflow](../../.github/workflows/docs.yml)). It is produced with
[Sourcey](https://sourcey.com)'s godoc adapter from a committed snapshot, so
the site rebuilds without a local Go toolchain.

Regenerate locally:

```bash
cd sdk/go
npx sourcey godoc -m . -o godoc.json   # refresh the snapshot (needs Go)
npx sourcey build                      # build the static site into ./dist (no Go required)
```

The reference is also available for free on
[pkg.go.dev](https://pkg.go.dev/github.com/guvi-geek/flash/sdk/go) once the
module is tagged; the Sourcey site adds a branded, unified home that can host
both SDK references (Go and Python) side by side.
