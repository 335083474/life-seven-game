"""Prepare the retained CC0 paper recording without changing the original."""
from pathlib import Path
import hashlib, json, subprocess

root = Path(__file__).resolve().parents[2]
source = root / 'artifacts/audio-candidates-20261025/raw/page-turn.mp3'
output = root / 'prototype/public/assets/page-turn-soft.mp3'
filters = 'atempo=1.35,highpass=f=90,lowpass=f=2200:p=2,acompressor=threshold=0.035:ratio=5:attack=1:release=90:makeup=1,volume=0.85,afade=t=in:st=0:d=0.03,afade=t=out:st=1.15:d=0.2,atrim=0:1.35'
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(source),'-af',filters,'-ac','1','-ar','44100','-codec:a','libmp3lame','-b:a','96k','-map_metadata','-1',str(output)],check=True)
report = {'source':'https://bigsoundbank.com/pages-that-turn-5-s2212.html','creator':'Joseph SARDIN','license':'CC0','originalSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'file':output.name,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'filters':filters}
(root/'artifacts/audio-candidates-20261025/paper-production.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2))
