var video = document.querySelector('video');

if (!navigator.getDisplayMedia && !navigator.mediaDevices.getDisplayMedia) {
    var error = 'Your browser does NOT support the getDisplayMedia API.';
    document.querySelector('h1').innerHTML = error;

    document.querySelector('video').style.display = 'none';
    document.getElementById('btn-start-recording').style.display = 'none';
    document.getElementById('btn-stop-recording').style.display = 'none';
    throw new Error(error);
}

function invokeGetDisplayMedia(success, error) {
    var displaymediastreamconstraints = {
        video: {
            displaySurface: 'monitor', // monitor, window, application, browser
            logicalSurface: true,
            cursor: 'always', // never, always, motion
            frameRate: { max: 12 }
        }
    };

    // above constraints are NOT supported YET
    // that's why overriding them
    displaymediastreamconstraints = {
        video: true
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
    navigator.mediaDevices.getUserMedia({ frameRate: { max: 12 }, audio: true, video: true }).then(function (camera) {
        callback(camera);
    }).catch(function (error) {
        alert('Unable to capture your camera. Please check console logs.');
        console.error(error);
    });
}

let screenCnt = 0;
function uploadScreenVideo(blob) {
        screenCnt += 1;
        let screenFileName = 'screen-' + screenCnt + '.webm';
        let screenFileObject = new File([blob], screenFileName, {
            type: 'video/webm\;codecs=h264'
        });
        let formData = new FormData()
        formData.append("username", "vozeo");
        formData.append("filename", screenFileName);
        formData.append("file", screenFileObject);
        $.ajax({
            type: "POST",
            url: "profile",
            data: formData,
            processData: false,
            contentType: false,
        });
}

let cameraCnt = 0;
function uploadCameraVideo(blob) {
        cameraCnt += 1;
        let cameraFileName = 'camera-' + cameraCnt + '.webm';
        let cameraFileObject = new File([blob], cameraFileName, {
            type: 'video/webm\;codecs=h264'
        });
        let formData = new FormData()
        formData.append("username", "vozeo");
        formData.append("filename", cameraFileName);
        formData.append("file", cameraFileObject);
        $.ajax({
            type: "POST",
            url: "profile",
            data: formData,
            processData: false,
            contentType: false,
        });
}

function stopCameraRecordingCallback() {
    video.src = video.srcObject = null;
    video.src = URL.createObjectURL(screenRecorder.getBlob());

    screenRecorder.screen.stop();
    screenRecorder.destroy();
    screenRecorder = null;
}

function stopRecordingCallback() {
    video.src = video.srcObject = null;
    video.muted = false;
    video.volume = 1;
    video.src = URL.createObjectURL(cameraRecorder.getBlob());

    cameraRecorder.camera.stop();
    cameraRecorder.destroy();
    cameraRecorder = null;
}

let screenRecorder, cameraRecorder; // globally accessible
let recorderTimerID; // globally accessible

document.getElementById('btn-start-recording').onclick = function () {
    this.disabled = true;
    captureScreen(function (screen) {
        video.srcObject = screen;
        screenRecorder = RecordRTC(screen, {
            type: 'video',
            mimeType: 'video/webm\;codecs=h264',
            timeSlice: 1000,
            ondataavailable: function (blob) {
                uploadScreenVideo(blob);
            }
        });
        screenRecorder.startRecording();
        // release screen on stopRecording
        screenRecorder.screen = screen;

    });
    captureCamera(function (camera) {
        video.muted = true;
        video.volume = 0;
        video.srcObject = camera;
        cameraRecorder = RecordRTC(camera, {
            type: 'video',
            mimeType: 'video/webm\;codecs=h264',
            timeSlice: 1000,
            ondataavailable: function (blob) {
                uploadCameraVideo(blob);
            }
        });
        cameraRecorder.startRecording();
        // release camera on stopRecording
        cameraRecorder.camera = camera;
    });
    document.getElementById('btn-stop-recording').disabled = false;
};

document.getElementById('btn-stop-recording').onclick = function () {
    this.disabled = true;
    screenRecorder.stopRecording(stopCameraRecordingCallback);
    cameraRecorder.stopRecording(stopRecordingCallback);
    window.clearInterval(recorderTimerID);
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