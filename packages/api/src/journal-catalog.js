// Rule versions and their source records are immutable; history never follows the current alias.
import {JOURNAL_ARCHIVES as V1} from './journal-catalog-v1.js';
import {JOURNALS as V2_JOURNALS,JOURNAL_SOURCES as V2_SOURCES,JOURNAL_VERSION as V2_VERSION} from './journal-catalog-v2.js';
import {JOURNALS as V3_JOURNALS,JOURNAL_SOURCES as V3_SOURCES,JOURNAL_VERSION as V3_VERSION} from './journal-catalog-v3.js';
import {JOURNALS as V4_JOURNALS,JOURNAL_SOURCES as V4_SOURCES,JOURNAL_VERSION as V4_VERSION} from './journal-catalog-v4.js';
import {JOURNALS as V5_JOURNALS,JOURNAL_SOURCES as V5_SOURCES,JOURNAL_VERSION as V5_VERSION} from './journal-catalog-v5.js';
import {JOURNALS as V6_JOURNALS,JOURNAL_SOURCES as V6_SOURCES,JOURNAL_VERSION as V6_VERSION} from './journal-catalog-v6.js';
import {JOURNALS as V7_JOURNALS,JOURNAL_SOURCES as V7_SOURCES,JOURNAL_VERSION as V7_VERSION} from './journal-catalog-v7.js';
import {JOURNALS as V8_JOURNALS,JOURNAL_SOURCES as V8_SOURCES,JOURNAL_VERSION as V8_VERSION} from './journal-catalog-v8.js';
import {JOURNALS as V9_JOURNALS,JOURNAL_SOURCES as V9_SOURCES,JOURNAL_VERSION as V9_VERSION} from './journal-catalog-v9.js';
import {JOURNALS as V10_JOURNALS,JOURNAL_SOURCES as V10_SOURCES,JOURNAL_VERSION as V10_VERSION} from './journal-catalog-v10.js';
import {JOURNALS,JOURNAL_SOURCES,JOURNAL_VERSION,VERIFIED_ON} from './journal-catalog-v11.js';
export {JOURNALS,JOURNAL_SOURCES,JOURNAL_VERSION,VERIFIED_ON};
export const JOURNAL_ARCHIVES={...V1,[V2_VERSION]:{journals:V2_JOURNALS,sources:V2_SOURCES},[V3_VERSION]:{journals:V3_JOURNALS,sources:V3_SOURCES},[V4_VERSION]:{journals:V4_JOURNALS,sources:V4_SOURCES},[V5_VERSION]:{journals:V5_JOURNALS,sources:V5_SOURCES},[V6_VERSION]:{journals:V6_JOURNALS,sources:V6_SOURCES},[V7_VERSION]:{journals:V7_JOURNALS,sources:V7_SOURCES},[V8_VERSION]:{journals:V8_JOURNALS,sources:V8_SOURCES},[V9_VERSION]:{journals:V9_JOURNALS,sources:V9_SOURCES},[V10_VERSION]:{journals:V10_JOURNALS,sources:V10_SOURCES},[JOURNAL_VERSION]:{journals:JOURNALS,sources:JOURNAL_SOURCES}};
