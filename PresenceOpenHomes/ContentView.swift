import SwiftUI
import WebKit

private enum Snug {
    static let viewings = URL(string: "https://app.snug.com/teams/presencepm/viewings/mobile")!
}

final class BrowserModel: NSObject, ObservableObject, WKNavigationDelegate {
    @Published var isLoading = false
    @Published var hasError = false
    @Published var canGoBack = false
    @Published var status = "Ready"

    // A single persistent website data store retains cookies between launches.
    let webView: WKWebView

    override init() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        webView = WKWebView(frame: .zero, configuration: config)
        super.init()
        webView.navigationDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        webView.load(URLRequest(url: Snug.viewings, cachePolicy: .useProtocolCachePolicy))
    }

    func home() { webView.load(URLRequest(url: Snug.viewings)) }
    func reload() {
        hasError = false
        if webView.url == nil { home() } else { webView.reload() }
    }
    func recover() {
        hasError = false
        webView.stopLoading()
        home()
    }
    func back() { if webView.canGoBack { webView.goBack() } }
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        isLoading = true; hasError = false; status = "Loading Snug..."
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        isLoading = false; status = "Connected"; canGoBack = webView.canGoBack
    }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        fail(error)
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        fail(error)
    }
    private func fail(_ error: Error) {
        isLoading = false
        if (error as NSError).code == NSURLErrorCancelled { return }
        hasError = true; status = "Unable to load Snug"
    }
}

struct BrowserView: UIViewRepresentable {
    let webView: WKWebView
    func makeUIView(context: Context) -> WKWebView { webView }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

struct ContentView: View {
    @StateObject private var browser = BrowserModel()
    @State private var showRecovery = false

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Presence Open Homes").font(.headline)
                    Text(browser.status).font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                if browser.isLoading { ProgressView() }
                Button(action: { browser.reload() }) {
                    Image(systemName: "arrow.clockwise").font(.title3)
                }
                .accessibilityLabel("Reload Snug")
            }
            .padding(.horizontal, 16).padding(.vertical, 12)
            Divider()
            if browser.hasError {
                VStack(spacing: 12) {
                    Image(systemName: "wifi.exclamationmark").font(.largeTitle)
                    Text("Snug couldn't load").font(.headline)
                    Button("Try again") { browser.recover() }.buttonStyle(.borderedProminent)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                BrowserView(webView: browser.webView)
            }
            Divider()
            HStack {
                Button { browser.back() } label: {
                    Label("Back", systemImage: "chevron.left")
                }
                .disabled(!browser.canGoBack)
                Spacer()
                Button { browser.home() } label: {
                    Label("Inspections", systemImage: "calendar")
                }
                Spacer()
                Button { showRecovery = true } label: {
                    Label("Fix page", systemImage: "arrow.triangle.2.circlepath")
                }
            }
            .font(.caption).padding(.horizontal, 14).padding(.vertical, 12)
        }
        .confirmationDialog("Page not responding?", isPresented: $showRecovery) {
            Button("Reload inspections") { browser.recover() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Reloads Snug without deliberately deleting your saved login.")
        }
    }
}
