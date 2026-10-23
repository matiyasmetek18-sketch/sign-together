# Demo

## Live round on this Mac

```sh
npm run relay
npm run tv
```

Open the https address the relay prints. Use the network address when the phone is not the Mac. iPhone Safari blocks the camera on http. When Safari warns about the certificate, tap Show Details, then visit the website. Enter the code from the terminal and allow the camera. If the camera cannot be used, open "No camera? Send a test letter" and send the letter currently shown.

The terminal advances as soon as a letter matches. The Fire TV app waits about one second so the correct answer can be read.

## Three minutes

1. Say this is a five-letter fingerspelling game, not an ASL translator. The letters are A, B, L, V, and Y.
2. Show the code and the phone joining.
3. Make or send the letter on screen. Point out that the score changes only when it matches.
4. Send the same result again and show that the score does not change.
5. Finish the round. Say one iPhone session scored 5/5 and V took many tries. That is one session, not a measured accuracy rate. AWS is prepared and not deployed.

## If the Vega simulator is available

Build with `npm run build:debug` after setting `LOCAL_RELAY_URL` in `src/config.ts` to `ws://<mac-lan-ip>:8787`. Install the aarch64 `.vpkg` with `vega run-app`. Use the remote: D-pad moves, Select activates, Back returns home. **Try a demo round** is scripted and does not use the camera.

## Storyboard

1. Welcome screen, five letters, and the limit in the footer.
2. Pairing code, full screen.
3. Phone page with the code and the camera preview.
4. Practice screen: large letter, score, and "Correct".
5. Completion score out of 5.
