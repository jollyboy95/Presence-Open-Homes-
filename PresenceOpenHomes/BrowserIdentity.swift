import Foundation

/// Retains WebKit's actual device/engine identity and adds iOS Safari compatibility tokens.
/// This changes browser detection, not the rendering engine or security settings.
enum BrowserIdentity {
    static func safariCompatibleUserAgent(_ original: String, systemVersion: OperatingSystemVersion) -> String {
        guard original.contains("AppleWebKit/"), original.contains("Mobile/") else { return original }
        guard !original.contains("Version/") || !original.contains("Safari/") else { return original }
        let version = "\(systemVersion.majorVersion).\(systemVersion.minorVersion)"
        return original + " Version/\(version) Safari/604.1 PresenceOpenHomes/0.2"
    }
}
