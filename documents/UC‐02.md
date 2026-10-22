# Use Case Specification: UC-02

<img width="600" alt="Use Case Diagram - UC2" src="https://github.com/user-attachments/assets/273aaee2-5ca1-4057-aeb8-2035e56b60aa" />



| Field | Content |
|---|---|
| Use Case Number: | UC-02 |
| Use Case Name: | System Login & Session Management |
| Actor(s): | Admin, Museum Staff |
| Maturity: | Focused |
| Summary: | Admin or Museum Staff authenticates into the administrative portal by submitting valid credentials to obtain role-based access to management features. |
| Basic Course of Events: | **Actor Action**<br>1. Actor accesses the administrative portal URL (/admin). A1<br><br>**System Response**<br>2. The system checks for active sessions, verifies no valid session exists, and displays the login screen.<br><br>**Actor Action**<br>3. The Actor enters their username/email and password, then selects "Login".<br><br>**System Response**<br>4. The system validates the input format and verifies the credentials against stored user records in the database. E1, E2, E3<br>5. The system confirms the account status is active, generates an authentication token/session, and logs the login event.<br>6. The system redirects the Actor to the Admin Dashboard according to their assigned role permissions. A2 |
| Alternative Paths: | **A1: Active Session Exists (Auto-Login)**<br>**Actor Action**<br>1. The Actor accesses the administrative portal while holding an active, unexpired session token.<br><br>**System Response**<br>2. The system validates the existing session token and bypasses the login screen. Return to step 6 of the Basic Course of Events.<br><br>**A2: User Logout**<br>**Actor Action**<br>1. While on the Admin Dashboard, the Actor selects the "Logout" option.<br><br>**System Response**<br>2. The system invalidates the active session token, clears client credentials, and redirects the Actor to the login screen. |
| Exception Paths: | **E1:** At step 4, if the username or password fields are empty or malformed, the system highlights the invalid fields and displays an input error message. Returns to Basic Flow Step 3.<br><br>**E2:** At step 4, if the credentials do not match any stored record, the system displays a generic error message ("Invalid username or password"), records the failed attempt in the audit log, and returns to Basic Flow Step 3.<br><br>**E3:** At step 4, if consecutive failed login attempts exceed the allowed threshold (5 attempts) or the account is disabled, the system temporarily locks the account, logs a security alert, and informs the Actor. The use case ends. |
| Extension Points: | None. |
| Triggers: | Actor navigates to a protected administrative route (/admin) or an existing session expires. |
| Assumptions: | All authentication requests are transmitted over HTTPS; passwords are stored as cryptographic hashes in the database. |
| Preconditions: | The Actor's account is pre-provisioned and active in the system database with an assigned role (ADMIN or STAFF). |
| Postconditions: | An authenticated session is established (or terminated upon logout), the security audit log is updated, and role-based access to the Admin Dashboard is granted. |

## Activity Diagram
<img width="600" alt="Activity Diagram 2" src="https://github.com/user-attachments/assets/fbf9d50f-dc67-421f-a969-e38f4d19e3ac" />
