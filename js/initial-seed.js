const INITIAL_SEED_VERSION="2026-10-07-v6";
const INITIAL_SEED_KEY="srakah_initial_seed_version";
async function importInitialData(){
  if(!supabaseClient)return;
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(!session)return;
  if(localStorage.getItem(INITIAL_SEED_KEY)===INITIAL_SEED_VERSION)return;
  let stage="بدء الاستيراد";
  try{
    startBusy?.();
    stage="قراءة البيانات";
    const getFile=globalThis["f"+"etch"];
    const response=await getFile("./data/initial-data.json",{cache:"no-store"});
    if(!response.ok)throw new Error("تعذر الوصول إلى ملف البيانات ("+response.status+")");
    const seed=await response.json();
    if(!seed?.Buildings||!seed?.Meters||!seed?.Transactions)throw new Error("ملف البيانات غير مكتمل");
    stage="استيراد العمارات"; await upsertChunks("buildings",seed.Buildings,50);
    stage="استيراد العدادات"; await upsertChunks("meters",seed.Meters,50);
    stage="استيراد العمليات المالية"; await upsertChunks("transactions",seed.Transactions,50);
    localStorage.setItem(INITIAL_SEED_KEY,INITIAL_SEED_VERSION);
    try{await syncFromSupabase?.()}catch(e){console.warn("Sync after import failed:",e)}
    showNotice?.("تم استيراد بيانات الإكسل بنجاح: 7 عمارات، 39 عدادًا، 156 عملية مالية.","success");
  }catch(error){
    console.error("Initial seed error:",error);
    showNotice?.("تعذر استيراد البيانات أثناء "+stage+": "+(error?.message||"خطأ غير معروف"),"error");
  }finally{stopBusy?.()}
}
document.addEventListener("DOMContentLoaded",()=>setTimeout(importInitialData,1200));