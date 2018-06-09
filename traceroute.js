const dgram = require('dgram');
const raw = require('raw-socket');

const icmpSocket = raw.createSocket('icmp');
const udpSocket = dgram.createSocket('udp4');

const HOST = process.argv[2];
let PORT;
let ttl = 0;
let startTime;
let timeout;

const MAX_TIMEOUT_IN_MILLISECONDS = 5000;
const MAX_HOPS = 64;

console.log(`traceroute to ${HOST} (${HOST}), ${MAX_HOPS} hops max, 42 byte packets`);

udpSocket.bind(1234, () => {
  sendPacket();
});

function sendPacket() {
  startTime = Date.now();
  PORT = getRandomPort();

  ttl++;
  udpSocket.setTTL(ttl);
  udpSocket.send(new Buffer(''), 0, 0, PORT, HOST, function (err) {
    if (err) throw err;
    timeout = setTimeout(logReply, MAX_TIMEOUT_IN_MILLISECONDS);
  });
}

icmpSocket.on('message', function (buffer, source) {
  let p = buffer.toString('hex').substr(100, 4);
  let portNumber = parseInt(p, 16);
  if (PORT === portNumber) {
    logReply(source);
  }
});

function logReply(source) {
  if (timeout) {
    clearTimeout(timeout);
  }

  if (source) {
    const elapsedTime = Date.now() - startTime;
    console.log(` ${ttl}  ${source} ${elapsedTime} ms`);

    if (source == HOST || ttl >= MAX_HOPS) {
      process.exit();
    }
  } else {
    console.log(` ${ttl}   *`);
  }

  // This is weird but need to be done. Otherwise the next 
  // package won't be sent.
  setImmediate(sendPacket);
}

function getRandomPort() {
  const PORT_MIN = 33434;
  const PORT_MAX = 33534;
  return Math.floor(Math.random() * (PORT_MAX - PORT_MIN) + PORT_MIN);
}
