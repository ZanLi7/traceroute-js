const dgram = require('dgram');
const raw = require('raw-socket');
const dns = require('dns-then');

const icmpSocket = raw.createSocket('icmp');
const udpSocket = dgram.createSocket('udp4');

const DESTINATION_HOST = process.argv[2];
let DESTINATION_IP;

let PORT;
let ttl = 1;
let startTime;
let timeout;

let numberOfAttempts = 0;

const MAX_TIMEOUT_IN_MILLISECONDS = 1000;
const MAX_HOPS = 64;

setImmediate(() => {
  icmpSocket.on('message', function (buffer, source) {
    let p = buffer.toString('hex').substr(100, 4);
    let portNumber = parseInt(p, 16);
    if (PORT === portNumber) {
      logReply(source);
    }
  });
});

async function startTrace() {
  DESTINATION_IP = await getIPAddress(DESTINATION_HOST);
  console.log(`traceroute to ${DESTINATION_HOST} (${DESTINATION_IP}), 64 hops max, 42 byte packets`);

  udpSocket.bind(1234, () => {
    sendPacket();
  });
}

startTrace();

function sendPacket() {
  startTime = Date.now();
  PORT = getRandomPort();

  if (numberOfAttempts >= 3) {
    numberOfAttempts = 0;
    ttl++;
  }
  numberOfAttempts++;

  udpSocket.setTTL(ttl);
  udpSocket.send(new Buffer(''), 0, 0, PORT, DESTINATION_IP, function (err) {
    if (err) throw err;
    timeout = setTimeout(logReply, MAX_TIMEOUT_IN_MILLISECONDS);
  });
}

function logReply(source) {
  if (timeout) {
    clearTimeout(timeout);
  }

  if (source) {
    const elapsedTime = Date.now() - startTime;

    if (numberOfAttempts === 1) {
      if (ttl > 1) {
        process.stdout.write('\n');
      }
      process.stdout.write(` ${ttl}  ${source} ${elapsedTime} ms`);
    } else {
      process.stdout.write(`   ${elapsedTime} ms`);
    }
  } else {
    if (numberOfAttempts === 1) {
      process.stdout.write('\n');
      process.stdout.write(` ${ttl}  *`);
    } else {
      process.stdout.write(' *');
    }
  }

  if ((source == DESTINATION_IP && numberOfAttempts === 3) || ttl >= MAX_HOPS) {
    process.exit();
  }

  // Postpone sendPacket to the next tick of the event loop,
  // otherwise the package won't be sent.
  setImmediate(sendPacket);
}

function getRandomPort() {
  const PORT_MIN = 33434;
  const PORT_MAX = 33534;
  return Math.floor(Math.random() * (PORT_MAX - PORT_MIN) + PORT_MIN);
}

function getIPAddress(host) {
  const validIPAddress = new RegExp("^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$");
  if (!validIPAddress.test(host)) return dns.lookup(host);
  return host;
}
