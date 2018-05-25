const dgram = require('dgram');
const raw = require('raw-socket');

const icmpSocket = raw.createSocket('icmp');
const udpSocket = dgram.createSocket('udp4');

const HOST = process.argv[2];
const MESSAGE = new Buffer('');
let ttl = 7;
let interval;

console.log(`traceroute to ${HOST} (${HOST}), 64 hops max, 42 byte packets`);

icmpSocket.on('message', function(buffer, source) {
  console.log(` 1  ${source}`);

  if (source == HOST) {
    console.log('destination reached');
    clearInterval(interval);
    process.exit();
  }
});

udpSocket.bind(1234, () => {
  sendPacket(ttl);
  startTrace();
});

function startTrace() {
  interval = setInterval(() => {
    sendPacket(++ttl);
  }, 5000);
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
}

function getRandomPort() {
  const PORT_MIN = 33434;
  const PORT_MAX = 33534;
  return Math.floor(Math.random() * (PORT_MAX - PORT_MIN) + PORT_MIN);
}
