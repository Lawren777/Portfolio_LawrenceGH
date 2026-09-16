(() => {
  const config = window.PORTFOLIO_CONFIG || {};
  const defaults = window.SITE_DEFAULTS;
  let blocks = structuredClone(defaults);
  let portfolio = [...window.PORTFOLIO_DEFAULTS];
  let activeFilter = "Tous";
  let supabaseClient = null;

  const qs = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => [...root.querySelectorAll(sel)];
  const text = (sel, value) => { const el=qs(sel); if(el && value != null) el.textContent=value; };
  const setBg = (el, url) => { if(el && url) el.style.backgroundImage = `url("${String(url).replaceAll('"','%22')}")`; };

  async function createSupabase(){
    if(!config.supabaseUrl || !config.supabaseAnonKey) return null;
    try {
      const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      return mod.createClient(config.supabaseUrl, config.supabaseAnonKey);
    } catch (err) {
      console.warn('Supabase indisponible, contenu local utilisé.', err);
      return null;
    }
  }

  async function loadRemoteContent(){
    supabaseClient = await createSupabase();
    if(!supabaseClient) return;
    try {
      const [{data:blockRows,error:blockError},{data:itemRows,error:itemError}] = await Promise.all([
        supabaseClient.from('content_blocks').select('key,data'),
        supabaseClient.from('portfolio_items').select('*').eq('published',true).order('sort_order',{ascending:true})
      ]);
      if(blockError) throw blockError;
      if(itemError) throw itemError;
      for(const row of blockRows || []) blocks[row.key] = row.data;
      if(itemRows?.length) portfolio = itemRows.map(mapDbItem);
      await revealAdminIfAuthenticated();
    } catch(err){
      console.warn('Le CMS n’a pas pu être chargé. Contenu de secours affiché.',err);
    }
  }

  function mapDbItem(row){
    return {
      id: row.id, title: row.title, category: row.category, tag: row.tag,
      description: row.description || '', imageUrl: row.image_url, imageAlt: row.image_alt || '',
      linkUrl: row.link_url || '#', layout: row.layout || 'standard', sortOrder: row.sort_order ?? 999,
      published: row.published
    };
  }

  function render(){
    renderHero();
    renderPortfolio();
    renderApproach();
    renderCurrent();
    renderAbout();
    renderFooter();
  }

  function renderHero(){
    const h=blocks.hero || defaults.hero;
    text('#hero-eyebrow',h.eyebrow); text('#hero-title',h.title); text('#hero-subtitle',h.subtitle); text('#hero-body',h.body);
    text('#hero-manifesto',h.manifesto); text('#hero-quote',h.quote); text('#hero-caption',h.caption);
    const cta=qs('#hero-cta'); if(cta){cta.href=h.ctaUrl || '#portfolio';cta.firstChild.textContent=`${h.ctaLabel || 'Découvrir'} `;}
    setBg(qs('#hero-visual'),h.imageUrl);
  }

  function renderPortfolio(){
    const grid=qs('#portfolio-grid'); if(!grid) return;
    const items=portfolio.filter(i=>activeFilter==='Tous' || i.category===activeFilter).sort((a,b)=>(a.sortOrder??999)-(b.sortOrder??999));
    grid.innerHTML = items.map(item => `
      <a class="portfolio-card layout-${escapeHtml(item.layout || 'standard')}" href="${safeUrl(item.linkUrl)}" data-category="${escapeHtml(item.category)}">
        <img src="${safeUrl(item.imageUrl)}" alt="${escapeHtml(item.imageAlt || item.title)}" loading="lazy" />
        <div class="portfolio-card-content">
          <div class="portfolio-card-meta">${escapeHtml(item.tag || item.category)}</div>
          <h3>${escapeHtml(item.title)}</h3><span class="arrow">↗</span>
        </div>
      </a>`).join('');
  }

  function renderApproach(){
    const items=(blocks.approach || defaults.approach).items || [];
    qs('#approach-grid').innerHTML=items.map(item=>`<article class="approach-item"><div class="approach-icon"><span>${escapeHtml(item.icon||'◇')}</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></article>`).join('');
  }

  function renderCurrent(){
    const c=blocks.currentProject || defaults.currentProject;
    text('#current-title',c.title); text('#current-body',c.body); setBg(qs('#current-bg'),c.imageUrl);
    const a=qs('#current-cta'); if(a){a.href=c.ctaUrl || '#';a.firstChild.textContent=`${c.ctaLabel || 'Suivre le projet'} `;}
  }

  function renderAbout(){
    const a=blocks.about || defaults.about;
    text('#about-body',a.body); text('#about-quote',a.quote); setBg(qs('#about-image'),a.imageUrl);
    const c=qs('#about-cta'); if(c){c.href=a.ctaUrl || '#contact';c.firstChild.textContent=`${a.ctaLabel || 'En savoir plus'} `;}
  }

  function renderFooter(){
    const f=blocks.footer || defaults.footer;
    qs('#footer-socials').innerHTML=(f.socials||[]).map(s=>`<a href="${safeUrl(s.url)}" target="${String(s.url).startsWith('http')?'_blank':'_self'}" rel="noreferrer" aria-label="${escapeHtml(s.label)}">${escapeHtml(s.label)}</a>`).join('');
    text('#copyright',f.copyright);
  }

  function escapeHtml(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}
  function safeUrl(value=''){const v=String(value||'#').trim();if(/^(https?:|mailto:|#|assets\/|\.\.?\/)/i.test(v))return v;if(/^[a-z0-9_./-]+(?:[?#].*)?$/i.test(v) && !/^javascript:/i.test(v))return v;return '#';}

  function bindUI(){
    qsa('.filter').forEach(btn=>btn.addEventListener('click',()=>{
      activeFilter=btn.dataset.filter;
      qsa('.filter').forEach(b=>b.classList.toggle('active',b===btn));
      renderPortfolio();
    }));
    qsa('[data-filter-link]').forEach(link=>link.addEventListener('click',()=>{
      activeFilter=link.dataset.filterLink;
      qsa('.filter').forEach(b=>b.classList.toggle('active',b.dataset.filter===activeFilter));
      renderPortfolio();
    }));
    const toggle=qs('.nav-toggle'), nav=qs('.site-nav');
    toggle?.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});
    qsa('.site-nav a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
  }

  async function revealAdminIfAuthenticated(){
    if(!supabaseClient) return;
    const {data}=await supabaseClient.auth.getSession();
    const email=data?.session?.user?.email?.toLowerCase();
    if(email && email===String(config.adminEmail||'').toLowerCase()) qs('#admin-fab').hidden=false;
  }

  bindUI(); render();
  loadRemoteContent().then(render);
})();
