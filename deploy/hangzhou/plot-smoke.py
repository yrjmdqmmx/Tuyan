"""Deterministic render acceptance; mount inside the built Plot image, no network."""
import base64
import json
from render_worker import run_render

if __name__ == "__main__":
    result = run_render("import matplotlib.pyplot as plt\nplt.plot([1, 2, 3], [2, 4, 3])\nplt.title('杭州渲染验证')", vector_output=True)
    assert result.get("ok"), result.get("error")
    assert base64.b64decode(result["image_base64"]).startswith(b"\x89PNG\r\n\x1a\n")
    assert b"<svg" in base64.b64decode(result["svg_base64"])
    validation = result["render_validation"]
    assert validation["sameScene"] and validation["editableText"] and validation["figureCount"] == 1
    print(json.dumps({"ok": True, "png": True, "editableSvg": True, "sameScene": True, "modelCalls": 0}))
