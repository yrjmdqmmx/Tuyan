import fs from 'node:fs';
import { renderChart } from 'semiotic/server';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const request = JSON.parse(fs.readFileSync('request.json', 'utf8'));
const {data, options:o} = request;
const chart = o.chart || 'scatter';
const common = { width:960, height:640, title:o.title || '他山科研生态 · Semiotic', margin:{left:90,right:90,top:70,bottom:80}, xLabel:o.x,yLabel:o.y, showGrid:true };
let props, component;
let rows = data;
if (chart === 'sankey') {
  const edges = data.map(r=>({source:r[o.x],target:r[o.group],value:r[o.y]}));
  props = {...common, edges, nodes:[...new Set(edges.flatMap(r=>[r.source,r.target]))].map(id=>({id})), sourceAccessor:'source',targetAccessor:'target',valueAccessor:'value',nodeIdAccessor:'id',nodeLabel:'id',showLabels:true,edgeColorBy:'source'};
  component = 'SankeyDiagram';
} else {
  rows = data.filter(r=>typeof r[o.y] === 'number' && (chart==='bar' ? r[o.x] !== null && r[o.x] !== undefined : typeof r[o.x] === 'number'));
  if (!rows.length) throw new Error('No complete rows');
  if (chart === 'line') rows = [...rows].sort((a,b)=>a[o.x]-b[o.x]);
  props = {...common,data:rows,xAccessor:o.x,yAccessor:o.y,colorBy:o.group,showLegend:!!o.group};
  if (chart==='bar') {props.categoryAccessor=o.x; props.valueAccessor=o.y; component='BarChart';}
  else if(chart==='line') {props.lineBy=o.group;component='LineChart';}
  else component='Scatterplot';
}
const svg = renderChart(component,props,{format:'svg'});
if (!svg.includes('<svg') || !svg.includes('</svg>')) throw new Error('Renderer returned no SVG');
fs.writeFileSync('output.svg',svg);
fs.writeFileSync('result.json',JSON.stringify({format:'svg',engineVersion:require('semiotic/package.json').version,summary:{chart,rows:data.length,renderedRows:rows.length,omittedRows:data.length-rows.length,columns:Object.keys(data[0]),x:o.x,y:o.y,group:o.group??null,renderer:'semiotic/server.renderChart'}}));
