import numpy as np,json
from scipy.signal import correlate,resample_poly,butter,sosfilt
from pathlib import Path
p=Path(__file__).parent
names=['Front view.mov','Profile view.mov','Rear view.mov','Top view.mov','TV Dinner.mp4']
a={n:np.fromfile(p/(n+'.pcm'),dtype='<i2').astype(float)/32768 for n in names}
# Speech/music band, rectified energy envelope at 100 Hz; invariant to microphone polarity.
sos=butter(3,[180,2800],btype='bandpass',fs=8000,output='sos')
e={n:np.sqrt(np.mean(sosfilt(sos,x[:len(x)//80*80]).reshape(-1,80)**2,axis=1)) for n,x in a.items()}
ref=e[names[-1]]; results={}
for n in names[:-1]:
 x=e[n]; records=[]
 for t in [30,90,170,180,190,300,600,850]:
  y=ref[t*100:(t+10)*100];y=y-y.mean();c=correlate(x,y,mode='valid',method='fft');ss=np.r_[0,np.cumsum(x*x)];s=np.r_[0,np.cumsum(x)];m=len(y);den=np.sqrt(np.maximum((ss[m:]-ss[:-m])-(s[m:]-s[:-m])**2/m,1e-20)*np.sum(y*y));scores=c/den;i=np.argmax(scores);records.append({'edit':t,'source':i/100,'offset':i/100-t,'correlation':float(scores[i])})
 results[n]=records;print(n,records,flush=True)
(p/'sync-audio.json').write_text(json.dumps(results,indent=2))
