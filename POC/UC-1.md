# Use Case Specification: UC-02

<p align="center">
  <img src="https://github.com/user-attachments/assets/95f0af27-94cc-44ed-8805-af5d073d5d02" width="650" alt="UC-02 Use Case Diagram">
</p>

---

| Field | Content |
| :--- | :--- |
| **Use Case Number:** | **UC-02** |
| **Use Case Name:** | View Interactive Map & Recommended Routes |
| **Actor(s):** | Visitor|
| **Maturity:** | Focused |
| **Summary:** | Visitors view the museum's interactive map and receive recommended routes based on their last scanned QR code. |

---

### Basic Course of Events

| Actor Action | System Response |
| :--- | :--- |
| **1.** Visitor accesses the Map section or completes a QR code scan. **[A1]** | |
| | **2.** The system retrieves the location marker of the last scanned QR code. |
| | **3.** The system loads the interactive map  and displays the Visitor's current marker. **[E1]** |
| | **4.** The system calculates and displays the recommended route to the next POI/exhibit. |
| **5.** Visitor interacts with the map (zoom, pan, or tap on other POIs). | |
| | **6.** The system updates the map view and displays a preview card for the selected POI. |

---

### Alternative Paths

#### **A1.**
| Actor Action | System Response |
| :--- | :--- |
| **1.** Visitor opens the map without scanning any prior QR code. | |
| | **2.** The system loads the default museum map centered at the Entrance location. |
| | **3.** Return to step 5 of the Basic Course of Events. |

---

### Exception Paths

* **E1:** At step 3, if the network connection fails , the system displays an error message *"Map data unavailable. Please check your network connection."* Returns to Basic Flow step 1.

---

### Supplementary Information

| Field | Content |
| :--- | :--- |
| **Extension Points:** | None |
| **Triggers:** | Visitor taps on the "Map" tab or scans an exhibit's QR code. |
| **Assumptions:** | The museum indoor layout data is pre-configured and mapped accurately in the system database. |
| **Preconditions:** | The Web Application is active on the Visitor's mobile browser. |
| **Post Conditions:** | The interactive map and recommended route are displayed to the Visitor. |
| **Author(s):** | @kkons2212 (Thái Đặng Quốc Bảo) |
| **Date:** | September 21, 2026 |

---

### Activity Diagram

<p align="center">
  <img src="https://github.com/user-attachments/assets/552b1ee1-fa46-4703-9952-33fbff66b481" width="600" alt="UC-02 Activity Diagram">
</p>