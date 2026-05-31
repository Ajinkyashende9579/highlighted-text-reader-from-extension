// This file is often used to interact directly with the web page's DOM, 
// but for simple text selection and the chrome.tts API, 
// the context menu in the service worker is sufficient.

// If you wanted to add a button to the page or custom highlighting logic,
// you would add code here. Since the 'contextMenus' permission handles 
// reading selected text on the page automatically, this file is left empty
// for maximum simplicity and compatibility with PDF viewers.

console.log("PDF Highlight Reader content script loaded.");