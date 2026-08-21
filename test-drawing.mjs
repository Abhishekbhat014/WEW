import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(1000);

  // Click the 12th button in header toolbar (More Tools)
  const headerButtons = page.locator('header button');
  const count = await headerButtons.count();
  console.log('Header buttons count:', count);
  for (let i = 0; i < count; i++) {
    const text = await headerButtons.nth(i).innerText();
    const html = await headerButtons.nth(i).innerHTML();
    console.log(`Button ${i}: text="${text}", html=${html.slice(0, 50)}`);
  }

  // Click the More button (index 12)
  await headerButtons.nth(12).click();
  await page.waitForTimeout(300);

  // Click Speed Pen
  const speedBtn = page.locator('button:has-text("Speed")');
  console.log('Speed button count:', await speedBtn.count());
  await speedBtn.click();
  await page.waitForTimeout(300);

  console.log('1. Speed Pen: Mouse down at (200, 300) and dragging to (350, 300)...');
  await page.mouse.move(200, 300);
  await page.mouse.down({ button: 'left' });
  await page.mouse.move(250, 300, { steps: 5 });
  await page.mouse.move(300, 300, { steps: 5 });
  await page.mouse.move(350, 300, { steps: 5 });

  console.log('2. Speed Pen: Mouse up at (350, 300)...');
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(300);

  console.log('3. Speed Pen: Moving mouse AFTER release (350, 300) -> (500, 300) -> (500, 450)...');
  await page.mouse.move(400, 300, { steps: 10 });
  await page.mouse.move(450, 300, { steps: 10 });
  await page.mouse.move(500, 300, { steps: 10 });
  await page.mouse.move(500, 350, { steps: 10 });
  await page.mouse.move(500, 400, { steps: 10 });
  await page.mouse.move(500, 450, { steps: 10 });

  await page.waitForTimeout(500);

  await page.screenshot({ path: 'scratch/screenshot-speed-pen.png' });
  console.log('Saved screenshot-speed-pen.png');

  await browser.close();
}

test().catch(err => console.error('Test error:', err));
