"""Known-answer checks, independently specified from the renderer's internal assertions."""
import json, math
from pathlib import Path
P=Path(__file__).resolve().parents[2]/'docs/infographic-v400/completion/evidence/candidates'
results=[]
def get(k): return json.loads((P/(k+'.validation.json')).read_text())['computations']
def close(name,actual,expected,tol=1e-10):
    assert math.isclose(actual,expected,rel_tol=tol,abs_tol=tol),(name,actual,expected)
    results.append({'name':name,'actual':actual,'expected':expected,'passed':True})
close('network isolates',len(get('network')['isolatedNodes']),1)
close('Euler intersection',get('euler')['intersection'],2)
close('Sankey total flow',get('sankey')['totalFlow'],9)
close('Chord A incident total',get('chord')['incidentTotals']['A'],5)
close('Radar speed radius',get('radar')['normalizedRadii']['A'][0],.6)
close('Normal 10th percentile',get('qq')['referenceQuantiles'][0],-1.2815515655446004)
close('Normal median',get('qq')['referenceQuantiles'][2],0)
close('Stream final thickness',get('streamgraph')['totalThickness'][-1],6)
cif=get('cumulative_incidence')['groups']['Data']
close('AJ cause A final CIF',cif['cif']['A'][-1],.75)
close('AJ cause B final CIF',cif['cif']['B'][-1],.25)
close('AJ tied time risk set',cif['riskSets'][0]['atRisk'],4)
close('AJ after censor risk set',cif['riskSets'][-1]['atRisk'],1)
close('Matrix supplied A-C',get('matrix_link_overlay')['matrix'][0][2],.4)
close('Parallel P1 mass normalized',get('parallel_coordinates')['normalizedObservations']['P1'][1],1/6)
g=get('treemap')['geometry'];close('Treemap A1 area',g['a1'][2]*g['a1'][3],.2)
g=get('circle_packing')['geometry'];close('Circle A2 area',math.pi*g['a2'][2]**2,4)
close('Alluvial cohort mass',get('alluvial')['cohortTotal'],9)
close('Map longitude',get('point_map')['coordinates'][1][0],116)
close('Choropleth missing regions',len(get('choropleth')['missingRegions']),1)
close('Enrichment fold term A',get('enrichment')['foldEnrichment'][0],2.5)
close('Enrichment gene ratio term B',get('enrichment')['geneRatio'][1],.3)
close('Negative strand arrow endpoint',get('gene_track')['intervals'][1]['headCoordinate'],550)
close('Inclusive protein interval residue count',get('protein_domain')['domains'][0]['residues'],71)
logo=get('motif_logo');close('Uniform DNA information',logo['informationBits'][1],0)
close('DNA 90 percent T information',logo['informationBits'][2],1.5310044064107187)
close('DNA T glyph height',logo['letterHeights'][2][3],1.3779039657696468)
circ=get('genome_circos')['sequenceArcsRadians'];close('Circos relative sequence angle',(circ['chr1'][1]-circ['chr1'][0])/(circ['chr2'][1]-circ['chr2'][0]),1.25)
close('Synteny inversion target orientation',get('synteny')['ribbonVertices'][1][2][0],650)
close('Phylogenetic B root distance',get('phylogenetic')['nodePositions']['B'][0],.6)
z=get('dendrogram')['linkage'];close('Cluster first distance',z[0][2],1)
close('Average final linkage distance',z[-1][2],(2*math.sqrt(41)+math.sqrt(52)+math.sqrt(32))/4)
(P/'independent-numeric-checks.json').write_text(json.dumps({'checks':results,'passed':len(results)},indent=2))
print(json.dumps({'knownAnswerChecks':len(results),'passed':len(results)}))
