import SwiftUI
import WidgetKit

struct ContributionEntry: TimelineEntry {
  let date: Date
  let snapshot: ContributionSnapshot
}
struct ContributionProvider: TimelineProvider {
  func placeholder(in context: Context) -> ContributionEntry {
    ContributionEntry(date: .now, snapshot: .preview())
  }
  func getSnapshot(in context: Context, completion: @escaping (ContributionEntry) -> Void) {
    completion(
      ContributionEntry(date: .now, snapshot: context.isPreview ? .preview() : WidgetShared.read()))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<ContributionEntry>) -> Void)
  {
    // Refresh labels from shared data only; the widget has no credentials or network client.
    completion(
      Timeline(
        entries: [ContributionEntry(date: .now, snapshot: WidgetShared.read())],
        policy: .after(Date().addingTimeInterval(1800))))
  }
}
struct ContributionWidgetView: View {
  @Environment(\.widgetFamily) private var family
  @Environment(\.colorScheme) private var colorScheme
  let entry: ContributionEntry
  let mode: String
  private var data: ContributionSnapshot { entry.snapshot }
  private var visibleWeeks: Int {
    min(data.weeks, family == .systemSmall ? 13 : family == .systemMedium ? 26 : 54)
  }
  private var days: [ContributionDay] {
    let start = data.weeks - visibleWeeks
    return data.days.filter { $0.week >= start }.map {
      ContributionDay(
        date: $0.date, weekday: $0.weekday, week: $0.week - start, count: $0.count, level: $0.level)
    }
  }
  private var foreground: Color {
    colorScheme == .dark
      ? Color(red: 0.93, green: 0.96, blue: 0.94) : Color(red: 0.09, green: 0.17, blue: 0.13)
  }
  private func color(_ level: Int, shade: Double = 1) -> Color {
    let light: [UInt32] = [0xe6ece8, 0x9be9a8, 0x40c463, 0x30a14e, 0x216e39]
    let dark: [UInt32] = [0x252b34, 0x0e4429, 0x006d32, 0x26a641, 0x39d353]
    let hex = (colorScheme == .dark ? dark : light)[max(0, min(4, level))]
    return Color(
      red: Double((hex >> 16) & 255) / 255 * shade, green: Double((hex >> 8) & 255) / 255 * shade,
      blue: Double(hex & 255) / 255 * shade)
  }
  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack {
        Text(data.username.map { "@\($0)" } ?? "GitPulse").font(
          .system(size: 13, weight: .semibold)
        ).lineLimit(1)
        Spacer(minLength: 4)
        Image(systemName: mode == "3d" ? "cube" : "square.grid.3x3").font(.system(size: 15))
          .foregroundStyle(Color.green).accessibilityHidden(true)
      }
      HStack(alignment: .firstTextBaseline, spacing: 6) {
        Text(data.ready ? data.total.formatted(.number.locale(data.locale)) : "—").font(
          .system(size: family == .systemLarge ? 32 : 25, weight: .bold, design: .rounded)
        ).monospacedDigit().lineLimit(1).minimumScaleFactor(0.6)
        Text(data.text("年度贡献", "年度貢獻", "contributions this year", "過去1年の貢献")).font(
          .system(size: 10)
        ).foregroundStyle(.secondary).lineLimit(2)
      }
      if data.ready {
        Canvas { context, size in
          if mode == "3d" {
            for face in ContributionGeometry.faces(days: days, weeks: visibleWeeks, size: size) {
              var path = Path()
              path.addLines(face.points)
              path.closeSubpath()
              context.fill(path, with: .color(color(face.level, shade: face.shade)))
            }
          } else {
            let columns = visibleWeeks > 27 ? Int(ceil(Double(visibleWeeks) / 2)) : visibleWeeks
            let rows = columns < visibleWeeks ? 16 : 7
            let step = min(size.width / CGFloat(max(1, columns)), size.height / CGFloat(rows))
            let left = (size.width - step * CGFloat(columns)) / 2
            let top = (size.height - step * CGFloat(rows)) / 2
            for day in days {
              let x = left + CGFloat(day.week % columns) * step
              let y = top + CGFloat(day.weekday + day.week / columns * 9) * step
              let cell = max(1, step - max(1, step * 0.18))
              let rect = CGRect(x: x, y: y, width: cell, height: cell)
              context.fill(
                Path(roundedRect: rect, cornerRadius: step * 0.13), with: .color(color(day.level)))
            }
          }
        }
        .accessibilityLabel(
          mode.uppercased() + " · "
            + data.text(
              "最近 \(visibleWeeks) 周贡献", "最近 \(visibleWeeks) 週貢獻", "Last \(visibleWeeks) weeks",
              "直近\(visibleWeeks)週間の貢献"))
      } else {
        Spacer(minLength: 0)
        Text(data.emptyMessage).font(.system(size: 12)).foregroundStyle(.secondary)
          .multilineTextAlignment(.center).frame(maxWidth: .infinity)
        Spacer(minLength: 0)
      }
      Text(
        (data.ready
          ? data.text(
            "近\(visibleWeeks)周 · ", "近\(visibleWeeks)週 · ", "\(visibleWeeks)w · ",
            "\(visibleWeeks)週 · ") : "") + data.footer(at: entry.date)
      )
      .font(.system(size: 9)).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.75)
    }
    .foregroundStyle(foreground)
    .padding(14)
    .containerBackground(for: .widget) {
      colorScheme == .dark
        ? Color(red: 0.08, green: 0.14, blue: 0.11) : Color(red: 0.95, green: 0.97, blue: 0.95)
    }
    .accessibilityElement(children: .combine)
  }
}
struct Contributions2DWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "GitPulseContributions2D", provider: ContributionProvider()) {
      entry in ContributionWidgetView(entry: entry, mode: "2d")
    }
    .configurationDisplayName("Contributions · 2D")
    .description("GitHub contributions, synced when you open GitPulse.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    .contentMarginsDisabled()
  }
}
struct Contributions3DWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "GitPulseContributions3D", provider: ContributionProvider()) {
      entry in ContributionWidgetView(entry: entry, mode: "3d")
    }
    .configurationDisplayName("Contributions · 3D")
    .description("GitHub contributions, synced when you open GitPulse.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    .contentMarginsDisabled()
  }
}
@main struct GitPulseWidgets: WidgetBundle {
  var body: some Widget {
    Contributions2DWidget()
    Contributions3DWidget()
  }
}
