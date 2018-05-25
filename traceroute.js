const dgram = require('dgram');
const raw = require('raw-socket');

const icmpSocket = raw.createSocket('icmp');
const udpSocket = dgram.createSocket('udp4');

const HOST = process.argv[2];
const MESSAGE = new Buffer('');
let ttl = 1;
let interval;
let startTime;
let replyIP;

console.log(`traceroute to ${HOST} (${HOST}), 64 hops max, 42 byte packets`);

icmpSocket.on('message', function(buffer, source) {
  replyIP = source;
});

udpSocket.bind(1234, () => {
  sendPacket(ttl);
  startTime = Date.now();
});

function checkReply() {
  const elapsedTime = Date.now() - startTime;

  if (replyIP) {
    console.log(` 1  ${replyIP} ${elapsedTime} ms`);

    if (replyIP == HOST) {
      console.log('destination reached');
      clearInterval(interval);
      process.exit();
    }
    replyIP = null;
    sendPacket(++ttl);
  } else {
    if (elapsedTime > 5000) {
      console.log('No answer');
      startTime = Date.now();
      sendPacket(++ttl);
    } else {
      setTimeout(checkReply, 300);
    }
  }
}

function sendPacket(ttl) {
  if (udpSocket) {
    udpSocket.setTTL(ttl);
    udpSocket.send(MESSAGE, 0, MESSAGE.length, getRandomPort(), HOST, function(
      err,
      bytes
    ) {
      if (err) throw err;
    });
  }
  checkReply();
}

function getRandomPort() {
  const PORT_MIN = 33434;
  const PORT_MAX = 33534;
  return Math.floor(Math.random() * (PORT_MAX - PORT_MIN) + PORT_MIN);
}
