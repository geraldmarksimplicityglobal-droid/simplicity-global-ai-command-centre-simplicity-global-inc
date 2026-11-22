export const REQUIRED_STAGES=Object.freeze(["build","tests","security","integration","quality","evidence"]);
export const MAX_STAGE_ATTEMPTS=3;
const forbidden=["command","executable","args","shell","environment","env"];
export function validateRunnerJob(job){
 if(!job||typeof job!=="object"||Array.isArray(job))throw new TypeError("job is required");
 for(const key of forbidden)if(Object.hasOwn(job,key))throw new Error("runner job cannot contain process field: "+key);
 for(const key of ["id","requester","target","objective"])if(typeof job[key]!=="string"||!job[key].trim())throw new TypeError(key+" is required");
 if(!Array.isArray(job.stages)||job.stages.length!==REQUIRED_STAGES.length)throw new TypeError("job must declare all required GLOBAL MARK stages");
 const set=new Set(job.stages);
 if(set.size!==REQUIRED_STAGES.length||REQUIRED_STAGES.some(s=>!set.has(s)))throw new Error("job stages must exactly match the required stage allowlist");
 const maxAttempts=job.maxAttempts??2;
 if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>MAX_STAGE_ATTEMPTS)throw new RangeError("maxAttempts must be between 1 and 3");
 if(job.operation&&job.operation!=="mock-validation")throw new Error("only mock-validation jobs are permitted by this runner");
 return Object.freeze({id:job.id.trim(),requester:job.requester.trim(),target:job.target.trim(),objective:job.objective.trim(),stages:Object.freeze([...job.stages]),maxAttempts,operation:"mock-validation"});
}
