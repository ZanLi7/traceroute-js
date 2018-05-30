//const dgram = require('dgram');
const raw = require('raw-socket');

const icmpSocket = raw.createSocket('icmp');
//const udpSocket = dgram.createSocket('udp4');

const HOST = process.argv[2];
const MESSAGE = new Buffer('');
let PORT;
let ttl = 0;
let startTime;
let replyIP;
let timeout;

console.log(`traceroute to ${HOST} (${HOST}), 64 hops max, 42 byte packets`);

icmpSocket.on('message', function (buffer, source) {
  let p = buffer.toString('hex').substr(100, 4);
  let portNumber = parseInt(p, 16);
  console.log(`1: icmp received from ${source} and port ${portNumber}`);
  if (PORT === 44514) {
    console.log(`2: icmp received from ${source} and port ${portNumber}`);
    handleReply(source);
  }
});

// Default options
var options = {
  addressFamily: raw.AddressFamily.IPv4,
  protocol: raw.Protocol.UDP,
  bufferSize: 4096,
  generateChecksums: false,
  checksumOffset: 0
};

var socket = raw.createSocket(options);

// ICMP echo (ping) request, checksum should be ok
var buffer = new Buffer([
  0x62, 0x98, 0xad, 0xe2, 0x00, 0x20, 0x98, 0x01,
  0xa7, 0xbd, 0xb8, 0x1d, 0x08, 0x00, 0x45, 0x00,
  0x00, 0x1c, 0x27, 0xfd, 0x00, 0x00, 0x01, 0x11,
  0xcb, 0xad, 0xac, 0x14, 0x0a, 0x03, 0x08, 0x08,
  0x08, 0x08, 0x04, 0xd2, 0x82, 0xba, 0x00, 0x08]);

//var buffer = new Buffer([0x00]);

var socketLevel = raw.SocketLevel.IPPROTO_IP
var socketOption = raw.SocketOption.IP_TTL;

sendPacket();

function sendPacket() {
  setTimeout(function () {
    socket.send(buffer, 0, buffer.length, '8.8.8.8', beforeSend, afterSend);
    sendPacket();
  }, 1000);
}



function beforeSend() {
  ttl++;
  socket.setOption(socketLevel, socketOption, ttl);
}

function afterSend(error, bytes) {
  if (error)
    console.log(error.toString());
  else
    console.log("sent " + bytes + " bytes");

  socket.setOption(socketLevel, socketOption, 1);
}




function handleReply(source) {
  if (timeout) {
    clearTimeout(timeout);
  }

  const elapsedTime = Date.now() - startTime;

  if (source) {
    console.log(` ${ttl}  ${source} ${elapsedTime} ms`);

    if (source == HOST) {
      process.exit();
    }
  } else {
    console.log(` ${ttl}   *`);
  }

  sendPacket();
  timeout = setTimeout(handleReply, 15000);
}

function getRandomPort() {
  const PORT_MIN = 33434;
  const PORT_MAX = 33534;
  return Math.floor(Math.random() * (PORT_MAX - PORT_MIN) + PORT_MIN);
}
