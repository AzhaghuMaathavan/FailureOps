You are working on the existing FailureOps X repository.

I need you to make the current application feel like a
PRODUCTION-GRADE B2B SaaS product.

IMPORTANT:
Do not rebuild the application from scratch.
Do not replace working backend/RAG/agent functionality.
Inspect the existing implementation first, identify the current
authentication flow and landing page, then modify them safely.

========================================================
TASK 1 — FIX SIGN-IN PERSISTENCE
========================================================

CURRENT BUG:

When I sign in successfully, the session/authentication is not
persisted correctly.

Example current behavior:

1. User opens FailureOps X.
2. User signs in.
3. User can access the application.
4. User closes the browser/tab.
5. User opens FailureOps X again.
6. The application asks the user to sign in again.

I need proper persistent authentication.

EXPECTED BEHAVIOR:

1. User signs in.
2. Authentication/session is persisted securely.
3. User closes the browser.
4. User opens FailureOps X later.
5. The application restores the authenticated session.
6. User is taken directly to the authenticated application.
7. User should NOT have to log in again unless:
   - they explicitly sign out
   - the session expires
   - authentication is revoked
   - security policy requires reauthentication

IMPORTANT:

Do NOT solve this by simply putting a user object in localStorage.

Inspect the existing authentication implementation and determine
what is currently being used.

If there is already a backend authentication/session system,
reuse it.

Use secure persistent authentication appropriate for a
production web application.

Prefer:

- secure HttpOnly cookies for session/token storage
- SameSite protection
- Secure cookies in production
- server-side session validation
- refresh/renewal where appropriate
- proper logout/invalidation
- authentication state restoration on application startup

Do NOT store sensitive authentication tokens/passwords in:
- localStorage
- sessionStorage
- plain client-side state

Passwords must NEVER be stored in plaintext.

========================================================
AUTH FLOW
========================================================

Implement/repair this flow:

PUBLIC USER

Landing page
     ↓
Sign in / Sign up
     ↓
Authentication
     ↓
Persistent session
     ↓
Authenticated app
     ↓
Dashboard

ON FUTURE VISIT:

Open FailureOps X
     ↓
Check existing session
     ↓
Valid?
   /     \
 YES      NO
 ↓        ↓
Dashboard Login

If session is expired:

Login page
     ↓
Sign in
     ↓
New persistent session
     ↓
Dashboard

LOGOUT:

Dashboard
 ↓
Sign out
 ↓
Invalidate session
 ↓
Landing/Login

========================================================
AUTH GUARDS
========================================================

Protect authenticated routes.

Users who are not authenticated should NOT be able to access
private project information by manually entering URLs.

Example:

/app/dashboard
/app/projects
/app/projects/[id]
/app/memory
/app/settings

If unauthenticated:

redirect → /login

If authenticated:

allow access.

Also prevent authenticated users from unnecessarily seeing the
login/signup page.

If a valid session exists and they navigate to /login:

redirect them to the application.

========================================================
SESSION RESTORATION
========================================================

The frontend must not briefly display:

"Not logged in"

while the application is checking an existing session.

Implement a proper authentication loading state.

Example:

Checking your workspace...

Then:

valid session → dashboard

invalid session → login

Avoid authentication flickering.

========================================================
TASK 2 — REDESIGN LANDING PAGE
========================================================

The current landing page contains too many dashboard/internal
product controls.

Remove unnecessary buttons and internal navigation from the
public landing page.

The landing page should look like a REAL PRODUCT WEBSITE.

It should NOT look like someone accidentally exposed the internal
dashboard.

========================================================
PUBLIC NAVIGATION
========================================================

Create a clean professional navbar.

LEFT:

FailureOps X logo

CENTER / RIGHT:

Platform
How it works
Security

RIGHT:

Sign in
Get started

On mobile:

Logo
Menu button

Opening the menu shows:

Platform
How it works
Security
Sign in
Get started

Do NOT put internal dashboard tabs in the public navbar.

REMOVE things such as:

Dashboard
Live Aurora Demo
Evidence
Signals
DNA
Truth
Radar
Predict
Intervene
Verify

from the public navigation.

Those belong inside the authenticated application.

========================================================
LANDING HERO
========================================================

Replace the current hero with a clear product positioning.

Use:

"Know where your project is heading
before it gets there."

Supporting text:

"FailureOps X turns fragmented project evidence into explainable
risk intelligence — connecting signals, patterns, historical
outcomes, and verified interventions."

Primary CTA:

"Get started"

Secondary CTA:

"See how it works"

Small supporting line:

"Evidence-grounded • Explainable • Privacy-controlled"

Do NOT display fake:

- live telemetry
- live timestamps
- fake customer metrics
- fake risk percentages
- fake source counts
- fake recovery percentages

Do not imply that a visitor is looking at real customer data.

========================================================
REMOVE UNWANTED HERO ELEMENTS
========================================================

Remove or redesign:

"Live Aurora Demo"

"82% Aurora failure risk"

"+33pp Recovery after experiment"

"5 Evidence sources live"

"AES-256 Zero-knowledge enclave"

unless these are backed by real production functionality.

Do not make unsupported security claims.

The landing page should communicate the PRODUCT,
not pretend to show live customer telemetry.

========================================================
PRODUCT PREVIEW
========================================================

Instead of fake metrics, create an elegant product preview showing
HOW FailureOps works.

Example:

PROJECT INTELLIGENCE

Project Launch

Health
68

Risk trend
Increasing

Signals

Adoption friction
Execution delay
Operational load

Historical similarity
87%

Potential next failure

Low repeat usage

Why?

Activation decline
+
Onboarding friction
+
Similar historical trajectory

[Inspect evidence]

Clearly mark the preview as:

"Illustrative product view"

if it is not backed by real data.

========================================================
LANDING PAGE STRUCTURE
========================================================

Use this structure:

1. Navbar

2. Hero

3. Product preview

4. "From evidence to intelligence"

   Evidence
      ↓
   Signals
      ↓
   Patterns
      ↓
   Failure DNA
      ↓
   Historical intelligence
      ↓
   Failure Radar
      ↓
   Intervention
      ↓
   Verified learning

5. Failure DNA section

Explain:

"Failure is rarely caused by a single event.
FailureOps connects weak signals across multiple dimensions."

Show:

Technical
Operational
Adoption
Execution
Financial

6. Truth Engine

Show how assumptions are tested against evidence.

Example:

ASSUMPTION

"Pricing is causing poor adoption."

EVIDENCE

Pricing complaints: low
Onboarding complaints: high
Activation decline: increasing

RESULT

"Evidence more strongly supports onboarding friction."

7. Historical Intelligence

Explain:

"Compare a current project with approved historical cases."

Example:

Current project
     ↓
Similarity search
     ↓
Historical patterns
     ↓
Past interventions
     ↓
Observed outcomes

8. Failure Radar

Explain that Failure Radar continuously evaluates emerging
risk based on available project intelligence.

9. Intervention

Show:

Detected risk
     ↓
Recommended intervention
     ↓
Experiment
     ↓
Outcome
     ↓
Verified learning

10. Privacy

Make this a major trust section.

Show:

PRIVATE
Only your organization

ORGANIZATION
Approved internal knowledge

GLOBAL SANITIZED
Approved sanitized intelligence

Explain that private source documents are not automatically exposed
through global search.

11. Final CTA

"Turn project evidence into foresight."

Button:

"Get started"

12. Professional footer

========================================================
IMPORTANT PRODUCT POSITIONING
========================================================

Do NOT position FailureOps as:

"another RAG chatbot"

Instead:

"FailureOps transforms project evidence into continuously
evolving failure intelligence."

Make the difference clear:

Traditional document AI:

Ask
 ↓
Retrieve
 ↓
Answer

FailureOps:

Evidence
 ↓
Signals
 ↓
Patterns
 ↓
Risk
 ↓
Historical comparison
 ↓
Prediction
 ↓
Intervention
 ↓
Verified learning

========================================================
TASK 3 — AUTHENTICATED APP VS PUBLIC WEBSITE
========================================================

Clearly separate the two experiences.

PUBLIC:

/
 /platform
 /how-it-works
 /security
 /login
 /signup

AUTHENTICATED:

/app
/app/dashboard
/app/projects
/app/projects/[id]
/app/search
/app/memory
/app/settings

The public website should be marketing/product oriented.

The authenticated application should be intelligence/workflow
oriented.

Do not mix the two.

========================================================
TASK 4 — LOGIN PAGE
========================================================

Make the login page production-grade.

Layout:

FailureOps X

Welcome back

Continue to your workspace.

Work email
Password

[Sign in]

Forgot password?

Don't have an account?
Create workspace

Include:

- validation
- loading state
- error state
- disabled state during submission
- accessible labels
- keyboard navigation
- password visibility toggle
- responsive mobile layout

Do not make it visually identical to the current internal
dashboard.

========================================================
TASK 5 — SIGNUP
========================================================

Create:

Create your workspace

Full name
Work email
Password
Organization name

[Create workspace]

After successful signup:

Create account
 ↓
Create/assign workspace
 ↓
Create persistent session
 ↓
Authenticated application

The user should NOT need to sign in again immediately after
successful signup.

========================================================
TASK 6 — PRODUCTION UX
========================================================

Every important action needs:

Loading
Success
Error
Empty

Examples:

Signing in:

"Signing you in..."

Success:

"Welcome back."

Invalid credentials:

"Unable to sign in. Check your email and password."

Network failure:

"We couldn't reach FailureOps. Please try again."

Project loading:

"Loading project intelligence..."

No projects:

"You haven't created a project yet."

[Create project]

========================================================
TASK 7 — RESPONSIVE DESIGN
========================================================

The entire public website and authentication flow must work on:

390px mobile
430px mobile
768px tablet
1024px laptop
1440px desktop
1920px desktop

Requirements:

- no horizontal overflow
- responsive typography
- responsive navigation
- mobile menu
- responsive cards
- responsive product preview
- touch-friendly controls
- proper spacing
- accessible buttons
- readable charts
- no desktop-only assumptions

Do not merely shrink the desktop design.

========================================================
TASK 8 — DESIGN QUALITY
========================================================

Use a sophisticated enterprise intelligence aesthetic.

Keep FailureOps identity:

Dark neutral background
Orange primary accent
Subtle blue/teal information colors
Clean typography
Thin borders
Subtle depth
Controlled gradients
Minimal glass effects

Avoid:

- excessive neon
- excessive glow
- huge gradients
- fake telemetry
- generic AI robot graphics
- excessive animations
- dashboard widgets on the marketing homepage
- meaningless statistics

The website should feel like a serious enterprise SaaS product.

========================================================
TASK 9 — DO NOT BREAK EXISTING FEATURES
========================================================

Before modifying anything, inspect existing:

- auth
- API routes
- middleware
- cookies
- context providers
- project routes
- RAG integration
- agent integration
- evidence
- Failure DNA
- Radar
- historical search
- privacy model

Preserve all existing working functionality.

If you discover an existing authentication mechanism, repair it
rather than creating a second competing authentication system.

========================================================
TASK 10 — CODE QUALITY
========================================================

Use reusable components.

Do not duplicate:

Navbar
Buttons
Cards
Forms
Inputs
Modal
Drawer
Loading states
Error states

Keep:

TypeScript strongly typed
clean component boundaries
clean API/service boundaries
accessible HTML
responsive CSS
minimal unnecessary dependencies

========================================================
TASK 11 — TEST THE AUTH BUG
========================================================

After implementation, explicitly test:

TEST 1:
Sign in → refresh page

Expected:
Still authenticated.

TEST 2:
Sign in → close browser → reopen application

Expected:
Session restored if session is still valid.

TEST 3:
Sign in → navigate directly to /app/dashboard

Expected:
Dashboard loads.

TEST 4:
Sign out → close browser → reopen

Expected:
Login required.

TEST 5:
Open /app/dashboard while logged out

Expected:
Redirect to /login.

TEST 6:
Valid session → visit /login

Expected:
Redirect to dashboard/application.

TEST 7:
Invalid credentials

Expected:
Clear error message.

TEST 8:
Network/API failure

Expected:
Graceful error state.

TEST 9:
Mobile login

Expected:
No overflow and usable form.

TEST 10:
Desktop login

Expected:
Production-quality layout.

========================================================
FINAL REQUIREMENT
========================================================

DO NOT just change colors and spacing.

The result should represent a real product architecture:

PUBLIC WEBSITE
      ↓
AUTHENTICATION
      ↓
PERSISTENT SESSION
      ↓
WORKSPACE
      ↓
PROJECTS
      ↓
EVIDENCE
      ↓
FAILURE INTELLIGENCE

The public website sells/explains the product.

The authenticated application operates the product.

The authentication layer securely connects both.

First inspect the existing repository and report:

1. Current authentication mechanism
2. Why session persistence is currently failing
3. Current landing-page routes/components
4. Components that can be reused
5. Components that should be redesigned
6. Files you intend to modify

Then implement the changes incrementally.

After every major change, run the appropriate type checks,
lint/tests/build checks and fix any regressions before continuing.