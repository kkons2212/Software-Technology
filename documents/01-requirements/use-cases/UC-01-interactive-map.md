
# Use Case Specification: UC-01

<img width="600" alt="Use case" src="https://github.com/user-attachments/assets/904b7450-4a54-4f6f-90bf-b59582867604" />


# UC-1.1: View Map & Outdoor GPS Positioning

| Field | Content |
|---|---|
| Use Case Number: | UC-1.1 |
| Use Case Name: | View Map & Outdoor GPS Positioning |
| Actor(s): | Visitor |
| Maturity: | Focused |
| Summary: | The Visitor views the outdoor museum map and tracks their current real-time location via GPS positioning. |
| Basic Course of Events: | **Actor Action**<br>1. The use case begins when the Visitor selects the "Map" feature on the web application.<br><br>**System Response**<br>2. The system requests location permission and retrieves the device's current GPS coordinates. A1.<br>3. The system verifies that the coordinates are within the museum grounds, loads the outdoor map, and displays the current location marker along with outdoor POI markers. A2, E1<br><br>**Actor Action**<br>4. The Visitor performs zoom in, zoom out, or pan gestures on the map. (Repeat as many times as necessary.)<br><br>**System Response**<br>5. The system updates the outdoor map viewport accordingly. |
| Alternative Paths: | **A1: Location Permission Denied or GPS Disabled**<br>**Actor Action**<br>1. The Visitor denies location permission on the browser prompt or has device GPS disabled.<br><br>**System Response**<br>2. The system displays a notification: "Unable to get current location. Defaulting to Main Entrance."<br>3. The system loads the outdoor map centered at the Main Entrance.<br>4. Return to step 4 of the Basic Course of Events.<br><br>**A2: GPS coordinates within the POI's geofence**<br>**System Response**<br>1. The system displays a notice and automatically centers the map at the Main Entrance.<br>2. Return to step 4 of Basic Course of Events. |
| Exception Paths: | None. |
| Extension Points: | None. |
| Triggers: | Visitor wishes to view the outdoor museum layout and their current position. |
| Assumptions: | The Visitor's mobile browser supports the standard HTML5 Geolocation API. |
| Preconditions: | The web application is active on the Visitor's mobile browser. |
| Postconditions: | The interactive outdoor map and the Visitor's current location marker (or default Main Entrance marker) are displayed on the screen. |
## Activity Diagram
<img width="700" alt="Activity Diagram 1 1" src="https://github.com/user-attachments/assets/6df89140-1671-45fe-9f11-0723f6efc2f0" />


---

# UC-1.2: View Exhibit POI Information

| Field | Content |
|---|---|
| Use Case Number: | UC-1.2 |
| Use Case Name: | View Exhibit POI Information |
| Actor(s): | Visitor |
| Maturity: | Focused |
| Summary: | The Visitor taps on an exhibit Point of Interest (POI) marker on the outdoor map to view a preview card, get directions to the location, or replay the narration if the POI was previously triggered via proximity. |
| Basic Course of Events: | **Actor Action**<br>1. The use case begins when the Visitor taps an exhibit marker (POI Marker) on the outdoor map.<br><br>**System Response**<br>2. The system queries the database for the corresponding exhibit basic details and checks whether the Visitor has previously entered the POI's proximity trigger radius.<br>3. The system highlights the selected marker and displays a bottom preview card containing: exhibit name, thumbnail image, a "Directions" button, and a "Replay Audio" button (visible or enabled only if the POI was already triggered).<br><br>**Actor Action**<br>4. The Visitor selects the "Directions" button to navigate toward the exhibit location. A1, A2, A3<br><br>**System Response**<br>5. The system calculates and displays the navigation route from the Visitor's current GPS location to the selected POI on the outdoor map. |
| Alternative Paths: | **A1: Replay exhibit audio (Post-trigger)**<br>1. If the Visitor has already triggered the POI by entering its proximity radius, the Visitor selects the "Replay Audio" button on the preview card.<br>2. The system plays the exhibit audio narration again.<br>3. The use case ends.<br><br>**A2: Select another POI marker**<br>1. The Visitor selects another POI marker on the map to update the preview card with a different exhibit's information.<br>2. Return to step 2 of Basic Course of Events.<br><br>**A3: Close preview card**<br>1. The Visitor taps on an empty area of the map to close the preview card.<br>2. The use case ends. |
| Exception Paths: | None. |
| Extension Points: | None. |
| Triggers: | Visitor taps on a specific POI marker displayed on the outdoor map. |
| Assumptions: | Outdoor POI GPS coordinates, trigger radius, and exhibit metadata are pre-configured in the database. |
| Preconditions: | The outdoor map and POI markers are currently displayed on the Visitor's screen. |
| Postconditions: | The exhibit preview card is displayed, the navigation route to the POI is rendered on the map, or the previously triggered exhibit audio is replayed. |

## Activity Diagram
<img width="851" height="857" alt="UC 1 2" src="https://github.com/user-attachments/assets/5c7b7e39-c713-4627-9edf-3e186e11e98d" />

---

# UC-1.3: View Recommended Tour Route

| Field | Content |
|---|---|
| Use Case Number: | UC-1.3 |
| Use Case Name: | View Recommended Tour Route |
| Actor(s): | Visitor |
| Maturity: | Focused |
| Summary: | The Visitor views the suggested navigation route from their current outdoor location to a selected exhibit or along the standard museum tour route. |
| Basic Course of Events: | **Actor Action**<br>1. The use case begins when the Visitor selects the "Directions" button on a POI preview card (or activates the "Recommended Route" toggle on the map). .<br><br>**System Response**<br>2. The system retrieves the starting point (Visitor's current GPS location) and the target POI coordinates. A1<br>3. The system calculates the walking distance and draws a polyline route connecting the starting point to the destination on the map.<br>4. The system displays the visual route overlay along with the estimated walking distance in meters. |
| Alternative Paths: | **A1: Clear Route**<br>**Actor Action**<br>1. The Visitor selects "Clear Route" on the map screen to remove the polyline overlay and return to the standard map view.<br>2. The use case ends. |
| Exception Paths: | None. |
| Extension Points: | None. |
| Triggers: | Visitor wishes to see the walking path to a specific outdoor exhibit or follow the suggested tour sequence. |
| Assumptions: | Walking distances are calculated using the Haversine formula or predefined outdoor pathway nodes. |
| Preconditions: | The outdoor interactive map screen is active. |
| Postconditions: | The recommended polyline route and estimated walking distance are rendered on the outdoor map. |

## Activity Diagram
<img width="600" alt="Activity Diagram 1 3" src="https://github.com/user-attachments/assets/b47ca24f-295e-425d-a31d-4a225945c3bd" />

