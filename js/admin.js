(() => {
  const DEFAULT_API = 'https://segel-inventario.vercel.app/api/catalogo';
  const LEGACY_STORAGE_KEY = 'casaGlickAdminOverridesV1';
  const LEGACY_SETTINGS_KEY = 'casaGlickAdminSettingsV1';
  const FALLBACK_IMAGE = 'assets/product-placeholder-cg.png';
  const state = { products: [], filtered: [], current: null, overrides: {}, settings: { apiUrl: DEFAULT_API, stripeEnabled: false }, orders: [], messages: [], filteredMessages: [], currentMessage: null, shopContent: {} };
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const cloud = window.CasaGlickFirestore;

  function loadLocal(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } }
  function normalize(raw, index){ return window.CasaGlickCatalog.normalizeProduct(raw, index); }
  function unwrapPayload(payload){ return window.CasaGlickCatalog.unwrapPayload(payload); }
  function productView(product){ const o = state.overrides[product.id] || {}; return { ...product, published:o.published === true, category:product.category || '', displayName:o.displayName || product.name, editorialDescription:o.editorialDescription || product.description, order:Number(o.order)||0, featured:Boolean(o.featured), slug:o.slug || slugify(product.name) }; }
  function slugify(text){ return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
  function money(value){ return value === null ? 'Sin precio' : new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2}).format(value); }
  function priceMarkup(product){
    if(!product.hasPromotion) return `<span class="price-normal">${esc(money(product.price))}</span>`;
    return `<div class="price-promo"><span class="price-promo__current">${esc(money(product.salePrice))}</span><span class="price-promo__original">${esc(money(product.originalPrice))}</span></div>`;
  }
  function esc(value){ return String(value ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function categoryLabel(value){ return ({poltronas:'Sillones individuales',ottoman:'Ottoman',sillas:'Sillas',mesas:'Mesas',sofas:'Sofás',exterior:'Exterior',decoracion:'Decoración',iluminacion:'Iluminación',habitacion:'Habitación'})[value] || (value ? String(value) : 'Sin categoría'); }

  const SHOP_SECTION_DEFINITIONS = Array.isArray(window.CASA_GLICK_SHOP_SECTION_SCHEMA)
    ? window.CASA_GLICK_SHOP_SECTION_SCHEMA
    : [];
  const CONTENT_FIELDS = ['eyebrow','title','description','imageUrl','buttonText','buttonUrl'];
  function defaultSection(def){ return {enabled:true,...(def.defaults||{})}; }
  function fillEmptySectionFields(section, defaults){
    const result={...defaults,...section};
    CONTENT_FIELDS.forEach(field=>{
      if(field in defaults && (typeof result[field]!=='string' || !result[field].trim())) result[field]=defaults[field]||'';
    });
    return result;
  }
  function normalizedDefinitions(raw={}){
    const remote=Array.isArray(raw?.schema?.sections)?raw.schema.sections:[];
    const byKey=new Map();
    [...remote,...SHOP_SECTION_DEFINITIONS].forEach(def=>{ if(def?.key) byKey.set(def.key,{...byKey.get(def.key),...def}); });
    return [...byKey.values()];
  }
  function normalizeShopContent(raw={}){
    const definitions=normalizedDefinitions(raw);
    const nestedSections=raw.sections&&typeof raw.sections==='object'?raw.sections:{};
    const sections={...nestedSections};
    definitions.forEach(def=>{
      const directSection=raw[def.key]&&typeof raw[def.key]==='object'?raw[def.key]:{};
      const nestedSection=nestedSections[def.key]&&typeof nestedSections[def.key]==='object'?nestedSections[def.key]:{};
      const defaults=defaultSection(def);
      sections[def.key]=fillEmptySectionFields({...defaults,...nestedSection,...directSection},defaults);
    });
    return {sections,definitions};
  }
  function schemaPayload(definitions){
    return definitions.map(def=>({key:def.key,label:def.label||def.key,description:def.description||'',icon:def.icon||'layout',fields:Array.isArray(def.fields)?def.fields:[],defaults:def.defaults||{}}));
  }
  function shopContentPayload(content){
    const normalized=normalizeShopContent(content);
    const direct=Object.fromEntries(normalized.definitions.map(def=>[def.key,{...normalized.sections[def.key]}]));
    return {schemaVersion:4,schema:{version:1,sections:schemaPayload(normalized.definitions)},sections:{...normalized.sections},...direct};
  }
  function renderField(def,item,field){
    const key=def.key, value=item[field.key]??'', wide=field.wide?' is-wide':'';
    if(field.type==='textarea') return `<label class="${wide.trim()}"><span>${esc(field.label)}</span><textarea data-section-key="${key}" data-section-field="${field.key}">${esc(value)}</textarea></label>`;
    if(field.type==='image') return `<div class="shop-section-image"><div class="shop-section-image__preview"><img data-section-preview="${key}" src="${esc(value||FALLBACK_IMAGE)}" alt="Vista previa de ${esc(def.label)}"></div><div class="shop-section-image__fields"><label><span>URL de imagen</span><input type="url" data-section-key="${key}" data-section-field="${field.key}" value="${esc(value)}" placeholder="https://..."></label><label class="shop-section-image__upload"><input type="file" accept="image/*" data-section-upload="${key}"><span>Subir imagen desde el equipo</span></label><small class="shop-section-image__progress" data-section-progress="${key}"></small></div></div>`;
    const inputType=field.type==='url'?'url':'text';
    return `<label class="${wide.trim()}"><span>${esc(field.label)}</span><input type="${inputType}" data-section-key="${key}" data-section-field="${field.key}" value="${esc(value)}"></label>`;
  }
  function renderShopContent(){
    const list=$('#shop-content-list'); if(!list)return;
    const definitions=state.shopContent.definitions||SHOP_SECTION_DEFINITIONS;
    list.innerHTML=definitions.map((def,index)=>{ const item=state.shopContent.sections?.[def.key]||defaultSection(def); const fields=(def.fields||[]).map(field=>renderField(def,item,field)).join(''); return `<article class="shop-section-card ${index===0?'is-open':''}" data-section-card="${def.key}"><div class="shop-section-card__header" data-toggle-section-card="${def.key}"><div class="shop-section-card__identity"><i data-lucide="${def.icon||'layout'}"></i><div><strong>${esc(def.label||def.key)}</strong><small>${esc(def.description||'Bloque editable de Shop.')}</small></div></div><div class="shop-section-card__controls"><label class="toggle-row shop-section-card__toggle" title="Mostrar u ocultar sección"><span>Visible</span><input type="checkbox" data-section-field="enabled" data-section-key="${def.key}" ${item.enabled!==false?'checked':''}><i></i></label><i class="shop-section-card__chevron" data-lucide="chevron-down"></i></div></div><div class="shop-section-card__body"><div class="shop-section-form">${fields}</div></div></article>`; }).join('');
    renderLucide();
  }
  function needsSchemaSync(raw,normalized){
    const remoteKeys=new Set(Object.keys(raw?.sections||{}).concat(Object.keys(raw||{})));
    return normalized.definitions.some(def=>!remoteKeys.has(def.key)) || Number(raw?.schemaVersion||0)<4;
  }
  async function loadShopContent(){
    try{
      const raw=await cloud.loadShopContent();
      state.shopContent=normalizeShopContent(raw);
      if(needsSchemaSync(raw,state.shopContent)){
        await cloud.saveShopContent(shopContentPayload(state.shopContent));
      }
      renderShopContent();
      const status=$('#shop-content-status'); if(status){status.textContent='Sincronizado';status.classList.add('is-saved');}
    } catch(error){ console.error(error); state.shopContent=normalizeShopContent(); renderShopContent(); toast('No se pudo cargar el contenido de Shop.'); }
  }
  function collectShopContent(){
    const content=normalizeShopContent(state.shopContent);
    $$('[data-section-key][data-section-field]').forEach(input=>{ const key=input.dataset.sectionKey; const field=input.dataset.sectionField; if(!content.sections[key])content.sections[key]={}; content.sections[key][field]=input.type==='checkbox'?input.checked:input.value.trim(); });
    return content;
  }
  function categoryData(product){ const category=product?.category||''; return {category,categoryLabel:categoryLabel(category),apiCategory:product?.apiCategory||''}; }
  function renderLucide(){ if(window.lucide?.createIcons) window.lucide.createIcons({attrs:{'aria-hidden':'true'}}); }

  function syncSettingsControls(){
    const apiInput=$('#api-url');
    const stripeToggle=$('#stripe-enabled');
    const enabled=state.settings.stripeEnabled===true || state.settings.checkoutMode==='stripe';
    if(apiInput) apiInput.value=state.settings.apiUrl||DEFAULT_API;
    if(stripeToggle) stripeToggle.checked=enabled;
    const label=enabled?'Stripe':'Orden + WhatsApp';
    if($('#stripe-mode-status')) $('#stripe-mode-status').textContent=label;
    if($('#checkout-mode-label')) $('#checkout-mode-label').textContent=label;
    $('#stripe-mode-status')?.classList.toggle('is-enabled',enabled);
  }

  async function loadCloudState(){
    if(!cloud) throw new Error('Firestore no está disponible');
    const [cloudOverrides, cloudSettings] = await Promise.all([cloud.loadOverrides(), cloud.loadSettings()]);
    const legacyOverrides = loadLocal(LEGACY_STORAGE_KEY, {});
    const legacySettings = loadLocal(LEGACY_SETTINGS_KEY, {});
    state.overrides = cloudOverrides || {};
    const savedSettings = cloudSettings || {};
    const savedStripeEnabled = savedSettings.stripeEnabled === true || savedSettings.checkoutMode === 'stripe';
    state.settings = {
      apiUrl: DEFAULT_API,
      stripeEnabled: savedStripeEnabled,
      checkoutMode: savedStripeEnabled ? 'stripe' : 'assisted',
      ...savedSettings,
      stripeEnabled: savedStripeEnabled
    };
    syncSettingsControls();

    if(!Object.keys(state.overrides).length && Object.keys(legacyOverrides).length){
      const entries = Object.entries(legacyOverrides).map(([id,data])=>({id,data}));
      await cloud.saveOverridesBulk(entries);
      state.overrides = legacyOverrides;
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      toast('La configuración local anterior se migró a Firebase.');
    }
    if(!cloudSettings?.apiUrl && legacySettings?.apiUrl){
      state.settings.apiUrl = legacySettings.apiUrl;
      await cloud.saveSettings({apiUrl:legacySettings.apiUrl});
      localStorage.removeItem(LEGACY_SETTINGS_KEY);
    }
  }

  async function syncProductCategories(){
    if(!cloud || !state.products.length) return;
    const entries=state.products.reduce((result,product)=>{
      const current=state.overrides[product.id]||{};
      const categoryFields=categoryData(product);
      if(current.category===categoryFields.category && current.categoryLabel===categoryFields.categoryLabel && (current.apiCategory||'')===categoryFields.apiCategory) return result;
      result.push({id:product.id,data:{...current,...categoryFields,slug:current.slug||slugify(product.name)}});
      return result;
    },[]);
    if(!entries.length) return;
    await cloud.saveOverridesBulk(entries);
    entries.forEach(({id,data})=>{ state.overrides[id]=data; });
  }

  async function loadProducts(){
    setSync('loading');
    try { await loadCloudState(); }
    catch(error){ console.error(error); setSync('error'); toast('No se pudo leer la configuración de Firebase. Revisa las reglas de Firestore.'); }
    const url = state.settings.apiUrl || DEFAULT_API;
    try{
      const res = await fetch(url,{cache:'no-store'});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      const rows = unwrapPayload(payload);
      if(!rows.length) throw new Error('La API no devolvió productos');
      state.products = rows.map(normalize);
      await syncProductCategories();
      setSync('live');
    }catch(error){
      console.error('No fue posible consultar el inventario.',error);
      state.products = [];
      setSync('error');
      toast('No se pudo conectar con la API de inventario.');
    }
    buildBrandFilter(); buildCategoryFilter(); applyFilters();
  }

  function setSync(mode){ const el=$('#sync-state'); el.className='sync-state'; $('#refresh-products')?.classList.toggle('is-loading',mode==='loading'); if(mode==='live'){el.classList.add('is-live');el.innerHTML='<span></span> Inventario y Firebase conectados';} else if(mode==='error'){el.classList.add('is-error');el.innerHTML='<span></span> Revisa la conexión';} else {el.innerHTML='<span></span> Sincronizando';} }
  function buildBrandFilter(){ const select=$('#brand-filter'); if(!select)return; const current=select.value; const brands=[...new Set(state.products.map(p=>p.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')); select.innerHTML='<option value="all">Todas las marcas</option>'+brands.map(brand=>`<option value="${esc(brand)}">${esc(brand)}</option>`).join(''); select.value=brands.includes(current)?current:'all'; }
  function buildCategoryFilter(){ const select=$('#category-filter'); const current=select.value; const categories=[...new Set(state.products.map(p=>productView(p).category).filter(Boolean))]; select.innerHTML='<option value="all">Todas las categorías</option>'+categories.map(c=>`<option value="${esc(c)}">${esc(categoryLabel(c))}</option>`).join(''); select.value=categories.includes(current)?current:'all'; }
  function applyFilters(){ const q=$('#product-search').value.trim().toLowerCase(); const brand=$('#brand-filter')?.value||'all'; const cat=$('#category-filter').value; const status=$('#status-filter').value; state.filtered=state.products.map(productView).filter(p=>{ const matchesQ=!q||`${p.name} ${p.code}`.toLowerCase().includes(q); const matchesBrand=brand==='all'||p.brand===brand; const matchesCat=cat==='all'||p.category===cat; const matchesStatus=status==='all'||(status==='published'&&p.published)||(status==='hidden'&&!p.published)||(status==='in'&&p.stock>0)||(status==='out'&&p.stock<=0); return matchesQ&&matchesBrand&&matchesCat&&matchesStatus; }).sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name)); renderTable(); renderStats(); updateGlobalToggle(); }
  function renderStats(){ const views=state.products.map(productView); $('#stat-total').textContent=views.length; $('#stat-published').textContent=views.filter(p=>p.published).length; $('#stat-no-price').textContent=views.filter(p=>p.price===null).length; }
  function updateGlobalToggle(){ const toggle=$('#toggle-all-products'); if(!toggle)return; const views=state.products.map(productView); const published=views.filter(p=>p.published).length; toggle.checked=views.length>0&&published===views.length; toggle.indeterminate=published>0&&published<views.length; }
  function renderTable(){ const body=$('#products-body'); $('#empty-state').hidden=state.filtered.length>0; body.innerHTML=state.filtered.map(p=>`<tr><td><div class="product-cell"><img class="product-thumb" src="${esc(p.images[0]||FALLBACK_IMAGE)}" alt="" onerror="this.src='${FALLBACK_IMAGE}'"><div><strong>${esc(p.displayName)}</strong><small>${esc(p.description||'Sin descripción')}</small></div></div></td><td>${esc(p.code)}</td><td><span class="category-pill">${esc(categoryLabel(p.category))}</span></td><td>${priceMarkup(p)}</td><td><span class="stock-pill ${p.stock>0?'has-stock':'no-stock'}">${p.stock>0?`${p.stock} ${p.stock===1?'disponible':'disponibles'}`:'Sin stock'}</span></td><td><label class="visibility-toggle"><input type="checkbox" data-toggle-visible="${esc(p.id)}" ${p.published?'checked':''}><i></i></label></td><td><button class="row-action" type="button" data-edit="${esc(p.id)}" aria-label="Editar ${esc(p.name)}"><i data-lucide="more-horizontal"></i></button></td></tr>`).join(''); renderLucide(); }
  function openDrawer(id){ const product=state.products.find(p=>p.id===id); if(!product)return; const p=productView(product); state.current=product; $('#drawer-title').textContent=p.displayName; $('#drawer-code').textContent=p.code; $('#drawer-price').innerHTML=p.hasPromotion?`${esc(money(p.salePrice))} <del>${esc(money(p.originalPrice))}</del>`:esc(money(p.price)); $('#drawer-stock').textContent=p.stock>0?`${p.stock} disponibles`:'Sin stock'; $('#drawer-image').src=p.images[0]||FALLBACK_IMAGE; $('#drawer-image').alt=p.displayName; $('#field-published').checked=p.published; $('#field-category-api').value=product.apiCategory || categoryLabel(product.category); $('#field-display-name').value=(state.overrides[p.id]?.displayName||''); $('#field-description').value=(state.overrides[p.id]?.editorialDescription||''); $('#field-order').value=p.order; $('#field-featured').checked=p.featured; $('#field-slug').value=p.slug; $('#inventory-list').innerHTML=[['Código',p.code],['Nombre',p.name],['Descripción',p.description||'—'],['Categoría API',product.apiCategory || categoryLabel(product.category)],['Marca',p.brand],['Color',p.color],['Materiales',p.materials],['Medidas',p.measures],['Precio',p.hasPromotion?`${money(p.salePrice)} (antes ${money(p.originalPrice)})`:money(p.price)],['Promoción',p.hasPromotion?'Activa':'No'],['Stock',p.stock],['Imágenes',p.images.length]].map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join(''); $('#drawer-backdrop').hidden=false; requestAnimationFrame(()=>$('#product-drawer').classList.add('is-open')); $('#product-drawer').setAttribute('aria-hidden','false'); }
  function closeDrawer(){ $('#product-drawer').classList.remove('is-open'); $('#product-drawer').setAttribute('aria-hidden','true'); setTimeout(()=>$('#drawer-backdrop').hidden=true,400); }

  async function saveCurrent(){
    if(!state.current)return; const id=state.current.id;
    const data={published:$('#field-published').checked,displayName:$('#field-display-name').value.trim(),editorialDescription:$('#field-description').value.trim(),order:Number($('#field-order').value)||0,featured:$('#field-featured').checked,slug:slugify($('#field-slug').value||state.current.name),...categoryData(state.current)};
    const button=$('#save-product'); button.disabled=true;
    try{ await cloud.saveOverride(id,data); state.overrides[id]={...(state.overrides[id]||{}),...data}; buildCategoryFilter(); applyFilters(); closeDrawer(); toast('Cambios guardados en Firebase.'); }
    catch(error){ console.error(error); toast('No se pudieron guardar los cambios en Firebase.'); }
    finally{ button.disabled=false; }
  }

  async function setAllVisibility(published){
    const toggle=$('#toggle-all-products'); const label=toggle.closest('.visibility-toggle'); label.classList.add('is-saving'); toggle.disabled=true;
    const entries=state.products.map(product=>{ const current=state.overrides[product.id]||{}; return {id:product.id,data:{...current,published,slug:current.slug||slugify(product.name),...categoryData(product)}}; });
    try{ await cloud.saveOverridesBulk(entries); entries.forEach(({id,data})=>{state.overrides[id]=data;}); applyFilters(); toast(published?'Todos los productos están visibles.':'Todos los productos están ocultos.'); }
    catch(error){ console.error(error); toggle.checked=!published; toast('No se pudo actualizar la visibilidad global.'); }
    finally{ toggle.disabled=false; label.classList.remove('is-saving'); updateGlobalToggle(); }
  }

  function toast(message){ const el=$('#toast'); el.textContent=message; el.classList.add('is-visible'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('is-visible'),2800); }
  function formatDate(value){ try{ const date=value?.toDate?value.toDate():new Date(value); return new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short'}).format(date); }catch{return '—';} }
  async function loadOrders(){ const body=$('#orders-body'); if(!body)return; body.innerHTML='<tr><td colspan="6">Cargando órdenes…</td></tr>'; try{ state.orders=await cloud.loadOrders(); renderOrders(); }catch(error){ console.error(error); body.innerHTML='<tr><td colspan="6">No fue posible cargar las órdenes.</td></tr>'; } }
  function renderOrders(){ const body=$('#orders-body'); const empty=$('#orders-empty'); empty.hidden=state.orders.length>0; body.innerHTML=state.orders.map(order=>{ const itemCount=Array.isArray(order.items)?order.items.reduce((sum,item)=>sum+(Number(item.quantity)||1),0):0; const delivery=order.customer?.deliveryType||order.deliveryType||''; return `<tr><td><strong>${esc(order.folio||order.id)}</strong><small>${itemCount} producto${itemCount===1?'':'s'}</small></td><td><strong>${esc(order.customer?.name||'—')}</strong><small>${esc(order.customer?.phone||'')}${delivery?` · ${esc(delivery)}`:''}</small></td><td>${esc(formatDate(order.createdAt))}</td><td>${esc(money(order.total??0))}</td><td><select class="order-status" data-order-status="${esc(order.id)}">${['Nueva','Contactado','Cotización enviada','Confirmada','Pagada','En preparación','Entregada','Cancelada'].map(status=>`<option ${status===(order.status||'Nueva')?'selected':''}>${status}</option>`).join('')}</select></td><td><button class="row-action" type="button" data-order-whatsapp="${esc(order.customer?.phone||'')}" data-order-folio="${esc(order.folio||'')}" aria-label="Dar seguimiento por WhatsApp"><i data-lucide="message-circle"></i></button></td></tr>`; }).join(''); renderLucide(); }

  function normalizeMessage(raw){
    const source=String(raw.source||raw.site||raw.origin||'casaglick.com').replace(/^https?:\/\//,'').replace(/\/$/,'');
    return {...raw,source,status:raw.status==='read'?'read':'unread',name:raw.name||raw.fullName||raw.nombre||'Sin nombre',email:raw.email||raw.correo||'',phone:raw.phone||raw.telefono||'',message:raw.message||raw.mensaje||raw.comments||''};
  }
  function updateMessagesBadge(){ const unread=state.messages.filter(item=>item.status!=='read').length; const badge=$('#messages-badge'); if(!badge)return; badge.textContent=unread>99?'99+':String(unread); badge.hidden=unread===0; }
  async function loadMessages(){ const body=$('#messages-body'); if(!body)return; body.innerHTML='<tr><td colspan="6">Cargando mensajes…</td></tr>'; try{ state.messages=(await cloud.loadMessages()).map(normalizeMessage); applyMessageFilters(); updateMessagesBadge(); }catch(error){ console.error(error); body.innerHTML='<tr><td colspan="6">No fue posible cargar los mensajes.</td></tr>'; } }
  function startMessagesListener(){
    if(typeof cloud.subscribeMessages!=='function'){ loadMessages(); return; }
    cloud.subscribeMessages(
      messages=>{ state.messages=messages.map(normalizeMessage); applyMessageFilters(); updateMessagesBadge(); },
      ()=>{ const body=$('#messages-body'); if(body&&!state.messages.length) body.innerHTML='<tr><td colspan="6">No fue posible actualizar los mensajes.</td></tr>'; }
    );
  }
  function applyMessageFilters(){ const source=$('#message-source-filter')?.value||'all'; const status=$('#message-status-filter')?.value||'all'; state.filteredMessages=state.messages.filter(item=>(source==='all'||item.source===source)&&(status==='all'||item.status===status)); renderMessages(); }
  function renderMessages(){ const body=$('#messages-body'); const empty=$('#messages-empty'); if(!body)return; empty.hidden=state.filteredMessages.length>0; body.innerHTML=state.filteredMessages.map(item=>`<tr class="message-row ${item.status==='read'?'':'is-unread'}" data-message-row="${esc(item.id)}"><td><div class="message-contact"><strong>${esc(item.name)}</strong><small>${esc(item.email||item.phone||'Sin datos de contacto')}</small></div></td><td><div class="message-preview"><strong>${esc(item.subject||'Nuevo mensaje')}</strong><span>${esc(item.message||'Sin contenido')}</span></div></td><td><span class="message-source">${esc(item.source)}</span></td><td>${esc(formatDate(item.createdAt))}</td><td><span class="message-status ${item.status==='read'?'':'is-unread'}">${item.status==='read'?'Leído':'No leído'}</span></td><td><button class="row-action" type="button" data-open-message="${esc(item.id)}" aria-label="Abrir mensaje"><i data-lucide="chevron-right"></i></button></td></tr>`).join(''); renderLucide(); }
  async function openMessage(id){ const item=state.messages.find(message=>message.id===id); if(!item)return; state.currentMessage=item; $('#message-drawer-source').textContent=item.source.toUpperCase(); $('#message-drawer-name').textContent=item.name; $('#message-drawer-contact-name').textContent=item.name||'Sin nombre'; $('#message-drawer-email').textContent=item.email||'—'; $('#message-drawer-email').href=item.email?`mailto:${item.email}`:'#'; $('#message-drawer-phone').textContent=item.phone||'—'; $('#message-drawer-phone').href=item.phone?`tel:${String(item.phone).replace(/[^+\d]/g,'')}`:'#'; $('#message-drawer-date').textContent=formatDate(item.createdAt); $('#message-drawer-text').textContent=item.message||'Sin contenido'; $('#message-reply').href=item.email?`mailto:${item.email}?subject=${encodeURIComponent('Respuesta de Casa Glick')}`:(item.phone?`https://wa.me/${String(item.phone).replace(/\D/g,'')}`:'#'); $('#message-reply').target=item.email?'':'_blank'; $('#message-backdrop').hidden=false; requestAnimationFrame(()=>$('#message-drawer').classList.add('is-open')); $('#message-drawer').setAttribute('aria-hidden','false'); if(item.status!=='read'){ try{ await cloud.updateMessageStatus(item.id,'read'); item.status='read'; applyMessageFilters(); updateMessagesBadge(); }catch(error){console.error(error);} } }
  function closeMessage(){ $('#message-drawer')?.classList.remove('is-open'); $('#message-drawer')?.setAttribute('aria-hidden','true'); setTimeout(()=>{if($('#message-backdrop'))$('#message-backdrop').hidden=true;},350); state.currentMessage=null; }
  function bind(){
    $('#refresh-products').addEventListener('click',loadProducts); $('#refresh-orders')?.addEventListener('click',loadOrders); $('#refresh-messages')?.addEventListener('click',loadMessages); $('#product-search').addEventListener('input',applyFilters); $('#brand-filter')?.addEventListener('change',applyFilters); $('#category-filter').addEventListener('change',applyFilters); $('#status-filter').addEventListener('change',applyFilters);
    $('#products-body').addEventListener('click',e=>{ const edit=e.target.closest('[data-edit]'); if(edit)openDrawer(edit.dataset.edit); });
    $('#products-body').addEventListener('change',async e=>{ if(!e.target.matches('[data-toggle-visible]'))return; const input=e.target; const id=input.dataset.toggleVisible; const product=state.products.find(p=>p.id===id); const current=state.overrides[id]||{}; const data={...current,published:input.checked,slug:current.slug||slugify(product?.name||id),...categoryData(product)}; input.disabled=true; try{ await cloud.saveOverride(id,data); state.overrides[id]=data; applyFilters(); toast(input.checked?'Producto publicado en Firebase.':'Producto ocultado en Firebase.'); }catch(error){ console.error(error); input.checked=!input.checked; toast('No se pudo actualizar la visibilidad.'); }finally{ input.disabled=false; } });
    $('#toggle-all-products').addEventListener('change',e=>setAllVisibility(e.target.checked));
    $('#close-drawer').addEventListener('click',closeDrawer); $('#drawer-backdrop').addEventListener('click',closeDrawer); $('#save-product').addEventListener('click',saveCurrent);
    $('#preview-product').addEventListener('click',()=>{ if(!state.current)return; const p=productView(state.current); window.open(`https://shop.casaglick.com/producto.html?product=${encodeURIComponent(p.code)}`,'_blank'); });
    $$('.drawer-tabs button').forEach(btn=>btn.addEventListener('click',()=>{ $$('.drawer-tabs button').forEach(x=>x.classList.toggle('is-active',x===btn)); $$('.drawer-tab').forEach(tab=>tab.classList.toggle('is-active',tab.id===`drawer-tab-${btn.dataset.drawerTab}`)); }));
    $$('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{
      $$('.nav-item').forEach(x=>x.classList.toggle('is-active',x===btn));
      $$('.view').forEach(v=>v.classList.toggle('is-active',v.id===`view-${btn.dataset.view}`));
      const titles={products:'Administración de productos',orders:'Órdenes',messages:'Mensajes','web-design':'Web Design',settings:'Configuración'};
      const heading=$('.topbar h1'); if(heading) heading.textContent=titles[btn.dataset.view]||'Casa Glick Panel';
      if(btn.dataset.view==='orders')loadOrders();
      if(btn.dataset.view==='web-design')loadShopContent();
    }));
    $('#orders-body')?.addEventListener('change',async e=>{ if(!e.target.matches('[data-order-status]'))return; const select=e.target; select.disabled=true; try{ await cloud.updateOrderStatus(select.dataset.orderStatus,select.value); const order=state.orders.find(x=>x.id===select.dataset.orderStatus); if(order)order.status=select.value; toast('Estado de la orden actualizado.'); }catch(error){console.error(error);toast('No se pudo actualizar la orden.');}finally{select.disabled=false;} });
    $('#message-source-filter')?.addEventListener('change',applyMessageFilters); $('#message-status-filter')?.addEventListener('change',applyMessageFilters); $('#messages-body')?.addEventListener('click',e=>{ const btn=e.target.closest('[data-open-message]'); const row=e.target.closest('[data-message-row]'); const id=btn?.dataset.openMessage||row?.dataset.messageRow; if(id)openMessage(id); }); $('#close-message-drawer')?.addEventListener('click',closeMessage); $('#message-backdrop')?.addEventListener('click',closeMessage);
    $('#orders-body')?.addEventListener('click',e=>{ const btn=e.target.closest('[data-order-whatsapp]'); if(!btn)return; const phone=String(btn.dataset.orderWhatsapp||'').replace(/\D/g,''); const text=encodeURIComponent(`Hola, damos seguimiento a tu orden ${btn.dataset.orderFolio} de Casa Glick.`); window.open(`https://wa.me/${phone}?text=${text}`,'_blank'); });
    const stripeToggle=$('#stripe-enabled');
    const updateStripeModeUI=()=>{
      const enabled=Boolean(stripeToggle?.checked);
      const label=enabled?'Stripe':'Orden + WhatsApp';
      if($('#stripe-mode-status')) $('#stripe-mode-status').textContent=label;
      if($('#checkout-mode-label')) $('#checkout-mode-label').textContent=label;
      $('#stripe-mode-status')?.classList.toggle('is-enabled',enabled);
    };
    syncSettingsControls();
    if(stripeToggle){ stripeToggle.addEventListener('change',updateStripeModeUI); }
    $('#shop-content-list')?.addEventListener('click',e=>{ const header=e.target.closest('[data-toggle-section-card]'); if(!header||e.target.closest('label'))return; header.closest('.shop-section-card')?.classList.toggle('is-open'); });
    $('#shop-content-list')?.addEventListener('input',e=>{ const input=e.target.closest('[data-section-field]'); if(!input)return; const status=$('#shop-content-status'); if(status){status.textContent='Cambios sin guardar';status.classList.remove('is-saved');} if(input.dataset.sectionField==='imageUrl'){ const preview=$(`[data-section-preview="${input.dataset.sectionKey}"]`); if(preview)preview.src=input.value.trim()||FALLBACK_IMAGE; } });
    $('#shop-content-list')?.addEventListener('change',async e=>{ const fileInput=e.target.closest('[data-section-upload]'); if(!fileInput||!fileInput.files?.[0])return; const key=fileInput.dataset.sectionUpload; const progress=$(`[data-section-progress="${key}"]`); const file=fileInput.files[0]; if(progress)progress.textContent='Subiendo imagen…'; fileInput.disabled=true; try{ const url=await cloud.uploadShopContentImage(key,file); const urlInput=$(`[data-section-key="${key}"][data-section-field="imageUrl"]`); const preview=$(`[data-section-preview="${key}"]`); if(urlInput)urlInput.value=url; if(preview)preview.src=url; if(progress)progress.textContent='Imagen lista. Guarda los cambios.'; const status=$('#shop-content-status'); if(status){status.textContent='Cambios sin guardar';status.classList.remove('is-saved');} }catch(error){console.error(error);if(progress)progress.textContent='No se pudo subir la imagen.';}finally{fileInput.disabled=false;fileInput.value='';} });
    $('#save-shop-content')?.addEventListener('click',async()=>{ const button=$('#save-shop-content'); const data=collectShopContent(); const payload=shopContentPayload(data); button.disabled=true; try{ await cloud.saveShopContent(payload); state.shopContent=normalizeShopContent(payload); const status=$('#shop-content-status'); if(status){status.textContent='Guardado';status.classList.add('is-saved');} toast('Contenido y visibilidad de Shop guardados en Firebase.'); }catch(error){console.error(error);toast('No se pudo guardar el contenido de Shop.');}finally{button.disabled=false;} });
    $('#save-settings').addEventListener('click',async()=>{
      const apiUrl=$('#api-url').value.trim()||DEFAULT_API;
      const stripeEnabled=Boolean(stripeToggle?.checked);
      const button=$('#save-settings');
      button.disabled=true;
      try{
        await cloud.saveSettings({apiUrl,stripeEnabled,checkoutMode:stripeEnabled?'stripe':'assisted'});
        state.settings.apiUrl=apiUrl;
        state.settings.stripeEnabled=stripeEnabled;
        state.settings.checkoutMode=stripeEnabled?'stripe':'assisted';
        syncSettingsControls();
        toast(stripeEnabled?'Stripe activado en la configuración de Shop.':'Flujo de orden y WhatsApp activado.');
        loadProducts();
      }catch(error){console.error(error);toast('No se pudo guardar la configuración.');}
      finally{button.disabled=false;}
    });
    document.addEventListener('keydown',e=>{ if(e.key==='Escape'){closeDrawer();closeMessage();} });
  }
  bind(); renderLucide(); startMessagesListener(); loadShopContent(); loadProducts();
})();
