/**
 * useGeofenceTrigger.js
 * Geofence Proximity Detection Engine hook for Cu Chi Tunnels POIs.
 * Continuously computes Haversine distance from visitor coordinates to active POIs,
 * enforcing individual POI trigger radii (10m - 50m) and 10-minute cooldown locks.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { calculateHaversineDistance } from '../utils/haversine.js';
import { isCooldownActive, setCooldown, DEFAULT_COOLDOWN_DURATION_MS } from '../services/cooldownService.js';

// Top-of-file module constants per dev_rules.md
export const DEFAULT_TRIGGER_RADIUS_METERS = 30;
export const MIN_TRIGGER_RADIUS_METERS = 10;
export const MAX_TRIGGER_RADIUS_METERS = 50;

/**
 * Custom hook to detect when a visitor enters a POI's geofence boundary.
 *
 * @param {Object} params
 * @param {Object | null} params.userLocation - Current GPS coordinates { lat, lng }
 * @param {Array} params.pois - List of POI objects
 * @param {Function} [params.onTrigger] - Callback fired on valid proximity trigger: (poi, distance, options) => void
 * @param {boolean} [params.isUnlocked=true] - Whether visitor holds an active 24h unlocked session
 * @param {string | number | null} [params.currentPlayingPoiId] - ID of currently playing POI
 * @param {number} [params.cooldownDurationMs=600000] - Cooldown lockout duration in ms
 * @returns {Object} { nearestPoi, distanceToNearest, activeGeofencePois, checkGeofence }
 */
export function useGeofenceTrigger({
  userLocation,
  pois = [],
  onTrigger,
  isUnlocked = true,
  currentPlayingPoiId = null,
  cooldownDurationMs = DEFAULT_COOLDOWN_DURATION_MS,
} = {}) {
  const [nearestPoi, setNearestPoi] = useState(null);
  const [distanceToNearest, setDistanceToNearest] = useState(Infinity);
  const [activeGeofencePois, setActiveGeofencePois] = useState([]);

  // Preserve references to prevent infinite re-render cycles
  const poisRef = useRef(pois);
  poisRef.current = pois;

  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  const isUnlockedRef = useRef(isUnlocked);
  isUnlockedRef.current = isUnlocked;

  const currentPlayingPoiIdRef = useRef(currentPlayingPoiId);
  currentPlayingPoiIdRef.current = currentPlayingPoiId;

  const cooldownDurationMsRef = useRef(cooldownDurationMs);
  cooldownDurationMsRef.current = cooldownDurationMs;

  const checkGeofence = useCallback((location) => {
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      setNearestPoi(null);
      setDistanceToNearest(Infinity);
      setActiveGeofencePois([]);
      return null;
    }

    const currentPois = poisRef.current;
    if (!Array.isArray(currentPois) || currentPois.length === 0) {
      setNearestPoi(null);
      setDistanceToNearest(Infinity);
      setActiveGeofencePois([]);
      return null;
    }

    // Filter active POIs only
    const candidatePois = currentPois.filter((poi) => poi && poi.is_active !== false);

    let closestCandidate = null;
    let minDistance = Infinity;
    const inRangeList = [];

    candidatePois.forEach((poi) => {
      const poiLat = poi.latitude ?? poi.lat;
      const poiLng = poi.longitude ?? poi.lng;

      if (typeof poiLat !== 'number' || typeof poiLng !== 'number') return;

      const distance = calculateHaversineDistance(
        { lat: location.lat, lng: location.lng },
        { lat: poiLat, lng: poiLng }
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestCandidate = poi;
      }

      // Determine configured radius (clamped between 10m and 50m, default 30m)
      const configuredRadius =
        typeof poi.trigger_radius === 'number'
          ? Math.max(MIN_TRIGGER_RADIUS_METERS, Math.min(MAX_TRIGGER_RADIUS_METERS, poi.trigger_radius))
          : DEFAULT_TRIGGER_RADIUS_METERS;

      if (distance <= configuredRadius) {
        inRangeList.push({ poi, distance, triggerRadius: configuredRadius });
      }
    });

    setNearestPoi(closestCandidate);
    setDistanceToNearest(minDistance);
    setActiveGeofencePois(inRangeList);

    if (inRangeList.length === 0) {
      return null;
    }

    // Overlapping resolution: prioritize the physically closest POI
    inRangeList.sort((firstPoiEntry, secondPoiEntry) => firstPoiEntry.distance - secondPoiEntry.distance);
    const targetMatch = inRangeList[0];

    // Check 10-minute cooldown debounce lock
    const isLocked = isCooldownActive(targetMatch.poi.id, cooldownDurationMsRef.current);

    if (!isLocked && isUnlockedRef.current) {
      // Apply cooldown lockout
      setCooldown(targetMatch.poi.id);

      if (typeof onTriggerRef.current === 'function') {
        const isAnotherPlaying =
          currentPlayingPoiIdRef.current !== null &&
          currentPlayingPoiIdRef.current !== undefined &&
          String(currentPlayingPoiIdRef.current) !== String(targetMatch.poi.id);

        onTriggerRef.current(targetMatch.poi, targetMatch.distance, {
          shouldPromptSwitch: isAnotherPlaying,
        });
      }
    }

    return targetMatch;
  }, []);

  const prevLocationKeyRef = useRef('');
  useEffect(() => {
    const locKey = userLocation ? `${userLocation.lat},${userLocation.lng}` : '';
    if (locKey !== prevLocationKeyRef.current) {
      prevLocationKeyRef.current = locKey;
      if (userLocation) {
        checkGeofence(userLocation);
      } else {
        setNearestPoi(null);
        setDistanceToNearest(Infinity);
        setActiveGeofencePois([]);
      }
    }
  }, [userLocation, checkGeofence]);

  return {
    nearestPoi,
    distanceToNearest,
    activeGeofencePois,
    checkGeofence,
  };
}

export default useGeofenceTrigger;
