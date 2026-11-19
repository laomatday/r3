import { buildLocalAnswer, retrieve, rankFAQs, type AnswerResult, type SourceRef } from '../src/lib/retrieval';
import type { EvidenceKind } from '../src/data/knowledge';

interface Env { GEMINI_API_KEY?:string; GEMINI_MODEL?:string }
const MAX_QUESTION = 650;
const counts=new Map<string,{n:number;until:number}>();
function json(data:unknown,status=200,extra:Record<string,string>={}):Response {
 return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...extra}});
}
function throttle(request:Request){
 const ip=(request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')||'local').split(',')[0].trim();const now=Date.now();
 if(counts.size>1500)counts.clear();
 const recent=counts.get(ip);
 if(!recent||now>recent.until){counts.set(ip,{n:1,until:now+60000});return false;}
 recent.n++;return recent.n>18;
}
function safeHistory(value:unknown):string[]{
 if(!Array.isArray(value))return[];
 return value.slice(-6).filter((i):i is string=>typeof i==='string').map(x=>x.slice(0,650));
}
function parseGemini(raw:string,sources:SourceRef[],fallback:AnswerResult):AnswerResult {
 let parsed:any;
 try{parsed=JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g,''));}catch{return fallback;}
 if(!parsed||typeof parsed.answer!=='string'||parsed.answer.trim().length<10)return fallback;
 const sourceIds=new Set(Array.isArray(parsed.sourceIds)?parsed.sourceIds.filter((x:unknown):x is string=>typeof x==='string'):[]);
 const used=sourceIds.size?sources.filter(x=>sourceIds.has(x.id)):[];
 const kind:EvidenceKind|'unknown' = ['reported','hypothesis','limitation','unknown'].includes(parsed.kind)?parsed.kind:'reported';
 // If the model claims a factual answer without selecting an actual source, use safer local fallback.
 if(kind!=='unknown'&&!used.length)return fallback;
 const answer=parsed.answer.slice(0,2700).trim();
 const followups=Array.isArray(parsed.followups)?parsed.followups.filter((x:unknown):x is string=>typeof x==='string').slice(0,2).map((x:string)=>x.slice(0,160)):[];
 return {answer,sources:used,kind,mode:'gemini',followups,note:'Nội dung AI tạo từ đoạn trích báo cáo; nên đối chiếu nguồn khi sử dụng trong bảo vệ khoa học.'};
}
async function callGemini(q:string,history:string[],sources:SourceRef[],env:Env,fallback:AnswerResult):Promise<AnswerResult> {
 if(!env.GEMINI_API_KEY)return fallback;
 const model=env.GEMINI_MODEL||'gemini-2.5-flash-lite';
 const refs=sources.map(s=>`[${s.id} | Trang PDF ${s.page} | ${s.title}]\n${s.excerpt}`).join('\n\n');
 const last=history.slice(-4).map((s,i)=>`${i+1}. ${s}`).join('\n');
 const instructions=`Bạn là R3 Research AI — trợ lý khoa học về một báo cáo KHKT học sinh THPT Việt Nam. CHỈ trả lời bằng những thông tin có trong các ĐOẠN TRÍCH được cung cấp; tuyệt đối không tạo thông số, số liệu, cơ chế, tài liệu tham khảo hay thực nghiệm ngoài nguồn. Trình bày gọn, mạch lạc, dễ hiểu trên điện thoại, tối đa 170 từ, tiếng Việt tự nhiên, không xưng "anh" hay "em" mặc định. Từ "an toàn" phải giới hạn trong 5 loài/7 ngày, không được coi an toàn tuyệt đối. Các cơ chế IAA và khoáng hóa là giả thuyết chưa xác nhận; R3 chưa định danh đa locus; không tuyên bố tối ưu cho mọi loài. Phân biệt số liệu báo cáo với suy luận, các đề xuất tương lai với kết quả đã có. Nếu không đủ dữ liệu, nói rõ không xác định và dùng kind="unknown", sourceIds=[]. Trả về DUY NHẤT JSON: {"answer":"...","sourceIds":["D08-01"],"kind":"reported|hypothesis|limitation|unknown","followups":["...","..."]}. sourceIds chỉ dùng ID trong nguồn đưa vào. Không thêm bất cứ nội dung ngoài JSON.`;
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),14000);
 try{
  const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{
   method:'POST',headers:{'content-type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},signal:controller.signal,
   body:JSON.stringify({systemInstruction:{parts:[{text:instructions}]},contents:[{role:'user',parts:[{text:`Câu hỏi: ${q}\n\nNgữ cảnh câu hỏi trước (không phải bằng chứng):\n${last}\n\nĐOẠN TRÍCH BÁO CÁO:\n${refs}`}]}],generationConfig:{temperature:0.15,maxOutputTokens:900,responseMimeType:'application/json'}})
  });
  if(!res.ok){const reason=res.status===429?'Gemini đã chạm hạn mức miễn phí.':'Gemini hiện không khả dụng.';return {...fallback,note:`${reason} Đã tự động chuyển sang tra cứu nội bộ.`};}
  const data:any=await res.json();
  const raw=(data?.candidates?.[0]?.content?.parts||[]).map((p:any)=>p.text||'').join('');
  return parseGemini(raw,sources,fallback);
 }catch{return {...fallback,note:'Kết nối Gemini chưa thành công; đã dùng chế độ tra cứu nội bộ.'};}
 finally{clearTimeout(timer);}
}
export async function handle(request:Request):Promise<Response>{
 const env:Env={GEMINI_API_KEY:process.env.GEMINI_API_KEY,GEMINI_MODEL:process.env.GEMINI_MODEL};
  const url=new URL(request.url);
  if(url.pathname==='/api/health'&&request.method!=='GET')return json({error:'Method not allowed'},405,{allow:'GET'});
  if(url.pathname==='/api/health')return json({online:true,mode:env.GEMINI_API_KEY?'gemini':'local',model:env.GEMINI_API_KEY?(env.GEMINI_MODEL||'gemini-2.5-flash-lite'):null,knowledgeCount:52});
  if(url.pathname==='/api/chat'){
   if(request.method!=='POST')return json({error:'Method not allowed'},405,{allow:'POST'});
   const origin=request.headers.get('origin');if(origin&&origin!==url.origin)return json({error:'Cross-origin requests are disabled'},403);
   if(throttle(request))return json({error:'Bạn đã gửi quá nhiều câu hỏi. Vui lòng thử lại sau một phút.'},429);
   if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Content-Type must be application/json'},415);
   const length=Number(request.headers.get('content-length')||0);if(length>12000)return json({error:'Request too large'},413);
   let body:any;try{const raw=await request.text();if(new TextEncoder().encode(raw).length>12000)return json({error:'Request too large'},413);body=JSON.parse(raw);}catch{return json({error:'Dữ liệu không hợp lệ'},400);}
   const q=typeof body?.question==='string'?body.question.trim():'';
   if(q.length<3||q.length>MAX_QUESTION)return json({error:`Câu hỏi cần từ 3 đến ${MAX_QUESTION} ký tự.`},400);
   const history=safeHistory(body.history);
   const faq=rankFAQs(q,1)[0];
   const fallback=buildLocalAnswer(q,history);
   let sources=retrieve(q,6);
   // Curated answers carry stronger evidence links; include those pages for grounded generation.
   if(faq&&faq.score>=3){const pages=new Set(faq.item.pages);const cur=sources.filter(s=>pages.has(s.page));sources=[...cur,...sources.filter(s=>!pages.has(s.page))].slice(0,6);}
   if(!sources.length||fallback.kind==='unknown'&&(!faq||faq.score<1.2))return json(fallback);
   const response=await callGemini(q,history,sources,env,fallback);
   return json(response);
  }
  if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
  return json({error:'Not found'},404);
}
