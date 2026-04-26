import { auth } from '../servicios/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { tursoQuery, sincronizarUsuario } from '../servicios/db.js';

const ADMIN_TEST_EMAILS = new Set(['admin.test@gmail.com', 'test@gmail.com']);
const params = new URLSearchParams(location.search);
const isLocalHost = ['localhost', '127.0.0.1', ''].includes(location.hostname);
const qaLocalMode = params.get('qa_local') === '1' && isLocalHost;

const usersBody = document.getElementById('usersBody');
const meta = document.getElementById('meta');
const reloadBtn = document.getElementById('reloadBtn');
const backBtn = document.getElementById('backBtn');

backBtn.addEventListener('click', () => {
  history.length > 1 ? history.back() : (location.href = 'Home.html');
});

function fmtDate(ts) {
  if (!ts) return '—';
  const n = Number(ts);
  if (Number.isNaN(n)) return '—';
  return new Date(n).toLocaleString('es-MX');
}

function rowHtml(user) {
  return `
    <tr>
      <td><code>${user.uid || '—'}</code></td>
      <td>${user.nombre || '—'}</td>
      <td>${user.email || '—'}</td>
      <td>${fmtDate(user.updated_at)}</td>
    </tr>
  `;
}

async function loadUsers() {
  reloadBtn.disabled = true;
  meta.textContent = 'Cargando usuarios…';
  try {
    const rows = await tursoQuery(
      `SELECT uid, nombre, email, updated_at FROM usuarios ORDER BY updated_at DESC LIMIT 250`
    );

    usersBody.innerHTML = rows.length
      ? rows.map(rowHtml).join('')
      : '<tr><td colspan="4">No hay usuarios para mostrar.</td></tr>';

    meta.textContent = `${rows.length} usuario(s) cargados.`;
  } catch (err) {
    console.error('Error cargando usuarios:', err);
    usersBody.innerHTML = '<tr><td colspan="4">No se pudieron cargar usuarios.</td></tr>';
    meta.textContent = 'Error al cargar.';
  } finally {
    reloadBtn.disabled = false;
  }
}

reloadBtn.addEventListener('click', loadUsers);

function loadMockUsers() {
  const now = Date.now();
  const mocks = [
    { uid: 'qa-admin-001', nombre: 'Admin QA', email: 'admin.test@gmail.com', updated_at: now - 60_000 },
    { uid: 'qa-user-002', nombre: 'Tester 1', email: 'test@gmail.com', updated_at: now - 120_000 },
    { uid: 'qa-user-003', nombre: 'Tester 2', email: 'tester2@gmail.com', updated_at: now - 240_000 }
  ];
  usersBody.innerHTML = mocks.map(rowHtml).join('');
  meta.textContent = `Modo QA local activo (${mocks.length} usuarios mock).`;
  reloadBtn.disabled = false;
}

if (qaLocalMode) {
  loadMockUsers();
} else {
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = 'index.html';
    return;
  }

  const email = (user.email || '').toLowerCase();
  if (!ADMIN_TEST_EMAILS.has(email)) {
    usersBody.innerHTML = '<tr><td colspan="4">Acceso denegado: esta vista de pruebas es solo para admin de QA.</td></tr>';
    meta.textContent = 'Solo permitido para cuentas QA autorizadas.';
    reloadBtn.disabled = true;
    return;
  }

  window.__snapbookUser = user;
  await sincronizarUsuario(user).catch(() => {});
  await loadUsers();
});
}
