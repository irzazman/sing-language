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

let model;
let frameBuffer = [];

// Initialize Camera
async function setupCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
    });
    video.srcObject = stream;
    await new Promise((resolve) => (video.onloadedmetadata = resolve));
    video.play();
    console.log("Camera setup complete");
  } catch (error) {
    console.error("Error accessing the camera:", error);
  }
}

// Draw Landmarks
function drawLandmarks(results) {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

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

// Process Landmarks for Model Input
function processLandmarksForModel(results) {
  const landmarks = [];

  // Pose landmarks
  if (results.poseLandmarks) {
    landmarks.push(...results.poseLandmarks.flatMap((l) => [l.x, l.y, l.z]));
  }

  // Right hand landmarks
  if (results.rightHandLandmarks) {
    landmarks.push(...results.rightHandLandmarks.flatMap((l) => [l.x, l.y, l.z]));
  } else {
    landmarks.push(...Array(21 * 3).fill(0));
  }

  // Left hand landmarks
  if (results.leftHandLandmarks) {
    landmarks.push(...results.leftHandLandmarks.flatMap((l) => [l.x, l.y, l.z]));
  } else {
    landmarks.push(...Array(21 * 3).fill(0));
  }

  // Update frame buffer
  frameBuffer.push(landmarks);
  if (frameBuffer.length > 30) {
    frameBuffer.shift(); // Maintain buffer size
  }

  // Predict if buffer is full
  if (frameBuffer.length === 30) {
    makePrediction(frameBuffer);
  }
}

// Load Model
async function loadModel() {
  try {
    model = await tf.loadLayersModel("tfjs_model/model.json");
    console.log("Model loaded successfully");
  } catch (error) {
    console.error("Error loading model:", error);
  }
}

// Make Predictions
async function makePrediction(buffer) {
  try {
    const input = tf.tensor([buffer]); // Shape: [1, 30, 258]
    const prediction = model.predict(input);
    const result = await prediction.array();
    console.log("Prediction:", result);

    // Update UI with prediction
    displayPrediction(result);
  } catch (error) {
    console.error("Error during prediction:", error);
  }
}

// Display Prediction
function displayPrediction(predictions) {
  const predictionElement = document.getElementById("prediction");
  if (predictionElement) {
    predictionElement.textContent = `Prediction: ${predictions}`;
  } else {
    console.log("Prediction:", predictions);
  }
}

// Start Holistic and Camera
holistic.onResults((results) => {
  drawLandmarks(results);
  processLandmarksForModel(results);
});

setupCamera().then(() => {
  video.addEventListener("loadeddata", () => {
    const processVideo = () => {
      holistic.send({ image: video });
      requestAnimationFrame(processVideo);
    };
    processVideo();
  });
});

// Load Model
loadModel();
