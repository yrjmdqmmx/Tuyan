// Executed against the live artists, before either backend serializes the scene.
export const BASE_NUMERIC_AUDIT=String.raw`
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
`
