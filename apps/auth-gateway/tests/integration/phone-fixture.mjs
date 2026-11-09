import { createWatchaFixture } from './watcha-fixture.mjs';
import { renderPhoneCaptcha } from '../../src/phone-auth.js';
const outbox={sms:[],captcha:[]};
const fixture=await createWatchaFixture({uri:process.env.PHONE_TEST_MONGO_URI,webOrigin:process.env.PHONE_FIXTURE_WEB_ORIGIN,
 sms:{enabled:true,deliveryEnabled:false,dailyMax:1000,monthlyMax:30000},phoneFixtureOutbox:outbox,
 smsTransport:{async send(message){outbox.sms.push(message);return {accepted:true};}},
 phoneCaptchaRenderer:async answer=>{outbox.captcha.push(answer);return renderPhoneCaptcha(answer);},
});
console.log(JSON.stringify({gatewayOrigin:fixture.origin,fixtureOnly:true}));
const close=async()=>{await fixture.close();process.exit(0);};process.once('SIGINT',close);process.once('SIGTERM',close);
