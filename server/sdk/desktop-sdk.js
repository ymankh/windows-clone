/*
 * Desktop SDK, injected into every store app by the store server.
 *
 *   desktop.onInit(fn)          fn({ windowId, file, state, theme }) once the desktop is ready
 *   desktop.onThemeChange(fn)   fn("light" | "dark") when the user switches mode
 *   desktop.setTitle(text)      change the window title
 *   desktop.saveState(value)    persist JSON-serialisable state for this window
 *   desktop.download(name, content, mimeType)  save a text file to the user's computer
 *
 * Apps run in a sandboxed iframe with no network access and no access to the
 * desktop's storage, so everything goes through these messages.
 */
(function () {
  "use strict";

  var initHandlers = [];
  var themeHandlers = [];
  var initPayload = null;

  function send(message) {
    message.source = "desktop-app";
    window.parent.postMessage(message, "*");
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window.parent) return;
    var data = event.data;
    if (!data || data.source !== "desktop-host") return;

    if (data.type === "init" && !initPayload) {
      initPayload = data.payload;
      applyTheme(initPayload.theme);
      initHandlers.forEach(function (handler) {
        handler(initPayload);
      });
    }

    if (data.type === "theme") {
      applyTheme(data.theme);
      themeHandlers.forEach(function (handler) {
        handler(data.theme);
      });
    }
  });

  window.desktop = {
    onInit: function (handler) {
      initHandlers.push(handler);
      if (initPayload) handler(initPayload);
    },
    onThemeChange: function (handler) {
      themeHandlers.push(handler);
    },
    setTitle: function (title) {
      send({ type: "setTitle", title: String(title).slice(0, 80) });
    },
    saveState: function (state) {
      send({ type: "saveState", state: state });
    },
    download: function (name, content, mimeType) {
      send({
        type: "download",
        name: String(name),
        content: String(content),
        mimeType: mimeType,
      });
    },
  };

  send({ type: "ready" });
})();
