import {redactText} from '../src/redaction.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadSmsConfig,createSmsTransport} from '../src/sms.js';
import {normalizePhone,maskPhone,renderPhoneCaptcha} from '../src/phone-auth.js';
test('SMS is disabled without configuration and cannot enable delivery by itself',()=>{
 assert.deepEqual(loadSmsConfig({}),{enabled:false,deliveryEnabled:false,dailyMax:200,monthlyMax:5000});
 assert.equal(createSmsTransport(loadSmsConfig({})),null);
 assert.throws(()=>loadSmsConfig({AUTH_SMS_DELIVERY_ENABLED:'true'}),/AUTH_SMS_ENABLED/);
 assert.throws(()=>loadSmsConfig({AUTH_SMS_ENABLED:'true',AUTH_SMS_DELIVERY_ENABLED:'true'}),/ALIBABA_SMS_ACCESS_KEY_ID/);
 assert.throws(()=>loadSmsConfig({AUTH_SMS_GLOBAL_DAILY_MAX:'0'}),/invalid/);
 assert.throws(()=>loadSmsConfig({AUTH_SMS_GLOBAL_MONTHLY_MAX:'unlimited'}),/invalid/);
});
test('only mainland +86 mobile numbers accepted and normalized',()=>{
 assert.equal(normalizePhone('138 0000 1234'),'+8613800001234');assert.equal(normalizePhone('+86 13800001234'),'+8613800001234');
 assert.equal(maskPhone('+8613800001234'),'+86138****1234');
 for(const value of ['+12025550123','+85251234567','12345678901','13800001234extra',null,{},'8613800001234'])assert.throws(()=>normalizePhone(value));
});
test('Aliyun adapter fixes destination and one bounded attempt without exposing provider details',async()=>{
 const calls=[];let settings;
 const config={enabled:true,deliveryEnabled:true,accessKeyId:'fixture',accessKeySecret:'fixture',signName:'测试',templateCode:'SMS_123',codeVariable:'code'};
 const sender=createSmsTransport(config,value=>{settings=value;return {async sendSmsWithOptions(...args){calls.push(args);return {body:{code:'OK'}};}};});
 assert.deepEqual(await sender.send({phone:'+8613800001234',code:'123456',requestId:'test'}),{accepted:true});
 assert.equal(settings.endpoint,'dysmsapi.aliyuncs.com');assert.equal(settings.protocol,'https');
 assert.equal(calls[0][0].phoneNumbers,'13800001234');assert.deepEqual(JSON.parse(calls[0][0].templateParam),{code:'123456'});
 assert.equal(calls[0][1].autoretry,false);assert.equal(calls[0][1].maxAttempts,1);
 let count=0;const uncertain=createSmsTransport(config,()=>({async sendSmsWithOptions(){count++;throw Error('fixture timeout');}}));
 await assert.rejects(()=>uncertain.send({phone:'+8613800001234',code:'123456'}));assert.equal(count,1);
 const rejected=createSmsTransport(config,()=>({async sendSmsWithOptions(){return {body:{code:'isv.BUSINESS_LIMIT_CONTROL'}};}}));
 await assert.rejects(()=>rejected.send({phone:'+8613800001234',code:'123456'}),/SMS_DELIVERY_UNCONFIRMED/);
 await assert.rejects(()=>sender.send({phone:'+12025550123',code:'123456'}),/SMS_INVALID_MESSAGE/);assert.equal(calls.length,1);
});
test('CAPTCHA response is a raster image, never an SVG containing its answer',async()=>{
 const image=await renderPhoneCaptcha('7B3GX');assert.match(image,/^data:image\/png;base64,iVBOR/);assert.equal(image.includes('7B3GX'),false);
});

test('phone and CAPTCHA credentials are redacted from diagnostic text',()=>{
 const text=redactText(JSON.stringify({phone:'+8613800001234',phoneNumbers:'13800001234',captcha:'7B3GX',code:'123456'}));
 for(const secret of ['13800001234','7B3GX','123456'])assert.equal(text.includes(secret),false);
});
