# CODEBASE REFACTORING & CLEAN CODE STANDARDS
## Predictable Control Flow, Explicit Execution & Single Intent Structured Exit (SISE)
### Project: Smart Multilingual Audio Guide & Interactive Map — Cu Chi Tunnels Historical Relic Site
*Mandatory engineering standards for refactoring, auditing, and maintaining Python (Backend) and React/JavaScript (Frontend) codebases.*

---

## 1. MOTIVATION & ARCHITECTURAL PHILOSOPHY

### 1.1. The "Terse Shortcut" Anti-Pattern
During fast-paced development cycles, developers frequently resort to "terse shortcuts" under the false assumption that writing fewer lines of code equals cleaner code. Common manifestations include:
- **Scattered Early Returns:** Burying 4 to 8 `return` statements across different nesting levels of `if`, `for`, `while`, and `try/except` blocks.
- **Nested Inline Ternaries:** Chaining operators like `a ? (b ? c : d) : (e ? f : g);`.
- **Implicit Returns:** Relying on language defaults (e.g., Python returning `None` implicitly or JS returning `undefined`) when a branch finishes.
- **Inline Short-Circuit Fallthrough:** Chaining logical operators with side effects (`return x && doAction(x) || fallback;`).

### 1.2. Why Terse Shortcuts Damage Production Code
1. **Breakpoints & Debugging Blindspots:** Engineers cannot inspect the final return state at a single breakpoint because execution exits from arbitrary internal lines.
2. **Missing Post-Condition Invariants:** Cleanup tasks (closing sessions, logging metrics, resetting loading spinners, clearing timeout IDs) get forgotten on some early exit paths, causing intermittent production leaks.
3. **Cognitive Load & Auditing Friction:** A reviewer must scan the entire vertical height of a function to determine all possible terminal states rather than observing a predictable top-to-bottom pipeline.
4. **State Desynchronization in UI Hooks:** In React custom hooks, an early `return null;` that forgets to reset dependent state values causes stale UI indicators (e.g., a "Nearest POI" card lingering on screen when the visitor moves out of bounds).

### 1.3. Core Philosophy: "Clarity Over Cleverness"
- **Predictable Control Flow:** Every function must read as a top-to-bottom pipeline with a clearly defined entry and a single, unified exit.
- **Explicit Invariant Contracts:** Intermediate states must be stored in named variables that describe their business meaning rather than being collapsed into anonymous inline expressions.
- **Fail Fast, Then Flow Smoothly:** Validation rejections occur strictly at the top gate; once past the gate, execution flows uninterrupted to a single return accumulator.

---

## 2. MATHEMATICAL FOUNDATION & METRIC GATES

### 2.1. Cyclomatic Complexity & Exit Density
Let the Cyclomatic Complexity $M$ of a function's control-flow graph be:
$$M = E - N + 2P$$
Where:
- $E$ is the number of edges (transfers of control).
- $N$ is the number of nodes (sequential statements).
- $P$ is the number of connected components ($P = 1$ per standalone function).

When a function combines high branching ($M > 7$) with multiple exit points ($K > 2$), the cognitive burden of reasoning about its paths compounds:
$$\text{Cognitive Complexity Index (CCI)} = M \times \sqrt{K}$$

### 2.2. Metric Enforcement Thresholds
All refactored code must strictly comply with the following metric boundaries:
- **Max Exit Points ($K$):** $K \le 2$ (at most 1 top-of-scope validation rejection gate, and strictly 1 unified return).
- **Cyclomatic Complexity ($M$):** $M \le 6$ per function. Functions exceeding $M = 6$ must be decomposed into single-responsibility helper methods.
- **Maximum Nesting Depth:** $\le 3$ indentation levels (functions with 4+ indentations are rejected by code review).
- **Ternary Nesting Depth:** Strictly $\le 1$ level (multi-level nested ternaries are 100% prohibited).

---

## 3. THE 3-PHASE MANDATORY FUNCTION ANATOMY

Every function, service method, and custom hook calculation exceeding 5 lines of code must adhere to the **Single Intent Structured Exit (SISE)** pipeline anatomy:

```
┌─────────────────────────────────────────────────────────────┐
│  PHASE 1: PRECONDITION GATE (Top 10-15% of Body)            │
│  - Validate parameters, boundary coordinates, and types.    │
│  - Reject invalid inputs early (raise Exception or return). │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 2: LINEAR COMPUTE & TRANSFORM (Core Body)            │
│  - Initialize explicit accumulator (result = None / null).   │
│  - Execute business logic sequentially via un-nested branches│
│  - Assign computations to descriptive intermediate variables.│
│  - ZERO early returns allowed inside Phase 2.                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 3: POST-CONDITION ASSERTION & UNIFIED EXIT (Final 5%) │
│  - Audit logging, telemetry increments, or cleanup.         │
│  - Return the accumulated result from a single point.       │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. PROHIBITED ANTI-PATTERNS VS. MANDATORY STANDARDS

| Anti-Pattern (❌ Strictly Prohibited) | Why It Is Harmful | Mandatory Standard (✅ Enforced) |
| :--- | :--- | :--- |
| **1. Scattered Mid-Function Returns**<br>```python
def check(val):
    if not val: return None
    step1()
    if condition_a: return "A"
    step2()
    if condition_b: return "B"
    return "C"
``` | Fragmented execution; impossible to set a single breakpoint before output or execute guaranteed logging. | **Unified Exit Accumulator**<br>```python
def check(val):
    if not val:
        return None
    step1()
    resolved_val = "C"
    if condition_a:
        resolved_val = "A"
    elif condition_b:
        step2()
        resolved_val = "B"
    logger.debug("Computed: %s", resolved_val)
    return resolved_val
``` |
| **2. Nested Inline Ternary Chains**<br>```javascript
return isAuth ? (isAdmin ? edit() : view()) : redirect();
``` | Extremely difficult to read; operator precedence pitfalls; un-lintable branch coverage. | **Explicit Sequential Branching**<br>```javascript
let resolvedAction = redirect;
if (isAuth) {
  resolvedAction = isAdmin ? edit : view;
}
return resolvedAction();
``` |
| **3. Inline Boolean / Short-Circuit Returns**<br>```javascript
return user && user.session && user.session.isActive;
``` | Coerces to `undefined` or falsy objects instead of boolean; obscures type contract. | **Strict Boolean Casting**<br>```javascript
const hasActiveSession = Boolean(user?.session?.isActive);
return hasActiveSession;
``` |
| **4. Implicit None / undefined Fallthrough**<br>```python
def find_item(items, target_id):
    for item in items:
        if item.id == target_id:
            return item
    # Implicit return None!
``` | Leaves contract ambiguous; readers cannot tell if omission was intentional or a bug. | **Explicit Final Return**<br>```python
def find_item(items, target_id):
    matched_item = None
    for item in items:
        if item.id == target_id:
            matched_item = item
            break
    return matched_item
``` |
| **5. Partial State Reset on Early Exit (Frontend)**<br>```javascript
if (!coords) {
  setNearest(null);
  return null; // Forgot to reset distance & active list!
}
``` | Leaves stale state in the UI; leads to hard-to-reproduce visual glitch bugs. | **Atomic State Reset Helper**<br>```javascript
if (!isValidCoords(coords)) {
  resetAllGeofenceState();
  return null;
}
``` |

---

## 5. BACKEND (PYTHON / FASTAPI) REFACTORING RULES

### 5.1. Token & Header Extraction Refactoring
*Problem:* Controllers often check multiple headers and parameters with scattered returns.
*Rule:* Accumulate the token into a `resolved_token` variable using prioritized `elif` checks, and return once at the bottom.

```python
# ✅ MANDATORY PATTERN
def _extract_token(
    token: str | None = None,
    x_session_token: str | None = None,
    authorization: str | None = None,
) -> str | None:
    """Extract session token across query params and headers with single deterministic exit."""
    resolved_token: str | None = None

    if token and token.strip():
        resolved_token = token.strip()
    elif x_session_token and x_session_token.strip():
        resolved_token = x_session_token.strip()
    elif authorization and authorization.startswith("Bearer "):
        bearer_val = authorization[7:].strip()
        if bearer_val:
            resolved_token = bearer_val

    return resolved_token
```

### 5.2. Service Query & Content Gating Refactoring
*Problem:* Service methods mix validation, database queries, and conditional content masking with mid-function exits.
*Rule:* 
1. Validate entity presence at the top gate (raise `ApiError(404)` if missing).
2. Gather supplementary data (translations, active sessions) into explicit local variables.
3. Construct the response DTO at a single terminal return statement.

```python
# ✅ MANDATORY PATTERN
def get_visitor_poi_detail(
    self,
    poi_id: str,
    language_code: str | None = None,
    session_token: str | None = None,
) -> POIMapItem:
    """Fetch exhibit details with unified content gate validation."""
    # Phase 1: Precondition Gate
    poi = self.repository.get_by_id(poi_id)
    if poi is None or not poi.is_active:
        raise ApiError(
            status_code=status.HTTP_404_NOT_FOUND,
            code=POI_NOT_FOUND_ERROR_CODE,
            message=POI_NOT_FOUND_ERROR_MESSAGE,
        )

    # Phase 2: Linear Compute & Transformation
    selected_translation = None
    if language_code:
        translations = self.repository.get_translations_by_poi_id(poi_id)
        for trans in translations:
            if trans.language_id == language_code and trans.status == "PUBLISHED":
                selected_translation = trans
                break

    is_session_unlocked = False
    if session_token and self.session_repo:
        is_session_unlocked = self.session_repo.is_session_active(session_token.strip())

    # Phase 3: Unified Exit Return
    return self._to_map_item(
        poi,
        selected_translation,
        is_unlocked=is_session_unlocked,
        session_token=session_token if is_session_unlocked else None,
        lang=language_code,
    )
```

---

## 6. FRONTEND (REACT / JAVASCRIPT) REFACTORING RULES

### 6.1. Custom Hook Geofence Engine Refactoring (`useGeofenceTrigger`)
*Problem:* Proximity hooks often have multiple guard clauses checking coordinates, POI lists, and cooldown states, resulting in scattered `return null;` statements and desynchronized state setters.
*Rule:*
1. Create a dedicated `resetGeofenceState()` callback to guarantee atomic state clearance.
2. Consolidate parameter validation into a single Phase 1 Precondition Gate.
3. Compute nearest distances and active ranges in a single linear pass.
4. Conclude with an explicit Phase 3 check for cooldown lockout before returning the triggered POI.

```javascript
// ✅ MANDATORY PATTERN
const resetGeofenceState = useCallback(() => {
  setNearestPoi(null);
  setDistanceToNearest(Infinity);
  setActiveGeofencePois([]);
}, []);

const checkGeofence = useCallback((location) => {
  // Phase 1: Consolidated Precondition Gate
  const hasValidLocation = Boolean(location && typeof location.lat === 'number' && typeof location.lng === 'number');
  const currentPois = poisRef.current;
  const hasPois = Boolean(Array.isArray(currentPois) && currentPois.length > 0);

  if (!hasValidLocation || !hasPois) {
    resetGeofenceState();
    return null;
  }

  // Phase 2: Linear Evaluation Pass
  const candidatePois = currentPois.filter((poi) => poi && poi.is_active !== false);
  let closestPoi = null;
  let minDistanceMeters = Infinity;
  const inRangeCandidates = [];

  for (const poi of candidatePois) {
    const poiLat = poi.latitude ?? poi.lat;
    const poiLng = poi.longitude ?? poi.lng;
    if (typeof poiLat !== 'number' || typeof poiLng !== 'number') continue;

    const distance = calculateHaversineDistance(
      { lat: location.lat, lng: location.lng },
      { lat: poiLat, lng: poiLng }
    );

    if (distance < minDistanceMeters) {
      minDistanceMeters = distance;
      closestPoi = poi;
    }

    const triggerRadius = typeof poi.trigger_radius === 'number'
      ? Math.max(MIN_TRIGGER_RADIUS_METERS, Math.min(MAX_TRIGGER_RADIUS_METERS, poi.trigger_radius))
      : DEFAULT_TRIGGER_RADIUS_METERS;

    if (distance <= triggerRadius) {
      inRangeCandidates.push({ poi, distance, triggerRadius });
    }
  }

  // Update visual radar states atomically
  setNearestPoi(closestPoi);
  setDistanceToNearest(minDistanceMeters);
  setActiveGeofencePois(inRangeCandidates);

  // Phase 3: Overlap & Lockout Evaluation with Single Return
  let triggeredPoi = null;
  if (inRangeCandidates.length > 0) {
    inRangeCandidates.sort((a, b) => a.distance - b.distance);
    const primaryCandidate = inRangeCandidates[0];
    const isLocked = isCooldownActive(primaryCandidate.poi.id, cooldownDurationMsRef.current);

    if (!isLocked) {
      triggeredPoi = primaryCandidate.poi;
      setCooldown(primaryCandidate.poi.id, cooldownDurationMsRef.current);
      if (typeof onTriggerRef.current === 'function') {
        onTriggerRef.current(triggeredPoi, primaryCandidate.distance, {
          isUnlocked: isUnlockedRef.current,
        });
      }
    }
  }

  return triggeredPoi;
}, [resetGeofenceState]);
```

### 6.2. JSX Conditional Rendering Refactoring
*Problem:* Nested ternary operators in JSX (`{loading ? <Spinner /> : error ? <Error /> : data ? <Content /> : <Empty />}`) are unreadable and prone to syntax errors.
*Rule:*
1. Compute the sub-view into an explicit variable or use early guard renders at the top of the component.
2. In JSX, only use simple 1-level conditions (`{isOpen && <Modal />}` or `{isEditing ? <EditForm /> : <ViewCard />}`).

---

## 7. VERIFICATION GATES & REGRESSION DEFENSE

Whenever a module is refactored under this standard, it must pass the following verification pipeline before being committed:

1. **Pre-Refactor Baseline Test:** Run test suite for the target module to confirm all assertions pass.
2. **Refactor Code:** Apply 3-Phase SISE structure, eliminate scattered exits and inline shortcuts.
3. **Post-Refactor Verification:** Run paired unit test file; zero test assertions may be deleted or modified.
4. **AST Architecture Check:** Run `python MVP/backend/scripts/check_architecture.py` to ensure no 3-tier boundary leaks.
5. **Linting & Code Formatting:**
   - Backend: `ruff check MVP/backend` and `black --check MVP/backend`.
   - Frontend: `npm run lint --prefix MVP/frontend`.
6. **Definition of Done Check:** Confirm max exit points per refactored function $\le 2$ and 0 nested ternaries.

