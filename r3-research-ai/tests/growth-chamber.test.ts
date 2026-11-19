import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const html=readFileSync(resolve(process.cwd(),'public/growth-chamber/index.html'),'utf8');

describe('Growth Chamber QR Guide V3',()=>{
  it('contains the four required content areas',()=>{
    for(const id of ['cau-tao','tinh-nang','dien-thoai','bai-hoc']){
      expect(html).toContain('id="'+id+'"');
    }
  });
  it('includes embedded illustrations without external image dependencies',()=>{
    const count=(html.match(/<img[^>]+src="data:image\//g)||[]).length;
    expect(count).toBeGreaterThanOrEqual(3);
    expect(html).not.toMatch(/<img[^>]+src="https?:/i);
  });
  it('documents the real ESP32 local-WiFi connection flow',()=>{
    expect(html).toContain('ESP32_ENV');
    expect(html).toContain('12345678');
    expect(html).toContain('id="esp-ip"');
    expect(html).toContain('id="ip-open"');
    expect(html).toContain('id="ip-copy"');
  });
  it('contains interactive but clearly labelled demo controls',()=>{
    for(const id of ['temp-slider','sim-mode-label','heater-toggle','fan-toggle','low-threshold','high-threshold']){
      expect(html).toContain('id="'+id+'"');
    }
    expect(html.toLowerCase()).toContain('mô phỏng');
  });
  it('retains safety-critical firmware facts and honest limitations',()=>{
    expect(html).toContain('DHT11');
    expect(html).toContain('BH1750');
    expect(html).toContain('GPIO27');
    expect(html).toContain('GPIO25');
    expect(html).toContain('GPIO26');
    expect(html).toContain('25–37°C');
    expect(html).toContain('10 × 15');
  });
});
