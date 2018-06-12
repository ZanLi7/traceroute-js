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

let numberOfAttempts = 0;

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

let result = {};

function handleReply(source) {
  if (timeout) {
    clearTimeout(timeout);
  }

  const endTime = process.hrtime(startTime);
  const timeString = `${(endTime[1] / 1000000).toFixed(3)} ms`;

  if (source && numberOfAttempts === 1) {
    result.source = source;
    result.times = [];
    result.times.push(timeString);
  } else if (source && numberOfAttempts <= 3) {
    result.times.push(timeString);
  } else if (numberOfAttempts <= 3) {
    result.times.push('*');
  }

  if (result.times.length >= 3) {
    console.log(` ${ttl}  ${result.source ? result.source + '  ' : ''}${result.times[0]} ${result.times[1]} ${result.times[2]}`);
    result = {
      times: []
    };
  }

  if ((source == DESTINATION_IP && numberOfAttempts === 3) || ttl >= MAX_HOPS) {
    process.exit();
  }

  // Postpone sendPacket to the next tick of the event loop,
  // otherwise the package won't be sent.
  setImmediate(sendPacket);
}

function getIPAddress(host) {
  const validIPAddress = new RegExp("^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$");
  if (!validIPAddress.test(host)) return dns.lookup(host);
  return host;
}
