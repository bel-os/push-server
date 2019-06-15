const WebSocket = require('ws');
const srs = require('secure-random-string');

console.log('Starting websocket client...');
const client = new WebSocket('ws://localhost:8080/');
// const client = new WebSocket('wss://push.sabaos.com/');

function sendMessage(msg) {
    client.send(JSON.stringify(msg));
}

const deviceId = srs({alphanumeric: true});
console.log('DeviceID:', deviceId);

client.onopen = event => {
    console.log('Connection opened, sending register message...');
    sendMessage({
        type: 'register',
        deviceId: deviceId,
    });
    setTimeout(() => {
        console.log('Registering a test app...');
        sendMessage({
            type: 'registerApp',
            app: 'com.sabaos.test',
            token: '1234',
        });
    }, 1000);
};

client.onmessage = event => {
    console.log('Server Message:', event.data);
};
