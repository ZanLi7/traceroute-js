const dgram = require('dgram');
const raw = require('raw-socket');
const dns = require('dns-then');

const icmpSocket = raw.createSocket('icmp');
const udpSocket = dgram.createSocket('udp4');

const MAX_HOPS = 64;
const MAX_TIMEOUT_IN_MILLISECONDS = 1000;
const DESTINATION_HOST = process.argv[2];
let DESTINATION_IP;

let port = 33434;
let ttl = 1;
let startTime;
let timeout;
let result = [];
let numberOfAttempts = 0;
let previousIP;

startTrace();

setImmediate(() => {
  icmpSocket.on('message', function (buffer, source) {
    let p = buffer.toString('hex').substr(100, 4);
    let portNumber = parseInt(p, 16);
    if (port === portNumber) {
      handleReply(source);
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

function sendPacket() {
  startTime = process.hrtime();
  port++;

  if (numberOfAttempts >= 3) {
    numberOfAttempts = 0;
    ttl++;
  }
  numberOfAttempts++;

  udpSocket.setTTL(ttl);
  udpSocket.send(new Buffer(''), 0, 0, port, DESTINATION_IP, function (err) {
    if (err) throw err;
    timeout = setTimeout(handleReply, MAX_TIMEOUT_IN_MILLISECONDS);
  });
}

function handleReply(source) {
  if (timeout) {
    clearTimeout(timeout);
  }

  if (source) {
    const endTime = process.hrtime(startTime);
    const timeString = `${(endTime[1] / 1000000).toFixed(3)} ms`;

    if (source === previousIP) {
      process.stdout.write(`  ${timeString}`);
    } else if (numberOfAttempts === 1) {
      process.stdout.write(`\n ${ttl}  ${source ? source + ' ' : ''} ${timeString}`);
    } else {
      process.stdout.write(`\n    ${source ? source + ' ' : ''} ${timeString}`);
    }
    result = [];
  } else {
    if (numberOfAttempts === 1) {
      process.stdout.write(`\n ${ttl}  * `);
    } else {
      process.stdout.write(`* `);
    }
  }

  if ((source == DESTINATION_IP && numberOfAttempts === 3) || ttl >= MAX_HOPS) {
    process.exit();
  }

  previousIP = source;

  // Postpone sendPacket to the next tick of the event loop,
  // otherwise the package won't be sent.
  setImmediate(sendPacket);
}

function getIPAddress(host) {
  const validIPAddress = new RegExp("^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$");
  if (!validIPAddress.test(host)) return dns.lookup(host);
  return host;
}
