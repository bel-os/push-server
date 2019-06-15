const WebSocket = require('ws');

const debugMode = false;

console.log('Starting websocket server...');
const server = new WebSocket.Server({
    port: 8080,
});

// Global State
let devices = {};
let apps = {};


// Data Model
class Device {
    constructor(socket) {
        this.id = '';
        this.socket = socket;
        this.status = 'new';
        this.apps = {};
    }

    register(id) {
        this.id = id;
        this.status = 'ok';
        devices[this.id] = this;
    }

    registerApp(app) {
        // TODO: handle duplicate registers
        // TODO: handle duplicate appTokens from different devices
        app.device = this;
        this.apps[app.id] = app;
        apps[app.id] = app;
    }

    send(msg) {
        // TODO: resend message later if device is not available right now
        this.socket.send(JSON.stringify(msg));
    }
}

class App {
    constructor(id, packageName) {
        this.id = id;
        this.packageName = packageName;
        this.device = null;
    }
}

// Listeners
console.log('Setting up event listeners...');
server.on('connection', ws => {
    ws.isAlive = true;
    ws.device = new Device(ws);

    function sendResponse(result, details, originalMessage) {
        let msg = Object.assign({}, originalMessage, {
            result: result,
            message: details || result,
        });
        ws.send(JSON.stringify(msg));
    }

    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', message => {
        if (debugMode) {
            console.log(`[${ws.device.id || 'new'}] Message: ${message}`);
        }

        // Parse Message
        let msg;
        try {
            msg = JSON.parse(message);
        } catch (e) {
            return;
        }

        // Registering Connection
        if (msg.type == 'register') {
            let deviceId = msg.deviceId;
            ws.device.register(deviceId);
            sendResponse('success', 'Device registered', msg);
            console.log('New client registered:', deviceId);
            return;
        }

        // App Management - Registration
        if (msg.type == 'registerApp') {
            let device = ws.device;
            if (!device || device.status != 'ok') {
                sendResponse('error', 'Device not found');
                return;
            }
            let app = new App(msg.token, msg.app);
            device.registerApp(app);
            sendResponse('success', 'App registered', msg);
            console.log('New app registered:', app.packageName, app.device.id, app.id);
            return;
        }

        // Push - Send Push To Clients
        if (msg.type == 'sendpush') {
            // TODO: implement access control for sending push to arbitrary app tokens
            let appToken = msg.token || '';
            let app = apps[appToken];
            if (!app) {
                sendResponse('error', `App not found with token: "${appToken.substr(0, 10)}..."`, msg);
                return;
            }
            if (!app.device) {
                sendResponse('error', 'App integrity check failed: Device not found', msg);
                return;
            }
            app.device.send({
                type: 'push',
                app: app.packageName,
                data: msg.data,
            });
            sendResponse('success', 'Push notification sent', msg);
            return;
        }
    });

    ws.on('close', () => {
        ws.isAlive = false;
        ws.device.status = 'close';
        if (ws.device.id) {
            console.log('Client offline:', ws.device.id);
        }
    });

    ws.send(JSON.stringify({ type: 'event', message: 'Connection Established' }));
});

console.log('Server is ready!\n');

// Setup heartbeat
setInterval(function () {
    server.clients.forEach(ws => {
        if (ws.isAlive === false) {
            if (ws.device.id) {
                console.log('Client unreachable:', ws.deviceId);
            }
            ws.device.status = 'unreachable';
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
        console.log(`Client[${ws.readyState}]: ${ws.device.id}`);
    });
    console.log('');
}

if (debugMode) {
    setInterval(printClients, 30000);
}
