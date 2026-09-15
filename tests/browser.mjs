// Deterministic UI tests use intercepted API responses, never a production fallback.
// Real cloud verification is separately provided by tests/live.mjs.
import { chromium, webkit } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
const base = process.env.TEST_URL || 'http://127.0.0.1:5173';
await mkdir('test-results', { recursive: true });
const report = [];
const engines = [
  { engine: chromium, name: 'chrome', executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', sizes: [[1920,1080],[1440,900],[1366,768],[1024,768],[390,844]] },
  { engine: chromium, name: 'edge', executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', sizes: [[1180,820],[1024,768],[390,844]] },
];
if (existsSync(webkit.executablePath())) engines.push({ engine: webkit, name: 'webkit', sizes: [[1180,820],[1024,768],[390,844]] });
for (const { engine, name, executablePath, sizes } of engines) {
  let browser;
  try { browser = await engine.launch({ headless: true, ...(executablePath ? { executablePath } : {}) }); }
  catch (error) {
    report.push({ engine: name, result: 'skipped', reason: `浏览器启动失败：${error.message.split('\n')[0]}` });
    continue;
  }
  for (const [width,height] of sizes) {
    const context = await browser.newContext({ viewport: {width,height}, hasTouch: width <= 1180 });
    let rows = [], failedWrites = false;
    const errors = [];
    await context.route('**/rest/v1/guests**', async route => {
      const request = route.request(), url = new URL(request.url());
      if (request.method() === 'POST') {
        if (failedWrites) return route.fulfill({status:503,json:{message:'test offline'}});
        const data = request.postDataJSON(); rows.push({...data,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
        return route.fulfill({status:201,body:''});
      }
      if (request.method() === 'DELETE') { rows = rows.filter(g => `eq.${g.id}` !== url.searchParams.get('id')); return route.fulfill({status:204,body:''}); }
      return route.fulfill({status:200,json:rows});
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base); await page.locator('#home-title').waitFor();
    assert.equal(await page.locator('#home-title').textContent(), '订婚计划安排');
    assert(await page.locator('.cover-photo').evaluate(img => img.complete && img.naturalWidth > 0));
    await page.screenshot({path:`test-results/${name}-${width}-home.png`,fullPage:true});
    await page.getByRole('link',{name:'宾客名单'}).click();
    await page.locator('.groom .add-guest').waitFor();
    await page.waitForFunction(() => !document.querySelector('.groom .add-guest').disabled);
    await page.locator('.groom .add-guest').click();
    const input = page.getByRole('textbox',{name:'男方宾客姓名'});
    await input.press('Enter');
    assert.match(await page.locator('.draft-error').textContent(), /请输入/);
    assert.equal(rows.length,0);
    await input.fill('测试亲友'); await input.press('Enter');
    await page.getByRole('button',{name:'移除测试亲友',exact:true}).waitFor();
    assert.equal(rows.length,1);
    await page.getByRole('button',{name:'移除测试亲友',exact:true}).click();
    await page.getByRole('button',{name:'保留宾客'}).click(); assert.equal(rows.length,1);
    await page.getByRole('button',{name:'移除测试亲友',exact:true}).click();
    await page.getByRole('button',{name:'确认移除'}).click();
    await page.waitForFunction(() => document.querySelectorAll('.guest-row').length === 0);
    assert.equal(rows.length,0);
    failedWrites = true; await page.locator('.bride .add-guest').click();
    const brideInput = page.getByRole('textbox',{name:'女方宾客姓名'});
    await brideInput.fill('保存失败后保留'); await brideInput.press('Enter');
    await page.locator('.draft-error').filter({hasText:'暂时无法'}).waitFor();
    assert.equal(await brideInput.inputValue(),'保存失败后保留'); assert.equal(rows.length,0);
    failedWrites = false;
    await page.getByRole('button',{name:'取消添加'}).click();
    rows = Array.from({length:70},(_,i)=>({id:`test-${i}`,name:i === 0 ? '<img src=x onerror=alert(1)>' : `测试亲友 ${i+1}`,side:i%2?'bride':'groom',created_at:new Date().toISOString()}));
    // Trigger the same visibility refresh used after returning from another tab.
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForFunction(() => document.querySelectorAll('.guest-row').length === 70);
    assert.equal(await page.locator('.guest-list img').count(),0);
    const layout = await page.evaluate(() => ({overflow:document.documentElement.scrollWidth > innerWidth+1,cards:[...document.querySelectorAll('.guest-card')].map(c=>({height:c.clientHeight,scroll:c.scrollHeight,overflow:getComputedStyle(c).overflowY}))}));
    assert.equal(layout.overflow,false,JSON.stringify({name,width,layout}));
    for (const card of layout.cards) { assert(card.height > 1500); assert.equal(card.overflow,'visible'); assert(card.scroll <= card.height+2); }
    await page.screenshot({path:`test-results/${name}-${width}-guests.png`,fullPage:true});
    await page.getByRole('link',{name:'人员安排'}).click();
    await page.getByText('该模块正在准备中').waitFor();
    assert.deepEqual(errors,[]);
    report.push({engine:name,width,height,result:'passed',checks:'home, photo, navigation, add/Enter, empty, delete/cancel, failed write, XSS, 70 rows, overflow'});
    await context.close();
  }
  await browser.close();
}
await writeFile('test-results/browser-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
