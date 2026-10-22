const module=(id,file,result='result.json',extra={})=>({id,file,result,timeoutMs:300000,group:'current',...extra});
export const browserSuites=[
 module('combat-experience','clients/cocos/tools/smoke-combat-experience.mjs',undefined,{timeoutMs:420000}),
 module('expedition-chain','clients/cocos/tools/smoke-expedition-chain.mjs',undefined,{timeoutMs:420000}),
 module('interface-refresh','clients/cocos/tools/smoke-interface-refresh.mjs',undefined,{timeoutMs:420000}),
 module('quest-board','clients/cocos/tools/smoke-quest-board.mjs'),
 module('consistency','clients/cocos/tools/smoke-consistency.mjs'),
 module('pause','clients/cocos/tools/smoke-pause.mjs'),
 module('textures','clients/cocos/tools/smoke-textures.mjs'),
 module('combat-framing','clients/cocos/tools/smoke-combat-framing.mjs'),
 module('boot','clients/cocos/tools/smoke-boot.mjs'),
 module('semantics','clients/cocos/tools/smoke-semantics.mjs','semantic-result.json'),
 module('data','clients/cocos/tools/smoke-data.mjs'),
 module('session','clients/cocos/tools/smoke-session.mjs','session-result.json'),
 module('world','clients/cocos/tools/smoke.mjs','smoke-result.json'),
 module('story','clients/cocos/tools/smoke-phase45.mjs','smoke-result.json'),
 module('chapter-friction','clients/cocos/tools/smoke-chapter-friction.mjs'),
 module('depths','clients/cocos/tools/smoke-depths.mjs','depths-result.json',{timeoutMs:420000}),
 module('landscape','clients/cocos/tools/smoke-landscape.mjs','landscape-result.json'),
 module('life','clients/cocos/tools/smoke-life-records.mjs'),
 module('dossier','clients/cocos/tools/smoke-dossier.mjs'),
 module('guidance','clients/cocos/tools/smoke-guidance.mjs',undefined,{timeoutMs:420000}),
 module('places','clients/cocos/tools/smoke-places.mjs',undefined,{env:{REALQUEST_PLACES_REVIEW:'attached-answers'}}),
 module('travel','clients/cocos/tools/smoke-places-travel.mjs','travel-result.json'),
 module('rest','clients/cocos/tools/smoke-places-rest.mjs','rest-result.json'),
 module('atlas','clients/cocos/tools/smoke-atlas.mjs','atlas-extra-result.json'),
 module('neighbors','clients/cocos/tools/smoke-neighbor-encounter.mjs','neighbor-result.json',{env:{REALQUEST_CONVERSATION_REVIEW:'attached'}}),
 module('dialogue','clients/cocos/tools/smoke-dialogue.mjs','reader-result.json',{env:{REALQUEST_DIALOGUE_REVIEW:'preferences'}}),
 module('inventory','clients/cocos/tools/smoke-inventory.mjs'),
 module('inventory-preview','clients/cocos/tools/smoke-inventory-preview.mjs','preview-result.json'),
 module('preferences','clients/cocos/tools/smoke-preferences.mjs'),
 module('preference-layout','clients/cocos/tools/smoke-preference-layout.mjs','layout-result.json'),
 module('village-art','clients/cocos/tools/smoke-village-art.mjs','result.json'),
 module('cave-art','clients/cocos/tools/smoke-cave-art.mjs',undefined),
];
export function selectSuites(selection='current'){
 if(selection==='all')return browserSuites;
 if(selection==='current')return browserSuites.filter(s=>s.group===selection);
 const names=selection.split(',');
 if(names.some(name=>!browserSuites.some(s=>s.id===name))||new Set(names).size!==names.length)throw Error('Unknown or duplicate suite. Use --list.');
 return names.map(name=>browserSuites.find(s=>s.id===name));
}
