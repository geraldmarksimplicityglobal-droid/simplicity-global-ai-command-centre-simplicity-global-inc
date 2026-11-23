import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const manifests=require("../../config/module-manifests.json");
const modes=new Set(["mock","read-only-mock","design"]);
export function validateModuleManifests(input=manifests){
 if(!input||!Array.isArray(input.modules))throw new TypeError("module manifest list is required");
 const ids=new Set();
 for(const item of input.modules){
  if(!item||typeof item.id!=="string"||!item.id.startsWith("SG-DOM-"))throw new TypeError("invalid domain module id");
  if(ids.has(item.id))throw new Error("duplicate domain module id: "+item.id);
  ids.add(item.id);
  if(typeof item.name!=="string"||!item.name.trim())throw new TypeError("module name is required");
  if(!modes.has(item.defaultMode))throw new Error("unsupported default mode: "+item.defaultMode);
  if(item.liveEnabled!==false)throw new Error("live registrar modules must remain disabled");
  if(!Array.isArray(item.writeCapabilities)||item.writeCapabilities.length!==0)throw new Error("live write capabilities are not permitted");
  if(item.evidenceRequired!==true)throw new Error("module evidence requirement cannot be disabled");
 }
 return Object.freeze({count:ids.size,ids:Object.freeze([...ids]),liveMutationEnabled:false});
}
export function listModuleManifests(){return manifests.modules.map(item=>structuredClone(item));}
export function getModuleManifest(id){const item=manifests.modules.find(module=>module.id===id);return item?structuredClone(item):null;}
