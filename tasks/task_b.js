module.exports = { run: async (page) => { console.log('Executing Task B'); await page.waitForTimeout(1000); } };
