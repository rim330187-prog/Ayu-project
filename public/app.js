let products=[],cart=JSON.parse(localStorage.getItem("ayuCart")||"[]"),lang="am";
const $=s=>document.querySelector(s),money=n=>new Intl.NumberFormat("en-US").format(n)+" ETB";
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function saveCart(){localStorage.setItem("ayuCart",JSON.stringify(cart));renderCart()}
async function loadProducts(){try{products=await(await fetch("/api/products")).json();renderProducts();renderCart()}catch(e){let el=$("#products")||$("#featuredProducts");if(el)el.textContent="ምርቶችን መጫን አልተቻለም።"}}
function productCard(p){return `<article class="product product-tile" data-product="${esc(p.id)}" tabindex="0" role="button" aria-label="${esc(p.name)} ዝርዝር ይመልከቱ"><div class="product-img">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}">`:`<span>♫</span>`}<span class="view-product">VIEW</span></div><div class="product-info"><span class="product-category">${esc(p.category)}</span><h3>${esc(lang==="am"?p.name:(p.nameEn||p.name))}</h3><p>${esc(lang==="am"?p.description:(p.descriptionEn||p.description))}</p><div class="product-bottom"><span class="price">${money(p.price)}</span><button class="add-btn" data-add="${esc(p.id)}">+ ወደ ቅርጫት</button></div></div></article>`}
function renderProducts(){let list=$("#products");if(list){let q=($("#search")?.value||"").toLowerCase(),cat=$("#category")?.value||"";list.innerHTML=products.filter(p=>(p.name+" "+p.nameEn+" "+p.category).toLowerCase().includes(q)&&(!cat||p.category===cat)).map(productCard).join("")||"<p class='empty-products'>እስካሁን ምርት አልተጨመረም። አዲስ ምርቶች በቅርቡ ይታያሉ።</p>"}let featured=$("#featuredProducts");if(featured)featured.innerHTML=products.filter(p=>p.featured).slice(0,3).map(productCard).join("")||products.slice(0,3).map(productCard).join("")||"<p class='empty-products'>እስካሁን ምርት አልተጨመረም።</p>"}
function addToCart(id){let x=cart.find(x=>x.id===id);if(x)x.quantity++;else cart.push({id,quantity:1});saveCart();let count=$("#cartCount");if(count)count.textContent=cart.reduce((s,x)=>s+x.quantity,0)}
function changeQty(id,d){let x=cart.find(x=>x.id===id);if(x)x.quantity+=d;cart=cart.filter(x=>x.quantity>0);saveCart()}
function renderCart(){let count=$("#cartCount");if(count)count.textContent=cart.reduce((s,x)=>s+x.quantity,0);let box=$("#cartItems");if(!box)return;box.innerHTML=cart.map(x=>{let p=products.find(p=>p.id===x.id);if(!p)return "";return `<div class="cart-line"><div><b>${esc(p.name)}</b><small>${money(p.price)} × ${x.quantity}</small></div><div><button onclick="changeQty('${esc(x.id)}',-1)">−</button> ${x.quantity} <button onclick="changeQty('${esc(x.id)}',1)">+</button></div></div>`}).join("")||"<p>ቅርጫቱ ባዶ ነው። <a href='/products.html'>ምርት ይምረጡ</a></p>";let total=$("#cartTotal");if(total)total.textContent=money(cart.reduce((s,x)=>{let p=products.find(p=>p.id===x.id);return s+(p?p.price*x.quantity:0)},0))}
function ensureProductViewer(){if($("#productViewer"))return;document.body.insertAdjacentHTML("beforeend",`<div id="productViewer" class="product-viewer" aria-hidden="true"><button class="viewer-close" id="viewerClose" aria-label="Close">×</button><div class="viewer-stage"><div id="viewerPhoto" class="viewer-photo"></div><div class="viewer-info"><span class="eyebrow">AYU ZEMA COLLECTION</span><h2 id="viewerName"></h2><p id="viewerDesc"></p><strong id="viewerPrice" class="viewer-price"></strong><div class="viewer-order-count">📦 <b id="viewerOrders">0</b> ትዕዛዝ የተደረገበት</div><button id="viewerAdd" class="gold-btn">+ ወደ ቅርጫት ጨምር</button></div></div><aside class="viewer-social"><button id="viewerLike">♥ <b>0</b><small>Like</small></button><button id="viewerDislike">👎 <b>0</b><small>Dislike</small></button><button id="viewerCommentJump">💬 <b>0</b><small>Comments</small></button></aside><section class="viewer-comments"><h3>አስተያየቶች / Comments</h3><div id="viewerCommentList"></div><form id="viewerCommentForm"><input name="comment" maxlength="350" placeholder="አስተያየት ይጻፉ..." required><button>ላክ</button></form></section></div>`);$("#viewerClose").onclick=closeProductView;$("#productViewer").addEventListener("click",e=>{if(e.target.id==="productViewer")closeProductView()});$("#viewerAdd").onclick=()=>{if(activeProduct)addToCart(activeProduct.id)};$("#viewerLike").onclick=()=>sendReaction("like");$("#viewerDislike").onclick=()=>sendReaction("dislike");$("#viewerCommentJump").onclick=()=>$("#viewerCommentForm input").focus();$("#viewerCommentForm").onsubmit=sendComment;document.addEventListener("keydown",e=>{if(e.key==="Escape")closeProductView()})}
let activeProduct=null;
async function openProductView(id){const p=products.find(x=>x.id===id);if(!p)return;ensureProductViewer();activeProduct=p;$("#viewerName").textContent=lang==="am"?p.name:(p.nameEn||p.name);$("#viewerDesc").textContent=lang==="am"?p.description:(p.descriptionEn||p.description);$("#viewerPrice").textContent=money(p.price);$("#viewerPhoto").innerHTML=p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}">`:`<span>♫</span>`;$("#productViewer").classList.add("open");$("#productViewer").setAttribute("aria-hidden","false");document.body.classList.add("viewer-open");await refreshEngagement(id)}
function closeProductView(){const v=$("#productViewer");if(!v)return;v.classList.remove("open");v.setAttribute("aria-hidden","true");document.body.classList.remove("viewer-open")}
async function refreshEngagement(id){try{const d=await(await fetch(`/api/products/${encodeURIComponent(id)}/engagement`)).json();$("#viewerOrders").textContent=d.orders||0;$("#viewerLike b").textContent=d.likes||0;$("#viewerDislike b").textContent=d.dislikes||0;$("#viewerCommentJump b").textContent=d.comments?.length||0;$("#viewerCommentList").innerHTML=(d.comments||[]).map(c=>`<p class="viewer-comment"><span>👤</span>${esc(c.text)}<small>${new Date(c.createdAt).toLocaleDateString()}</small></p>`).join("")||"<p class='no-comments'>እስካሁን አስተያየት የለም።</p>"}catch(e){console.warn(e)}}
async function sendReaction(type){if(!activeProduct)return;const key=`ayu-${type}-${activeProduct.id}`;if(localStorage.getItem(key)){alert("አንድ ጊዜ ብቻ መምረጥ ይችላሉ።");return}try{const r=await fetch(`/api/products/${encodeURIComponent(activeProduct.id)}/reaction`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type})});if(!r.ok)throw Error("Could not save reaction");localStorage.setItem(key,"1");await refreshEngagement(activeProduct.id)}catch(e){alert("ምላሽዎን ማስቀመጥ አልተቻለም።")}}
async function sendComment(e){e.preventDefault();if(!activeProduct)return;const input=e.target.elements.comment,text=input.value.trim();if(!text)return;try{const r=await fetch(`/api/products/${encodeURIComponent(activeProduct.id)}/comments`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text})}),d=await r.json();if(!r.ok)throw Error(d.error);input.value="";await refreshEngagement(activeProduct.id)}catch(err){alert(err.message||"አስተያየት ማስገባት አልተቻለም።")}}
document.addEventListener("click",e=>{const add=e.target.closest("[data-add]");if(add){e.stopPropagation();addToCart(add.dataset.add);return}const tile=e.target.closest("[data-product]");if(tile)openProductView(tile.dataset.product)});document.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches("[data-product]")){e.preventDefault();openProductView(e.target.dataset.product)}});
if($("#search"))$("#search").addEventListener("input",renderProducts);if($("#category"))$("#category").addEventListener("change",renderProducts);
if($("#langBtn"))$("#langBtn").onclick=()=>{lang=lang==="am"?"en":"am";$("#langBtn").textContent=lang==="am"?"EN":"አማ";applyLanguage();renderProducts()};
if($("#checkout"))$("#checkout").onsubmit=async e=>{e.preventDefault();if(!cart.length){$("#checkoutMsg").textContent="ቅርጫቱ ባዶ ነው።";return}let data=Object.fromEntries(new FormData(e.target));data.items=cart;try{let r=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}),out=await r.json();if(!r.ok)throw Error(out.error);$("#checkoutMsg").textContent="ትዕዛዝዎ ተልኳል። ቁጥር: "+out.orderId;cart=[];saveCart();e.target.reset()}catch(err){$("#checkoutMsg").textContent=err.message}};
if($("#contactForm"))$("#contactForm").onsubmit=async e=>{e.preventDefault();let button=e.target.querySelector("button[type=submit]");button.disabled=true;$("#contactMsg").textContent="በመላክ ላይ...";try{let data=Object.fromEntries(new FormData(e.target));let r=await fetch("/api/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}),out=await r.json();if(!r.ok)throw Error(out.error);$("#contactMsg").textContent="መልዕክትዎ በተሳካ ሁኔታ ተልኳል።";e.target.reset()}catch(err){$("#contactMsg").textContent=err.message}finally{button.disabled=false}};

const translations={
 en:{
  nav:["Home","Products","About","Comments","Contact"], cart:"Cart", heroTitle:"Keep our culture alive through music",
  heroDesc:"Discover Ethiopian traditional musical instruments in one place. Explore products, open their details and place your order.",
  shop:"Explore Products", about:"About AYU ZEMA", collection:"Our Collection", collectionDesc:"Tap a product to view its details in full screen.",
  allProducts:"All Products", howOrder:"How to Order", contactTitle:"Have a question?", contactDesc:"Contact us directly about products, prices or orders.",
  viewAll:"View all products", empty:"No products have been added yet.", search:"Search products",
  catalogTitle:"Traditional Musical Instruments", catalogDesc:"Choose a product and view its full-screen details, likes, dislikes, comments and order count.",
  aboutTitle:"About AYU ZEMA", contactPage:"Contact Us"
 },
 am:{
  nav:["መነሻ","ምርቶች","ስለ እኛ","አስተያየት","አግኙን"], cart:"ቅርጫት", heroTitle:"ባህላችንን በዜማ እናቆይ",
  heroDesc:"የኢትዮጵያ ባህላዊ የሙዚቃ መሣሪያዎችን በአንድ ቦታ ያግኙ። ምርቶችን ይመልከቱና ትዕዛዝ ያስገቡ።",
  shop:"ምርቶችን ይመልከቱ", about:"ስለ አዩ ዜማ", collection:"የምርት ስብስባችን", collectionDesc:"ምርትን ይንኩና ዝርዝሩን በሙሉ ስክሪን ይመልከቱ።",
  allProducts:"ሁሉም ምርቶች", howOrder:"እንዴት ማዘዝ ይቻላል", contactTitle:"ጥያቄ አለዎት?", contactDesc:"ለምርት፣ ለዋጋ ወይም ለትዕዛዝ በቀጥታ ያግኙን።",
  viewAll:"ሁሉንም ይመልከቱ", empty:"እስካሁን ምርት አልተጨመረም።", search:"ምርት ፈልግ",
  catalogTitle:"የባህላዊ ሙዚቃ መሣሪያዎች", catalogDesc:"ምርትን ይምረጡ፤ Like፣ Dislike፣ Comment እና የትዕዛዝ ብዛት ይመልከቱ።",
  aboutTitle:"ስለ አዩ ዜማ", contactPage:"አግኙን"
 }
};
function applyLanguage(){
 const t=translations[lang],nav=document.querySelectorAll(".customer-nav a");
 nav.forEach((a,i)=>{if(t.nav[i])a.textContent=t.nav[i];a.classList.toggle("active",a.getAttribute("href")===(location.pathname==="/" ? "/" : location.pathname))});
 const set=(sel,txt)=>{const e=$(sel);if(e&&txt)e.textContent=txt};
 set(".hero h1",t.heroTitle);set(".hero-copy>p",t.heroDesc);
 set(".hero-actions .gold-btn",t.shop);set(".hero-actions .outline-btn",t.about);
 set(".home-products .section-head h2",t.collection);set(".home-products .section-head .muted",t.collectionDesc);
 set(".home-products .text-link",t.viewAll);set(".craft-banner .eyebrow",t.howOrder);
 set(".home-contact h2",t.contactTitle);set(".home-contact p",t.contactDesc);
 set(".catalog-hero h1",t.catalogTitle);set(".catalog-hero>p",t.catalogDesc);
 const search=$("#search");if(search)search.placeholder=t.search;
 const cartBtn=document.querySelector(".cart-btn");if(cartBtn){const b=cartBtn.querySelector("b");cartBtn.childNodes[0].textContent="🛒 "+t.cart+" ";if(b)cartBtn.appendChild(b)}

 if(location.pathname==="/about.html"){
  set(".about-hero h1",lang==="en"?"About AYU ZEMA":"ስለ አዩ ዜማ");
  set(".about-hero p",lang==="en"?"Ethiopian culture, craftsmanship and music in one place.":"የኢትዮጵያ ባህል፣ ጥበብ እና ዜማ በአንድ ቦታ።");
  set(".story-card h2",lang==="en"?"Keeping culture alive through music":"ባህልን በዜማ እናቆያለን");
  set(".story-card p",lang==="en"?"AYU ZEMA is a platform for Ethiopian traditional musical instruments. Explore and order Krar, Masenqo, Washint, Kebero and related accessories here.":"አዩ ዜማ የኢትዮጵያን ባህላዊ የሙዚቃ መሳሪያዎች ለማቅረብ የተዘጋጀ የምርትና የመሸጫ መድረክ ነው።");
 }
 if(location.pathname==="/contact.html"){
  set("main>h1",lang==="en"?"Contact Us":"እኛን ያግኙ");
  set(".contact-info h2",lang==="en"?"Questions or Orders":"ለጥያቄ ወይም ለትዕዛዝ");
  const labs=document.querySelectorAll(".contact-form label");
  ["Full name","Phone number","Message"].forEach((v,i)=>{if(labs[i])labs[i].childNodes[0].textContent=lang==="en"?v:["ሙሉ ስም","ስልክ ቁጥር","መልዕክት"][i]});
  const b=$("#contactForm button");if(b)b.textContent=lang==="en"?"Send Message":"መልዕክት ላክ";
 }
 if(location.pathname==="/cart.html"){
  set("main>h1",lang==="en"?"Shopping Cart":"የግዢ ቅርጫት");
  set(".checkout-card h2",lang==="en"?"Place Your Order":"ትዕዛዝ ያስገቡ");
  const f=$("#checkout");if(f){f.elements.customerName.placeholder=lang==="en"?"Full name":"ሙሉ ስም";f.elements.phone.placeholder=lang==="en"?"Phone":"ስልክ";f.elements.address.placeholder=lang==="en"?"Delivery address":"የመላኪያ አድራሻ";f.elements.note.placeholder=lang==="en"?"Additional note":"ተጨማሪ መልዕክት"}
  const b=$("#checkout button");if(b)b.textContent=lang==="en"?"Place Order":"ትዕዛዝ ላክ";
 }

 document.documentElement.lang=lang;
}

loadProducts();
applyLanguage();

// Google sign-in and Firestore comments for the customer community section.
let ayuAuth=null,ayuDb=null,ayuCurrentUser=null;
function initAyuCommunity(){
 const note=document.querySelector('#firebaseNote'),signIn=document.querySelector('#googleSignIn'),signOut=document.querySelector('#googleSignOut'),form=document.querySelector('#siteCommentForm');
 if(!document.querySelector('#community'))return;
 const cfg=window.AYU_FIREBASE_CONFIG,configured=cfg&&cfg.apiKey&&!String(cfg.apiKey).startsWith('PASTE_')&&cfg.projectId&&!String(cfg.projectId).startsWith('PASTE_')&&cfg.appId&&!String(cfg.appId).startsWith('PASTE_');
 if(!configured||!window.firebase){if(note)note.textContent='Google Login ገና አልተዋቀረም። README.md ውስጥ ያለውን Firebase መመሪያ ይከተሉ።';if(signIn)signIn.disabled=true;const box=document.querySelector('#siteCommentsList');if(box)box.innerHTML='<p class="no-comments">Firebase ከተዋቀረ በኋላ የደንበኞች አስተያየት እዚህ ይታያል።</p>';return;}
 try{if(!firebase.apps.length)firebase.initializeApp(cfg);ayuAuth=firebase.auth();ayuDb=firebase.firestore();
 signIn.onclick=async()=>{try{await ayuAuth.signInWithPopup(new firebase.auth.GoogleAuthProvider())}catch(e){note.textContent='Google መግባት አልተሳካም፦ '+(e.code||e.message)}};signOut.onclick=()=>ayuAuth.signOut();
 ayuAuth.onAuthStateChanged(user=>{ayuCurrentUser=user||null;document.querySelector('#googleUserName').textContent=user?(user.displayName||'Google User'):'እንግዳ ተጠቃሚ';document.querySelector('#googleUserStatus').textContent=user?(user.email||'Google Account'):'አስተያየት ለመስጠት Google ይግቡ';signIn.hidden=!!user;signOut.hidden=!user;document.querySelector('#siteCommentText').disabled=!user;document.querySelector('#siteCommentSubmit').disabled=!user;note.textContent=user?'በGoogle Account ገብተዋል። አስተያየትዎን ያጋሩ።':'አስተያየት ለመስጠት Google Account ይጠቀሙ።'});
 form.onsubmit=async e=>{e.preventDefault();if(!ayuCurrentUser){note.textContent='መጀመሪያ Google ይግቡ።';return}const input=document.querySelector('#siteCommentText'),text=input.value.trim();if(!text)return;const btn=document.querySelector('#siteCommentSubmit');btn.disabled=true;try{await ayuDb.collection('siteComments').add({uid:ayuCurrentUser.uid,name:ayuCurrentUser.displayName||'Google User',photoURL:ayuCurrentUser.photoURL||'',text,createdAt:firebase.firestore.FieldValue.serverTimestamp()});input.value='';note.textContent='አስተያየትዎ ተልኳል። እናመሰግናለን!'}catch(err){note.textContent='አስተያየቱን ማስቀመጥ አልተቻለም። Firestore Rules ያረጋግጡ።'}finally{btn.disabled=!ayuCurrentUser}};
 ayuDb.collection('siteComments').orderBy('createdAt','desc').limit(40).onSnapshot(snap=>{const box=document.querySelector('#siteCommentsList');if(snap.empty){box.innerHTML='<p class="no-comments">እስካሁን አስተያየት የለም። የመጀመሪያ አስተያየት ይስጡ።</p>';return}box.innerHTML=snap.docs.map(doc=>{const c=doc.data(),date=c.createdAt?.toDate?c.createdAt.toDate().toLocaleDateString():'';const avatar=c.photoURL?`<img src="${esc(c.photoURL)}" alt="">`:'<span>G</span>';return `<article class="site-comment"><div class="site-comment-avatar">${avatar}</div><div class="site-comment-body"><b>${esc(c.name||'Google User')}</b><p>${esc(c.text||'')}</p><small>${esc(date)}</small></div></article>`}).join('')},()=>{note.textContent='አስተያየቶችን መጫን አልተቻለም። Firestore Rules ያረጋግጡ።'});
 }catch(e){if(note)note.textContent='Firebase ማስነሳት አልተቻለም። firebase-config.js ያረጋግጡ።'}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initAyuCommunity);else initAyuCommunity();
if(location.pathname==='/'||location.pathname==='/index.html'){const nav=[...document.querySelectorAll('.customer-nav a[href^="#"]')],sections=nav.map(a=>document.querySelector(a.hash)).filter(Boolean);const mark=()=>{let current=sections[0];sections.forEach(s=>{if(s.getBoundingClientRect().top<150)current=s});nav.forEach(a=>a.classList.toggle('active',a.hash==='#'+current.id))};window.addEventListener('scroll',mark,{passive:true});mark()}

// Extend the existing language switcher for the added home-page sections.
const ayuApplyLanguageBase=applyLanguage;
applyLanguage=function(){ayuApplyLanguageBase();if(!document.querySelector('#community'))return;const en=lang==='en';const set=(sel,value)=>{const el=document.querySelector(sel);if(el)el.textContent=value};set('#about .about-section-copy h2',en?'Keeping culture alive through music':'ባህልን በዜማ እናቆያለን');set('#about .about-section-copy p',en?'AYU ZEMA is a platform for Ethiopian traditional musical instruments. Explore and order Krar, Masenqo, Washint, Kebero and related accessories here.':'አዩ ዜማ የኢትዮጵያን ባህላዊ የሙዚቃ መሣሪያዎች ለማቅረብ የተዘጋጀ የምርትና የመሸጫ መድረክ ነው። ክራር፣ ማሲንቆ፣ ዋሽንት፣ ከበሮ እና ተያያዥ ዕቃዎችን እዚህ ማየትና ማዘዝ ይችላሉ።');set('#about .about-section-copy .gold-btn',en?'Explore Products ↗':'ምርቶችን ይመልከቱ ↗');set('#community .community-heading h2',en?'Customer Reviews':'የደንበኞቻችን አስተያየት');set('#community .community-heading p',en?'Sign in with Google and share your experience with us.':'በGoogle Account ይግቡና ስለ አገልግሎታችን አስተያየትዎን ያጋሩ።');set('#siteCommentText','');const ta=document.querySelector('#siteCommentText');if(ta)ta.placeholder=en?'Write your comment here...':'አስተያየትዎን እዚህ ይጻፉ...';set('#siteCommentSubmit',en?'Post Comment':'አስተያየት ላክ');set('#contact h2',en?'Have a question?':'ጥያቄ አለዎት?');set('#contact p',en?'Contact us directly about products, prices or orders.':'ለምርት፣ ለዋጋ ወይም ለትዕዛዝ በቀጥታ ያግኙን።');};
applyLanguage();
