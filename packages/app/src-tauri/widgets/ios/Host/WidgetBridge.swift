import Foundation
import WidgetKit

// Objective-C lookup avoids an unresolved Swift symbol when Cargo also builds a cdylib.
@objc(GitPulseWidgetBridge)
public final class GitPulseWidgetBridge: NSObject {
  @objc public static func available() -> Int32 { WidgetShared.fileURL == nil ? 0 : 1 }
  @objc public static func write(_ payload: String) -> Int32 {
    guard let data = payload.data(using: .utf8), data.count <= 80_000,
      let url = WidgetShared.fileURL
    else { return 1 }
    do {
      let snapshot = try JSONDecoder().decode(ContributionSnapshot.self, from: data).validated()
      // Only aggregate counts and the account label enter the shared container.
      try JSONEncoder().encode(snapshot).write(
        to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
      WidgetCenter.shared.reloadTimelines(ofKind: "GitPulseContributions2D")
      WidgetCenter.shared.reloadTimelines(ofKind: "GitPulseContributions3D")
      return 0
    } catch { return 2 }
  }
}
