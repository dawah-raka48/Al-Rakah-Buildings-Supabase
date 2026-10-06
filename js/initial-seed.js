const INITIAL_SEED_VERSION="2026-10-06-v1";
const INITIAL_SEED_KEY="srakah_initial_seed_version";

async function decodeInitialSeed(){
  const r=await fetch("data/initial-data.json.gz.b64",{cache:"no-store"});
  if(!r.ok)throw new Error("تعذر تحميل ملف البيانات");
  const b64=(await r.text()).trim();
  const bin=atob(b64);
  const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
  if(!("DecompressionStream" in window))throw new Error("المتصفح لا يدعم فك ضغط ملف البيانات");
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  const text=await new Response(stream).text();
  return JSON.parse(text);
}

async function upsertChunks(table,rows,size=50){
  for(let i=0;i<rows.length;i+=size){
    const chunk=rows.slice(i,i+size);
    const {error}=await supabaseClient.from(table).upsert(chunk,{onConflict:"id"});
    if(error)throw error;
  }
}

async function importInitialData(){
  if(!supabaseClient)return;
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(!session)return;
  if(localStorage.getItem(INITIAL_SEED_KEY)===INITIAL_SEED_VERSION)return;
  try{
    const seed=await decodeInitialSeed();
    startBusy?.();
    await upsertChunks("buildings",seed.Buildings,50);
    await upsertChunks("meters",seed.Meters,50);
    await upsertChunks("transactions",seed.Transactions,50);
    localStorage.setItem(INITIAL_SEED_KEY,INITIAL_SEED_VERSION);
    await syncFromSupabase?.();
    showNotice?.("تم استيراد بيانات الإكسل بنجاح: 7 عمارات، 39 عدادًا، 156 عملية مالية.","success");
  }catch(error){
    console.error("Initial seed error:",error);
    showNotice?.("تعذر استيراد البيانات: "+(error.message||"خطأ غير معروف"),"error");
  }finally{
    stopBusy?.();
  }
}

document.addEventListener("DOMContentLoaded",()=>setTimeout(importInitialData,1200));
