const dgram = require('dgram');
const raw = require('raw-socket');

const icmpSocket = raw.createSocket('icmp');
const udpSocket = dgram.createSocket('udp4');

const HOST = process.argv[2];
const MESSAGE = new Buffer('');
let PORT;
let ttl = 1;
let startTime;
let replyIP;
let timeout;

console.log(`traceroute to ${HOST} (${HOST}), 64 hops max, 42 byte packets`);

icmpSocket.on('message', function(buffer, source) {
  //console.log('icmp received from ' + source);
  let p = buffer.toString('hex').substr(100, 4);
  let portNumber = parseInt(p, 16);
  //if (PORT === portNumber) {
  handleReply(source);
  //}
});

udpSocket.bind(1234, () => {
  sendPacket(ttl);
});

function sendPacket(ttl) {
  startTime = Date.now();
  PORT = getRandomPort();
  //console.log('sending udp packge to port: ' + PORT + ' with ttl ' + ttl);
  if (udpSocket) {
    udpSocket.setTTL(ttl);
    udpSocket.send(MESSAGE, 0, MESSAGE.length, PORT, HOST, function(err) {
      if (err) throw err;
    });
  }
  timeout = setTimeout(handleReply, 10000);
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
  sendPacket(++ttl);
}

function getRandomPort() {
  const PORT_MIN = 33434;
  const PORT_MAX = 33534;
  return Math.floor(Math.random() * (PORT_MAX - PORT_MIN) + PORT_MIN);
}
