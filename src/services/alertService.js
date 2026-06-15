import sequelize from '../configs/db.js';
import { QueryTypes } from 'sequelize';
import { AlertZone, AlertEvent } from '../models/index.js';

/**
 * AlertService — Core service for geofence alert evaluation.
 * 
 * Responsibilities:
 * - Maintain in-memory zone cache for fast lookup
 * - Calculate distances from device positions to alert zones using PostGIS
 * - Validate incoming telemetry coordinates
 * - Detect zone breaches, exits, and re-evaluate at intervals
 * - Serve as the main entry point from MQTT handler for alert evaluation
 * 
 * Validates: Requirements 5.1, 5.2, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5
 */

// Socket.IO instance reference
let io = null;

// In-memory zone cache: Map<zoneId, { id, name, polygon, warningRadius }>
const zoneCache = new Map();

// Deduplication for proximity alerts (30s window)
// Map<`${deviceCode}:${zoneId}`, timestamp>
const proximityDedup = new Map();

// Active breach tracking
// Map<`${deviceCode}:${zoneId}`, { intervalId, lastTelemetryAt, lat, lng }>
const activeBreaches = new Map();

/**
 * Initialize AlertService with Socket.IO instance.
 * Must be called once during server startup after Socket.IO is configured.
 * @param {object} socketIo - Socket.IO server instance
 */
export const init = (socketIo) => {
    io = socketIo;
};

/**
 * Load all active alert zones from the database into the in-memory cache.
 * Called on server start and after CRUD operations.
 */
export const loadZones = async () => {
    try {
        const zones = await AlertZone.findAll();
        zoneCache.clear();

        for (const zone of zones) {
            zoneCache.set(zone.id, {
                id: zone.id,
                name: zone.name,
                polygon: zone.polygon,
                warningRadius: zone.warningRadius
            });
        }

        console.log(`[AlertService] Loaded ${zoneCache.size} zones into cache`);
    } catch (error) {
        console.error('[AlertService] Failed to load zones into cache:', error.message);
    }
};

/**
 * Refresh zone cache after CRUD operations.
 * Called by AlertZoneController after create/update/delete.
 */
export const onZoneChanged = async () => {
    await loadZones();
};

/**
 * Validate GPS coordinates.
 * @param {*} lat - Latitude value
 * @param {*} lng - Longitude value
 * @returns {boolean} true if coordinates are valid
 */
const isValidCoordinates = (lat, lng) => {
    if (lat === null || lat === undefined || lng === null || lng === undefined) {
        return false;
    }

    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return false;
    }

    if (isNaN(lat) || isNaN(lng)) {
        return false;
    }

    if (lat < -90 || lat > 90) {
        return false;
    }

    if (lng < -180 || lng > 180) {
        return false;
    }

    return true;
};

/**
 * Calculate distances from a given point to ALL zones using PostGIS.
 * Uses a single SQL query with ST_Distance and ST_Within for efficiency.
 * 
 * @param {number} lat - Device latitude
 * @param {number} lng - Device longitude
 * @returns {Array<{ id, name, warningRadius, distance, isInside }>} Distance results per zone
 */
const calculateDistances = async (lat, lng) => {
    try {
        const results = await sequelize.query(
            `SELECT id, name, "warningRadius",
                ST_Distance(polygon::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) as distance,
                ST_Within(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geometry, polygon::geometry) as is_inside
            FROM "AlertZones"`,
            {
                replacements: { lat, lng },
                type: QueryTypes.SELECT
            }
        );

        return results.map(row => ({
            id: row.id,
            name: row.name,
            warningRadius: row.warningRadius,
            distance: parseFloat(row.distance),
            isInside: row.is_inside
        }));
    } catch (error) {
        console.error('[AlertService] PostGIS distance calculation failed:', error.message);
        return [];
    }
};

/**
 * Emit a proximity alert for a device approaching a zone.
 * Implements deduplication (30s window) and device connectivity check.
 * 
 * Logic:
 * 1. Check if device is connected to Socket.IO room — if not, discard and reset dedup
 * 2. Check deduplication window (30s) — if within window, skip
 * 3. Emit proximity_alert event to device room
 * 4. Save alert event to AlertEvent table
 * 
 * @param {string} deviceCode - Device identifier
 * @param {object} zone - Zone object { id, name, warningRadius }
 * @param {number} distance - Distance in meters from device to zone boundary
 * 
 * Validates: Requirements 5.2, 5.3, 5.4, 5.6
 */
export const emitProximityAlert = async (deviceCode, zone, distance) => {
    if (!io) {
        console.warn('[AlertService] Socket.IO not initialized, cannot emit proximity alert');
        return;
    }

    const dedupKey = `${deviceCode}:${zone.id}`;

    // Step 1: Check if device is connected to Socket.IO room
    const room = io.sockets.adapter.rooms.get(deviceCode);
    if (!room || room.size === 0) {
        // Device not connected — discard alert and reset dedup window
        proximityDedup.delete(dedupKey);
        return;
    }

    // Step 2: Check deduplication window (30 seconds)
    const lastEmitted = proximityDedup.get(dedupKey);
    if (lastEmitted) {
        const elapsed = Date.now() - lastEmitted;
        if (elapsed < 30000) {
            // Within 30s dedup window — skip
            return;
        }
    }

    // Step 3: Build payload and emit
    const timestamp = new Date().toISOString();
    const payload = {
        zoneName: zone.name,
        distance: Math.floor(distance),
        deviceCode,
        timestamp
    };

    io.to(deviceCode).emit('proximity_alert', payload);

    // Step 4: Store dedup timestamp
    proximityDedup.set(dedupKey, Date.now());

    // Step 5: Save alert event to database
    try {
        await AlertEvent.create({
            deviceCode,
            zoneId: zone.id,
            zoneName: zone.name,
            alertType: 'proximity',
            distance: Math.floor(distance),
            timestamp
        });
    } catch (error) {
        console.error('[AlertService] Failed to save proximity alert event:', error.message);
    }
};

/**
 * Emit a zone breach alert via Socket.IO and save to AlertEvent table.
 * Called when a device is detected inside a zone polygon.
 * 
 * @param {string} deviceCode - Device identifier
 * @param {object} zone - Zone object { id, name }
 * @param {object} position - { lat, lng }
 * 
 * Validates: Requirements 6.1, 6.2
 */
const emitBreachAlert = async (deviceCode, zone, position) => {
    const timestamp = new Date().toISOString();
    const payload = {
        zoneName: zone.name,
        zoneId: zone.id,
        deviceCode,
        lat: position.lat,
        lng: position.lng,
        timestamp
    };

    // Emit via Socket.IO to device room
    if (io) {
        io.to(deviceCode).emit('zone_breach', payload);
    }

    // Save to AlertEvent table
    try {
        await AlertEvent.create({
            deviceCode,
            zoneId: zone.id,
            zoneName: zone.name,
            alertType: 'breach',
            deviceLat: position.lat,
            deviceLng: position.lng,
            timestamp
        });
    } catch (error) {
        console.error(`[AlertService] Failed to save breach alert event for device ${deviceCode}, zone ${zone.id}:`, error.message);
    }
};

/**
 * Emit a zone exit alert via Socket.IO and save to AlertEvent table.
 * Called when a device that was previously inside a zone is now outside.
 * Clears the breach interval for this device-zone.
 * 
 * @param {string} deviceCode - Device identifier
 * @param {object} zone - Zone object { id, name }
 * 
 * Validates: Requirements 6.4
 */
const emitExitAlert = async (deviceCode, zone) => {
    const timestamp = new Date().toISOString();
    const payload = {
        zoneName: zone.name,
        zoneId: zone.id,
        deviceCode,
        timestamp
    };

    // Emit via Socket.IO to device room
    if (io) {
        io.to(deviceCode).emit('zone_exit', payload);
    }

    // Clear the breach interval for this device-zone
    clearBreachInterval(deviceCode, zone.id);

    // Save to AlertEvent table
    try {
        await AlertEvent.create({
            deviceCode,
            zoneId: zone.id,
            zoneName: zone.name,
            alertType: 'exit',
            timestamp
        });
    } catch (error) {
        console.error(`[AlertService] Failed to save exit alert event for device ${deviceCode}, zone ${zone.id}:`, error.message);
    }
};

/**
 * Start a breach re-evaluation interval for a device-zone combination.
 * Re-emits breach alert every 30 seconds with last known position.
 * Auto-clears after 90 seconds (3 × 30s) with no new telemetry.
 * 
 * @param {string} deviceCode - Device identifier
 * @param {string} zoneId - Zone identifier
 * 
 * Validates: Requirements 6.3
 */
const startBreachInterval = (deviceCode, zoneId) => {
    const key = `${deviceCode}:${zoneId}`;

    // Only start if no existing interval for this key
    const entry = activeBreaches.get(key);
    if (!entry || entry.intervalId) {
        return;
    }

    const intervalId = setInterval(async () => {
        const currentEntry = activeBreaches.get(key);
        if (!currentEntry) {
            clearInterval(intervalId);
            return;
        }

        // If no new telemetry for more than 90s (3 × 30s), stop re-emitting
        if (Date.now() - currentEntry.lastTelemetryAt > 90000) {
            clearBreachInterval(deviceCode, zoneId);
            return;
        }

        // Re-emit breach alert with last known position
        const zone = zoneCache.get(zoneId);
        if (zone) {
            await emitBreachAlert(deviceCode, zone, { lat: currentEntry.lat, lng: currentEntry.lng });
        }
    }, 30000);

    // Update entry with intervalId
    entry.intervalId = intervalId;
    activeBreaches.set(key, entry);
};

/**
 * Clear breach interval and remove from activeBreaches Map.
 * 
 * @param {string} deviceCode - Device identifier
 * @param {string} zoneId - Zone identifier
 */
const clearBreachInterval = (deviceCode, zoneId) => {
    const key = `${deviceCode}:${zoneId}`;
    const entry = activeBreaches.get(key);

    if (entry) {
        if (entry.intervalId) {
            clearInterval(entry.intervalId);
        }
        activeBreaches.delete(key);
    }
};

/**
 * Clear all active breaches for a specific zone.
 * Called when a zone is deleted — emits exit alerts to all active breaches
 * for that zone and clears their intervals.
 * 
 * @param {string} zoneId - Zone identifier to clear
 * 
 * Validates: Requirements 3.3
 */
export const clearAllBreachesForZone = async (zoneId) => {
    const zone = zoneCache.get(zoneId);
    const keysToRemove = [];

    for (const [key] of activeBreaches.entries()) {
        if (key.endsWith(`:${zoneId}`)) {
            keysToRemove.push(key);
        }
    }

    for (const key of keysToRemove) {
        const deviceCode = key.split(':')[0];
        if (zone) {
            await emitExitAlert(deviceCode, zone);
        } else {
            // Zone already removed from cache, just clear the interval
            clearBreachInterval(deviceCode, zoneId);
        }
    }
};

/**
 * Main entry point from MQTT handler.
 * Evaluates a device's position against all cached alert zones.
 * 
 * Flow:
 * 1. Validate coordinates (skip if invalid)
 * 2. If zoneCache is empty, skip
 * 3. Call calculateDistances via PostGIS
 * 4. Process breach/exit logic for each zone
 * 5. Process proximity alerts for zones where device is outside but within warningRadius
 * 
 * @param {string} deviceCode - Device identifier
 * @param {number} lat - Device latitude
 * @param {number} lng - Device longitude
 * @returns {Array|null} Distance calculation results, or null if skipped
 * 
 * Validates: Requirements 5.1, 5.2, 5.4, 5.5, 6.1, 6.4, 6.5
 */
export const evaluatePosition = async (deviceCode, lat, lng) => {
    // Step 1: Validate coordinates
    if (!isValidCoordinates(lat, lng)) {
        console.warn(`[AlertService] Invalid coordinates for device ${deviceCode}: lat=${lat}, lng=${lng}`);
        return null;
    }

    // Step 2: Skip if no zones cached
    if (zoneCache.size === 0) {
        return null;
    }

    // Step 3: Calculate distances using PostGIS
    const distances = await calculateDistances(lat, lng);

    if (distances.length === 0) {
        return distances;
    }

    // Step 4: Process breach and exit logic
    // Collect current zone IDs where device is inside
    const currentInsideZoneIds = new Set();

    for (const result of distances) {
        const key = `${deviceCode}:${result.id}`;

        if (result.isInside) {
            currentInsideZoneIds.add(result.id);

            if (!activeBreaches.has(key)) {
                // New breach: add to tracking, emit alert, start interval
                const zone = { id: result.id, name: result.name };
                const position = { lat, lng };

                activeBreaches.set(key, {
                    intervalId: null,
                    lastTelemetryAt: Date.now(),
                    lat,
                    lng
                });

                await emitBreachAlert(deviceCode, zone, position);
                startBreachInterval(deviceCode, result.id);
            } else {
                // Already in breach: update lastTelemetryAt and position
                const entry = activeBreaches.get(key);
                entry.lastTelemetryAt = Date.now();
                entry.lat = lat;
                entry.lng = lng;
                activeBreaches.set(key, entry);
            }
        }
    }

    // Step 5: Detect exits — device WAS inside but now is outside
    // Collect keys first to avoid modifying Map during iteration
    const exitKeys = [];
    for (const [key] of activeBreaches.entries()) {
        if (!key.startsWith(`${deviceCode}:`)) continue;
        const zoneId = key.split(':')[1];
        if (!currentInsideZoneIds.has(zoneId)) {
            exitKeys.push({ key, zoneId });
        }
    }

    for (const { zoneId } of exitKeys) {
        const zone = zoneCache.get(zoneId);
        if (zone) {
            await emitExitAlert(deviceCode, zone);
        } else {
            // Zone no longer in cache, just clear
            clearBreachInterval(deviceCode, zoneId);
        }
    }

    // Step 6: Process proximity alerts for zones where device is NOT inside
    for (const result of distances) {
        if (!result.isInside && result.distance <= result.warningRadius) {
            await emitProximityAlert(deviceCode, { id: result.id, name: result.name }, result.distance);
        }
    }

    return distances;
};

// Export for testing purposes
export const getZoneCache = () => zoneCache;
export const getIo = () => io;
export const getProximityDedup = () => proximityDedup;
export const getActiveBreaches = () => activeBreaches;
