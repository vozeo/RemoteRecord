const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const session = require('express-session')

const options = {
    key: fs.readFileSync('../../ssl/private.key'),
    cert: fs.readFileSync('../../ssl/cert.crt')
};

const { sessionSecret } = require('./config')

const https = require('https');
https.createServer(options, app).listen(8090);

app.engine('html', require('express-art-template'));
app.set('view options', {
    debug: process.env.NODE_ENV !== 'production'
});
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

app.use(express.json());
app.use(express.static(path.join(__dirname, "/")));

app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true,
        maxAge: 1000 * 60 * 60 * 24
    }
}));

const users = require('./user');
let allUsers = {};
(async () => {
    let allUsersArray = await users.getAll();
    allUsersArray = Object.values(JSON.parse(JSON.stringify(allUsersArray)));
    for (let user of allUsersArray) {
        delete user.stu_password;
        user.lastTime = new Date().getTime();
        user.timeSlice = 0;
        user.online = "在线";
        allUsers[user.stu_no] = user;
    }
})();

const readConfig = require('./readconfig');
const util = require('util');
const cp = require('child_process');
const default_config_file = "/etc/webrtc-u2051995.conf";
let config = {};
(async () => {
    config = await readConfig(default_config_file);
    var filename = './controller.js';
    var lines2nuke = 1;
    var command = util.format('tail -n %d %s', lines2nuke, filename);

    cp.exec(command, (err, stdout, stderr) => {
        if (err) throw err;
        var to_vanquish = stdout.length;
        fs.stat(filename, (err, stats) => {
            if (err) throw err;
            fs.truncate(filename, stats.size - to_vanquish, (err) => {
                if (err) throw err;
                console.log('File truncated!');
                let appendData = 'screenWidth = ' + config['frame']['width'] + ', screenHeight = ' + config['frame']['height']
                    + ', screenRate = ' + config['frame']['rate'] + ';';
                fs.appendFileSync(filename, appendData, 'utf8');
            })
        });
    });

})();

var crypto = require('crypto');

function cryptPwd(password) {
    var md5 = crypto.createHash('md5');
    return md5.update(password).digest('hex');
}

const auth = async (req, res, next) => {
    const sessionUser = req.session.user;
    if (sessionUser) {
        let user = await users.getUserById(sessionUser.stu_no);
        user = Object.values(JSON.parse(JSON.stringify(user)))[0];
        console.log(req.path);
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

app.use((req, res, next) => {
    app.locals.sessionUser = req.session.user;
    next();
});

app.get('/', async (req, res) => {
    const sessionUser = req.session.user;
    if (sessionUser) {
        let user = await users.getUserById(sessionUser.stu_no);
        user = Object.values(JSON.parse(JSON.stringify(user)))[0];
        if (cryptPwd(user.stu_no) == user.stu_password) {
            return res.redirect('/changepassword');
        }
    }
    res.render('index');
});

app.get('/record', auth, async (req, res) => {
    res.render('record.html');
});

app.get('/recordtest', auth, async (req, res) => {
    res.render('record-test.html');
});

app.get('/recordchoose', auth, function (req, res) {
    res.render('record-choose.html');
});

app.get('/login', noAuth, async (req, res, next) => {
    res.render('login.html');
});

app.get('/changepassword', auth, async (req, res, next) => {
    res.render('change-password.html');
});

app.get('/monitor', auth, opAuth, async (req, res, next) => {
    res.render('monitor.html', { user: allUsers });
});

app.get('/:userid/:videotype', auth, opAuth, async (req, res, next) => {
    res.render('video.html', { userid: req.params.userid, videotype: req.params.videotype, number: Date.now() });
});

app.get('/video/:userid/:videotype/*', auth, opAuth, function (req, res) {
    const path = config['root-dir']['path'] + '/u' + req.params.userid + '/' + req.params.videotype + '/' + req.params.videotype + '.webm';
    if (!fs.existsSync(path)) {
        res.status(404).send('File does not exist!');
        return;
    }
    const stat = fs.statSync(path);
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
        const file = fs.createReadStream(path, { start, end });
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
        fs.createReadStream(path).pipe(res);
    }
});

function isSimplePwd(s) {
    if (s.length < 6) {
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

    if (cryptPwd(req.body.oldpassword) != user.stu_password) {
        return res.json({
            failed: 1,
            message: "Old Password is wrong!"
        });
    }

    if (cryptPwd(req.body.newpassword) == user.stu_password) {
        return res.json({
            failed: 1,
            message: "New Password can't be same as old password!"
        });
    }

    if (isSimplePwd(req.body.newpassword)) {
        return res.json({
            failed: 1,
            message: "新密码长度必须大于等于6位且包含数字、小写字母、大写字母、特殊字符的其中三种。"
        });
    }

    await users.update([{ stu_password: cryptPwd(req.body.newpassword) }, user.stu_no]);
    res.status(200).json({
        failed: 0,
        message: "Success!"
    });
});


app.post('/login', noAuth, async (req, res) => {
    let user = await users.getUserById(req.body.username);

    user = Object.values(JSON.parse(JSON.stringify(user)))[0];

    if (!user) {
        return res.json({
            failed: 1,
            message: "Username is vaild!"
        });
    }

    console.log(user);

    if (req.body.password == user.stu_no && cryptPwd(req.body.password) == user.stu_password) {
        delete user.stu_password;
        req.session.user = user;
        return res.redirect('/changepassword');
    }

    if (cryptPwd(req.body.password) != user.stu_password) {
        return res.json({
            failed: 1,
            message: "Password is wrong!"
        });
    };

    delete user.stu_password;
    req.session.user = user;
    res.status(200).json(user);
});

app.get('/logout', async (req, res) => {
    req.session.user = null;
    res.redirect('/');
});

const multer = require('multer')

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
        let path = config['root-dir']['path'] + '/u' + req.session.user.stu_no + '/temp-' + req.body.filetype + '/';
        mkdirsSync(path);
        cb(null, path);
    },
    filename: function (req, file, cb) {
        let date = new Date(parseInt(req.body.filetime));
        allUsers[req.session.user.stu_no].lastTime = Date.now();
        cb(null, 'u' + req.session.user.stu_no + '-' + req.session.user.stu_name + '-' + req.body.filetype
            + '-' + date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate() + '-' + date.getHours()
            + '-' + date.getMinutes() + '-' + date.getSeconds() + '.webm');
    }
});


function deleteFile(filePath) {
    if (fs.existsSync(filePath)) {
        const files = fs.readdirSync(filePath);
        files.forEach((file) => {
            fs.unlinkSync(`${filePath}/${file}`);
        })
    }
}


function moveFile(srcPath, dstPath, savePath, dstName) {
    if (fs.existsSync(srcPath)) {
        const files = fs.readdirSync(srcPath)
        files.forEach((file) => {
            deleteFile(dstPath);
            fs.copyFileSync(`${srcPath}/${file}`, `${savePath}/${file}`);
            fs.renameSync(`${srcPath}/${file}`, `${dstPath}/${dstName}`);
        })
    }
}

function updateOnlineState() {
    let nowTime = Date.now();
    for (var i in allUsers) {
        allUsers[i].timeSlice = (nowTime - allUsers[i].lastTime) / 1000;
        if (allUsers[i].timeSlice > parseInt(config['time-settings']['disconnect'])) {
            allUsers[i].online = "不在线";
        } else allUsers[i].online = "在线";
        let user = allUsers[i];
        let path = config['root-dir']['path'] + '/u' + user.stu_no + '/';
        mkdirsSync(path + '/camera/');
        mkdirsSync(path + '/screen/');
        moveFile(path + '/temp-camera/', path + '/camera/', path, 'camera.webm');
        moveFile(path + '/temp-screen/', path + '/screen/', path, 'screen.webm');
    }
}

setInterval(updateOnlineState, 1000);

const upload = multer({ storage: storage })

app.post('/uploadFile', auth, upload.single('file'), function (req, res) {
    res.send({ ret_code: '0' });
})
