import {describe,it,expect} from 'vitest';
import {QA} from '../src/data/knowledge';
import {buildLocalAnswer,rankFAQs,retrieve,normalize} from '../src/lib/retrieval';

describe('R3 source-grounded retrieval',()=>{
 it('has curated evidence with valid PDF page numbers',()=>{
  expect(QA.length).toBeGreaterThanOrEqual(50);
  for(const item of QA){expect(item.pages.length).toBeGreaterThan(0);expect(item.pages.every(p=>p>=1&&p<=15)).toBe(true);}
 });
 it('normalizes Vietnamese diacritics and đ',()=>{expect(normalize('Đậu đen và Cải ngọt')).toBe('dau den va cai ngot');});
 it('finds main corn effect',()=>{expect(rankFAQs('Chế phẩm R3 tác động thế nào đến cây ngô?')[0].item.id).toBe('q27');});
 it('does not claim blanket safety',()=>{const a=buildLocalAnswer('Có thể khẳng định chế phẩm R3 an toàn không?');expect(a.answer).toMatch(/phạm vi|phạm vi thử nghiệm|7 ngày/);expect(a.kind).toBe('limitation');});
 it('does not invent results for unrelated topics',()=>{const a=buildLocalAnswer('Dự báo thời tiết ngày mai ở Hà Nội?');expect(a.kind).toBe('unknown');expect(a.sources).toHaveLength(0);});
 it('links to actual PDF pages',()=>{const a=buildLocalAnswer('R3 có giúp mọi loài cây phát triển tốt không?');expect(a.sources.some(s=>s.page===13)).toBe(true);});
 it('retrieves source text with correct page boundaries',()=>{const r=retrieve('quang chu kỳ 14 giờ và nhiệt độ',5);expect(r.length).toBeGreaterThan(0);expect(r.every(s=>s.page>=2&&s.page<=15)).toBe(true);});
 it('not conflates field trial with completed lab trial',()=>{const a=buildLocalAnswer('Có thể ứng dụng chế phẩm ngoài đồng ruộng ngay không?');expect(a.kind).toBe('limitation');expect(a.answer).toMatch(/Chưa/);});
});
