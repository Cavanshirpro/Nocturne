/*
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade
This file is part of Nocturne. See the distribution's LICENSE and NOTICE files.
*/
(() => {
  const N=window.Nocturne;
  class Input {
    constructor(game) {
      this.game=game;this.keys = new Set(); this.x = 0; this.y = 0; this.pointer = null;this.aim={x:0,y:0,active:false};
      const prevent = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','Space']);
      window.addEventListener('keydown', e => {
        if (e.target?.matches?.('input, textarea, select, [contenteditable=true]')) return;
        if (prevent.has(e.code) && game.state === 'playing') e.preventDefault();
        this.keys.add(e.code);
        if (e.code==='Equal'||e.code==='NumpadAdd')game.setZoom(game.userZoom+.1);
        if (e.code==='Minus'||e.code==='NumpadSubtract')game.setZoom(game.userZoom-.1);
        if (e.code==='Digit0'||e.code==='Numpad0')game.setZoom(1);
        if (e.repeat) return;
        if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') game.player?.dash();
        if (e.code === 'Escape' || e.code === 'KeyP') game.ui?.togglePause();
        if(e.code==='KeyQ'){game.abilities?.begin();game.abilities?.release();}
        if(e.code==='KeyZ')game.abilities?.cycle();
        if(e.code==='KeyF')game.abilities?.transform();
        if(e.code==='KeyE')game.abilities?.shield();
        if(e.code==='KeyT'){if(game.state==='ascension')N.AscensionUI.close(game);else N.AscensionUI.open(game);}
        if (e.code === 'KeyI') game.ui?.toggleGrimoire();
        if (/^Digit[123]$/.test(e.code) && game.state === 'levelup') game.ui.chooseLevel(Number(e.code.slice(-1)) - 1);
      });
      const aim=e=>{const r=game.canvas.getBoundingClientRect();this.aim={x:(e.clientX-r.left)*game.width/r.width,y:(e.clientY-r.top)*game.height/r.height,active:true};};
      game.canvas.addEventListener?.('pointermove',aim);
      game.canvas.addEventListener?.('pointerdown',e=>{aim(e);if(e.button===2){e.preventDefault();game.abilities?.begin();}});
      window.addEventListener('pointerup',e=>{if(e.button===2)game.abilities?.release();});
      window.addEventListener('pointercancel',()=>game.abilities?.cancel());
      // The level-up overlay can replace the canvas under a held right button.
      // Capture at document level so the eventual menu event is still blocked.
      document.addEventListener('contextmenu',e=>{
        if(!e.target?.closest?.('input, textarea, select, [contenteditable=true]'))e.preventDefault();
      },true);
      document.getElementById('special-button')?.addEventListener('pointerdown',e=>{e.preventDefault();e.currentTarget.setPointerCapture?.(e.pointerId);game.abilities?.begin();});
      document.getElementById('special-button')?.addEventListener('pointerup',e=>{e.preventDefault();game.abilities?.release();});
      document.getElementById('special-button')?.addEventListener('pointercancel',()=>game.abilities?.cancel());
      document.getElementById('cycle-special')?.addEventListener('click',()=>game.abilities?.cycle());
      document.getElementById('demon-button')?.addEventListener('click',()=>game.abilities?.transform());
      document.getElementById('shield-button')?.addEventListener('click',()=>game.abilities?.shield());
      game.canvas.addEventListener?.('wheel',e=>{if(game.state!=='playing')return;e.preventDefault();game.setZoom(game.userZoom-Math.sign(e.deltaY)*.08);},{passive:false});
      window.addEventListener('keyup', e => this.keys.delete(e.code));
      window.addEventListener('blur', () => { this.clear();game.combat?.audioEngine.setForeground(false); if (game.state === 'playing') game.ui.pause(); });
      window.addEventListener('focus',()=>game.combat?.audioEngine.setForeground(true));
      document.addEventListener('visibilitychange', () => {
        game.combat?.audioEngine.setForeground(!document.hidden);
        if (document.hidden) { this.clear(); if (game.state === 'playing') game.ui.pause(); }
      });
      const zone = document.getElementById('touch-zone');
      const knob = document.getElementById('touch-knob');
      const move = e => {
        if (e.pointerId !== this.pointer) return;
        const r = zone.getBoundingClientRect();
        let x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        const len = Math.hypot(x, y);
        if (len > 35) { x *= 35 / len; y *= 35 / len; }
        this.x = x / 35; this.y = y / 35;
        knob.style.transform = `translate(${x}px,${y}px)`;
      };
      zone.addEventListener('pointerdown', e => {
        if (game.state !== 'playing' || this.pointer !== null) return;
        this.pointer = e.pointerId; zone.setPointerCapture(e.pointerId); move(e);
      });
      zone.addEventListener('pointermove', move);
      const release = e => {
        if (e.pointerId === this.pointer) { this.pointer = null; this.x = this.y = 0; knob.style.transform = ''; }
      };
      zone.addEventListener('pointerup', release);
      zone.addEventListener('pointercancel', release);
      zone.addEventListener('lostpointercapture', release);
      this.knob = knob;
      document.getElementById('dash-button').addEventListener('pointerdown',e=>{e.preventDefault();game.player.dash();});
    }
    clear() { this.game?.abilities?.cancel();this.keys.clear(); this.x = this.y = 0; this.pointer = null; this.knob.style.transform = ''; }
    vector() {
      const k = this.keys;
      let x = Number(k.has('KeyD') || k.has('ArrowRight')) - Number(k.has('KeyA') || k.has('ArrowLeft')) + this.x;
      let y = Number(k.has('KeyS') || k.has('ArrowDown')) - Number(k.has('KeyW') || k.has('ArrowUp')) + this.y;
      const len = Math.hypot(x, y);
      if (len > 1) { x /= len; y /= len; }
      return {x, y};
    }
  }

  N.Input=Input;
})();
