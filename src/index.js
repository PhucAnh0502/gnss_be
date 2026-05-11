import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {Server} from 'socket.io';
import {createServer} from 'http';
import sequelize, {connectDB} from './configs/db.js';
import { connectMqttClient } from './configs/mqtt.js';
import authRoutes from './routes/authRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import trackingRoutes from './routes/trackingRoutes.js';
import telemetryRoutes from './routes/telemetryRoutes.js';
import { connect } from 'http2';

dotenv.config();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: true,
        allowEIO3: true
    },
    transports: ['websocket', 'polling', 'websocket-hixie76'],
    pingInterval: 25000,
    pingTimeout: 60000,
    maxHttpBufferSize: 1e6,
    allowUpgrades: true,
})

io.on('connection', (socket) => {
    console.log(`[SOCKET.IO] Client connected: ${socket.id}`);
    console.log(`[SOCKET.IO] Transport: ${socket.conn.transport.name}`);

    socket.on('join_device', (deviceCode) => {
        socket.join(deviceCode);
        console.log(`[SOCKET.IO] Client ${socket.id} joined room: ${deviceCode}`);
    })

    socket.on('disconnect', (reason) => {
        console.log(`[SOCKET.IO] Client disconnected: ${socket.id}, Reason: ${reason}`);
    });

    socket.on('connect_error', (error) => {
        console.log(`[SOCKET.IO] Client ${socket.id} error: ${error}`);
    });
});

io.on('connect_error', (error) => {
    console.log(`[SOCKET.IO] Server connection error:`, error);
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint not found' });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    const isDbConnected = await connectDB();

    if (isDbConnected) {
        try {
            await sequelize.sync({ force: false });
            console.log('[Database] Synchronized successfully.');

            connectMqttClient(io); 

            httpServer.listen(PORT, () => {
                console.log(`[Server] GNSS System running on port: ${PORT}`);
            });
        } catch (error) {
            console.error('[Server] Start failed:', error.message);
            process.exit(1);
        }
    }
};

startServer();