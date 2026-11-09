import assert from "node:assert/strict";
import { test, afterEach } from "node:test";
import React from "react";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthPanel from "../src/components/AuthPanel.jsx";
import WechatIdentityPanel from "../src/components/WechatIdentityPanel.jsx";
import { useWechat } from "../src/hooks/useWechat.js";
import { AppLocaleProvider } from "../src/components/BenchmarkLocale.jsx";
import { visibleAccountEmail } from "../src/hooks/usePhoneAuth.js";
import { isWechatCallback, wechatLaunchUrl } from "../src/lib/wechat.js";
const originalFetch = globalThis.fetch, originalOpen = window.open;
afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  window.open = originalOpen;
});
const mount = (component) => render(React.createElement(AppLocaleProvider, null, component));
test("phone stays default and WeChat/Watcha remain visible alongside email login", async () => {
  globalThis.fetch = async () => Response.json({ available: true });
  const starts = [];
  mount(/* @__PURE__ */ React.createElement(AuthPanel, { apiBase: "http://fixture.invalid", onAuthenticated: async () => {
  }, wechat: { status: { available: true }, start: (intent) => starts.push(intent) }, watcha: { status: { available: true }, start: () => {
  } } }));
  const user = userEvent.setup();
  await screen.findByLabelText("\u624B\u673A\u53F7");
  await user.click(screen.getByRole("button", { name: "\u5FAE\u4FE1\u626B\u7801\u767B\u5F55" }));
  assert.deepEqual(starts, ["login"]);
  assert.ok(screen.getByRole("button", { name: "观猹登录" }));
  await user.click(screen.getByRole("button", { name: "\u90AE\u7BB1\u5BC6\u7801" }));
  assert.ok(screen.getByLabelText("\u90AE\u7BB1"));
  assert.ok(screen.getByRole("button", { name: "\u5FAE\u4FE1\u626B\u7801\u767B\u5F55" }));
});
test("unknown WeChat identity requires explicit registration and gives old-account route", async () => {
  globalThis.fetch = async () => Response.json({ available: true });
  const actions = [];
  mount(/* @__PURE__ */ React.createElement(AuthPanel, { apiBase: "http://fixture.invalid", wechat: { status: { available: true, pending: { newAccount: true } }, complete: (value) => actions.push(value), cancel: () => actions.push("cancel") } }));
  const user = userEvent.setup();
  assert.equal(screen.queryByLabelText("\u624B\u673A\u53F7"), null);
  assert.match(screen.getByText(/此微信尚未关联/).textContent, /原账号/);
  await user.click(screen.getByRole("button", { name: "\u521B\u5EFA\u65B0\u8D26\u53F7" }));
  assert.deepEqual(actions, [true]);
  await user.click(screen.getByRole("button", { name: "\u4F7F\u7528\u539F\u8D26\u53F7\u767B\u5F55" }));
  assert.deepEqual(actions, [true, "cancel"]);
});
test("WeChat settings binds the current account and never offers implicit overwrite", async () => {
  const starts = [];
  const user = userEvent.setup();
  mount(/* @__PURE__ */ React.createElement(WechatIdentityPanel, { loggedIn: true, controller: { status: { available: true, linked: false }, start: (intent) => starts.push(intent) } }));
  await user.click(screen.getByRole("button", { name: "\u7ED1\u5B9A\u5FAE\u4FE1" }));
  assert.deepEqual(starts, ["link"]);
  assert.equal(screen.queryByRole("button", { name: /合并|覆盖/ }), null);
  assert.equal(visibleAccountEmail("x@wechat.tuyan.invalid"), "");
  assert.equal(visibleAccountEmail("x@phone.tuyan.invalid"), "");
  assert.equal(visibleAccountEmail("real@example.test"), "real@example.test");
});
test("callback checks exact origin/window and launch navigation stays on approved gateway", () => {
  const popup = {};
  assert.equal(isWechatCallback({ source: {}, origin: location.origin, data: { type: "tuyan-wechat-complete", status: "pending" } }, popup, location.origin), false);
  assert.equal(isWechatCallback({ source: popup, origin: "https://evil.test", data: { type: "tuyan-wechat-complete", status: "pending" } }, popup, location.origin), false);
  assert.equal(isWechatCallback({ source: popup, origin: location.origin, data: { type: "tuyan-wechat-complete", status: "pending" } }, popup, location.origin), true);
  const ticket = "a".repeat(64);
  assert.match(wechatLaunchUrl(`https://tuyansci.cn/api/auth/wechat/launch?ticket=${ticket}`, "https://openacad.xyz", location.origin), /tuyansci/);
  for (const url of [`https://evil.test/api/auth/wechat/launch?ticket=${ticket}`, `https://tuyansci.cn/api/auth/wechat/launch?ticket=${ticket}&next=evil`, `javascript:alert(1)`]) assert.throws(() => wechatLaunchUrl(url, "https://openacad.xyz", location.origin));
});
test("popup notification triggers server validation, not client-side authentication", async () => {
  let pending = null, completed = false, authenticated = 0;
  const actions = [];
  const popup = { closed: false, close() {
    this.closed = true;
  }, location: { replace() {
  } } };
  window.open = () => popup;
  globalThis.fetch = async (url, init) => {
    const action = url.split("/").at(-1);
    actions.push(action);
    if (action === "status") return Response.json({ available: true, linked: completed, pending });
    if (action === "start") return Response.json({ url: `https://tuyansci.cn/api/auth/wechat/launch?ticket=${"a".repeat(64)}` });
    if (action === "complete") {
      completed = true;
      pending = null;
      return Response.json({ ok: true });
    }
    throw Error("Unexpected network");
  };
  function Harness() {
    const controller = useWechat("https://tuyansci.cn", void 0, true, () => authenticated++);
    return /* @__PURE__ */ React.createElement(WechatIdentityPanel, { controller });
  }
  mount(/* @__PURE__ */ React.createElement(Harness, null));
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "\u5FAE\u4FE1\u626B\u7801\u767B\u5F55" }));
  assert.equal(authenticated, 0);
  await act(async () => window.dispatchEvent(new window.MessageEvent("message", { origin: "https://evil.test", source: popup, data: { type: "tuyan-wechat-complete", status: "pending" } })));
  assert.equal(actions.includes("complete"), false);
  pending = { intent: "login", newAccount: false, nickname: "Existing" };
  await act(async () => window.dispatchEvent(new window.MessageEvent("message", { origin: location.origin, source: popup, data: { type: "tuyan-wechat-complete", status: "pending" } })));
  await waitFor(() => assert.equal(authenticated, 1));
  assert.equal(actions.includes("complete"), true);
  assert.equal(popup.closed, true);
});
test("restored pending login can resume explicitly after a page refresh", async () => {
  const actions = [];
  mount(/* @__PURE__ */ React.createElement(WechatIdentityPanel, { controller: { status: { available: true, pending: { intent: "login", newAccount: false } }, complete: () => actions.push("complete"), cancel: () => actions.push("cancel") } }));
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "\u7EE7\u7EED\u5FAE\u4FE1\u767B\u5F55" }));
  assert.deepEqual(actions, ["complete"]);
  await user.click(screen.getByRole("button", { name: "\u53D6\u6D88" }));
  assert.deepEqual(actions, ["complete", "cancel"]);
});
test("switching account closes an in-flight popup and discards its old start response", async () => {
  let release, navigated = false, authenticated = 0;
  const popup = { closed: false, close() {
    this.closed = true;
  }, location: { replace() {
    navigated = true;
  } } };
  window.open = () => popup;
  globalThis.fetch = async (url) => url.endsWith("/start") ? new Promise((resolve) => {
    release = resolve;
  }) : Response.json({ available: true, linked: false });
  function Harness({ userId }) {
    const controller = useWechat("https://tuyansci.cn", userId, true, () => authenticated++);
    return /* @__PURE__ */ React.createElement(WechatIdentityPanel, { loggedIn: true, controller });
  }
  const view = mount(/* @__PURE__ */ React.createElement(Harness, { userId: "account-a" }));
  await userEvent.setup().click(await screen.findByRole("button", { name: "\u7ED1\u5B9A\u5FAE\u4FE1" }));
  assert.ok(release);
  view.rerender(/* @__PURE__ */ React.createElement(AppLocaleProvider, null, /* @__PURE__ */ React.createElement(Harness, { userId: "account-b" })));
  await act(async () => release(Response.json({ url: `https://tuyansci.cn/api/auth/wechat/launch?ticket=${"a".repeat(64)}` })));
  assert.equal(popup.closed, true);
  assert.equal(navigated, false);
  assert.equal(authenticated, 0);
});
