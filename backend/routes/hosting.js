import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import { authenticate } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root directory where all sites live:  uploads/hosting/<userId>/<slug>/
const HOSTING_ROOT = path.join(__dirname, '../uploads/hosting');
await fs.mkdir(HOSTING_ROOT, { recursive: true });

// Allowed file extensions for security
const ALLOWED_EXT = new Set([
  '.html', '.htm', '.css', '.js', '.mjs',
  '.json', '.txt', '.svg', '.ico', '.webmanifest',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp3', '.mp4', '.webm', '.ogg',
]);

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9._-]/gi, '_').toLowerCase();
}

function slugify(s) {
  return s
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .substring(0, 40) || 'site';
}

// multer — store in memory, we write files ourselves after validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 200 }, // 10 MB per file, 200 files
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXT.has(ext)) return cb(null, true);
    cb(new Error(`Тип файла не разрешён: ${ext}`));
  },
});

// ─── Helper: build public URL for a site ─────────────────────────────────────
function publicUrl(req, userId, slug) {
  const base = process.env.PUBLIC_HOSTING_URL ||
    `${req.protocol}://${req.get('host')}`;
  return `${base}/hosted/${userId}/${slug}/`;
}

// ─── GET /api/hosting — list user's sites ────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, user_id, name, slug, description, created_at, updated_at, is_public
       FROM hosted_sites WHERE user_id = $1 ORDER BY updated_at DESC`,
      [req.user.id],
    );
    const sites = rows.map(s => ({
      ...s,
      url: publicUrl(req, req.user.id, s.slug),
    }));
    res.json({ sites });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── POST /api/hosting — create new site + upload files ──────────────────────
router.post('/', authenticate, upload.array('files'), async (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Укажите название сайта' });
  if (!req.files?.length) return res.status(400).json({ error: 'Добавьте хотя бы один файл' });

  const slug = slugify(name) + '-' + Date.now().toString(36);
  const siteDir = path.join(HOSTING_ROOT, String(req.user.id), slug);

  try {
    await fs.mkdir(siteDir, { recursive: true });

    // Write uploaded files
    for (const file of req.files) {
      const safeName = sanitizeFilename(file.originalname);
      const dest = path.join(siteDir, safeName);
      // Prevent path traversal
      if (!dest.startsWith(siteDir + path.sep) && dest !== siteDir) {
        continue;
      }
      await fs.writeFile(dest, file.buffer);
    }

    const { rows } = await pool.query(
      `INSERT INTO hosted_sites (user_id, name, slug, description, is_public)
       VALUES ($1, $2, $3, $4, true) RETURNING *`,
      [req.user.id, name.trim(), slug, description?.trim() || null],
    );

    res.json({ site: { ...rows[0], url: publicUrl(req, req.user.id, slug) } });
  } catch (err) {
    console.error(err);
    await fs.rm(siteDir, { recursive: true, force: true });
    res.status(500).json({ error: 'Ошибка при создании сайта' });
  }
});

// ─── POST /api/hosting/:id/files — upload more files to existing site ────────
router.post('/:id/files', authenticate, upload.array('files'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM hosted_sites WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Сайт не найден' });
    const site = rows[0];
    const siteDir = path.join(HOSTING_ROOT, String(req.user.id), site.slug);

    for (const file of req.files || []) {
      const safeName = sanitizeFilename(file.originalname);
      const dest = path.join(siteDir, safeName);
      if (!dest.startsWith(siteDir + path.sep) && dest !== siteDir) continue;
      await fs.writeFile(dest, file.buffer);
    }

    await pool.query('UPDATE hosted_sites SET updated_at = NOW() WHERE id = $1', [site.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка загрузки файлов' });
  }
});

// ─── DELETE /api/hosting/:id/files/:filename — delete one file ───────────────
router.delete('/:id/files/:filename', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM hosted_sites WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Сайт не найден' });
    const site = rows[0];
    const siteDir = path.join(HOSTING_ROOT, String(req.user.id), site.slug);
    const target = path.join(siteDir, sanitizeFilename(req.params.filename));

    if (!target.startsWith(siteDir + path.sep)) {
      return res.status(400).json({ error: 'Недопустимый путь' });
    }
    await fs.rm(target, { force: true });
    await pool.query('UPDATE hosted_sites SET updated_at = NOW() WHERE id = $1', [site.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка удаления' });
  }
});

// ─── DELETE /api/hosting/:id — delete entire site ────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM hosted_sites WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Сайт не найден' });
    const site = rows[0];
    const siteDir = path.join(HOSTING_ROOT, String(req.user.id), site.slug);

    await fs.rm(siteDir, { recursive: true, force: true });
    await pool.query('DELETE FROM hosted_sites WHERE id = $1', [site.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка удаления' });
  }
});

// ─── PATCH /api/hosting/:id — toggle public / rename ─────────────────────────
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { is_public, description } = req.body;
    const { rows } = await pool.query(
      `UPDATE hosted_sites
       SET is_public = COALESCE($1, is_public),
           description = COALESCE($2, description),
           updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [is_public, description, req.params.id, req.user.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Сайт не найден' });
    res.json({ site: { ...rows[0], url: publicUrl(req, req.user.id, rows[0].slug) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка обновления' });
  }
});

// ─── Helpers for tree-based file manager ─────────────────────────────────────

async function getSite(req) {
  const { rows } = await pool.query(
    'SELECT * FROM hosted_sites WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id],
  );
  return rows[0] || null;
}

function resolveSafe(siteDir, userPath) {
  const clean = path.posix
    .normalize('/' + String(userPath || '').replace(/\\/g, '/'))
    .slice(1); // strip leading slash
  if (clean.includes('..') || path.isAbsolute(clean)) return null;
  const resolved = clean ? path.join(siteDir, clean) : siteDir;
  if (resolved !== siteDir && !resolved.startsWith(siteDir + path.sep)) return null;
  return resolved;
}

async function buildTree(dir, siteDir) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return []; }
  const items = [];
  for (const e of entries) {
    const fp = path.join(dir, e.name);
    const relPath = path.relative(siteDir, fp).replace(/\\/g, '/');
    if (e.isDirectory()) {
      items.push({ type: 'dir', name: e.name, path: relPath, children: await buildTree(fp, siteDir) });
    } else if (e.isFile()) {
      const st = await fs.stat(fp);
      items.push({ type: 'file', name: e.name, path: relPath, size: st.size, mtime: st.mtime });
    }
  }
  items.sort((a, b) => (a.type !== b.type) ? (a.type === 'dir' ? -1 : 1) : a.name.localeCompare(b.name));
  return items;
}

// ─── GET /api/hosting/:id/files — now returns tree ───────────────────────────
// (replaces the old flat-list route; old route is removed above)
router.get('/:id/files', authenticate, async (req, res) => {
  try {
    const site = await getSite(req);
    if (!site) return res.status(404).json({ error: 'Сайт не найден' });
    const siteDir = path.join(HOSTING_ROOT, String(req.user.id), site.slug);
    const tree = await buildTree(siteDir, siteDir);
    res.json({ tree });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── GET /api/hosting/:id/file?p= — read text file content ───────────────────
router.get('/:id/file', authenticate, async (req, res) => {
  try {
    const site = await getSite(req);
    if (!site) return res.status(404).json({ error: 'Сайт не найден' });
    const siteDir = path.join(HOSTING_ROOT, String(req.user.id), site.slug);
    const target = resolveSafe(siteDir, req.query.p);
    if (!target || target === siteDir) return res.status(400).json({ error: 'Недопустимый путь' });
    const st = await fs.stat(target);
    if (st.isDirectory()) return res.status(400).json({ error: 'Это папка, не файл' });
    if (st.size > 512 * 1024) return res.status(400).json({ error: 'Файл слишком большой для редактора (>512 КБ)' });
    const content = await fs.readFile(target, 'utf8');
    res.json({ content, size: st.size });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Файл не найден' });
    console.error(err);
    res.status(500).json({ error: 'Ошибка чтения файла' });
  }
});

// ─── PUT /api/hosting/:id/file?p= — save text file content ───────────────────
router.put('/:id/file', authenticate, async (req, res) => {
  try {
    const site = await getSite(req);
    if (!site) return res.status(404).json({ error: 'Сайт не найден' });
    const siteDir = path.join(HOSTING_ROOT, String(req.user.id), site.slug);
    const target = resolveSafe(siteDir, req.query.p);
    if (!target || target === siteDir) return res.status(400).json({ error: 'Недопустимый путь' });
    const ext = path.extname(target).toLowerCase();
    if (ext && !ALLOWED_EXT.has(ext)) return res.status(400).json({ error: 'Тип файла не разрешён' });
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, String(req.body.content ?? ''), 'utf8');
    await pool.query('UPDATE hosted_sites SET updated_at = NOW() WHERE id = $1', [site.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сохранения' });
  }
});

// ─── POST /api/hosting/:id/rename — rename or move item ──────────────────────
router.post('/:id/rename', authenticate, async (req, res) => {
  try {
    const site = await getSite(req);
    if (!site) return res.status(404).json({ error: 'Сайт не найден' });
    const siteDir = path.join(HOSTING_ROOT, String(req.user.id), site.slug);
    const from = resolveSafe(siteDir, req.body.from);
    const to   = resolveSafe(siteDir, req.body.to);
    if (!from || !to) return res.status(400).json({ error: 'Недопустимый путь' });
    if (from === siteDir || to === siteDir) return res.status(400).json({ error: 'Нельзя переместить корень' });
    // Fail if destination already exists
    try { await fs.access(to); return res.status(400).json({ error: 'Файл/папка с таким именем уже существует' }); } catch { /* good */ }
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.rename(from, to);
    await pool.query('UPDATE hosted_sites SET updated_at = NOW() WHERE id = $1', [site.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка переименования' });
  }
});

// ─── POST /api/hosting/:id/mkdir — create directory ──────────────────────────
router.post('/:id/mkdir', authenticate, async (req, res) => {
  try {
    const site = await getSite(req);
    if (!site) return res.status(404).json({ error: 'Сайт не найден' });
    const siteDir = path.join(HOSTING_ROOT, String(req.user.id), site.slug);
    const target = resolveSafe(siteDir, req.body.dir);
    if (!target || target === siteDir) return res.status(400).json({ error: 'Недопустимый путь' });
    try {
      await fs.mkdir(target);
    } catch (err) {
      if (err.code === 'EEXIST') return res.status(400).json({ error: 'Папка уже существует' });
      throw err;
    }
    await pool.query('UPDATE hosted_sites SET updated_at = NOW() WHERE id = $1', [site.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка создания папки' });
  }
});

// ─── POST /api/hosting/:id/touch — create new file ───────────────────────────
router.post('/:id/touch', authenticate, async (req, res) => {
  try {
    const site = await getSite(req);
    if (!site) return res.status(404).json({ error: 'Сайт не найден' });
    const siteDir = path.join(HOSTING_ROOT, String(req.user.id), site.slug);
    const target = resolveSafe(siteDir, req.body.path);
    if (!target || target === siteDir) return res.status(400).json({ error: 'Недопустимый путь' });
    const ext = path.extname(target).toLowerCase();
    if (ext && !ALLOWED_EXT.has(ext)) return res.status(400).json({ error: 'Тип файла не разрешён' });
    try { await fs.access(target); return res.status(400).json({ error: 'Файл уже существует' }); } catch { /* good */ }
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, String(req.body.content ?? ''), 'utf8');
    await pool.query('UPDATE hosted_sites SET updated_at = NOW() WHERE id = $1', [site.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка создания файла' });
  }
});

// ─── DELETE /api/hosting/:id/item?p= — delete file or folder ─────────────────
router.delete('/:id/item', authenticate, async (req, res) => {
  try {
    const site = await getSite(req);
    if (!site) return res.status(404).json({ error: 'Сайт не найден' });
    const siteDir = path.join(HOSTING_ROOT, String(req.user.id), site.slug);
    const target = resolveSafe(siteDir, req.query.p);
    if (!target || target === siteDir) return res.status(400).json({ error: 'Недопустимый путь' });
    await fs.rm(target, { recursive: true, force: true });
    await pool.query('UPDATE hosted_sites SET updated_at = NOW() WHERE id = $1', [site.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка удаления' });
  }
});

// ─── GET /api/hosting/:id/download?p= — download file or folder as zip ──────
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const site = await getSite(req);
    if (!site) return res.status(404).json({ error: 'Сайт не найден' });
    const siteDir = path.join(HOSTING_ROOT, String(req.user.id), site.slug);
    const target = resolveSafe(siteDir, req.query.p);
    if (!target || target === siteDir) return res.status(400).json({ error: 'Недопустимый путь' });
    const st = await fs.stat(target).catch(() => null);
    if (!st) return res.status(404).json({ error: 'Файл не найден' });

    if (st.isFile()) {
      const filename = encodeURIComponent(path.basename(target));
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', st.size);
      createReadStream(target).pipe(res);
    } else {
      const dirname = path.basename(target);
      const zipname = encodeURIComponent(dirname + '.zip');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${zipname}`);
      res.setHeader('Content-Type', 'application/zip');
      const archive = archiver('zip', { zlib: { level: 5 } });
      archive.on('error', err => { console.error(err); if (!res.headersSent) res.end(); });
      archive.pipe(res);
      archive.directory(target, dirname);
      archive.finalize();
    }
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: 'Ошибка скачивания' });
  }
});

// ─── GET /api/hosting/:id/download-all — download entire site as zip ─────────
router.get('/:id/download-all', authenticate, async (req, res) => {
  try {
    const site = await getSite(req);
    if (!site) return res.status(404).json({ error: 'Сайт не найден' });
    const siteDir = path.join(HOSTING_ROOT, String(req.user.id), site.slug);
    const zipname = encodeURIComponent(site.slug + '.zip');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${zipname}`);
    res.setHeader('Content-Type', 'application/zip');
    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.on('error', err => { console.error(err); if (!res.headersSent) res.end(); });
    archive.pipe(res);
    archive.directory(siteDir, site.slug);
    archive.finalize();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: 'Ошибка скачивания' });
  }
});

export default router;
