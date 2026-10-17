# Tuyan deterministic figure renderer v1; values are immutable source data.
import json
import math
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle
from matplotlib.colors import ListedColormap, BoundaryNorm
d = json.loads("{\"type\":\"ecdf\",\"rows\":[{\"value\":1},{\"value\":2},{\"value\":2},{\"value\":4},{\"value\":5},{\"value\":2},{\"value\":3},{\"value\":4},{\"value\":4},{\"value\":6}],\"units\":{\"value\":\"dimensionless\",\"x\":\"dimensionless\",\"y\":\"dimensionless\",\"size\":\"dimensionless\",\"low\":\"dimensionless\",\"high\":\"dimensionless\",\"start\":\"dimensionless\",\"end\":\"dimensionless\",\"effect\":\"dimensionless\",\"p\":\"dimensionless\",\"mean\":\"dimensionless\",\"fpr\":\"dimensionless\",\"tpr\":\"dimensionless\",\"recall\":\"dimensionless\",\"precision\":\"dimensionless\",\"predicted\":\"dimensionless\",\"observed\":\"dimensionless\",\"count\":\"dimensionless\",\"a\":\"dimensionless\",\"b\":\"dimensionless\",\"se\":\"dimensionless\",\"u\":\"dimensionless\",\"v\":\"dimensionless\",\"time\":\"dimensionless\",\"event\":\"dimensionless\"},\"options\":{\"bandwidth\":0.5,\"bins\":5,\"nullValue\":0,\"initialValue\":0,\"levels\":[0.5,1,1.5]},\"analysis\":{\"method\":\"pca\",\"description\":\"Synthetic precomputed QA values; not a statistical analysis of research data.\",\"pKind\":\"p\"},\"variants\":[],\"pixels\":1024,\"plotStyle\":{\"width\":9,\"height\":6,\"fontSize\":12}}")
r, kind, opt = d['rows'], d['type'], d['options']
plt.rcParams.update({'font.size':d['plotStyle']['fontSize']})
fig, ax = plt.subplots(figsize=(d['plotStyle']['width'], d['plotStyle']['height']), layout='constrained')
fig.set_facecolor('white')
fig._tuyan_target_pixels = d['pixels']
colors = ['#487968','#c58b53','#647da6','#a77592','#a5a659']
labels = [str(row.get('label',i+1)) for i,row in enumerate(r)]
unit = d['units']
def col(name):
    return np.array([row[name] for row in r], dtype=float)
def grouped():
    names = list(dict.fromkeys([str(row.get('group','Data')) for row in r]))
    return names, [np.array([row['value'] for row in r if str(row.get('group','Data')) == name], dtype=float) for name in names]
def density(values):
    # User-specified positive bandwidth; no concealed automatic inference.
    bw=float(opt['bandwidth'])
    grid=np.linspace(float(min(values))-3*bw,float(max(values))+3*bw,256)
    z=(grid[:,None]-values[None,:])/bw
    return grid,np.exp(-0.5*z*z).mean(axis=1)/(bw*math.sqrt(2*math.pi))
if kind in ['bar','dotplot','lollipop','forest']:
    y=np.arange(len(r)); values=col('value')
    if kind=='bar':
        bars=ax.barh(y,values,color=colors[0]); assert np.allclose([b.get_width() for b in bars],values)
    elif kind=='lollipop':
        ax.hlines(y,0,values,color=colors[0]); ax.scatter(values,y,color=colors[0])
    elif kind=='forest':
        ax.errorbar(values,y,xerr=np.vstack([values-col('low'),col('high')-values]),fmt='o',color=colors[0],capsize=3)
        ax.axvline(float(opt['nullValue']),color='#969e96',linestyle='--')
    else: ax.scatter(values,y,color=colors[0])
    ax.set_yticks(y,labels);ax.invert_yaxis();ax.set_xlabel(unit['value'])
elif kind in ['dumbbell','gantt']:
    y=np.arange(len(r));start,end=col('start'),col('end')
    if kind=='gantt': ax.barh(y,end-start,left=start,color=colors[0])
    else:
        ax.hlines(y,start,end,color='#9da99e');ax.scatter(start,y,label=opt.get('startLabel','Start'),color=colors[0]);ax.scatter(end,y,label=opt.get('endLabel','End'),color=colors[1]);ax.legend()
    ax.set_yticks(y,labels);ax.invert_yaxis();ax.set_xlabel(unit['start'])
elif kind=='waterfall':
    values=col('value');start=float(opt['initialValue'])+np.r_[0,np.cumsum(values)[:-1]]
    ax.bar(np.arange(len(r)),values,bottom=start,color=[colors[0] if v>=0 else colors[1] for v in values]);ax.set_xticks(np.arange(len(r)),labels,rotation=30);ax.set_ylabel(unit['value']);ax.axhline(0,color='#adb3a9')
elif kind=='histogram':
    values=col('value');counts,edges=np.histogram(values,bins=opt['bins'])
    assert int(counts.sum())==len(values)
    artists=ax.bar(edges[:-1],counts,width=np.diff(edges),align='edge',color=colors[0],edgecolor='white')
    assert np.allclose([p.get_height() for p in artists],counts)
    ax.set_xlabel(unit['value']);ax.set_ylabel('Count')
elif kind=='stripplot':
    names,groups=grouped()
    for i,values in enumerate(groups):ax.scatter(np.full(len(values),i),values,color=colors[i%len(colors)],s=22,alpha=.7)
    ax.set_xticks(np.arange(len(names)),names);ax.set_ylabel(unit['value'])
elif kind in ['boxplot','violin','raincloud','density','ridgeline']:
    names,groups=grouped()
    if kind=='boxplot': ax.boxplot(groups,whis=1.5,showfliers=True);ax.set_xticks(np.arange(len(names))+1,names);ax.set_ylabel(unit['value'])
    elif kind=='violin':
        # bw_method is explicit to avoid a hidden bandwidth choice.
        ax.violinplot(groups,showmeans=False,showmedians=True,bw_method=float(opt['bandwidth']));ax.set_xticks(np.arange(len(names))+1,names);ax.set_ylabel(unit['value'])
    else:
        for i,values in enumerate(groups):
            grid,pdf=density(values); color=colors[i%len(colors)]
            if kind=='density': ax.plot(grid,pdf,color=color,label=names[i])
            else:
                base=float(i);scale=0.65/max(pdf) if max(pdf)>0 else 1
                ax.fill_between(grid,base,base+pdf*scale,color=color,alpha=0.45)
                if kind=='raincloud':
                    ax.scatter(values,np.full(len(values),base-0.15),color=color,s=15)
                    ax.boxplot([values],positions=[base-0.35],vert=False,widths=.15,whis=1.5,manage_ticks=False)
        ax.set_xlabel(unit['value'])
        if kind=='density':ax.set_ylabel('Density');ax.legend()
        else:ax.set_yticks(np.arange(len(names)),names)
elif kind=='ecdf':
    values=np.sort(col('value')); p=np.arange(1,len(values)+1)/len(values)
    line=ax.step(values,p,where='post',color=colors[0])[0];assert np.allclose(line.get_ydata(),p)
    ax.set_xlabel(unit['value']);ax.set_ylabel('Cumulative proportion');ax.set_ylim(0,1)
elif kind in ['line','area','scatter','bubble','ordination','ma_plot','volcano','roc','pr_curve','calibration','bland_altman','funnel_meta']:
    xname,yname='x','y'
    if kind=='ma_plot':xname,yname='mean','effect'
    if kind=='roc':xname,yname='fpr','tpr'
    if kind=='pr_curve':xname,yname='recall','precision'
    if kind=='calibration':xname,yname='predicted','observed'
    if kind=='funnel_meta':xname,yname='effect','se'
    if kind=='volcano':x=col('effect');y=-np.log10(col('p'));xlabel='Effect ('+unit['effect']+')';ylabel='-log10('+d['analysis']['pKind']+')'
    elif kind=='bland_altman':
        a,b=col('a'),col('b');x=(a+b)/2;y=a-b;bias=np.mean(y);sd=np.std(y,ddof=1)
        for line,label in [(bias,'Mean difference'),(bias-1.96*sd,'Lower agreement limit'),(bias+1.96*sd,'Upper agreement limit')]:ax.axhline(line,color='#9a9f96',linestyle='--',label=label)
        ax.legend(fontsize=8);xlabel='Mean ('+unit['a']+')';ylabel='A - B ('+unit['a']+')'
    else:x,y=col(xname),col(yname);xlabel=xname+' ('+unit[xname]+')';ylabel=yname+' ('+unit[yname]+')'
    if kind in ['line','area','roc','pr_curve','calibration']:
        order=np.lexsort((y,x)) if kind=='roc' else np.argsort(x,kind='stable');x,y=x[order],y[order]
        artist=ax.plot(x,y,color=colors[0],marker='o',markersize=3)[0];assert np.allclose(artist.get_ydata(),y)
        if kind=='area':ax.fill_between(x,0,y,color=colors[0],alpha=.25)
    else:
        artist=ax.scatter(x,y,s=col('size')*float(opt.get('areaScale',20)) if kind=='bubble' else 26,color=colors[0]);assert np.allclose(artist.get_offsets(),np.column_stack([x,y]))
    ax.set_xlabel(xlabel);ax.set_ylabel(ylabel)
    if kind=='bubble':
        handles,legend_labels=artist.legend_elements(prop='sizes',num=3,func=lambda size:size/float(opt.get('areaScale',20)))
        ax.legend(handles,legend_labels,title='Area ('+unit['size']+')',fontsize=8)
    if kind in ['roc','calibration']:ax.plot([0,1],[0,1],linestyle='--',color='#adb3a9');ax.set_xlim(0,1);ax.set_ylim(0,1)
    if kind=='pr_curve':ax.set_xlim(0,1);ax.set_ylim(0,1)
    if kind=='funnel_meta':ax.invert_yaxis()
    if kind=='ordination':ax.text(.01,1.02,d['analysis']['method'].upper(),transform=ax.transAxes,fontsize=10)
elif kind in ['heatmap','adjacency_matrix','correlation_matrix','confusion_matrix','bubble_matrix','binary_matrix']:
    names_y=list(dict.fromkeys([str(row['row']) for row in r]));names_x=list(dict.fromkeys([str(row['column']) for row in r]))
    matrix=np.full((len(names_y),len(names_x)),np.nan)
    for row in r:matrix[names_y.index(str(row['row'])),names_x.index(str(row['column']))]=row['value']
    if kind=='bubble_matrix':
        for row in r:ax.scatter(names_x.index(str(row['column'])),names_y.index(str(row['row'])),s=row['value']*float(opt.get('areaScale',25)),color=colors[0])
        ax.invert_yaxis()
    elif kind=='binary_matrix':
        cmap=ListedColormap(['#f1f3ed','#487968']);cmap.set_bad('#b7b9b2')
        img=ax.pcolormesh(np.arange(len(names_x)+1)-.5,np.arange(len(names_y)+1)-.5,matrix,cmap=cmap,norm=BoundaryNorm([-.5,.5,1.5],2),shading='flat');ax.invert_yaxis();fig.colorbar(img,ax=ax,ticks=[0,1],label='0 absent / 1 present; grey missing')
        assert np.allclose(img.get_array(),matrix,equal_nan=True)
    else:
        img=ax.pcolormesh(np.arange(len(names_x)+1)-.5,np.arange(len(names_y)+1)-.5,matrix,cmap='RdBu_r' if kind=='correlation_matrix' else 'viridis',vmin=-1 if kind=='correlation_matrix' else None,vmax=1 if kind=='correlation_matrix' else None,shading='flat');ax.invert_yaxis();fig.colorbar(img,ax=ax,label=unit['value'])
        assert np.allclose(img.get_array(),matrix,equal_nan=True)
    ax.set_xticks(np.arange(len(names_x)),names_x,rotation=40,ha='right');ax.set_yticks(np.arange(len(names_y)),names_y)
    if kind=='confusion_matrix':ax.set_xlabel('Predicted class');ax.set_ylabel('True class')
elif kind=='pie':
    values=col('value');wedges,_=ax.pie(values,labels=labels,colors=colors,normalize=True)
    assert np.allclose([(w.theta2-w.theta1)/360 for w in wedges],values/sum(values),atol=1e-6)
elif kind=='rose':
    fig.delaxes(ax);ax=fig.add_subplot(111,projection='polar');values=col('value');theta=np.arange(len(r))*2*np.pi/len(r)
    ax.bar(theta,np.sqrt(values),width=2*np.pi/len(r),color=colors[0],edgecolor='white');ax.set_xticks(theta,labels);ax.set_ylabel('Radius = sqrt(value)')
elif kind in ['gene_track','protein_domain']:
    start,end=col('start'),col('end');ax.barh(np.arange(len(r)),end-start,left=start,color=colors[0]);ax.set_yticks(np.arange(len(r)),labels);ax.set_xlabel(unit['start']);ax.invert_yaxis()
elif kind=='vector_field':
    artist=ax.quiver(col('x'),col('y'),col('u'),col('v'),angles='xy',scale_units='xy',scale=1,color=colors[0]);ax.set_xlabel(unit['x']);ax.set_ylabel(unit['y']);ax.set_aspect('equal')
elif kind=='contour':
    xs=np.unique(col('x'));ys=np.unique(col('y'));z=np.full((len(ys),len(xs)),np.nan)
    for row in r:z[list(ys).index(row['y']),list(xs).index(row['x'])]=row['value']
    cs=ax.contour(xs,ys,z,levels=opt['levels'])
    for label in ax.clabel(cs,inline=False,fontsize=8):label.set_bbox({'facecolor':'white','edgecolor':'none','pad':1})
    ax.set_xlabel(unit['x']);ax.set_ylabel(unit['y'])
elif kind=='kaplan_meier':
    names=list(dict.fromkeys([str(row.get('group','Data')) for row in r]))
    for i,name in enumerate(names):
        data=[row for row in r if str(row.get('group','Data'))==name];times=sorted(set(row['time'] for row in data));xs=[0.];ys=[1.];s=1.
        for t in times:
            risk=sum(row['time']>=t for row in data);events=sum(row['time']==t and row['event']==1 for row in data)
            s=s*(1-events/risk);xs.append(t);ys.append(s)
            cens=sum(row['time']==t and row['event']==0 for row in data)
            if cens:ax.plot(t,s,marker='+',color=colors[i%len(colors)])
        ax.step(xs,ys,where='post',label=name,color=colors[i%len(colors)])
    ax.set_ylim(0,1.03);ax.set_ylabel('Survival probability (no CI estimated)');ax.set_xlabel(unit['time']);ax.legend()
elif kind in ['venn','upset']:
    names=[row['set'] for row in r];sets=[set(row['members']) for row in r];members=set().union(*sets);counts={}
    for item in members:
        mask=tuple(item in s for s in sets);counts[mask]=counts.get(mask,0)+1
    if kind=='venn':
        for x,color,name in [(0.4,colors[0],names[0]),(.65,colors[1],names[1])]:ax.add_patch(Circle((x,.5),.23,facecolor=color,alpha=.25));ax.text(x,.78,name,ha='center')
        for x,key in [(.29,(True,False)),(.525,(True,True)),(.76,(False,True))]:ax.text(x,.5,str(counts.get(key,0)),ha='center')
        ax.set_xlim(0,1.05);ax.set_ylim(0,1);ax.set_aspect('equal');ax.axis('off');ax.text(.5,.1,'Areas are schematic; labels show exact counts',ha='center',fontsize=8)
    else:
        masks=sorted(counts,key=lambda m:(-counts[m],m));ax.bar(np.arange(len(masks)),[counts[m] for m in masks],color=colors[0]);ax.set_xticks(np.arange(len(masks)),[' & '.join(names[i] for i,v in enumerate(m) if v) for m in masks],rotation=35,ha='right');ax.set_ylabel('Exclusive intersection size')
        # Membership matrix below bars is necessary to distinguish UpSet from a bar chart.
        matrix_ax=ax.inset_axes([0,-.48,1,.27]);matrix_ax.set_xlim(-.5,len(masks)-.5)
        for j,m in enumerate(masks):
            ys=[i for i,v in enumerate(m) if v];matrix_ax.plot([j]*len(ys),ys,color=colors[0]);matrix_ax.scatter([j]*len(names),np.arange(len(names)),color=[colors[0] if v else '#dde1d8' for v in m])
        matrix_ax.set_yticks(np.arange(len(names)),names);matrix_ax.set_xticks([]);matrix_ax.invert_yaxis()

checks={}
computed={}
def audit(name,actual,expected,atol=1e-8):
    a=np.asarray(actual,dtype=float);e=np.asarray(expected,dtype=float)
    assert a.shape==e.shape and np.allclose(a,e,rtol=1e-7,atol=atol,equal_nan=True), 'Numeric artist mismatch: '+name
    mask=np.isfinite(a)&np.isfinite(e)
    error=float(np.max(np.abs(a[mask]-e[mask]))) if np.any(mask) else 0.
    checks[name]={'count':int(a.size),'absoluteError':error,'passed':True}
if kind=='bar':audit('bar_widths',[p.get_width() for p in ax.patches],col('value'))
elif kind in ['dotplot','lollipop']:audit('point_values',ax.collections[-1].get_offsets()[:,0],col('value'))
elif kind=='forest':
    audit('point_estimates',ax.lines[0].get_xdata(),col('value'))
    audit('intervals',np.array(ax.collections[0].get_segments())[:,:,0],np.column_stack([col('low'),col('high')]))
elif kind=='dumbbell':
    audit('start_points',ax.collections[1].get_offsets()[:,0],col('start'));audit('end_points',ax.collections[2].get_offsets()[:,0],col('end'))
elif kind=='gantt':
    audit('interval_start',[p.get_x() for p in ax.patches],col('start'));audit('interval_width',[p.get_width() for p in ax.patches],col('end')-col('start'))
elif kind=='waterfall':
    audit('increments',[p.get_height() for p in ax.patches],col('value'));audit('cumulative_baselines',[p.get_y() for p in ax.patches],float(opt['initialValue'])+np.r_[0,np.cumsum(col('value'))[:-1]])
    computed['cumulativeValues']=(float(opt['initialValue'])+np.cumsum(col('value'))).tolist()
elif kind=='histogram':
    audit('bin_heights',[p.get_height() for p in ax.patches],counts);audit('total_count',[sum(p.get_height() for p in ax.patches)],[len(r)]);computed['binEdges']=edges.tolist();computed['binCounts']=counts.tolist()
elif kind=='stripplot':
    for i,values in enumerate(groups):audit('observations_'+str(i),ax.collections[i].get_offsets()[:,1],values)
elif kind=='boxplot':
    for i,values in enumerate(groups):audit('median_'+str(i),ax.lines[i*7+5].get_ydata(),[np.median(values)]*2)
elif kind=='violin':
    medians=ax.collections[-1].get_segments();audit('medians',[x[0,1] for x in medians],[np.median(v) for v in groups])
elif kind in ['density','ridgeline','raincloud']:
    computed['bandwidth']=float(opt['bandwidth']);computed['groupSizes']=[len(v) for v in groups]
    for i,values in enumerate(groups):
        grid,pdf=density(values)
        if kind=='density':audit('density_'+str(i),ax.lines[i].get_ydata(),pdf)
        else:
            top=np.column_stack([grid,i+pdf*(.65/max(pdf))]);bottom=np.column_stack([grid,np.full(len(grid),i)])
            expected=np.vstack([top[0],bottom,top[-1],top[::-1],top[0]])
            audit('density_polygon_'+str(i),ax.collections[i*(2 if kind=='raincloud' else 1)].get_paths()[0].vertices,expected)
        if kind=='raincloud':audit('observations_'+str(i),ax.collections[i*2+1].get_offsets()[:,0],values)
elif kind=='ecdf':
    audit('ecdf_sorted_values',ax.lines[0].get_xdata(),np.sort(col('value')));audit('ecdf_probability',ax.lines[0].get_ydata(),np.arange(1,len(r)+1)/len(r))
elif kind in ['line','area','roc','pr_curve','calibration']:audit('plotted_xy',np.column_stack([artist.get_xdata(),artist.get_ydata()]),np.column_stack([x,y]))
elif kind in ['scatter','bubble','ordination','ma_plot','volcano','bland_altman','funnel_meta']:
    audit('point_coordinates',artist.get_offsets(),np.column_stack([x,y]))
    if kind=='bubble':audit('marker_area',artist.get_sizes(),col('size')*float(opt.get('areaScale',20)))
    if kind=='volcano':computed['negativeLog10P']=y.tolist()
    if kind=='bland_altman':
        audit('agreement_limits',[ln.get_ydata()[0] for ln in ax.lines[:3]],[bias,bias-1.96*sd,bias+1.96*sd]);computed.update({'meanDifference':float(bias),'sampleSdDifference':float(sd),'limits':[float(bias-1.96*sd),float(bias+1.96*sd)]})
elif kind in ['heatmap','adjacency_matrix','correlation_matrix','confusion_matrix','binary_matrix']:audit('matrix_cells',img.get_array(),matrix);computed['missingCells']=int(np.isnan(matrix).sum())
elif kind=='bubble_matrix':audit('marker_areas',[c.get_sizes()[0] for c in ax.collections],col('value')*float(opt.get('areaScale',25)))
elif kind=='pie':audit('angular_proportions',[(w.theta2-w.theta1)/360 for w in wedges],col('value')/sum(col('value')),1e-6)
elif kind=='rose':audit('area_proportions',[p.get_height()**2 for p in ax.patches],col('value'))
elif kind=='vector_field':audit('vectors',np.column_stack([artist.U,artist.V]),np.column_stack([col('u'),col('v')]))
elif kind=='contour':
    audit('contour_levels',cs.levels,opt['levels'])
    for level,path in zip(cs.levels,cs.get_paths()):
        points=path.vertices
        if len(points)==0:continue
        assert np.all(points[:,0]>=xs[0]) and np.all(points[:,0]<=xs[-1]) and np.all(points[:,1]>=ys[0]) and np.all(points[:,1]<=ys[-1]), 'Contour outside data grid'
        ix=np.clip(np.searchsorted(xs,points[:,0],side='right')-1,0,len(xs)-2);iy=np.clip(np.searchsorted(ys,points[:,1],side='right')-1,0,len(ys)-2)
        tx=(points[:,0]-xs[ix])/(xs[ix+1]-xs[ix]);ty=(points[:,1]-ys[iy])/(ys[iy+1]-ys[iy])
        interpolated=(1-tx)*(1-ty)*z[iy,ix]+tx*(1-ty)*z[iy,ix+1]+(1-tx)*ty*z[iy+1,ix]+tx*ty*z[iy+1,ix+1]
        audit('contour_vertices_'+str(float(level)),interpolated,np.full(len(points),level))
    computed['gridShape']=list(z.shape)
elif kind=='kaplan_meier':
    survival_lines=[ln for ln in ax.lines if ln.get_drawstyle()=='steps-post']
    for i,name in enumerate(names):
        data=[row for row in r if str(row.get('group','Data'))==name];prob=1.;expected=[1.]
        for t in sorted(set(row['time'] for row in data)):
            prob*=1-sum(row['time']==t and row['event']==1 for row in data)/sum(row['time']>=t for row in data);expected.append(prob)
        audit('survival_'+str(i),survival_lines[i].get_ydata(),expected)
        computed[name]={'survival':expected}
elif kind=='venn':audit('intersection_labels',[float(t.get_text()) for t in ax.texts[2:5]],[counts.get((True,False),0),counts.get((True,True),0),counts.get((False,True),0)])
elif kind=='upset':audit('exclusive_intersections',[p.get_height() for p in ax.patches],[counts[m] for m in masks]);audit('union_size',[sum(p.get_height() for p in ax.patches)],[len(members)])
assert checks, 'Missing numeric audit for '+kind
fig._tuyan_validation={'typeId':kind,'checks':checks,'computations':computed,'analysis':d['analysis'],'suppliedFields':list(r[0]),'dataSourcePolicy':'User supplied values; artist checks do not establish source authenticity or study validity.'}

for collection in fig.findobj(matplotlib.collections.Collection):collection.set_rasterized(False)
for spine in ['top','right']:
    if spine in ax.spines: ax.spines[spine].set_visible(False)
