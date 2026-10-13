


# Use Case Specification: UC05 - View POI Details
<img width="897" height="288" alt="Ảnh chụp màn hình 2026-09-22 083007" src="https://github.com/user-attachments/assets/4b59f593-fea5-4971-b4e9-69c63ffa55fa" />

| Field | Description |
| :--- | :--- |
| **Use Case ID** |  |
| **Use Case Name** | Generate & Manage QR Codes for POIs |
| **Actor(s)** |Museum Staff / Administrator|
| **Maturity**
 | Focused |
| **Summary** | The Museum Staff generates, views, downloads, and manages QR codes associated with Points of Interest (POIs). |

---

## Basic Course of Events

| Actor Action | System Response |
| :--- | :--- |
| 1. Museum Staff selects a POI. | |
| | 2. System displays POI information and current QR code status. . |
| 3. Museum Staff selects Generate QR Code. A1, A2 | |
| | 4. System generates a unique QR code. . |
| 5. Museum Staff reviews the generated QR code. | |
| | 6. System displays QR code preview. |
| 7. Museum Staff downloads the QR code.  | |
| | 8. System generates QR code file and makes it available for download. . |
| 9.Museum Staff places the QR code at the corresponding POI. | |
| | 10. System keeps the QR code associated with the selected POI. |

---

## Alternative Paths

### A1. QR Code already exists
| Actor Action | System Response |
| :--- | :--- |
| 1. Select the POI. | |
| | 2.Detect and display the existing QR code with options to Download or Regenerate. |

### A2. Regenerate QR Code
| Actor Action | System Response |
| :--- | :--- |
| 1. Select Regenerate QR Code. | |
| | 2. Prompt for confirmation. | 
| 3. Confirm action. | |
| | 4. Generate, replace, and display the new QR code. |

---

## Exception Paths

* **E1.** POI not found: The system fails to find the POI, displays an error message, and the Use Case ends.
* **E2.** QR Code generation fails: The QR Generator Service fails, displays an error message, and the Museum Staff may retry.
* **E3.** Download fails: The system fails to process the download, displays a download error, and the Museum Staff may retry.
---

## Trigger

The Museum Staff selects a POI and requests to generate or manage its QR code.

---
## Post Conditions

QR Code generation and download.

<img width="819" height="717" alt="Swimlane for Order Fulfilment" src="https://github.com/user-attachments/assets/943f33a5-ed9b-45ef-b068-ab9ae413e9b4" />

