import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(1000);

  console.log('Clicking More button with mouse at its bounding box...');
  const moreBtn = page.locator('button[data-tool="more-tools"]');
  await moreBtn.click();
  await page.waitForTimeout(500);

  const allButtons = await page.$$eval('button', btns => btns.map(b => ({
    text: b.innerText,
    dataTool: b.getAttribute('data-tool'),
    className: b.className
  })));
  console.log('All buttons after clicking More:', JSON.stringify(allButtons));

  await browser.close();
}

test().catch(err => console.error(err));
