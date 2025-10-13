// Listen for a click on the extension's icon.
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url) {
    try {
      const currentUrl = new URL(tab.url);

      // Construct the new URL with the new base and the original path/query.
      const newUrl = "http://localhost:6752" + currentUrl.pathname + currentUrl.search;

      // Create a new tab with the new URL.
      chrome.tabs.create({ url: newUrl });

    } catch (e) {
      console.error("Could not parse URL:", tab.url, e);
    }
  }
});
