# Status

Updated October 23, 2026.

| Milestone | State | Notes |
| --- | --- | --- |
| A. Fire TV foundation | Implemented, unit tested, debug VPKG built. Simulator boot failed. | Welcome, pairing, practice, completion, focus buttons, scoring. |
| B. Phone recognition | Camera path used in one live round. | iPhone Safari, MediaPipe, all five letters scored. V needed many retries in that round. |
| C. Local integration | Phone, HTTPS relay, and terminal TV completed a round. | `npm run relay` and `npm run tv`. The Vega WebSocket client is still not exercised on a device. |
| D. AWS infrastructure | Written, not deployed. | Blocked on explicit deployment approval. |
| E. End-to-end AWS | Not started. | Depends on D. |
| F. Submission package | Demo script matches the live https round. | AWS stays undeployed. The Vega app is built but not launched on a device. |

## Blockers

- One live camera round is recorded in EVIDENCE.md. A repeated accuracy measurement has not been taken. V was the difficult letter in that round.
- The Vega emulator hangs. `virtual_device.err` reports `QEMU2 main loop` and CPU threads with no response for 15 seconds, then the process crashes. No Fire TV is connected. Remote navigation is unverified.
- AWS stays undeployed. The shipped demo is the local relay. Historical credit and budget figures were not rechecked.

## Next

1. Boot a Fire TV or a working simulator and install the debug `.vpkg`.
2. Deploy `infra/` only after a fresh cost check, then set `TRANSPORT_MODE` to `aws`.
