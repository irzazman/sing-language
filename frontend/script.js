// script.js

// Access the video element and prediction display
const video = document.getElementById('video');
const predictionDisplay = document.getElementById('prediction');

// Access webcam and draw video feed
navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
    })
    .catch(error => {
        console.error('Error accessing webcam:', error);
        predictionDisplay.innerText = 'Error accessing webcam. Please check permissions.';
    });

// Function to capture frames and send to server
function captureFrame() {
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert the canvas to a Blob
    canvas.toBlob(async (blob) => {
        // Create a FormData object to send the image
        const formData = new FormData();
        formData.append('image', blob, 'frame.jpg'); // Append the image blob

        try {
            // Send the image to the server for prediction
            const response = await fetch('https://your-flask-app-url/predict', { // Update with your Flask app URL
                method: 'POST',
                body: formData
            });

            // Handle the response from the server
            const result = await response.json();
            console.log(result); // Log the prediction result

            // Display the predicted word on the webpage
            if (result.predicted_word) {
                predictionDisplay.innerText = `Predicted Word: ${result.predicted_word}`;
            } else {
                predictionDisplay.innerText = result.message; // Show collecting frames message
            }
        } catch (error) {
            console.error('Error sending frame to server:', error);
            predictionDisplay.innerText = 'Error sending frame to server.';
        }
    }, 'image/jpeg'); // Specify the image format
}

// Capture frame every 100ms
setInterval(captureFrame, 100);