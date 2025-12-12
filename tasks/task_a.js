module.exports = { run: async (page) => { console.log('Executing Task A'); await page.waitForTimeout(1000); } };
