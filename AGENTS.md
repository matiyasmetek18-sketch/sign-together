# Agent rules

Sign Together is a hackathon prototype for Amazon Fire TV. Ship the smallest working loop: TV letter, phone handshape, score.

## Product limits

- Five static ASL fingerspelling letters: A, B, L, V, Y.
- Do not claim the app translates ASL, reads sentences, or supports J and Z.
- Do not invent accuracy numbers. Record a measurement only after a real camera run.
- Keep camera frames and landmark sequences on the phone. Send the letter, confidence, and event id only.

## Engineering limits

- The Vega app stays a real React Native project. Do not replace it with a website pretending to be Fire TV.
- The local relay and AWS use the same message contract. Label local mode as local.
- Do not deploy AWS, enable paid APIs, publish the repository, or submit the hackathon entry without explicit approval.
- Do not force-push, rewrite shared history, or commit secrets.
- Pairing codes are for joining. Privileged resume uses the long session id or phone join token.
- Reject duplicate prediction event ids in both the relay and the TV scorer.

## Verification

- Run `npm run test:logic` for the classifier, stability filter, protocol, sessions, relay, and Lambda router.
- Run `npm test` for the TV game state and screens.
- A Vega build or simulator run must be recorded in `EVIDENCE.md` before calling the TV app verified.
- Update `STATUS.md` when a milestone's evidence changes.
