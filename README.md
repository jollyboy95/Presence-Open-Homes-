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