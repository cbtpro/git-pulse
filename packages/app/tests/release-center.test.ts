import {afterEach,expect,it,vi} from 'vitest';
import {assetMatchesOS,releaseFeed,releases,type Release} from '../src/services/github/ReleaseService';
import {releaseVisible} from '../src/components/workspace/ReleasesWorkspace';
afterEach(()=>vi.restoreAllMocks());
it('does not recommend installers for another operating system',()=>{
 expect(assetMatchesOS('GitPulse-aarch64.dmg','macos')).toBe(true);
 expect(assetMatchesOS('GitPulse-aarch64.dmg','windows')).toBe(false);
 expect(assetMatchesOS('GitPulse.apk','android')).toBe(true);
 expect(assetMatchesOS('source.zip','unknown')).toBe(false);
});
it('separates prereleases and never exposes drafts in the feed',()=>{
 const release={draft:false,prerelease:true} as Release;
 expect(releaseVisible(release,'stable')).toBe(false);expect(releaseVisible(release,'preview')).toBe(true);
 expect(releaseVisible({...release,draft:true},'all')).toBe(false);
});
it('keeps accessible releases when another subscription fails, sorted by publication date',async()=>{
 const list=vi.spyOn(releases,'list').mockImplementation(async(owner)=>{
  if(owner==='bad')throw new Error('Access denied');
  return {data:[{id:1,draft:false,published_at:owner==='new'?'2026-11-20':'2026-10-01'} as Release],hasNext:false};
 });
 const result=await releaseFeed(['old/repo','bad/repo','new/repo'],'source-token',new AbortController().signal);
 expect(result.items.map(item=>item.repository)).toEqual(['new/repo','old/repo']);
 expect(result.errors).toEqual([{repository:'bad/repo',message:'Access denied'}]);
 expect(list.mock.calls.every(call=>call[3]==='source-token')).toBe(true);
});
it('propagates cancellation instead of reporting aborted requests as partial success',async()=>{
 const controller=new AbortController();controller.abort();
 await expect(releaseFeed(['a/b'],'t',controller.signal)).rejects.toMatchObject({name:'AbortError'});
});
