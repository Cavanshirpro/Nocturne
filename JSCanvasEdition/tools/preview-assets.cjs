/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
const path=require('path'),{spawnSync}=require('child_process');
module.exports=()=>{
  const result=spawnSync('python',[path.join(__dirname,'convert_previews.py')],{encoding:'utf8'});
  if(result.status!==0)throw Error(result.stderr||'Preview WebP conversion failed.');
  console.log('Static previews converted to verified lossless WebP.');
};
