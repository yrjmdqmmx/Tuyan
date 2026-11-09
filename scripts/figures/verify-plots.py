"""Execute actual fixed plotting programs and inspect Matplotlib artist data."""
from pathlib import Path
import json, concurrent.futures, subprocess, sys
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/infographic-v400/evidence/plots'
def render(name):
 code=(OUT/(name+'.py')).read_text()
 # Test-only wrapper exports the actual figure; production worker captures it.
 probe=code+f"\nfig.savefig({str(OUT/(name+'.png'))!r},dpi=100,bbox_inches='tight')\n"
 probe+=f"\nfig.savefig({str(OUT/(name+'.svg'))!r},format='svg')\n"
 probe+=f"\nfrom pathlib import Path\nassert '<image' not in Path({str(OUT/(name+'.svg'))!r}).read_text()\n"
 probe+="\nassert len(plt.get_fignums()) == 1\n"
 if name=='bar':probe+="assert [p.get_width() for p in ax.patches] == [2,5,3]\n"
 if name=='ecdf':probe+="assert abs(ax.lines[0].get_ydata()[-1]-1)<1e-12\n"
 if name=='kaplan_meier':probe+="assert abs(ax.lines[-1].get_ydata()[-1]-0.375)<1e-12\n"
 if name=='forest':probe+="assert list(ax.lines[0].get_xdata()) == [2,1]\n"
 if name=='volcano':probe+="assert np.allclose(ax.collections[0].get_offsets()[:,1], [2,-math.log10(.5),-math.log10(.03)])\n"
 if name=='histogram':probe+="assert [p.get_height() for p in ax.patches] == [1,3,1,3,2]\n"
 if name=='boxplot':probe+="assert np.allclose(ax.lines[5].get_ydata(), [2,2]); assert np.allclose(ax.lines[12].get_ydata(), [4,4])\n"
 if name=='density':probe+="assert all(abs(np.trapezoid(line.get_ydata(),line.get_xdata())-1)<.002 for line in ax.lines)\n"
 if name=='bland_altman':probe+="assert np.allclose([line.get_ydata()[0] for line in ax.lines[:3]], [-.25,-3.19,2.69])\n"
 if name=='gantt':probe+="assert np.allclose([p.get_width() for p in ax.patches], [2,4]); assert np.allclose([p.get_x() for p in ax.patches], [1,2])\n"
 if name=='waterfall':probe+="assert np.allclose([p.get_y() for p in ax.patches], [0,2,7]); assert np.allclose([p.get_height() for p in ax.patches], [2,5,3])\n"
 if name=='rose':probe+="assert np.allclose([p.get_height()**2 for p in ax.patches], [2,5,3])\n"
 if name=='upset':probe+="assert sorted(p.get_height() for p in ax.patches)==[1,1,2]; assert len(ax.child_axes)==1\n"
 if name=='confusion_matrix':probe+="assert np.allclose(ax.collections[0].get_array(), [[10,3],[3,10]]); assert ax.get_xlabel()=='Predicted class'; assert ax.get_ylabel()=='True class'\n"
 if name=='vector_field':probe+="assert np.allclose(ax.collections[0].U, [1,2]); assert np.allclose(ax.collections[0].V, [2,1])\n"
 if name=='contour':probe+="assert np.allclose(ax.collections[0].levels, [.5,1,1.5])\n"
 p=subprocess.run([sys.executable,'-c',probe],capture_output=True,text=True,timeout=40)
 return {'typeId':name,'passed':p.returncode==0,'stderr':p.stderr[-1800:],'png':name+'.png'}
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(render,json.loads((OUT/'index.json').read_text())))
 (OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print(json.dumps({'total':len(results),'passed':sum(r['passed'] for r in results),'failures':[r for r in results if not r['passed']]},ensure_ascii=False))

 if not all(r["passed"] for r in results): sys.exit(1)
