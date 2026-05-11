export const GET_TRACKING_DISTANCE_QUERY = `
    SELECT COALESCE(
        ST_Length(ST_MakeLine(location::geometry ORDER BY timestamp)::geography),
        0
    ) AS distance
    FROM "Trackings"
    WHERE "deviceId" = :deviceId AND "timestamp" BETWEEN :from AND :to
`;
