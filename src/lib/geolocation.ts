/**
 * Calculates the great-circle distance between two geographic coordinates using the Haversine formula.
 * @param lat1 Latitude of point 1 in degrees
 * @param lon1 Longitude of point 1 in degrees
 * @param lat2 Latitude of point 2 in degrees
 * @param lon2 Longitude of point 2 in degrees
 * @returns distance in meters rounded to nearest integer
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export interface ProximityValidationResult {
  isWithinRadius: boolean;
  distanceMeters: number;
  allowedRadiusMeters: number;
  excessMeters: number;
  classroomName?: string;
}

/**
 * Validates whether student GPS coordinates are within the classroom geofence
 */
export function validateLocationProximity(
  studentLat: number,
  studentLon: number,
  classroomLat: number,
  classroomLon: number,
  radiusMeters: number,
  classroomName?: string
): ProximityValidationResult {
  const distanceMeters = calculateDistanceMeters(
    studentLat,
    studentLon,
    classroomLat,
    classroomLon
  );
  const isWithinRadius = distanceMeters <= radiusMeters;
  const excessMeters = Math.max(0, distanceMeters - radiusMeters);

  return {
    isWithinRadius,
    distanceMeters,
    allowedRadiusMeters: radiusMeters,
    excessMeters,
    classroomName,
  };
}

/**
 * Formats a distance in meters to a human-readable string
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
}

/**
 * Gets the current user's GPS coordinates using Browser Geolocation API
 */
export async function getCurrentCoordinates(): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Browser Geolocation API is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        let msg = 'Unable to retrieve your current location via Browser Geolocation API.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Location permission was denied. Please allow location access in your browser settings to verify attendance.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Location information is unavailable from your device GPS sensors.';
            break;
          case error.TIMEOUT:
            msg = 'Location request timed out while contacting GPS satellites.';
            break;
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Institutional Campus locations preset for classes and sessions
 */
export const CAMPUS_PRESETS = [
  {
    name: 'Turing Computer Lab (Science Bldg 3F)',
    latitude: 51.5074,
    longitude: -0.1278,
    radiusMeters: 80,
  },
  {
    name: 'Main Auditorium Hall A',
    latitude: 51.5078,
    longitude: -0.1282,
    radiusMeters: 120,
  },
  {
    name: 'Engineering Block Rm 204',
    latitude: 51.5069,
    longitude: -0.1265,
    radiusMeters: 60,
  },
  {
    name: 'Innovation Tech Hub Lecture Hall',
    latitude: 51.5085,
    longitude: -0.129,
    radiusMeters: 100,
  },
];

/**
 * Test location simulation presets (for interactive testing of radius verification)
 */
export const SIMULATED_LOCATIONS = [
  {
    id: 'inside_front_row',
    label: 'Inside Lecture Hall (Front Row ~8m)',
    description: 'Directly in front of instructor projector (Within geofence)',
    offsetLat: 0.00005,
    offsetLon: 0.00004,
    expectedStatus: 'VALID',
  },
  {
    id: 'inside_back_row',
    label: 'Inside Classroom (Back Row ~35m)',
    description: 'At the rear exit of the classroom (Within geofence)',
    offsetLat: 0.00025,
    offsetLon: 0.0002,
    expectedStatus: 'VALID',
  },
  {
    id: 'hallway_adjacent',
    label: 'Hallway Just Outside Room (~65m)',
    description: 'Near water cooler in hallway (Borderline geofence)',
    offsetLat: 0.00045,
    offsetLon: 0.0004,
    expectedStatus: 'VALID',
  },
  {
    id: 'campus_cafeteria',
    label: 'Campus Cafeteria (~220m Out of Bounds)',
    description: 'Student center eating area (Exceeds radius - REJECTS)',
    offsetLat: 0.0016,
    offsetLon: 0.0014,
    expectedStatus: 'REJECTED',
  },
  {
    id: 'campus_library',
    label: 'Central Library (~450m Out of Bounds)',
    description: 'Main library 2nd floor (Exceeds radius - REJECTS)',
    offsetLat: 0.0035,
    offsetLon: 0.0028,
    expectedStatus: 'REJECTED',
  },
  {
    id: 'off_campus_dorm',
    label: 'Off-Campus Residence (~1.8km Out of Bounds)',
    description: 'Student dorm apartment (Exceeds radius - REJECTS)',
    offsetLat: 0.013,
    offsetLon: 0.011,
    expectedStatus: 'REJECTED',
  },
];
