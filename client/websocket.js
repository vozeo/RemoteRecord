const express = require('express');
const app = express();
const fs = require('fs');

const options = {
    key: fs.readFileSync('../ssl/private.key'),
    cert: fs.readFileSync('../ssl/cert.crt')
};

const https = require('https');
const server = https.createServer(options, app).listen(8090);

const { ExpressPeerServer } = require("peer");
const webRTCServer = ExpressPeerServer(server, {
    debug: true,
    path: "/",
});

app.use("/webrtc", webRTCServer);