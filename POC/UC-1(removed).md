


# Use Case Specification: UC01 - View POI Details
<img width="1142" height="205" alt="Ảnh chụp màn hình 2026-09-22 073526" src="https://github.com/user-attachments/assets/d7c5c6d5-03a6-4363-a402-146137925251" />

| Field | Description |
| :--- | :--- |
| **Use Case ID** | UC01 |
| **Use Case Name** | View POI Details |
| **Actor(s)** | Visitor |
| **Maturity** | Focused |
| **Summary** | The Visitor scans a QR code to view detailed POI information in their preferred language and listen to the audio guide. |
| **Trigger** | The Visitor scans a QR code displayed at a Point of Interest (POI). |

---

## Basic Course of Events

| Actor Action | System Response |
| :--- | :--- |
| 1. Scan a QR code. | |
| | 2. The system reads a QR code and identifies the corresponding POI. .E1 |
| 3. The visitor selects preferred their language. | |
| | 4. The system retrieves the POI content in the selected language. .E2 |
| 5. The Visitor views the POI information. | |
| | 6. The system displays the POI details, including text and images. |
| 7. The Visitor selects the Audio Guide option. .A1, .A2 | |
| | 8. The system retrieves the corresponding audio file and plays the Audio Guide in the selected language. .E3 |

---

## Alternative Paths

### A1. Visitor chooses not to play audio
| Actor Action | System Response |
| :--- | :--- |
| 1. The visitor chooses not to play the audio guide. | |
| | 2. The system continues displaying the POI information. |

### A2. Visitor selects another language
| Actor Action | System Response |
| :--- | :--- |
| 1. The Visitor selects another language. | |
| | 2. The system retrieves the POI content in the newly selected language. |
| | 3. The system displays the POI information in the selected language. |
| | 4. The Use Case returns to Step 5 of the Basic Course of Events. |

---

## Exception Paths

* **E1.** The system cannot identify a valid POI from the scanned QR code. The system displays an error message indicating that the QR code is invalid or unavailable.
* **E2.** The system cannot retrieve the POI information. The system displays an error message. The Visitor may retry loading the information or return to the previous page.
* **E3.** The system cannot retrieve or play the Audio Guide. The system displays an error message.

---

## Trigger

The Visitor scans a QR code displayed at a Point of Interest (POI).

---
## Post Conditions

The Visitor has viewed the POI information in the selected language and may have listened to the corresponding Audio Guide.


<img width="1648" height="775" alt="Ảnh chụp màn hình 2026-09-22 073220" src="https://github.com/user-attachments/assets/8f8ccc2c-330f-4682-b8a3-c5d9132943a0" />
