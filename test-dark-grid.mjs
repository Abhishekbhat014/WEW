import { chromium } from 'playwright';

async function testGridStyles() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  await context.addInitScript(() => {
    localStorage.setItem('webdraw_theme_preference', 'dark');
  });

  const page = await context.newPage();
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(1000);

  // Draw a quick rectangle to dismiss blank overlay
  await page.keyboard.press('1');
  await page.waitForTimeout(100);
  await page.mouse.move(100, 100);
  await page.mouse.down({ button: 'left' });
  await page.mouse.move(180, 180);
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(200);

  // 1. Capture dark dots
  await page.screenshot({ path: 'scratch/screenshot-dark-dots.png' });
  console.log('Saved scratch/screenshot-dark-dots.png');

  // Open Canvas settings modal
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('app:open-canvas-settings'));
  });
  await page.waitForTimeout(400);

  // 2. Select Lines
  await page.locator('button:has-text("Lines")').click();
  await page.waitForTimeout(200);
  await page.locator('button:has-text("Done")').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'scratch/screenshot-dark-lines.png' });
  console.log('Saved scratch/screenshot-dark-lines.png');

  // Open Canvas settings modal again
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('app:open-canvas-settings'));
  });
  await page.waitForTimeout(400);

  // 3. Select Graph
  await page.locator('button:has-text("Graph")').click();
  await page.waitForTimeout(200);
  await page.locator('button:has-text("Done")').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'scratch/screenshot-dark-graph.png' });
  console.log('Saved scratch/screenshot-dark-graph.png');

  await browser.close();
}

testGridStyles().catch(err => {
  console.error(err);
  process.exit(1);
});
