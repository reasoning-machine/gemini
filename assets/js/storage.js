(function () {
  // Override localStorage.setItem
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function (key, value) {
    originalSetItem.apply(this, arguments);
    window.dispatchEvent(new CustomEvent('localStorageChanged', {
      detail: {
        type: 'setItem',
        key,
        value,
        timestamp: Date.now()
      }
    }));
  };
})();
