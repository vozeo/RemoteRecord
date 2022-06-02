if (!navigator.getDisplayMedia && !navigator.mediaDevices.getDisplayMedia) {
    var error = 'Your browser does NOT support the getDisplayMedia API.';
    document.getElementById('btn-screen-start-recording').style.display = 'none';
    document.getElementById('btn-camera-start-recording').style.display = 'none';
    document.getElementById('btn-screen-stop-recording').style.display = 'none';
    document.getElementById('btn-camera-stop-recording').style.display = 'none';
    throw new Error(error);
}

const screenAudio = document.getElementById("screenCheck");
const cameraAudio = document.getElementById("cameraCheck");

let screenWidth, screenHeight, screenRate;

function invokeGetDisplayMedia(success, error) {
    let displaymediastreamconstraints = {
        audio: screenAudio.checked,
        video: {
            width: { ideal: screenWidth },
            height: { ideal: screenHeight },
            frameRate: { ideal: screenRate }
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
            document.getElementById('btn-screen-stop-recording').click();
        });
        callback(screen);
    }, function (error) {
        console.error(error);
        alert('Unable to capture your screen. Please check console logs.\n' + error);
    });
}

function captureCamera(callback) {
    navigator.mediaDevices.getUserMedia({ audio: cameraAudio.checked, video: { frameRate: { ideal: screenRate } } }).then(function (camera) {
        callback(camera);
    }).catch(function (error) {
        alert('Unable to capture your camera. Please check console logs.');
        console.error(error);
    });
}

let screenCnt = 0;
function uploadScreenVideo(blob) {
    screenCnt += 1;
    let screenFileType = 'screen';
    let screenFileObject = new File([blob], screenFileType, {
        type: 'video/webm\;codecs=h264'
    });
    let formData = new FormData();
    formData.append("filetime", Date.now());
    formData.append("filetype", screenFileType);
    formData.append("file", screenFileObject);
    $.ajax({
        type: "POST",
        url: "uploadFile",
        data: formData,
        processData: false,
        contentType: false,
    });
}

let cameraCnt = 0;
function uploadCameraVideo(blob) {
    cameraCnt += 1;
    let cameraFileType = 'camera';
    let cameraFileObject = new File([blob], cameraFileType, {
        type: 'video/webm\;codecs=h264'
    });
    let formData = new FormData();
    formData.append("filetime", Date.now());
    formData.append("filetype", cameraFileType);
    formData.append("file", cameraFileObject);
    $.ajax({
        type: "POST",
        url: "uploadFile",
        data: formData,
        processData: false,
        contentType: false,
    });
}

let screenRecorder, cameraRecorder; // globally accessible

function stopScreenRecordingCallback() {
    uploadScreenVideo(screenRecorder.getBlob());
    screenRecorder.destroy();
    screenRecorder = null;
}

function stopCameraRecordingCallback() {
    uploadCameraVideo(cameraRecorder.getBlob());
    cameraRecorder.destroy();
    cameraRecorder = null;
}

let screenIntervalID, cameraIntervalID;

document.getElementById('btn-screen-start-recording').onclick = function () {
    this.disabled = true;
    captureScreen(function (screen) {
        screenRecorder = RecordRTC(screen, {
            type: 'video',
            mimeType: 'video/webm\;codecs=h264'
        });
        screenRecorder.startRecording();
        screenIntervalID = setInterval(() => {
            screenRecorder.stopRecording();
            uploadScreenVideo(screenRecorder.getBlob());
            screenRecorder.startRecording();
        }, 3000);
    });
    document.getElementById('btn-screen-stop-recording').disabled = false;
};

document.getElementById('btn-camera-start-recording').onclick = function () {
    this.disabled = true;
    captureCamera(function (camera) {
        cameraRecorder = RecordRTC(camera, {
            type: 'video',
            mimeType: 'video/webm\;codecs=h264'
        });
        cameraRecorder.startRecording();
        cameraIntervalID = setInterval(() => {
            cameraRecorder.stopRecording();
            uploadCameraVideo(cameraRecorder.getBlob());
            cameraRecorder.startRecording();
        }, 3000);
    });
    document.getElementById('btn-camera-stop-recording').disabled = false;
};

document.getElementById('btn-screen-stop-recording').onclick = function () {
    this.disabled = true;
    clearInterval(screenIntervalID);
    screenRecorder.stopRecording(stopScreenRecordingCallback);
    document.getElementById('btn-screen-start-recording').disabled = false;
};
 
document.getElementById('btn-camera-stop-recording').onclick = function () {
    this.disabled = true;
    clearInterval(cameraIntervalID);
    cameraRecorder.stopRecording(stopCameraRecordingCallback);
    document.getElementById('btn-camera-start-recording').disabled = false;
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

screenWidth = 1920, screenHeight = 1080, screenRate = 15;