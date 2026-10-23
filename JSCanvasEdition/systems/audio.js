/* Layered Web Audio synthesis. No sound downloads required. */
(() => {
  'use strict';
  const N=window.Nocturne;
  class AudioEngine {
    constructor(game){
      this.game=game;this.context=null;this.enabled=false;this.foreground=true;
      this.volume=game.save.data.settings.volume??.6;this.ambience=game.save.data.settings.ambience!==false;
      this.voices=new Set();this.last=new Map();this.maxVoices=28;this.ambientSources=[];this.active=false;
    }
    attach(context){
      if(this.context)return this.context;
      this.context=context;this.offline=typeof context.startRendering==='function';
      const a=context;this.master=a.createGain();this.sfx=a.createGain();this.ambient=a.createGain();this.compressor=a.createDynamicsCompressor();
      this.compressor.threshold.value=-18;this.compressor.knee.value=20;this.compressor.ratio.value=6;
      this.compressor.attack.value=.004;this.compressor.release.value=.16;
      this.sfx.connect(this.master);this.ambient.connect(this.master);this.master.connect(this.compressor);this.compressor.connect(a.destination);
      this.ambient.gain.value=0;this.master.gain.value=this.enabled&&this.foreground?this.volume*.7:0;
      this.noise=a.createBuffer(1,a.sampleRate,a.sampleRate);
      let seed=91723;const values=this.noise.getChannelData(0);
      for(let i=0;i<values.length;i++){seed=(seed*1664525+1013904223)>>>0;values[i]=seed/2147483648-1;}
      if(!this.offline){
        const wind=a.createBufferSource(),filter=a.createBiquadFilter();wind.buffer=this.noise;wind.loop=true;filter.type='bandpass';filter.frequency.value=350;filter.Q.value=.45;
        wind.connect(filter);filter.connect(this.ambient);wind.start();this.ambientSources.push(wind,filter);
        for(const frequency of [82.41,123.47]){
          const tone=a.createOscillator(),gain=a.createGain();tone.type='sine';tone.frequency.value=frequency;gain.gain.value=.07;
          tone.connect(gain);gain.connect(this.ambient);tone.start();this.ambientSources.push(tone,gain);
        }
      }
      this.mix();return a;
    }
    activate(cue=null){
      try{
        const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio&&!this.context)return false;
        const a=this.context||this.attach(new Audio());
        if(a.state==='suspended'&&!this.offline)a.resume().then(()=>{this.mix();if(cue)this.play(cue);}).catch(()=>{});
        else if(cue)this.play(cue);
        this.mix();return true;
      }catch(error){console.warn('Audio unavailable:',error.message);return false;}
    }
    mix(){
      if(!this.context)return;
      const a=this.context,t=a.currentTime;
      this.master.gain.cancelScheduledValues(t);this.master.gain.setTargetAtTime(this.enabled&&this.foreground?this.volume*.7:0,t,.025);
      this.ambient.gain.cancelScheduledValues(t);this.ambient.gain.setTargetAtTime(this.enabled&&this.foreground&&this.active&&this.ambience ? .018 : 0,t,.12);
    }
    setEnabled(value){this.enabled=Boolean(value);if(!value)this.stopVoices();this.mix();}
    setVolume(value){this.volume=N.clamp(Number(value)||0,0,1);this.mix();}
    setAmbience(value){this.ambience=Boolean(value);this.mix();}
    transport(active){if(this.active===active)return;this.active=active;this.mix();}
    setForeground(value){this.foreground=Boolean(value);if(!value)this.stopVoices();this.mix();}
    stopVoices(){for(const v of [...this.voices]){try{v.source.stop();}catch{}v.cleanup();}}
    voice(spec,time,pan,priority){
      const a=this.context;
      if(this.voices.size>=this.maxVoices){
        const candidate=[...this.voices].find(v=>v.priority<priority);
        if(!candidate)return false;try{candidate.source.stop();}catch{}candidate.cleanup();
      }
      const source=spec.noise?a.createBufferSource():a.createOscillator(),gain=a.createGain(),nodes=[source,gain];
      if(spec.noise)source.buffer=this.noise;
      else{source.type=spec.wave||'sine';source.frequency.setValueAtTime(spec.f,time);source.frequency.exponentialRampToValueAtTime(Math.max(20,spec.to??spec.f),time+spec.d);}
      let output=source;
      if(spec.noise){const filter=a.createBiquadFilter();filter.type=spec.filter||'lowpass';filter.frequency.value=spec.cut||900;filter.Q.value=.6;source.connect(filter);nodes.push(filter);output=filter;}
      output.connect(gain);const attack=Math.min(.012,spec.d*.2),amplitude=spec.g??.06;
      gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,amplitude),time+attack);gain.gain.exponentialRampToValueAtTime(.0001,time+spec.d);
      if(a.createStereoPanner){const panner=a.createStereoPanner();panner.pan.value=pan;gain.connect(panner);panner.connect(this.sfx);nodes.push(panner);}else gain.connect(this.sfx);
      let released=false;const v={source,priority,cleanup:()=>{if(released)return;released=true;for(const node of nodes)node.disconnect();this.voices.delete(v);}};
      this.voices.add(v);source.onended=v.cleanup;source.start(time);source.stop(time+spec.d+.02);return true;
    }
    play(kind,x=this.game.player?.x??0){
      const recipe=AudioEngine.SOUNDS[kind],a=this.context;
      if(!recipe||!this.enabled||!this.foreground||!a||(!this.offline&&a.state!=='running'))return false;
      const now=a.currentTime;if(now-(this.last.get(kind)??-Infinity)<recipe.gap)return false;
      this.last.set(kind,now);const pan=N.clamp((x-(this.game.player?.x||0))/420,-.75,.75);
      let count=0;for(const spec of recipe.notes)if(this.voice(spec,now+(spec.at||0),pan,recipe.priority??1))count++;
      return count>0;
    }
    dispose(){this.stopVoices();for(const node of this.ambientSources){try{node.stop?.();}catch{}node.disconnect();}this.ambientSources.length=0;this.master?.disconnect();this.sfx?.disconnect();this.ambient?.disconnect();this.compressor?.disconnect();}
  }
  AudioEngine.SOUNDS=Object.freeze({
    fire:{gap:.085,notes:[{f:760,to:350,d:.12,g:.04},{noise:true,cut:1900,d:.055,g:.022}]},
    lightning:{gap:.13,notes:[{noise:true,filter:'highpass',cut:1500,d:.18,g:.085},{f:210,to:60,wave:'triangle',d:.15,g:.04}]},
    nova:{gap:.2,notes:[{noise:true,filter:'highpass',cut:2700,d:.38,g:.07},{f:940,to:320,d:.38,g:.045},{f:1410,to:640,d:.25,g:.025,at:.035}]},
    orbit:{gap:.12,notes:[{f:520,to:340,d:.1,g:.032}]},
    hit:{gap:.07,notes:[{noise:true,cut:800,d:.065,g:.055},{f:170,to:70,d:.075,g:.045}]},
    crit:{gap:.12,priority:2,notes:[{f:110,to:45,wave:'triangle',d:.19,g:.07},{f:1320,to:660,d:.19,g:.045},{noise:true,cut:2100,d:.09,g:.055}]},
    death:{gap:.1,notes:[{noise:true,cut:600,d:.24,g:.06},{f:150,to:45,d:.22,g:.04}]},
    dash:{gap:.2,priority:2,notes:[{noise:true,filter:'bandpass',cut:1500,d:.2,g:.08},{f:330,to:90,d:.2,g:.04}]},
    step:{gap:.12,priority:0,notes:[{noise:true,cut:450,d:.045,g:.035}]},
    xp:{gap:.07,notes:[{f:1000,to:1390,d:.075,g:.026}]},
    gold:{gap:.09,notes:[{f:1568,d:.11,g:.033},{f:2093,d:.09,g:.024,at:.025}]},
    heal:{gap:.2,priority:2,notes:[{f:440,to:660,d:.22,g:.05},{f:880,d:.24,g:.045,at:.09}]},
    hurt:{gap:.25,priority:3,notes:[{f:140,to:45,wave:'triangle',d:.22,g:.085},{noise:true,cut:450,d:.13,g:.08}]},
    level:{gap:.5,priority:3,notes:[0,1,2,3].map((i)=>({f:[523.25,659.25,783.99,1046.5][i],d:.32,g:.05,at:i*.085}))},
    evolve:{gap:.5,priority:3,notes:[0,1,2,3,4].map(i=>({f:[261.63,392,523.25,659.25,1046.5][i],d:.42,g:.05,at:i*.085}))},
    choose:{gap:.12,priority:2,notes:[{f:659.25,d:.16,g:.04},{f:987.77,d:.22,g:.04,at:.055}]},
    buy:{gap:.12,priority:2,notes:[{f:1397,d:.1,g:.035},{f:1865,d:.15,g:.04,at:.065}]},
    lock:{gap:.08,notes:[{noise:true,cut:1000,d:.035,g:.04},{f:350,to:240,d:.05,g:.03}]},
    reroll:{gap:.15,notes:[{noise:true,filter:'bandpass',cut:1300,d:.15,g:.05},{f:410,to:620,d:.12,g:.03,at:.045}]},
    ui:{gap:.07,notes:[{f:540,to:420,d:.055,g:.025}]},
    wave:{gap:.5,priority:2,notes:[{f:130.81,d:.65,g:.055},{f:261.63,d:.45,g:.035,at:.12}]},
    warning:{gap:1,priority:3,notes:[{f:220,to:185,d:.18,g:.06},{f:277.18,to:220,d:.24,g:.04,at:.15}]},
    boss:{gap:1,priority:3,notes:[{f:65.41,to:49,d:1,g:.09},{f:98,to:73.5,d:.9,g:.045,at:.1},{noise:true,cut:250,d:.75,g:.055}]},
    victory:{gap:1,priority:3,notes:[{f:130.81,d:.9,g:.06},{f:261.63,d:.7,g:.05,at:.1},{f:392,d:.65,g:.04,at:.22}]},
    gameover:{gap:1,priority:3,notes:[0,1,2].map(i=>({f:[261.63,196,130.81][i],d:.5,g:.05,at:i*.19}))}
  });
  N.AudioEngine=AudioEngine;
})();
