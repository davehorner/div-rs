
## Unreleased
- Migrated to Webpack 5 for async WASM and modern JS tooling.
- Dropped stdweb; all browser interop now uses web-sys, wasm-bindgen, and gloo-timers.
- Updated Svelte/Webpack config for compatibility and modern plugin usage.

## v0.4
- (breaking) Changed type of positions from `u32` to `i32` (for pane and global frame). Negative offsets are valid and sometimes necessary.
