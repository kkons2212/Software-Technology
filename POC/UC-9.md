# Use Case Specification: UC-09

<p align="center">
  <img src="https://github.com/user-attachments/assets/167fefb5-2d9f-4c95-b657-3b98654b9333" width="650" alt="Use Case Diagram UC-09">
</p>

---

| Field | Content |
| :--- | :--- |
| **Use Case Number:** | **UC-09** |
| **Use Case Name:** | Auto-generate & Cache Audio Files |
| **Actor(s):** | System (Automated Event), edge-tts Engine |
| **Maturity:** | Focused |
| **Summary:** | System automatically synthesizes text-to-speech audio files using the Edge-TTS engine upon POI creation, update, or translation. Generated audio files are stored in local/cloud cache storage. |

---

### Basic Course of Events

| Actor Action | System Response |
| :--- | :--- |
| **1.** Triggered automatically by a System event upon completion of POI content creation/update (UC-04) or auto-translation (UC-08). | |
| | **2.** The system extracts localized text content, language codes, and existing content hashes for all target languages of the POI. **[E3]** |
| | **3.** The system checks if valid cached audio files already exist for the current text hash. **[A1]** |
| | **4.** The system dispatches asynchronous TTS synthesis requests to the edge-tts Engine for missing or updated language texts. **[A2] [E1]** |
| **5.** The edge-tts Engine synthesizes the text into binary audio streams (.mp3). | |
| | **6.** The system writes and caches the generated audio files into File / Cache Storage. **[E2]** |
| | **7.** The system updates the POI Database records with updated audio file URLs, file sizes, and status flags (AUDIO_READY). |
| | **8.** The system logs execution details in the Analytics & Logging module and terminates the process. |

---

### Alternative Paths

#### **A1. Content Unchanged / Audio Cache Hit**
| Actor Action | System Response |
| :--- | :--- |
| | **1.** At step 3, if the text content hash matches the existing cached audio metadata, the system skips TTS generation for that language. |
| | **2.** The system retains existing audio file links and proceeds directly to Step 8. |

#### **A2. Individual Language TTS Retry**
| Actor Action | System Response |
| :--- | :--- |
| | **1.** At step 4, if TTS generation fails for a specific target language due to transient connection errors while others succeed: |
| | **2.** The system retries the TTS request for the failed language up to 3 times with exponential backoff. |
| | **3.** If retry succeeds, the system proceeds to Step 6 of the Basic Course of Events for that language. |

---

### Exception Paths

* **E1:** At step 2 of A2, if a language TTS fails after 3 retry attempts, the system saves successfully generated audio files for other languages in DB/Storage, flags the failed language audio status as `AUDIO_GENERATION_FAILED` (enabling client-side Web Speech API fallback), logs an error notification to the Admin Dashboard, and terminates the pipeline.
* **E2:** At step 6, if the destination storage system is full or unwritable, the system aborts writing the failed audio stream, retains previous valid audio reference in DB if available, logs a critical storage error, and flags status as `STORAGE_ERROR`.
* **E3:** At step 2, if extracted text content is empty or contains only non-pronounceable characters, the system skips TTS generation, sets audio URL to `NULL`, and logs a validation warning.

---

### Supplementary Information

| Field | Content |
| :--- | :--- |
| **Extension Points:** | Audio File Compression: Optional post-processing step to compress .mp3 bitrates for low-bandwidth mobile PWA streaming. |
| **Triggers:** | System event published after successful execution of UC-04 (Manage Exhibits/POIs) or UC-08 (Auto-translate POI Content). |
| **Assumptions:** | The edge-tts service/library is functional; target storage directory has valid write permissions; PWA client supports HTML5 audio playback with fallback to Web Speech API. |
| **Preconditions:** | POI text description exists and is stored in the system database. |
| **Post Conditions:** | Audio files are persisted in cache storage; POI database contains accurate audio URLs and status flags for Visitor consumption. |
| **Author(s):** | @kkons2212 (Thái Đặng Quốc Bảo) |
| **Date:** | September 21, 2026 |

---

### Activity Diagram

<p align="center">
  <img src="https://github.com/user-attachments/assets/48feb7c1-ebcd-470d-b694-bb6769d92215" width="600" alt="UC-09 Activity Diagram">
</p>