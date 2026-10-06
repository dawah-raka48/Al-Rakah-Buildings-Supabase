passForm.onsubmit=async e=>{
 e.preventDefault();
 if(newPass.value.length<8||newPass.value!==confirmPass.value){
   passMsg.textContent="كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل ومتطابقة مع التأكيد.";
   passMsg.style.color="#b42318";return
 }
 try{
   const {data:{user}}=await supabaseClient.auth.getUser();
   if(!user?.email)throw new Error("تعذر معرفة حساب المستخدم الحالي");
   const {error:verifyError}=await supabaseClient.auth.signInWithPassword({email:user.email,password:oldPass.value});
   if(verifyError)throw new Error("كلمة المرور الحالية غير صحيحة");
   const {error}=await supabaseClient.auth.updateUser({password:newPass.value});
   if(error)throw error;
   passForm.reset();
   passMsg.textContent="تم تغيير كلمة المرور بنجاح.";
   passMsg.style.color="#087f5b";
 }catch(err){passMsg.textContent=err.message;passMsg.style.color="#b42318"}
}


let editingExpenseId=null;
function renderExpenseCategories(){
 const list=document.getElementById("expenseCategoriesList");if(!list)return;
 list.innerHTML=expenseCategories().map(x=>`<div class="expense-category-row ${x.active===false?"inactive":""}">
 <div class="expense-category-name"><span class="category-dot"></span><span>${x.name}</span><small>${x.active===false?"معطل":"فعال"}</small></div>
 <div class="expense-category-actions"><button class="mini-btn" type="button" onclick="openExpenseEditor('${x.id}')">تعديل</button><button class="mini-btn" type="button" onclick="toggleExpenseCategory('${x.id}')">${x.active===false?"تفعيل":"تعطيل"}</button></div>
 </div>`).join("")||"<p class='muted'>لا توجد أصناف.</p>";
}
function openExpenseEditor(cid=""){
 editingExpenseId=cid;
 const row=expenseCategories().find(x=>x.id===cid);
 expenseEditorTitle.textContent=cid?"تعديل صنف المصروف":"إضافة صنف مصروف";
 expenseName.value=row?.name||"";
 expenseEditor.classList.remove("hidden");setTimeout(()=>expenseName.focus(),50);
}
function closeExpenseEditor(){expenseEditor.classList.add("hidden");editingExpenseId=null}
async function saveExpenseEditor(){
 const clean=expenseName.value.trim();if(!clean){showNotice("اكتب اسم الصنف","error");return}
 const rows=expenseCategories();
 if(rows.some(x=>x.id!==editingExpenseId&&x.name===clean)){showNotice("هذا الصنف موجود بالفعل","error");return}
 if(editingExpenseId){const row=rows.find(x=>x.id===editingExpenseId);if(row)row.name=clean;showNotice("تم تعديل الصنف")}
 else{rows.push({id:"exp_"+id(),name:clean,active:true});showNotice("تمت إضافة الصنف")}
 try{await api("saveExpenseCategories",{rows});save(DB.expenseCategories,rows);renderExpenseCategories();closeExpenseEditor()}catch(err){showNotice("تعذر حفظ أصناف المصروفات: "+err.message,"error")};
}
async function toggleExpenseCategory(cid){
 const rows=expenseCategories();const row=rows.find(x=>x.id===cid);if(!row)return;
 row.active=row.active===false;
 try{await api("saveExpenseCategories",{rows});save(DB.expenseCategories,rows);renderExpenseCategories()}catch(err){showNotice("تعذر تحديث الصنف: "+err.message,"error");return}
 showNotice(row.active?"تم تفعيل الصنف":"تم تعطيل الصنف");
}
document.addEventListener("DOMContentLoaded",async()=>{await loadData();renderExpenseCategories()});
