if (!navigator.getDisplayMedia && !navigator.mediaDevices.getDisplayMedia) {
    var error = '您的浏览器不支持录屏，请更换浏览器重试。';
    document.getElementById('btn-screen-recording').style.display = 'none';
    document.getElementById('btn-camera-recording').style.display = 'none';
    throw new Error(error);
}

// const screenAudio = document.getElementById("screenCheck");
// const cameraAudio = document.getElementById("cameraCheck");
let socket, cameraPeer, screenPeer;
let sessionUser;
let screenWidth = 1920, screenHeight = 1080, screenRate = 15, sliceTime = 3000, recordChannel = 1;
// 0: online, 1: screen, 2: camera

axios.get('/selfinformation').then((res) => {
    sessionUser = res.data[0];
    screenWidth = res.data[1], screenHeight = res.data[2], screenRate = res.data[3], sliceTime = res.data[4], recordChannel = res.data[5];
    Notification.requestPermission();
    socket = io("https://" + document.domain + ":7080", { rejectUnauthorized: false });
    socket.on("connect", () => {
        console.log(socket.id);
        socket.emit('message', [sessionUser.stu_no, 0, true], () => {
            document.getElementById('online-state-btn').innerText = '已连接';
        });
    });
    socket.on("disconnect", () => {
        document.getElementById('online-state-btn').innerText = '未连接';
    });
    socket.on("instr", (arg) => {
        if (((recordChannel & 1) !== 0) && ((screenState === 0 && arg === 1) || (screenState === 1 && arg === 0))) {
            document.getElementById('btn-screen-recording').click();
        }
        if (((recordChannel & 2) !== 0) && ((cameraState === 0 && arg === 1) || (cameraState === 1 && arg === 0))) {
            document.getElementById('btn-camera-recording').click();
        }
    });
    if ((recordChannel & 1) != 0) {
        document.getElementById('screen-state').style = 'display:block;';
        document.getElementById('screen-container').style = 'display:block;';
        screenPeer = new Peer(sessionUser.stu_no + 'screen', {
            host: document.domain,
            port: "7080",
            path: "/webrtc",
            secure: true,
            config: {
                'iceServers': [
                    { url: 'turn:' + document.domain + ':7100', username: 'S9TvhA', credential: '5jc7PPiW' }
                ]
            }
        });
        screenPeer.on('connection', function (conn) {
            conn.on('open', function () {
                let tracks = screenStream.getTracks();
                screenPeer.call(conn.peer, new MediaStream(tracks));
            });
        });
    }
    if ((recordChannel & 2) != 0) {
        document.getElementById('camera-state').style = 'display:block;';
        document.getElementById('camera-container').style = 'display:block;';
        console.log(recordChannel & 2);
        cameraPeer = new Peer(sessionUser.stu_no + 'camera', {
            host: document.domain,
            port: "7080",
            path: "/webrtc",
            secure: true,
            config: {
                'iceServers': [
                    { url: 'turn:' + document.domain + ':7100', username: 'S9TvhA', credential: '5jc7PPiW' }
                ]
            }
        });
        cameraPeer.on('connection', function (conn) {
            conn.on('open', function () {
                let tracks = cameraStream.getTracks();
                cameraPeer.call(conn.peer, new MediaStream(tracks));
            });
        });
    }
});

function invokeGetDisplayMedia(success, error) {
    let displaymediastreamconstraints = {
        audio: true,
        video: {
            width: { ideal: screenWidth },
            height: { ideal: screenHeight },
            frameRate: { ideal: screenRate }
        }
    };
    if (navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices.getDisplayMedia(displaymediastreamconstraints).then(success).catch(error);
    } else {
        navigator.getDisplayMedia(displaymediastreamconstraints).then(success).catch(error);
    }
}

function captureScreen(callback) {
    invokeGetDisplayMedia(function (screen) {
        addStreamStopListener(screen, function () {
            if (screenState == 1) {
                document.getElementById('btn-screen-recording').click();
            }
        });
        callback(screen);
    }, function (error) {
        if (screenState == 1) {
            document.getElementById('btn-screen-recording').click();
        }
        alert('远程录屏未开始，请您重试。');
    });
}

function captureCamera(callback) {
    navigator.mediaDevices.getUserMedia({ audio: true, video: { frameRate: { ideal: screenRate } } }).then(function (camera) {
        callback(camera);
    }).catch(function (error) {
        if (cameraState == 1) {
            document.getElementById('btn-screen-recording').click();
        }
        alert('您拒绝了远程录制摄像头请求。');
    });
}

function uploadScreenVideo(e) {
    let screenFileType = 'screen';
    let screenFileObject = new File([e.data], screenFileType, {
        type: screenRecorder.mimeType
    });
    let formData = new FormData();
    formData.append("filetime", Date.now());
    formData.append("filetype", screenFileType);
    formData.append("filesize", screenFileObject.size);
    formData.append("file", screenFileObject);
    axios({
        method: "POST",
        url: "uploadFile",
        data: formData
    });
}

function uploadCameraVideo(e) {
    let cameraFileType = 'camera';
    let cameraFileObject = new File([e.data], cameraFileType, {
        type: cameraRecorder.mimeType
    });
    let formData = new FormData();
    formData.append("filetime", Date.now());
    formData.append("filetype", cameraFileType);
    formData.append("filesize", cameraFileObject.size);
    formData.append("file", cameraFileObject);
    axios({
        method: "POST",
        url: "uploadFile",
        data: formData
    });
}

let screenRecorder, cameraRecorder;
let screenStream, cameraStream;
let screenState = 0, cameraState = 0;

function sendNotification(title, content) {
    new Notification(title, {
        body: content,
        vibrate: [500, 500, 500],
        icon: './assets/videocamera.png'
    })
}

document.getElementById('btn-screen-recording').onclick = function () {
    if (screenState == 0) {
        screenState = 1;
        if (window.Notification.permission == "granted") {
            sendNotification('申请屏幕录制', '请前往录制窗口选择全屏和声音进行录制');
        }
        captureScreen(function (screen) {
            let tracks = screen.getTracks();
            let hasShared = false;
            tracks.forEach((track) => {
                hasShared = hasShared || track.label.startsWith('screen');
            });
            if (!hasShared) {
                alert('您未选择分享“整个屏幕”，请在录屏时选择分享“整个屏幕”并勾选“分享系统中的音频”！');
                tracks.forEach((track) => {
                    track.stop();
                });
                this.click();
                return false;
            }
            // } else if (tracks.length < 2) {
            //     alert('您选择了分享”整个屏幕“但未勾选“分享系统中的音频”，请在录屏时选择分享“整个屏幕”并勾选“分享系统中的音频”！');
            //     tracks.forEach((track) => {
            //         track.stop();
            //     });
            //     this.click();
            //     return false;
            // }
            screenStream = screen;
            screenRecorder = new MediaRecorder(screen, {
                mimeType: 'video/webm',
            });
            screenRecorder.ondataavailable = uploadScreenVideo;
            screenRecorder.start(sliceTime);
            screenRecorder.onstart = () => {
                socket.emit('message', [sessionUser.stu_no, 1, true], () => {
                    document.getElementById('screen-state-btn').innerText = '正在录制';
                    document.getElementById('btn-screen-recording').innerText = '结束屏幕录制';
                    document.getElementById('btn-screen-recording').className = "btn btn-danger btn-lg";
                });
            };
        });
    } else {
        screenState = 0;
        if (screenRecorder) {
            if (screenRecorder.state != 'inactive') {
                screenRecorder.stop();
                if (window.Notification.permission == "granted") {
                    sendNotification('结束屏幕录制', '屏幕录制已被结束');
                }
            }
            let tracks = screenStream.getTracks();
            tracks.forEach((track) => {
                track.stop();
            });
        }
        socket.emit('message', [sessionUser.stu_no, 1, false], () => {
            document.getElementById('screen-state-btn').innerText = '未录制';
            this.innerText = '开始屏幕录制';
            this.className = "btn btn-primary btn-lg";
        });
    }
};

document.getElementById('btn-camera-recording').onclick = function () {
    if (cameraState == 0) {
        cameraState = 1;
        if (window.Notification.permission == "granted") {
            sendNotification('申请摄像头录制', '请前往录制窗口允许录制权限，如之前已允许，则已经开始录制');
        }
        captureCamera(function (camera) {
            let tracks = camera.getTracks();
            tracks.forEach((track) => {
                console.log(track.label);
            });
            cameraStream = camera;
            cameraRecorder = new MediaRecorder(camera, {
                mimeType: 'video/webm'
            });
            cameraRecorder.ondataavailable = uploadCameraVideo;
            cameraRecorder.start(sliceTime);
            cameraRecorder.onstart = () => {
                socket.emit('message', [sessionUser.stu_no, 2, true], () => {
                    document.getElementById('camera-state-btn').innerText = '正在录制';
                    document.getElementById('btn-camera-recording').innerText = '结束摄像头录制';
                    document.getElementById('btn-camera-recording').className = "btn btn-danger btn-lg";
                });
            };
        });
    } else {
        cameraState = 0;
        if (cameraRecorder) {
            if (cameraRecorder.state != 'inactive') {
                cameraRecorder.stop();
                if (window.Notification.permission == "granted") {
                    sendNotification('结束摄像头录制', '摄像头录制已被结束');
                }
            }
            let tracks = cameraStream.getTracks();
            tracks.forEach((track) => {
                track.stop();
            });
        }
        socket.emit('message', [sessionUser.stu_no, 2, false], () => {
            document.getElementById('camera-state-btn').innerText = '未录制';
            this.innerText = '开始摄像头录制';
            this.className = "btn btn-primary btn-lg";
        });
    }
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
