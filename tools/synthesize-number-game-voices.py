# A small Klatt-style formant synthesizer for the digit words (8 kHz).
# Voiced: glottal pulses through three cascade resonators; fricatives and
# bursts: noise through a band resonator. Output: WAV files.
import numpy as np, wave, sys
SR=8000; FR=40  # 5 ms frames
P={ # F1,F2,F3, voice amp, noise amp, noise centre, noise bw
'IH':(400,1900,2550,1,0,0,0),'OW':(480,900,2350,1,0,0,0),'UW':(330,880,2200,1,0,0,0),
'AH':(650,1200,2500,1,0,0,0),'IY':(290,2250,2950,1,0,0,0),'AO':(580,880,2450,1,0,0,0),
'AA':(720,1220,2550,1,0,0,0),'EH':(560,1800,2500,1,0,0,0),'EY':(480,1950,2600,1,0,0,0),
'R':(330,1100,1450,.8,0,0,0),'W':(300,620,2150,.7,0,0,0),'N':(260,1250,2550,.35,0,0,0),
'M':(260,1000,2300,.35,0,0,0),'V':(300,1100,2400,.35,.25,3000,2500),'Z':(300,1500,2600,.35,.5,4600,1600),
'S':(400,1600,2600,0,1,5000,1800),'F':(400,1200,2500,0,.35,3200,3000),'TH':(400,1500,2600,0,.65,3400,2400),
'K':(400,1800,2400,0,.9,2000,900),'T':(400,1800,2600,0,1,4200,1600),'HH':(500,1500,2500,0,.3,1500,2500),
'_':(500,1500,2500,0,0,0,0),'H':(600,1300,2500,0,.25,1400,2400)}
def res(x,f,bw):
    y=np.zeros_like(x); C=-np.exp(-2*np.pi*bw/SR); B=2*np.exp(-np.pi*bw/SR)*np.cos(2*np.pi*f/SR); A=1-B-C
    y1=y2=0.0
    for i in range(len(x)):
        v=A*x[i]+B*y1+C*y2; y2=y1; y1=v; y[i]=v
    return y
def word(spec,pitch0=135,pitch1=95):
    frames=[]
    for ph,ms in spec:
        frames+= [ph]*max(1,ms//5)
    n=len(frames); T=np.array([P[f] for f in frames],dtype=float)
    # smooth transitions: moving average over 6 frames on formants/amps
    k=np.ones(7)/7
    S=np.array([np.convolve(np.pad(T[:,c],3,mode='edge'),k,'valid') for c in range(7)]).T
    N=n*FR; out=np.zeros(N)
    rng=np.random.default_rng(7)
    # sample-level params
    def up(c): return np.repeat(S[:,c],FR)
    f1,f2,f3,av,an,nf,nb=(up(c) for c in range(7))
    pitch=np.linspace(pitch0,pitch1,N)
    src=np.zeros(N); ph=0.0
    for i in range(N):
        ph+=pitch[i]/SR
        if ph>=1: ph-=1; src[i]=1.0
    src=np.convolve(src,np.hanning(12),'same')  # soften the pulses
    src*=av
    # time-varying cascade: process in frames with per-frame coefficients
    y=np.zeros(N); st=[[0,0],[0,0],[0,0]]
    for i in range(N):
        v=src[i]
        for j,(f,bw) in enumerate(((f1[i],70),(f2[i],100),(f3[i],160))):
            C=-np.exp(-2*np.pi*bw/SR); B=2*np.exp(-np.pi*bw/SR)*np.cos(2*np.pi*f/SR); A=1-B-C
            o=A*v+B*st[j][0]+C*st[j][1]; st[j][1]=st[j][0]; st[j][0]=o; v=o
        y[i]=v
    noise=rng.standard_normal(N)*an
    nz=np.zeros(N); s1=s2=0.0
    for i in range(N):
        if nf[i]<=0: s1=s2=0; continue
        C=-np.exp(-2*np.pi*nb[i]/SR); B=2*np.exp(-np.pi*nb[i]/SR)*np.cos(2*np.pi*min(nf[i],3800)/SR); A=1-B-C
        o=A*noise[i]+B*s1+C*s2; s2=s1; s1=o; nz[i]=o
    y=y/ (np.max(np.abs(y))+1e-9) + nz/(np.max(np.abs(nz))+1e-9)*0.45*(np.max(an)>0)
    # gentle fade in/out
    e=np.ones(N); r=min(160,N//4); e[:r]=np.linspace(0,1,r); e[-r:]=np.linspace(1,0,r); y*=e
    return (y/np.max(np.abs(y))*0.9).astype(np.float32)
WORDS={
'zero':[('Z',90),('IH',90),('R',80),('OW',170),('UW',90)],
'one':[('W',90),('AH',170),('N',150)],
'two':[('_',20),('T',60),('H',30),('UW',260)],
'three':[('TH',150),('R',110),('IY',250)],
'four':[('F',120),('AO',160),('R',150)],
'five':[('F',110),('AA',150),('IY',100),('V',110)],
'six':[('S',140),('IH',120),('_',50),('K',50),('S',150)],
'seven':[('S',130),('EH',140),('V',80),('AH',90),('N',140)],
'eight':[('EY',220),('IY',60),('_',50),('T',90)],
'nine':[('N',90),('AA',170),('IY',90),('N',150)],
'uhoh':[('AH',150),('_',90),('OW',200),('UW',60)],
'good':[('_',20),('K',40),('UW',170),('_',40),('T',50)],
}
for name,spec in WORDS.items():
    y=word(spec)
    w=wave.open(f'{name}.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((y*32767).astype('<i2').tobytes()); w.close()
    print(name,len(y)/SR)
