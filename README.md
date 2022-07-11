# Remote Record

![](https://img.shields.io/badge/Version-1.1-green?style=flat-square)

## Introductions

This project is a browser-side recording system based on WebRTC technology, with functions such as recording screen, recording camera, real-time view monitoring, and real-time server saving.

The project is written in Node.js + Javascript + Express.

This project has been tested by hundreds of people in several exams, and the performance is reliable.

## Install

This project uses node and npm. Go check them out if you don't have them locally installed.

### Install ffmpeg

Download the ffmpeg. If you didn't install yasm, please install it before.

```sh
tar -xf yasm-1.3.0.tar.gz
cd yasm-1.3.0
./configure
make && make install

tar -xf ffmpeg-5.0.1.tar.gz
cd ffmpeg-5.0.1/
./configure --prefix=/usr/local/ffmpeg
make && make install
echo "export PATH=$PATH:/usr/local/ffmpeg/bin" >> /etc/profile
source /etc/profile
```

### Install turnserver

You can see [coturn/coturn: coturn TURN server project (github.com)](https://github.com/coturn/coturn).

```sh
dnf install libevent -y
dnf install libevent-devel -y
dnf install openssl-devel -y
dnf install convmv -y


tar -xf turnserver-4.5.2.tar.gz
cd turnserver-4.5.2
./configure
make && make install
cp ../turnserver.conf /usr/local/etc/
openssl req -x509 -newkey rsa:2048 -keyout /usr/local/etc/turn_server_pkey.pem -out /usr/local/etc/turn_server_cert.pem -days 99999 -nodes
```

## Run

Please install node and npm.

```sh
chmod 777 ./server/*
turnserver -o -a -f /usr/local/etc/turnserver.conf -r Shanghai
dnf install convmv
mkdir ssl && openssl genrsa -out ./ssl/private.key 2048
openssl req -new -key ./ssl/private.key -out ./ssl/server.csr
openssl x509 -req -days 365 -in ./ssl/server.csr -signkey ./ssl/private.key -out ./ssl/cert.crt
cp ./webrtc.conf /etc/
mysql -u root -proot123 < user.sql
cd client && npm install
npm install -g pm2
node app.js
```

## License

[MIT](https://opensource.org/licenses/MIT)

Copyright (c) 2022-present
