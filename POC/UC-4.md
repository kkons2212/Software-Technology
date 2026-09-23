# UC-04: Manage Exhibits / POIs (CRUD)

## Document Metadata
  

<p align="center">
    <img width="765" height="286" alt="Use Case Diagram1" src="https://github.com/user-attachments/assets/376dc412-daec-4cc8-8290-37cf765279a3" />
</p>

| Field | Details |
| :--- | :--- |
| **Use Case ID** | UC-04 |
| **Use Case Name** | Manage Exhibits / POIs (CRUD) |
| **Primary Actor** | Admin / Museum Staff |
| **Maturity** | Focused |
| **Author(s)** | @Phatnguyen3003 |
| **Date** | September 21, 2026 |

---

## Overview

* **Summary:** Admin/Museum staff want to add, configure, and manage the exhibits and presentation of the museum.
* **Triggers:** Actor wants to add, edit, or delete current exhibition and presentation details for the museum.
* **Postconditions:** The updated exhibition information is saved into stored data.

---

## Flow of Events

### 1. Main Event Scenario (Create POI)

| Step | Actor Action | System Response |
| :---: | :--- | :--- |
| **1** | Perform `{Login Authentication}`. | — |
| **2** | — | System displays welcome page with main features for actor to choose from. |
| **3** | The use case begins when Admin/Museum staff actor selects to add, edit, or delete current exhibition and presentation. | — |
| **4** | — | System queries the database and displays the POI Management table (list of existing POIs with thumbnail, title, coordinates, and action buttons). |
| **5** | Admin/Museum staff chooses to add a new POI, or edit/delete an existing POI (`A1`, `A2`). | — |
| **6** | Admin clicks **"Add New POI"**, enters required details (Title, primary text description in Vietnamese, map coordinates), uploads images, and clicks **Save**. | — |
| **7** | — | Validate input data (required fields, image format/size, coordinate boundaries). `[E1]` |
| **8** | — | Upload image to Storage Service and write new POI record to Centralized Database. |
| **9** | — | Automatically trigger background processing pipelines:<br>1) Trigger **UC-08: Auto-translate POI Content** (translates content into target languages).<br>2) Trigger **UC-09: Auto-generate & Cache Audio Files** (generates `.mp3` audio files). |
| **10** | — | Display success notification: *"POI created successfully. Background translation and audio generation initiated."* |
| **11** | — | Refresh and display updated POI list view. Use case ends. |

---

### 2. Alternative Paths

#### `A1: Edit POI`

| Step | Actor Action | System Response |
| :---: | :--- | :--- |
| **1** | Admin locates a POI in the list and clicks **Edit**. | — |
| **2** | — | System retrieves current POI data and populates the edit form. |
| **3** | Admin modifies content (Title, primary text description, coordinates, or uploads a new image) and clicks **Update**. | — |
| **4** | — | System validates input data. `[E1]` |
| **5** | — | System updates the POI record in the database and updates stored media files (if a new file was uploaded). |
| **6** | — | System re-triggers **UC-08** and **UC-09** to regenerate localized translations and audio files for updated text. |
| **7** | — | System displays success notification (*"POI updated successfully"*), then proceeds to **Step 11 of the Main Event**. |

#### `A2: Delete POI`

| Step | Actor Action | System Response |
| :---: | :--- | :--- |
| **1** | Admin locates a POI in the list and clicks **Delete**. | — |
| **2** | — | System displays a confirmation dialog (*"Are you sure you want to delete this POI and its associated audio/translation files?"*). |
| **3** | Admin clicks **Confirm**. | — |
| **4** | — | System soft-deletes or removes the POI record from the database and updates related reference mappings. |
| **5** | — | System displays success notification (*"POI deleted successfully"*), then proceeds to **Step 11 of the Main Event**. |

---

### 3. Exception Paths

#### `E1: Input Validation Error`

* **System Behavior:**
  1. System highlights invalid or missing fields (e.g., missing description text, coordinates outside map boundaries, unsupported image format or oversized file).
  2. System displays error message prompting Admin to correct the inputs.
  3. System retains already entered form data and waits for Admin to resubmit (Returns to **Step 6** of Main Event or **Step 3** of A1).




### Activity Diagram

<p align="center">
    
   <img width="726" height="907" alt="Activity Diagram1" src="https://github.com/user-attachments/assets/68c19f1b-4f4a-42be-8906-9d4f39d1e7a8" />

</p>