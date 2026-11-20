import CoreGraphics
import Foundation

struct ContributionFace {
  let points: [CGPoint]
  let depth: Double
  let level: Int
  let shade: Double
}
enum ContributionGeometry {
  static func faces(days: [ContributionDay], weeks: Int, size: CGSize) -> [ContributionFace] {
    guard !days.isEmpty else { return [] }
    let maximum = Double(max(1, days.map(\.count).max() ?? 1))
    let cosine = cos(0.38)
    let sine = sin(0.38)
    func point(_ x: Double, _ y: Double, _ z: Double) -> CGPoint {
      CGPoint(
        x: (x - Double(weeks) / 2) * cosine - (y - 3.5) * sine,
        y: ((x - Double(weeks) / 2) * sine + (y - 3.5) * cosine) * 0.55 - z)
    }
    var raw: [ContributionFace] = []
    for day in days {
      let x = Double(day.week)
      let y = Double(day.weekday)
      let z = day.count > 0 ? 0.35 + 5 * sqrt(Double(day.count) / maximum) : 0.12
      let a = point(x, y, z)
      let b = point(x + 0.78, y, z)
      let c = point(x + 0.78, y + 0.78, z)
      let d = point(x, y + 0.78, z)
      let depth = (x + 0.39 - Double(weeks) / 2) * sine + (y + 0.39 - 3.5) * cosine
      raw.append(
        ContributionFace(
          points: [b, point(x + 0.78, y, 0), point(x + 0.78, y + 0.78, 0), c], depth: depth,
          level: day.level, shade: 0.75))
      raw.append(
        ContributionFace(
          points: [d, c, point(x + 0.78, y + 0.78, 0), point(x, y + 0.78, 0)], depth: depth,
          level: day.level, shade: 0.88))
      raw.append(ContributionFace(points: [a, b, c, d], depth: depth, level: day.level, shade: 1))
    }
    let points = raw.flatMap(\.points)
    let minX = points.map(\.x).min() ?? 0
    let maxX = points.map(\.x).max() ?? 1
    let minY = points.map(\.y).min() ?? 0
    let maxY = points.map(\.y).max() ?? 1
    let scale = max(
      0, min((size.width - 8) / max(1, maxX - minX), (size.height - 8) / max(1, maxY - minY)))
    let left = (size.width - (maxX - minX) * scale) / 2
    let top = (size.height - (maxY - minY) * scale) / 2
    return raw.enumerated().sorted {
      $0.element.depth == $1.element.depth
        ? $0.offset < $1.offset : $0.element.depth < $1.element.depth
    }.map { _, face in
      ContributionFace(
        points: face.points.map {
          CGPoint(x: left + ($0.x - minX) * scale, y: top + ($0.y - minY) * scale)
        }, depth: face.depth, level: face.level, shade: face.shade)
    }
  }
}
