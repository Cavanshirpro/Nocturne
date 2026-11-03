/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import path from 'node:path';import fs from 'node:fs';
const folder=path.dirname(fileURLToPath(import.meta.url));
for(const args of [[path.join(folder,'tests.mjs')],['--test',...fs.readdirSync(folder).filter(name=>name.endsWith('.test.mjs')).map(name=>path.join(folder,name))]]){
  const result=spawnSync(process.execPath,args,{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);
}
