(async () => {
  const config = window.PORTFOLIO_CONFIG || {};
  const $ = (s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  let sb=null, items=[], blocks=structuredClone(window.SITE_DEFAULTS), selectedId=null;

  const setupPanel=$('#setup-panel'), loginPanel=$('#login-panel'), adminPanel=$('#admin-panel'), logoutBtn=$('#logout-btn');
  if(!config.supabaseUrl || !config.supabaseAnonKey){setupPanel.classList.remove('hidden');return;}

  try{const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');sb=mod.createClient(config.supabaseUrl,config.supabaseAnonKey);}catch(e){setupPanel.classList.remove('hidden');setupPanel.querySelector('p').textContent='Impossible de charger le module Supabase. Vérifiez votre connexion et la configuration.';return;}

  async function boot(){
    const {data}=await sb.auth.getSession();
    if(data?.session) return authorize(data.session.user);
    loginPanel.classList.remove('hidden');
  }
  async function authorize(user){
    const allowed=String(user?.email||'').toLowerCase()===String(config.adminEmail||'').toLowerCase();
    if(!allowed){await sb.auth.signOut();loginPanel.classList.remove('hidden');setStatus('#login-status','Ce compte n’est pas autorisé.',true);return;}
    loginPanel.classList.add('hidden');adminPanel.classList.remove('hidden');logoutBtn.classList.remove('hidden');await loadAll();
  }
  $('#login-form').addEventListener('submit',async e=>{e.preventDefault();setStatus('#login-status','Connexion…');const {data,error}=await sb.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});if(error)return setStatus('#login-status',error.message,true);authorize(data.user);});
  logoutBtn.addEventListener('click',async()=>{await sb.auth.signOut();location.reload();});

  $$('.admin-tab').forEach(btn=>btn.addEventListener('click',()=>{$$('.admin-tab').forEach(b=>b.classList.toggle('active',b===btn));$$('.tab-view').forEach(v=>v.classList.toggle('active',v.dataset.view===btn.dataset.tab));}));

  async function loadAll(){
    const [{data:b,error:be},{data:p,error:pe}]=await Promise.all([sb.from('content_blocks').select('key,data'),sb.from('portfolio_items').select('*').order('sort_order',{ascending:true})]);
    if(be||pe){alert((be||pe).message);return;}
    (b||[]).forEach(row=>blocks[row.key]=row.data);items=p||[];renderItemList();fillSectionForms();resetItemForm();
  }
  function renderItemList(){
    $('#item-list').innerHTML=items.map(row=>`<button type="button" class="item-row ${row.id===selectedId?'active':''}" data-id="${row.id}"><img src="${escAttr(row.image_url||'assets/placeholders/asset.svg')}" alt=""><span><strong>${esc(row.title)}</strong><small>${esc(row.category)} · ordre ${row.sort_order ?? 0}</small></span><span class="badge">${row.published?'Publié':'Brouillon'}</span></button>`).join('')||'<p class="muted">Aucun projet.</p>';
    $$('.item-row').forEach(r=>r.addEventListener('click',()=>selectItem(r.dataset.id)));
  }
  function selectItem(id){
    selectedId=id;const row=items.find(i=>i.id===id);if(!row)return;
    $('#item-id').value=row.id;$('#item-title').value=row.title||'';$('#item-category').value=row.category||'Assets';$('#item-tag').value=row.tag||'';$('#item-layout').value=row.layout||'standard';$('#item-order').value=row.sort_order??10;$('#item-link').value=row.link_url||'#';$('#item-description').value=row.description||'';$('#item-alt').value=row.image_alt||'';$('#item-image-url').value=row.image_url||'';$('#item-published').value=String(!!row.published);preview($('#item-preview'),row.image_url);$('#item-editor-title').textContent='Modifier le projet';$('#delete-item').classList.remove('hidden');renderItemList();
  }
  function resetItemForm(){$('#item-form').reset();selectedId=null;$('#item-id').value='';$('#item-order').value=items.length?Math.max(...items.map(i=>i.sort_order||0))+1:1;$('#item-link').value='#';$('#item-published').value='true';$('#item-image-url').value='';$('#item-preview').style.backgroundImage='';$('#item-preview').textContent='Aperçu de l’image';$('#item-editor-title').textContent='Ajouter un projet';$('#delete-item').classList.add('hidden');renderItemList();}
  $('#new-item').addEventListener('click',resetItemForm);
  $('#item-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;setStatus('#item-status','Téléversement de l’image…');try{const url=await uploadFile(file,'portfolio');$('#item-image-url').value=url;preview($('#item-preview'),url);setStatus('#item-status','Image prête.',false,true);}catch(err){setStatus('#item-status',err.message,true);}});
  $('#item-form').addEventListener('submit',async e=>{e.preventDefault();const payload={title:$('#item-title').value.trim(),category:$('#item-category').value,tag:$('#item-tag').value.trim(),layout:$('#item-layout').value,sort_order:Number($('#item-order').value||0),link_url:$('#item-link').value.trim()||'#',description:$('#item-description').value.trim(),image_alt:$('#item-alt').value.trim(),image_url:$('#item-image-url').value.trim()||'assets/placeholders/asset.svg',published:$('#item-published').value==='true'};setStatus('#item-status','Enregistrement…');let result;if(selectedId)result=await sb.from('portfolio_items').update(payload).eq('id',selectedId).select().single();else result=await sb.from('portfolio_items').insert(payload).select().single();if(result.error)return setStatus('#item-status',result.error.message,true);if(selectedId){items=items.map(i=>i.id===selectedId?result.data:i);}else{items.push(result.data);selectedId=result.data.id;}items.sort((a,b)=>(a.sort_order??999)-(b.sort_order??999));renderItemList();selectItem(selectedId);setStatus('#item-status','Enregistré.',false,true);});
  $('#delete-item').addEventListener('click',async()=>{if(!selectedId||!confirm('Supprimer ce projet ?'))return;const {error}=await sb.from('portfolio_items').delete().eq('id',selectedId);if(error)return setStatus('#item-status',error.message,true);items=items.filter(i=>i.id!==selectedId);resetItemForm();setStatus('#item-status','Projet supprimé.',false,true);});

  function fillSectionForms(){
    $$('.section-form').forEach(form=>{const key=form.dataset.section,data=blocks[key]||{};$$('[name]',form).forEach(input=>{if(input.name==='imageUrl'){input.value=data.imageUrl||'';preview($('.image-preview',form),data.imageUrl);return;} if(typeof data[input.name]==='string')input.value=data[input.name];});});
  }
  $$('.section-file').forEach(input=>input.addEventListener('change',async e=>{const form=e.target.closest('.section-form'),file=e.target.files[0];if(!file)return;const status=$('.status',form);status.textContent='Téléversement de l’image…';status.className='status';try{const url=await uploadFile(file,form.dataset.section);$('[name="imageUrl"]',form).value=url;preview($('.image-preview',form),url);status.textContent='Image prête.';status.className='status ok';}catch(err){status.textContent=err.message;status.className='status error';}}));
  $$('.section-form').forEach(form=>form.addEventListener('submit',async e=>{e.preventDefault();const key=form.dataset.section;const data={...(blocks[key]||{})};$$('[name]',form).forEach(input=>data[input.name]=input.value);const status=$('.status',form);status.textContent='Enregistrement…';status.className='status';const {error}=await sb.from('content_blocks').upsert({key,data});if(error){status.textContent=error.message;status.className='status error';return;}blocks[key]=data;status.textContent='Section enregistrée.';status.className='status ok';}));

  async function uploadFile(file,folder){
    if(!file.type.startsWith('image/'))throw new Error('Le fichier doit être une image.');
    if(file.size>12*1024*1024)throw new Error('Image trop lourde : 12 Mo maximum.');
    const clean=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-');const path=`${folder}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${clean}`;
    const {error}=await sb.storage.from('portfolio-media').upload(path,file,{cacheControl:'3600',upsert:false});if(error)throw error;
    const {data}=sb.storage.from('portfolio-media').getPublicUrl(path);return data.publicUrl;
  }
  function preview(el,url){if(!el)return;if(url){el.style.backgroundImage=`url("${String(url).replaceAll('"','%22')}")`;el.textContent='';}else{el.style.backgroundImage='';el.textContent='Aperçu de l’image';}}
  function setStatus(sel,msg,error=false,ok=false){const el=typeof sel==='string'?$(sel):sel;if(!el)return;el.textContent=msg;el.className=`status${error?' error':''}${ok?' ok':''}`;}
  function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}function escAttr(v=''){return esc(v);}
  boot();
})();
