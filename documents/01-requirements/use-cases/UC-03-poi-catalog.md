<p align="center">
<img width="375" height="314" alt="Use Case Diagram1" src="https://github.com/user-attachments/assets/c8168f1b-76b1-4c8d-b12e-e044eae1d6bb" />


</p>


# UC-3.1: Edit POI Content & Metadata

| Field | Content |
|---|---|
| Use Case Number: | UC-3.1 |
| Use Case Name: | Edit POI Content, Metadata and POI visibility |
| Actor(s): | Admin |
| Maturity: | Focused |
| Summary: | Allows Admin to select an existing exhibit (POI) and edit its display text content and media images. |
| Basic Course of Events: | **Actor Action**<br>1. Admin navigates to the POI management list and selects an exhibit to edit.<br><br>**System Response**<br>2. The system retrieves POI data and displays the edit form with current metadata and thumbnail.<br><br>**Actor Action**<br> 3. Admin updates exhibit details such as title, detailed description, category, or media image.<br> 4. Admin updates exhibit's visibility.**A1**<br>4. Admin clicks "Save Changes".<br><br>**System Response**<br>5. The system validates all input fields.**E1** <br>6. The system updates the POI content and congiuration in the database, and displays a success notification. |
| Alternative Paths: | A1: Staff cancels the editing session.<br>**Actor Action**<br>1. The system prompts for confirmation if unsaved changes exist.<br><br>**System Response**<br>2. Staff confirms cancellation, and the system discards all modifications.<br>3. Return to step 1 |
| Exception Paths: | E1: required field is empty <br>**System Response**<br>1. The system highlights the empty fields, displays an error message, and retains entered data.<br>2. Return to step 3 |
| Extension Points: | None. |
| Triggers: | Admin wished to editing the content of a POI. |
| Assumptions: | None. |
| Preconditions: | Staff is authenticated with Admin or Staff privileges; the POI exists in the database. |
| Postconditions: | Updated exhibit content and media details are saved in the database. |

## Activity Diagram
<p align="center">

<img width="979" height="1092" alt="Activity Diagram1" src="https://github.com/user-attachments/assets/ab5ee7e3-bcdf-4bd8-9d91-c1cc41eca740" />

</p>

---

# UC-3.2: Configure GPS Coordinates & Geofence Radius

| Field | Content |
|---|---|
| Use Case Number: | UC-3.2 |
| Use Case Name: | Configure GPS Coordinates & Geofence Radius |
| Actor(s): | Admin |
| Maturity: | Focused |
| Summary: | Allows Admin or Admin to configure an exhibit's precise GPS geographical coordinates (latitude, longitude) and proximity geofence radius via an interactive map picker or manual coordinate input for automated outdoor visitor detection. |
| Basic Course of Events: | **Actor Action**<br>1. Admin selects an existing exhibit to configure its location.<br><br>**System Response**<br> 2.The system displays the current GPS pin plotted on an interactive map.<br><br>**Actor Action**<br> 3. Admin adjusts the exhibit's GPS position by clicking or dragging the pin on the interactive map, or typing latitude/longitude directly into the coordinate fields.<br><br>**System Response**<br>4. The system updates the map pin in real time, displays the circular geofence boundary.<br><br>**Actor Action**<br>5. Admin adjusts the proximity trigger radius (e.g., default 15 meters).<br>6. Admin clicks "Save Changes".<br><br>**System Response**<br>7. The system validates all input fields.**E1**<br>  8.The system updates the GPS coordinates and geofence radius in the database, invalidates existing route caches, and displays a success notification. |
| Alternative Paths: | None. |
| Exception Paths: | E1: The selected GPS coordinates fall outside the designated museum grounds (not in museum border)<br>1. The system displays a boundary warning and prevents submission.<br>2. Return to step 3 |
| Extension Points: | None. |
| Triggers: | Admin wished to editing the location of a POI. |
| Assumptions: | None. |
| Preconditions: | Staff is authenticated with Admin or Staff privileges; the POI exists in the database. |
| Postconditions: | Updated GPS coordinates and geofence radius are saved; the visitor outdoor map updates the POI pin and walking directions accordingly. |

## Activity Diagram
<p align="center">

<img width="991" height="1023" alt="Activity Diagram2" src="https://github.com/user-attachments/assets/64873d0d-4821-4a8a-8971-259951da17a9" />


</p>

# UC-3.3: Configure GPS Coordinates & Geofence Radius

| Field | Content |
|---|---|
| Use Case Number: | UC-3.3 |
| Use Case Name: | Adding POI |
| Actor(s): | Admin |
| Maturity: | Focused |
| Summary: | Allows Admin to add new exhibit item into the system with all the content, information, image,..  |
| Basic Course of Events: | **Actor Action**<br>1. Admin selects "Add new POI" feature.<br><br>**System Response**<br> 2. The system display adding new POI form.<br><br>**Actor Action**<br> 3. Admin type in POI contents and adding image.<br>4. Admin choose the location of POI on the map. <br><br>**System Response**<br>5. The system updates the map pin in real time, displays the circular geofence boundary.<br><br>**Actor Action**<br>6. Admin adjusts the proximity trigger radius.<br>7. Admin clicks "Save Changes".<br><br>**System Response**<br>8. The system validates all input fields.**E1, E2**<br>  9.The system add new POI information in the database and displays a success notification. |
| Alternative Paths: | None. |
| Exception Paths: | E1: required field is empty <br>**System Response**<br>1. The system highlights the empty fields, displays an error message, and retains entered data.<br>2. Return to step 3<br><br>E2: The selected GPS coordinates fall outside the designated museum grounds (not in museum border)<br>1. The system displays a boundary warning and prevents submission.<br>2. Return to step 4 |
| Extension Points: | None. |
| Triggers: | Admin wished to adding new POI. |
| Assumptions: | None. |
| Preconditions: | Staff is authenticated with Admin;|
| Postconditions: | New POI record is saved in database; |

## Activity Diagram
<p align="center">

<img width="986" height="1448" alt="Activity Diagram1" src="https://github.com/user-attachments/assets/7179f5ec-2a79-4e71-bb05-fec6583c73c5" />

</p>


