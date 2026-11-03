/*
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade
This file is part of Nocturne. See the distribution's LICENSE and NOTICE files.
*/
(() => {
  const N=window.Nocturne;
  class SpatialHash {
    constructor(size = 96) { this.size = size; this.cells = new Map(); this.spares = []; }
    clear() {
      for (const bucket of this.cells.values()) { bucket.length = 0; this.spares.push(bucket); }
      this.cells.clear();
    }
    insert(entity) {
      const key = `${Math.floor(entity.x / this.size)},${Math.floor(entity.y / this.size)}`;
      let bucket = this.cells.get(key);
      if (!bucket) { bucket = this.spares.pop() || []; this.cells.set(key, bucket); }
      bucket.push(entity);
    }
    query(minX, minY, maxX, maxY, out) {
      out.length = 0;
      if(((maxX-minX)/this.size+2)*((maxY-minY)/this.size+2)>this.cells.size*4+64){for(const bucket of this.cells.values())for(const e of bucket)if(e.alive&&e.x>=minX&&e.x<=maxX&&e.y>=minY&&e.y<=maxY)out.push(e);return out;}
      for (let x = Math.floor(minX / this.size); x <= Math.floor(maxX / this.size); x++) {
        for (let y = Math.floor(minY / this.size); y <= Math.floor(maxY / this.size); y++) {
          const bucket = this.cells.get(`${x},${y}`);
          if (bucket) for (const e of bucket) if (e.alive) out.push(e);
        }
      }
      return out;
    }
  }
  N.SpatialHash = SpatialHash;

})();
