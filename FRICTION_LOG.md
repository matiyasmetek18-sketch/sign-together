# Friction log

## GitHub

The workspace had the Vega starter and no commits. `gh auth status` reports that the keyring token for `matiyasmetek18-sketch` is invalid. Unauthenticated requests to `https://github.com/matiyasmetek18-sketch/sign-together` return 404, so the private repository could not be confirmed from this session.

## Vega CLI

`vega --help` fails inside a restricted shell with `Failed to get SDK help menu`. Sourcing `/Users/matiyasdawit/vega/env` and running outside the sandbox works. Active SDK is 0.24.12112 and the CLI is 1.4.4, matching the previously verified environment.

The first debug build stalled in Metro on `Waiting for Watchman watch-project` past 90 seconds. `metro.config.js` sets `resolver.useWatchman` to false so the bundler uses the Node watcher instead.

`vega virtual-device start --timeout 180` created an instance, then logged `virtual device failed to boot` / `failed to access shell`. Status after the deadline was `running: false`, so the package was not launched and remote focus was not tested.

`BackHandler` is a lazy getter on the Kepler React Native export. A named import is undefined under Jest, so the TV app reads `ReactNative.BackHandler` and skips the listener when the test double does not provide it.

## Node crypto

The global Web Crypto `crypto.randomUUID()` exists in Node 24. `crypto.randomInt` does not. Pairing codes use `randomInt` from `node:crypto`.

## Recognition

MediaPipe's hand model and WASM are loaded by the phone from public CDNs. That is model download traffic, not an upload of camera frames. A machine without network access cannot start detection even though inference itself is local.

No physical camera run has been recorded, so there is no accuracy percentage to report.
