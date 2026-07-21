---
title: Introduction
description: Official Go SDK for the Flash sandbox engine — claim an isolated sandbox from a warm pool in under 2 seconds, run commands, move files, and score submissions.
---

# Flash Go SDK

Official Go SDK for the [Flash sandbox engine](https://github.com/guvi-geek/flash) —
a self-hosted sandbox platform. Claim an isolated sandbox from a warm pool in
under two seconds, run commands inside it, read and write files, open a live
browser preview, and destroy it when you are done.

The SDK is **dependency-free** (standard library only) and every call that
touches the network is **context-aware**.

## Install

```bash
go get github.com/guvi-geek/flash/sdk/go
```

## Quickstart

```go
import flash "github.com/guvi-geek/flash/sdk/go"

client, _ := flash.New() // reads FLASH_API_KEY + FLASH_BASE_URL from the environment

sbx, err := client.Sandboxes.Create(ctx, flash.CreateSandboxOpts{
    Template: "q1",
    Timeout:  10 * time.Minute,
    Metadata: map[string]string{"purpose": "ci"},
})
defer sbx.Kill(ctx)

res, _ := sbx.Run(ctx, "node -e 'console.log(40+2)'")
fmt.Print(res.Stdout) // "42\n"

sbx.Files().Write(ctx, "notes.txt", []byte("hello"))
b, _ := sbx.Files().Read(ctx, "notes.txt")
```

## Services

A `Client` exposes four services. Full signatures for each are in the
[API Reference](/api).

| Service | Surface |
|---|---|
| `client.Sandboxes` | `Create` / `Connect` / `List`; on a `Sandbox`: `Run` / `Exec` / `Files()` / `SetTimeout` / `Kill` / `Refresh` |
| `client.Templates` | `List` / `Create` / `Scale` (warm-pool floor) |
| `client.APIKeys` | `Create` / `List` / `Revoke` (the raw key is shown once) |
| `client.Assessments` | scoring layer: `CreateSession`, `Session.Submit`, `Session.WaitForScore` |

## Conventions worth knowing

- **A non-zero exit code is a result, not an error.** `sbx.Run` returns an
  `ExecResult` with `ExitCode`, `Stdout`, and `Stderr`. A command that fails
  inside the sandbox still returns `err == nil` — inspect `ExitCode`. An
  `error` means the call itself failed (network, auth, sandbox gone).
- **Configuration comes from the environment by default.** `flash.New()` reads
  `FLASH_API_KEY` and `FLASH_BASE_URL`. Override explicitly with
  `flash.WithAPIKey`, `flash.WithBaseURL`, or `flash.WithHTTPClient`.
- **Missing resources are detectable.** Use `flash.IsNotFound(err)` rather than
  matching on error strings; the SDK returns a typed `*APIError` carrying the
  HTTP status.
- **Everything takes a `context.Context`.** Cancel it to abort an in-flight
  request; sandbox lifetimes are governed separately by `SetTimeout`.

## Regenerating these docs

The API reference is generated from the Go doc comments in `sdk/go` — there is
no second copy of the documentation to keep in sync.

```bash
cd sdk/go
npx sourcey godoc -m . -o godoc.json   # refresh the snapshot (needs Go)
npx sourcey build                      # build the static site into dist/
```

`godoc.json` is committed so the site builds without the Go toolchain
installed; refresh it whenever exported signatures or doc comments change.
