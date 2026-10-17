"""Exercise the actual worker with a Chinese 4K fixture; never call a provider."""
from pathlib import Path
import sys, json, base64, io
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'apps/plot-worker'))
from render_worker import run_render

if __name__ == '__main__':
    out = ROOT / 'docs/infographic-v400/evidence/plots'
    result = run_render((out / 'chinese-4k.py').read_text())
    assert result.get('ok'), result.get('error')
    pixels = base64.b64decode(result['image_base64'])
    size = Image.open(io.BytesIO(pixels)).size
    assert size == (4096, 2304), size
    (out / 'chinese-4k.png').write_bytes(pixels)
    summary = {'passed': True, 'pixels': list(size), 'labels': ['实验组', '对照组', '质量（毫克）'], 'data': [2, 7], 'source': 'synthetic QA only', 'worker': 'actual child process'}
    (out / 'chinese-4k-result.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(json.dumps(summary, ensure_ascii=False))
