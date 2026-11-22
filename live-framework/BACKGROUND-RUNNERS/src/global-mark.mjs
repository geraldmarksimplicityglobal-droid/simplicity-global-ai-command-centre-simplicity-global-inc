import {REQUIRED_STAGES} from "./policy.mjs";
function validApproval(a,j,now){return Boolean(a&&a.status==="approved"&&typeof a.approver==="string"&&a.approver.trim()&&a.approver!==j.requester&&a.jobId===j.id&&a.target===j.target&&Number.isFinite(a.expiresAt)&&a.expiresAt>now);}
export function evaluateGlobalMark({job,stageEvidence,approval,now=Date.now()}){
 if(!job||!Array.isArray(stageEvidence))throw new TypeError("job and stageEvidence are required");
 const gates=REQUIRED_STAGES.map(name=>{const e=stageEvidence.find(x=>x.stage===name);return {name,status:e?.status==="passed"&&typeof e.summary==="string"&&e.summary.trim()?"passed":"failed",evidenceId:e?.evidenceId??null};});
 gates.push({name:"humanApproval",status:validApproval(approval,job,now)?"passed":"failed",evidenceId:approval?.approvalId??null});
 const passed=gates.filter(g=>g.status==="passed").length;
 return Object.freeze({score:Math.round(passed/gates.length*100),passedGates:passed,totalGates:gates.length,reached:passed===gates.length,status:passed===gates.length?"GLOBAL_MARK_REACHED":"GLOBAL_MARK_NOT_REACHED",gates:Object.freeze(gates.map(g=>Object.freeze(g)))});
}
