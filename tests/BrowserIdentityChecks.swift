import Foundation

@main
struct BrowserIdentityChecks {
    static func main() {
        let embedded = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
        let system = OperatingSystemVersion(majorVersion: 26, minorVersion: 0, patchVersion: 1)
        let result = BrowserIdentity.safariCompatibleUserAgent(embedded, systemVersion: system)
        precondition(result.hasPrefix(embedded), "Preserve the original device, OS, engine and mobile tokens")
        precondition(result.hasSuffix("Version/26.0 Safari/604.1 PresenceOpenHomes/0.2"))
        precondition(BrowserIdentity.safariCompatibleUserAgent(result, systemVersion: system) == result)
        let older = OperatingSystemVersion(majorVersion: 18, minorVersion: 6, patchVersion: 2)
        precondition(BrowserIdentity.safariCompatibleUserAgent(embedded, systemVersion: older).contains("Version/18.6"), "Use installed OS version, not a future browser version")
        for original in ["", "unknown browser", "Mozilla/5.0 AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15"] {
            precondition(BrowserIdentity.safariCompatibleUserAgent(original, systemVersion: system) == original)
        }
        print("Browser identity checks passed")
    }
}
