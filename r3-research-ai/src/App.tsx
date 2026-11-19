import {useEffect,useRef,useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
 ArrowRight,ArrowUpRight,ArrowUp,BookOpen,Check,CheckCheck,ChevronRight,Copy,
 Cpu,ExternalLink,FileText,FlaskConical,GraduationCap,House,Info,
 Menu,MessageCircle,Mic,RotateCcw,Search,Share2,ShieldCheck,Sparkles,Volume2,X,
 ChartColumnIncreasing,Network
} from 'lucide-react';
import {QA,TOPICS,GALLERY,PRACTICE,QUICK_QUESTIONS,type TopicId,type EvidenceKind} from './data/knowledge';
import {buildLocalAnswer,rankFAQs,type AnswerResult} from './lib/retrieval';

type View = 'home'|'chat'|'library'|'practice';
type Message = {id:string;role:'user'|'assistant';content:string;result?:AnswerResult};
const pdfUrl=(page:number)=>`/bao-cao-r3.pdf#page=${page}`;
const TOPIC_ICONS={overview:BookOpen,method:FlaskConical,results:ChartColumnIncreasing,technology:Cpu,critical:ShieldCheck};
const KINDS:Record<EvidenceKind|'unknown',string>={reported:'Theo báo cáo',hypothesis:'Giả thuyết',limitation:'Giới hạn dữ liệu',unknown:'Chưa đủ dữ liệu'};
const NAV=[{id:'home',label:'Khám phá',icon:House},{id:'chat',label:'Hỏi đáp AI',icon:MessageCircle},{id:'library',label:'Thư viện',icon:BookOpen},{id:'practice',label:'Luyện phản biện',icon:GraduationCap}] as const;

function Logo({small=false}:{small?:boolean}){return <span className={'logo-mark '+(small?'logo-sm':'')} aria-hidden="true"><svg width="29" height="29" viewBox="0 0 30 30" fill="none"><path d="M14.6 24.5V11.2m0 8.1C6.2 19.2 3.7 13.4 3.9 6.5c6.8.2 10.7 5.3 10.7 12.7Zm0-3.9c.2-7.6 5.4-11.4 12.2-11.3.1 7.2-4 11.4-12.2 11.3Z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="14.6" cy="25" r="1.5" fill="currentColor"/></svg></span>}
function TopicBadge({kind}:{kind:EvidenceKind|'unknown'}) {return <span className={`evidence-pill ${kind}`}>{kind==='hypothesis'?'◇':kind==='reported'?'✓':'!'} {KINDS[kind]}</span>}
function SourceLinks({result,onOpen}:{result:AnswerResult;onOpen:(page:number)=>void}) {
 if(!result.sources.length)return null;
 const pages=[...new Set(result.sources.map(s=>s.page))];
 return <div className="source-list"><span className="source-prefix"><FileText size={14}/> Dẫn nguồn</span>{pages.map(p=><button type="button" key={p} className="source-chip" onClick={()=>onOpen(p)}>Trang {p} <ArrowUpRight size={13}/></button>)}</div>;
}
function App(){
 const [view,setView]=useState<View>('home');
 const [drawer,setDrawer]=useState(false);
 const [question,setQuestion]=useState('');
 const [messages,setMessages]=useState<Message[]>([]);
 const [loading,setLoading]=useState(false);
 const [apiMode,setApiMode]=useState<'checking'|'gemini'|'local'>('checking');
 const [toast,setToast]=useState('');
 const [libTopic,setLibTopic]=useState<TopicId|'all'>('all');
 const [libQuery,setLibQuery]=useState('');
 const [galleryItem,setGalleryItem]=useState<(typeof GALLERY)[number]|null>(null);
 const [isHelpOpen,setIsHelpOpen]=useState(false);
 const [practiceIndex,setPracticeIndex]=useState(0);
 const [practiceText,setPracticeText]=useState('');
 const [showAnswer,setShowAnswer]=useState(false);
 const [voiceSupported,setVoiceSupported]=useState(false);
 const chatEndRef=useRef<HTMLDivElement|null>(null);
 const inputRef=useRef<HTMLTextAreaElement|null>(null);
 const toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const abort=useRef<AbortController|null>(null);

 useEffect(()=>{
  const Recognition=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
  setVoiceSupported(Boolean(Recognition));
  const controller=new AbortController();const t=setTimeout(()=>controller.abort(),4500);
  fetch('/api/health',{signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error('backend unavailable');const v=await r.json();setApiMode(v.mode==='gemini'?'gemini':'local');}).catch(()=>setApiMode('local')).finally(()=>clearTimeout(t));
  return()=>{controller.abort();clearTimeout(t);};
 },[]);
 useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:'smooth',block:'end'});},[messages,loading,view]);
 useEffect(()=>{function esc(e:KeyboardEvent){if(e.key==='Escape'){setDrawer(false);setGalleryItem(null);setIsHelpOpen(false);}}document.addEventListener('keydown',esc);return()=>document.removeEventListener('keydown',esc);},[]);
 useEffect(()=>()=>{if(toastTimer.current)clearTimeout(toastTimer.current);abort.current?.abort();},[]);
 function notify(msg:string){setToast(msg);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),2600);}
 function navigate(next:View){setView(next);setDrawer(false);window.scrollTo({top:0,behavior:'smooth'});}
 function openPDF(page:number){window.open(pdfUrl(page),'_blank','noopener,noreferrer');}
 async function sendQuestion(text=question){
  const q=text.trim();if(!q||loading||q.length>650)return;
  setView('chat');setDrawer(false);setQuestion('');
  const previous=messages.filter(m=>m.role==='user').slice(-4).map(m=>m.content);
  setMessages(old=>[...old,{id:`u${Date.now()}`,role:'user',content:q}]);setLoading(true);
  const controller=new AbortController();abort.current=controller;
  try{
   let result:AnswerResult;
   if(apiMode==='local'){result=buildLocalAnswer(q,previous);}
   else {
    const response=await fetch('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:q,history:previous}),signal:controller.signal});
    if(!response.ok){const data=await response.json().catch(()=>({error:''}));throw new Error(data.error||'Tạm thời không thể kết nối máy chủ.');}
    result=await response.json();
   }
   if(result.mode==='local'&&apiMode==='gemini')notify('Đã chuyển sang tra cứu nội bộ');
   setMessages(old=>[...old,{id:`a${Date.now()}`,role:'assistant',content:result.answer,result}]);
  }catch(e){
   const fallback=buildLocalAnswer(q,previous);
   setMessages(old=>[...old,{id:`a${Date.now()}`,role:'assistant',content:fallback.answer,result:{...fallback,note:'Không kết nối được AI; trả lời từ thư viện đã kiểm duyệt.'}}]);
   if((e as Error).name!=='AbortError')notify('Kết nối AI gián đoạn — đang dùng dữ liệu nội bộ');
  }finally{setLoading(false);abort.current=null;}
 }
 function startVoice(){
  const Recognition=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
  if(!Recognition){notify('Trình duyệt này chưa hỗ trợ nhập giọng nói');return;}
  const rec=new Recognition();rec.lang='vi-VN';rec.interimResults=false;rec.maxAlternatives=1;
  rec.onresult=(event:any)=>{const text=event.results?.[0]?.[0]?.transcript;if(text)setQuestion(prev=>prev?`${prev} ${text}`:text);inputRef.current?.focus();};
  rec.onerror=()=>notify('Không nhận được giọng nói. Anh/chị có thể nhập câu hỏi.');rec.start();notify('Đang lắng nghe câu hỏi...');
 }
 function speak(text:string){const synth=window.speechSynthesis;if(!synth){notify('Thiết bị không hỗ trợ đọc văn bản');return;}synth.cancel();const utter=new SpeechSynthesisUtterance(text);utter.lang='vi-VN';utter.rate=.97;synth.speak(utter);}
 async function copyText(text:string){try{await navigator.clipboard.writeText(text);notify('Đã sao chép câu trả lời');}catch{notify('Không thể sao chép trong trình duyệt này');}}
 async function shareApp(){const payload={title:'R3 Research AI',text:'Khám phá công trình vi nấm R3 bằng trợ lý nghiên cứu khoa học.',url:location.href};if(navigator.share){try{await navigator.share(payload);return;}catch{return;}}try{await navigator.clipboard.writeText(location.href);notify('Đã sao chép đường dẫn');}catch{notify('Hãy sao chép đường dẫn trên thanh địa chỉ');}}
 function clearConversation(){if(messages.length===0)return;abort.current?.abort();setMessages([]);setQuestion('');setLoading(false);notify('Đã xóa hội thoại trên thiết bị này');}
 const composer=<form className="composer" onSubmit={e=>{e.preventDefault();void sendQuestion();}}>
  <div className="composer-line"><textarea ref={inputRef} rows={1} value={question} maxLength={650} aria-label="Nhập câu hỏi cho R3 AI" placeholder="Đặt câu hỏi về nghiên cứu R3..." onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void sendQuestion();}}}/>
   <div className="composer-buttons">{voiceSupported&&<button className="icon-button mic-btn" type="button" title="Nhập bằng giọng nói" onClick={startVoice}><Mic size={18}/></button>}<button className="send-btn" type="submit" disabled={!question.trim()||loading} aria-label="Gửi câu hỏi"><ArrowUp size={19}/></button></div>
  </div><div className="composer-foot"><span><Sparkles size={12}/> {apiMode==='gemini'?'Gemini Free API · có kiểm soát nguồn':'Tra cứu báo cáo · không cần API key'}</span><span>{question.length>0?`${question.length}/650`:'Chỉ dùng dữ liệu từ báo cáo'}</span></div>
 </form>;
 const filteredFAQ=QA.filter(q=>(libTopic==='all'||q.category===libTopic)&&(!libQuery||`${q.question} ${q.answer}`.toLocaleLowerCase('vi').includes(libQuery.toLocaleLowerCase('vi'))));

 return <div className="app-shell">
  <aside className="sidebar desktop-sidebar">
   <div className="brand-row"><Logo/><div className="brand-text"><strong>R3 <span>Research AI</span></strong><small>Scientific Discovery Platform</small></div></div>
   <div className="sidebar-group-label">KHÔNG GIAN NGHIÊN CỨU</div>
   <nav className="primary-nav" aria-label="Điều hướng chính">{NAV.map(item=>{const I=item.icon;return <button key={item.id} onClick={()=>navigate(item.id)} className={'nav-button '+(view===item.id?'active':'')}><I size={19} strokeWidth={1.8}/><span>{item.label}</span>{view===item.id&&<span className="nav-active-dot"/>}</button>;})}</nav>
   <div className="sidebar-separator"/>
   <div className="sidebar-group-label">CHỦ ĐỀ KHÁM PHÁ</div>
   <div className="sidebar-topics">{TOPICS.map(t=>{const I=TOPIC_ICONS[t.id];return <button key={t.id} onClick={()=>{setLibTopic(t.id);navigate('library');}}><I size={17}/><span>{t.name}</span><ChevronRight size={14}/></button>;})}</div>
   <div className="sidebar-bottom"><div className="sidebar-feature"><span className="feature-icon"><Sparkles size={15}/></span><strong>Research mode</strong><p>52 câu hỏi đã biên tập từ báo cáo khoa học.</p><button onClick={()=>navigate('practice')}>Luyện phản biện <ArrowRight size={13}/></button></div><div className="tiny-footer"><span className="mini-status-dot"/> Không dùng dữ liệu ngoài báo cáo</div></div>
  </aside>
  <div className="workspace">
   <header className="topbar"><div className="mobile-brand"><button className="icon-button mobile-menu" onClick={()=>setDrawer(true)} title="Mở menu"><Menu size={23}/></button><Logo small/><strong>R3 <span>Research AI</span></strong></div>
    <div className="breadcrumb desktop-breadcrumb"><span>Workspace</span><ChevronRight size={14}/><strong>{NAV.find(x=>x.id===view)?.label}</strong></div>
    <div className="top-actions"><span className={'mode-pill '+(apiMode==='gemini'?'online':'')}><span className="mini-status-dot"/>{apiMode==='checking'?'Đang kiểm tra':apiMode==='gemini'?'Gemini AI':'Chế độ tra cứu'}</span><button className="header-icon" aria-label="Chia sẻ ứng dụng" onClick={shareApp}><Share2 size={18}/></button><button className="header-icon" aria-label="Thông tin ứng dụng" onClick={()=>setIsHelpOpen(true)}><Info size={18}/></button><span className="avatar">R3</span></div>
   </header>
   <main className={'main-content '+(view==='chat'?'chat-page':'')}>
   {view==='home'&&<div className="page-inner home-page">
     <div className="page-eyebrow"><span className="eyebrow-sparkle">✳</span> KHÁM PHÁ KHOA HỌC <span className="eyebrow-line"/> 2026</div>
     <section className="hero"><div className="hero-content"><span className="hero-index">NGHIÊN CỨU SINH HỌC ỨNG DỤNG <span>·</span> PHÚ THỌ</span><h1>Khám phá nghiên cứu.<br/><em>Hiểu sâu hơn</em> cùng AI.</h1><p>Trợ lý khoa học giúp bạn tìm hiểu công trình vi nấm R3 và tác động đến sinh trưởng cây non — với câu trả lời có dẫn chứng từ báo cáo gốc.</p><div className="hero-actions"><button className="primary-btn" onClick={()=>navigate('chat')}>Bắt đầu hỏi AI <ArrowRight size={18}/></button><button className="secondary-btn" onClick={()=>openPDF(1)}><FileText size={17}/> Xem báo cáo gốc</button></div><div className="hero-trust"><span className="trust-bubbles"><i>R</i><i>3</i><i>AI</i></span><span>Trả lời theo nguồn · Không tự tạo số liệu</span></div></div>
       <div className="hero-visual"><div className="hero-photo-frame"><img src="/media/corn-seedlings.webp" alt="Hình 7 — các mẫu cây ngô trong báo cáo nghiên cứu"/><div className="photo-caption"><span className="photo-dot"/><span>Ảnh nghiên cứu thực nghiệm</span><ArrowUpRight size={14}/></div></div><div className="floating-fact fact-a"><span>THÍ NGHIỆM</span><strong>05 <small>loài cây</small></strong></div><div className="floating-fact fact-b"><div className="fact-chart"><i/><i/><i/><i/><i/></div><div><b>07 ngày</b><small>Theo dõi sinh trưởng</small></div></div></div>
     </section>
     <section className="stat-row" aria-label="Số liệu tổng quan"><div><span>01 / VẬT LIỆU</span><strong>05</strong><small>Loài cây khảo sát</small></div><div><span>02 / THIẾT KẾ</span><strong>04</strong><small>Công thức xử lý</small></div><div><span>03 / THỜI GIAN</span><strong>07 <b>ngày</b></strong><small>Quan sát cây non</small></div><div><span>04 / CƠ CHẤT</span><strong>02</strong><small>Bã chè & xơ dừa</small></div></section>
     <div className="section-heading"><div><span className="kicker">GỢI Ý DÀNH CHO BẠN</span><h2>Bắt đầu với một câu hỏi</h2></div><button className="text-link" onClick={()=>navigate('chat')}>Mở chatbot <ArrowUpRight size={17}/></button></div>
     <div className="prompt-grid">{QUICK_QUESTIONS.map((t,i)=><button key={t} className="prompt-card" onClick={()=>void sendQuestion(t)}><span className="prompt-icon">{i===0?<FlaskConical size={21}/>:i===1?<ChartColumnIncreasing size={21}/>:i===2?<ShieldCheck size={21}/>:<Cpu size={21}/>}</span><span>{t}</span><ArrowUpRight className="prompt-arrow" size={18}/></button>)}</div>
     <div className="section-heading result-heading"><div><span className="kicker">TỪ BÁO CÁO KHOA HỌC</span><h2>Ba phát hiện đáng chú ý</h2></div><button className="text-link" onClick={()=>navigate('library')}>Xem tư liệu <ArrowUpRight size={17}/></button></div>
     <div className="finding-grid"><article className="finding-card"><div className="finding-top"><span className="finding-label positive">↗ TÍCH CỰC</span><span>01</span></div><h3>Lúa & ngô</h3><p>R3 cho xu hướng thúc đẩy sinh trưởng rõ rệt, nổi bật ở cây ngô trong điều kiện nghiên cứu.</p><button onClick={()=>openPDF(13)}>Nguồn: trang 13 <ArrowUpRight size={14}/></button></article><article className="finding-card"><div className="finding-top"><span className="finding-label caution">↘ ỨC CHẾ</span><span>02</span></div><h3>Đậu đen & rau muống</h3><p>Hai loài có xu hướng giảm chiều cao và sinh khối sau khi sử dụng chế phẩm R3.</p><button onClick={()=>openPDF(13)}>Nguồn: trang 13 <ArrowUpRight size={14}/></button></article><article className="finding-card"><div className="finding-top"><span className="finding-label neutral">— TRUNG TÍNH</span><span>03</span></div><h3>Cải ngọt</h3><p>Mức đáp ứng tương đối trung tính, chưa nổi bật như nhóm lúa và ngô.</p><button onClick={()=>openPDF(13)}>Nguồn: trang 13 <ArrowUpRight size={14}/></button></article></div>
     <section className="explore-bottom"><div><span className="kicker">DÀNH CHO HỌC SINH</span><h2>Sẵn sàng bảo vệ đề tài?</h2><p>Tập trả lời những câu hỏi hội đồng có thể đặt ra. Đọc gợi ý, đối chiếu đáp án tham khảo và tự đánh giá lập luận.</p><button className="primary-btn" onClick={()=>navigate('practice')}>Vào phòng luyện tập <ArrowRight size={17}/></button></div><div className="practice-art"><span><GraduationCap size={60} strokeWidth={1.2}/></span><i className="practice-orbit orb1"/><i className="practice-orbit orb2"/></div></section>
     <footer className="main-footer">R3 Research AI · Nội dung dựa trên BC149.02.04.pdf · Báo cáo nghiên cứu học sinh 2026</footer>
   </div>}
   {view==='chat'&&<div className="chat-layout"><div className="chat-main"><div className="chat-header"><div><span className="kicker">KHÔNG GIAN HỎI ĐÁP</span><h2>Trò chuyện cùng R3 AI <span className="chat-ai-spark">✳</span></h2><p>Hiểu nghiên cứu bằng các câu trả lời có căn cứ.</p></div>{messages.length>0&&<button className="light-btn" onClick={clearConversation}><RotateCcw size={16}/> Cuộc trò chuyện mới</button>}</div>
    <div className="messages-scroll" aria-live="polite">
     {messages.length===0?<div className="chat-empty"><div className="empty-illustration"><Logo/><span className="empty-orbit orb-a"/><span className="empty-orbit orb-b"/></div><span className="kicker">XIN CHÀO, MÌNH LÀ R3 AI</span><h3>Bạn muốn khám phá<br/><em>điều gì hôm nay?</em></h3><p>Mình có thể giải thích phương pháp, phân tích kết quả và giúp bạn luyện phản biện khoa học.</p><div className="empty-suggestions">{QUICK_QUESTIONS.map(t=><button key={t} onClick={()=>void sendQuestion(t)}>{t}<ArrowUpRight size={15}/></button>)}</div></div>:
     <div className="chat-messages">{messages.map(m=><div key={m.id} className={'message '+(m.role==='user'?'user-message':'ai-message')}>{m.role==='assistant'&&<div className="message-avatar"><Logo small/></div>}<div className="message-body">{m.role==='assistant'&&<div className="message-author">R3 Research AI {m.result&&<TopicBadge kind={m.result.kind}/>}</div>}{m.role==='user'?<div className="user-bubble">{m.content}</div>:<div className="ai-content"><div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>{m.result&&<><SourceLinks result={m.result} onOpen={openPDF}/>{m.result.note&&<div className="answer-note"><Info size={13}/>{m.result.note}</div>}<div className="message-tools"><button onClick={()=>void copyText(m.content)} title="Sao chép"><Copy size={15}/> Sao chép</button><button onClick={()=>speak(m.content)} title="Đọc câu trả lời"><Volume2 size={16}/> Nghe</button></div>{m.result.followups.length>0&&<div className="followups">{m.result.followups.map(f=><button key={f} onClick={()=>void sendQuestion(f)}>{f} <ArrowUpRight size={13}/></button>)}</div>}</>}</div>}</div></div>)}{loading&&<div className="message ai-message"><div className="message-avatar"><Logo small/></div><div className="thinking-card"><div className="typing-indicator"><i/><i/><i/></div><span>Đang đối chiếu tài liệu nghiên cứu...</span></div></div>}<div ref={chatEndRef}/></div>}
    </div><div className="chat-compose-wrap">{composer}<span className="chat-disclaimer">R3 AI có thể sai. Khi bảo vệ đề tài, hãy đối chiếu trực tiếp tài liệu gốc.</span></div>
    </div><aside className="chat-aside"><div className="aside-overline">TRỌNG TÂM NGHIÊN CỨU <span>01 / 03</span></div><div className="aside-photo"><img src="/media/growth-chamber.webp" alt="Buồng sinh trưởng được chế tạo cho nghiên cứu"/><span>HÌNH 1 · TRANG 4</span></div><h3>Đằng sau những kết quả</h3><p>Vi nấm R3 phân lập từ sâm Đương quy được khảo sát trên 5 loài cây trong buồng sinh trưởng kiểm soát môi trường.</p><div className="aside-meter"><span>05 loài cây</span><div><i style={{width:'100%'}}/></div></div><div className="aside-meter"><span>04 công thức</span><div><i style={{width:'80%'}}/></div></div><button onClick={()=>navigate('library')} className="aside-link">Khám phá tư liệu <ArrowRight size={15}/></button><div className="aside-note"><ShieldCheck size={18}/><span>Chỉ sử dụng nội dung được trích từ báo cáo gốc.</span></div></aside></div>}
   {view==='library'&&<div className="page-inner library-page"><div className="page-eyebrow"><span className="eyebrow-sparkle">✳</span> THƯ VIỆN NGHIÊN CỨU <span className="eyebrow-line"/> 15 TRANG</div><div className="page-head"><div><h1>Tri thức được<br/><em>sắp xếp rõ ràng.</em></h1><p>Tra cứu 52 câu hỏi khoa học và xem lại ảnh, biểu đồ gốc từ tài liệu nghiên cứu.</p></div><button className="secondary-btn" onClick={()=>openPDF(1)}><FileText size={18}/> Mở PDF gốc</button></div><div className="section-heading"><div><span className="kicker">TỦ SÁCH NGHIÊN CỨU</span><h2>Câu hỏi theo chủ đề</h2></div></div><div className="library-search"><Search size={19}/><input value={libQuery} onChange={e=>setLibQuery(e.target.value)} placeholder="Tìm phương pháp, vi nấm, kết quả..." aria-label="Tìm kiếm trong thư viện"/>{libQuery&&<button onClick={()=>setLibQuery('')} aria-label="Xóa tìm kiếm"><X size={16}/></button>}</div><div className="filter-pills"><button className={libTopic==='all'?'selected':''} onClick={()=>setLibTopic('all')}>Tất cả <span>{QA.length}</span></button>{TOPICS.map(t=><button key={t.id} className={libTopic===t.id?'selected':''} onClick={()=>setLibTopic(t.id)}>{t.name}</button>)}</div><div className="qa-list">{filteredFAQ.length===0?<div className="no-results">Không tìm thấy nội dung phù hợp. Hãy thử từ khóa khác.</div>:filteredFAQ.map(qa=><button key={qa.id} className="qa-row" onClick={()=>void sendQuestion(qa.question)}><span className="qa-number">{qa.id.toUpperCase()}</span><span className="qa-title">{qa.question}<small>Trang {qa.pages.join(', ')} · {KINDS[qa.kind]}</small></span><ArrowUpRight size={18}/></button>)}</div>
    <div className="section-heading gallery-heading"><div><span className="kicker">HÌNH ẢNH TRONG BÁO CÁO</span><h2>Tư liệu thực nghiệm</h2></div><span className="gallery-count">{GALLERY.length} hình ảnh</span></div><div className="gallery-grid">{GALLERY.map(item=><button key={item.id} className="gallery-card" onClick={()=>setGalleryItem(item)}><div className="gallery-img"><img loading="lazy" src={item.image} alt={item.desc}/><span>{item.tag}</span></div><div className="gallery-desc"><strong>{item.title}</strong><small>{item.desc}</small><ArrowUpRight size={16}/></div></button>)}</div><footer className="main-footer">Hình ảnh trích từ BC149.02.04.pdf, không phải ảnh tạo bởi AI.</footer></div>}
   {view==='practice'&&<div className="page-inner practice-page"><div className="page-eyebrow"><span className="eyebrow-sparkle">✳</span> PHÒNG LUYỆN PHẢN BIỆN <span className="eyebrow-line"/> HỌC SINH THPT</div><div className="page-head"><div><h1>Luyện tập tư duy.<br/><em>Bảo vệ có căn cứ.</em></h1><p>5 câu hỏi phản biện được biên tập từ nội dung và giới hạn nghiên cứu. Tự viết câu trả lời rồi đối chiếu đáp án tham khảo.</p></div><span className="practice-header-icon"><GraduationCap size={44} strokeWidth={1.4}/></span></div><div className="practice-layout"><div className="practice-card"><div className="practice-progress-head"><span>CÂU HỎI {String(practiceIndex+1).padStart(2,'0')} / {String(PRACTICE.length).padStart(2,'0')}</span><span>{Math.round((practiceIndex+1)/PRACTICE.length*100)}%</span></div><div className="practice-progress"><i style={{width:`${(practiceIndex+1)/PRACTICE.length*100}%`}}/></div><span className="mock-role"><span><ShieldCheck size={16}/></span> Hội đồng giám khảo</span><h2>{PRACTICE[practiceIndex].question}</h2><div className="hint-box"><Sparkles size={17}/><span>{PRACTICE[practiceIndex].hint}</span></div><label htmlFor="practice-answer">Câu trả lời của bạn</label><textarea id="practice-answer" value={practiceText} onChange={e=>setPracticeText(e.target.value)} placeholder="Thử trình bày câu trả lời bằng lập luận khoa học của bạn..." rows={5}/>{showAnswer&&<div className="sample-answer"><div><CheckCheck size={18}/> ĐÁP ÁN THAM KHẢO</div><p>{PRACTICE[practiceIndex].answer}</p><div className="answer-pages">Nguồn: {PRACTICE[practiceIndex].pages.map(p=><button key={p} onClick={()=>openPDF(p)}>Trang {p} <ArrowUpRight size={13}/></button>)}</div></div>}<div className="practice-card-actions"><button className="secondary-btn" onClick={()=>setShowAnswer(!showAnswer)}>{showAnswer?'Ẩn đáp án':'Xem đáp án tham khảo'}<BookOpen size={16}/></button><button className="primary-btn" onClick={()=>{setPracticeIndex((practiceIndex+1)%PRACTICE.length);setPracticeText('');setShowAnswer(false);}}>{practiceIndex===PRACTICE.length-1?'Luyện lại':'Câu tiếp theo'} <ArrowRight size={16}/></button></div></div><aside className="practice-tips"><span className="kicker">CẨM NANG PHẢN BIỆN</span><h3>5 điều giám khảo tìm kiếm</h3>{['Hiểu chính xác giả thuyết','Dẫn chứng số liệu thực nghiệm','Phân biệt kết quả và suy luận','Nhận diện hạn chế nghiên cứu','Trả lời rõ ràng, đúng trọng tâm'].map((t,i)=><div key={t}><span>{String(i+1).padStart(2,'0')}</span>{t}</div>)}<p>Chế độ này hỗ trợ tự luyện với đáp án tham khảo, chưa tự động chấm điểm bằng AI.</p></aside></div></div>}
   </main>
  </div>
  <nav className="mobile-bottom-nav" aria-label="Điều hướng điện thoại">{NAV.map(item=>{const I=item.icon;return <button key={item.id} onClick={()=>navigate(item.id)} className={view===item.id?'current':''}><I size={20} strokeWidth={view===item.id?2.4:1.8}/><span>{item.label==='Luyện phản biện'?'Luyện tập':item.label}</span></button>;})}</nav>
  {drawer&&<div className="drawer-backdrop" onClick={()=>setDrawer(false)}><div className="drawer" onClick={e=>e.stopPropagation()}><div className="drawer-head"><div className="brand-row"><Logo/><div className="brand-text"><strong>R3 <span>Research AI</span></strong><small>Scientific Discovery Platform</small></div></div><button className="icon-button" onClick={()=>setDrawer(false)} aria-label="Đóng menu"><X size={23}/></button></div><nav className="primary-nav">{NAV.map(item=>{const I=item.icon;return <button key={item.id} className={'nav-button '+(view===item.id?'active':'')} onClick={()=>navigate(item.id)}><I size={19}/>{item.label}</button>;})}</nav><div className="sidebar-group-label">CHỦ ĐỀ</div>{TOPICS.map(t=><button className="drawer-topic" key={t.id} onClick={()=>{setLibTopic(t.id);navigate('library');}}>{t.name}<ChevronRight size={16}/></button>)}<p className="drawer-foot">Sản phẩm thử nghiệm · Không lưu hội thoại lên máy chủ</p></div></div>}
  {galleryItem&&<div className="modal-backdrop" onClick={()=>setGalleryItem(null)} role="presentation"><div className="gallery-modal" role="dialog" aria-modal="true" aria-label={galleryItem.title} onClick={e=>e.stopPropagation()}><div className="modal-head"><div><strong>{galleryItem.title}</strong><small>{galleryItem.desc}</small></div><button className="icon-button" onClick={()=>setGalleryItem(null)} aria-label="Đóng"><X size={21}/></button></div><img src={galleryItem.image} alt={galleryItem.desc}/><div className="modal-footer"><span><FileText size={15}/> {galleryItem.tag} · Trang PDF {galleryItem.page}</span><button className="secondary-btn" onClick={()=>openPDF(galleryItem.page)}>Xem trang gốc <ArrowUpRight size={15}/></button></div></div></div>}
  {isHelpOpen&&<div className="modal-backdrop" onClick={()=>setIsHelpOpen(false)} role="presentation"><div className="help-modal" role="dialog" aria-modal="true" aria-label="Về R3 Research AI" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><strong>Về R3 Research AI</strong><small>Phiên bản 1.0 · Mobile-first PWA</small></div><button className="icon-button" onClick={()=>setIsHelpOpen(false)}><X size={21}/></button></div><p>Trợ lý được thiết kế để giải thích nội dung <b>BC149.02.04.pdf</b>. Câu trả lời dẫn trang PDF, phân biệt dữ liệu nghiên cứu với giả thuyết và phần chưa được kiểm chứng.</p><div className="help-setting"><Network size={18}/><div><strong>Chế độ hiện tại</strong><span>{apiMode==='gemini'?'Gemini API miễn phí kết hợp nguồn báo cáo':'Thư viện tri thức nội bộ, không cần API key'}</span></div></div><div className="help-setting"><ShieldCheck size={18}/><div><strong>Quyền riêng tư</strong><span>Hội thoại chỉ giữ trong bộ nhớ phiên; nếu bật Gemini Free Tier, câu hỏi và đoạn trích liên quan được gửi tới Google để xử lý và có thể được dùng cải thiện sản phẩm theo chính sách của họ. Không gửi thông tin nhạy cảm.</span></div></div><div className="help-setting"><FileText size={18}/><div><strong>Nguồn khoa học</strong><span>15 trang · 52 câu hỏi đã biên tập · Hình ảnh từ báo cáo.</span></div></div><button className="primary-btn help-open-doc" onClick={()=>openPDF(1)}>Mở tài liệu gốc <ExternalLink size={16}/></button></div></div>}
  {toast&&<div className="toast" role="status"><Check size={16}/>{toast}</div>}
 </div>;
}
export default App;
