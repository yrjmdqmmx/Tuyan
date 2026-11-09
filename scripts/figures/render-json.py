"""Local QA bridge to the actual sandboxed plot worker, never a model stub."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'apps/plot-worker'))
from render_worker import run_render

if __name__ == '__main__':
    body = json.load(sys.stdin)
    result = run_render(body['code'], vector_output=body.get('vector_output', False))
    print(json.dumps(result, allow_nan=False))
