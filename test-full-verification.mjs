import { chromium } from 'playwright';

async function runFullVerification() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const browserErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') browserErrors.push(msg.text());
  });
  page.on('pageerror', err => browserErrors.push(err.message));

  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(1000);

  // Helper for secondary tools
  async function selectSecondary(toolId) {
    await page.locator('button[data-tool="more-tools"]').click({ force: true });
    await page.waitForTimeout(150);
    await page.locator(`button[data-tool="${toolId}"]`).click({ force: true });
    await page.waitForTimeout(150);
  }

  console.log('--- 1. FREEHAND TESTS (Pencil, Pen, Highlighter) ---');

  // 1.1 Test Pencil (Shortcut: 6)
  console.log('Testing Pencil (6)...');
  await page.keyboard.press('6');
  await page.waitForTimeout(200);

  // Hover without clicking (should produce NO drawing)
  await page.mouse.move(50, 100);
  await page.mouse.move(100, 100, { steps: 5 });

  // Draw stroke 1
  await page.mouse.move(150, 100);
  await page.mouse.down({ button: 'left' });
  await page.mouse.move(200, 120, { steps: 5 });
  await page.mouse.move(250, 100, { steps: 5 });
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(200);

  // Move freely without button (should NOT draw)
  await page.mouse.move(300, 100, { steps: 10 });
  await page.mouse.move(350, 150, { steps: 10 });

  // Draw stroke 2
  await page.mouse.move(150, 150);
  await page.mouse.down({ button: 'left' });
  await page.mouse.move(200, 170, { steps: 5 });
  await page.mouse.move(250, 150, { steps: 5 });
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(200);

  // Move freely again (should NOT draw)
  await page.mouse.move(300, 150, { steps: 10 });

  // 1.2 Test Highlighter (Shortcut: 7)
  console.log('Testing Highlighter (7)...');
  await page.keyboard.press('7');
  await page.waitForTimeout(200);

  // Hover without clicking
  await page.mouse.move(50, 220);
  await page.mouse.move(100, 220, { steps: 5 });

  // Draw stroke 1
  await page.mouse.move(150, 220);
  await page.mouse.down({ button: 'left' });
  await page.mouse.move(200, 240, { steps: 5 });
  await page.mouse.move(250, 220, { steps: 5 });
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(200);

  // Move freely
  await page.mouse.move(300, 220, { steps: 10 });
  await page.mouse.move(350, 260, { steps: 10 });

  // 1.3 Test Speed Pen (Tool ID: pen)
  console.log('Testing Speed Pen...');
  await selectSecondary('pen');

  // Hover
  await page.mouse.move(50, 320);
  await page.mouse.move(100, 320, { steps: 5 });

  // Draw stroke 1
  await page.mouse.move(150, 320);
  await page.mouse.down({ button: 'left' });
  await page.mouse.move(200, 340, { steps: 5 });
  await page.mouse.move(250, 320, { steps: 5 });
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(200);

  // Move freely without button
  await page.mouse.move(300, 320, { steps: 10 });
  await page.mouse.move(350, 370, { steps: 10 });

  console.log('--- 2. SHAPE TESTS ---');

  // Helper for testing shape tool
  async function testShapeTool(key, name, x, y, w, h) {
    console.log(`Testing Shape: ${name} (key: ${key})...`);
    await page.keyboard.press(key);
    await page.waitForTimeout(200);

    // Hover without clicking
    await page.mouse.move(x - 50, y);
    await page.mouse.move(x - 20, y, { steps: 3 });

    // Drag shape
    await page.mouse.move(x, y);
    await page.mouse.down({ button: 'left' });
    await page.mouse.move(x + w / 2, y + h / 2, { steps: 5 });
    await page.mouse.move(x + w, y + h, { steps: 5 });
    await page.mouse.up({ button: 'left' });
    await page.waitForTimeout(200);

    // Move freely without button
    await page.mouse.move(x + w + 50, y + h + 50, { steps: 5 });
  }

  // Primary Shapes (Keys 1-5)
  await testShapeTool('1', 'Rectangle', 450, 80, 100, 70);
  await testShapeTool('2', 'Diamond', 600, 80, 100, 70);
  await testShapeTool('3', 'Circle', 750, 80, 80, 80);
  await testShapeTool('4', 'Arrow', 450, 200, 100, 60);
  await testShapeTool('5', 'Line', 600, 200, 100, 60);

  // Secondary Shapes (Triangle, Star, Polygon)
  console.log('Testing Secondary Shapes...');
  
  // Triangle
  console.log('Testing Triangle...');
  await selectSecondary('triangle');
  await page.mouse.move(750, 200);
  await page.mouse.down({ button: 'left' });
  await page.mouse.move(830, 270, { steps: 5 });
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(200);
  await page.mouse.move(880, 300, { steps: 5 });

  // Star
  console.log('Testing Star...');
  await selectSecondary('star');
  await page.mouse.move(450, 320);
  await page.mouse.down({ button: 'left' });
  await page.mouse.move(530, 400, { steps: 5 });
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(200);
  await page.mouse.move(580, 430, { steps: 5 });

  // Polygon
  console.log('Testing Polygon...');
  await selectSecondary('polygon');
  await page.mouse.move(600, 320);
  await page.mouse.down({ button: 'left' });
  await page.mouse.move(680, 400, { steps: 5 });
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(200);
  await page.mouse.move(730, 430, { steps: 5 });

  console.log('--- 3. OUTSIDE CANVAS DRAG & RELEASE TEST ---');
  // Select rectangle (key 1)
  await page.keyboard.press('1');
  await page.waitForTimeout(200);
  // Start dragging inside canvas
  await page.mouse.move(750, 350);
  await page.mouse.down({ button: 'left' });
  // Drag to 0,0
  await page.mouse.move(10, 10, { steps: 5 });
  await page.mouse.move(0, 0, { steps: 3 });
  // Release outside
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(200);
  // Move back into canvas
  await page.mouse.move(400, 400, { steps: 10 });
  await page.mouse.move(450, 450, { steps: 10 });

  // Take screenshot
  await page.screenshot({ path: 'scratch/screenshot-full-verification.png' });
  console.log('Saved scratch/screenshot-full-verification.png');

  if (browserErrors.length > 0) {
    console.error('Browser errors detected during test:', browserErrors);
  } else {
    console.log('ALL TESTS COMPLETED WITH ZERO BROWSER ERRORS!');
  }

  await browser.close();
}

runFullVerification().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
