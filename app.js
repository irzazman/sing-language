const video = document.getElementById("video");
const canvas = document.getElementById("output");
const ctx = canvas.getContext("2d");

let holistic = new Holistic({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
});

holistic.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  refineFaceLandmarks: true,
});

async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480 },
  });
  video.srcObject = stream;
  await new Promise((resolve) => (video.onloadedmetadata = resolve));
  video.play();
}

function drawLandmarks(results) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Draw Pose and Hand landmarks
  if (results.poseLandmarks) {
    drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: "#00FF00" });
    drawLandmarks(ctx, results.poseLandmarks, { color: "#FF0000", lineWidth: 2 });
  }
  if (results.rightHandLandmarks) {
    drawConnectors(ctx, results.rightHandLandmarks, HAND_CONNECTIONS, { color: "#00FF00" });
    drawLandmarks(ctx, results.rightHandLandmarks, { color: "#FF0000", lineWidth: 2 });
  }
  if (results.leftHandLandmarks) {
    drawConnectors(ctx, results.leftHandLandmarks, HAND_CONNECTIONS, { color: "#00FF00" });
    drawLandmarks(ctx, results.leftHandLandmarks, { color: "#FF0000", lineWidth: 2 });
  }
}

holistic.onResults(drawLandmarks);

setupCamera().then(() => {
  video.addEventListener("loadeddata", () => {
    const processVideo = () => {
      holistic.send({ image: video });
      requestAnimationFrame(processVideo);
    };
    processVideo();
  });
});


let frameBuffer = [];

function processLandmarksForModel(results) {
  const landmarks = [];

  // Add pose landmarks
  if (results.poseLandmarks) {
    landmarks.push(...results.poseLandmarks.flatMap((l) => [l.x, l.y, l.z]));
  }

  // Add right hand landmarks
  if (results.rightHandLandmarks) {
    landmarks.push(...results.rightHandLandmarks.flatMap((l) => [l.x, l.y, l.z]));
  } else {
    landmarks.push(...Array(21 * 3).fill(0));
  }

  // Add left hand landmarks
  if (results.leftHandLandmarks) {
    landmarks.push(...results.leftHandLandmarks.flatMap((l) => [l.x, l.y, l.z]));
  } else {
    landmarks.push(...Array(21 * 3).fill(0));
  }

  frameBuffer.push(landmarks);
  if (frameBuffer.length > 30) {
    frameBuffer.shift(); // Keep the buffer to 30 frames
  }

  if (frameBuffer.length === 30) {
    makePrediction(frameBuffer);
  }
}

let model;

async function loadModel() {
  model = await tf.loadLayersModel("AImodel.json");
  console.log("Model loaded!");
}

async function makePrediction(buffer) {
  const input = tf.tensor([buffer]); // Shape: [1, 30, 258]
  const prediction = model.predict(input);
  const result = await prediction.array();
  console.log("Prediction:", result); // Process and display predictions here
}

loadModel();
