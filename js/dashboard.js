let dashboardData={buildings:[],transactions:[]};

(async function(){
  const d=await loadData();
  dashboardData=d;
  setCurrentYearPeriod();
  renderDashboard();
})();

function setCurrentYearPeriod(){
  const now=new Date();
  const y=now.getFullYear();
  dashboardFrom.value=`${y}-01`;
  dashboardTo.value=`${y}-${String(now.getMonth()+1).padStart(2,"0")}`;
}
function periodBounds(){
  let from=dashboardFrom.value||"";
  let to=dashboardTo.value||"";
  if(from&&to&&from>to)[from,to]=[to,from];
  return {from,to};
}
function inPeriod(date,from,to){
  const mk=monthKey(date);
  return (!from||mk>=from)&&(!to||mk<=to);
}
function periodText(from,to){
  if(!from&&!to)return "كل العمليات";
  if(from&&to&&from===to)return `شهر ${from}`;
  return `من ${from||"البداية"} إلى ${to||"الآن"}`;
}

function renderDashboard(){
  const bs=dashboardData.buildings||[];
  const ts=dashboardData.transactions||[];
  let {from,to}=periodBounds();

  if(dashboardFrom.value&&dashboardTo.value&&dashboardFrom.value>dashboardTo.value){
    dashboardFrom.value=from;dashboardTo.value=to;
  }

  const mt=ts.filter(x=>inPeriod(x.date,from,to));
  const inc=mt.filter(x=>x.type==="income").reduce((a,x)=>a+Number(x.amount||0),0);
  const exp=mt.filter(x=>x.type==="expense").reduce((a,x)=>a+Number(x.amount||0),0);

  buildingCount.textContent=bs.length;
  monthIncome.textContent=money(inc);
  monthExpense.textContent=money(exp);
  monthNet.textContent=money(inc-exp);

  document.getElementById("incomePeriodLabel").textContent="الإيرادات";
  document.getElementById("expensePeriodLabel").textContent="المصروفات";
  document.getElementById("netPeriodLabel").textContent="صافي الفترة";

  const cards=bs.map(b=>{
    const bt=mt.filter(x=>x.buildingId===b.id);
    const bi=bt.filter(x=>x.type==="income").reduce((a,x)=>a+Number(x.amount||0),0);
    const be=bt.filter(x=>x.type==="expense").reduce((a,x)=>a+Number(x.amount||0),0);
    return `<article class="building-item property-card">
      <div class="property-top"><div><span class="property-badge">${(b.meters||[]).length} عداد</span><h3>${b.name}</h3><p>⌖ ${b.address||"بدون عنوان"}</p></div><span class="property-icon">▦</span></div>
      <div class="property-values">
        <div class="property-value income"><b>${money(bi)}</b><span>الإيرادات</span></div>
        <div class="property-value expense"><b>${money(be)}</b><span>المصروفات</span></div>
        <div class="property-value net"><b>${money(bi-be)}</b><span>الصافي</span></div>
      </div>
      <div class="building-actions"><a class="mini-btn primary-mini" href="reports.html?building=${b.id}">عرض التفاصيل ←</a></div>
    </article>`;
  }).join("");

  buildingCards.innerHTML=cards||"<p class='muted'>لا توجد عمارات بعد. أضف أول عمارة للبدء.</p>";
}

dashboardFrom?.addEventListener("change",renderDashboard);
dashboardTo?.addEventListener("change",renderDashboard);
dashboardReset?.addEventListener("click",()=>{setCurrentYearPeriod();renderDashboard()});
