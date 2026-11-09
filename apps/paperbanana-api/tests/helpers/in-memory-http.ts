import { IncomingMessage, ServerResponse, type Server } from 'node:http'
import { Duplex } from 'node:stream'
import type { Socket } from 'node:net'

// Exercise the real HTTP middleware without opening a listening socket.
export async function postInMemory(server: Server, path: string, body: unknown, headers: Record<string,string>) {
  const socket = new Duplex({read(){},write(_chunk,_encoding,callback){callback()}}) as Socket
  const request = new IncomingMessage(socket)
  request.method = 'POST'; request.url = path
  const bytes = Buffer.from(JSON.stringify(body))
  request.headers = {...headers,'content-type':'application/json','content-length':String(bytes.length)}
  const response = new ServerResponse(request)
  const chunks: Buffer[] = []
  response.write = ((chunk: any) => { chunks.push(Buffer.from(chunk)); return true }) as any
  response.end = ((chunk: any) => { if(chunk) chunks.push(Buffer.from(chunk)); response.emit('finish'); return response }) as any
  const finished = new Promise<void>((resolve,reject)=>{
    const timer = setTimeout(()=>reject(new Error('In-memory HTTP response did not finish')),3000)
    response.on('finish',()=>{clearTimeout(timer);resolve()});response.on('error',reject)
  })
  server.emit('request',request,response)
  request.push(bytes);request.push(null)
  await finished
  socket.destroy()
  return {status:response.statusCode,body:JSON.parse(Buffer.concat(chunks).toString())}
}
