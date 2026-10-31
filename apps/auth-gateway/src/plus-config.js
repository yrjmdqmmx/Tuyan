import {readFileSync} from 'node:fs';
import {validatePlusPricing} from './plus-pricing.js';
import {PLUS_PRODUCT} from '../../../packages/api/src/plus.mjs';
export function loadPlusConfig(env={}) {
  const enabled=env.PLUS_ENABLED==='true';
  const environment=env.PLUS_PAYMENT_ENVIRONMENT||'sandbox';
  const executionMode=env.PLUS_EXECUTION_MODE||'disabled';
  const production=env.NODE_ENV==='production',adminOnly=env.PLUS_ADMIN_ONLY==='true';
  if(!['sandbox','live'].includes(environment))throw Error('PLUS_INVALID_ENVIRONMENT');
  if(enabled&&environment==='live'&&!adminOnly)throw Error('PLUS_ADMIN_ONLY_REQUIRED');
  if(enabled&&production&&environment!=='live')throw Error('PLUS_PRODUCTION_REQUIRES_LIVE');
  if(!['disabled','simulation','managed'].includes(executionMode))throw Error('PLUS_PAID_EXECUTION_NOT_VALIDATED');
  if(enabled&&(production||environment==='live')&&executionMode==='simulation')throw Error('PLUS_SIMULATION_LOCAL_ONLY');
  const modelExecutionEnabled=enabled&&executionMode==='managed'&&env.PLUS_MODEL_EXECUTION_ENABLED==='true';
  const pricing=modelExecutionEnabled?validatePlusPricing(JSON.parse(readFileSync(env.PLUS_PRICING_FILE||'', 'utf8'))):undefined;
  if(pricing&&pricing.creditCostMicros!==PLUS_PRODUCT.creditCostMicros)throw Error('PLUS_CREDIT_CONVERSION_MISMATCH');
  const bailianApiKey=modelExecutionEnabled?String(env.PLUS_BAILIAN_API_KEY||''):'';
  if(modelExecutionEnabled&&!bailianApiKey)throw Error('PLUS_MODEL_NOT_CONFIGURED');
  // Live resources never fall back to sandbox credentials or entitlements.
  const resourcePrefix=environment==='live'?'PLUS_WATCHA_LIVE_':'PLUS_WATCHA_SANDBOX_';
  const apiKey=enabled?String(env[resourcePrefix+'API_KEY']||''):'';
  const entitlementId=enabled?String(env[resourcePrefix+'ENTITLEMENT_ID']||''):'';
  const returnUrl=String(env.PLUS_PAYMENT_RETURN_URL||'');
  if(enabled&&returnUrl){const u=new URL(returnUrl);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.hash||(environment==='live'&&u.protocol!=='https:'))throw Error('PLUS_INVALID_RETURN_URL');}
  const paymentConfigured=Boolean(apiKey&&entitlementId&&returnUrl),newPurchasesEnabled=env.PLUS_NEW_PURCHASES_ENABLED==='true',newTasksEnabled=env.PLUS_NEW_TASKS_ENABLED==='true';
  if(enabled&&environment==='live'&&(newPurchasesEnabled||newTasksEnabled)&&(!paymentConfigured||!modelExecutionEnabled||env.PLUS_LIVE_COMMERCE_READY!=='true'))throw Error('PLUS_LIVE_NOT_READY');
  return {backgroundReconciliationEnabled:env.PLUS_BACKGROUND_RECONCILIATION_ENABLED==='true',enabled,adminOnly,environment,executionMode,modelExecutionEnabled,pricing,bailianApiKey,apiKey,entitlementId,returnUrl,newPurchasesEnabled,newTasksEnabled,
    applicationId:String(env.PLUS_WATCHA_APPLICATION_ID||''),skuId:String(env[resourcePrefix+'SKU_ID']||''),
    maxConcurrent:1,paymentConfigured};
}
