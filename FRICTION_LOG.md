# Friction log

## GitHub

The workspace had the Vega starter and no commits. `gh` still has an invalid keyring token, so `gh` API calls fail. Git's credential helper could fetch and push. The remote's only prior commit was a one-line README, which was merged without a force-push.

## Vega CLI

`vega --help` fails inside a restricted shell with `Failed to get SDK help menu`. Sourcing `/Users/matiyasdawit/vega/env` and running outside the sandbox works. Active SDK is 0.24.12112 and the CLI is 1.4.4, matching the previously verified environment.

The first debug build stalled in Metro on `Waiting for Watchman watch-project` past 90 seconds. `metro.config.js` sets `resolver.useWatchman` to false so the bundler uses the Node watcher instead.

`vega virtual-device start --timeout 180` created an instance, then logged `virtual device failed to boot` / `failed to access shell`. The instance error log shows the QEMU main loop and CPU threads hanging for 15 seconds, Vulkan texture validation failures, and a crash under Rosetta (`UniversalExceptionRaise`). On October 21 the virtual device was not running and `vega device list` found no hardware. The package was not launched.

`BackHandler` is a lazy getter on the Kepler React Native export. A named import is undefined under Jest, so the TV app reads `ReactNative.BackHandler` and skips the listener when the test double does not provide it.

## Node crypto

The global Web Crypto `crypto.randomUUID()` exists in Node 24. `crypto.randomInt` does not. Pairing codes use `randomInt` from `node:crypto`.

## Recognition

MediaPipe's hand model and WASM are loaded by the phone from public CDNs. That is model download traffic, not an upload of camera frames. A machine without network access cannot start detection even though inference itself is local.

No physical camera run has been recorded, so there is no accuracy percentage to report.
