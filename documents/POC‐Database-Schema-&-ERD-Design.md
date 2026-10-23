# Database Schema & ERD Design (Smart Museum POC)


---

## 1. Database Architecture Overview

During the Proof of Concept (POC) phase, the system leverages **SQLite** configured in **WAL (Write-Ahead Logging)** mode with `PRAGMA foreign_keys = ON;` to ensure:
- **High Performance & Non-blocking Concurrency:** Mobile visitor reads can occur simultaneously without being locked by backend write jobs (Google Translation & Edge-TTS synthesis background tasks).
- **Data Integrity:** Cascade deletion automatically cleans up related translations and audio records when a POI is deleted.

---

## 2. Entity Relationship Diagram (ERD)

<img width="860" height="536" alt="Entity Relationship Diagram2" src="https://github.com/user-attachments/assets/d3be5524-72c7-455a-bb8f-a8540c5b68df" />


## 3. Data Dictionary
