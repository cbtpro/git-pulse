import XCTest
final class GestureTests: XCTestCase {
  func testRetainedInteractiveBack() {
    let app = XCUIApplication(bundleIdentifier: "com.chenbitao.gitpulse")
    app.terminate()
    app.launch()
    XCTAssertTrue(app.links["我的"].waitForExistence(timeout: 15))
    app.links["我的"].tap()
    let settings = app.buttons["账号与外观"]
    XCTAssertTrue(settings.waitForExistence(timeout: 10))
    settings.tap()
    let marker = app.staticTexts["顶部毛玻璃效果"].firstMatch
    XCTAssertTrue(marker.waitForExistence(timeout: 10))
    let origin = app.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0))
    let initialY = marker.frame.minY
    for _ in 0..<4 {
      if marker.frame.maxY < 730 { break }
      origin.withOffset(CGVector(dx: 8, dy: 680)).press(forDuration: 0.05, thenDragTo: origin.withOffset(CGVector(dx: 8, dy: 320)))
      Thread.sleep(forTimeInterval: 0.8)
    }
    let savedY = marker.frame.minY
    let fixedNav = app.links["我的"].frame
    XCTAssertLessThan(savedY, initialY)
    XCTAssertGreaterThan(savedY, 120)
    XCTAssertLessThan(savedY, 780)
    let before = XCTAttachment(screenshot: app.screenshot())
    before.name = "settings-before-return"
    before.lifetime = .keepAlways
    add(before)
    app.links["搜索"].tap()
    XCTAssertFalse(marker.exists)
    // A short edge drag cancels; it must not consume a history entry.
    origin.withOffset(CGVector(dx: 8, dy: 450)).press(forDuration: 0.05, thenDragTo: origin.withOffset(CGVector(dx: 45, dy: 450)))
    Thread.sleep(forTimeInterval: 0.6)
    XCTAssertFalse(marker.exists)
    XCTAssertEqual(app.links["我的"].frame, fixedNav)
    // Complete a true history Back, preserving the settings viewport.
    origin.withOffset(CGVector(dx: 8, dy: 450)).press(forDuration: 0.05, thenDragTo: origin.withOffset(CGVector(dx: 350, dy: 450)))
    XCTAssertTrue(marker.waitForExistence(timeout: 5))
    XCTAssertEqual(marker.frame.minY, savedY, accuracy: 1)
    XCTAssertEqual(app.links["我的"].frame, fixedNav)
    let after = XCTAttachment(screenshot: app.screenshot())
    after.name = "settings-after-return"
    after.lifetime = .keepAlways
    add(after)
    // A second completed gesture returns to the actual previous profile page.
    origin.withOffset(CGVector(dx: 8, dy: 450)).press(forDuration: 0.05, thenDragTo: origin.withOffset(CGVector(dx: 350, dy: 450)))
    XCTAssertTrue(settings.waitForExistence(timeout: 5))
    XCTAssertFalse(marker.exists)
    XCTAssertEqual(app.links["我的"].frame, fixedNav)
  }
}
