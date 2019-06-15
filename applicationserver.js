const WebSocket = require('ws');

console.log('Starting websocket client...');
const client = new WebSocket('ws://localhost:8080/');
// const client = new WebSocket('wss://push.sabaos.com/');

let targetAppId = process.argv[2];
let message = process.argv[3];

client.onopen = event => {
    console.log('Connection opened, sending push message...');
    client.send(JSON.stringify({
        type: 'sendpush',
        token: targetAppId,
        data: {
            'message': message,
        },
    }));
};

client.onmessage = event => {
    let msg = {};
    try {
        msg = JSON.parse(event.data);
    } catch (e) {
        console.log('Invalid message:', event.data);
    }
    if (msg.type == 'sendpush') {
        console.log('Message sent with status:', msg.result, '-', msg.message);
        client.close();
        return;
    }
    console.log('Server Message:', msg);
};
