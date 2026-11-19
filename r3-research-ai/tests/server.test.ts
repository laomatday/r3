import {describe,it,expect,afterEach,vi} from 'vitest';
import {handle} from '../server/chat';

const base = 'https://r3.example';
function req(path:string, init?:RequestInit) {return new Request(base+path,init);}
afterEach(()=>{delete process.env.GEMINI_API_KEY;vi.unstubAllGlobals();});

describe('Vercel API routes',()=>{
 it('health is local without a secret',async()=>{
  delete process.env.GEMINI_API_KEY;
  const res=await handle(req('/api/health'));
  expect(res.status).toBe(200);expect((await res.json()).mode).toBe('local');
 });
 it('rejects invalid HTTP methods and cross-origin requests',async()=>{
  expect((await handle(req('/api/health',{method:'POST'}))).status).toBe(405);
  expect((await handle(req('/api/chat',{method:'GET'}))).status).toBe(405);
  expect((await handle(req('/api/chat',{method:'POST',headers:{'content-type':'application/json',origin:'https://evil.example'},body:'{"question":"hello"}'}))).status).toBe(403);
 });
 it('answers from verified FAQ without a key',async()=>{
  delete process.env.GEMINI_API_KEY;
  const res=await handle(req('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:'Vì sao chọn R3 thay vì R1 và R2?'})}));
  expect(res.status).toBe(200);
  const data=await res.json();expect(data.mode).toBe('local');expect(data.sources.length).toBeGreaterThan(0);
 });
 it('returns 400 for invalid JSON',async()=>{
  const res=await handle(req('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:'invalid-json'}));
  expect(res.status).toBe(400);
 });
});
