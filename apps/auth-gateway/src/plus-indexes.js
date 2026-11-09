export const PLUS_INDEXES=[
  ['plusCycles',{userId:1,namespace:1,startsAt:1},{unique:true,name:'plus_cycle_identity'}],
  ['plusOperations',{userId:1,namespace:1,status:1,createdAt:1},{name:'plus_pending_operations'}],
  ['plusLedger',{userId:1,namespace:1,at:-1},{name:'plus_account_history'}],
  ['plusLedger',{userId:1,namespace:1,at:-1,_id:-1},{name:'plus_account_history_cursor'}],
  ['plusOperations',{namespace:1,status:1,nextReconcileAt:1,createdAt:1},{name:'plus_reconcile_operations'}],
  ['plusAccounts',{namespace:1,checkoutPending:1,nextReconcileAt:1,checkoutIssuedAt:1},{name:'plus_reconcile_checkouts'}],
  ['plusRequestLimits',{expiresAt:1},{expireAfterSeconds:0,name:'plus_request_window_expiry'}],
];
export async function ensurePlusIndexes(db){for(const [name,keys,options]of PLUS_INDEXES)await db.collection(name).createIndex(keys,options);}
