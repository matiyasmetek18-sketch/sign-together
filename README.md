# Sign Together

Sign Together is a family practice game for Amazon Fire TV. The television shows one American Sign Language fingerspelling letter at a time. A phone browser reads the handshape locally and sends only the guessed letter to the TV.

This is a five-letter prototype. It is not a general ASL translator, interpreter, or sentence recognizer.

## How it fits together

```text
Fire TV (Vega / React Native)          Phone browser
Welcome → Pairing → Practice → Done    Camera → MediaPipe landmarks
        \                              → local classifier → stable letter
         \                            /
          local relay or AWS WebSocket
```

The camera frame never leaves the phone. The phone sends a letter, a confidence value, and an event id.

Supported static letters: **A, B, L, V, Y**.

| Letter | Handshape the classifier expects |
| --- | --- |
| A | Closed fist, thumb alongside the fingers |
| B | Four fingers extended and together, thumb tucked |
| L | Thumb and index extended, other fingers closed |
| V | Index and middle extended and spread, other fingers closed |
| Y | Thumb and pinky extended, other fingers closed |

J and Z are excluded because they require motion. Recognition is a geometric comparison of MediaPipe landmarks, not a trained translator. Ambiguous shapes are rejected. Accuracy on real cameras has not been measured yet.

## Run the local demo

Requirements: Node.js 20+, the Vega SDK for the TV app, and a phone or desktop browser for the companion page.

```sh
npm install
npm run relay
npm run tv
```

`npm run relay` prints an http address for this Mac and one for every local network address. Open that page on the phone and enter the code printed by `npm run tv`.

`npm run tv` is a terminal stand-in that uses the same scoring code as the Fire TV app. The Vega package is still the television app. The virtual device did not boot on this Mac, so the terminal is the way to play a live round until a Fire TV or a working simulator is available.

The Vega simulator does not use the Mac's `127.0.0.1`. If the TV cannot reach the relay, set `LOCAL_RELAY_URL` in `src/config.ts` to `ws://<mac-lan-ip>:8787` and open the phone page at `http://<mac-lan-ip>:8787`.

```sh
npm test
npm run test:logic
npm run build:debug
```

`TRANSPORT_MODE` in `src/config.ts` is `local`. The AWS template is not deployed.

## Remote controls

The TV UI is built for the Fire TV remote: D-pad moves between buttons, Select activates the focused button, and Back returns to the welcome screen. Buttons draw a visible focus border. There is no touch interface.

**Try a demo round** plays scripted answers on the TV so the screens can be shown without a phone. It is labeled as a demo and does not use the camera.

## Message contract

All messages are JSON, version `v: 1`, and at most 1024 bytes.

Client to server:

- `{ "v": 1, "type": "session.create", "role": "tv" }`
- `{ "v": 1, "type": "session.join", "role": "phone", "code": "AB23CD" }`
- `{ "v": 1, "type": "session.resume", "role": "tv", "secret": "<session id>" }`
- `{ "v": 1, "type": "session.resume", "role": "phone", "secret": "<join token>" }`
- `{ "v": 1, "type": "prediction", "eventId": "<16-64 chars>", "letter": "A", "confidence": 0.91 }`

Server to client: `session.created`, `session.ready`, `prediction`, `peer.disconnected`, `error`, `pong`.

The six-character code uses an alphabet without `0`, `O`, `1`, or `I`. It expires after 10 minutes, works once, and is not accepted as a resume secret. The TV resumes with the session id. The phone resumes with a join token that is sent only to the phone.

The TV awards a point only when the letter matches the current target, confidence is at least 0.72, and the event id has not been seen. A correct answer advances after a short pause. Repeated event ids do not score again.

## AWS

Infrastructure is described in [infra/README.md](infra/README.md). Do not deploy it until cost, credits, and permissions have been reviewed and explicitly approved.

## Three-minute demo

1. Welcome screen: five letters, and the limit that this is not a full ASL translator.
2. Start practice. Read the pairing code.
3. Join from the phone and show the handshape for the letter on the TV.
4. Point out the score change and the next letter.
5. Finish the round and replay or return home.

If the camera cannot be shown, use **Try a demo round** and say that those answers are scripted.

## Development status

See [STATUS.md](STATUS.md) and [EVIDENCE.md](EVIDENCE.md).
