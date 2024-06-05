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

const videoElement = document.getElementById('webcam');
const cameraSelect = document.getElementById('cameraSelect');

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        return videoDevices;
    } catch (error) {
        console.error('Error getting devices:', error);
    }
}

async function populateCameraDropdown() {
    const cameras = await getCameras();
    cameras.forEach(camera => {
        const option = document.createElement('option');
        option.value = camera.deviceId;
        option.textContent = camera.label || `Camera ${camera.deviceId}`;
        cameraSelect.appendChild(option);
    });
}

async function startVideoStream(deviceId) {
    try {
        const constraints = {
            video: {
                deviceId: deviceId ? { exact: deviceId } : undefined
            }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = stream;
    } catch (error) {
        console.error('Error starting video stream:', error);
    }
}

cameraSelect.addEventListener('change', () => {
    const selectedDeviceId = cameraSelect.value;
    startVideoStream(selectedDeviceId);
});

populateCameraDropdown().then(() => {
    startVideoStream(cameraSelect.value);
});