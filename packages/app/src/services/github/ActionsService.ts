import { requestGitHub } from './GitHubService';
import { repoApiPath } from './RepositoryService';
export interface WorkflowRun {id:number;name:string;display_title:string;run_number:number;run_attempt:number;head_branch:string;head_sha:string;event:string;status:string;conclusion:string|null;created_at:string;html_url:string;}
export interface WorkflowJob {id:number;name:string;status:string;conclusion:string|null;html_url:string;steps:{number:number;name:string;status:string;conclusion:string|null}[];}
export interface Artifact {id:number;name:string;size_in_bytes:number;expired:boolean;expires_at:string;}
function runPath(owner:string,name:string,id:number) {if(!Number.isSafeInteger(id)||id<=0)throw new Error('编号无效');return `${repoApiPath(owner,name)}/actions/runs/${id}`;}
export const actions = {
  async runs(owner:string,name:string,page:number,status:string,branch:string,token:string|null,signal:AbortSignal) {
    const params=new URLSearchParams({per_page:'20',page:String(page)});if(status)params.set('status',status);if(branch)params.set('branch',branch);
    const result=await requestGitHub<{total_count:number;workflow_runs:WorkflowRun[]}>(`${repoApiPath(owner,name)}/actions/runs?${params}`,token,signal);
    return {data:result.data.workflow_runs,hasNext:result.hasNext};
  },
  async get(owner:string,name:string,id:number,token:string|null,signal:AbortSignal) {return (await requestGitHub<WorkflowRun>(runPath(owner,name,id),token,signal)).data;},
  async jobs(owner:string,name:string,id:number,page:number,token:string|null,signal:AbortSignal) {
    const result=await requestGitHub<{jobs:WorkflowJob[]}>(`${runPath(owner,name,id)}/jobs?filter=latest&per_page=20&page=${page}`,token,signal);return {data:result.data.jobs,hasNext:result.hasNext};
  },
  async artifacts(owner:string,name:string,id:number,page:number,token:string|null,signal:AbortSignal) {
    const result=await requestGitHub<{artifacts:Artifact[]}>(`${runPath(owner,name,id)}/artifacts?per_page=20&page=${page}`,token,signal);return {data:result.data.artifacts,hasNext:result.hasNext};
  },
  async control(owner:string,name:string,id:number,operation:'rerun'|'rerun-failed-jobs'|'cancel',token:string|null) {
    if(!token)throw new Error('请先登录');
    await requestGitHub<void>(`${runPath(owner,name,id)}/${operation}`,token,new AbortController().signal,{method:'POST'});
  },
};
