const WebSocket = require('ws');

const debugMode = false;

console.log('Starting websocket server...');
const server = new WebSocket.Server({
    port: 8080,
});

// Global State
let devices = {};

// Listeners
console.log('Setting up event listeners...');
server.on('connection', ws => {
    ws.isAlive = true;
    ws.deviceId = '';
    ws.deviceStatus = 'new';

    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', message => {
        if (debugMode) {
            console.log(`[${ws.deviceId || 'new'}] Message: ${message}`);
        }

        let msg = JSON.parse(message);
        if (msg.type == 'register') {
            let deviceId = msg.deviceId;
            ws.deviceId = deviceId;
            ws.deviceStatus = 'ok';
            devices[deviceId] = ws;
            console.log('New client registered:', deviceId);
        }
        if (msg.type == 'sendpush') {
            let device = devices[msg.deviceId];
            if (!device || device.deviceStatus != 'ok') {
                let errorMessage = 'Cannot send push notification to device: ' + msg.deviceId + ' - ' + (device ? device.deviceStatus : 'unknown');
                console.log(errorMessage);
                ws.send(JSON.stringify({
                    type: 'result',
                    result: 'error',
                    message: errorMessage,
                }));
                return;
            }
            ws.send(JSON.stringify({
                type: 'result',
                result: 'success',
            }));
            device.send(JSON.stringify({
                type: 'push',
                data: msg.data,
            }));
        }
    })

    ws.on('close', () => {
        ws.isAlive = false;
        ws.deviceStatus = 'close';
        // Extra steps for registered clients
        if (!ws.deviceId) return;
        delete devices[ws.deviceId];
        console.log('Client offline:', ws.deviceId);
    });

    ws.send(JSON.stringify({ type: 'event', message: 'Connection Established' }));
});

console.log('Server is ready!\n');

// Setup hearbeat
setInterval(function () {
    server.clients.forEach(ws => {
        if (ws.isAlive === false) {
            if (ws.deviceId) {
                console.log('Client unreachable:', ws.deviceId);
            }
            ws.deviceStatus = 'unreachable';
            ws.terminate();
            return;
        }
        ws.isAlive = false;
        ws.ping(() => {});
    });
}, 30000);

// Clients
function printClients() {
    console.log('Clients:');
    server.clients.forEach(ws => {
        console.log(`Client[${ws.readyState}]: ${ws.deviceId}`);
    });
    console.log('');
}

if (debugMode) {
    setInterval(printClients, 30000);
}
