import SwiftUI
import WebKit

private enum Snug {
    static let viewings = URL(string: "https://app.snug.com/teams/presencepm/viewings/mobile")!
}

final class BrowserModel: NSObject, ObservableObject, WKNavigationDelegate {
    @Published var isLoading = false
    @Published var hasError = false
    @Published var canGoBack = false
    private var observations: [NSKeyValueObservation] = []
    @Published var status = "Ready"

    // A single persistent website data store retains cookies between launches.
    let webView: WKWebView

    override init() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        webView = WKWebView(frame: .zero, configuration: config)
        super.init()
        webView.navigationDelegate = self
        // Observe history/loading changes, including same-document navigation.
        observations = [
            webView.observe(\.canGoBack, options: [.initial, .new]) { [weak self] view, _ in
                self?.canGoBack = view.canGoBack
            },
            webView.observe(\.isLoading, options: [.initial, .new]) { [weak self] view, _ in
                self?.isLoading = view.isLoading
            }
        ]
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        webView.load(URLRequest(url: Snug.viewings, cachePolicy: .useProtocolCachePolicy))
    }

    func home() { hasError = false; webView.load(URLRequest(url: Snug.viewings)) }
    func reload() {
        hasError = false
        if webView.url == nil { home() } else { webView.reload() }
    }
    func recover() {
        hasError = false
        webView.stopLoading()
        home()
    }
    func back() { if webView.canGoBack { hasError = false; webView.goBack() } }
    func stop() { webView.stopLoading(); isLoading = false; status = "Loading stopped" }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        isLoading = false; hasError = true; status = "Snug page interrupted"
    }
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
        if (error as NSError).domain == NSURLErrorDomain && (error as NSError).code == NSURLErrorCancelled { return }
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
    @State private var showPreferences = false

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                Button(action: browser.back) { Image(systemName: "chevron.left").frame(minWidth: 44, minHeight: 44) }
                    .disabled(!browser.canGoBack).accessibilityLabel("Back")
                Spacer(minLength: 0)
                Button(action: browser.home) { Label("Inspections", systemImage: "calendar") }
                    .accessibilityHint("Opens the Snug inspection list")
                Spacer(minLength: 0)
                Button {
                    if browser.isLoading { browser.stop() } else { browser.reload() }
                } label: {
                    Image(systemName: browser.isLoading ? "xmark" : "arrow.clockwise").frame(minWidth: 44, minHeight: 44)
                }
                .accessibilityLabel(browser.isLoading ? "Stop loading" : "Reload Snug")
                Menu {
                    Button("Viewing preferences", systemImage: "slider.horizontal.3") { showPreferences = true }
                    Button("Page recovery", systemImage: "arrow.triangle.2.circlepath") { showRecovery = true }
                    Text("Inspection lists and check-in are provided by Snug.")
                } label: { Image(systemName: "ellipsis.circle").frame(minWidth: 44, minHeight: 44) }
                .accessibilityLabel("More options")
            }
            .buttonStyle(.borderless)
            .controlSize(.regular)
            .frame(minHeight: 44)
            .padding(.horizontal, 8)
            Divider()
            ZStack(alignment: .top) {
                // Keep this mounted during errors and sheets; never replace the session.
                BrowserView(webView: browser.webView)
                if browser.isLoading {
                    ProgressView().padding(8).background(.regularMaterial, in: Capsule())
                        .allowsHitTesting(false)
                        .accessibilityLabel("Loading Snug")
                }
                if browser.hasError {
                    VStack(spacing: 8) {
                        Text(browser.status).font(.headline)
                        Text("Your saved login has not been cleared.").font(.caption)
                        HStack {
                            Button("Retry page", action: browser.reload)
                            Button("Inspections", action: browser.recover)
                        }
                    }
                    .padding().frame(maxWidth: .infinity).background(.regularMaterial)
                }
            }
        }
        .sheet(isPresented: $showPreferences) { ViewingPreferencesView() }
        .confirmationDialog("Page recovery", isPresented: $showRecovery) {
            Button("Retry current page", action: browser.reload)
            Button("Return to inspections", action: browser.recover)
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Reloading or leaving a form may discard unfinished entries. Saved website login is retained, subject to Snug’s session expiry.")
        }
    }
}

private struct ViewingPreferencesView: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage("preferToday") private var preferToday = true
    @AppStorage("preferMyInspections") private var preferMyInspections = true

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Toggle("Today", isOn: $preferToday)
                    Toggle("My Inspections", isOn: $preferMyInspections)
                } header: {
                    Text("Preferred view · reminder only")
                } footer: {
                    Text("These preferences are saved on this iPhone. They do not filter Snug. Select the matching date and inspector options in Snug, where available. Snug controls whether those selections persist.")
                }
                Section("Snug features") {
                    Text("Inspection listings, inspector selection, attendee details and check-in remain Snug web content.")
                    Text("Jump to Next is not available: the app has no supported access to inspection times or your assigned inspector. Choose your next inspection in Snug.")
                }
            }
            .navigationTitle("Viewing preferences")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }
}
