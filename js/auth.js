
window.addEventListener('error', (event) => {
  console.error('Admin startup error:', event.error || event.message);
  document.body.classList.remove('auth-loading', 'auth-signed-in');
  document.body.classList.add('auth-signed-out');
  const target = document.querySelector('#login-error');
  if (target && !target.textContent) {
    target.textContent = 'No fue posible iniciar el administrador. Recarga la página o revisa la conexión.';
    target.classList.add('is-visible');
  }
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('Admin startup rejection:', event.reason);
  document.body.classList.remove('auth-loading', 'auth-signed-in');
  document.body.classList.add('auth-signed-out');
});

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const config = window.CASA_GLICK_FIREBASE_CONFIG || {};
const loginForm = document.querySelector('#login-form');
const emailInput = document.querySelector('#login-email');
const passwordInput = document.querySelector('#login-password');
const submitButton = document.querySelector('#login-submit');
const errorElement = document.querySelector('#login-error');
const passwordToggle = document.querySelector('#password-toggle');
let adminLoaded = false;

function icons() {
  window.lucide?.createIcons?.({ attrs: { 'aria-hidden': 'true' } });
}

function isConfigured() {
  return ['apiKey', 'authDomain', 'projectId', 'appId'].every((key) => String(config[key] || '').trim());
}

function setError(message = '') {
  errorElement.textContent = message;
  errorElement.classList.toggle('is-visible', Boolean(message));
}

function setLoading(loading) {
  submitButton.disabled = loading;
  submitButton.classList.toggle('is-loading', loading);
  submitButton.querySelector('span').textContent = loading ? 'Ingresando…' : 'Ingresar';
}

function loadAdmin() {
  if (adminLoaded) return;
  adminLoaded = true;
  const script = document.createElement('script');
  script.src = 'js/admin.js?v=40';
  script.defer = true;
  document.body.appendChild(script);
}

function showAdmin(user) {
  document.body.classList.remove('auth-loading', 'auth-signed-out');
  document.body.classList.add('auth-signed-in');
  document.body.dataset.userEmail = user.email || '';
  document.body.dataset.userUid = user.uid || '';
  loadAdmin();
  icons();
}

function showLogin() {
  document.body.classList.remove('auth-loading', 'auth-signed-in');
  document.body.classList.add('auth-signed-out');
  passwordInput.value = '';
  setLoading(false);
  setTimeout(() => emailInput.focus(), 80);
  icons();
}

function authErrorMessage(error) {
  const code = error?.code || '';
  if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') return 'El correo o la contraseña no son correctos.';
  if (code === 'auth/invalid-email') return 'Ingresa un correo electrónico válido.';
  if (code === 'auth/too-many-requests') return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
  if (code === 'auth/network-request-failed') return 'No fue posible conectarse. Revisa tu conexión a internet.';
  return 'No fue posible iniciar sesión. Inténtalo nuevamente.';
}

icons();

if (!isConfigured()) {
  document.body.classList.remove('auth-loading');
  document.body.classList.add('auth-signed-out');
  setError('Falta configurar Firebase en js/firebase-config.js.');
  submitButton.disabled = true;
} else {
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const overridesCollection = collection(db, 'catalogProductOverrides');
  const settingsRef = doc(db, 'catalogSettings', 'admin');
  const shopContentRef = doc(db, 'shopContent', 'home');
const websiteContentRef = doc(db, 'websiteContent', 'home');

  window.CasaGlickFirestore = {
    async loadOverrides() {
      const snapshot = await getDocs(overridesCollection);
      const result = {};
      snapshot.forEach((item) => { result[item.id] = item.data(); });
      return result;
    },
    async saveOverride(productId, data) {
      await setDoc(doc(db, 'catalogProductOverrides', productId), {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || ''
      }, { merge: true });
    },
    async saveOverridesBulk(entries) {
      const chunks = [];
      for (let i = 0; i < entries.length; i += 450) chunks.push(entries.slice(i, i + 450));
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(({ id, data }) => {
          batch.set(doc(db, 'catalogProductOverrides', id), {
            ...data,
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser?.email || ''
          }, { merge: true });
        });
        await batch.commit();
      }
    },
    async loadSettings() {
      const snapshot = await getDoc(settingsRef);
      return snapshot.exists() ? snapshot.data() : {};
    },
    async saveSettings(data) {
      await setDoc(settingsRef, {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || ''
      }, { merge: true });
    },
    async loadWebContent(siteKey = 'shop') {
      const ref = siteKey === 'website' ? websiteContentRef : shopContentRef;
      const snapshot = await getDoc(ref);
      return snapshot.exists() ? snapshot.data() : {};
    },
    async saveWebContent(siteKey = 'shop', data = {}) {
      const ref = siteKey === 'website' ? websiteContentRef : shopContentRef;
      await setDoc(ref, {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || ''
      }, { merge: true });
    },
    async loadShopContent() { return this.loadWebContent('shop'); },
    async saveShopContent(data) {
      await setDoc(shopContentRef, {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || ''
      }, { merge: true });
    },
    async uploadShopContentImage(sectionKey, file, siteKey = 'shop') {
      if (!auth.currentUser) throw new Error('La sesión administrativa no está disponible.');
      const token = await auth.currentUser.getIdToken();
      const formData = new FormData();
      formData.append('section', sectionKey);
      formData.append('scope', siteKey === 'website' ? 'website-content' : 'shop-content');
      formData.append('image', file, file.name || 'image');
      const endpointCandidates = [
        new URL('/api/upload-shop-image.php', window.location.origin).href,
        new URL('/upload-shop-image.php', window.location.origin).href,
        new URL('api/upload-shop-image.php', window.location.href).href
      ];
      let lastError = new Error('No fue posible localizar el servicio de carga de imágenes.');
      for (const endpoint of [...new Set(endpointCandidates)]) {
        const requestBody = new FormData();
        requestBody.append('section', sectionKey);
        requestBody.append('scope', siteKey === 'website' ? 'website-content' : 'shop-content');
        requestBody.append('image', file, file.name || 'image');
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: requestBody,
            credentials: 'same-origin'
          });
          let payload = {};
          try { payload = await response.json(); } catch {}
          if (response.ok && payload?.ok && payload?.url) return payload.url;
          lastError = new Error(payload?.error || `No fue posible subir la imagen (HTTP ${response.status}) en ${endpoint}.`);
          if (response.status !== 404) throw lastError;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          if (!/HTTP 404/.test(lastError.message)) throw lastError;
        }
      }
      throw lastError;
    },
    async saveShopContentImage(sectionKey, imageUrl) {
      await updateDoc(shopContentRef, {
        [`${sectionKey}.imageUrl`]: imageUrl,
        [`sections.${sectionKey}.imageUrl`]: imageUrl,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || ''
      });
    },
    async loadOrders() {
      const snapshot = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
      return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    },
    subscribeOrders(onChange, onError) {
      const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      return onSnapshot(
        ordersQuery,
        (snapshot) => onChange(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))),
        (error) => {
          console.error('Orders listener error:', error);
          if (typeof onError === 'function') onError(error);
        }
      );
    },
    async updateOrderStatus(orderId, status) {
      await updateDoc(doc(db, 'orders', orderId), {
        status,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || ''
      });
    },
    async deleteOrder(orderId) {
      await deleteDoc(doc(db, 'orders', orderId));
    },
    async loadMessages() {
      const snapshot = await getDocs(query(collection(db, 'contactMessages'), orderBy('createdAt', 'desc')));
      return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    },
    subscribeMessages(onChange, onError) {
      const messagesQuery = query(collection(db, 'contactMessages'), orderBy('createdAt', 'desc'));
      return onSnapshot(
        messagesQuery,
        (snapshot) => onChange(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))),
        (error) => {
          console.error('Messages listener error:', error);
          if (typeof onError === 'function') onError(error);
        }
      );
    },
    async updateMessageStatus(messageId, status) {
      await updateDoc(doc(db, 'contactMessages', messageId), {
        status,
        readAt: status === 'read' ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || ''
      });
    },
    async deleteMessage(messageId) {
      await deleteDoc(doc(db, 'contactMessages', messageId));
    }
  };

  setPersistence(auth, browserLocalPersistence).catch(console.error);

  onAuthStateChanged(auth, (user) => {
    if (user) showAdmin(user);
    else showLogin();
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setError('');
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
      setError('Completa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setError(authErrorMessage(error));
      setLoading(false);
    }
  });

  document.addEventListener('click', async (event) => {
    if (!event.target.closest('#logout-button')) return;
    await signOut(auth);
  });
}

passwordToggle.addEventListener('click', () => {
  const hidden = passwordInput.type === 'password';
  passwordInput.type = hidden ? 'text' : 'password';
  passwordToggle.setAttribute('aria-label', hidden ? 'Ocultar contraseña' : 'Mostrar contraseña');
  passwordToggle.innerHTML = `<i data-lucide="${hidden ? 'eye-off' : 'eye'}"></i>`;
  icons();
});
