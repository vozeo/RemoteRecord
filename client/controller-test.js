let screenVideo = document.getElementById('screen');
let cameraVideo = document.getElementById('camera');

if (!navigator.getDisplayMedia && !navigator.mediaDevices.getDisplayMedia) {
    let error = 'Your browser does NOT support the getDisplayMedia API.';
    document.getElementById('screen').style.display = 'none';
    document.getElementById('camera').style.display = 'none';
    document.getElementById('btn-start-recording').style.display = 'none';
    document.getElementById('btn-stop-recording').style.display = 'none';
    throw new Error(error);
}

function invokeGetDisplayMedia(success, error) {
    let displaymediastreamconstraints = {
        audio: true,
        video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 15 }
        }
    };
    if (navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices.getDisplayMedia(displaymediastreamconstraints).then(success).catch(error);
    }
    else {
        navigator.getDisplayMedia(displaymediastreamconstraints).then(success).catch(error);
    }
}

function captureScreen(callback) {
    invokeGetDisplayMedia(function (screen) {
        addStreamStopListener(screen, function () {
            document.getElementById('btn-stop-recording').click();
        });
        callback(screen);
    }, function (error) {
        console.error(error);
        alert('Unable to capture your screen. Please check console logs.\n' + error);
    });
}

function captureCamera(callback) {
    navigator.mediaDevices.getUserMedia({ audio: true, video: { frameRate: { ideal: 15 } } }).then(function (camera) {
        callback(camera);
    }).catch(function (error) {
        alert('Unable to capture your camera. Please check console logs.');
        console.error(error);
    });
}

function stopScreenRecordingCallback() {
    screenVideo.src = screenVideo.srcObject = null;
    screenVideo.src = URL.createObjectURL(screenRecorder.getBlob());
    
    screenRecorder.screen.stop();
    screenRecorder.destroy();
    screenRecorder = null;
}

function stopCameraRecordingCallback() {
    cameraVideo.src = cameraVideo.srcObject = null;
    cameraVideo.src = URL.createObjectURL(cameraRecorder.getBlob());

    cameraRecorder.camera.stop();
    cameraRecorder.destroy();
    cameraRecorder = null;
}

let screenRecorder, cameraRecorder; // globally accessible

document.getElementById('btn-start-recording').onclick = function () {
    this.disabled = true;
    captureScreen(function (screen) {
        screenVideo.muted = true;
        screenVideo.volume = 0;
        screenVideo.srcObject = screen;
        screenRecorder = RecordRTC(screen, {
            type: 'video',
            mimeType: 'video/webm\;codecs=h264'
        });
        screenRecorder.startRecording();
        // release screen on stopRecording
        screenRecorder.screen = screen;

    });
    captureCamera(function (camera) {
        cameraVideo.muted = true;
        cameraVideo.volume = 0;
        cameraVideo.srcObject = camera;
        cameraRecorder = RecordRTC(camera, {
            type: 'video',
            mimeType: 'video/webm\;codecs=h264'
        });
        cameraRecorder.startRecording();
        // release camera on stopRecording
        cameraRecorder.camera = camera;
    });
    document.getElementById('btn-stop-recording').disabled = false;
};

document.getElementById('btn-stop-recording').onclick = function () {
    this.disabled = true;
    screenRecorder.stopRecording(stopScreenRecordingCallback);
    cameraRecorder.stopRecording(stopCameraRecordingCallback);
    document.getElementById('btn-start-recording').disabled = false;
};

function addStreamStopListener(stream, callback) {
    stream.addEventListener('ended', function () {
        callback();
        callback = function () { };
    }, false);
    stream.addEventListener('inactive', function () {
        callback();
        callback = function () { };
    }, false);
    stream.getTracks().forEach(function (track) {
        track.addEventListener('ended', function () {
            callback();
            callback = function () { };
        }, false);
        track.addEventListener('inactive', function () {
            callback();
            callback = function () { };
        }, false);
    });
}