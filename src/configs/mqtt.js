import mqtt from 'mqtt';
import * as deviceService from '../services/deviceService.js';
import * as trackingService from '../services/trackingService.js';
import * as telemetryService from '../services/telemetryService.js';

let mqttClient = null;
let socketIo = null;

const parseMessage = (payloadBuffer) => {
	const payloadText = payloadBuffer.toString();

	try {
		return JSON.parse(payloadText);
	} catch {
		return payloadText;
	}
};

const extractDeviceCodeFromTopic = (topic) => {
	const parts = topic.split('/');
	if (parts.length < 3) {
		return null;
	}

	return parts[2] || null;
};

const handleIncomingMessage = async (topic, payloadBuffer) => {
	const payload = parseMessage(payloadBuffer);
	let deviceCode = extractDeviceCodeFromTopic(topic);

	// If topic uses /me/ placeholder or no deviceCode in topic, try payload
	if (!deviceCode && payload && typeof payload === 'object') {
		deviceCode = payload.deviceCode || payload.device_code;
	}

	console.log(`[MQTT] Received message - Topic: ${topic}, DeviceCode: ${deviceCode || 'NONE'}`);

	if (deviceCode && typeof payload === 'object') {
		try {
			const telemetryPayload = {
				deviceCode,
				tracking: payload,
				raw: payload.raw || {}
			};

			const result = await telemetryService.processTelemetry(telemetryPayload);

            if (socketIo) {
				socketIo.emit(`live:${deviceCode}`, {
					trackingId: result.trackingId,
					...result.live,
				});
            }
            
            console.log(`[MQTT] Saved telemetry for device: ${deviceCode}`);
        } catch (error) {
            console.error(`[MQTT] Failed to save telemetry for ${deviceCode}:`, error.message);
        }
	} else {
		if (!deviceCode) {
			console.warn(`[MQTT] No deviceCode found in topic or payload. Topic: ${topic}`);
		} else if (typeof payload !== 'object') {
			console.warn(`[MQTT] Invalid payload format (not JSON). Topic: ${topic}`);
		}
	}
};

export const connectMqttClient = (io = null) => {
	if (mqttClient) {
		return mqttClient;
	}

	if (io) {
		socketIo = io;
	}

	const brokerUrl = process.env.MQTT_BROKER_URL;
	if (!brokerUrl) {
		console.warn('[MQTT] MQTT_BROKER_URL is missing.');
		return null;
	}

	const options = {
		clientId: process.env.MQTT_CLIENT_ID || `gnss-backend-${Math.random().toString(16).slice(2, 10)}`,
		username: process.env.MQTT_USERNAME,
		password: process.env.MQTT_PASSWORD,
		clean: false,
		reconnectPeriod: 1000,
	};

	mqttClient = mqtt.connect(brokerUrl, options);

	mqttClient.on('connect', () => {
		console.log('[MQTT] Connected to broker');

		const topicPattern = process.env.MQTT_TOPIC_PATTERN;
		mqttClient.subscribe(topicPattern, { qos: 1 }, (error) => {
			if (error) {
				console.error('[MQTT] Subscribe failed:', error.message);
				return;
			}

			console.log(`[MQTT] Subscribed to topic: ${topicPattern}`);
		});
	});

	mqttClient.on('reconnect', () => {
		console.log('[MQTT] Reconnecting...');
	});

	mqttClient.on('close', () => {
		console.warn('[MQTT] Connection closed');
	});

	mqttClient.on('offline', () => {
		console.warn('[MQTT] Client is offline');
	});

	mqttClient.on('error', (error) => {
		console.error('[MQTT] Error:', error.message);
	});

	mqttClient.on('message', async (topic, payloadBuffer) => {
		await handleIncomingMessage(topic, payloadBuffer);
	});

	return mqttClient;
};

export const getMqttClient = () => mqttClient;

export const publishMqttMessage = (topic, payload, options = { qos: 1, retain: false }) => {
	if (!mqttClient || !mqttClient.connected) {
		throw new Error('MQTT client is not connected');
	}

	const message = typeof payload === 'string' ? payload : JSON.stringify(payload);

	mqttClient.publish(topic, message, options, (error) => {
		if (error) {
			console.error('[MQTT] Publish failed:', error.message);
		}
	});
};

export const disconnectMqttClient = () => {
	if (!mqttClient) {
		return;
	}

	mqttClient.end(true, () => {
		console.log('[MQTT] Disconnected');
	});

	mqttClient = null;
};
