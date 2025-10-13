// Listen for a click on the extension's icon.
chrome.action.onClicked.addListener(async (tab) => {
  // Check if the current tab's URL starts with medium.com
  if (tab.url && tab.url.startsWith("https://medium.com/")) {
    // Create the new URL by replacing the domain.
    const newUrl = tab.url.replace("https://medium.com/", "http://localhost:6752/");

    // Create a new tab with the new URL.
    chrome.tabs.create({ url: newUrl });
  }
});
