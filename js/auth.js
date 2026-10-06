async function getSession(){
  if(!supabaseClient)return null;
  const {data}=await supabaseClient.auth.getSession();
  return data?.session||null;
}
function isLogged(){return !!window.__supabaseSession}
function togglePassword(){
  const x=document.getElementById("password");
  if(x)x.type=x.type==="password"?"text":"password";
}

(async function(){
  const session=await getSession();
  window.__supabaseSession=session;
  const isLoginPage=location.pathname.endsWith("login.html");
  if(isLoginPage&&session){location.href="index.html";return}
  if(!isLoginPage&&!session){location.href="login.html";return}
})();

document.getElementById("loginForm")?.addEventListener("submit",async e=>{
  e.preventDefault();
  const err=document.getElementById("loginError");
  err.textContent="";
  const email=document.getElementById("email")?.value.trim();
  const p=document.getElementById("password")?.value||"";
  if(!email){err.textContent="أدخل البريد الإلكتروني.";return}
  if(!p){err.textContent="أدخل كلمة المرور.";return}
  try{
    const {data,error}=await supabaseClient.auth.signInWithPassword({email,password:p});
    if(error)throw error;
    window.__supabaseSession=data.session;
    location.href="index.html";
  }catch(error){
    err.textContent=error.message||"البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  }
});

async function logout(){
  const ok=typeof confirmAction==="function"
    ? await confirmAction("هل تريد تسجيل الخروج من المنصة؟","نعم، تسجيل الخروج")
    : true;
  if(!ok)return;
  await supabaseClient?.auth.signOut();
  window.__supabaseSession=null;
  location.href="login.html";
}
