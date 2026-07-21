import { defineConfig } from "sourcey";

// API reference for the Flash Go SDK.
//
// Regenerate the godoc snapshot (requires the Go toolchain):
//   npx sourcey godoc -m . -o godoc.json
// Build the static site (no Go required — reads the committed snapshot):
//   npx sourcey build
//
// `mode: "auto"` prefers a live `go list` run when Go is available and falls
// back to the committed godoc.json otherwise, so CI and contributors without
// the Go toolchain can still build the docs.
export default defineConfig({
  prettyUrls: "strip",
  name: "Flash Go SDK",
  // Enables source links from generated API symbols back to the Go source.
  repo: "https://github.com/guvi-geek/flash",
  editBranch: "main",
  editBasePath: "sdk/go",
  theme: {
    preset: "default",
    colors: { primary: "#2563eb" },
  },
  navigation: {
    tabs: [
      {
        tab: "Guide",
        slug: "",
        groups: [{ group: "Start", pages: ["introduction"] }],
      },
      {
        tab: "API Reference",
        slug: "api",
        godoc: {
          module: ".",
          packages: ["./..."],
          snapshot: "godoc.json",
          mode: "auto",
          includeTests: true,
          // The Go module lives at sdk/go within the repository, so source
          // links need that prefix to resolve against the repo root.
          sourceBasePath: "sdk/go",
        },
      },
    ],
  },
});
