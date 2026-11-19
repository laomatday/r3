import { QA, type QAItem, type EvidenceKind } from '../data/knowledge';
import sourceChunks from '../data/source-chunks.json';

export type SourceRef = { id:string; page:number; title:string; excerpt:string };
export type AnswerResult = { answer:string; sources:SourceRef[]; kind:EvidenceKind|'unknown'; mode:'local'|'gemini'; followups:string[]; note?:string };
type Chunk = { id:string; page:number; section:string; text:string };
const chunks = sourceChunks as Chunk[];

const STOP = new Set('la cua va co cho voi tren trong ve tai tu den duoc o nhu nhung mot hai ba de se da di lam nao gi the the nao giup cho toi hay anh em nhom he thong theo bao cao thu nghiem du an nghien cuu nam vi nam cay giai thich can hoi'.split(' '));

export function normalize(text:string):string { return text.toLocaleLowerCase('vi').replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' '); }
export function tokens(text:string):string[] {return normalize(text).split(' ').filter(t=>t.length>=2 && !STOP.has(t));}
const asSet = (a:string[]) => new Set(a);
function overlapScore(a:string[], b:string[]):number {
 const A=asSet(a),B=asSet(b); let hits=0;
 for(const token of A) if (B.has(token)) hits += token.length>5 ? 1.35 : 1;
 if(!A.size) return 0;
 return hits/Math.sqrt(Math.max(A.size,1));
}
function faqScore(question:string,item:QAItem):number {
 const query=normalize(question), title=normalize(item.question),alias=normalize((item.keywords||[]).join(' '));
 const terms=tokens(question);
 const target=new Set(tokens(item.question+' '+(item.keywords||[]).join(' ')));
 const hits=new Set(terms.filter(t=>target.has(t))).size;
 if(hits<(terms.length===1?1:2))return 0;
 let score=overlapScore(terms,tokens(item.question))*4.7 + overlapScore(terms,tokens(item.answer))*0.82 + overlapScore(terms,tokens(alias))*1.9;
 if(query && title.includes(query) && query.length>7) score += 12;
 if(query && query.includes(title) && title.length>7) score += 10;
 if((item.keywords||[]).some(k=>normalize(k)===query)) score += 10;
 // Avoid matching on one very common keyword in an unrelated question.
 if(!terms.length) score=0;
 return score;
}
export function rankFAQs(question:string,limit=5):{item:QAItem;score:number}[] {
 return QA.map(item=>({item,score:faqScore(question,item)})).sort((a,b)=>b.score-a.score).filter(x=>x.score>0.8).slice(0,limit);
}
export function retrieve(question:string,limit=6):SourceRef[] {
 const terms=tokens(question); const cleaned=normalize(question);
 const ordered=chunks.map(ch=>{
  const t=normalize(ch.text),title=normalize(ch.section);
  const overlap=overlapScore(terms,tokens(ch.text));
  const heading=overlapScore(terms,tokens(ch.section));
  const phrase=cleaned.length>8&&t.includes(cleaned)?3:0;
  return {ch,score:overlap*2.2+heading*.9+phrase};
 }).filter(x=>x.score>0.45).sort((a,b)=>b.score-a.score);
 const result:SourceRef[]=[];let pages=new Set<number>();
 for(const {ch} of ordered){
  if(result.length>=limit)break;
  if(pages.has(ch.page)&&result.length<Math.min(limit,3))continue;
  result.push({id:ch.id,page:ch.page,title:ch.section,excerpt:ch.text.slice(0,1070)});
  pages.add(ch.page);
 }
 return result;
}
export function faqToSources(item:QAItem):SourceRef[]{
 return item.pages.slice(0,4).map(page=>({id:`P${page}`,page,title:'Báo cáo nghiên cứu R3',excerpt:''}));
}
export function buildLocalAnswer(question:string, history:string[]=[]):AnswerResult {
 const q=question.trim();
 const ranked=rankFAQs(q,4);
 const primary=ranked[0];
 if(primary && primary.score>=2.6){
  const others=ranked.slice(1).filter(x=>x.item.id!==primary.item.id && x.item.category===primary.item.category && x.score>primary.score*.58);
  return {answer:primary.item.answer,sources:faqToSources(primary.item),kind:primary.item.kind,mode:'local',note:'Trả lời từ thư viện đã biên tập theo báo cáo. Không sử dụng Gemini API.',followups:others.slice(0,2).map(x=>x.item.question)};
 }
 // Follow-up may be elliptical; combine only the latest turn, not the entire conversation.
 if(history.length&&tokens(q).length<3){
  const previous=rankFAQs(history.at(-1)+' '+q,2)[0];
  if(previous&&previous.score>=3.4){return {answer:previous.item.answer,sources:faqToSources(previous.item),kind:previous.item.kind,mode:'local',note:'Gợi ý từ câu hỏi trước; vui lòng kiểm tra phần nguồn.',followups:[]};}
 }
 return {answer:'Em chưa tìm được câu trả lời đủ chắc chắn cho câu hỏi này trong bộ nội dung đã biên tập. Anh/chị có thể đặt câu hỏi cụ thể hơn về phương pháp, 5 loài cây, kết quả sinh trưởng, buồng ESP32 hoặc giới hạn khoa học của báo cáo.',sources:[],kind:'unknown',mode:'local',note:'Không suy đoán khi chưa có dữ liệu phù hợp.',followups:['Chế phẩm R3 tác động thế nào đến cây ngô?','Vì sao R3 làm giảm sinh trưởng đậu đen?']};
}
