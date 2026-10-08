// Read-only gameplay audit: reuse the regression harness, then replay real input routes.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const harness={exports:{}};
const boot=fs.readFileSync(path.join(__dirname,'run.cjs'),'utf8').split('const results =')[0];
vm.runInNewContext(boot+'\nmodule.exports=scope;', {require,__dirname,module:harness,console,performance});
if(vm.runInContext('testResults.some(result=>!result.passed)',harness.exports))throw new Error('Regression checks failed before audit');
vm.runInContext(fs.readFileSync(path.join(__dirname,'combo-audit.js'),'utf8'),harness.exports);
