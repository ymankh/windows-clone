/*
 * Desktop UI helpers, injected together with desktop-ui.css.
 *
 *   desktop.ui.el(tag, props, children)   build a DOM element without innerHTML
 *   desktop.ui.toast(text)                show a short message at the bottom
 *   desktop.ui.confirm(text, options)     ask before a destructive action; resolves true/false
 *
 * `confirm` exists because apps are sandboxed and the browser's own
 * alert/confirm/prompt dialogs are blocked. Form submission is blocked too, so
 * use buttons with click handlers rather than <form> and type="submit".
 */
(function () {
  "use strict";

  /**
   * props: `class`, `text`, `value`, `checked`, `disabled`, `on<event>` handlers,
   * `dataset` (object) or any attribute. `null`/`false` values are skipped.
   * children: a node, a string, or an array of them.
   */
  function el(tag, props, children) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function (key) {
      var value = props[key];
      if (value === null || value === undefined || value === false) return;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key === "value" || key === "checked" || key === "disabled") node[key] = value;
      else if (key === "dataset") Object.assign(node.dataset, value);
      else if (key.slice(0, 2) === "on" && typeof value === "function") {
        node.addEventListener(key.slice(2), value);
      } else node.setAttribute(key, value === true ? "" : String(value));
    });
    [].concat(children === undefined || children === null ? [] : children).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.appendChild(typeof child === "object" ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  var toasts = null;

  function toast(text, duration) {
    if (!toasts) {
      toasts = el("div", { class: "ui-toasts", role: "status", "aria-live": "polite" });
      document.body.appendChild(toasts);
    }
    var item = el("div", { class: "ui-toast", text: String(text) });
    toasts.appendChild(item);
    setTimeout(function () {
      item.remove();
    }, duration || 2200);
  }

  /** options: { confirmLabel, cancelLabel, danger } */
  function confirm(text, options) {
    options = options || {};
    return new Promise(function (resolve) {
      // Plain buttons, not a form: apps are not allowed to submit forms.
      var dialog = el("dialog", { class: "ui-dialog" }, [
        el("p", { text: String(text) }),
        el("div", { class: "ui-dialog__actions" }, [
          el("button", {
            type: "button",
            class: "ui-button",
            text: options.cancelLabel || "Cancel",
            onclick: function () {
              dialog.close("cancel");
            },
          }),
          el("button", {
            type: "button",
            class: "ui-button " + (options.danger ? "ui-button--danger" : "ui-button--primary"),
            text: options.confirmLabel || "OK",
            onclick: function () {
              dialog.close("ok");
            },
          }),
        ]),
      ]);
      dialog.addEventListener("close", function () {
        dialog.remove();
        resolve(dialog.returnValue === "ok");
      });
      document.body.appendChild(dialog);
      dialog.showModal();
    });
  }

  // Works whether this runs before or after the SDK.
  window.desktop = window.desktop || {};
  window.desktop.ui = { el: el, toast: toast, confirm: confirm };
})();
