import { auth } from '../servicios/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { tursoQuery, sincronizarUsuario } from '../servicios/db.js';

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

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = 'index.html';
    return;
  }

  window.__snapbookUser = user;
  await sincronizarUsuario(user).catch(() => {});
  await loadUsers();
});
