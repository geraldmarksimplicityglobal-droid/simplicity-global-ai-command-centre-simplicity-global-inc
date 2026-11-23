import test from "node:test";
import assert from "node:assert/strict";
import {validateModuleManifests,listModuleManifests,getModuleManifest} from "../src/core/module-manifest.js";
test("all 24 registrar manifests are present and unique",()=>{const r=validateModuleManifests();assert.equal(r.count,24);assert.equal(new Set(r.ids).size,24);assert.equal(r.liveMutationEnabled,false);});
test("all registrar modules fail closed for live writes",()=>{for(const m of listModuleManifests()){assert.equal(m.liveEnabled,false);assert.deepEqual(m.writeCapabilities,[]);assert.equal(m.evidenceRequired,true);}});
test("manifest lookup returns detached data or null",()=>{const m=getModuleManifest("SG-DOM-001");assert.equal(m.name,"Registrar Core");m.name="tampered";assert.equal(getModuleManifest("SG-DOM-001").name,"Registrar Core");assert.equal(getModuleManifest("SG-DOM-999"),null);});
test("write-enabled manifest is rejected",()=>{const a=listModuleManifests();a[0].writeCapabilities=["domain.register"];assert.throws(()=>validateModuleManifests({modules:a}),/write capabilities/);});
