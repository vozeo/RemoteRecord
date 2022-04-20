var express = require("express");
var app = express();
var fs = require('fs');
const path = require("path");

var key = fs.readFileSync('../../ssl/private.key');
var cert = fs.readFileSync('../../ssl/cert.crt');

var options = {
    key: key,
    cert: cert
};

app.use(express.static(path.join(__dirname, "/")));

var https = require('https');
https.createServer(options, app).listen(8888);

app.get('/', function(req, res) {
    res.render('index.html', {
        layout: false,
        title: "主页",
        mainInfo: 'main paper'
    });
});

const multer  = require('multer')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './uploads')
    },
    filename: function (req, file, cb) {
      cb(null, req.body.username + '-' +  req.body.filename)
    }
  })
  
const upload = multer({ storage: storage })

app.get('/upload', function(req, res) {
    res.sendFile(path.resolve(__dirname,'./upload.html'));
});

app.post('/profile', upload.single('file'), function (req, res, next) {
    res.send({ret_code: '0'});
})