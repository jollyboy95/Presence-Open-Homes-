# Presence Open Homes

SwiftUI iOS companion for Snug mobile viewings.

## Initial build
- Persistent WKWebView website session (subject to Snug's expiry rules)
- Refresh, navigation and recovery controls
- GitHub Actions iOS Simulator build using XcodeGen

## Build
Run `xcodegen generate` on macOS with Xcode and XcodeGen, then open `PresenceOpenHomes.xcodeproj`.

The workflow builds for the simulator only; installation on an iPhone requires Apple signing/provisioning. No Snug passwords, tokens or tenant data belong in this public repository.

## Roadmap
Native date and inspector filters, attendee actions and owner reports depend on an authorised Snug integration. Not affiliated with Snug.
## v0.2 native navigation
One compact top toolbar provides Back, Forward, Inspections, Reload/Stop and More.
The web view stays mounted during loading errors and preference sheets, using the
same default persistent website data store. Recovery can retry the current page or
return to the existing inspections URL; neither clears website storage. Reloading
or navigating away can discard unfinished web forms.

Viewing preferences save Today/My Inspections as **local reminders only**. They do
not apply filters, identify the signed-in inspector, or change Snug content. Apply
Snug's own filters where available. No supported filter URL/API or reliable inspection
time integration is present in this repository, so automatic filtering and Jump to
Next are deferred. No JavaScript, DOM scraping or undocumented endpoints are added.

### iPhone acceptance test (requires a signed local build)
1. Pull this branch, run `xcodegen generate`, open the project, select the same
   bundle identifier and signing team used for v0.1, and Run on the iPhone.
   Install over v0.1; do not delete the app, which would remove its website data.
2. Confirm Snug remains signed in and inspections load. Force-close and relaunch;
   confirm the session persists (unless Snug expires it).
3. Open an inspection. Use Back then Forward and confirm correct history states.
   Use Inspections to return to the list. Check swipe-back navigation as well.
4. Open More > Viewing preferences. Change Today/My Inspections, close the sheet,
   relaunch and verify the choices persist. Confirm toggling them does not change
   Snug's list. Use Snug's own date/inspector controls, if offered, to filter it.
5. On a test inspection, verify registered attendees and the existing check-in /
   application-link flow. Do not submit live check-ins solely for testing.
6. While loading, tap Stop, then Reload. With network disabled, load a page and
   verify recovery appears. Restore network and use Retry page; separately test
   More > Page recovery > Return to inspections. Verify login remains available.
7. With an unfinished test form, open and dismiss preferences: entries should stay.
   Verify the recovery dialog warns before leaving a form. Cancel should do nothing.
8. Check the toolbar on a small iPhone, landscape, large text and VoiceOver. Check
   Back/Forward disabled states and the changing Reload/Stop accessibility label.

CI verifies compilation for iOS Simulator only. Authenticated web behavior and
physical-device installation require the manual tests above; compilation is not
proof of login or check-in success.
