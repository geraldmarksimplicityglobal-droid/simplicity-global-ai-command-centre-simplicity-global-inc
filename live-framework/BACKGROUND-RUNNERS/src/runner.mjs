import {validateRunnerJob} from "./policy.mjs";
import {evaluateGlobalMark} from "./global-mark.mjs";
const summary=v=>typeof v==="string"?v.slice(0,1000):"No summary supplied";
export async function executeRunnerJob({job:rawJob,handlers,approval=null,now=Date.now()}){
 const job=validateRunnerJob(rawJob);
 if(!handlers||typeof handlers!=="object")throw new TypeError("stage handlers are required");
 const evidence=[],attempts=[];
 for(const stage of job.stages){
  const handler=handlers[stage];
  if(typeof handler!=="function"){evidence.push({stage,status:"failed",summary:"No trusted handler registered",evidenceId:null});continue;}
  let result=null,attempt=0;
  while(attempt<job.maxAttempts){
   attempt++;
   try{const r=await handler(Object.freeze({job,stage,attempt}));result=r&&r.status==="passed"?{status:"passed",summary:summary(r.summary),evidenceId:r.evidenceId??null}:{status:"failed",summary:summary(r?.summary??"Stage did not pass"),evidenceId:r?.evidenceId??null};}
   catch(error){result={status:"failed",summary:summary(error?.message??"Stage failed"),evidenceId:null};}
   if(result.status==="passed")break;
  }
  attempts.push(Object.freeze({stage,attempts:attempt,finalStatus:result.status}));evidence.push({stage,...result});
 }
 const globalMark=evaluateGlobalMark({job,stageEvidence:evidence,approval,now});
 return Object.freeze({jobId:job.id,target:job.target,status:globalMark.reached?"completed":"incomplete",attempts:Object.freeze(attempts),evidence:Object.freeze(evidence.map(x=>Object.freeze(x))),globalMark});
}
