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

// import the instance in another js file
import {prompts} from './prompts.js';
import {audioInfo} from './scriptAudio.js';
import {visualInfo} from './scriptVisual.js';
import {callGPT, callGPTLite} from './util.js';


let START_INTERVAL = 5000;
let INTERVAL = 100;

// a list to store logs
let logs = [];

// press command + shift + F to make it full screen with no distractions
document.addEventListener('keydown', function(event) {
  if (event.metaKey && event.shiftKey && event.code === 'KeyF') {
    document.documentElement.requestFullscreen();
  }
});

// exit full screen
document.addEventListener('keydown', function(event) {
  if (event.code === 'Escape') {
    document.exitFullscreen();
  }
});

// press space to pause and play
document.addEventListener('keydown', function(event) {
  if (event.code === 'Space') {
    let loadedVideo = document.getElementById('loadedVideo');
    if (loadedVideo.paused) {
      loadedVideo.play();
    } else {
      loadedVideo.pause();
    }
  }
});


//////////////////////////////
// Helper Functions
//////////////////////////////
// example in: "laptop computer 98%"
// example out: ["laptop computer", 0.98]
function splitObjectPercentage(result) {
  let split = result.split(' ');
  let percentage = parseFloat(split[split.length - 1].replace('%', '')) / 100;
  split.pop();
  let object = split.join(' ');
  return [object, percentage];
}


let isProcessing = false;

// create a new class cachedInfo
class CachedInfo {
  constructor() {
    this.VIDEO_ID = '';
    this.OBJECTS = [];
    this.HAND_DETECTED = false;
    this.HOLDING = '';
    this.CAPTION = '';
    this.HAND_CAPTION = '';
    this.VOLUME = 0;
    this.AUDIO_CLASSIFICATION = [];
    this.ACTIVITY = '';
    this.ENVIRONMENT = '';
    this.START_TIME = Date.now();
    this.DELAY = 0;
    this.VIDEO_TIME = -1;
  }
}

// create a new instance of the class
const cachedInfo = new CachedInfo();

async function runEverything() {
  // console.log(visualInfo)
  if (visualInfo.IMAGE_CAPTION == '') {
    return;
  }

  // if processing, return
  if (isProcessing) {
    return;
  }

  // start processing
  isProcessing = true;

  // UPDATE CACHED INFO
  cachedInfo.OBJECTS = visualInfo.ALL_DETECTED_OBJECTS;
  cachedInfo.HAND_DETECTED = visualInfo.LAST_HAND_DETECTED;
  cachedInfo.HOLDING = visualInfo.HOLDING_OBJECT;
  cachedInfo.CAPTION = visualInfo.IMAGE_CAPTION;
  cachedInfo.HAND_CAPTION = visualInfo.HAND_CAPTION;
  cachedInfo.VOLUME = audioInfo.VOLUME;
  cachedInfo.AUDIO_CLASSIFICATION = audioInfo.AUDIO_CLASSIFICATION;
  cachedInfo.START_TIME = Date.now();

  let videoWebcam = document.getElementById('webcam');
  let videoLoaded = document.getElementById('loadedVideo');

  if (videoWebcam.style.display == 'block') {
    cachedInfo.VIDEO_ID = 'webcam';
    cachedInfo.VIDEO_TIME = cachedInfo.START_TIME;
  } else if (videoLoaded.style.display == 'block') {
    cachedInfo.VIDEO_ID = document.getElementById('video-url').value;
    cachedInfo.VIDEO_TIME = videoLoaded.currentTime;
  }


  // ACTIVITY Prediction based on detected objects, holding object, and image
  // caption
  let promptActivity = prompts.ACTIVITY_PROMPT_PREFIX +
      visualInfo.IMAGE_CAPTION + prompts.ACTIVITY_PROMPT_SUFFIX;
  // console.log("promptActivity", promptActivity)
  let activityResult = await callGPT(promptActivity);
  // let activityResultDiv = document.getElementById("activityResult");
  // activityResultDiv.innerText = activityResult;

  // ENVIRONMENT Prediction based on detected objects, holding object, and image
  // caption
  let promptEnvironment = prompts.ENVIRONMENT_PROMPT_PREFIX +
      visualInfo.IMAGE_CAPTION + prompts.ENVIRONMENT_PROMPT_SUFFIX;
  // console.log("promptEnvironment", promptEnvironment)
  let environmentResult = await callGPT(promptEnvironment);
  // let environmentResultDiv = document.getElementById("environmentResult");
  // environmentResultDiv.innerText = environmentResult;

  cachedInfo.ACTIVITY = activityResult;
  cachedInfo.ENVIRONMENT = environmentResult;

  ////////////////////////////////////////
  // SITUATIONAL IMPAIRMENT PREDECTION
  ////////////////////////////////////////
  // first, check if hand is detected
  let hand_detected = false;
  let lastHandDetecedTime = visualInfo.LAST_HAND_DETECTED;
  // if hand is detected in the last 2 seconds, set hand_detected to true
  if (Date.now() - lastHandDetecedTime < 2000) {
    hand_detected = true;
    cachedInfo.HAND_DETECTED = true;
  }


  // combine into a prompt
  let promptSituation = prompts.SITUATION_PROMPT_PREFIX + `
Q: ${activityResult} ${environmentResult}`;
  if (hand_detected) {
    promptSituation += ' C’s hand is ' + visualInfo.HAND_CAPTION;
  }
  promptSituation += ' The environmental volume level is around' +
      audioInfo.VOLUME + ' decibels. ';
  promptSituation +=
      prompts.SITUATION_PROMPT_SUFFIX;  // comment out if using
                                        // SITUATION_PROMPT_PREFIX_SHORT

  // console.log("=====================================");
  // console.log("promptSituation", promptSituation);
  // console.log("=====================================");

  // third, call GPT to get the result
  let situationResult = await callGPT(promptSituation);
  // console.log("=====================================");
  // console.log("situationResult", situationResult);
  // console.log("=====================================");

  // fourth, display the result
  let eyeStatus = situationResult.split('Eye: ')[1].split(';')[0];
  let hearingStatus = situationResult.split('Hearing: ')[1].split(';')[0];
  let vocalStatus = situationResult.split('Vocal: ')[1].split(';')[0];
  let handStatus = situationResult.split('Hand: ')[1].split(';')[0];

  let eyeStatusDiv = document.getElementById('eyeStatus');
  eyeStatusDiv.innerText = eyeStatus;
  let hearingStatusDiv = document.getElementById('hearingStatus');
  hearingStatusDiv.innerText = hearingStatus;
  let vocalStatusDiv = document.getElementById('vocalStatus');
  vocalStatusDiv.innerText = vocalStatus;
  let handStatusDiv = document.getElementById('handStatus');
  handStatusDiv.innerText = handStatus;

  // for all statusDive, color based on status, Available -> green, Affected ->
  // orange, Not Available -> red
  let statusDivs =
      [eyeStatusDiv, hearingStatusDiv, vocalStatusDiv, handStatusDiv];
  for (let i = 0; i < statusDivs.length; i++) {
    let statusDiv = statusDivs[i];
    let status = statusDiv.innerText;
    if (status == 'Available') {
      statusDiv.style.color = 'green';
    } else if (status == 'Slightly Affected') {
      statusDiv.style.color = 'orange';
    } else if (status == 'Affected') {
      statusDiv.style.color = 'orangered';
    } else if (status == 'Not Available') {
      statusDiv.style.color = 'darkred';
    }
  }

  // compute delay
  let delay = Date.now() - cachedInfo.START_TIME;
  // convert to seconds
  delay = delay / 1000;
  // round to 2 decimal places
  delay = Math.round(delay * 100) / 100;
  cachedInfo.DELAY = delay;

  // update
  let holdingObject = document.getElementById('holdingObject');
  holdingObject.innerText = cachedInfo.HOLDING;
  let captionResult = document.getElementById('captionResult');
  captionResult.innerText = cachedInfo.CAPTION;
  let captionHandResult = document.getElementById('captionHandResult');
  if (cachedInfo.HAND_DETECTED) {
    captionHandResult.innerText = cachedInfo.HAND_CAPTION;
  } else {
    captionHandResult.innerText = 'No hand detected';
  }
  let activityResultDiv = document.getElementById('activityResult');
  activityResultDiv.innerText = cachedInfo.ACTIVITY;
  let environmentResultDiv = document.getElementById('environmentResult');
  environmentResultDiv.innerText = cachedInfo.ENVIRONMENT;


  // log to console
  console.log('======START=======');
  console.log('cachedInfo', cachedInfo);
  console.log('eyeStatus', eyeStatus);
  console.log('hearingStatus', hearingStatus);
  console.log('vocalStatus', vocalStatus);
  console.log('handStatus', handStatus);
  console.log('======END=========');

  let log = {
    'timestamp': Date.now(),
    'video_id': cachedInfo.VIDEO_ID,
    // "objects": (cachedInfo.OBJECTS).toString(),
    // "hand_detected": cachedInfo.HAND_DETECTED,
    'holding': cachedInfo.HOLDING,
    'caption': cachedInfo.CAPTION,
    'hand_caption': cachedInfo.HAND_CAPTION,
    'volume': cachedInfo.VOLUME,
    // "audio_classification": (cachedInfo.AUDIO_CLASSIFICATION).toString(),
    'activity': cachedInfo.ACTIVITY,
    'environment': cachedInfo.ENVIRONMENT,
    'start_time': cachedInfo.START_TIME,
    'delay': cachedInfo.DELAY,
    'video_time': cachedInfo.VIDEO_TIME,
    'eye_status': eyeStatus,
    'hearing_status': hearingStatus,
    'vocal_status': vocalStatus,
    'hand_status': handStatus,
  }  // add log to list
            logs.push(log);

  // set isProcessing to false
  isProcessing = false;
}

// click button to save logs as csv file
document.getElementById('saveLogs').addEventListener('click', function() {
  // create a CSV string from the logs array
  let csv = 'data:text/csv;charset=utf-8,';
  csv +=
      'timestamp,video_id,objects,hand_detected,holding,caption,hand_caption,volume,audio_classification,activity,environment,start_time,delay,video_time,eye_status,hearing_status,vocal_status,hand_status\n';
  for (let i = 0; i < logs.length; i++) {
    csv += logs[i].timestamp + ',' + logs[i].video_id + ',' + logs[i].objects +
        ',' + logs[i].hand_detected + ',' + logs[i].holding + ',' +
        logs[i].caption + ',' + logs[i].hand_caption + ',' + logs[i].volume +
        ',' + logs[i].audio_classification + ',' + logs[i].activity + ',' +
        logs[i].environment + ',' + logs[i].start_time + ',' + logs[i].delay +
        ',' + logs[i].video_time + ',' + logs[i].eye_status + ',' +
        logs[i].hearing_status + ',' + logs[i].vocal_status + ',' +
        logs[i].hand_status + '\n';
  }

  // create a temporary link element and download the CSV file
  let link = document.createElement('a');
  link.setAttribute('href', encodeURI(csv));
  link.setAttribute('download', logs[0].video_id + '.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});



// run runEverything() for the first time after X second, then every INTERVAL
// second
setTimeout(runEverything, START_INTERVAL);

let intervalId;
function runEverythingInterval(interval) {
  console.log('runEverythingInterval Started', interval)
  intervalId = setInterval(runEverything, interval);
}
runEverythingInterval(INTERVAL);



//////////////////////////////
// GUI
// https://github.com/dataarts/dat.gui/blob/master/API.md
//////////////////////////////
import {gui} from './scriptGUI.js';
var control = gui.addFolder('Control');
control.open();
// create slideer for the interval
var interval = control.add({Interval: 5}, 'Interval', 0, 10);
// black canvas to cover everything
var blackCanvas = control.add({BlackCanvas: false}, 'BlackCanvas');

// add listener to slider, only when the user stops sliding
interval.onFinishChange(function(value) {
  console.log('Interval is ' + value);
  // stop the previous interval
  clearInterval(intervalId);
  // start a new interval (convert to int)
  runEverythingInterval(parseInt(value * 1000));
});


// add listener to blackCanvas
blackCanvas.onChange(function(value) {
  console.log('BlackCanvas is ' + value);
  let blackCanvasDiv = document.getElementById('blackCanvas');
  if (value) {
    blackCanvasDiv.style.display = 'block';
  } else {
    blackCanvasDiv.style.display = 'none';
  }
});

// close the dat.gui
gui.close();
