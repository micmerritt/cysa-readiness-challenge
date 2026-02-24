# SPEC — CySA+ Readiness Challenge (Static, Public)

## Purpose
This project is a browser-based readiness diagnostic for CompTIA CySA+ students. It is **not** a practice exam clone and must not reuse CertMaster phrasing. It is designed to detect false readiness (for example, brute-forcing CertMaster final assessments) by testing reasoning on novel scenarios.

Students complete a short challenge and submit a copied results summary (includes a seed) to the instructor.

## Non-Goals
- No backend.
- No accounts, logins, or student identity.
- No proctoring, webcam, or anti-cheat claims.
- No guarantees of passing CySA+.
- Not a replacement for study materials.

## Deployment
- Static site hosted on GitHub Pages.
- No build step required.
- Vanilla HTML/CSS/JS only.

## User Flow
1. Student opens the site and reads brief instructions.
2. Student starts an attempt.
3. App generates a **seed** for this attempt (or accepts one from URL querystring).
4. App generates a 25-question challenge using the seed:
   - selects questions by blueprint
   - applies template variables (optional, if templates are present)
   - shuffles answer choices per question
5. Student completes the challenge.
6. App shows results and a remediation summary.
7. Student clicks **Copy Results Summary** and sends it to the instructor.

## Inputs
Student provides only:
- Start click (no forms required)
Optional:
- `?seed=<value>` in the URL to reproduce an attempt

## Core Content Model
Questions are stored in JSON under `/data/`.

Each question must:
- Be scenario-based and reasoning-oriented
- Belong to exactly one diagnostic category
- Include a short rationale (shown after results, not during the quiz)
- Include optional pattern tags for remediation

### Categories (required)
- `log_analysis`
- `incident_response`
- `vuln_prioritization`
- `detection_reasoning`

### Blueprint (required)
Default challenge length: 25 questions
- `log_analysis`: 7
- `incident_response`: 6
- `vuln_prioritization`: 6
- `detection_reasoning`: 6

Blueprint values live in `/data/blueprint.json` and must be editable without code changes.

### Pattern Tags (recommended)
Each question may include 0–2 tags such as:
- `assumption_jump`
- `sequence_error`
- `missed_context`
- `wrong_priority`
- `confuses_fp_tp`

Canonical tags live in `/data/remediation.json` so output stays consistent.

## Attempt Variability Requirements
Each attempt must be meaningfully different to reduce question-sharing value.

Minimum variability:
- Seeded selection of questions from the bank by blueprint
- Seeded shuffling of answer choices per question

Preferred variability:
- Template-based question generation using `/data/question_templates.json` and `/data/variable_pools.json` (if implemented)
- Randomized log snippets assembled from fragments (template-based)

## Seed Requirements
- Seed is generated at attempt start (unless provided via URL).
- Seed controls:
  - question selection
  - question order
  - answer choice shuffling
  - template variable selection (if templates exist)
- Seed must be displayed in results and included in the copied summary.
- Same seed must reproduce the same attempt on the same version of the content.

## Scoring & Results
### Scoring
- Overall score (% correct)
- Category scores (% correct per category)
- Pattern tag counts for missed questions (if tags are present)

### Result Tiers (required)
Tier logic:
- **Ready**
  - overall ≥ 80% AND no category < 70%
- **Borderline**
  - overall 70–79% OR any category 60–69%
- **Not Ready**
  - overall < 70% OR any category < 60%

### Results Page Must Show
- Tier (Ready / Borderline / Not Ready)
- Overall % and raw correct count (e.g., 19/25)
- Category breakdown (percent + raw)
- Top 3 remediation recommendations
- If pattern tags are present: top 2–3 most frequent missed patterns and what they mean
- A short disclaimer: “This is a readiness diagnostic, not a guarantee of passing.”

### Copy Results Summary (required)
Provide a button that copies a plain-text summary including:
- Date/time (local)
- App version (see Versioning)
- Seed
- Tier
- Overall score and category scores
- Top remediation bullets
- (Optional) Top missed patterns

The summary must be easy to paste into email/text/Salesforce notes.

## Accessibility (required)
- Full keyboard navigation (Tab/Shift+Tab, Enter/Space to select)
- Visible focus styles
- Proper label association for choices
- ARIA attributes where appropriate for quiz progress and results
- High contrast text and readable font sizes

## UI Requirements
- Minimal, distraction-free design
- One question per screen
- Progress indicator (e.g., “Question 12 of 25”)
- No “review all questions” page
- No displaying correct answers during the quiz
- Results page may show rationales after completion

## Data Files
Required:
- `/data/blueprint.json`
- `/data/question_bank.json`
- `/data/remediation.json`

Optional:
- `/data/question_templates.json`
- `/data/variable_pools.json`

## Versioning
- Define an `APP_VERSION` constant in code (e.g., `0.1.0`).
- Increment version when question bank changes materially.
- Include version in the results summary.

## Code Organization
- Keep code simple and readable.
- Prefer small modules:
  - `rng.js` (seeded RNG)
  - `blueprint.js` (selection)
  - `quiz.js` (render + interaction)
  - `scoring.js` (tier + stats)
  - `results.js` (render + copy summary)
  - `templating.js` (optional generation)

## Quality Guardrails (recommended)
Add a validation script (optional for MVP) to ensure:
- Unique IDs
- Valid categories
- Correct `answerIndex`
- 4 choices per question (unless explicitly expanded later)
- Bank has enough items to satisfy blueprint
- Tags exist in remediation mapping

## Instructor Guidance (copy for README if useful)
Recommended student instruction:
“Complete the CySA+ Readiness Challenge and send me the copied results summary. The seed lets me reproduce your attempt if needed.”

## Compliance Notes
- Do not copy CertMaster questions or proprietary content.
- Avoid direct reproduction of CompTIA exam items.
- All questions must be original, scenario-based, and generalizable.
