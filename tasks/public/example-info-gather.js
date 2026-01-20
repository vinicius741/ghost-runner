/**
 * Example Info-Gathering Task
 *
 * This task demonstrates how to create an info-gathering task that returns
 * structured data for display in the "Info Gather" dashboard card.
 *
 * The data is grouped by the "category" field and can be refreshed manually
 * or scheduled to run automatically.
 */
module.exports = {
  metadata: {
    type: 'info-gathering', // This tells the system to capture the return value
    category: 'Examples', // Groups results in the UI
    displayName: 'System Info', // Human-readable name shown in UI
    dataType: 'key-value', // How to render the data
    ttl: 60000 // Data expires after 60 seconds (for demo purposes)
  },

  run: async (page) => {
    // For this example, we'll just return some system information
    // In a real task, you would navigate to a website and scrape data

    const data = {
      'Browser': 'Chromium',
      'Task Type': 'Info-Gathering',
      'Status': 'Active',
      'Last Check': new Date().toLocaleString(),
      'Data Source': 'Example Task'
    };

    // In a real scenario, you would do something like:
    // await page.goto('https://example.com');
    // const data = await page.evaluate(() => {
    //   return {
    //     'Price': document.querySelector('.price')?.textContent,
    //     'Stock': document.querySelector('.stock')?.textContent,
    //   };
    // });

    console.log('Example info-gathering task completed, returning data:', data);
    return data;
  }
};
