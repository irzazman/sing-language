from flask import Flask, request, jsonify
import cv2
import mediapipe as mp
import numpy as np
from function import mediapipe_detection, draw_styled_landmarks, extract_keypoints
from tensorflow.keras.models import load_model

app = Flask(__name__)
model = load_model('AImodel.h5')

# Initialize Mediapipe
mp_holistic = mp.solutions.holistic

# Variables to store keypoints and frame count
keypoints_list = []
frame_count = 0
max_frames = 30  # Number of frames to collect for prediction

@app.route('/predict', methods=['POST'])
def predict():
    global keypoints_list, frame_count

    # Get the image from the request
    image_file = request.files['image']
    image = cv2.imdecode(np.frombuffer(image_file.read(), np.uint8), cv2.IMREAD_COLOR)

    # Process the image
    with mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5) as holistic:
        image, results = mediapipe_detection(image, holistic)
        draw_styled_landmarks(image, results)

        # Extract keypoints
        keypoints = extract_keypoints(results)
        keypoints_list.append(keypoints)  # Store the keypoints
        frame_count += 1  # Increment the frame count

        # Check if we have collected enough frames
        if frame_count >= max_frames:
            # Convert the list of keypoints to a NumPy array
            keypoints_array = np.array(keypoints_list)
            keypoints_array = keypoints_array.reshape((1, max_frames, -1))  # Reshape for model input

            # Make prediction
            predictions = model.predict(keypoints_array)
            predicted_class_index = np.argmax(predictions, axis=1)[0]  # Get the predicted class index
            predicted_word = actions[predicted_class_index]  # Map index to word

            # Reset keypoints and frame count
            keypoints_list = []
            frame_count = 0

            # Return the prediction result
            return jsonify({'predicted_class_index': int(predicted_class_index), 'predicted_word': predicted_word})

    # If not enough frames, return a message
    return jsonify({'message': 'Collecting frames...'})

if __name__ == '__main__':
    app.run(debug=True)