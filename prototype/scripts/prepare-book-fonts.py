"""Preserve official OFL font sources; ship renamed WOFF2 subsets for the authored sample."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from fontTools.ttLib import TTFont
from fontTools import subset
import hashlib,json,urllib.request

root=Path(__file__).resolve().parents[2]
source=root/'artifacts/book-type/source'
output=root/'prototype/public/assets'
source.mkdir(parents=True,exist_ok=True)
fonts=[
 ('body','https://github.com/lxgw/LxgwWenKai/releases/download/v1.530/LXGWWenKai-Regular.ttf','https://raw.githubusercontent.com/lxgw/LxgwWenKai/main/OFL.txt','LXGW WenKai','LXGW / Fontworks'),
 ('display','https://raw.githubusercontent.com/google/fonts/main/ofl/mashanzheng/MaShanZheng-Regular.ttf','https://raw.githubusercontent.com/google/fonts/main/ofl/mashanzheng/OFL.txt','Ma Shan Zheng','The Ma Shan Zheng Project Authors')
]
def fetch(entry):
 kind,url,license_url,_,_=entry
 for suffix,link in [('ttf',url),('OFL.txt',license_url)]:
  file=source/f'{kind}.{suffix}'
  if not file.exists():file.write_bytes(urllib.request.urlopen(link,timeout=90).read())
with ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(fetch,fonts))
text=''.join(p.read_text(encoding='utf-8') for p in (root/'prototype/src').glob('*') if p.suffix in ['.ts','.mjs','.css'])+(root/'prototype/index.html').read_text(encoding='utf-8')
codepoints={ord(c) for c in text}|set(range(0x20,0x7f))
records=[]
for kind,url,license_url,title,creator in fonts:
 file=source/f'{kind}.ttf';font=TTFont(file);font.recalcTimestamp=False
 options=subset.Options();options.flavor='woff2';options.name_IDs=['*'];options.name_legacy=True;options.name_languages=['*'];options.notdef_glyph=True
 cutter=subset.Subsetter(options=options);cutter.populate(unicodes=codepoints);cutter.subset(font)
 family='Fate Archive '+kind.title();full=family+' Regular'
 for record in font['name'].names:
  if record.nameID in [1,2,3,4,6,16,17,18,25]:
   value='Regular' if record.nameID in [2,17] else (full.replace(' ','') if record.nameID in [3,6,25] else family if record.nameID in [1,16] else full)
   record.string=value.encode(record.getEncoding(),errors='replace')
 font.flavor='woff2';destination=output/f'archive-{kind}.woff2';font.save(destination)
 license_file=output/f'archive-{kind}-OFL.txt';license_file.write_bytes((source/f'{kind}.OFL.txt').read_bytes())
 records.append({'file':destination.name,'source':url,'licenseSource':license_url,'originalTitle':title,'creator':creator,'family':family,'license':'SIL OFL 1.1','originalSha256':hashlib.sha256(file.read_bytes()).hexdigest(),'bytes':destination.stat().st_size,'sha256':hashlib.sha256(destination.read_bytes()).hexdigest(),'modifications':'Subset to sample characters; font family renamed to avoid reserved font names. Original copyright and OFL retained.'})
(output/'fonts.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
print(json.dumps(records,indent=2))
