const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const session = require('express-session')
const { User } = require('./model')

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

const auth = async (req, res, next) => {
    const sessionUser = req.session.user;
    if (sessionUser) {
        return next();
    }
    res.redirect('/login');
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

app.get('/register', noAuth, async (req, res, next) => {
    res.render('register.html');
});

app.get('/login', noAuth, async (req, res, next) => {
    res.render('login.html');
});


app.post('/register', noAuth, async (req, res, next) => {
    try {
        let user = await User.findOne({
            username: req.body.username
        })

        if (user) {
            return res.status(422).send({
                message: '用户名已存在'
            });
        }

        user = await User.create({
            username: req.body.username,
            password: req.body.password,
        })

        user = user.toJSON();
        delete user.password;
        req.session.user = user;
        res.status(200).json({ user });
    } catch (err) {
        next(err);
    }
});

app.post('/login', noAuth, async (req, res, next) => {
    console.log(req.body);
    try {
        let user = await User.findOne({
            username: req.body.username
        }).select("+password");

        if (!user) {
            return res.status(422).send({
                message: '用户名不存在'
            });
        }

        const isPasswordValid = require('bcrypt').compareSync(
            req.body.password,
            user.password
        )

        if (!isPasswordValid) {
            return res.status(422).send({
                message: '密码无效'
            })
        };

        user = user.toJSON();
        delete user.password;
        req.session.user = user;
        res.status(200).json({ user });
    } catch (err) {
        next(err);
    }
});

app.get('/logout', auth, async (req, res, next) => {
    req.session.user = null;
    res.redirect('/');
});

app.get('/listenuser', auth, async (req, res) => {
    let users = [];
    for await (const user of User.find()) {
        users.push(user.username + '-' + user.exam + '-' + 'screen');
        users.push(user.username + '-' + user.exam + '-' + 'camera');
    }
    var file = fs.createWriteStream('listenuser.txt');
    file.on('error', function (err) { Console.log(err) });
    users.forEach(value => file.write(`${value}\n`));
    file.end();
    res.send({ ret_code: '0' });
})

app.get('/profile', auth, async (req, res) => {
    res.send(req.session.user);
})

const multer = require('multer')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/home/user/zzk/tools_videos/_waiting')
    },
    filename: function (req, file, cb) {
        const user = req.session.user;
        cb(null, user.username + '-' + user.exam + '-' + req.body.filename)
    }
})

const upload = multer({ storage: storage })

app.post('/uploadFile', auth, upload.single('file'), function (req, res) {
    res.send({ ret_code: '0' });
})

