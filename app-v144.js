
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const KEY="englishFocusV14.progress", ONBOARD="englishFocusV14.onboarded", DAY=86400000;
const FIX={"obsolote":"obsolete","zeri in on":"zero in on","needles to say":"needless to say","self-explanoraty":"self-explanatory","emhasize":"emphasize","adress":"address"};
function clean(s){return String(s||"").replace(/\s+/g," ").trim()}
function value(s){s=clean(s);return s==="—"?"":s}
function termFix(s){var b=clean(s).replace(/\s*\([^)]*\)\s*/g," ").replace(/\s+/g," ").trim();return FIX[b.toLowerCase()]||b}
var M=new Map();
(window.RAW_ROWS||[]).forEach(function(r,i){
  var t=termFix(r[0]); if(!t)return;
  var k=t.toLowerCase();
  var e=M.get(k)||{id:"v"+i,term:t,meaning:"",definition:"",example:"",context:"",corrected:"",category:"",difficulty:""};
  if(!e.meaning)e.meaning=value(r[1]);
  if(!e.definition)e.definition=value(r[2]);
  if(!e.example)e.example=value(r[3]);
  if(!e.context)e.context=value(r[4]);
  if(!e.corrected)e.corrected=value(r[5]);
  if(!e.category)e.category=value(r[6]);
  if(!e.difficulty)e.difficulty=value(r[8]);
  M.set(k,e);
});
var VOCAB=Array.from(M.values()), state={progress:{},days:{},total:0}, session={items:[],index:0,type:"daily"},filter="all";
try{state=Object.assign(state,JSON.parse(localStorage.getItem(KEY)||"{}"))}catch(e){}
function save(){localStorage.setItem(KEY,JSON.stringify(state));home()}
function P(id){return state.progress[id]||{seen:0,again:0,hard:0,good:0,easy:0,interval:0,due:0}}
function day(d){return (d||new Date()).toISOString().slice(0,10)}
function streak(){var n=0,d=new Date();if(!(state.days[day(d)]>0))d=new Date(Date.now()-DAY);while(state.days[day(d)]>0){n++;d=new Date(d.getTime()-DAY)}return n}
function home(){$("#deckCount").textContent=VOCAB.length;$("#streak").textContent=streak();$("#today").textContent=state.days[day()]||0;$("#due").textContent=VOCAB.filter(v=>P(v.id).seen&&P(v.id).due<=Date.now()).length;$("#masteredHome").textContent=VOCAB.filter(v=>P(v.id).seen>=3&&P(v.id).interval>=7).length}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),x=a[i];a[i]=a[j];a[j]=x}return a}
function eligible(v,t){if(t==="fill")return !!gap(v);if(t==="recall")return !!(v.meaning||v.definition||v.context);if(t==="use")return !!exampleFor(v);return true}
function queue(n,t){var pool=VOCAB.filter(v=>eligible(v,t)),due=pool.filter(v=>P(v.id).seen&&P(v.id).due<=Date.now()),un=pool.filter(v=>!P(v.id).seen),seen=pool.filter(v=>P(v.id).seen),m=new Map();shuffle(due).concat(shuffle(un),shuffle(seen)).forEach(v=>m.set(v.id,v));return Array.from(m.values()).slice(0,n)}
function showScreen(n){$$(".screen").forEach(x=>x.classList.remove("active"));$("#"+n).classList.add("active");$$(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.screen===n));if(n==="library")library();if(n==="stats")stats();window.scrollTo(0,0)}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function sourceSentence(v){var c=[v.example,v.corrected,v.context].filter(Boolean);for(var i=0;i<c.length;i++){if(c[i].toLowerCase().indexOf(v.term.toLowerCase())>=0)return c[i]}return""}
function gap(v){var sentence=sourceSentence(v);if(!sentence)return"";var pos=sentence.toLowerCase().indexOf(v.term.toLowerCase());return sentence.slice(0,pos)+"________"+sentence.slice(pos+v.term.length)}
function exampleFor(v){return v.example||v.corrected||v.context||""}
function distract(v){var wc=v.term.split(/\s+/).length,L=v.term.length;return shuffle(VOCAB.filter(x=>x.id!==v.id&&Math.abs(x.term.split(/\s+/).length-wc)<=1&&Math.abs(x.term.length-L)<18)).slice(0,2).map(x=>x.term)}
function choices(v){return shuffle([v.term].concat(distract(v))).slice(0,3)}
function startSession(t){t=t||"daily";var n=t==="slack"?3:t==="quick"?1:t==="weekly"?20:10;session={items:queue(n,t),index:0,type:t};showScreen("practice");render()}
function render(){
 var w=$("#practiceWrap");if(session.index>=session.items.length){w.innerHTML='<div class="panel done"><div class="big">✓</div><h2>Session complete.</h2><p>Nice. You redirected the reflex.</p><button class="btn primary" onclick="showScreen(\'home\')">Back home</button></div>';return}
 var v=session.items[session.index],t=session.type==="fill"?"fill":session.type==="recall"?"recall":session.type==="use"?"use":(gap(v)?"fill":(v.meaning||v.definition||v.context)?"recall":"use"), opts=(t==="fill"||t==="recall")?choices(v):[];session.current={v:v,t:t,opts:opts};
 var prompt=t==="fill"?"Choose the word or phrase that completes the sentence:":(t==="recall"?(v.meaning||v.definition?"Which word or phrase best matches this meaning?":"Which word or phrase best matches this context?"):"Write one natural sentence from your own life using:");
 var cue=t==="recall"?(v.meaning||v.definition||v.context):"";
 var optsHtml=opts.map(function(o,i){return '<button class="choice" data-i="'+i+'" onclick="choose('+i+')"><span class="choice-letter">'+String.fromCharCode(65+i)+'</span><span>'+esc(o)+'</span></button>'}).join("");
 w.innerHTML='<div class="practice-head"><button class="iconbtn" onclick="showScreen(\'home\')">←</button><div><b>'+(session.index+1)+' / '+session.items.length+'</b><div class="progress"><i style="width:'+Math.round(session.index/session.items.length*100)+'%"></i></div></div><button class="iconbtn" onclick="skip()">Skip</button></div>'+
 '<div class="card"><div><div class="challenge-type">'+(t==="fill"?"FILL THE GAP":t==="recall"?"RECALL":"USE IT")+'</div><div class="prompt">'+esc(prompt)+'</div>'+
 (t==="fill"?'<div class="cue-label">Sentence</div><div class="semantic-cue">'+esc(gap(v))+'</div>':'')+(cue?'<div class="cue-label">'+((v.meaning||v.definition)?"Meaning":"Context")+'</div><div class="semantic-cue">'+esc(cue)+'</div>':'')+
 (t==="use"?'<div class="target-term">'+esc(v.term)+'</div><textarea class="textarea" placeholder="Type your sentence here…"></textarea>':'')+
 (opts.length?'<div class="choice-list">'+optsHtml+'</div><div id="choiceResult"></div>':'')+'</div><div>'+
 (opts.length?'':'<button id="revealBtn" class="btn primary full" onclick="reveal()">Show example</button>')+
 '<div id="answer" class="answer"><div class="answer-box"><h3>'+(t==="use"?"Example":"Answer")+'</h3><p>'+esc(t==="use"?exampleFor(v):v.term)+'</p><div class="clue"><strong>Türkçe anlam:</strong> '+esc(v.meaning||"Bu kelime için Türkçe anlam henüz eklenmemiş.")+'</div>'+(v.definition?'<div class="clue"><strong>Definition:</strong> '+esc(v.definition)+'</div>':'')+(t!=="use"&&v.example?'<div class="clue"><strong>Example:</strong> '+esc(v.example)+'</div>':'')+'</div>'+
 '<div class="rating"><button onclick="rate(\'again\')" class="rate again">Again</button><button onclick="rate(\'hard\')" class="rate">Hard</button><button onclick="rate(\'good\')" class="rate">Good</button><button onclick="rate(\'easy\')" class="rate easy">Easy</button></div></div></div></div>';
}
function choose(i){var v=session.current.v,opts=session.current.opts;$$(".choice").forEach(function(b,j){if(opts[j].toLowerCase()===v.term.toLowerCase())b.classList.add("correct");if(j===i&&opts[j].toLowerCase()!==v.term.toLowerCase())b.classList.add("wrong");b.disabled=true});$("#choiceResult").textContent=opts[i].toLowerCase()===v.term.toLowerCase()?"✓ Exactly.":"Not quite — the correct answer is highlighted.";$("#answer").classList.add("show")}
function reveal(){$("#answer").classList.add("show");if($("#revealBtn"))$("#revealBtn").remove()}
function skip(){session.index++;render()}
function rate(r){var v=session.current.v,x=P(v.id),now=Date.now();x.seen++;x[r]++;if(r==="again"){x.interval=0;x.due=now+600000}else if(r==="hard"){x.interval=Math.max(1,Math.round((x.interval||1)*1.2));x.due=now+x.interval*DAY}else if(r==="good"){x.interval=Math.max(2,Math.round((x.interval||1)*2.1));x.due=now+x.interval*DAY}else{x.interval=Math.max(4,Math.round((x.interval||1)*3.2));x.due=now+x.interval*DAY}state.progress[v.id]=x;state.total++;state.days[day()]=(state.days[day()]||0)+1;save();session.index++;render()}
function library(){var q=clean($("#search").value).toLowerCase(),list=VOCAB.filter(function(v){if(filter==="new"&&P(v.id).seen)return false;if(filter==="word"&&v.term.indexOf(" ")>=0)return false;if(filter==="phrase"&&v.term.indexOf(" ")<0)return false;if(filter==="weak"&&!(P(v.id).again>P(v.id).good))return false;return !q||(v.term+" "+v.meaning+" "+v.definition+" "+v.example+" "+v.context).toLowerCase().indexOf(q)>=0}).slice(0,150);$("#libCount").textContent=list.length+" shown";$("#libraryList").innerHTML=list.map(v=>'<div class="lib-item"><b>'+esc(v.term)+'</b><p>'+esc(v.meaning||v.context||"No clue yet")+'</p></div>').join("")}
function setFilter(f,b){filter=f;$$(".chip").forEach(x=>x.classList.remove("active"));b.classList.add("active");library()}
function stats(){$("#totalReviews").textContent=state.total||0;$("#seen").textContent=VOCAB.filter(v=>P(v.id).seen).length;$("#mastered").textContent=VOCAB.filter(v=>P(v.id).seen>=3&&P(v.id).interval>=7).length;$("#statsStreak").textContent=streak();var ds=[];for(var i=6;i>=0;i--){var d=new Date(Date.now()-i*DAY);ds.push({d:d,c:state.days[day(d)]||0})}var mx=Math.max.apply(null,[1].concat(ds.map(x=>x.c)));$("#weekBars").innerHTML=ds.map(x=>'<div class="bar-row"><div class="label"><span>'+x.d.toLocaleDateString(undefined,{weekday:"short"})+'</span><b>'+x.c+'</b></div><div class="bar"><i style="width:'+(x.c/mx*100)+'%"></i></div></div>').join("");var weak=VOCAB.filter(v=>P(v.id).again).sort((a,b)=>P(b.id).again-P(a.id).again).slice(0,8);$("#weakList").innerHTML=weak.map(v=>'<div class="weak"><b>'+esc(v.term)+'</b><small>'+P(v.id).again+' again</small></div>').join("")||'<div class="empty">Rate a few cards first.</div>'}
function openSettings(){$("#settings").classList.add("show")} function closeSettings(){$("#settings").classList.remove("show")}
function exportProgress(){var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));a.download="english-focus-progress.json";a.click()}
function resetProgress(){if(confirm("Reset all progress?")){state={progress:{},days:{},total:0};save();closeSettings()}}
function closeOnboard(){localStorage.setItem(ONBOARD,"1");$("#onboard").classList.remove("show")}
window.addEventListener("DOMContentLoaded",function(){home();$$(".nav button").forEach(b=>b.onclick=function(){b.dataset.screen==="practice"?startSession("daily"):showScreen(b.dataset.screen)});$("#search").addEventListener("input",library);if(!localStorage.getItem(ONBOARD))$("#onboard").classList.add("show")});
