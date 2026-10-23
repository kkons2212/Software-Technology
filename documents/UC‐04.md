# Use Case Specification: UC-04
<img width="870" height="507" alt="image" src="https://github.com/user-attachments/assets/5a6efba6-491a-499a-a092-e805f6f22088" />




| Field | Value |
| :--- | :--- |
| **Use Case Number:** | **UC 4** |
| **Use Case Name:** | **Review, Edit Translated Content and Audio Guide** |
| **Actor(s):** | Admin / Museum Staff |
| **Maturity:** | Focused / Completed |
| **Summary:** | Allows the Admin or Museum Staff to preview, edit translated content, regenerate the Audio Guide using Text-to-Speech (TTS) services, and publish content to the visitor mobile application. |
| **Basic Course of Events:** | 1. Admin/Staff accesses the "Translation and Audio Guide Management" feature.<br>2. The system displays a list of translations with filter options (language, approval status, exhibit).<br>3. Admin/Staff selects a translation to review.<br>4. The system displays the translated text and plays the current Audio Guide file for preview.<br>5. Admin/Staff checks the quality of both the text content and audio.<br>6. Admin/Staff selects "Approve & Publish".<br>7. The system updates the translation status to "Published".<br>8. The system synchronizes the updated content with the visitor mobile application.<br>9. The use case ends. |
| **Alternative Paths:** | **4.1. Edit Translated Content:**<br>1. Admin selects "Edit", updates the translated text, and clicks "Save".<br>2. The system updates the Audio Guide status to "Needs Update".<br>3. Admin selects "Regenerate Audio Guide"; the system invokes the TTS service to generate a new audio file and plays a preview.<br>4. Resume at Step 5 of the Basic Course of Events.<br><br>**4.2. Regenerate Audio Guide Without Editing Text:**<br>1. Admin selects "Regenerate Audio Guide".<br>2. The system invokes the TTS service to synthesize a new audio file from existing text and plays a preview.<br>3. Resume at Step 5 of the Basic Course of Events. |
| **Exception Paths:** | **4.3. Missing Audio Guide File:**<br>1. The system detects that no Audio Guide file exists for this translation and displays the notification: "Audio Guide not generated".<br>2. The system prompts the Admin to click "Regenerate Audio Guide".<br><br>**4.4. TTS Service Error:**<br>1. The system fails to connect to or invoke the Text-to-Speech (TTS) service.<br>2. The system displays an error message: *"Unable to generate Audio Guide, please try again later"* and retains the current data. |
| **Extension Points:** | - **Generate_Audio_On_Edit:** Triggered when translated content is edited and saved successfully (requiring audio file regeneration).<br>- **Publish_Content:** Triggered when translated content and the Audio Guide are approved for publication (synchronizing data with the visitor mobile application). |
| **Triggers:** | Admin or Museum Staff selects a translation requiring review or update from the management list. |
| **Assumptions:** | - The Text-to-Speech (TTS API) service is stable and ready to respond.<br>- The system has pre-stored original texts and their corresponding translation files. |
| **Preconditions:** | - The user is logged into the system with Admin or Museum Staff privileges.<br>- The translation to be reviewed already exists in the database. |
| **Postconditions:** | - Translated content is successfully updated (if modified).<br>- The Audio Guide file is newly generated or updated accordingly.<br>- The translation and Audio Guide are approved and published to the visitor mobile application. |


<img width="426" height="1077" alt="Activity Diagram - Swineline for Order Fulfilment Activity Diagram2" src="https://github.com/user-attachments/assets/cae7ce76-98c5-491b-bb75-e6c25179ae22" />
