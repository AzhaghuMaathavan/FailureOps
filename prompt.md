MASTER PROMPT — FIX "REGISTER PRODUCT" BUTTON ON LIVE ENCLAVE DASHBOARD

PROJECT:
FAILUREOPS X — PROJECT FAILURE INTELLIGENCE

CURRENT BUG
-----------

On the main dashboard:

/dashboard

there is a top-right button:

"Register Product"

The button is visible but clicking it does not correctly navigate to the
existing product/project registration flow.

IMPORTANT:
Do NOT create a duplicate registration page.

There is ALREADY an existing registration flow in the application with:

Step 1:
Product details

Step 2:
Evidence sources

Step 3:
Privacy

Then:

Create Project & Build Intelligence

Reuse that existing flow.

============================================================
1. FIRST — AUDIT
============================================================

Before changing code, inspect:

- dashboard page
- Register Product button
- existing registration route
- existing registration page/components
- router configuration
- navigation helpers
- project creation API
- registration state/store
- route guards
- auth/project context

Determine exactly why:

Dashboard
→ Register Product

is not navigating/working.

Do NOT assume the cause.

Possible causes:

- missing onClick
- wrong route
- stale route
- router misconfiguration
- button rendered without navigation
- event handler broken
- route guard
- incorrect relative URL
- registration page mounted at another path
- JavaScript error

Identify the actual root cause.

============================================================
2. REUSE EXISTING REGISTRATION FLOW
============================================================

There must be ONE canonical registration flow.

Expected:

Dashboard
    ↓
Register Product
    ↓
/register
    ↓
Step 1 — Product details
    ↓
Step 2 — Evidence sources
    ↓
Step 3 — Privacy
    ↓
Create Project & Build Intelligence

Do NOT create:

/dashboard/register-product

or another duplicate registration workflow if /register already exists.

Use the current registration implementation.

============================================================
3. BUTTON BEHAVIOR
============================================================

Clicking:

Register Product

must navigate to the canonical registration route.

Use the application's existing router/navigation mechanism.

Prefer:

router navigation

over:

window.location.href

unless the current application intentionally uses full-page navigation.

============================================================
4. PROJECT CONTEXT
============================================================

Dashboard may be:

/dashboard

and registration may be:

/register

or another existing route.

Inspect the real router and use the correct current route.

Do not hardcode a guessed route.

============================================================
5. BUTTON SHOULD WORK FROM ALL RELEVANT STATES
============================================================

Test the button when:

- no project selected
- project selected
- multiple projects available
- dashboard has loaded
- dashboard has partial data
- API is temporarily unavailable

The button should still take the user to registration.

Do NOT make registration dependent on dashboard intelligence data loading.

============================================================
6. DO NOT BREAK SIDEBAR NAVIGATION
============================================================

The sidebar already contains:

Register New Product

Make sure:

Dashboard → Register Product

and:

Sidebar → Register New Product

both point to the SAME registration flow.

Do not create two different implementations.

============================================================
7. ACTIVE ROUTE
============================================================

When navigating to registration:

- registration route should become active
- dashboard state should not break
- sidebar should remain functional
- browser Back should return to dashboard

============================================================
8. PRESERVE FORM STATE
============================================================

Do not accidentally destroy registration state while navigating between:

Step 1
Step 2
Step 3

Existing behavior must remain intact.

============================================================
9. ROUTER AUDIT
============================================================

Inspect route definitions for something similar to:

/dashboard
/register
/projects/:projectId/...

Determine the canonical registration path.

Verify:

GET/render route works directly.

This is important because a button navigation fix should not hide a broken
registration route.

============================================================
10. DIRECT URL TEST
============================================================

Open the registration URL directly in the browser.

Verify:

Step 1 loads correctly.

Then test:

Dashboard
→ Register Product
→ same Step 1 screen.

Both paths must reach the same page/component.

============================================================
11. CONSOLE ERROR CHECK
============================================================

Use browser DevTools.

Click:

Register Product

Check for:

- JavaScript exception
- routing error
- failed network request
- chunk loading error
- authorization error

Fix the real issue if present.

Do not suppress console errors.

============================================================
12. NETWORK CHECK
============================================================

A simple navigation button may require NO backend request.

Do not unnecessarily create an API call when the correct behavior is simply
routing to the existing registration page.

If registration page itself loads project data/configuration, verify those
requests separately.

============================================================
13. BUTTON ACCESSIBILITY
============================================================

Ensure the button remains a real accessible button/link.

It should work with:

- mouse
- keyboard Enter
- keyboard Space if it's a button

Do not replace it with a click-only div.

============================================================
14. LOADING / DOUBLE CLICK
============================================================

Prevent accidental duplicate navigation or duplicate project creation.

IMPORTANT:

The dashboard button only navigates.

It must NOT create a project.

Project creation should happen only when the user presses:

Create Project & Build Intelligence

in the registration flow.

============================================================
15. DO NOT CHANGE PRODUCT CREATION LOGIC
============================================================

This bug is about navigation.

Do not modify:

- project creation
- privacy logic
- evidence selection
- LangGraph analysis
- RAG
- document ingestion

unless the audit proves the registration route itself is broken.

============================================================
16. REGRESSION TEST
============================================================

Add or update a frontend test:

dashboard renders
→ locate Register Product
→ click
→ assert canonical registration route/component is displayed.

Also verify:

sidebar Register New Product
→ same destination.

============================================================
17. LIVE BROWSER TEST
============================================================

Perform this exact test:

1. Open /dashboard
2. Confirm "Register Product" visible
3. Click it
4. Confirm URL changes to canonical registration route
5. Confirm Step 1 — Product details appears
6. Click through Step 2
7. Click through Step 3
8. Confirm existing registration flow still works
9. Use Back
10. Confirm dashboard returns correctly

============================================================
18. IMPORTANT — DO NOT CREATE DUPLICATE ROUTES
============================================================

Search the project for all occurrences of:

Register Product
Register New Product
/register
registration

There must be a clear canonical route.

If duplicate registration components/routes already exist, document them.

Do not blindly delete them.

============================================================
19. FINAL REPORT
============================================================

Return:

1. Root cause
2. File/component responsible
3. Canonical registration route
4. Code change made
5. Whether backend was touched
6. Test added
7. Test result
8. Browser verification result

Use:

BEFORE:
Dashboard → Register Product → nothing/broken

AFTER:
Dashboard → Register Product → existing registration flow

============================================================
20. FINAL ACCEPTANCE
============================================================

The fix is complete only when:

✓ Dashboard Register Product works

✓ Sidebar Register New Product works

✓ Both use the same registration flow

✓ No duplicate registration page created

✓ Browser URL changes correctly

✓ Registration Step 1 loads

✓ Existing Step 2 and Step 3 still work

✓ Project creation is not triggered by dashboard button

✓ Back navigation works

✓ No new console errors

✓ No regression to existing project functionality

============================================================
START
============================================================

First audit the current router and dashboard button implementation.

Do not modify code until you know:

WHY the button currently fails

and

WHAT the canonical registration route already is.

Then make the smallest correct fix.