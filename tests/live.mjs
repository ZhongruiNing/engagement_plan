// Run only after schema.sql is installed. Creates uniquely marked temporary rows
// and removes only those exact IDs in finally. Never changes existing guests.
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
const url = 'https://xisfixidmdndheoefrlw.supabase.co';
const key = 'sb_publishable_HBUQ13R-CjLnl-alEKr20g_B8MW2lzj';
const options = {auth:{persistSession:false,autoRefreshToken:false}};
const a = createClient(url,key,options), b = createClient(url,key,options);
const ids = [crypto.randomUUID(),crypto.randomUUID()];
const events = [];
const channel = b.channel(`acceptance-${ids[0]}`).on('postgres_changes',{event:'*',schema:'public',table:'guests'},e=>events.push(e));
const wait = async predicate => { const start=Date.now(); while(!predicate()){if(Date.now()-start>15000)throw Error('Realtime timeout');await new Promise(r=>setTimeout(r,100));} };
try {
  const initial = await a.from('guests').select('id').limit(1); if(initial.error)throw initial.error;
  await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Subscription timeout')),15000);channel.subscribe(s=>{if(s==='SUBSCRIBED'){clearTimeout(t);resolve();}});});
  const writes = await Promise.all(ids.map((id,i)=>(i?a:b).from('guests').insert({id,name:`验收临时记录-${id.slice(0,8)}`,side:i?'bride':'groom'})));
  writes.forEach(r=>{if(r.error)throw r.error;});
  await wait(()=>ids.every(id=>events.some(e=>e.eventType==='INSERT'&&e.new.id===id)));
  const read=await b.from('guests').select('id').in('id',ids);if(read.error)throw read.error;assert.equal(read.data.length,2);
  const empty=await a.from('guests').insert({id:crypto.randomUUID(),name:' ',side:'groom'});assert(empty.error,'DB must reject blank name');
  for(const id of ids){const del=await a.from('guests').delete().eq('id',id);if(del.error)throw del.error;}
  await wait(()=>ids.every(id=>events.some(e=>e.eventType==='DELETE'&&e.old.id===id)));
  const final=await b.from('guests').select('id').in('id',ids);assert.equal(final.data.length,0);
  console.log('PASS: anonymous read, simultaneous inserts, database validation, realtime INSERT/DELETE, shared deletion');
} finally {
  for(const id of ids) await a.from('guests').delete().eq('id',id);
  await b.removeChannel(channel);
}
