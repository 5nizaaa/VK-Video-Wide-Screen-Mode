// Переключение широкого режима по клику на иконку расширения на панели браузера
chrome.action.onClicked.addListener((tab) => {
  if (!tab.id || !tab.url || !/^https:\/\/(www\.)?vkvideo\.ru\//.test(tab.url)) return;
  chrome.tabs.sendMessage(tab.id, { type: 'VWS_TOGGLE' }).catch(() => {});
});
