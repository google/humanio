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

// Loads MediaPipe models.
import {AudioClassifier, FilesetResolver} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio';

let isPlaying = false;
let audioClassifier;
let audioCtx;
async function createAudioClassifier() {
  const audio = await FilesetResolver.forAudioTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio@latest/wasm');
  audioClassifier = await AudioClassifier.createFromOptions(audio, {
    baseOptions: {
      modelAssetPath:
          'https://tfhub.dev/google/lite-model/yamnet/classification/tflite/1?lite-format=tflite'
    }
  });
}

// GLOBAL VARIABLES
// Creates a class of global variables for another js file to use.
class AudioInfo {
  constructor() {
    this.VOLUME = 0;
    this.AUDIO_CLASSIFICATION = [];
  }
}

// Creates a new instance of the class.
const audioInfo = new AudioInfo();

// Exports the instance.
export {audioInfo};


// Checks if is webcam or loaded video.
let videoWebcam = document.getElementById('webcam');
let videoLoaded = document.getElementById('loadedVideo');

console.log('videoWebcam', videoWebcam)
console.log('videoLoaded', videoLoaded)

if (videoWebcam.style.display == 'block') {
  // webcam is on
  runStreamingVolumeMeter();
  runStreamingAudioClassification();
}
else if (videoLoaded.style.display == 'block') {
  runVideoVolumeMeter();
  // runVideoAudioClassification();
}
else {
  console.log('Audio Error: No video source selected');
}


////////////////////////////////
// Task 1: AUDIO CLASSIFICATION
////////////////////////////////

async function runStreamingAudioClassification() {
  await createAudioClassifier();

  const output = document.getElementById('audioClassificationResult');
  const constraints = {audio: true};
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    console.log('The following error occured: ' + err);
    alert('getUserMedia not supported on your browser');
  }
  if (!audioCtx) {
    audioCtx = new AudioContext({sampleRate: 16000});
  } else if (audioCtx.state === 'running') {
    await audioCtx.suspend();
    return;
  }

  // resumes AudioContext if has been suspended
  await audioCtx.resume();
  const source = audioCtx.createMediaStreamSource(stream);
  const scriptNode = audioCtx.createScriptProcessor(16384, 1, 1);
  scriptNode.onaudioprocess = function(audioProcessingEvent) {
    const inputBuffer = audioProcessingEvent.inputBuffer;
    let inputData = inputBuffer.getChannelData(0);
    // Classify the audio
    const result = audioClassifier.classify(inputData);
    const categories = result[0].classifications[0].categories;

    audioInfo.AUDIO_CLASSIFICATION = [];
    for (let i = 0; i < 3; i++) {
      // audioInfo.AUDIO_CLASSIFICATION.push(categories[i].categoryName + " " +
      // (categories[i].score*100).toFixed(3).toString() + "%");
      audioInfo.AUDIO_CLASSIFICATION.push(categories[i].categoryName);
    }

    // Display results
    output.innerText = categories[0].categoryName + ' (' +
        categories[0].score.toFixed(3) + ')\n' + categories[1].categoryName +
        ' (' + categories[1].score.toFixed(3) + ')\n' +
        categories[2].categoryName + ' (' + categories[2].score.toFixed(3) +
        ')';
  };
  source.connect(scriptNode);
  scriptNode.connect(audioCtx.destination);
}


async function runVideoAudioClassification() {
  await createAudioClassifier();

  const output = document.getElementById('audioClassificationResult');
  const constraints = {audio: true};
  let stream;
  let source;

  // Create an audio context
  if (!audioCtx) {
    audioCtx = new AudioContext({sampleRate: 16000});
  } else if (audioCtx.state === 'running') {
    await audioCtx.suspend();
    return;
  }

  const loadedVideo = document.getElementById('loadedVideo');
  if (loadedVideo) {
    // Check if the srcObject property is not null before calling
    // getAudioTracks()
    if (loadedVideo.srcObject !== null) {
      loadedVideo.srcObject.getAudioTracks()[0].stop();
    }
    source = audioCtx.createMediaElementSource(loadedVideo);
  } else {
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      console.log('The following error occurred: ' + err);
      alert('getUserMedia not supported on your browser');
    }
    source = audioCtx.createMediaStreamSource(stream);
  }

  // Create a GainNode to control the output volume
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 1;  // Set gain to 1 for normal volume

  // resumes AudioContext if has been suspended
  await audioCtx.resume();
  await loadedVideo.play();  // Play the video and its audio track
  const scriptNode = audioCtx.createScriptProcessor(16384, 1, 1);
  scriptNode.onaudioprocess = function(audioProcessingEvent) {
    const inputBuffer = audioProcessingEvent.inputBuffer;
    let inputData = inputBuffer.getChannelData(0);
    // Classify the audio
    const result = audioClassifier.classify(inputData);
    const categories = result[0].classifications[0].categories;

    audioInfo.AUDIO_CLASSIFICATION = [];
    for (let i = 0; i < 3; i++) {
      // audioInfo.AUDIO_CLASSIFICATION.push(categories[i].categoryName + " " +
      // (categories[i].score*100).toFixed(3).toString() + "%");
      audioInfo.AUDIO_CLASSIFICATION.push(categories[i].categoryName);
    }

    // Display results
    output.innerText = categories[0].categoryName + ' (' +
        categories[0].score.toFixed(3) + ')\n' + categories[1].categoryName +
        ' (' + categories[1].score.toFixed(3) + ')\n' +
        categories[2].categoryName + ' (' + categories[2].score.toFixed(3) +
        ')';
  };
  source.connect(scriptNode);
  source.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  scriptNode.connect(audioCtx.destination);
}



//////////////////////////////
// TASK 2: VOLUME METER
//////////////////////////////
// a list to keep the last 10 volumes
let volumes = [];

async function runStreamingVolumeMeter() {
  // create an AudioContext instance
  let audioContext = new AudioContext();

  // get access to the user's microphone
  navigator.mediaDevices.getUserMedia({audio: true})
      .then(function(stream) {
        // create a MediaStreamAudioSourceNode from the microphone stream
        let microphone = audioContext.createMediaStreamSource(stream);

        // create a ScriptProcessorNode for direct script processing of audio
        // data
        let scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

        // connect the microphone to the script processor
        microphone.connect(scriptProcessor);

        // connect the script processor to the AudioContext destination (e.g.
        // speakers)
        scriptProcessor.connect(audioContext.destination);

        // set up an event listener for the script processor's onaudioprocess
        // event
        scriptProcessor.onaudioprocess = function(e) {
          // calculate the volume of the incoming audio
          let volume = 0;
          let buffer = e.inputBuffer.getChannelData(0);
          for (let i = 0; i < buffer.length; i++) {
            volume += Math.abs(buffer[i]);
          }
          volume /= buffer.length;
          volumes.push(volume);

          // keep only the last 20 volumes
          if (volumes.length > 20) {
            volumes.splice(0, 1);
          }

          let avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

          // convert to decibels
          avgVolume = 20 * Math.log10(avgVolume) + 80;


          audioInfo.VOLUME = avgVolume;

          // display the volume on the screen
          const volumeResult = document.getElementById('volumeResult');
          volumeResult.innerText = 'Volume: ' + avgVolume.toFixed(3);

          // change the color of the volume meter if the volume is above a
          // threshold Normal speech is around 0.05
          if (avgVolume > 110) {
            volumeResult.style.color = 'red';
          } else if (avgVolume > 80) {
            volumeResult.style.color = 'orange';
          } else if (avgVolume > 60) {
            volumeResult.style.color = 'yellow';
          } else {
            volumeResult.style.color = 'white';
          }
        };
      })
      .catch(function(err) {
        console.log('Error: ' + err);
      });
}


function runVideoVolumeMeter() {
  // get the video element
  let videoPlayer = document.getElementById('loadedVideo');

  // Create an audio context
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Create a media element source
  const source = audioContext.createMediaElementSource(videoPlayer);

  // Create an analyser node
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;

  // Connect the source to the analyser and to the audio context's destination
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  let volumes = [];

  // Function to get and log the normalized volume level (0-1)
  const getNormalizedVolumeLevel = () => {
    // if video not playing, return 0
    if (videoPlayer.paused || videoPlayer.ended) {
      return 0;
    }

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const average = sum / bufferLength;
    const normalizedVolume = (average / 255).toFixed(5);
    // console.log('--- Volume', normalizedVolume);

    volumes.push(normalizedVolume);
    if (volumes.length > 20) {
      volumes.shift();
    }
    let avgVolume = volumes.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) /
        volumes.length;


    // convert to decibels
    avgVolume = 20 * Math.log10(avgVolume) + 80;

    audioInfo.VOLUME = avgVolume;

    // display the volume on the screen
    const volumeResult = document.getElementById('volumeResult');
    volumeResult.innerText = 'Volume: ' + avgVolume.toFixed(3);

    // change the color of the volume meter if the volume is above a threshold
    // Normal speech is around 0.05
    if (avgVolume > 110) {
      volumeResult.style.color = 'red';
    } else if (avgVolume > 80) {
      volumeResult.style.color = 'orange';
    } else if (avgVolume > 60) {
      volumeResult.style.color = 'yellow';
    } else {
      volumeResult.style.color = 'white';
    }
  };

  // Set an interval to call the getNormalizedVolumeLevel function every 100ms
  setInterval(getNormalizedVolumeLevel, 100);
}



//////////////////////////////
// GUI
// https://github.com/dataarts/dat.gui/blob/master/API.md
//////////////////////////////
import {gui} from './scriptGUI.js';

// Creating a GUI with options.
var direct = gui.addFolder('Direct - Audio');
direct.open();
var toggleSoundLevel = direct.add({Sound_Level: true}, 'Sound_Level');
var toggleAudioClassification =
    direct.add({Audio_Classification: true}, 'Audio_Classification');

// add listener to toggle
toggleAudioClassification.onChange(function(value) {
  let audioClassificationResult =
      document.getElementById('audioClassificationResult');
  if (value) {
    console.log('Audio Classification is ON');
    audioClassificationResult.style.display = 'block';
  } else {
    console.log('Audio Classification is OFF');
    audioClassificationResult.style.display = 'none';
  }
});

// add listener to toggle
toggleSoundLevel.onChange(function(value) {
  let volumeResult = document.getElementById('volumeResult');
  if (value) {
    console.log('Sound Level is ON');
    volumeResult.style.display = 'block';
  } else {
    console.log('Sound Level is OFF');
    volumeResult.style.display = 'none';
  }
});
