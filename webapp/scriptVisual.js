/*
 Copyright 2024 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

// Loads mediapipe models.
import {FilesetResolver, HandLandmarker, ObjectDetector} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision';

import {callGPT, callGPTLite} from './util.js';

let objectDetector;
let handLandmarker;
async function loadModels() {
  const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm');
  objectDetector = await ObjectDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
          `https://storage.googleapis.com/mediapipe-tasks/object_detector/efficientdet_lite0_uint8.tflite`
    },
    scoreThreshold: 0.5,
    runningMode: 'VIDEO'
  });
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
          `https://storage.googleapis.com/mediapipe-assets/hand_landmarker.task`
    },
    numHands: 2,
    runningMode: 'VIDEO'
  });
}


// GLOBAL VARIABLES
// Creates a class of global variables for another js file to use.
class VisualInfo {
  constructor() {
    this.ALL_DETECTED_OBJECTS = [];
    // initialize as timestamp
    this.LAST_HAND_DETECTED = 0;
    this.HOLDING_OBJECT = '';
    this.IMAGE_CAPTION = '';
    this.HAND_CAPTION = '';
  }
}

// Creates a new instance of the class.
const visualInfo = new VisualInfo();

// Exports the instance.
export {visualInfo};



//////////////////////////////
// TASK 1: OBJECT DETECTION
//////////////////////////////
let objectHighlighters = [];
async function runObjectDetection() {
  // get the loadedvideo or webcam video
  let video = document.getElementById('webcam');
  if (video.style.display == 'none') {
    video = document.getElementById('loadedVideo');
  }

  let nowInMs = Date.now();
  // Detects objects using detectForVideo.
  const predictions = await objectDetector.detectForVideo(video, nowInMs);
  // Removes any highlighting from previous frame.
  for (let i = 0; i < objectHighlighters.length; i++) {
    liveView.removeChild(objectHighlighters[i]);
  }
  objectHighlighters.splice(0);
  visualInfo.ALL_DETECTED_OBJECTS = [];
  // Iterates through predictions and renders them to the live view.
  for (let n = 0; n < predictions.length; n++) {
    const p = document.createElement('p');
    p.innerText = predictions[n].categories[0].categoryName + ' ' +
        Math.round(parseFloat(predictions[n].categories[0].score) * 100) + '%';
    visualInfo.ALL_DETECTED_OBJECTS.push(p.innerText);
    p.style.left = `${
        predictions[n].boundingBox.originX *
            (video.offsetWidth / video.videoWidth) +
        video.offsetLeft}px`;
    p.style.top = `${
        predictions[n].boundingBox.originY *
            (video.offsetHeight / video.videoHeight) +
        video.offsetTop}px`;
    p.style.width = `${
        predictions[n].boundingBox.width *
        (video.offsetWidth / video.videoWidth)}px`;

    const highlighter = document.createElement('div');
    highlighter.setAttribute('class', 'highlighterObjectDetection');
    highlighter.style.left = `${
        predictions[n].boundingBox.originX *
            (video.offsetWidth / video.videoWidth) +
        video.offsetLeft}px`;
    highlighter.style.top = `${
        predictions[n].boundingBox.originY *
            (video.offsetHeight / video.videoHeight) +
        video.offsetTop}px`;
    highlighter.style.width = `${
        predictions[n].boundingBox.width *
        (video.offsetWidth / video.videoWidth)}px`;
    highlighter.style.height = `${
        predictions[n].boundingBox.height *
        (video.offsetHeight / video.videoHeight)}px`;
    liveView.appendChild(highlighter);
    liveView.appendChild(p);
    // Stores drawn objects in memory so they are queued to delete at next call
    objectHighlighters.push(highlighter);
    objectHighlighters.push(p);

    // If toggle button not on, hides the objects.
    if (!toggleObjectDetection.getValue()) {
      for (let i = 0; i < objectHighlighters.length; i++) {
        objectHighlighters[i].style.display = 'none';
      }
    }
  }
  // Calls this function again to keep predicting when the browser is ready
  // only continue if object detection is on
  window.requestAnimationFrame(runObjectDetection);
}



//////////////////////////////
// Task 2: Hand Landmarker
//////////////////////////////
async function runHandLandmarker() {
  // get the loadedvideo or webcam video
  let video = document.getElementById('webcam');
  if (video.style.display == 'none') {
    video = document.getElementById('loadedVideo');
  }

  let nowInMs = Date.now();
  const results = handLandmarker.detectForVideo(video, nowInMs);

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  if (results.landmarks.length > 0) {
    visualInfo.LAST_HAND_DETECTED = nowInMs;
    for (const landmarks of results.landmarks) {
      if (toggleHandLandmarker.getValue()) {
        // draw on screen
        // check if left or right hand
        if (landmarks[0].x < landmarks[9].x) {
          drawConnectors(
              canvasCtx, landmarks, HAND_CONNECTIONS,
              {color: '#4CAF50', lineWidth: 3});
        } else {
          drawConnectors(
              canvasCtx, landmarks, HAND_CONNECTIONS,
              {color: '#42A5F5', lineWidth: 3});
        }
      }
      drawLandmarks(canvasCtx, landmarks, {color: '#FF4D4D', lineWidth: 2});

      // HOLDING DETECTION
      // Calculates the avereage distance between the thumb and the index,
      // middle, ring and pinky finger
      let thumbIndex = distance(
          landmarks[4].x, landmarks[4].y, landmarks[8].x, landmarks[8].y);
      let thumbMiddle = distance(
          landmarks[4].x, landmarks[4].y, landmarks[12].x, landmarks[12].y);
      let thumbRing = distance(
          landmarks[4].x, landmarks[4].y, landmarks[16].x, landmarks[16].y);
      let thumbPinky = distance(
          landmarks[4].x, landmarks[4].y, landmarks[20].x, landmarks[20].y);
      let averageThumbDistance =
          (thumbIndex + thumbMiddle + thumbRing + thumbPinky) / 4;

      // Loops through all detected objects and check if the hand has overlapped
      // with an object
      for (let i = 0; i < objectHighlighters.length; i++) {
        // Gets the bounding box of the object.
        let objectBoundingBox = objectHighlighters[i].getBoundingClientRect();
        // Gets the distance between the center of the hand and the center of
        // the object.
        let handCenterX = (landmarks[0].x + landmarks[9].x) / 2;
        let handCenterY = (landmarks[0].y + landmarks[9].y) / 2;
        let objectCenterX =
            objectBoundingBox.left + objectBoundingBox.width / 2;
        let objectCenterY =
            objectBoundingBox.top + objectBoundingBox.height / 2;
        let distanceBetweenCenters =
            distance(handCenterX, handCenterY, objectCenterX, objectCenterY);
        // console.log("distanceBetweenCenters: " +
        // objectHighlighters[i].innerText + " " + distanceBetweenCenters);
        // console.log("objectBoundingBox.width: " + objectBoundingBox.width)

        // Checks if the hand is close enough to the object, and if the thumb is
        // closed, if the object is small enough, and the object is not a person
        if (distanceBetweenCenters < 1000 && averageThumbDistance < 0.25 &&
            !objectHighlighters[i].innerText.includes('person')) {
          // let holdingObject = document.getElementById("holdingObject");
          // holdingObject.innerText = objectHighlighters[i].innerText;
          visualInfo.HOLDING_OBJECT = objectHighlighters[i].innerText;
        } else {
          // let holdingObject = document.getElementById("holdingObject");
          // holdingObject.innerText = "";
          visualInfo.HOLDING_OBJECT = '';
        }
      }
    }
  }
  // if no hand is detected:
  else {
    // let holdingObject = document.getElementById("holdingObject");
    // holdingObject.innerText = "";
    visualInfo.HOLDING_OBJECT = '';
  }
  canvasCtx.restore();
  // Call this function again to keep predicting when the browser is ready
  window.requestAnimationFrame(runHandLandmarker);
}



////////////////////////////////
// Task 3: Image Captioning
// --> Activity
// --> Environment
////////////////////////////////
const RESIZE_FACTOR = 0.1;  // resize factor to reduce image size by 50%
const INTERVAL = 2000;      // interval in ms to run the activity recognition

function startImageCaption() {
  runImageCaption();
  setInterval(runImageCaption, INTERVAL);
}

async function runImageCaption() {
  // Get the loadedvideo or webcam video.
  let video = document.getElementById('webcam');
  if (video.style.display == 'none') {
    video = document.getElementById('loadedVideo');
  }

  // Gets a reference to the canvas element.
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  // Sets the canvas dimensions to match the video dimensions, resized by
  // RESIZE_FACTOR
  canvas.width = video.videoWidth * RESIZE_FACTOR;
  canvas.height = video.videoHeight * RESIZE_FACTOR;

  // Draws the current video frame onto the canvas, resized by RESIZE_FACTOR.
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Gets the image data from the canvas, resized by RESIZE_FACTOR.
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  //  // Using Hugging Face for Image Captioning
  //  const base64 = imageDataToBase64(imageData);
  //  let captionResult = await huggingfaceGenerateCaption(base64);
  // //  const handCaptionResult = ""
  //  captionResult = captionResult[0].generated_text;
  //  const captionResultDiv = document.getElementById("captionResult");
  //  captionResultDiv.innerText = captionResult;

  //  const handCaptionResult = await callGPTLite(`An egocentric view of C is
  //  showing ${captionResult}. What are C's hands likely doing in this
  //  situation?`); const handCaptionResultDiv =
  //  document.getElementById("captionHandResult");
  //  handCaptionResultDiv.innerText = handCaptionResult;
  //  visualInfo.IMAGE_CAPTION = captionResult;
  //  visualInfo.HAND_CAPTION = handCaptionResult;


  // Using BLIP for Image Captioning.
  const imgDataUrl = imageDataToDataUrl(imageData);
  const captionResult = await replicateGenerateCaption(imgDataUrl, true, '');
  const handCaptionResult = await replicateGenerateCaption(
      imgDataUrl, false, 'What are the hands doing?');

  // const caption = document.getElementById("captionResult");
  // caption.innerText = captionResult.output;
  // const handCaption = document.getElementById("captionHandResult");
  // handCaption.innerText = handCaptionResult.output;

  visualInfo.IMAGE_CAPTION = captionResult.output;
  visualInfo.HAND_CAPTION = handCaptionResult.output;
}


// Function to call local backend replicate API.
async function replicateGenerateCaption(image, caption, question) {
  const response = await fetch('/imageCaption', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({image: image, caption: caption, question: question})
  });

  const data = await response.json();
  // console.log(data);
  return data;
}


// Converts image data to base64 string.
function imageDataToBase64(imageData) {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  const base64 =
      canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
  return base64;
}


function imageDataToDataUrl(imageData) {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  const dataUrl = canvas.toDataURL('image/png');
  return dataUrl;
}



// Calculate the distance between two hand landmarks.
function distance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

//////////////////////////////
// MAIN
//////////////////////////////

let videoWebcam = document.getElementById('webcam');
let videoLoaded = document.getElementById('loadedVideo');
const liveView = document.getElementById('liveView');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

let startWebcamButton = document.getElementById('startWebcam');
let loadVideoButton = document.getElementById('loadVideo');

setCorrectSize();
// Checks if webcam access is supported.
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Starts camera
async function startCam() {
  console.log('Starting camera...');
  // make sure models are loaded
  await loadModels();

  console.log('Visual Models loaded.')
  visualModelsLoaded = true;

  // Enable the live webcam view and start detection.
  if (!objectDetector) {
    console.log('Wait! objectDetector not loaded yet.');
  }
  if (!handLandmarker) {
    console.log('Wait! handLandmarker not loaded yet.');
  }

  // Hides the videoloaded and show the webcam.
  videoWebcam.style.display = 'block';
  videoLoaded.style.display = 'none';

  // getUsermedia parameters
  // force to use the back camera
  const constraints = {
    audio: false,
    video: {
      // width: 640,
      // height: 480,
      facingMode: 'environment',
      deviceId: {
          // "046d:082d"
      }
    }
  };
  // Activates the webcam stream.
  navigator.mediaDevices.getUserMedia(constraints)
      .then(function(stream) {
        videoWebcam.srcObject = stream;
        videoWebcam.addEventListener('loadeddata', runObjectDetection);
        videoWebcam.addEventListener('loadeddata', runHandLandmarker);
        videoWebcam.addEventListener('loadeddata', startImageCaption);
        videoWebcam.addEventListener('loadeddata', setCorrectSize);
      })
      .catch((err) => {
        console.error(err);
        /* handle the error */
      });
}

// or load video
async function loadVideo() {
  console.log('Loading video...');

  // Makes sure models are loaded.
  await loadModels();
  console.log('Visual Models loaded.');
  visualModelsLoaded = true;

  // Checks if video URL is provided.
  const videoUrl =
      'videos/' + document.getElementById('video-url').value + '.mp4';

  if (!videoUrl) {
    console.warn('No video URL provided.');
    return;
  }

  // Hides the webcam video element and show the loaded video element.
  videoWebcam.style.display = 'none';
  videoLoaded.style.display = 'block';

  // Creates a blob URL if the provided URL is a local file.
  if (videoUrl.startsWith('blob:') || videoUrl.startsWith('http') ||
      videoUrl.startsWith('https')) {
    videoLoaded.src = videoUrl;
  } else {
    fetch(videoUrl)
        .then(response => response.blob())
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob);
          videoLoaded.src = blobUrl;
        })
        .catch(error => console.error('Error fetching video file:', error));
  }

  // Adds event listeners to process the loaded video.
  videoLoaded.addEventListener('loadeddata', () => {
    videoLoaded.play();
    runObjectDetection();
    runHandLandmarker();
    startImageCaption();
    setCorrectSize();
  });
}


// Checks if the browser supports getUserMedia.
if (hasGetUserMedia()) {
  // Clicks the start button to start the camera.
  startWebcamButton.addEventListener('click', startCam);
  loadVideoButton.addEventListener('click', loadVideo);
} else {
  console.warn('getUserMedia() is not supported by your browser');
}


//////////////////////////////
// CORRECT STYLE
//////////////////////////////
function setCorrectSize() {
  // Gets the loadedvideo or webcam video.
  let video = document.getElementById('webcam');
  if (video.style.display == 'none') {
    video = document.getElementById('loadedVideo');
  }

  // Sets liveView as the same size as the video.
  liveView.style.width = video.offsetWidth + 'px';
  liveView.style.height = video.offsetHeight + 'px';
  // Sets output_canvas as the same size as the video.
  const output_canvas = document.getElementById('output_canvas');
  output_canvas.width = video.offsetWidth;
  output_canvas.height = video.offsetHeight;
  // Sets the canvas context to the same size as the video.
  const ctx = output_canvas.getContext('2d');
  ctx.canvas.width = video.offsetWidth;
  ctx.canvas.height = video.offsetHeight;
  // Sets contextResults position to align the bottom of context with the bottom
  // of the video.
  const contextResults = document.getElementById('contextResults');
  contextResults.style.bottom = '0px';

  // Sets the position of the impairmentsResults.
  const impairmentsResults = document.getElementById('impairmentsResults');
  impairmentsResults.style.bottom = '0px';
  impairmentsResults.style.right = '0px';
}
// If window is resized, resize the liveView div and output_canvas.
window.addEventListener('resize', function() {
  setCorrectSize();
});


//////////////////////////////
// GUI
// https://github.com/dataarts/dat.gui/blob/master/API.md
//////////////////////////////
import {gui} from './scriptGUI.js';

// // Creating a GUI with options.
// var context = gui.addFolder('Context');
// context.open();
// var toggleActivityRecognition = context.add({Activity_Recognition: true},
// 'Activity_Recognition'); var toggleEnvironmentRecognition =
// context.add({Environment_Recognition: true}, 'Environment_Recognition');

// var logging = gui.addFolder('Logging');
// logging.open();
// var toggleLogging = logging.add({Logging: false}, 'Logging');

var direct = gui.addFolder('Direct - Visual');
direct.open();
var toggleObjectDetection =
    direct.add({Object_Detection: true}, 'Object_Detection');
var toggleHandLandmarker =
    direct.add({Hand_Landmarker: true}, 'Hand_Landmarker');
var toggleContextResults =
    direct.add({Context_Results: true}, 'Context_Results');

// click toggleContextResults to show/hide contextResults
toggleContextResults.onChange(function(value) {
  const contextResults = document.getElementById('contextResults');
  if (value) {
    contextResults.style.display = 'block';
  } else {
    contextResults.style.display = 'none';
  }
});



//////////////////////////////
// Helper Functions
//////////////////////////////
