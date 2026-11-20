export interface StarNote { group:string; tags:string[]; note:string; status:'none'|'later'|'read'|'using'; }
export interface AccountWorkspace { stars:Record<string,StarNote>; }
export const emptyWorkspace = ():AccountWorkspace => ({stars:{}});
export function normalizeWorkspace(value:unknown):AccountWorkspace {
  const input=value as Partial<AccountWorkspace>|undefined;
  const stars:Record<string,StarNote>={};
  for(const [repo,item] of Object.entries(input?.stars||{}).slice(0,2000)) {
    if(!/^[\w.-]+\/[\w.-]+$/.test(repo)||!item||typeof item!=='object')continue;
    stars[repo]={group:typeof item.group==='string'?item.group.slice(0,80):'',tags:Array.isArray(item.tags)?[...new Set(item.tags.filter(tag=>typeof tag==='string').map(tag=>tag.slice(0,40)))].slice(0,12):[],note:typeof item.note==='string'?item.note.slice(0,4000):'',status:['none','later','read','using'].includes(item.status)?item.status:'none'};
  }
  return {stars};
}
