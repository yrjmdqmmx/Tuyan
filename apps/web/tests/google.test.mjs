import assert from "node:assert/strict";
import { test, afterEach } from "node:test";
import React from "react";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccountSettingsDialog from "../src/components/AccountSettingsDialog.jsx";
import AuthPanel from "../src/components/AuthPanel.jsx";
import GoogleIdentityPanel from "../src/components/GoogleIdentityPanel.jsx";
import { useGoogle } from "../src/hooks/useGoogle.js";
import { AppLocaleProvider } from "../src/components/BenchmarkLocale.jsx";
import { visibleAccountEmail } from "../src/hooks/usePhoneAuth.js";
import { isGoogleCallback, googleLaunchUrl } from "../src/lib/google.js";
const originalFetch = globalThis.fetch, originalOpen = window.open;
afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  window.open = originalOpen;
});
const mount = (component) => render(React.createElement(AppLocaleProvider, null, component));
test("phone stays default and Google/Watcha remain visible alongside email login", async () => {
  globalThis.fetch = async () => Response.json({ available: true });
  const starts = [];
  mount(/* @__PURE__ */ React.createElement(AuthPanel, { apiBase: "http://fixture.invalid", onAuthenticated: async () => {
  }, github: {status:{available:true},start:()=>{}}, google: { status: { available: true }, start: (intent) => starts.push(intent) }, watcha: { status: { available: true }, start: () => {
  } } }));
  const user = userEvent.setup();
  await screen.findByLabelText("手机号");
  await user.click(screen.getByRole("button", { name: "使用 Google 登录" }));
  assert.deepEqual(starts, ["login"]);
  assert.ok(screen.getByRole("button", { name: "观猹登录" }));
  assert.ok(screen.getByRole("button", { name: "GitHub 登录" }));
  await user.click(screen.getByRole("button", { name: "邮箱密码" }));
  assert.ok(screen.getByLabelText("邮箱"));
  assert.ok(screen.getByRole("button", { name: "使用 Google 登录" }));
});
test("unknown Google identity requires explicit registration and gives old-account route", async () => {
  globalThis.fetch = async () => Response.json({ available: true });
  const actions = [];
  mount(/* @__PURE__ */ React.createElement(AuthPanel, { apiBase: "http://fixture.invalid", google: { status: { available: true, pending: { newAccount: true } }, complete: (value) => actions.push(value), cancel: () => actions.push("cancel") } }));
  const user = userEvent.setup();
  assert.equal(screen.queryByLabelText("手机号"), null);
  assert.match(screen.getByText(/此 Google 账号尚未关联/).textContent, /原账号/);
  await user.click(screen.getByRole("button", { name: "创建新账号" }));
  assert.deepEqual(actions, [true]);
  await user.click(screen.getByRole("button", { name: "使用原账号登录" }));
  assert.deepEqual(actions, [true, "cancel"]);
});
test("Google settings binds the current account and never offers implicit overwrite", async () => {
  const starts = [];
  const user = userEvent.setup();
  mount(/* @__PURE__ */ React.createElement(GoogleIdentityPanel, { loggedIn: true, controller: { status: { available: true, linked: false }, start: (intent) => starts.push(intent) } }));
  await user.click(screen.getByRole("button", { name: "绑定 Google" }));
  assert.deepEqual(starts, ["link"]);
  assert.equal(screen.queryByRole("button", { name: /合并|覆盖/ }), null);
  assert.equal(visibleAccountEmail("x@google.tuyan.invalid"), "");
  assert.equal(visibleAccountEmail("x@phone.tuyan.invalid"), "");
  assert.equal(visibleAccountEmail("real@example.test"), "real@example.test");
});
test("callback checks exact origin/window and launch navigation stays on approved gateway", () => {
  const popup = {};
  assert.equal(isGoogleCallback({ source: {}, origin: location.origin, data: { type: "tuyan-google-complete", status: "pending" } }, popup, location.origin), false);
  assert.equal(isGoogleCallback({ source: popup, origin: "https://evil.test", data: { type: "tuyan-google-complete", status: "pending" } }, popup, location.origin), false);
  assert.equal(isGoogleCallback({ source: popup, origin: location.origin, data: { type: "tuyan-google-complete", status: "pending" } }, popup, location.origin), true);
  const ticket = "a".repeat(64);
  assert.match(googleLaunchUrl(`https://tuyansci.cn/api/auth/google/launch?ticket=${ticket}`, "https://openacad.xyz", location.origin), /tuyansci/);
  for (const url of [`https://evil.test/api/auth/google/launch?ticket=${ticket}`, `https://tuyansci.cn/api/auth/google/launch?ticket=${ticket}&next=evil`, `javascript:alert(1)`]) assert.throws(() => googleLaunchUrl(url, "https://openacad.xyz", location.origin));
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
    if (action === "start") return Response.json({ url: `https://tuyansci.cn/api/auth/google/launch?ticket=${"a".repeat(64)}` });
    if (action === "complete") {
      completed = true;
      pending = null;
      return Response.json({ ok: true });
    }
    throw Error("Unexpected network");
  };
  function Harness() {
    const controller = useGoogle("https://tuyansci.cn", void 0, true, () => authenticated++);
    return /* @__PURE__ */ React.createElement(GoogleIdentityPanel, { controller });
  }
  mount(/* @__PURE__ */ React.createElement(Harness, null));
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "使用 Google 登录" }));
  assert.equal(authenticated, 0);
  await act(async () => window.dispatchEvent(new window.MessageEvent("message", { origin: "https://evil.test", source: popup, data: { type: "tuyan-google-complete", status: "pending" } })));
  assert.equal(actions.includes("complete"), false);
  pending = { intent: "login", newAccount: false, nickname: "Existing" };
  await act(async () => window.dispatchEvent(new window.MessageEvent("message", { origin: location.origin, source: popup, data: { type: "tuyan-google-complete", status: "pending" } })));
  await waitFor(() => assert.equal(authenticated, 1));
  assert.equal(actions.includes("complete"), true);
  assert.equal(popup.closed, true);
});
test("restored pending login can resume explicitly after a page refresh", async () => {
  const actions = [];
  mount(/* @__PURE__ */ React.createElement(GoogleIdentityPanel, { controller: { status: { available: true, pending: { intent: "login", newAccount: false } }, complete: () => actions.push("complete"), cancel: () => actions.push("cancel") } }));
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "继续 Google 登录" }));
  assert.deepEqual(actions, ["complete"]);
  await user.click(screen.getByRole("button", { name: "取消" }));
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
    const controller = useGoogle("https://tuyansci.cn", userId, true, () => authenticated++);
    return /* @__PURE__ */ React.createElement(GoogleIdentityPanel, { loggedIn: true, controller });
  }
  const view = mount(/* @__PURE__ */ React.createElement(Harness, { userId: "account-a" }));
  await userEvent.setup().click(await screen.findByRole("button", { name: "绑定 Google" }));
  assert.ok(release);
  view.rerender(/* @__PURE__ */ React.createElement(AppLocaleProvider, null, /* @__PURE__ */ React.createElement(Harness, { userId: "account-b" })));
  await act(async () => release(Response.json({ url: `https://tuyansci.cn/api/auth/google/launch?ticket=${"a".repeat(64)}` })));
  assert.equal(popup.closed, true);
  assert.equal(navigated, false);
  assert.equal(authenticated, 0);
});
test('disabled Google occupies no login or settings space', () => {
 mount(React.createElement(GoogleIdentityPanel,{controller:{status:{available:false}},loggedIn:true}));
 assert.equal(screen.queryByRole('region',{name:'Google 登录'}),null);
});
test('popup blocked: no start request, authentication or workspace mutation', async () => {
 const actions=[]; let authenticated=0;
 window.open=()=>null;
 globalThis.fetch=async url=>{actions.push(url.split('/').at(-1));return Response.json({available:true});};
 function Harness(){const controller=useGoogle('https://tuyansci.cn',undefined,true,()=>authenticated++);return React.createElement(GoogleIdentityPanel,{controller});}
 mount(React.createElement(Harness));
 await userEvent.setup().click(await screen.findByRole('button',{name:'使用 Google 登录',exact:true}));
 assert.match(screen.getByRole('alert').textContent,/允许浏览器/);
 assert.deepEqual(actions,['status']); assert.equal(authenticated,0);
});
test('Google-only deletion requires fresh proof and typed confirmation; failed submission cannot reuse proof or send email', async () => {
 const calls=[];
 globalThis.fetch=async(url,options)=>{
  if(String(url).endsWith('/status'))return Response.json({code:0,state:'active'});
  calls.push(JSON.parse(options.body));return Response.json({error:'fixture failure'},{status:503});
 };
 const google={status:{available:true,linked:true,pending:{intent:'delete'}},busy:false,complete:async()=>({confirmationToken:'single-use-proof'})};
 const watcha={status:{available:true,linked:true,hasPassword:false},deletionConfirmation:async()=>{throw Error('Email verification must not run');}};
 mount(React.createElement(AccountSettingsDialog,{apiBase:'',email:'test@google.tuyan.invalid',userId:'fixture-user',google,watcha,onClose(){},onDeleted(){}}));
 const user=userEvent.setup();
 await user.click(screen.getByRole('button',{name:'确认使用本次 Google 验证'}));
 assert.equal(screen.queryByLabelText('当前登录密码'),null);
 assert.equal(screen.getByRole('button',{name:'永久删除账号'}).disabled,true);
 await user.type(screen.getByLabelText('输入“删除账号”确认'),'删除账号');
 await waitFor(()=>assert.equal(screen.getByRole('button',{name:'永久删除账号'}).disabled,false));
 await user.click(screen.getByRole('button',{name:'永久删除账号'}));
 await waitFor(()=>assert.equal(calls.length,1));
 assert.deepEqual(calls[0],{email:'test@google.tuyan.invalid',confirmationToken:'single-use-proof'});
 assert.equal(screen.getByRole('button',{name:'永久删除账号'}).disabled,true);
 assert.equal(screen.queryByText('Google 身份已验证'),null);
});
