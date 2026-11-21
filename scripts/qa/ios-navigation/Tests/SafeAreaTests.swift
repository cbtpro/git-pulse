import XCTest

final class SafeAreaTests: XCTestCase {
  func testBottomNavigationUsesSafeAreaOnce() {
    let app = XCUIApplication(bundleIdentifier: "com.chenbitao.gitpulse")
    app.launch()
    XCTAssertTrue(app.links["我的"].waitForExistence(timeout: 15))
    app.links["我的"].tap()
    let settings = app.buttons["账号与外观"]
    XCTAssertTrue(settings.waitForExistence(timeout: 10))
    settings.tap()
    let toggle = app.switches["开启安全区"]
    XCTAssertTrue(toggle.waitForExistence(timeout: 10))
    let origin = app.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0))
    for _ in 0..<8 {
      if toggle.isHittable && toggle.frame.maxY < 800 { break }
      origin.withOffset(CGVector(dx: 220, dy: 700)).press(forDuration: 0.05,
        thenDragTo: origin.withOffset(CGVector(dx: 220, dy: 370)))
    }
    let initiallyEnabled = toggle.value as? String != "0"
    if !initiallyEnabled { toggle.tap() }
    Thread.sleep(forTimeInterval: 0.6)
    let fullHeight = app.frame.maxY
    // Accessibility bounds enclose the link content, not its whole DOM box.
    // A single 34pt home inset fits here; the old extra 93pt gap does not.
    let enabledBottom = app.links["我的"].frame.maxY
    XCTAssertGreaterThanOrEqual(fullHeight - enabledBottom, 34)
    XCTAssertLessThan(fullHeight - enabledBottom, 60)
    let enabled = XCTAttachment(screenshot: app.screenshot())
    enabled.name = "safe-area-enabled"
    enabled.lifetime = .keepAlways
    add(enabled)
    toggle.tap()
    Thread.sleep(forTimeInterval: 0.6)
    XCTAssertEqual(app.links["我的"].frame.maxY, enabledBottom + 34, accuracy: 2)
    XCTAssertLessThan(fullHeight - app.links["我的"].frame.maxY, 26)
    let disabled = XCTAttachment(screenshot: app.screenshot())
    disabled.name = "safe-area-disabled"
    disabled.lifetime = .keepAlways
    add(disabled)
    toggle.tap()
    Thread.sleep(forTimeInterval: 0.6)
    XCTAssertEqual(app.links["我的"].frame.maxY, enabledBottom, accuracy: 2)
    app.descendants(matching: .any).matching(identifier: "聚合搜索").firstMatch.tap()
    XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
    let keyboard = XCTAttachment(screenshot: app.screenshot())
    keyboard.name = "safe-area-keyboard-open"
    keyboard.lifetime = .keepAlways
    add(keyboard)
    app.buttons["关闭搜索"].tap()
    Thread.sleep(forTimeInterval: 1)
    XCTAssertFalse(app.keyboards.firstMatch.exists)
    XCTAssertEqual(app.links["我的"].frame.maxY, enabledBottom, accuracy: 2)
    if !initiallyEnabled { toggle.tap() }
  }
}
