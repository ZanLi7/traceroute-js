const dgram = require('dgram');
const raw = require('raw-socket');
const dns = require('dns-then');

const icmpSocket = raw.createSocket('icmp');
const udpSocket = dgram.createSocket('udp4');

const MAX_HOPS = 64;
const MAX_TIMEOUT_IN_MILLISECONDS = 1000;
const DESTINATION_HOST = process.argv[process.argv.length - 1];
const NO_REVERSE_LOOKUP = process.argv[process.argv.length - 2] === '-n';

let DESTINATION_IP;

let port = 33434;
let ttl = 1;
let tries = 0;

let startTime;
let timeout;
let previousIP;

startTrace();

setImmediate(() => {
  icmpSocket.on('message', async function (buffer, ip) {
    let p = buffer.toString('hex').substr(100, 4);
    let portNumber = parseInt(p, 16);
    if (port === portNumber) {
      try {
        let symbolicAddress;
        if (!NO_REVERSE_LOOKUP) {
          symbolicAddress = await dns.reverse(ip);
        }
        handleReply(ip, symbolicAddress[0]);
      } catch (e) {
        handleReply(ip);
      }
    }
  });
});

async function startTrace() {
  DESTINATION_IP = await dns.lookup(DESTINATION_HOST);
  console.log(`traceroute to ${DESTINATION_HOST} (${DESTINATION_IP}), ${MAX_HOPS} hops max, 42 byte packets`);
  udpSocket.bind(1234, () => {
    sendPacket();
  });
}

function sendPacket() {
  port++;

  if (tries >= 3) {
    tries = 0;
    ttl++;
  }
  tries++;

  udpSocket.setTTL(ttl);
  startTime = process.hrtime();
  udpSocket.send(new Buffer(''), 0, 0, port, DESTINATION_IP, function (err) {
    if (err) throw err;
    timeout = setTimeout(handleReply, MAX_TIMEOUT_IN_MILLISECONDS);
  });
}

function handleReply(ip, symbolicAddress) {
  if (timeout) {
    clearTimeout(timeout);
  }

  if (ip) {
    const elapsedTime = `${(process.hrtime(startTime)[1] / 1000000).toFixed(3)} ms`;

    if (ip === previousIP) {
      process.stdout.write(`  ${elapsedTime}`);
    } else if (tries === 1) {
      process.stdout.write(`\n ${ttl}  ${symbolicAddress ? symbolicAddress : ip} (${ip}) ${elapsedTime}`);
    } else {
      process.stdout.write(`\n    ${symbolicAddress ? symbolicAddress : ip} (${ip}) ${elapsedTime}`);
    }
  } else {
    if (tries === 1) {
      process.stdout.write(`\n ${ttl}  * `);
    } else {
      process.stdout.write(`* `);
    }
  }

  if ((ip == DESTINATION_IP && tries === 3) || ttl >= MAX_HOPS) {
    console.log('');
    process.exit();
  }

  previousIP = ip;
  setImmediate(sendPacket);
}