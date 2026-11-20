import Foundation

struct ContributionDay: Codable {
  let date: String
  let weekday: Int
  let week: Int
  let count: Int
  let level: Int
}
struct ContributionSnapshot: Codable {
  let version: Int
  let accountId: String?
  let username: String?
  let language: String
  let status: String
  let updatedAt: Double?
  let total: Int
  let weeks: Int
  let days: [ContributionDay]
  var ready: Bool { status == "ready" && username != nil && weeks > 0 }
  var locale: Locale { Locale(identifier: language) }
  func text(_ zh: String, _ tw: String, _ en: String, _ ja: String) -> String {
    switch language {
    case "zh-CN": return zh
    case "zh-TW": return tw
    case "ja": return ja
    default: return en
    }
  }
  var emptyMessage: String {
    switch status {
    case "loading": return text("正在同步贡献", "正在同步貢獻", "Syncing contributions", "貢献を同期中")
    case "unavailable": return text("打开应用重试", "開啟應用程式重試", "Open app to retry", "アプリで再試行")
    default:
      return text("打开 GitPulse 登录", "開啟 GitPulse 登入", "Open GitPulse to sign in", "GitPulse でログイン")
    }
  }
  func footer(at date: Date) -> String {
    guard let updatedAt else {
      return text("跟随当前账号", "跟隨目前帳號", "Follows active account", "現在のアカウントと同期")
    }
    let updated = Date(timeIntervalSince1970: updatedAt / 1000)
    if date.timeIntervalSince(updated) > 86400 {
      return text("打开应用更新", "開啟應用程式更新", "Open app to update", "アプリで更新")
    }
    let formatter = DateFormatter()
    formatter.locale = locale
    formatter.timeStyle = .short
    return text("更新 ", "更新 ", "Updated ", "更新 ") + formatter.string(from: updated)
  }
  static func empty() -> ContributionSnapshot {
    let current = Locale.preferredLanguages.first ?? "en"
    let language =
      current.hasPrefix("zh-Hant") || current.hasPrefix("zh-TW")
      ? "zh-TW" : current.hasPrefix("zh") ? "zh-CN" : current.hasPrefix("ja") ? "ja" : "en"
    return ContributionSnapshot(
      version: 1, accountId: nil, username: nil, language: language, status: "signedOut",
      updatedAt: nil, total: 0, weeks: 0, days: [])
  }
  static func preview() -> ContributionSnapshot {
    let days = (0..<53).flatMap { week in
      (0..<7).map { day in
        let level = (week * week + day * 3 + week * day) % 5
        return ContributionDay(
          date: "2026-01-01", weekday: day, week: week, count: level * 3, level: level)
      }
    }
    return ContributionSnapshot(
      version: 1, accountId: "preview", username: "GitPulse", language: empty().language,
      status: "ready", updatedAt: Date().timeIntervalSince1970 * 1000,
      total: days.reduce(0) { $0 + $1.count }, weeks: 53, days: days)
  }
  func validated() throws -> ContributionSnapshot {
    guard version == 1, (0...54).contains(weeks), days.count <= 378,
      ["ready", "signedOut", "loading", "unavailable"].contains(status),
      days.allSatisfy({
        (0...6).contains($0.weekday) && (0..<weeks).contains($0.week) && (0...4).contains($0.level)
          && $0.count >= 0
      })
    else { throw CocoaError(.fileReadCorruptFile) }
    return self
  }
}
enum WidgetShared {
  static var groupID: String {
    Bundle.main.object(forInfoDictionaryKey: "GitPulseAppGroup") as? String
      ?? "group.com.pe7er.gitpulse"
  }
  static var fileURL: URL? {
    FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupID)?
      .appendingPathComponent("contribution-widget.json")
  }
  static func read() -> ContributionSnapshot {
    guard let url = fileURL, let data = try? Data(contentsOf: url), data.count <= 80_000,
      let snapshot = try? JSONDecoder().decode(ContributionSnapshot.self, from: data).validated()
    else { return .empty() }
    return snapshot
  }
}
