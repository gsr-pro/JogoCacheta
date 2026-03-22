const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    
    try {
      // Trying to load the main page to see if it redirects or crashes on generic load
      await page.goto('http://localhost:5173/', { waitUntil: 'load' });
      await new Promise(r => setTimeout(r, 2000));
    } catch(e) {
      console.error(e);
    }
    
    await browser.close();
})();
