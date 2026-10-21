# Status

Updated October 21, 2026.

| Milestone | State | Notes |
| --- | --- | --- |
| A. Fire TV foundation | Implemented, unit tested, debug VPKG built. Simulator boot failed. | Welcome, pairing, practice, completion, focus buttons, scoring. |
| B. Phone recognition | Implemented and unit tested. Camera path is not yet manually verified. | MediaPipe in the browser, geometric classifier, stability gate. |
| C. Local integration | Relay and terminal TV round tested. | `npm run relay` and `npm run tv`. The Vega WebSocket client is still not exercised on a device. |
| D. AWS infrastructure | Written, not deployed. | Blocked on explicit deployment approval. |
| E. End-to-end AWS | Not started. | Depends on D. |
| F. Submission package | Demo script and storyboard are in DEMO.md. | Do not publish or submit. |

## Blockers

- Real-camera recognition accuracy is unmeasured.
- The Vega emulator hangs. `virtual_device.err` reports `QEMU2 main loop` and CPU threads with no response for 15 seconds, then the process crashes. No Fire TV is connected. Remote navigation is unverified.
- AWS deployment is waiting for approval. Historical credit and budget figures were not rechecked.

## Next

1. Play a live round with `npm run relay` and `npm run tv` on a phone.
2. Boot a Fire TV or a working simulator and install the debug `.vpkg`.
3. On approval, deploy the stack in `infra/` and switch `TRANSPORT_MODE` to `aws`.
