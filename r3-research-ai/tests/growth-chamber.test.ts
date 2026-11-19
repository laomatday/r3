import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const html=readFileSync(resolve(process.cwd(),'public/growth-chamber/index.html'),'utf8');
describe('Growth Chamber QR guide',()=>{
  it('contains all four user-requested sections',()=>{
    for(const id of ['cau-tao','tinh-nang','su-dung','bai-hoc'])
      expect(html).toContain('id="'+id+'"');
  });
  it('uses hardware-specific WiFi and mobile IP access',()=>{
    expect(html).toContain('ESP32_ENV');
    expect(html).toContain('12345678');
    expect(html).toContain('id="chamber-ip"');
    expect(html).toContain('id="open-chamber-ip"');
  });
  it('describes actual auto and manual control, not automatic humidity/light',()=>{
    expect(html).toContain('25–37°C');
    expect(html).toContain('LOW để bật, HIGH để tắt');
    expect(html).toContain('Chỉ nhiệt độ DHT11');
    expect(html).toContain('hai relay có thể');
  });
  it('does not invent dimensions and keeps study results separate',()=>{
    expect(html).toContain('chưa có trong hai tài liệu');
    expect(html).toContain('không phải kích thước dài × rộng × cao');
    expect(html).toContain('không phải dữ liệu trực tuyến');
  });
  it('does not retain speculative mobile instructions',()=>{
    expect(html).not.toContain('Quy trình dưới đây mô tả cách theo dõi dự kiến');
  });
});