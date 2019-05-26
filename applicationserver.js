const WebSocket = require('ws');

console.log('Starting websocket client...');
const client = new WebSocket('ws://localhost:8080/');

let targetDeviceId = process.argv[2];
let message = process.argv[3];

client.onopen = event => {
    console.log('Connection opened, sending push message...');
    client.send(JSON.stringify({
        type: 'sendpush',
        deviceId: targetDeviceId,
        data: {
            'message': message,
        }
    }));
};

client.onmessage = event => {
    console.log('Server Message:', event.data);
};
