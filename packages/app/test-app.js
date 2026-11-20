import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.createContext();
  const page = await context.newPage();
  
  try {
    await page.goto('http://localhost:1420', { waitUntil: 'networkidle' });
    
    // 检查页面标题
    const title = await page.title();
    console.log('Page title:', title);
    
    // 检查是否有登录相关的元素
    const hasLoginButton = await page.locator('text=/login|登录/i').count() > 0;
    console.log('Has login element:', hasLoginButton);
    
    // 检查页面内容
    const bodyText = await page.locator('body').textContent();
    console.log('Page has content:', bodyText && bodyText.length > 0);
    
    // 截图
    await page.screenshot({ path: 'screenshot.png' });
    console.log('Screenshot saved');
    
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
})();
