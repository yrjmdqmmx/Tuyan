import {useState} from 'react'
import {ImageOff} from 'lucide-react'
import {appPath} from '../appPaths.js'

// A failed image is never silently replaced with an unrelated reference.
export default function FigurePreviewImage({preview, original=false, lazy=false}) {
 const [failed,setFailed]=useState(false)
 if(!preview?.src||failed)return <span className="figure-preview-unavailable" role="status"><ImageOff size={24}/><span>预览图片暂不可用</span><small>可查看下方图型说明与论文出处</small></span>
 return <img src={appPath(original?preview.originalSrc:preview.src)} alt={original?`${preview.paper.title}，${preview.figure} 完整原图`:preview.alt} width={original?preview.originalDimensions.width:preview.thumbnail?.width||720} height={original?preview.originalDimensions.height:preview.thumbnail?.height||440} loading={lazy?'lazy':undefined} decoding="async" onError={()=>setFailed(true)}/>
}
