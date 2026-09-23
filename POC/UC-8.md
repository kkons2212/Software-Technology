
# UC-08: Auto-translate POI Content

<p align="center"> 
    <img width="725" height="522" alt="Use Case Diagram1" src="https://github.com/user-attachments/assets/731c69e2-e23c-409b-85af-3f767e1b4cbe" />
</p>


## Document Metadata

| Field | Details |
| :--- | :--- |
| **Use Case ID** | UC-08 |
| **Use Case Name** | Auto-translate POI Content |
| **Primary Actor** | System (Automated Event) |
| **Secondary / System Actors** | External Translation API (Deep-translator / Google Translate API), Centralized Database |
| **Maturity** | Focused |
| **Author(s)** | @Phatnguyen3003 |
| **Date** | September 21, 2026 |

---

## Overview

* **Summary:** The system automatically translates the primary text description of a Point of Interest (POI) into all configured target languages using an external translation service and stores the localized text in the database.
* **Triggers:** Automated background event triggered by **UC-04 (Manage Exhibits / POIs)** whenever a new POI is created or an existing POI's primary description is modified.
* **Preconditions:** 
  1. UC-04 has successfully saved/updated the primary POI text in the database.
  2. Target language list (e.g., English, Japanese, Korean, Chinese) is configured in system environment settings.
* **Postconditions:**
  1. Localized text descriptions for all target languages are stored in the database mapped to the POI ID.
  2. Trigger event is dispatched to **UC-09: Auto-generate & Cache Audio Files** for the translated text.

---

## Flow of Events

### 1. Main Event Scenario (Automated Pipeline)

| Step | Actor / System Action | System Response |
| :---: | :--- | :--- |
| **1** | System receives background trigger event from UC-04 containing POI ID, Title, and Primary Text (Vietnamese). | — |
| **2** | — | Retrieve system target language configuration list (e.g., `['en', 'ja', 'ko', 'zh']`). |
| **3** | — | Iterate through target languages and construct translation payload for each target language code. |
| **4** | System sends asynchronous API requests containing primary text to External Translation API. | — |
| **5** | External Translation API processes text and returns localized strings for each target language. | — |
| **6** | — | Validate API response (checks for non-empty text strings and valid response codes). `[E1]` |
| **7** | — | Write/Update localized POI text entries in the Centralized Database (mapped by POI ID and Language Code). |
| **8** | — | Automatically trigger **UC-09: Auto-generate & Cache Audio Files** with the newly translated POI content. |
| **9** | — | Log success event in System Log and set POI translation status flag to `COMPLETED`. Use case ends. |

---

### 2. Alternative Paths

#### `A1: Individual Target Language Retry`

* **A1.1:** Translation for a specific target language fails due to transient network error while other languages succeed.
* **A1.2:** System retries translation request for the failed language up to 3 times with exponential backoff.
* **A1.3:** If retry succeeds, system proceeds to **Step 7 of Main Event**.
* **A1.4:** If retry fails after max attempts, system stores successful translations in Database, flags POI status as `PARTIAL_TRANSLATION_FAILED`, and logs error details for Admin review.

---

### 3. Exception Paths

#### `E1: External Translation API Failure / Rate Limit Exceeded`

* **Trigger:** API returns HTTP errors (e.g., `429 Too Many Requests`, `503 Service Unavailable`) or request times out.
* **System Behavior:**
  1. System catches exception and logs failure stack trace.
  2. System updates POI translation status flag in Database to `TRANSLATION_FAILED`.
  3. System skips triggering UC-09 for missing translations to prevent cascading failures.
  4. System notifies Admin Dashboard via system log alert so Admin can manually retry translation later.



### Activity Diagram

<p align="center"> 
   <img width="1155" height="931" alt="Activity Diagram1" src="https://github.com/user-attachments/assets/ac6c4ccb-6dda-4c59-bd26-a63514dafa2b" />
</p>