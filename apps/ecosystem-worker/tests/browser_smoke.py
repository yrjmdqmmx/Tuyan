"""Standalone offline interaction acceptance using an isolated browser profile."""

import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

with sync_playwright() as playwright:
    executable = os.environ.get(
        "CHROME_BIN", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    )
    browser = playwright.chromium.launch(executable_path=executable, headless=True)
    page = browser.new_page(viewport={"width": 1100, "height": 850})
    errors = []
    requests = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on(
        "request",
        lambda request: (
            requests.append(request.url)
            if request.url.startswith(("http:", "https:"))
            else None
        ),
    )
    page.goto(Path("smoke-output/dash-test.html").resolve().as_uri())
    page.wait_for_function("window.Bokeh && Bokeh.documents.length > 0")
    page.locator("select").first.wait_for()
    print("selects", page.locator("select").count())
    page.locator("select").nth(2).select_option("直方图")
    page.wait_for_function(
        "[...Bokeh.documents[0]._all_models.values()].some(m=>m.type==='GlyphRenderer' && m.glyph.type==='Quad' && m.visible)"
    )
    page.locator("input[type=text]").fill("no match data")
    page.locator("input[type=text]").press("Enter")
    page.wait_for_function(
        "[...Bokeh.documents[0]._all_models.values()].some(m=>m.type==='Div' && m.text.startsWith('0 /'))"
    )
    page.locator("input[type=text]").fill("")
    page.locator("input[type=text]").press("Enter")
    page.locator("select").nth(2).select_option("折线图")
    page.wait_for_function(
        "[...Bokeh.documents[0]._all_models.values()].some(m=>m.type==='GlyphRenderer' && m.glyph.type==='Line' && m.visible)"
    )
    page.locator("select").first.select_option("value")
    page.screenshot(path="smoke-output/dataviz-browser.png", full_page=True)
    print(
        json.dumps(
            {
                "pageErrors": errors,
                "externalRequests": requests,
                "controls": "histogram,line,filter,x selection passed",
            }
        )
    )
    assert not errors, errors
    assert not requests, requests
    browser.close()
