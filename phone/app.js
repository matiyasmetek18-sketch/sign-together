import {classifyLandmarks} from '/shared/classifier.mjs';
import {SUPPORTED_LETTERS} from '/shared/letters.mjs';
import {createStabilityGate} from '/shared/stability.mjs';

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const statusNode = document.querySelector('#status');
const detailNode = document.querySelector('#detail');
const seenNode = document.querySelector('#seen');
const video = document.querySelector('#camera');
const codeInput = document.querySelector('#code');
const joinButton = document.querySelector('#join');

const gate = createStabilityGate();
let socket = null;
let joinToken = null;
let landmarker = null;
let cameraOn = false;
let lastInterim = '';

const params = new URLSearchParams(window.location.search);
if (params.get('code')) {
  codeInput.value = params.get('code').toUpperCase();
}

joinButton.addEventListener('click', () => {
  const cameraPromise = beginCamera();
  cameraPromise.catch((error) => setStatus(cameraMessage(error), true));
  join(codeInput.value.trim().toUpperCase(), cameraPromise);
});

for (const button of document.querySelectorAll('[data-test-letter]')) {
  button.addEventListener('click', () => {
    sendPrediction({
      letter: button.dataset.testLetter,
      confidence: 0.99,
      eventId: crypto.randomUUID().replaceAll('-', ''),
      timestamp: Date.now(),
    });
  });
}

function beginCamera() {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    const error = new Error('insecure');
    error.name = 'SecurityError';
    return Promise.reject(error);
  }
  return navigator.mediaDevices.getUserMedia({
    video: {facingMode: 'user', width: {ideal: 640}, height: {ideal: 480}},
    audio: false,
  });
}

function join(code, cameraPromise) {
  if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code)) {
    setStatus('Enter the 6-character code from the TV.', true);
    return;
  }
  setStatus('Connecting…');
  socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({v: 1, type: 'session.join', role: 'phone', code}));
  });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'session.ready') {
      joinToken = message.joinToken ?? joinToken;
      setStatus('Connected. Starting the camera…', false, true);
      startCamera(cameraPromise);
    } else if (message.type === 'error') {
      setStatus(friendlyError(message.code), true);
    } else if (message.type === 'peer.disconnected') {
      setStatus('The TV disconnected. Keep this page open and wait for it to return.', true);
    }
  });
  socket.addEventListener('close', () => {
    if (joinToken) {
      setStatus('Connection closed. Rejoin if the TV shows a new code.', true);
    }
  });
}

async function startCamera(cameraPromise = beginCamera()) {
  if (cameraOn) {
    return;
  }
  try {
    const stream = await cameraPromise;
    video.srcObject = stream;
    await video.play();
    cameraOn = true;
    await startDetection();
  } catch (error) {
    setStatus(cameraMessage(error), true);
  }
}

async function startDetection() {
  try {
    const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21');
    const files = await vision.FilesetResolver.forVisionTasks(WASM);
    landmarker = await createLandmarker(vision.HandLandmarker, files);
    setStatus('Camera on. Hold a handshape steady.', false, true);
    detectFrame();
  } catch (error) {
    setStatus('Hand detection could not load. Check the network connection and try again.', true);
    console.error(error);
  }
}

async function createLandmarker(HandLandmarker, files) {
  const options = (delegate) => ({
    baseOptions: {modelAssetPath: MODEL, delegate},
    runningMode: 'VIDEO',
    numHands: 1,
  });
  try {
    return await HandLandmarker.createFromOptions(files, options('GPU'));
  } catch {
    return HandLandmarker.createFromOptions(files, options('CPU'));
  }
}

function detectFrame() {
  if (!landmarker || video.readyState < 2) {
    requestAnimationFrame(detectFrame);
    return;
  }
  const result = landmarker.detectForVideo(video, performance.now());
  const landmarks = result.landmarks?.[0];
  const classified = classifyLandmarks(landmarks);
  const now = performance.now();
  if (!classified.letter) {
    seenNode.textContent = '–';
    detailNode.textContent =
      classified.reason === 'no-hand'
        ? 'Show your hand to the camera.'
        : 'That shape is not a confident A, B, L, V, or Y.';
    gate.push(null, now);
  } else {
    seenNode.textContent = classified.letter;
    detailNode.textContent = `${classified.letter} · confidence ${classified.confidence.toFixed(2)}`;
    const stable = gate.push(classified, now);
    if (stable) {
      sendPrediction(stable);
    }
  }
  if (classified.letter !== lastInterim) {
    lastInterim = classified.letter;
  }
  requestAnimationFrame(detectFrame);
}

function sendPrediction(prediction) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    setStatus('Join the TV before sending a letter.', true);
    return;
  }
  if (!SUPPORTED_LETTERS.includes(prediction.letter)) {
    return;
  }
  socket.send(
    JSON.stringify({
      v: 1,
      type: 'prediction',
      eventId: prediction.eventId,
      letter: prediction.letter,
      confidence: prediction.confidence,
    }),
  );
  setStatus(`Sent ${prediction.letter} to the TV.`, false, true);
}

function setStatus(text, isError = false, isGood = false) {
  statusNode.textContent = text;
  statusNode.className = `status${isError ? ' bad' : ''}${isGood ? ' good' : ''}`;
}

function friendlyError(code) {
  const messages = {
    'invalid-code': 'That code is not valid. Use the six characters on the TV.',
    'code-expired': 'That code expired. Start practice again on the TV.',
    'session-not-found': 'That code is no longer active.',
    'session-full': 'A phone is already joined to this TV.',
    'duplicate-event': 'The TV already received that letter.',
    'rate-limited': 'Slow down a moment, then try the handshape again.',
  };
  return messages[code] ?? 'The session could not accept that message.';
}

function cameraMessage(error) {
  const name = error?.name ?? '';
  if (name === 'NotAllowedError') {
    return 'Camera permission was blocked. Allow the camera and press Join again.';
  }
  if (name === 'NotFoundError') {
    return 'No camera was found on this device.';
  }
  if (name === 'NotReadableError') {
    return 'The camera is in use by another app.';
  }
  if (name === 'SecurityError' || !window.isSecureContext) {
    return 'iPhone Safari blocks the camera on http. Use the https address printed by the relay. Tap Show Details, visit the website, then Join again.';
  }
  return 'The camera could not start. Use the https address from the relay, then allow the camera.';
}
