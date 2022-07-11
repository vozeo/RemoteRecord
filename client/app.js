const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const multer = require('multer');

const options = {
    key: fs.readFileSync('../ssl/private.key'),
    cert: fs.readFileSync('../ssl/cert.crt')
};

const https = require('https');
const server = https.createServer(options, app)

app.engine('html', require('express-art-template'));
app.set('view options', {
    debug: process.env.NODE_ENV !== 'production'
});
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

app.use(express.json());
app.use(express.static(path.join(__dirname, "/")));

const { sessionSecret } = require('./config');
app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true,
        maxAge: 1000 * 60 * 60 * 24
    }
}));

// 初始化

const users = require('./user');
let opUsers = {};
let allUsers = {};

const readConfig = require('./readconfig');
const cp = require('child_process');
const default_config_file = "/etc/webrtc-u2051995.conf";
let config = {};

(async () => {
    config = await readConfig(default_config_file);
    let allUsersArray = await users.getAll();
    allUsersArray = Object.values(allUsersArray);
    for (let user of allUsersArray) {
        delete user.stu_password;
        user.watchList = {};
        user.online = [false, false, false];
        let path = config['root-dir']['path'] + '/u' + user.stu_no + '/';
        mkdirsSync(path + '/camera/');
        mkdirsSync(path + '/screen/');
        allUsers[user.stu_no] = user;
    }
    console.log(getTime() + ' 学生文件夹建立完成');
    let opUsersArray = await users.getOps();
    opUsersArray = Object.values(opUsersArray);
    for (let user of opUsersArray) {
        delete user.stu_password;
        user.watchCount = 1;
        opUsers[user.stu_no] = user;
    }
    console.log(getTime() + ' 服务器初始化完成');
})();

// WebRTC的WebSocket服务器

const { ExpressPeerServer } = require("peer");
const webRTCServer = ExpressPeerServer(server, {
    debug: true,
    path: "/",
});
app.use("/webrtc", webRTCServer);

//socket io

const Server = require("socket.io");
const io = new Server(server);

let stuNo = {};
let watchState = {};

io.on('connection', (socket) => {
    socket.on('message', (args, callback) => {
        if (args[0] in allUsers) {
            allUsers[args[0]].online[args[1]] = args[2];
            if (args[1] == 0) {
                console.log(getTime() + ' ' + args[0] + allUsers[args[0]].stu_name + '已连接');
            } else {
                if (args[2] == true) {
                    console.log(getTime() + ' ' + args[0] + allUsers[args[0]].stu_name + '开始录制');
                } else {
                    console.log(getTime() + ' ' + args[0] + allUsers[args[0]].stu_name + '停止录制');
                }
            }
        } else {
            console.log(getTime() + ' ' + args[0] + opUsers[args[0]].stu_name + '已连接');
        }
        stuNo[socket.id] = args[0];
        io.emit('state', allUsers);
        callback();
    });
    socket.on('instr', (arg) => {
        io.emit('instr', arg);
        let op = opUsers[stuNo[socket.id]];
        console.log(getTime() + ' ' + op.stu_no + op.stu_name + (arg == true ? '打开' : '关闭') + '了全体录制');
    });
    socket.on('watch', (args) => {
        if (allUsers[args[1]].watchList[args[0]]) {
            allUsers[args[1]].watchList[args[0]].watchCount += 1;
        } else {
            allUsers[args[1]].watchList[args[0]] = opUsers[args[0]];
        }
        let op = opUsers[args[0]], stu = allUsers[args[1]];
        console.log(getTime() + ' ' + op.stu_no + op.stu_name + '打开了' + stu.stu_no + stu.stu_name + '的监控界面');
        watchState[socket.id] = args;
        io.emit('state', allUsers);
    });
    socket.on("disconnect", () => {
        let id = stuNo[socket.id];
        let args = watchState[socket.id];
        if (id in allUsers) {
            for (let i = 0; i <= 2; i += 1) {
                allUsers[id].online[i] = false;
            }
            console.log(getTime() + ' ' + id + allUsers[id].stu_name + '断开连接');
        } else if (socket.id in watchState) {
            if (allUsers[args[1]].watchList[args[0]].watchCount > 1) {
                allUsers[args[1]].watchList[args[0]].watchCount -= 1;
            } else {
                delete allUsers[args[1]].watchList[args[0]];  
            }
            let op = opUsers[args[0]], stu = allUsers[args[1]];
            console.log(getTime() + ' ' + op.stu_no + op.stu_name + '关闭了' + stu.stu_no + stu.stu_name + '的监控界面');
            delete watchState[socket.id];
        }
        io.emit('state', allUsers);
    });
});

// 权限验证

const crypto = require('crypto');

function cryptPwd(password) {
    let md5 = crypto.createHash('md5');
    return md5.update(password).digest('hex');
}

const auth = async (req, res, next) => {
    const sessionUser = req.session.user;
    if (sessionUser) {
        let user = await users.getUserById(sessionUser.stu_no);
        user = Object.values(JSON.parse(JSON.stringify(user)))[0];
        if (cryptPwd(user.stu_no) == user.stu_password && req.path != '/changepassword') {
            return res.redirect('/changepassword');
        }
        return next();
    }
    res.redirect('/login');
}

const opAuth = async (req, res, next) => {
    const sessionUser = req.session.user;
    if (sessionUser) {
        let user = await users.getUserById(sessionUser.stu_no);
        user = Object.values(JSON.parse(JSON.stringify(user)))[0];
        if (user.stu_userlevel == '1') {
            return next();
        }
    }
    res.redirect('/');
}

const noAuth = async (req, res, next) => {
    const sessionUser = req.session.user;
    if (!sessionUser) {
        return next();
    }
    res.redirect('/');
}

// 获取网页

app.get('/', auth, async (req, res) => {
    const sessionUser = req.session.user;
    if (sessionUser) {
        let user = await users.getUserById(sessionUser.stu_no);
        user = Object.values(JSON.parse(JSON.stringify(user)))[0];
        if (cryptPwd(user.stu_no) == user.stu_password) {
            return res.redirect('/changepassword');
        }
    }
    res.render('index', { sessionUser: sessionUser });
});

app.get('/record', auth, async (req, res) => {
    res.render('record.html', { sessionUser: req.session.user });
});

app.get('/recordtest', auth, async (req, res) => {
    res.render('record-test.html');
});

app.get('/recordchoose', auth, function (req, res) {
    res.render('record-choose.html');
});

app.get('/login', noAuth, async (req, res) => {
    res.render('login.html');
});

app.get('/changepassword', auth, async (req, res) => {
    res.render('change-password.html', { sessionUser: req.session.user });
});

app.get('/selfinformation', auth, async (req, res) => {
    res.json([req.session.user, config['record-settings']['width'], config['record-settings']['height'], config['record-settings']['rate'], config['time-settings']['slice-time'], config['record-settings']['record-channel']]);
});

app.get('/history', auth, opAuth, async (req, res) => {
    res.render('history.html', { user: Object.values(allUsers) });
});

app.get('/historyrecord', auth, opAuth, async (req, res) => {
    let history = {};
    for (let i in allUsers) {
        let path = config['root-dir']['path'] + '/u' + allUsers[i].stu_no + '/';
        history[allUsers[i].stu_no + '-0'] = fs.readdirSync(path + 'screen/');
        history[allUsers[i].stu_no + '-1'] = fs.readdirSync(path + 'camera/');
    }
    let op = opUsers[req.session.user.stu_no];
    console.log(getTime() + ' ' + op.stu_no + op.stu_name + '查看了历史视频');
    res.json(history);
});

app.get('/monitor', auth, opAuth, async (req, res) => {
    res.render('monitor.html', {
        user: Object.values(allUsers),
        sessionUser: req.session.user
    });
});

app.get('/:userid/:videotype', auth, opAuth, async (req, res) => {
    let stu = allUsers[req.params.userid];
    res.render('video.html', { userid: stu.stu_no, username: stu.stu_name, videotype: req.params.videotype});
});

app.get('/final/:userid/:videotype', auth, opAuth, async (req, res) => {
    res.render('final-video.html', { userid: req.params.userid, videotype: req.params.videotype, number: Date.now() });
});

function getTime(date = new Date()) {
    return date.getFullYear().toString().padStart(2, '0') + '-' + String(date.getMonth() + 1).padStart(2, '0')
        + '-' + date.getDate().toString().padStart(2, '0') + '-' + date.getHours().toString().padStart(2, '0')
        + '-' + date.getMinutes().toString().padStart(2, '0') + '-' + date.getSeconds().toString().padStart(2, '0');
}

app.post('/bindvideo', auth, opAuth, async (req, res, next) => {
    let nowTime = Date.now();
    let timeStr = getTime(new Date(nowTime));
    let shellPath = __dirname + '/../server/';
    for (var i in allUsers) {
        let user = allUsers[i];
        let userPath = config['root-dir']['path'] + '/u' + user.stu_no + '/';
        let screenName = 'u' + user.stu_no + '-' /* + user.stu_name + '-' */ + 'screen' + '-' + timeStr + '.mp4';
        let cameraName = 'u' + user.stu_no + '-' /* + user.stu_name + '-' */ + 'camera' + '-' + timeStr + '.mp4';
        let execShell = `cd ${shellPath} && . ./manage.sh ${userPath} ${cameraName} ${screenName}`;
        cp.execSync(execShell, { stdio: 'ignore' });
        console.log(getTime() + ' 全体视频处理完成');
    }
    res.status(200).json({
        failed: 0,
        message: "Success!"
    });
});

app.get('/video/:videoname/*', auth, opAuth, function (req, res) {
    let names = req.params.videoname.split('-');
    let path = config['root-dir']['path'] + '/' + names[0] + '/' + names[1] + '/';

    let fileName = path + req.params.videoname;

    if (!fs.existsSync(fileName)) {
        res.status(404).send('File does not exist!');
        return;
    }

    const stat = fs.statSync(fileName);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize) {
            res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
            return;
        }

        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(fileName, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/webm'
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/webm',
        };
        res.writeHead(200, head);
        fs.createReadStream(fileName).pipe(res);
    }
});

function isSimplePwd(s) {
    if (s.length < 12) {
        return 1;
    }
    var ls = 0;
    if (s.match(/([a-z])+/)) {
        ls++;
    }
    if (s.match(/([0-9])+/)) {
        ls++;
    }
    if (s.match(/([A-Z])+/)) {
        ls++;
    }
    if (s.match(/[^a-zA-Z0-9]+/)) {
        ls++;
    }
    return ls < 3;
}

app.post('/changepassword', auth, async (req, res) => {
    let user = await users.getUserById(req.session.user.stu_no);
    user = Object.values(JSON.parse(JSON.stringify(user)))[0];

    if (req.body.newpassword != req.body.confirmpassword) {
        return res.json({
            failed: 1,
            message: "两次输入的新密码不一致!"
        });
    }

    if (req.body.newpassword.match(/[^a-zA-Z0-9*=-_#$%!]+/)) {
        return res.json({
            failed: 1,
            message: "密码不能包含除数字、小写字母、大写字母或 * = - _ # $ % ! 字符以外的其他字符!"
        });
    }

    if (cryptPwd(req.body.oldpassword) != user.stu_password) {
        return res.json({
            failed: 1,
            message: "旧密码错误!"
        });
    }

    if (cryptPwd(req.body.newpassword) == user.stu_password) {
        return res.json({
            failed: 1,
            message: "新密码不能和旧密码相同!"
        });
    }

    if (isSimplePwd(req.body.newpassword)) {
        return res.json({
            failed: 1,
            message: "新密码需包含数字、小写字母、大写字母、其它符号 * = - _ # $ % ! 这四种中的至少三种，且长度大于等于12位。"
        });
    }

    await users.update([{ stu_password: cryptPwd(req.body.newpassword) }, user.stu_no]);
    console.log(getTime() + ' ' + user.stu_no + user.stu_name + '修改了初始密码')
    res.status(200).json({
        failed: 0,
        message: "Success!"
    });
});

app.post('/login', noAuth, async (req, res) => {
    let user = await users.getUserById(req.body.username);
    user = Object.values(user)[0];

    if (!user) {
        return res.json({
            failed: 1,
            message: "用户名不存在!"
        });
    }

    if (req.body.password == user.stu_no && cryptPwd(req.body.password) == user.stu_password) {
        delete user.stu_password;
        req.session.user = user;
        return res.redirect('/changepassword');
    }

    if (cryptPwd(req.body.password) != user.stu_password) {
        return res.json({
            failed: 1,
            message: "密码错误!"
        });
    };

    delete user.stu_password;
    req.session.user = user;
    if (user.stu_userlevel == '1') {
        return res.status(200).redirect('/monitor');
    }
    console.log(getTime() + ' ' + user.stu_no + user.stu_name + '已登录');
    res.status(200).json(user);
});

app.get('/logout', async (req, res) => {
    req.session.user = null;
    res.redirect('/');
});

function mkdirsSync(dirname) {
    if (fs.existsSync(dirname)) {
        return true;
    } else {
        if (mkdirsSync(path.dirname(dirname))) {
            fs.mkdirSync(dirname);
            return true;
        }
    }
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let path = config['root-dir']['path'] + '/u' + req.session.user.stu_no + '/';
        mkdirsSync(path);
        cb(null, path);
    },
    filename: function (req, file, cb) {
        let date = new Date(parseInt(req.body.filetime));
        cb(null, 'u' + req.session.user.stu_no + '-' /* + req.session.user.stu_name + '-' */ + req.body.filetype + '-' + getTime(date) + '.webm');
    }
});

const upload = multer({ storage: storage })

app.post('/uploadFile', auth, upload.single('file'), function (req, res) {
    res.send({ ret_code: '0' });
})

server.listen(7080);
