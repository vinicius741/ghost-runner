module.exports = {
  /**
   * Optional: Task metadata
   * Use this to declare how your task should be treated.
   */
  metadata: {
    // 'action' = performs browser actions, no return value (default)
    // 'info-gathering' = returns data for display in the Info Gather dashboard card
    type: 'action',

    // For info-gathering tasks only:
    // category: 'Category Name', // Groups results in UI (e.g., "Prices", "Account Info", "Status")
    // displayName: 'Human Readable Name', // Shown in UI instead of task name
    // dataType: 'key-value', // How to render: 'key-value', 'table', or 'custom'
    // ttl: 3600000 // Optional: time-to-live for cached data in milliseconds (default 7 days)
  },

  /**
   * Main execution function for the task.
   * @param {import('playwright').Page} page - The Playwright Page object (already stealth-enabled)
   * @returns {Promise<void|Object>} - Return data if info-gathering task, otherwise nothing
   */
  run: async (page) => {
    // ============================================================
    // ACTION TASK (default)
    // ============================================================
    // Perform browser actions without returning data
    //
    // Example:
    // await page.goto('https://example.com');
    // await page.click('button');
    // console.log('Task template running...');

    // ============================================================
    // INFO-GATHERING TASK
    // ============================================================
    // To create an info-gathering task:
    // 1. Set metadata.type to 'info-gathering'
    // 2. Return data from this function
    // 3. The data will appear in the "Info Gather" dashboard card
    //
    // Example (key-value data):
    // await page.goto('https://example.com');
    // return await page.evaluate(() => {
    //   return {
    //     'Price': document.querySelector('.price')?.textContent || 'N/A',
    //     'Status': document.querySelector('.status')?.textContent || 'N/A',
    //     'Last Updated': new Date().toLocaleString()
    //   };
    // });
    //
    // Example (table data):
    // return await page.evaluate(() => {
    //   const headers = Array.from(document.querySelectorAll('th')).map(th => th.textContent);
    //   const rows = Array.from(document.querySelectorAll('tbody tr')).map(tr =>
    //     Array.from(tr.querySelectorAll('td')).map(td => td.textContent)
    //   );
    //   return { headers, rows };
    // });

    console.log('Task template running...');
  }
};
