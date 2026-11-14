/*
 * Desktop SDK, injected into every store app by the store server.
 *
 *   desktop.onInit(fn)          fn({ windowId, file, state, theme, tokens }) once the desktop is ready
 *   desktop.onThemeChange(fn)   fn("light" | "dark", tokens) when the user switches mode or theme
 *   desktop.setTitle(text)      change the window title
 *   desktop.saveState(value)    persist JSON-serialisable state for this window
 *   desktop.download(name, content, mimeType)  save a text file to the user's computer
 *
 * The SDK applies the theme by itself: it sets data-theme on <html> and turns
 * the desktop's colour tokens into CSS variables (--primary, --border, ...).
 * See desktop-ui.css for the components built on those variables.
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

  var appliedTokens = [];

  // The desktop sends its theme as colour tokens ("primary", "border", ...).
  // They become CSS variables on <html>, which is what desktop-ui.css reads.
  function applyTheme(theme, tokens) {
    var root = document.documentElement;
    root.dataset.theme = theme === "dark" ? "dark" : "light";

    appliedTokens.forEach(function (name) {
      root.style.removeProperty("--" + name);
    });
    appliedTokens = [];
    if (!tokens || typeof tokens !== "object") return;
    Object.keys(tokens).forEach(function (name) {
      var value = tokens[name];
      if (!/^[a-z0-9-]{1,40}$/.test(name)) return;
      if (typeof value !== "string" || !value || value.length > 300) return;
      root.style.setProperty("--" + name, value);
      appliedTokens.push(name);
    });
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window.parent) return;
    var data = event.data;
    if (!data || data.source !== "desktop-host") return;

    if (data.type === "init" && !initPayload) {
      initPayload = data.payload;
      applyTheme(initPayload.theme, initPayload.tokens);
      initHandlers.forEach(function (handler) {
        handler(initPayload);
      });
    }

    if (data.type === "theme") {
      applyTheme(data.theme, data.tokens);
      themeHandlers.forEach(function (handler) {
        handler(data.theme, data.tokens || {});
      });
    }
  });

  // Object.assign keeps `desktop.ui` if the UI helpers were loaded first.
  window.desktop = Object.assign(window.desktop || {}, {
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
  });

  send({ type: "ready" });
})();
