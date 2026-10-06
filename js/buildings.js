const form=document.getElementById("buildingForm"),nameEl=document.getElementById("buildingName"),addrEl=document.getElementById("buildingAddress"),listEl=document.getElementById("buildings"),countEl=document.getElementById("countLabel");
async function render(){const d=await loadData(),bs=d.buildings;countEl.textContent=`${bs.length} عمارة`;listEl.innerHTML=bs.length?bs.map(b=>`<article class="building-item"><div class="building-top"><div><h3>${b.name}</h3><p>${b.address||"بدون عنوان"}</p></div></div><div class="building-meta"><span>العدادات</span><b>${(b.meters||[]).length}</b></div><div class="building-actions"><button type="button" class="mini-btn" onclick="addMeter('${b.id}')">＋ إضافة عداد</button><button type="button" class="mini-btn danger" onclick="removeBuilding('${b.id}')">حذف</button></div><div class="operation-sub" style="margin-top:10px">${(b.meters||[]).map(m=>`• ${m.name} — ${m.type||"غير محدد"} — ${m.account||"بدون حساب"}`).join("<br>")||"لا توجد عدادات"}</div></article>`).join(""):"<p class='muted'>لا توجد عمارات.</p>"}
form.addEventListener("submit",async e=>{e.preventDefault();const name=nameEl.value.trim(),address=addrEl.value.trim();if(!name)return showNotice("اكتب اسم أو رقم العمارة أولاً.","error");try{await api("addBuilding",{name,address});form.reset();await render();showNotice("تمت إضافة العمارة وحفظها في Google Sheets")}catch(err){showNotice("تعذر حفظ العمارة: "+err.message,"error")}});
async function addMeter(bid){
  const type=prompt("نوع العداد: كهرباء أو مياه","كهرباء");
  if(!type)return;
  const normalized=type.trim().toLowerCase()==="مياه"?"مياه":type.trim().toLowerCase()==="كهرباء"?"كهرباء":"";
  if(!normalized)return showNotice("اكتب نوع العداد: كهرباء أو مياه","error");
  const name=prompt("اسم العداد",`عداد ${normalized}`);
  if(!name)return;
  const number=prompt("رقم العداد",""),account=prompt("رقم الحساب","");
  try{
    await api("addMeter",{buildingId:bid,name:name.trim(),number:(number||"").trim(),account:(account||"").trim(),type:normalized});
    await render();
    showNotice(`تم حفظ عداد ${normalized}`);
  }catch(e){alert("تعذر حفظ العداد: "+e.message)}
}
async function removeBuilding(bid){confirmAction("سيتم حذف العمارة وبياناتها. هل تريد الحذف؟","نعم، حذف").then(async ok=>{if(!ok)return;try{await api("deleteBuilding",{id:bid});await render();showNotice("تم حذف العمارة")}catch(e){showNotice("تعذر الحذف: "+e.message,"error")}})}
render();
