# DFD Displaying file

## Level 1 DFD

<p alt="center">
<img width="6752" height="4380" alt="image" src="https://github.com/user-attachments/assets/76342b35-e3ef-4049-80d3-34c2c0ff8e4c" />
</p>

## Level 2 DFD
## 4.0 Digital Admission Payment & Tour Session Activation
<img width="2200" height="1100" alt="image (4)" src="https://github.com/user-attachments/assets/0286fab6-f9a0-4962-bec2-e46f206c0c66" />



## 5.0 Interactive Map, GPS Geofencing & Smart Wayfinding
<img width="2038" height="1166" alt="DFD 5 0 1" src="https://github.com/user-attachments/assets/3b4d1443-092d-4958-9c29-a8950ec8f19b" />


| Process ID | Subprocess | Business Function | Related Modules |
|---|---|---|---|
| 5.1 | Receive Visitor Request | Accept the visitor's POI/map request, selected language, session token, and destination. | [poi_controller.py](../MVP/backend/app/controllers/poi_controller.py), [poiApi.js](../MVP/frontend/src/api/poiApi.js), [VisitorMapView.jsx](../MVP/frontend/src/views/visitor/VisitorMapView.jsx) |
| 5.2 | Retrieve Active POI Data | Retrieve active POIs, coordinates, and geofence radius. | [poi_service.py](../MVP/backend/app/services/poi_service.py), [poi_repository.py](../MVP/backend/app/repositories/poi_repository.py), [poi.py](../MVP/backend/app/models/poi.py) |
| 5.3 | Retrieve Published Translation and Audio Metadata | Retrieve published localized content and its audio reference for the requested language. | [poi_service.py](../MVP/backend/app/services/poi_service.py), [translation_repository.py](../MVP/backend/app/repositories/translation_repository.py), [translation.py](../MVP/backend/app/models/translation.py), [language_repository.py](../MVP/backend/app/repositories/language_repository.py) |
| 5.4 | Validate Visitor Session | Check whether the visitor session is valid before granting access to protected content or audio. | [poi_service.py](../MVP/backend/app/services/poi_service.py), [session_service.py](../MVP/backend/app/services/session_service.py), [session_repository.py](../MVP/backend/app/repositories/session_repository.py) |
| 5.5 | Apply Content Access Rules | Return teaser content or full POI content according to the visitor's session status. | [poi_service.py](../MVP/backend/app/services/poi_service.py), [ContentPaywallGate.jsx](../MVP/frontend/src/components/visitor/ContentPaywallGate.jsx) |
| 5.6 | Retrieve Map and Location Data | Obtain the visitor's current location and display POIs on the interactive map. | [useGeolocation.js](../MVP/frontend/src/hooks/useGeolocation.js), [InteractiveOsmMap.jsx](../MVP/frontend/src/components/visitor/InteractiveOsmMap.jsx), [VisitorLocationMarker.jsx](../MVP/frontend/src/components/visitor/VisitorLocationMarker.jsx) |
| 5.7 | Detect Geofence and Apply Cooldown | Detect entry into a POI geofence and prevent repeated triggers during the cooldown period. | [useGeofenceTrigger.js](../MVP/frontend/src/hooks/useGeofenceTrigger.js), [cooldownService.js](../MVP/frontend/src/services/cooldownService.js), [VisitorTourPage.jsx](../MVP/frontend/src/views/visitor/VisitorTourPage.jsx) |
| 5.8 | Authorize and Retrieve Audio | Verify audio access and provide the requested narration stream. | [audio_controller.py](../MVP/backend/app/controllers/audio_controller.py), [audio_service.py](../MVP/backend/app/services/audio_service.py), [audio_repository.py](../MVP/backend/app/repositories/audio_repository.py), [AudioPlayerContext.jsx](../MVP/frontend/src/contexts/AudioPlayerContext.jsx) |
| 5.9 | Calculate Walking Route | Calculate a walking route to the selected POI and return route geometry and distance. | [tour_controller.py](../MVP/backend/app/controllers/tour_controller.py), [wayfinding_service.py](../MVP/backend/app/services/wayfinding_service.py), [tourApi.js](../MVP/frontend/src/api/tourApi.js), [RouteOverlay.jsx](../MVP/frontend/src/components/visitor/RouteOverlay.jsx) |
