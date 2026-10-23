# Database Schema & ERD Design (Smart Museum POC)


---

## 1. Database Architecture Overview

During the Proof of Concept (POC) phase, the system leverages **SQLite** configured in **WAL (Write-Ahead Logging)** mode with `PRAGMA foreign_keys = ON;` to ensure:
- **High Performance & Non-blocking Concurrency:** Mobile visitor reads can occur simultaneously without being locked by backend write jobs (Google Translation & Edge-TTS synthesis background tasks).
- **Data Integrity:** Cascade deletion automatically cleans up related translations and audio records when a POI is deleted.

---

## 2. Entity Relationship Diagram (ERD)

<img width="2151" height="1342" alt="Entity Relationship Diagram2" src="https://github.com/user-attachments/assets/8dc8d3fa-c237-4d5c-ada4-38d9ae79923b" />



## 3. Data Dictionary
