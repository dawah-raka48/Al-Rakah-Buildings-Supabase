let reportData=[];

(async function(){
  await loadData();
  fillBuildings("#building",true);

  const q=new URLSearchParams(location.search);
  if(q.get("building")) building.value=q.get("building");

  const today=new Date();
  const first=new Date(today.getFullYear(),today.getMonth(),1);
  dateFrom.value=toISODate(first);
  dateTo.value=toISODate(today);

  populateCategoryFilter("all");
  renderReport();
})();

function toISODate(d){
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function displayDate(v){
  const s=String(v||"").slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s||"-";
  const [y,m,d]=s.split("-");
  return `${d}/${m}/${y}`;
}

function getCategories(){
  const type=operationType.value;
  const incomeCats=["إيجار","محل","موقف","إيراد آخر"];
  const expenseCats=cats("expense");
  return type==="income"
    ? incomeCats
    : type==="expense"
      ? expenseCats
      : [...new Set([...incomeCats,...expenseCats])];
}

function populateCategoryFilter(selectedValue){
  const cats=getCategories();
  const wanted=selectedValue ?? categoryFilter.value;
  const keep=cats.includes(wanted) ? wanted : "all";

  categoryFilter.innerHTML=
    '<option value="all">كل البنود</option>'+
    cats.map(c=>`<option value="${c}">${c}</option>`).join("");

  categoryFilter.value=keep;
}

function getRange(){
  let from=dateFrom.value;
  let to=dateTo.value;
  if(from && to && from>to){
    const tmp=from; from=to; to=tmp;
  }
  return {from,to};
}

function getFilteredTransactions(){
  const {from,to}=getRange();
  const bid=building.value;
  const type=operationType.value;
  const category=categoryFilter.value;

  return get(DB.transactions)
    .filter(x=>{
      const d=String(x.date||"").slice(0,10);
      return (!from || d>=from) &&
             (!to || d<=to) &&
             (!bid || String(x.buildingId)===String(bid)) &&
             (type==="all" || x.type===type) &&
             (category==="all" || x.category===category);
    })
    .sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
}

function renderReport(){
  const ts=getFilteredTransactions();
  const inc=ts.filter(x=>x.type==="income");
  const exp=ts.filter(x=>x.type==="expense");
  const sum=a=>a.reduce((s,x)=>s+Number(x.amount||0),0);

  const income=sum(inc);
  const expense=sum(exp);
  const net=income-expense;

  rIncome.textContent=money(income);
  rExpense.textContent=money(expense);
  rNet.textContent=money(net);
  rCount.textContent=money(ts.length);

  const {from,to}=getRange();
  const buildingLabel=building.value ? buildingName(building.value) : "جميع العمارات";
  const typeLabel=operationType.value==="all" ? "كل العمليات" :
    operationType.value==="income" ? "الإيرادات" : "المصروفات";
  const categoryLabel=categoryFilter.value==="all" ? "كل البنود" : categoryFilter.value;

  const rangeLabel=from&&to ? `من ${displayDate(from)} إلى ${displayDate(to)}` :
    from ? `من ${displayDate(from)}` :
    to ? `حتى ${displayDate(to)}` : "كل الفترات";

  let title="التقرير المالي";
  if(categoryFilter.value!=="all"){
    title=`تقرير ${categoryFilter.value}`;
  }else if(operationType.value==="income"){
    title="تقرير الإيرادات";
  }else if(operationType.value==="expense"){
    title="تقرير المصروفات";
  }

  reportTitle.textContent=title;
  reportScope.textContent=`${rangeLabel} • ${buildingLabel} • ${typeLabel} • ${categoryLabel}`;
  printDate.textContent=`تاريخ إصدار التقرير: ${displayDate(toISODate(new Date()))}`;

  renderMonthlySummary(ts);
  renderBuildingSummary(ts);
  renderTransactions(ts);
}


function monthKey(value){
  const s=String(value||"").slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.slice(0,7) : "";
}
function monthLabel(key){
  const [y,m]=key.split("-");
  const names=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  return `${names[Number(m)-1]} ${y}`;
}
function renderMonthlySummary(ts){
  const groups={};
  ts.forEach(x=>{
    const key=monthKey(x.date);
    if(!key)return;
    if(!groups[key])groups[key]={income:0,expense:0,count:0};
    const amount=Number(x.amount||0);
    if(x.type==="income")groups[key].income+=amount;
    if(x.type==="expense")groups[key].expense+=amount;
    groups[key].count++;
  });
  const rows=Object.entries(groups).sort((a,b)=>a[0].localeCompare(b[0]));
  monthlyCards.innerHTML=rows.length ? rows.map(([key,x])=>`
    <div class="month-card">
      <div class="month-card-head">
        <strong>${monthLabel(key)}</strong>
        <span>${money(x.count)} عملية</span>
      </div>
      <div class="month-lines">
        <div class="month-line income"><span>الإيرادات</span><strong>${money(x.income)} ريال</strong></div>
        <div class="month-line expense"><span>المصروفات</span><strong>${money(x.expense)} ريال</strong></div>
        <div class="month-line net"><span>الصافي</span><strong>${money(x.income-x.expense)} ريال</strong></div>
      </div>
    </div>
  `).join("") : `<div class="report-empty" style="grid-column:1/-1">لا توجد بيانات شهرية ضمن الفترة المحددة</div>`;
}

function renderBuildingSummary(ts){
  const groups={};

  ts.forEach(x=>{
    const id=String(x.buildingId||"");
    if(!groups[id]){
      groups[id]={name:buildingName(id),income:0,expense:0};
    }
    if(x.type==="income") groups[id].income+=Number(x.amount||0);
    if(x.type==="expense") groups[id].expense+=Number(x.amount||0);
  });

  const rows=Object.values(groups).sort((a,b)=>a.name.localeCompare(b.name,"ar"));

  buildingSummaryRows.innerHTML=rows.length
    ? rows.map(x=>`
      <tr>
        <td><strong>${x.name}</strong></td>
        <td class="amount income-amount">${money(x.income)} ريال</td>
        <td class="amount expense-amount">${money(x.expense)} ريال</td>
        <td class="amount">${money(x.income-x.expense)} ريال</td>
      </tr>
    `).join("")+
    `<tr class="total-row">
      <td>الإجمالي</td>
      <td>${money(rows.reduce((s,x)=>s+x.income,0))} ريال</td>
      <td>${money(rows.reduce((s,x)=>s+x.expense,0))} ريال</td>
      <td>${money(rows.reduce((s,x)=>s+x.income-x.expense,0))} ريال</td>
    </tr>`
    : `<tr><td colspan="4" class="report-empty">لا توجد بيانات حسب الفلاتر المحددة</td></tr>`;
}

function renderTransactions(ts){
  transactionRows.innerHTML=ts.length
    ? ts.map((x,i)=>{
        const income=x.type==="income";
        const meter=x.meterName
          ? `${x.meterName}${x.meterAccount ? " / "+x.meterAccount : ""}`
          : "-";
        return `
          <tr>
            <td>${i+1}</td>
            <td>${displayDate(x.date)}</td>
            <td>${buildingName(x.buildingId)}</td>
            <td><span class="type-pill ${income?"income":"expense"}">${income?"إيراد":"مصروف"}</span></td>
            <td>${x.category||"-"}</td>
            <td>${meter}</td>
            <td>${x.note||"-"}</td>
            <td class="amount ${income?"income-amount":"expense-amount"}">${money(x.amount)} ريال</td>
          </tr>`;
      }).join("")
    : `<tr><td colspan="8" class="report-empty">لا توجد عمليات حسب الفلاتر المحددة</td></tr>`;
}

function changeOperationType(){
  const current=categoryFilter.value;
  populateCategoryFilter(current);
  renderReport();
}

function changeCategory(){
  renderReport();
}

function resetReportFilters(){
  const today=new Date();
  const first=new Date(today.getFullYear(),today.getMonth(),1);
  dateFrom.value=toISODate(first);
  dateTo.value=toISODate(today);
  building.value="";
  operationType.value="all";
  populateCategoryFilter("all");
  renderReport();
}

async function printReport(){
  await loadData();
  renderReport();
  window.print();
}

dateFrom.onchange=renderReport;
dateTo.onchange=renderReport;
building.onchange=renderReport;
operationType.onchange=changeOperationType;
categoryFilter.onchange=changeCategory;
