import { AlertZone } from '../models/index.js';
import * as alertService from './alertService.js';

class ServiceError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = "ServiceError";
        this.statusCode = statusCode;
    }
}

/**
 * Validate zone input data.
 * Only validates fields that are present in data (supports partial updates).
 */
const validateZoneInput = (data, isPartial = false) => {
    if (data.name !== undefined) {
        if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
            throw new ServiceError("Name must be between 1 and 100 characters", 400);
        }
        if (data.name.length > 100) {
            throw new ServiceError("Name must be between 1 and 100 characters", 400);
        }
    } else if (!isPartial) {
        throw new ServiceError("Name must be between 1 and 100 characters", 400);
    }

    if (data.polygon !== undefined) {
        if (!data.polygon || !data.polygon.coordinates || !Array.isArray(data.polygon.coordinates)) {
            throw new ServiceError("Polygon must have between 3 and 50 points", 400);
        }
        const ring = data.polygon.coordinates[0];
        if (!ring || !Array.isArray(ring)) {
            throw new ServiceError("Polygon must have between 3 and 50 points", 400);
        }
        // GeoJSON Polygon repeats first point at end, so actual points = ring.length - 1
        const numPoints = ring.length - 1;
        if (numPoints < 3 || numPoints > 50) {
            throw new ServiceError("Polygon must have between 3 and 50 points", 400);
        }
    } else if (!isPartial) {
        throw new ServiceError("Polygon must have between 3 and 50 points", 400);
    }

    if (data.warningRadius !== undefined) {
        const radius = data.warningRadius;
        if (!Number.isInteger(radius) || radius < 50 || radius > 5000) {
            throw new ServiceError("Warning radius must be between 50 and 5000 meters", 400);
        }
    } else if (!isPartial) {
        throw new ServiceError("Warning radius must be between 50 and 5000 meters", 400);
    }
};

/**
 * Create a new alert zone.
 */
export const createZone = async (data) => {
    validateZoneInput(data, false);

    // Check duplicate name
    const existing = await AlertZone.findOne({ where: { name: data.name } });
    if (existing) {
        throw new ServiceError("Alert zone with this name already exists", 409);
    }

    const zone = await AlertZone.create({
        name: data.name,
        polygon: data.polygon,
        warningRadius: data.warningRadius
    });

    alertService.onZoneChanged();

    return zone;
};

/**
 * Update an existing alert zone (partial update).
 */
export const updateZone = async (id, data) => {
    const zone = await AlertZone.findByPk(id);
    if (!zone) {
        throw new ServiceError("Alert zone not found", 404);
    }

    validateZoneInput(data, true);

    // Check duplicate name if name is being updated
    if (data.name !== undefined && data.name !== zone.name) {
        const existing = await AlertZone.findOne({ where: { name: data.name } });
        if (existing) {
            throw new ServiceError("Alert zone with this name already exists", 409);
        }
    }

    // Build update object with only provided fields
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.polygon !== undefined) updateData.polygon = data.polygon;
    if (data.warningRadius !== undefined) updateData.warningRadius = data.warningRadius;

    await zone.update(updateData);

    alertService.onZoneChanged();

    return zone;
};

/**
 * Delete an alert zone by ID.
 */
export const deleteZone = async (id) => {
    const zone = await AlertZone.findByPk(id);
    if (!zone) {
        throw new ServiceError("Alert zone not found", 404);
    }

    await zone.destroy();

    await alertService.clearAllBreachesForZone(id);
    alertService.onZoneChanged();
};

/**
 * Get all alert zones.
 */
export const getAllZones = async () => {
    const zones = await AlertZone.findAll({
        order: [['createdAt', 'DESC']]
    });
    return zones;
};

/**
 * Get a single alert zone by ID.
 */
export const getZoneById = async (id) => {
    const zone = await AlertZone.findByPk(id);
    if (!zone) {
        throw new ServiceError("Alert zone not found", 404);
    }
    return zone;
};

export { ServiceError };
