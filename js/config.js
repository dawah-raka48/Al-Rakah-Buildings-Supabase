const CONFIG={
  SUPABASE_URL:"https://jgoamfbloquewrytzhgk.supabase.co",
  SUPABASE_PUBLISHABLE_KEY:"sb_publishable_YO2_I2Os4w78Hwpw2psYSg_KQOEYKLN",
  API_URL:""
};

const supabaseClient=window.supabase?.createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_PUBLISHABLE_KEY,{
  auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}
});
