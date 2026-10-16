# Evidence

Recorded October 16, 2026 on the Apple Silicon Mac with Vega SDK 0.24.12112 and Vega CLI 1.4.4. Node.js is v24.14.1.

## Logic tests

Command: `node --test shared/*.test.mjs relay/server.test.mjs infra/lambda/router.test.mjs`

Result: **17 passed, 0 failed.**

Covered:

- Classifier accepts synthetic A, B, L, V, and Y, including scale and small noise.
- Half-open hands and a pointing index are rejected.
- Stability requires repeated confident frames and a cooldown.
- Protocol rejects bad JSON, oversized payloads, unknown letters, and bad confidence.
- Sessions expire codes, isolate two rooms, reject duplicate event ids, and resume after disconnect.
- The local WebSocket relay forwards one prediction and serves the phone page.
- The Lambda router, using the in-memory store, forwards one prediction.

## TV unit tests

Command: `npm test -- --watchman=false --ci`

Result: **8 passed, 0 failed** (welcome screen, demo round, pairing, score, duplicate prediction, Tile focus styles, reducer).

Lint: `npx eslint src test package.json --ext .ts,.tsx` exited 0.

## Vega debug build

Command: `npm run build:debug` (with the Vega SDK environment loaded)

Result: **exit 0**. `vega vtbuild exited with code 0` and `build-vega completed`.

Packages created:

- `build/private/kepler/@amazon-devices/signtogether/undefined/vega/aarch64/Debug/@amazon-devices/signtogether_aarch64.vpkg`
- `build/private/kepler/@amazon-devices/signtogether/undefined/vega/armv7/Debug/@amazon-devices/signtogether_armv7.vpkg`
- `build/private/kepler/@amazon-devices/signtogether/undefined/vega/x86_64/Debug/@amazon-devices/signtogether_x86_64.vpkg`

Manifest validation reported 0 errors. The package id is `com.signtogether.app`, title `Sign Together`, about 1.9 MB. The build warned that `build_number` is 0 and that no app icon is set, so the system icon is used. It also warned that the bundle has no asset files, which matches this UI (no images).

The first attempt stalled for more than 90 seconds on Watchman. The successful build used `resolver.useWatchman: false`.

## Simulator

Command: `vega virtual-device start --timeout 180`

The CLI created an instance and printed `Waiting for virtual device to boot`. After 180 seconds it reported `Deadline reached (180s) but virtual device unresponsive` and exited 0. A follow-up `vega virtual-device status` returned `{"running":false}`.

`vvd/virtual_device.log` records `virtual device failed to boot` with `failed to access shell`. The app package was not installed, and D-pad navigation was not exercised.

## Not verified

| Check | State |
| --- | --- |
| Vega package build | Debug build succeeded. See below. |
| Vega simulator D-pad walk | Blocked. The virtual device did not boot. See below. |
| Physical camera / MediaPipe on a phone | Not run |
| Measured recognition accuracy | None. Do not invent one. |
| AWS deployment | Not deployed |
| Git push | Blocked. GitHub token is invalid. |

## Recognition settings

- Letters: A, B, L, V, Y
- Reject when the best template distance is above 0.92 or the margin to the next letter is below 0.28
- Phone emits a prediction after 4 agreeing frames at confidence ≥ 0.72, then waits 1200 ms before the same letter can emit again
- TV ignores predictions below 0.72 and ignores repeated event ids
- Palm should face the camera. Lighting and distance limits are unmeasured.
