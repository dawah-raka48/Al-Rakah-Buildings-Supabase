const typeEl=type,buildingEl=building,categoryEl=category;date.value=new Date().toISOString().slice(0,10);
async function init(){await loadData();fillBuildings("#building");const q=new URLSearchParams(location.search);if(q.get("building"))buildingEl.value=q.get("building");refresh();renderRecent()}
function refresh(){categoryEl.innerHTML=cats(typeEl.value).map(x=>`<option>${x}</option>`).join("");refreshMeters()}
function refreshMeters(){
  const b=get(DB.buildings).find(x=>x.id===buildingEl.value),isMeterExpense=typeEl.value==="expense"&&["كهرباء","مياه"].includes(categoryEl.value),meterType=categoryEl.value,filtered=(b?.meters||[]).filter(m=>m.type===meterType),show=isMeterExpense&&filtered.length>0;
  meterArea.classList.toggle("hidden",!show);amountWrap.classList.toggle("hidden",show);
  if(show){
    meters.innerHTML=filtered.map(m=>`<div class="meter-row"><label>${m.name}<small class="operation-sub">${m.type} • رقم الحساب: ${m.account||"-"}</small></label><label>رقم العداد<input value="${m.number||""}" disabled></label><label>المبلغ<input class="meterAmount" data-meter-id="${m.id}" type="number" min="0" step=".01" placeholder="0.00"></label></div>`).join("")||`<p class='muted'>لا توجد عدادات ${meterType} لهذه العمارة. أضف عدادًا من صفحة العمارات.</p>`;
  }
}
typeEl.onchange=refresh;buildingEl.onchange=refreshMeters;categoryEl.onchange=refreshMeters;
entryForm.onsubmit=async e=>{e.preventDefault();const saveBtn=entryForm.querySelector("button[type=\"submit\"]");const originalSaveText=saveBtn?.textContent||"حفظ العملية";if(saveBtn){saveBtn.disabled=true;saveBtn.textContent="جاري الحفظ…";}const b=get(DB.buildings).find(x=>x.id===buildingEl.value),meterType=typeEl.value==="expense"&&["كهرباء","مياه"].includes(categoryEl.value)&&((b?.meters||[]).some(m=>m.type===categoryEl.value));if(!b)return showNotice("اختر العمارة أولاً.","error");try{if(meterType){
      let saved=0;
      const meterTypeName=categoryEl.value;
      const filtered=(b.meters||[]).filter(m=>m.type===meterTypeName);
      for(const el of document.querySelectorAll(".meterAmount")){
        const a=Number(el.value); if(a>0){
          const m=filtered.find(x=>x.id===el.dataset.meterId); if(!m)continue;
          await api("addTransaction",{buildingId:b.id,date:date.value,type:"expense",category:categoryEl.value,amount:a,note:note.value,meterId:m.id,meterName:m.name,meterNumber:m.number,meterAccount:m.account});
          saved++;
        }
      }
      if(!saved)return showNotice("أدخل مبلغ عداد واحد على الأقل.","error")
    }else{const a=Number(amount.value);if(!(a>0))return showNotice("أدخل المبلغ.","error");await api("addTransaction",{buildingId:b.id,date:date.value,type:typeEl.value,category:categoryEl.value,amount:a,note:note.value})}await syncFromGoogle();entryForm.reset();date.value=new Date().toISOString().slice(0,10);refresh();renderRecent();showNotice("تمت إضافة العملية وحفظها في Google Sheets")}catch(err){showNotice("تعذر حفظ العملية: "+err.message,"error")}finally{if(saveBtn){saveBtn.disabled=false;saveBtn.textContent=originalSaveText;}}};
async function renderRecent(){await loadData();const arr=get(DB.transactions).reverse();recent.innerHTML=arr.map(x=>`<div class="operation"><span class="tag ${x.type}">${x.type==="income"?"إيراد":"مصروف"}</span><div><div class="operation-title">${x.category}${x.meterName?" • "+x.meterName:""}</div><div class="operation-sub">${buildingName(x.buildingId)} • ${x.date}</div></div><div class="operation-amount">${money(x.amount)} ريال</div><div class="operation-actions"><button class="mini-btn" onclick="editTransaction('${x.id}')">تعديل</button><button class="mini-btn danger" onclick="deleteTransaction('${x.id}')">حذف</button></div></div>`).join("")||"<p class='muted'>لا توجد عمليات حتى الآن.</p>"}
async function deleteTransaction(tid){confirmAction("هل تريد حذف هذه العملية؟","نعم، حذف").then(async ok=>{if(!ok)return;try{await api("deleteTransaction",{id:tid});await syncFromGoogle();renderRecent();showNotice("تم الحذف")}catch(e){showNotice("تعذر الحذف: "+e.message,"error")}})}
async function editTransaction(tid){await loadData();const x=get(DB.transactions).find(t=>t.id===tid);if(!x)return;const bs=get(DB.buildings);editContent.innerHTML=`<div class="form-grid"><label>التاريخ<input id="eDate" type="date" value="${x.date}"></label><label>المبلغ<input id="eAmount" type="number" step=".01" value="${x.amount}"></label><label>العمارة<select id="eBuilding">${bs.map(b=>`<option value="${b.id}" ${b.id===x.buildingId?"selected":""}>${b.name}</option>`).join("")}</select></label><label>البيان<input id="eNote" value="${x.note||""}"></label><div class="form-actions"><button class="primary-btn" onclick="saveEdit('${x.id}')">حفظ التعديل</button></div></div>`;modal.classList.remove("hidden")}
async function saveEdit(tid){const x=get(DB.transactions).find(t=>t.id===tid);try{await api("updateTransaction",{id:tid,buildingId:eBuilding.value,date:eDate.value,type:x.type,category:x.category,amount:Number(eAmount.value),note:eNote.value,meterId:x.meterId,meterName:x.meterName,meterNumber:x.meterNumber,meterAccount:x.meterAccount});closeModal();await syncFromGoogle();renderRecent();showNotice("تم تعديل العملية")}catch(e){showNotice("تعذر التعديل: "+e.message,"error")}}
function closeModal(){modal.classList.add("hidden")}init();
