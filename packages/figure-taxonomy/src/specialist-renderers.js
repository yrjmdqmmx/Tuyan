import {SPECIALIST_PLOT_TYPES,validateSpecialistData} from './specialist-schemas.js'
export function buildSpecialistPlotCode(body,plotStyle){
 if(!SPECIALIST_PLOT_TYPES.includes(body.figureTypeId))return null
 validateSpecialistData(body)
 const payload={type:body.figureTypeId,rows:body.figureData.rows,units:body.figureData.units,options:body.figureData.options,analysis:body.figureAnalysis||{},pixels:({'1K':1024,'1.5K':1536,'2K':2048,'3K':3072,'4K':4096})[body.imageSize]||1024,plotStyle}
 return `# Tuyan specialist vector renderer v1; immutable source data.\nimport json\nd = json.loads(${JSON.stringify(JSON.stringify(payload))})\n`+SPECIALIST_PYTHON
}
const SPECIALIST_PYTHON=String.raw`
import math
from statistics import NormalDist
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Rectangle, Polygon, PathPatch, Wedge, FancyArrowPatch
from matplotlib.path import Path
from matplotlib.textpath import TextPath
from matplotlib.font_manager import FontProperties
from matplotlib.transforms import Affine2D
from matplotlib.colors import BoundaryNorm, Normalize
from matplotlib.cm import ScalarMappable
r,kind,opt,unit=d['rows'],d['type'],d['options'],d['units']
plt.rcParams.update({'font.size':d['plotStyle']['fontSize'],'svg.fonttype':'none','axes.labelpad':d['plotStyle'].get('labelPad',4)})
fig,ax=plt.subplots(figsize=(d['plotStyle']['width'],d['plotStyle']['height']),layout='constrained')
fig.set_facecolor('white')
fig._tuyan_target_pixels=d['pixels']
colors=['#487968','#c58b53','#647da6','#a77592','#a5a659','#578eaa','#be7666']
computations={}
checks={}
def verify(name,actual,expected,tolerance=1e-9):
    error=float(abs(actual-expected))
    assert math.isfinite(error) and error<=tolerance*max(1,abs(expected)), name
    checks[name]={'actual':float(actual),'expected':float(expected),'absoluteError':error}
def note(text):
    ax.set_title(text,fontsize=10,pad=16)
def clean(value):
    if isinstance(value,dict):return {str(k):clean(v) for k,v in value.items()}
    if isinstance(value,(list,tuple,np.ndarray)):return [clean(v) for v in value]
    if isinstance(value,np.generic):return value.item()
    return value
def ribbon(x0,x1,y0,y1,height,color,alpha=.6):
    # Both vertical cross-sections have identical data-space thickness.
    dx=(x1-x0)*.45
    vertices=[(x0,y0),(x0+dx,y0),(x1-dx,y1),(x1,y1),(x1,y1+height),(x1-dx,y1+height),(x0+dx,y0+height),(x0,y0+height),(x0,y0)]
    codes=[Path.MOVETO,Path.CURVE4,Path.CURVE4,Path.CURVE4,Path.LINETO,Path.CURVE4,Path.CURVE4,Path.CURVE4,Path.CLOSEPOLY]
    artist=PathPatch(Path(vertices,codes),facecolor=color,edgecolor='none',alpha=alpha)
    ax.add_patch(artist)
    verify('ribbon_%d_width'%len(ax.patches),vertices[4][1]-vertices[3][1],height)
    return artist
if kind=='network':
    ids=[a['id'] for a in opt['nodes']];n=len(ids)
    positions={name:(math.cos(2*math.pi*i/n),math.sin(2*math.pi*i/n)) for i,name in enumerate(ids)}
    weighted='value' in r[0]
    scale=4/max(a['value'] for a in r) if weighted else 1
    for a in r:
        weight=a['value'] if weighted else 1
        artist=FancyArrowPatch(positions[a['source']],positions[a['target']],arrowstyle='-|>' if opt['directed'] else '-',mutation_scale=12,linewidth=weight*scale,color=colors[0],shrinkA=12,shrinkB=12)
        ax.add_patch(artist);verify('edge_%d_width'%len(ax.patches),artist.get_linewidth(),weight*scale)
        if weighted:
            p,q=positions[a['source']],positions[a['target']];ax.text((p[0]+q[0])/2,(p[1]+q[1])/2,str(weight),fontsize=8)
    points=np.array(list(positions.values()));artist=ax.scatter(points[:,0],points[:,1],s=250,c=colors[1],zorder=3)
    for a in opt['nodes']:
        x,y=positions[a['id']];ax.text(x*1.14,y*1.14,a.get('label',a['id']),ha='center',va='center',fontsize=9)
    degree={name:sum(a['source']==name or a['target']==name for a in r) for name in ids}
    verify('degree_sum',sum(degree.values()),2*len(r));verify('rendered_node_count',len(artist.get_offsets()),n)
    computations={'positions':positions,'degree':degree,'isolatedNodes':[k for k,v in degree.items() if v==0],'lineWidthPerWeight':scale}
    ax.set(xlim=(-1.4,1.4),ylim=(-1.4,1.4),aspect='equal');ax.axis('off');note('Circular layout; distances are not scientific distances'+ ('; weights: '+opt['weightUnit'] if weighted else ''))
elif kind=='euler':
    a,b=set(r[0]['members']),set(r[1]['members']);both=len(a&b);only_a=len(a-b);only_b=len(b-a)
    if a==b:
        locations=[(0,0,1),(0,0,1)];topology='equal';ax.text(0,0,str(both),ha='center');ax.text(0,1.15,r[0]['set']+' = '+r[1]['set'],ha='center')
    elif a.issubset(b) or b.issubset(a):
        small=0 if a.issubset(b) else 1;locations=[None,None];locations[small]=(-.25,0,.5);locations[1-small]=(0,0,1);topology='containment'
        ax.text(-.25,0,str(both),ha='center');ax.text(.65,0,str(only_b if small==0 else only_a),ha='center')
        ax.text(-.25,.6,r[small]['set'],ha='center');ax.text(0,1.15,r[1-small]['set'],ha='center')
    elif not both:
        locations=[(-1.1,0,1),(1.1,0,1)];topology='disjoint'
        for i,x in enumerate([-1.1,1.1]):ax.text(x,0,str([only_a,only_b][i]),ha='center');ax.text(x,1.15,r[i]['set'],ha='center')
    else:
        locations=[(-.6,0,1),(.6,0,1)];topology='overlap'
        for x,value in [(-1,only_a),(0,both),(1,only_b)]:ax.text(x,0,str(value),ha='center')
        for i,x in enumerate([-.8,.8]):ax.text(x,1.15,r[i]['set'],ha='center')
    for i,(x,y,radius) in sorted(enumerate(locations),key=lambda z:-z[1][2]):ax.add_patch(Circle((x,y),radius,facecolor=colors[i],edgecolor=colors[i],alpha=.25,linewidth=2))
    verify('union_count',only_a+both+only_b,len(a|b));computations={'intersection':both,'onlyA':only_a,'onlyB':only_b,'union':len(a|b),'topology':topology,'areaMode':'schematic'}
    ax.set(xlim=(-2.5,2.5),ylim=(-1.4,1.5),aspect='equal');ax.axis('off');note('Exact membership counts and topology; areas are schematic')
elif kind=='sankey':
    nodes=opt['nodes'];total=sum(a['value'] for a in r);gap=total*.07
    starts={};totals={};row_heights=[]
    for stage in [0,1]:
        offset=0
        for node in [n for n in nodes if n['stage']==stage]:
            name=node['id'];value=sum(a['value'] for a in r if a['source' if stage==0 else 'target']==name)
            starts[name]=offset;totals[name]=value
            rect=Rectangle((stage-.025,offset),.05,value,color=colors[stage]);ax.add_patch(rect)
            ax.text(stage+(-.05 if stage==0 else .05),offset+value/2,name+' ('+str(value)+')',ha='right' if stage==0 else 'left',va='center',fontsize=9)
            verify(name+'_node_height',rect.get_height(),value);offset+=value+gap
        row_heights.append(offset)
    used={name:0. for name in starts}
    for i,a in enumerate(r):
        s,t=a['source'],a['target'];ribbon(.025,.975,starts[s]+used[s],starts[t]+used[t],a['value'],colors[i%len(colors)]);used[s]+=a['value'];used[t]+=a['value']
    for name in used:verify(name+'_allocated_flow',used[name],totals[name])
    verify('both_column_total',sum(totals.values()),2*total);computations={'nodeTotals':totals,'totalFlow':total,'dataSpaceWidthPerValue':1}
    ax.set(xlim=(-.28,1.28),ylim=(-gap,max(row_heights)));ax.axis('off');note('Flow width: '+unit['value']+'; two-stage supplied flows')
elif kind=='chord':
    ids=opt['nodes'];totals={n:sum(a['value'] for a in r if n in [a['source'],a['target']]) for n in ids};total=sum(totals.values());gap=.04;scale=(2*math.pi-gap*len(ids))/total
    starts={};used={n:0. for n in ids};angle=0;arcs={}
    for i,n in enumerate(ids):
        starts[n]=angle;end=angle+totals[n]*scale;arcs[n]=[angle,end]
        ax.add_patch(Wedge((0,0),1,math.degrees(angle),math.degrees(end),width=.08,facecolor=colors[i%len(colors)]))
        mid=(angle+end)/2;ax.text(1.15*math.cos(mid),1.15*math.sin(mid),n,ha='center',va='center',fontsize=9);angle=end+gap
    spans=[]
    for i,a in enumerate(r):
        s,t,v=a['source'],a['target'],a['value'];a0=starts[s]+used[s]*scale;a1=a0+v*scale;b0=starts[t]+used[t]*scale;b1=b0+v*scale;used[s]+=v;used[t]+=v
        aa=np.linspace(a0,a1,12);bb=np.linspace(b0,b1,12);pa=np.column_stack([.91*np.cos(aa),.91*np.sin(aa)]);pb=np.column_stack([.91*np.cos(bb),.91*np.sin(bb)])
        verts=[*pa,(0,0),pb[0],*pb[1:],(0,0),pa[0]];codes=[Path.MOVETO]+[Path.LINETO]*(len(pa)-1)+[Path.CURVE3,Path.CURVE3]+[Path.LINETO]*(len(pb)-1)+[Path.CURVE3,Path.CURVE3]
        ax.add_patch(PathPatch(Path(verts,codes),facecolor=colors[ids.index(s)%len(colors)],alpha=.5,edgecolor='none'))
        verify('edge_%d_source_span'%i,a1-a0,v*scale);verify('edge_%d_target_span'%i,b1-b0,v*scale);spans.append([a0,a1,b0,b1])
    for n in ids:verify(n+'_incident_allocation',used[n],totals[n])
    computations={'incidentTotals':totals,'edgeSpansRadians':spans,'radiansPerValue':scale,'undirectedTotal':total/2}
    ax.set(xlim=(-1.4,1.4),ylim=(-1.4,1.4),aspect='equal');ax.axis('off');note('Undirected ribbons; endpoint angle proportional to '+unit['value'])
elif kind=='radar':
    ax.remove();ax=fig.add_subplot(111,projection='polar');axes=opt['axes'];angles=np.arange(len(axes))*2*math.pi/len(axes);closed=np.r_[angles,angles[0]];normalized={}
    groups=list(dict.fromkeys(a['group'] for a in r))
    for i,g in enumerate(groups):
        values=[next(a['value'] for a in r if a['group']==g and a['label']==b['id']) for b in axes];values=np.array([(v-b['min'])/(b['max']-b['min']) for v,b in zip(values,axes)]);normalized[g]=values
        line=ax.plot(closed,np.r_[values,values[0]],color=colors[i%len(colors)],label=g)[0];ax.fill(closed,np.r_[values,values[0]],color=colors[i%len(colors)],alpha=.1);verify(g+'_radius_error',np.max(np.abs(line.get_ydata()[:-1]-values)),0)
    ax.set_xticks(angles,[a['id']+'\n'+str(a['min'])+'–'+str(a['max'])+' '+a['unit'] for a in axes],fontsize=9);ax.set_ylim(0,1);ax.legend(loc='upper right',bbox_to_anchor=(1.3,1.15));note('Explicit per-axis normalization; polygon area is not a score');computations={'normalizedRadii':normalized}
elif kind=='qq':
    sample=np.sort([a['value'] for a in r]);p=(np.arange(len(sample))+.5)/len(sample)
    if opt['reference']=='normal':theoretical=np.array([NormalDist(opt['mean'],opt['sd']).inv_cdf(float(q)) for q in p])
    else:theoretical=np.quantile(opt['referenceValues'],p,method='linear')
    points=ax.scatter(theoretical,sample,c=colors[0]);limits=[min(theoretical.min(),sample.min()),max(theoretical.max(),sample.max())];ax.plot(limits,limits,'--',color='#999999',label='Identity (same units)');ax.legend(fontsize=8)
    verify('sample_order_error',np.max(np.abs(points.get_offsets()[:,1]-sample)),0);verify('quantile_order_violations',np.sum(np.diff(theoretical)<0),0)
    computations={'probabilities':p,'referenceQuantiles':theoretical,'sampleQuantiles':sample,'plottingPosition':'(i - 0.5) / n','parameterSource':'supplied; not fitted'}
    ax.set_xlabel('Reference quantile ('+unit['value']+')');ax.set_ylabel('Sample quantile ('+unit['value']+')');note('Q-Q comparison; no normality test or fitted parameters')
elif kind=='streamgraph':
    groups=list(dict.fromkeys(a['group'] for a in r));xs=sorted(set(a['x'] for a in r));values=np.array([[next(a['y'] for a in r if a['x']==x and a['group']==g) for x in xs] for g in groups]);total=values.sum(axis=0);baseline=-total/2;lower=baseline.copy()
    for i,g in enumerate(groups):
        upper=lower+values[i];ax.fill_between(xs,lower,upper,color=colors[i%len(colors)],label=g);verify(g+'_thickness_error',np.max(np.abs(upper-lower-values[i])),0);lower=upper
    verify('symmetric_baseline_error',np.max(np.abs(lower+baseline)),0);computations={'x':xs,'totalThickness':total,'baseline':baseline,'series':dict(zip(groups,values))};ax.set_xlabel(unit['x']);ax.set_ylabel('Thickness ('+unit['y']+'); centered baseline');ax.legend()
elif kind=='cumulative_incidence':
    groups=list(dict.fromkeys(a.get('group','Data') for a in r));results={};color_index=0
    for group in groups:
        rows=[a for a in r if a.get('group','Data')==group];times=sorted(set(a['time'] for a in rows));s=1.;cif=np.zeros(len(opt['causes']));xs=[0.];curves=[cif.copy()];risks=[];survival=[1.]
        buckets={t:{'events':np.zeros(len(opt['causes']),dtype=int),'censored':0} for t in times}
        for a in rows:
            if a['event']:buckets[a['time']]['events'][opt['causes'].index(a['cause'])]+=1
            else:buckets[a['time']]['censored']+=1
        risk=len(rows)
        for t in times:
            counts=buckets[t]['events'];censored=buckets[t]['censored'];before=s;cif=cif+before*counts/risk;s=before*(1-counts.sum()/risk);xs.append(t);curves.append(cif.copy());survival.append(s);risks.append({'time':t,'atRisk':risk,'eventsByCause':counts,'censored':censored})
            verify(group+'_mass_at_'+str(t),s+cif.sum(),1);risk-=int(counts.sum())+censored
        curves=np.array(curves)
        for j,c in enumerate(opt['causes']):
            line=ax.step(xs,curves[:,j],where='post',label=group+' / '+c,color=colors[color_index%len(colors)])[0];color_index+=1;verify(group+'_'+c+'_curve_error',np.max(np.abs(line.get_ydata()-curves[:,j])),0);verify(group+'_'+c+'_monotonic_violations',np.sum(np.diff(curves[:,j])< -1e-12),0)
        results[group]={'time':xs,'cif':dict(zip(opt['causes'],curves.T)),'eventFreeSurvival':survival,'riskSets':risks}
    computations={'estimator':'Aalen-Johansen, common time-zero entry, right censoring, simultaneous cause jumps','groups':results};ax.set_ylim(0,1.03);ax.set_xlabel(unit['time']);ax.set_ylabel('Cumulative incidence');ax.legend(fontsize=8);note('Aalen–Johansen competing risks; no CI estimated')
elif kind=='matrix_link_overlay':
    names=list(dict.fromkeys(a['row'] for a in r));n=len(names);matrix=np.array([[next(a['value'] for a in r if a['row']==y and a['column']==x) for x in names] for y in names]);mesh=ax.pcolormesh(np.arange(n+1)-.5,np.arange(n+1)-.5,matrix,cmap='viridis',shading='flat');fig.colorbar(mesh,ax=ax,label=unit['value'],shrink=.7)
    maxweight=max(abs(a['value']) for a in opt['links']);scale=4/maxweight
    for i,a in enumerate(opt['links']):
        y0,y1=names.index(a['source']),names.index(a['target']);x=-.65;control=-1-abs(y0-y1)*.3
        path=Path([(x,y0),(control,y0),(control,y1),(x,y1)],[Path.MOVETO,Path.CURVE4,Path.CURVE4,Path.CURVE4]);p=PathPatch(path,fill=False,linewidth=abs(a['value'])*scale,color=colors[i%len(colors)]);ax.add_patch(p);ax.text(control,(y0+y1)/2,str(a['value']),ha='right',fontsize=8);verify('link_%d_width'%i,p.get_linewidth(),abs(a['value'])*scale)
    verify('matrix_value_error',np.max(np.abs(np.asarray(mesh.get_array()).reshape(matrix.shape)-matrix)),0);computations={'matrix':matrix,'linkWidthPerAbsoluteValue':scale,'suppliedLinks':opt['links']}
    ax.set_xticks(range(n),names,rotation=30);ax.set_yticks(range(n),names);ax.set_xlim(-2-.3*n,n-.5);ax.set_ylim(n-.5,-.5);note(opt['matrixStatistic']+'\nLinks: '+opt['linkStatistic']+' ('+opt['linkUnit']+')')
elif kind=='parallel_coordinates':
    axes=opt['axes'];x=np.arange(len(axes));values=[]
    for i,a in enumerate(r):
        y=np.array([(a[b['id']]-b['min'])/(b['max']-b['min']) for b in axes]);values.append(y);line=ax.plot(x,y,color=colors[i%len(colors)],alpha=.65,label=a['id'] if len(r)<=12 else None)[0];verify(a['id']+'_normalized_error',np.max(np.abs(line.get_ydata()-y)),0)
    for i,b in enumerate(axes):
        ax.axvline(i,color='#cccccc',linewidth=.7,zorder=0)
        for v in np.linspace(b['min'],b['max'],5):ax.text(i+.02,(v-b['min'])/(b['max']-b['min']),format(v,'.3g'),fontsize=7,va='center')
    ax.set_xticks(x,[b['id']+'\n'+b['unit'] for b in axes]);ax.set_ylim(-.05,1.05);ax.set_yticks([])
    if len(r)<=12:ax.legend(fontsize=8,loc='upper left',bbox_to_anchor=(1,1))
    computations={'normalizedObservations':dict(zip([a['id'] for a in r],values))};note('Explicit axis ranges; each line is one observation')
elif kind in ['treemap','circle_packing']:
    nodes={a['id']:a for a in r};children={a['id']:[b['id'] for b in r if b['parent']==a['id']] for a in r};root=next(a['id'] for a in r if a['parent'] is None);leaves=[a['id'] for a in r if not children[a['id']]];geometries={}
    if kind=='treemap':
        def layout(name,x,y,w,h,depth):
            a=nodes[name];geometries[name]=[x,y,w,h];rect=Rectangle((x,y),w,h,facecolor=colors[leaves.index(name)%len(colors)] if name in leaves else 'none',edgecolor='white' if name in leaves else '#303d35',linewidth=1.5 if depth==0 else .7,zorder=1+depth);ax.add_patch(rect)
            verify(name+'_area_ratio',w*h,nodes[name]['value']/nodes[root]['value'])
            if not children[name]:ax.text(x+w/2,y+h/2,a['label']+'\n'+str(a['value']),ha='center',va='center',fontsize=9)
            else:
                offset=0
                for child in children[name]:
                    ratio=nodes[child]['value']/a['value']
                    if depth%2==0:layout(child,x+offset*w,y,w*ratio,h,depth+1)
                    else:layout(child,x,y+offset*h,w,h*ratio,depth+1)
                    offset+=ratio
                ax.add_patch(Rectangle((x,y),w,h,facecolor='none',edgecolor='#203d31',linewidth=1.5,zorder=30-depth))
                if depth>0:ax.text(x+.01*w,y+h-.025*h,a['label'],ha='left',va='top',fontsize=8,zorder=40,bbox={'facecolor':'white','edgecolor':'none','alpha':.75,'pad':1})
        layout(root,0,0,1,1,0);verify('leaf_area_sum',sum(geometries[n][2]*geometries[n][3] for n in leaves),1);ax.set(xlim=(-.02,1.02),ylim=(-.02,1.02),aspect='equal');note(nodes[root]['label']+'; slice-and-dice area proportional to '+unit['value'])
    else:
        radii={}
        def radius(name):
            radii[name]=sum(radius(c) for c in children[name]) if children[name] else math.sqrt(nodes[name]['value']/math.pi)
            return radii[name]
        radius(root)
        def layout(name,x,y,depth):
            rad=radii[name];geometries[name]=[x,y,rad];leaf=not children[name];circle=Circle((x,y),rad,facecolor=colors[leaves.index(name)%len(colors)] if leaf else 'none',edgecolor='#405648',alpha=.65 if leaf else 1,linewidth=1,zorder=depth+1);ax.add_patch(circle)
            if leaf:
                verify(name+'_leaf_area',math.pi*circle.get_radius()**2,nodes[name]['value']);ax.text(x,y,nodes[name]['label']+'\n'+str(nodes[name]['value']),ha='center',va='center',fontsize=8)
            if not leaf:ax.text(x,y+rad*.8,nodes[name]['label'],ha='center',va='center',fontsize=8,zorder=30)
            cursor=x-rad
            for child in children[name]:
                cr=radii[child];cx=cursor+cr;layout(child,cx,y,depth+1);verify(child+'_containment_excess',max(0,abs(cx-x)+cr-rad),0);cursor+=2*cr
        layout(root,0,0,0);lim=radii[root]*1.12;ax.set(xlim=(-lim,lim),ylim=(-lim,lim),aspect='equal');note('Leaf area proportional to '+unit['value']+'; parent area includes empty space')
    computations={'geometry':geometries,'rootTotal':nodes[root]['value'],'leafTotal':sum(nodes[n]['value'] for n in leaves),'algorithm':'slice-and-dice' if kind=='treemap' else 'tangent-row nested circles'};verify('leaf_total',computations['leafTotal'],computations['rootTotal']);ax.axis('off')
elif kind=='alluvial':
    stages=opt['stages'];ids=list(dict.fromkeys(a['id'] for a in r));paths={n:[next(a for a in r if a['id']==n and a['stage']==s) for s in stages] for n in ids};total=sum(paths[n][0]['value'] for n in ids);gap=total*.05;positions={};stage_totals={};max_y=0
    for j,stage in enumerate(stages):
        categories=list(dict.fromkeys(a['category'] for a in r if a['stage']==stage));offset=0;category_totals={}
        for category in categories:
            matching=[n for n in ids if paths[n][j]['category']==category];amount=sum(paths[n][j]['value'] for n in matching);category_totals[category]=amount;ax.add_patch(Rectangle((j-.025,offset),.05,amount,color='#506956',alpha=.8));ax.text(j,offset+amount/2,category,ha='center',va='center',fontsize=8,zorder=5,bbox={'facecolor':'white','alpha':.8,'edgecolor':'none','pad':1})
            for n in matching:positions[(n,j)]=offset;offset+=paths[n][j]['value']
            offset+=gap
        max_y=max(max_y,offset);stage_totals[stage]=category_totals;verify(stage+'_mass',sum(category_totals.values()),total)
    for i,n in enumerate(ids):
        for j in range(len(stages)-1):ribbon(j+.025,j+.975,positions[(n,j)],positions[(n,j+1)],paths[n][j]['value'],colors[i%len(colors)],.45)
    computations={'stageTotals':stage_totals,'cohortTotal':total,'pathValues':{n:paths[n][0]['value'] for n in ids}};ax.set_xticks(range(len(stages)),stages);ax.set_yticks([]);ax.set_xlim(-.3,len(stages)-.7);ax.set_ylim(-gap,max_y);note('Fixed cohort; ribbon width: '+unit['value'])
elif kind=='point_map':
    x=np.array([a['x'] for a in r]);y=np.array([a['y'] for a in r]);p=ax.scatter(x,y,color=colors[0],s=35)
    for a in r:ax.annotate(a['label'],(a['x'],a['y']),xytext=(4,4),textcoords='offset points',fontsize=8)
    dx=max(1,float(np.ptp(x))*.15);dy=max(1,float(np.ptp(y))*.15);ax.set_xlim(max(-180,x.min()-dx),min(180,x.max()+dx));ax.set_ylim(max(-90,y.min()-dy),min(90,y.max()+dy));ax.set_aspect('equal');ax.grid(alpha=.2);ax.set_xlabel('Longitude (degrees east)');ax.set_ylabel('Latitude (degrees north)');verify('coordinate_error',np.max(np.abs(p.get_offsets()-np.column_stack([x,y]))),0);computations={'coordinates':np.column_stack([x,y]),'projection':'Plate Carree; no equal-area or distance claim'};note('EPSG:4326 / Plate Carree; no external basemap')
elif kind=='choropleth':
    values={a['region']:a['value'] for a in r};cmap=plt.get_cmap('viridis',len(opt['boundaries'])-1);norm=BoundaryNorm(opt['boundaries'],cmap.N,clip=True);areas={};missing=[];allpoints=[]
    for a in opt['regions']:
        polygon=np.array(a['polygon']);allpoints.extend(polygon);value=values.get(a['id']);color='#d8d8d8' if value is None else cmap(norm(value));p=Polygon(polygon,closed=True,facecolor=color,edgecolor='white');ax.add_patch(p)
        x,y=polygon[:,0],polygon[:,1];area=abs(np.dot(x,np.roll(y,-1))-np.dot(y,np.roll(x,-1)))/2;areas[a['id']]=area;verify(a['id']+'_vertices',len(p.get_xy()),len(polygon)+(0 if np.array_equal(polygon[0],polygon[-1]) else 1));ax.text(float(np.mean(x)),float(np.mean(y)),a['id']+('\nMissing' if value is None else '\n'+str(value)),ha='center',fontsize=8)
        if value is None:missing.append(a['id'])
    pts=np.array(allpoints);ax.update_datalim(pts);ax.autoscale_view();ax.set_aspect('equal');ax.set_xlabel('Longitude (degrees east)');ax.set_ylabel('Latitude (degrees north)');fig.colorbar(ScalarMappable(norm=norm,cmap=cmap),ax=ax,boundaries=opt['boundaries'],label=unit['value'],shrink=.75);computations={'suppliedValues':values,'polygonAreasSquareDegrees':areas,'missingRegions':missing,'classBoundaries':opt['boundaries']};verify('region_count',len(ax.patches),len(opt['regions']));note('Plate Carree; grey = missing, supplied class boundaries')
elif kind=='enrichment':
    count=np.array([a['count'] for a in r]);background=np.array([a['background'] for a in r]);ratio=count/opt['inputSize'];fold=ratio/(background/opt['backgroundSize']);p=np.array([a['p'] for a in r]);score=-np.log10(p);sizes=count*20
    artist=ax.scatter(fold,np.arange(len(r)),s=sizes,c=score,cmap='viridis');ax.set_yticks(range(len(r)),[a['term'] for a in r]);ax.invert_yaxis();ax.set_xlabel('Fold enrichment: (count / input size) / (background / universe)');fig.colorbar(artist,ax=ax,label='-log10('+d['analysis']['pKind']+')');ax.axvline(1,color='#aaaaaa',linestyle='--');verify('fold_coordinate_error',np.max(np.abs(artist.get_offsets()[:,0]-fold)),0);verify('p_color_error',np.max(np.abs(artist.get_array()-score)),0);computations={'geneRatio':ratio,'foldEnrichment':fold,'suppliedP':p,'bubbleAreaPointsSquared':sizes,'bubbleAreaRule':'20 * count; zero counts explicitly marked with x'};note('Supplied test results; point area = 20 × count; x = zero count')
    for i,a in enumerate(r):
        if a['count']==0:ax.plot(0,i,marker='x',color='#444444')
elif kind=='gene_track':
    sequence_order=[a['id'] for a in opt['sequences']];ys=[];geometry=[]
    for i,a in enumerate(r):
        y=len(r)-1-i;ys.append(y);length=a['end']-a['start'];left=a['start'];right=a['end'];ax.plot([0,next(s['length'] for s in opt['sequences'] if s['id']==a['chrom'])],[y,y],color='#d0d3ce',linewidth=.8)
        head=min(length*.2,max(s['length'] for s in opt['sequences'])*.015)
        points=[(left,y-.18),(right-head,y-.18),(right,y),(right-head,y+.18),(left,y+.18)] if a['strand']=='+' else [(right,y-.18),(left+head,y-.18),(left,y),(left+head,y+.18),(right,y+.18)]
        p=Polygon(points,closed=True,color=colors[sequence_order.index(a['chrom'])%len(colors)]);ax.add_patch(p);verify('interval_%d_length'%i,max(p.get_xy()[:,0])-min(p.get_xy()[:,0]),length);geometry.append({'label':a['label'],'start':left,'end':right,'strand':a['strand'],'headCoordinate':right if a['strand']=='+' else left})
    ax.set_yticks(ys,[a['chrom']+' / '+a['label']+' ('+a['strand']+')' for a in r],fontsize=8);ax.set_ylim(-.6,len(r)-.4);ax.set_xlim(0,max(s['length'] for s in opt['sequences']));ax.set_xlabel('Genomic coordinate (bp; zero-based half-open)');computations={'intervals':geometry};note(opt['assembly']+'; whole-gene intervals, no inferred exons')
elif kind=='protein_domain':
    ys=[];geometry=[]
    for i,a in enumerate(r):
        length=next(s['length'] for s in opt['proteins'] if s['id']==a['protein']);y=len(r)-1-i;ys.append(y);ax.plot([.5,length+.5],[y,y],color='#aaaaaa',linewidth=2);width=a['end']-a['start']+1;p=Rectangle((a['start']-.5,y-.2),width,.4,color=colors[i%len(colors)]);ax.add_patch(p);verify('domain_%d_residues'%i,p.get_width(),width);geometry.append({'protein':a['protein'],'label':a['label'],'residues':width,'leftEdge':a['start']-.5,'rightEdge':a['end']+.5})
        ax.text((a['start']+a['end'])/2,y,a['label'],ha='center',va='center',fontsize=8,color='white')
    ax.set_yticks(ys,[a['protein']+' / '+a['evidence'] for a in r],fontsize=8);ax.set_ylim(-.6,len(r)-.4);ax.set_xlim(.5,max(s['length'] for s in opt['proteins'])+.5);ax.set_xlabel('Amino acid position (one-based inclusive)');computations={'domains':geometry};note(opt['database']+'; separate lanes preserve overlaps')
elif kind=='motif_logo':
    alphabet=opt['alphabet'];positions=sorted(set(a['position'] for a in r));frequencies=[];information=[];heights=[];font=FontProperties(family='DejaVu Sans',weight='bold')
    for pos in positions:
        values=np.array([next(a['value'] for a in r if a['position']==pos and a['symbol']==s) for s in alphabet]);freq=values/values.sum();entropy=-sum(p*math.log2(p) for p in freq if p>0);bits=max(0,math.log2(len(alphabet))-entropy);height=freq*(bits if opt['mode']=='information' else 1);frequencies.append(freq);information.append(bits);heights.append(height);bottom=0
        for j in np.argsort(height):
            h=float(height[j])
            if h<=1e-14:continue
            path=TextPath((0,0),alphabet[j],size=1,prop=font);box=path.get_extents();transform=Affine2D().translate(-box.x0,-box.y0).scale(.8/box.width,h/box.height).translate(pos-.4,bottom);glyph=transform.transform_path(path);patch=PathPatch(glyph,facecolor=colors[j%len(colors)],edgecolor='none');ax.add_patch(patch);verify('position_%d_%s_height'%(pos,alphabet[j]),glyph.get_extents().height,h);bottom+=h
        verify('position_%d_stack'%pos,bottom,bits if opt['mode']=='information' else 1)
    computations={'positions':positions,'frequencies':frequencies,'informationBits':information,'letterHeights':heights,'background':'uniform','smallSampleCorrection':'none'};ax.set_xlim(.4,max(positions)+.6);ax.set_ylim(0,(math.log2(len(alphabet)) if opt['mode']=='information' else 1)*1.03);ax.set_xticks(positions);ax.set_xlabel('Aligned position');ax.set_ylabel('Information (bits)' if opt['mode']=='information' else 'Frequency');note('Uniform background; no small-sample correction')
elif kind=='genome_circos':
    sequences=opt['sequences'];total=sum(s['length'] for s in sequences);gap=.06;scale=(2*math.pi-gap*len(sequences))/total;starts={};angle=0;spans={};norm=Normalize(*opt['valueRange']);cmap=plt.get_cmap('viridis')
    for i,s in enumerate(sequences):
        starts[s['id']]=angle;end=angle+s['length']*scale;spans[s['id']]=[angle,end];ax.add_patch(Wedge((0,0),1.05,math.degrees(angle),math.degrees(end),width=.06,facecolor=colors[i%len(colors)]));mid=(angle+end)/2;ax.text(1.18*math.cos(mid),1.18*math.sin(mid),s['id']+'\n'+str(s['length'])+' bp',ha='center',va='center',fontsize=8);verify(s['id']+'_sequence_angle',end-angle,s['length']*scale);angle=end+gap
    intervals=[]
    for i,a in enumerate(r):
        start=starts[a['chrom']]+a['start']*scale;end=starts[a['chrom']]+a['end']*scale;artist=Wedge((0,0),.95,math.degrees(start),math.degrees(end),width=.16,facecolor=cmap(norm(a['value'])));ax.add_patch(artist);verify('interval_%d_span'%i,math.radians(artist.theta2-artist.theta1),(a['end']-a['start'])*scale);intervals.append([start,end])
    for a in opt.get('links',[]):
        t0=starts[a['source']]+a['sourcePosition']*scale;t1=starts[a['target']]+a['targetPosition']*scale;p0=(.77*math.cos(t0),.77*math.sin(t0));p1=(.77*math.cos(t1),.77*math.sin(t1));ax.add_patch(PathPatch(Path([p0,(0,0),p1],[Path.MOVETO,Path.CURVE3,Path.CURVE3]),facecolor='none',edgecolor=colors[2],linewidth=1))
    ax.set(xlim=(-1.4,1.4),ylim=(-1.4,1.4),aspect='equal');ax.axis('off');fig.colorbar(ScalarMappable(norm=norm,cmap=cmap),ax=ax,label=unit['value'],shrink=.65);computations={'sequenceArcsRadians':spans,'radiansPerBase':scale,'intervalSpansRadians':intervals,'suppliedLinks':opt.get('links',[])};note(opt['assembly']+'; one supplied interval track')
elif kind=='synteny':
    for j,s in enumerate(opt['sequences']):ax.plot([0,s['length']],[1-j,1-j],color=colors[j],linewidth=5);ax.text(0,1-j+.09,s['id'],fontsize=9)
    geometry=[]
    for i,a in enumerate(r):
        b0,b1=(a['targetStart'],a['targetEnd']) if a['strand']=='+' else (a['targetEnd'],a['targetStart']);verts=[(a['start'],1),(a['end'],1),(b1,0),(b0,0)];ax.add_patch(Polygon(verts,closed=True,facecolor=colors[0] if a['strand']=='+' else colors[1],alpha=.4));verify('source_%d_width'%i,verts[1][0]-verts[0][0],a['end']-a['start']);verify('target_%d_width'%i,abs(verts[2][0]-verts[3][0]),a['targetEnd']-a['targetStart']);geometry.append(verts)
    ax.set_xlim(0,max(s['length'] for s in opt['sequences']));ax.set_ylim(-.15,1.25);ax.set_yticks([]);ax.set_xlabel('Sequence coordinate (bp; common scale, zero-based half-open)');computations={'ribbonVertices':geometry,'inversionCount':sum(a['strand']=='-' for a in r)};note('Supplied syntenic blocks; green = forward, amber = inversion')
elif kind=='phylogenetic':
    root=opt['root'];children={name:[] for name in dict.fromkeys([name for a in r for name in [a['source'],a['target']]])}
    for a in r:children[a['source']].append(a)
    positions={};tip_order=[]
    def tree_pos(name,x):
        if not children[name]:y=len(tip_order);tip_order.append(name)
        else:
            ys=[tree_pos(a['target'],x+a['length']) for a in children[name]];y=(min(ys)+max(ys))/2
        positions[name]=(x,y);return y
    tree_pos(root,0)
    for name,edges in children.items():
        if not edges:continue
        x,y=positions[name];child_ys=[positions[a['target']][1] for a in edges];ax.plot([x,x],[min(child_ys),max(child_ys)],color='#4b5f52')
        for a in edges:
            xx,yy=positions[a['target']];line=ax.plot([x,xx],[yy,yy],color=colors[0])[0];verify(a['target']+'_branch_length',line.get_xdata()[1]-line.get_xdata()[0],a['length'])
    for name in tip_order:
        x,y=positions[name];ax.annotate(name,(x,y),xytext=(5,0),textcoords='offset points',va='center',fontsize=9)
    xs=[p[0] for p in positions.values()];ax.set_xlim(-.02,max(xs)*1.2+.01);ax.set_ylim(-.7,len(tip_order)-.3);ax.set_yticks([]);ax.set_xlabel('Root distance ('+opt['branchLengthUnit']+')');computations={'nodePositions':positions,'tipOrder':tip_order,'root':root,'branchLengthSource':'supplied'};note('Supplied rooted phylogeny; no topology or support inference')
elif kind=='dendrogram':
    n=len(r)
    if opt['input']=='linkage':z=np.array(opt['linkage'],dtype=float)
    else:
        values=np.array([[a[f] for f in opt['dimensions']] for a in r]);distances=np.sqrt(np.sum((values[:,None,:]-values[None,:,:])**2,axis=2));active={i:[i] for i in range(n)};merges=[]
        for step in range(n-1):
            pairs=[];keys=sorted(active)
            for ii,a in enumerate(keys):
                for b in keys[ii+1:]:
                    ds=distances[np.ix_(active[a],active[b])];distance=float(ds.min() if opt['method']=='single' else ds.max() if opt['method']=='complete' else ds.mean());pairs.append((distance,a,b))
            height,a,b=min(pairs);members=active.pop(a)+active.pop(b);merges.append([a,b,height,len(members)]);active[n+step]=members
        z=np.array(merges)
    positions={};leaf_order=[]
    def dendro_pos(index):
        if index<n:
            x=len(leaf_order);leaf_order.append(index);positions[index]=(x,0.);return x
        a,b,height,count=z[index-n];x0=dendro_pos(int(a));x1=dendro_pos(int(b));positions[index]=((x0+x1)/2,float(height));return (x0+x1)/2
    dendro_pos(2*n-2)
    for i,(a,b,height,count) in enumerate(z):
        x0,y0=positions[int(a)];x1,y1=positions[int(b)];line=ax.plot([x0,x0,x1,x1],[y0,height,height,y1],color=colors[0])[0];verify('merge_%d_height'%i,line.get_ydata()[1],height)
    verify('root_membership_count',z[-1,3],n);verify('monotonic_height_violations',np.sum(np.diff(z[:,2])< -1e-12),0);ax.set_xticks(range(n),[r[i]['id'] for i in leaf_order],rotation=45 if n>10 else 0);ax.set_ylabel('Euclidean linkage distance ('+opt['method']+'; '+(unit[opt['dimensions'][0]] if opt['input']=='observations' else unit['distance'])+')');computations={'linkage':z,'leafOrder':[r[i]['id'] for i in leaf_order],'inputMode':opt['input'],'method':opt['method'],'preprocessing':'none'};note('Supplied linkage' if opt['input']=='linkage' else 'Calculated agglomeration; Euclidean / '+opt['method']+' / no preprocessing')
for spine in ['top','right']:
    if spine in ax.spines:ax.spines[spine].set_visible(False)
for collection in fig.findobj(matplotlib.collections.Collection):collection.set_rasterized(False)
verify('source_row_count',len(r),len(d['rows']))
assert len(checks)>1, 'Each specialist must have a substantive numerical or geometric check'
fig._tuyan_validation=clean({'typeId':kind,'computations':computations,'checks':checks,'analysis':d['analysis'],'suppliedFields':{'rowFields':list(dict.fromkeys(k for row in r for k in row)),'options':opt},'dataSourcePolicy':'Input provenance is supplied; numerical checks do not certify source truth.'})
json.dumps(fig._tuyan_validation,allow_nan=False)
`
