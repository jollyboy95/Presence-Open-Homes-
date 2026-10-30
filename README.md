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
One compact top toolbar provides Back, Inspections, Reload/Stop and More.
Forward was removed after an iPhone test found it tappable without visible navigation.
Reopen an inspection from the list; the cause of Snug’s forward-history behavior is unconfirmed.
The web view stays mounted during loading errors and preference sheets, using the
same default persistent website data store. Recovery can retry the current page or
return to the existing inspections URL; neither clears website storage. Reloading
or navigating away can discard unfinished web forms.

## Automatic Me + Today and Presence icon
The native Viewing preferences toggles now control a small WebKit script which
operates Snug's existing filter controls on a fresh inspection-list document.
It opens the observed filter panel, clicks the Team Member **Me** control, selects
**Today only**, waits for list rendering to settle, replays the phone-verified All → Today
transition, and collapses the panel if it opened it. It also checks visible date
headings; a future-day heading prevents success even if the dropdown says Today. Preferences default to enabled; previously saved toggle choices are respected.
Turning a preference off leaves that Snug filter unchanged. Preference changes take
effect on the next reload. Later manual choices are not overwritten in the same
document, including after returning from an inspection. A fresh reload or relaunch
applies preferences again. No automatic refresh occurs while the app remains open
over midnight; reload the list to apply the new day.

This is automation of observed web controls, **not a supported Snug API or a native
inspection database**. Controls were inspected in the authenticated mobile page on
30 October 2026. The script is restricted to the exact HTTPS Snug team/list route,
main frame and an isolated content world. It does not read cookies, credentials,
attendee details, application state or private API responses, and sends only status
codes to native UI. It never submits check-ins. It stops on navigation, relevant
manual input, ambiguous controls or a 20-second timeout. If controls change, use
Snug's filters manually; the native banner reports when selection cannot be verified.
Today may show an empty list; the app does not silently broaden it to future dates.
Jump to Next remains deferred.

The home-screen icon uses the official Presence website's favicon artwork:
https://presence.realestate/wp-content/uploads/2025/03/favicon2.png
(from https://presence.realestate/). It is placed on an opaque square background
for iOS; the Presence mark remains its owner's branding, not a new original asset.

### Automated checks
With Node 22: `npm ci --ignore-scripts && npm test`.
Seventeen DOM-fixture checks cover selection, independent preferences, route restrictions,
timeout, ambiguity, navigation, stale date headings, preservation of manual filters,
Overview URL defaults, and dark appearance restoration. They do
not replace authenticated WKWebView testing on the iPhone. CI runs these checks
before the simulator compile.

### iPhone acceptance test (requires a signed local build)
1. Pull this branch, run `xcodegen generate`, open the project, select the same
   bundle identifier and signing team used for v0.1, and Run on the iPhone.
   Install over v0.1; do not delete the app, which would remove its website data.
2. Confirm Snug remains signed in and inspections load. Force-close and relaunch;
   confirm the session persists (unless Snug expires it).
3. Open an inspection. Use Back and confirm it returns to the previous page. Reopen the inspection from the list.
   Use Inspections to return to the list. Check swipe-back navigation as well.
4. Open More > Viewing preferences. Enable Today and My Inspections, close the
   sheet and reload. Open Snug's filter panel and verify Team Member is your account
   and Date is Today only. An empty list is correct if you have no inspections today.
   Close/reopen the app and verify both selections restore automatically.
   Manually choose a different inspector/date; open an inspection and return with
   Back. Verify those manual choices remain until a fresh reload.
   Disable each preference separately and reload; verify only the enabled filter
   is applied. Disable both and verify Snug behaves normally. Re-enable both.
   With a slow connection, verify failure leaves a manual-filter fallback message.
5. On a test inspection, verify registered attendees and the existing check-in /
   application-link flow. Do not submit live check-ins solely for testing.
6. While loading, tap Stop, then Reload. With network disabled, load a page and
   verify recovery appears. Restore network and use Retry page; separately test
   More > Page recovery > Return to inspections. Verify login remains available.
7. With an unfinished test form, open and dismiss preferences: entries should stay.
   Verify the recovery dialog warns before leaving a form. Cancel should do nothing.
8. Check the toolbar on a small iPhone, landscape, large text and VoiceOver. Check
   Back disabled state and the changing Reload/Stop accessibility label.

9. Return to the iPhone home screen and verify the Presence icon appears.

CI verifies the filter fixtures and compilation for iOS Simulator. Authenticated web behavior and
physical-device installation require the manual tests above; compilation is not
proof of login or check-in success.

## Dark appearance and Overview defaults
Dark appearance is enabled by default for both native controls and Snug pages.
The app recolours neutral page surfaces, text and borders. It does not invert or
filter images, background images, logos or video. Dynamically added page content
is themed too. More > Viewing preferences > Dark appearance restores Snug’s
original colours when switched off and the sheet is closed. Third-party chat
iframes and external sites keep their own appearance. Snug UI changes may require
colour adjustments; check all check-in fields and controls on the phone.

Overview's Live filter was inspected through Filter > Property > Live > Apply
Filter. Snug produced this normal page URL, which retained the Live filter on
reload: `https://app.snug.com/teams/presencepm/overview?listingStatus=live`.
On a fresh Overview visit without an explicit listingStatus parameter, the app
uses that observed parameter, preserving all other query parameters. Explicit
listing filters and later manual changes are honoured. More > Viewing preferences
can disable this default. No private API endpoint or property-status mutation is
used; this changes only the displayed list.

### Additional iPhone checks
1. Reload inspections with Me + Today enabled. Verify the actual date headings
   match today; do not judge success solely from the dropdown. No inspections is
   a valid result. If a future day remains, report the fallback banner and heading.
2. Open Overview using Snug’s speedometer icon. Verify the Property filter is Live.
   Change filters manually and verify the app does not continually reset them.
   Reload with the Live preference disabled and verify explicit filters are honoured.
3. Check dark inspection lists, Overview, attendee details, text inputs, dropdowns,
   dialogs and check-in buttons. Property photos must retain their original colours.
   Switch Dark appearance off, close preferences and verify original colours return.
4. Confirm login still persists and check-in still works during a legitimate inspection.

Dark appearance was visually reviewed on a representative local page at an iPhone
viewport. Full authenticated dark styling and the revised Today sequence still
require physical-iPhone verification.
