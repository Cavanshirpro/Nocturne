/* Versioned save slots. Settings are shared; chronicles and runs belong to a slot. */
(() => {
  'use strict';
  const N=window.Nocturne;
  class SaveStore {
    static MAX_SLOTS=24;
    constructor(){
      const qa=window.location?.hash==='#verification';
      this.key=qa?'nocturne.coven.qa.v3':'nocturne.coven.v3';
      this.legacyKey=qa?'nocturne.coven.qa.v2':'nocturne.coven.v2';
      this.available=true;this.migrated=false;this.data=this.read();
      // Compatibility accessors keep gameplay independent of the slot container.
      Object.defineProperties(this.data,{
        profile:{get:()=>this.active.profile},
        checkpoint:{get:()=>this.active.checkpoint,set:value=>{this.active.checkpoint=value;this.active.updatedAt=Date.now();}}
      });
      if(this.migrated)this.write(); // Never delete the original v2 key, even after success.
    }
    profile(){return {runs:0,bestWave:0,bestKills:0,bestTime:0,bosses:0,achievements:[]};}
    slot(id){const now=Date.now();return {id,name:`Save ${id}`,createdAt:now,updatedAt:now,profile:this.profile(),checkpoint:null};}
    defaults(){return {schema:3,activeSlotId:1,nextSlotId:2,settings:{sound:true,volume:.6,ambience:true,reduced:null,quality:'high',zoom:1},slots:[this.slot(1)]};}
    get active(){return this.data.slots.find(s=>s.id===this.data.activeSlotId)||this.data.slots[0];}
    cleanProfile(p){
      const result=this.profile();
      if(p)for(const k of ['runs','bestWave','bestKills','bestTime','bosses'])if(Number.isFinite(p[k])&&p[k]>=0)result[k]=Math.min(1e9,p[k]);
      result.achievements=Array.isArray(p?.achievements)?[...new Set(p.achievements.filter(id=>typeof id==='string'&&id.length<80))].slice(0,32):[];
      return result;
    }
    cleanSettings(s={}){return {sound:s.sound!==false,volume:Number.isFinite(s.volume)?N.clamp(s.volume,0,1):.6,ambience:s.ambience!==false,reduced:typeof s.reduced==='boolean'?s.reduced:null,quality:s.quality==='low'?'low':'high',zoom:Number.isFinite(s.zoom)?N.clamp(s.zoom,.65,1.55):1};}
    read(){
      const fresh=this.defaults();
      try{
        const raw=window.localStorage.getItem(this.key),legacy=raw?null:window.localStorage.getItem(this.legacyKey);
        if(!raw&&!legacy)return fresh;
        const d=JSON.parse(raw||legacy);
        if(d?.schema===2){
          fresh.slots[0].profile=this.cleanProfile(d.profile);
          if(this.validCheckpoint(d.checkpoint))fresh.slots[0].checkpoint=d.checkpoint;
          fresh.settings=this.cleanSettings(d.settings);this.migrated=true;return fresh;
        }
        if(d?.schema!==3||!Array.isArray(d.slots)||!d.slots.length)throw new Error('Unrecognized save container');
        const ids=new Set();fresh.slots=[];
        for(const candidate of d.slots.slice(0,SaveStore.MAX_SLOTS)){
          if(!Number.isSafeInteger(candidate?.id)||candidate.id<1||candidate.id>1e9||ids.has(candidate.id))continue;
          ids.add(candidate.id);const slot=this.slot(candidate.id);
          slot.name=typeof candidate.name==='string'?candidate.name.trim().slice(0,32)||slot.name:slot.name;
          slot.profile=this.cleanProfile(candidate.profile);
          for(const k of ['createdAt','updatedAt'])if(Number.isFinite(candidate[k])&&candidate[k]>=0)slot[k]=candidate[k];
          if(this.validCheckpoint(candidate.checkpoint))slot.checkpoint=candidate.checkpoint;
          fresh.slots.push(slot);
        }
        if(!fresh.slots.length)throw new Error('No valid save slots');
        fresh.activeSlotId=ids.has(d.activeSlotId)?d.activeSlotId:fresh.slots[0].id;
        fresh.nextSlotId=Math.max(...fresh.slots.map(s=>s.id))+1;
        if(Number.isSafeInteger(d.nextSlotId)&&d.nextSlotId>fresh.nextSlotId&&d.nextSlotId<1e9)fresh.nextSlotId=d.nextSlotId;
        fresh.settings=this.cleanSettings(d.settings);return fresh;
      }catch{this.available=false;return fresh;}
    }
    createSlot(){
      if(this.data.slots.length>=SaveStore.MAX_SLOTS)return null;
      const slot=this.slot(this.data.nextSlotId++);this.data.slots.push(slot);this.data.activeSlotId=slot.id;this.write();return slot;
    }
    select(id){if(!this.data.slots.some(s=>s.id===id))return false;this.data.activeSlotId=id;this.write();return true;}
    rename(id,name){const s=this.data.slots.find(s=>s.id===id);if(!s||typeof name!=='string'||!name.trim())return false;s.name=name.trim().slice(0,32);s.updatedAt=Date.now();return this.write();}
    remove(id){
      const index=this.data.slots.findIndex(s=>s.id===id);if(index<0||this.data.slots.length===1)return false;
      this.data.slots.splice(index,1);if(this.data.activeSlotId===id)this.data.activeSlotId=this.data.slots[0].id;return this.write();
    }
    exportData(){return JSON.stringify(this.data,null,2);}
    importData(text){
      if(typeof text!=='string'||text.length>12e6)throw new Error('Backup is too large.');
      const d=JSON.parse(text);const candidates=d?.schema===2?[{name:'Imported ritual',profile:d.profile,checkpoint:d.checkpoint}]:d?.schema===3&&Array.isArray(d.slots)?d.slots:null;
      if(!candidates?.length||candidates.length>SaveStore.MAX_SLOTS||this.data.slots.length+candidates.length>SaveStore.MAX_SLOTS)throw new Error('Backup does not fit the available save slots (24 maximum).');
      // Validate every checkpoint before making any changes. Import always adds slots.
      if(candidates.some(s=>!s||s.checkpoint!==null&&s.checkpoint!==undefined&&!this.validCheckpoint(s.checkpoint)))throw new Error('Backup contains an invalid ritual.');
      const added=candidates.map(c=>{const s=this.slot(this.data.nextSlotId++);s.profile=this.cleanProfile(c.profile);s.checkpoint=c.checkpoint?JSON.parse(JSON.stringify(c.checkpoint)):null;s.name=typeof c.name==='string'?`${s.name} · ${c.name}`.slice(0,32):s.name;return s;});
      this.data.slots.push(...added);this.data.activeSlotId=added[0].id;this.write();return added.length;
    }
    validCheckpoint(c){
      if(!c||c.schema!==2||!['wave','shop'].includes(c.phase)||!['ash','moon','storm'].includes(c.coven))return false;
      if(!Number.isInteger(c.wave)||c.wave<1||c.wave>10000||!Number.isFinite(c.time)||c.time<0)return false;
      const p=c.player;
      if(!p||!N.PLAYER_FIELDS.every(k=>Number.isFinite(p[k])&&Math.abs(p[k])<=1e9))return false;
      if(p.hp<=0||p.maxHp<1||p.hp>p.maxHp||p.speed<1||p.damage<1||p.attackInterval<.12||p.attackInterval>10)return false;
      if(p.armor<0||p.armor>.6||p.critChance<0||p.critChance>.75||p.regen<0||p.dashCooldown<.7||p.projectileSpeed<1||p.critMultiplier<1||p.pickupRadius<1)return false;
      if(!['projectileCount','level','gold','kills','xp','xpNeeded','pendingLevels','pierce'].every(k=>Number.isInteger(p[k])&&p[k]>=0))return false;
      if(p.projectileCount<1||p.projectileCount>7||p.level<1||p.xpNeeded<1||p.xp>=p.xpNeeded||p.pendingLevels!==0||p.pierce>2)return false;
      if(!p.weapons||!['bolt','orbit','lightning','nova'].every(k=>Number.isInteger(p.weapons[k])&&p.weapons[k]>=0&&p.weapons[k]<=4)||p.weapons.bolt<1)return false;
      if(!p.relics||!['cinder','conductor','permafrost','mirror'].every(k=>typeof p.relics[k]==='boolean'))return false;
      if(!Array.isArray(p.upgrades)||p.upgrades.length>10000||!p.upgrades.every(k=>typeof k==='string'))return false;
      if(!Array.isArray(c.slots)||c.slots.length!==4||!c.slots.every(s=>s&&typeof s.locked==='boolean'&&(s.id===null||typeof s.id==='string')&&Number.isInteger(s.price)&&s.price>=0&&s.price<1e7))return false;
      if(!Number.isInteger(c.rolls)||c.rolls<0||c.rolls>10000)return false;
      if(!c.stats||!['damage','damageTaken','goldEarned','elites','bosses','dashes'].every(k=>Number.isFinite(c.stats[k])&&c.stats[k]>=0&&c.stats[k]<1e12))return false;
      if(!c.stats.weapons||!['bolt','orbit','lightning','nova'].every(k=>Number.isFinite(c.stats.weapons[k])&&c.stats.weapons[k]>=0))return false;
      if(c.world&&!N.validWorld?.(c.world))return false;
      return true;
    }
    write(){try{window.localStorage.setItem(this.key,JSON.stringify(this.data));this.available=true;return true;}catch{this.available=false;return false;}}
  }
  N.SaveStore=SaveStore;
})();
