import { useEffect, useState } from 'react';

export const MAIN_ENTRANCE = { lat: 11.1432, lng: 106.4631 };
export const MUSEUM_BOUNDS = {
  minLat: 11.135,
  maxLat: 11.155,
  minLng: 106.45,
  maxLng: 106.475,
};

const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0,
};

function isWithinMuseumBounds(latitude, longitude) {
  return latitude >= MUSEUM_BOUNDS.minLat
    && latitude <= MUSEUM_BOUNDS.maxLat
    && longitude >= MUSEUM_BOUNDS.minLng
    && longitude <= MUSEUM_BOUNDS.maxLng;
}

function getGeolocationErrorMessage(error) {
  if (error?.code === 1) {
    return 'Location permission is unavailable. Showing the map from the Main Entrance.';
  }

  if (error?.code === 2) {
    return 'Your current location could not be determined. Showing the map from the Main Entrance.';
  }

  if (error?.code === 3) {
    return 'Locating you took too long. Showing the map from the Main Entrance.';
  }

  return 'Location is unavailable. Showing the map from the Main Entrance.';
}

export default function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const geolocation = navigator.geolocation;

    if (!geolocation?.watchPosition) {
      setLocation(MAIN_ENTRANCE);
      setAccuracy(null);
      setErrorMessage('This browser does not support location. Showing the map from the Main Entrance.');
      return undefined;
    }

    const watchId = geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy: positionAccuracy } = position.coords;
        if (!isWithinMuseumBounds(latitude, longitude)) {
          setLocation(MAIN_ENTRANCE);
          setAccuracy(null);
          setErrorMessage('You are outside the museum grounds. Showing the map from the Main Entrance.');
          return;
        }

        setLocation({ lat: latitude, lng: longitude });
        setAccuracy(positionAccuracy);
        setErrorMessage('');
      },
      (error) => {
        setLocation(MAIN_ENTRANCE);
        setAccuracy(null);
        setErrorMessage(getGeolocationErrorMessage(error));
      },
      GEOLOCATION_OPTIONS,
    );

    return () => geolocation.clearWatch(watchId);
  }, []);

  return {
    location: location ?? MAIN_ENTRANCE,
    accuracy,
    errorMessage,
    hasLiveLocation: location !== null && errorMessage === '',
  };
}
