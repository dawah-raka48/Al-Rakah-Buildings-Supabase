const DB={buildings:"sr_buildings",transactions:"sr_transactions",expenseCategories:"sr_expense_categories"};
let deferredInstallPrompt=null;
const SESSION_KEY="srakah_session_token";
function authToken(){return localStorage.getItem(SESSION_KEY)||sessionStorage.getItem(SESSION_KEY)||""}
function get(k){try{return JSON.parse(localStorage.getItem(k)||"[]")}catch{return[]}}
function save(k,v){localStorage.setItem(k,JSON.stringify(v))}
function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function money(n){return new Intl.NumberFormat("ar-SA",{maximumFractionDigits:2}).format(Number(n)||0)}
function monthKey(d){return String(d||"").slice(0,7)}
function toggleNav(){
  const nav=document.getElementById("nav");
  if(!nav)return;
  nav.classList.toggle("open");
  document.body.classList.toggle("nav-collapsed",!nav.classList.contains("open"));
}
function fillBuildings(sel,all=false){const e=document.querySelector(sel);if(!e)return;const b=get(DB.buildings);e.innerHTML=(all?'<option value="">كل العمارات</option>':'<option value="">اختر العمارة</option>')+b.map(x=>`<option value="${x.id}">${x.name}</option>`).join("")}
const DEFAULT_EXPENSE_CATEGORIES=[
{id:"exp_ac_maint",name:"صيانة مكيف",active:true},{id:"exp_ac_buy",name:"شراء مكيف",active:true},
{id:"exp_bath_maint",name:"صيانة حمام",active:true},{id:"exp_plumbing_buy",name:"شراء أدوات سباكة",active:true},
{id:"exp_electric",name:"كهرباء",active:true},{id:"exp_water",name:"مياه",active:true},
{id:"exp_clean",name:"نظافة",active:true},{id:"exp_guard",name:"حراسة",active:true},{id:"exp_other",name:"مصروف آخر",active:true},
{id:"exp_office_commission",name:"عمولة المكتب",active:true},{id:"exp_general_maintenance",name:"صيانة عامة",active:true},
{id:"exp_rent_contract_renewal",name:"رسوم تجديد عقد الإيجار",active:true},{id:"exp_elevator_maintenance",name:"صيانة المصعد",active:true},
{id:"exp_court_fees",name:"رسوم محكمة",active:true}];
function ensureExpenseCategories(){const current=get(DB.expenseCategories);if(!current.length)save(DB.expenseCategories,DEFAULT_EXPENSE_CATEGORIES);return get(DB.expenseCategories)}
function cats(t){if(t==="income")return ["إيجار","محل","موقف","إيراد آخر"];return ensureExpenseCategories().filter(x=>x.active!==false).map(x=>x.name)}
function expenseCategories(){return ensureExpenseCategories()}
function buildingName(i){return get(DB.buildings).find(b=>b.id===i)?.name||"-"}

let __busyCount=0;
function startBusy(){__busyCount++;document.body?.classList.add("is-busy")}
function stopBusy(){__busyCount=Math.max(0,__busyCount-1);if(__busyCount===0)document.body?.classList.remove("is-busy")}

async function api(action,data={}){
  startBusy();
  try{
    if(!supabaseClient) throw new Error("تعذر تشغيل اتصال Supabase");
    const fail=(error)=>{throw new Error(error?.message||"تعذر تنفيذ العملية")};

    if(action==="addBuilding"){
      const {data:row,error}=await supabaseClient.from("buildings").insert({name:data.name,address:data.address||""}).select().single();
      if(error)fail(error);
      return {success:true,data:row};
    }
    if(action==="deleteBuilding"){
      const {error}=await supabaseClient.from("buildings").delete().eq("id",data.id);
      if(error)fail(error);
      return {success:true};
    }
    if(action==="addMeter"){
      const {data:row,error}=await supabaseClient.from("meters").insert({
        building_id:data.buildingId,name:data.name,number:data.number||"",account:data.account||"",type:data.type
      }).select().single();
      if(error)fail(error);
      return {success:true,data:row};
    }
    if(action==="addTransaction"){
      const {data:row,error}=await supabaseClient.from("transactions").insert({
        building_id:data.buildingId,date:data.date,type:data.type,category:data.category,
        amount:Number(data.amount||0),note:data.note||"",meter_id:data.meterId||null,
        meter_name:data.meterName||"",meter_number:data.meterNumber||"",meter_account:data.meterAccount||""
      }).select().single();
      if(error)fail(error);
      return {success:true,data:row};
    }
    if(action==="deleteTransaction"){
      const {error}=await supabaseClient.from("transactions").delete().eq("id",data.id);
      if(error)fail(error);
      return {success:true};
    }
    if(action==="updateTransaction"){
      const {data:row,error}=await supabaseClient.from("transactions").update({
        building_id:data.buildingId,date:data.date,type:data.type,category:data.category,
        amount:Number(data.amount||0),note:data.note||"",meter_id:data.meterId||null,
        meter_name:data.meterName||"",meter_number:data.meterNumber||"",meter_account:data.meterAccount||""
      }).eq("id",data.id).select().single();
      if(error)fail(error);
      return {success:true,data:row};
    }
    if(action==="saveExpenseCategories"){
      const rows=(data.rows||[]).map(x=>({id:String(x.id),name:String(x.name),active:x.active!==false}));
      const {data:result,error}=await supabaseClient.from("expense_categories").upsert(rows,{onConflict:"id"}).select();
      if(error)fail(error);
      return {success:true,data:result};
    }
    if(action==="deleteExpenseCategory"){
      const {error}=await supabaseClient.from("expense_categories").delete().eq("id",data.id);
      if(error)fail(error);
      return {success:true};
    }
    throw new Error("عملية غير معروفة");
  }finally{stopBusy()}
}

function normalizeSupabaseData(buildings,meters,transactions,categories){
  const bs=(buildings||[]).map(x=>({id:String(x.id),name:String(x.name||""),address:String(x.address||""),meters:[]}));
  (meters||[]).forEach(x=>{
    const b=bs.find(b=>b.id===String(x.building_id));
    if(b)b.meters.push({id:String(x.id),buildingId:b.id,name:String(x.name||""),number:String(x.number||""),account:String(x.account||""),type:String(x.type||"")});
  });
  const ts=(transactions||[]).map(x=>({
    id:String(x.id),buildingId:String(x.building_id||""),date:apiDate(x.date),type:String(x.type||""),
    category:String(x.category||""),amount:Number(x.amount||0),note:String(x.note||""),
    meterId:String(x.meter_id||""),meterName:String(x.meter_name||""),meterNumber:String(x.meter_number||""),
    meterAccount:String(x.meter_account||"")
  }));
  const cs=(categories||[]).map(x=>({id:String(x.id),name:String(x.name||""),active:x.active!==false}));
  return {buildings:bs,transactions:ts,expenseCategories:cs};
}

async function syncFromSupabase(){
  startBusy();
  try{
    if(!supabaseClient) throw new Error("اتصال Supabase غير متاح");
    const [b,m,t,c]=await Promise.all([
      supabaseClient.from("buildings").select("*").order("created_at",{ascending:true}),
      supabaseClient.from("meters").select("*").order("created_at",{ascending:true}),
      supabaseClient.from("transactions").select("*").order("date",{ascending:false}).order("created_at",{ascending:false}),
      supabaseClient.from("expense_categories").select("*").order("name",{ascending:true})
    ]);
    if(b.error)throw b.error;if(m.error)throw m.error;if(t.error)throw t.error;if(c.error)throw c.error;
    // أضف الأصناف الافتراضية الناقصة إلى Supabase دون تكرار الأصناف الموجودة.
    let categories=c.data||[];
    const existingNames=new Set(categories.map(x=>String(x.name||"").trim()));
    const missingCategories=DEFAULT_EXPENSE_CATEGORIES.filter(x=>!existingNames.has(x.name));
    if(missingCategories.length){
      const {data:inserted,error:categoryError}=await supabaseClient.from("expense_categories").upsert(missingCategories,{onConflict:"id"}).select();
      if(categoryError)throw categoryError;
      categories=[...categories,...(inserted||missingCategories)];
    }
    const d=normalizeSupabaseData(b.data,m.data,t.data,categories);
    save(DB.buildings,d.buildings);save(DB.transactions,d.transactions);save(DB.expenseCategories,d.expenseCategories);
    return d;
  }finally{stopBusy()}
}
async function loadData(){
  try{return await syncFromSupabase()}
  catch(e){console.warn(e);return {buildings:get(DB.buildings),transactions:get(DB.transactions),expenseCategories:ensureExpenseCategories(),offline:true}}
}
function apiDate(v){if(!v)return "";return String(v).slice(0,10)}
/* واجهة التنبيهات والوقت */
function showNotice(message,type="success"){
  let box=document.getElementById("appNotice");
  if(!box){box=document.createElement("div");box.id="appNotice";box.className="app-notice";document.body.appendChild(box);}
  box.className="app-notice "+type;
  box.textContent=message;
  requestAnimationFrame(()=>box.classList.add("show"));
  clearTimeout(window.__noticeTimer);
  window.__noticeTimer=setTimeout(()=>box.classList.remove("show"),3200);
}
window.alert=function(message){showNotice(String(message),/تعذر|خطأ|غير صحيح|أدخل|لا توجد/.test(String(message))?"error":"success");};
function confirmAction(message,confirmText="نعم، متابعة"){
  return new Promise(resolve=>{
    let box=document.getElementById("appConfirm");
    if(!box){
      box=document.createElement("div");box.id="appConfirm";box.className="app-confirm";
      box.innerHTML='<div class="app-confirm-box"><div class="app-confirm-icon">!</div><h3 id="confirmTitle">تأكيد</h3><p id="confirmMessage"></p><div class="app-confirm-actions"><button id="confirmCancel" class="ghost-btn">إلغاء</button><button id="confirmOk" class="primary-btn"></button></div></div>';
      document.body.appendChild(box);
    }
    box.querySelector("#confirmMessage").textContent=message;
    box.querySelector("#confirmOk").textContent=confirmText;
    box.classList.add("show");
    const done=v=>{box.classList.remove("show");resolve(v)};
    box.querySelector("#confirmCancel").onclick=()=>done(false);
    box.querySelector("#confirmOk").onclick=()=>done(true);
  });
}
function setupSystemBar(){
  if(location.pathname.endsWith("login.html")||document.getElementById("systemBar"))return;
  const header=document.querySelector("header");
  if(header&&!document.getElementById("liveDate")){
    const bar=document.createElement("div");bar.id="systemBar";bar.className="system-bar no-print";
    bar.innerHTML='<span id="liveDate">--/--/----</span><span class="bar-sep">•</span><strong id="liveTime">--:--:--</strong>';
    header.insertAdjacentElement("afterend",bar);
  }
  const nav=document.getElementById("nav");
  if(nav&&!nav.querySelector(".logout-link")){
    const b=document.createElement("button");b.type="button";b.className="logout-link";b.textContent="تسجيل الخروج";b.onclick=()=>window.logout?.();
    nav.appendChild(b);
  }
  const tick=()=>{
    const now=new Date();
    const d=now.toLocaleDateString("ar-SA-u-nu-latn",{year:"numeric",month:"2-digit",day:"2-digit"});
    const t=now.toLocaleTimeString("ar-SA-u-nu-latn",{hour:"numeric",minute:"2-digit",second:"2-digit",hour12:true});
    const de=document.getElementById("liveDate"),te=document.getElementById("liveTime");
    if(de)de.textContent=d;
    if(te)te.textContent=t;
  };
  tick();setInterval(tick,1000);
}

function isStandaloneApp(){
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone===true;
}
function isIOS(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isMobileAndroid(){
  return /android/i.test(navigator.userAgent);
}
function setupInstallPrompt(){
  if(location.pathname.endsWith("login.html")||isStandaloneApp())return;
  window.addEventListener("beforeinstallprompt",e=>{
    e.preventDefault();
    deferredInstallPrompt=e;
    renderInstallPrompt("install");
  });
  window.addEventListener("appinstalled",()=>{
    deferredInstallPrompt=null;
    document.getElementById("installPrompt")?.remove();
    showNotice("تم تثبيت تطبيق عقارات الراكة بنجاح","success");
  });
  if(isIOS())setTimeout(()=>renderInstallPrompt("ios"),1800);
}
function renderInstallPrompt(mode){
  if(document.getElementById("installPrompt"))return;
  const box=document.createElement("div");
  box.id="installPrompt";box.className="install-prompt";
  const ios=mode==="ios";
  box.innerHTML=ios
    ? '<div class="install-prompt-icon">📱</div><div class="install-prompt-body"><strong>ثبّت عقارات الراكة على الآيفون</strong><span>اضغط مشاركة ⬆️ ثم «إضافة إلى الشاشة الرئيسية»</span></div><button class="install-prompt-close" aria-label="إغلاق">×</button>'
    : '<div class="install-prompt-icon">📲</div><div class="install-prompt-body"><strong>ثبّت تطبيق عقارات الراكة</strong><span>ثبّت المنصة على جهازك للوصول إليها مثل أي تطبيق.</span></div><button class="install-prompt-action">تثبيت</button><button class="install-prompt-close" aria-label="إغلاق">×</button>';
  document.body.appendChild(box);
  box.querySelector(".install-prompt-close").onclick=()=>box.remove();
  box.querySelector(".install-prompt-action")?.addEventListener("click",async()=>{
    if(!deferredInstallPrompt){showNotice("استخدم قائمة المتصفح واختر «تثبيت التطبيق»","info");return}
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt=null;
    box.remove();
  });
}

function registerApp(){
  if("serviceWorker" in navigator) navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
}
document.addEventListener("DOMContentLoaded",()=>{setupSystemBar();registerApp();setupInstallPrompt()});
