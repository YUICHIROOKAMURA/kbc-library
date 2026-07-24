import { useState, useEffect } from "react";

const SUPABASE_URL = "https://szfwxjlwiyskswoqtytn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6Znd4amx3aXlza3N3b3F0eXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NzI1MjAsImV4cCI6MjEwMDI0ODUyMH0.Je77dspoDsZqKWeMcBdjAXwLdVKnX2SwyTaVYZm4frs";
const ADMIN_PASSWORD = "kazu1969";

const api = async (method, body) => {
  const opts = {
    method,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/resources${method === "GET" ? "?order=created_at.desc" : ""}`, opts);
  return method === "DELETE" ? res.ok : res.json();
};

const apiById = async (method, id, body) => {
  const opts = {
    method,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/resources?id=eq.${id}`, opts);
  return method === "DELETE" ? res.ok : res.json();
};

const COLORS = {
  bg: "#0f1117",
  surface: "#1a1d27",
  card: "#21253a",
  accent: "#4f8ef7",
  accentSoft: "#4f8ef720",
  text: "#e8eaf0",
  muted: "#8892a4",
  border: "#2a2f45",
  success: "#34d399",
  danger: "#f87171",
  tag: "#2d3555",
};

export default function App() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ title: "", url: "", category: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState(null);

  const [fetchError, setFetchError] = useState(null);

  const fetchResources = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await api("GET");
      if (!Array.isArray(data)) {
        console.error("Unexpected response:", data);
        setFetchError(typeof data === "object" ? JSON.stringify(data) : String(data));
        setResources([]);
      } else {
        setResources(data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setFetchError(err.message || String(err));
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResources(); }, []);

  const categories = ["すべて", ...Array.from(new Set(resources.map(r => r.category).filter(Boolean)))];

  const filtered = resources.filter(r => {
    const matchCat = selectedCategory === "すべて" || r.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || r.title.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const handleLogin = () => {
    if (pwInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLogin(false);
      setPwInput("");
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ title: "", url: "", category: "", description: "" });
    setShowForm(true);
  };

  const openEdit = (r) => {
    setEditTarget(r);
    setForm({ title: r.title, url: r.url, category: r.category, description: r.description || "" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.url || !form.category) return;
    setSaving(true);
    if (editTarget) {
      await apiById("PATCH", editTarget.id, form);
    } else {
      await api("POST", form);
    }
    await fetchResources();
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await apiById("DELETE", id);
    setDeleteConfirm(null);
    await fetchResources();
  };

  const parseBulkLine = (line) => {
    const parts = line.split("|").map(p => p.trim());
    if (parts.length < 3) return null;
    const [title, url, category, description] = parts;
    if (!title || !url || !category) return null;
    return { title, url, category, description: description || "" };
  };

  const handleBulkSave = async () => {
    const lines = bulkText.split("\n").map(l => l.trim()).filter(Boolean);
    const items = [];
    const badLines = [];
    lines.forEach((line, i) => {
      const parsed = parseBulkLine(line);
      if (parsed) items.push(parsed);
      else badLines.push(i + 1);
    });
    if (items.length === 0) {
      setBulkError("有効な行がありませんでした。「タイトル | URL | カテゴリ」の形式で入力してください。");
      return;
    }
    setBulkSaving(true);
    setBulkError(null);
    try {
      const result = await api("POST", items);
      if (!Array.isArray(result)) {
        setBulkError(typeof result === "object" ? JSON.stringify(result) : String(result));
      } else {
        await fetchResources();
        setShowBulk(false);
        setBulkText("");
        if (badLines.length > 0) {
          setBulkError(`${badLines.length}行は形式が不正のためスキップしました（${badLines.join(", ")}行目）`);
        }
      }
    } catch (err) {
      setBulkError(err.message || String(err));
    } finally {
      setBulkSaving(false);
    }
  };

  const s = {
    wrap: { minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif", padding: "0 0 80px" },
    header: { background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 },
    logo: { fontSize: "18px", fontWeight: 700, color: COLORS.text, letterSpacing: "-0.3px" },
    logoAccent: { color: COLORS.accent },
    adminBtn: { background: isAdmin ? COLORS.accentSoft : "transparent", border: `1px solid ${isAdmin ? COLORS.accent : COLORS.border}`, color: isAdmin ? COLORS.accent : COLORS.muted, borderRadius: "8px", padding: "6px 14px", fontSize: "13px", cursor: "pointer" },
    body: { maxWidth: "720px", margin: "0 auto", padding: "24px 16px 0" },
    searchBar: { width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: "12px", padding: "12px 16px", color: COLORS.text, fontSize: "15px", outline: "none", boxSizing: "border-box", marginBottom: "16px" },
    catRow: { display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" },
    catBtn: (active) => ({ background: active ? COLORS.accent : COLORS.surface, color: active ? "#fff" : COLORS.muted, border: `1px solid ${active ? COLORS.accent : COLORS.border}`, borderRadius: "20px", padding: "6px 14px", fontSize: "13px", cursor: "pointer", transition: "all 0.15s" }),
    addBtn: { background: COLORS.accent, color: "#fff", border: "none", borderRadius: "12px", padding: "12px 20px", fontSize: "15px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px", width: "100%" },
    card: { background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "14px", padding: "18px", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "8px" },
    cardTitle: { fontSize: "16px", fontWeight: 700, color: COLORS.text },
    cardDesc: { fontSize: "13px", color: COLORS.muted, lineHeight: 1.6 },
    cardTag: { display: "inline-block", background: COLORS.tag, color: COLORS.accent, borderRadius: "6px", padding: "3px 10px", fontSize: "12px", fontWeight: 600 },
    cardLink: { color: COLORS.accent, fontSize: "13px", textDecoration: "none", wordBreak: "break-all" },
    cardActions: { display: "flex", gap: "8px", marginTop: "4px" },
    editBtn: { background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: "8px", padding: "6px 14px", fontSize: "13px", cursor: "pointer" },
    delBtn: { background: "#f8717120", color: COLORS.danger, border: "none", borderRadius: "8px", padding: "6px 14px", fontSize: "13px", cursor: "pointer" },
    overlay: { position: "fixed", inset: 0, background: "#00000088", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" },
    modal: { background: COLORS.surface, borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: "600px", maxHeight: "85vh", overflowY: "auto" },
    modalTitle: { fontSize: "18px", fontWeight: 700, marginBottom: "20px" },
    label: { fontSize: "13px", color: COLORS.muted, marginBottom: "6px", display: "block" },
    input: { width: "100%", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "10px", padding: "11px 14px", color: COLORS.text, fontSize: "15px", outline: "none", boxSizing: "border-box", marginBottom: "16px" },
    textarea: { width: "100%", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "10px", padding: "11px 14px", color: COLORS.text, fontSize: "14px", outline: "none", boxSizing: "border-box", marginBottom: "12px", fontFamily: "monospace", resize: "vertical" },
    bulkBtn: { background: "transparent", color: COLORS.accent, border: `1px solid ${COLORS.accent}`, borderRadius: "12px", padding: "12px 20px", fontSize: "14px", fontWeight: 600, cursor: "pointer", width: "100%", marginBottom: "20px", marginTop: "-12px" },
    hint: { fontSize: "12px", color: COLORS.muted, marginBottom: "16px", lineHeight: 1.6 },
    saveBtn: { background: COLORS.accent, color: "#fff", border: "none", borderRadius: "12px", padding: "13px", fontSize: "15px", fontWeight: 600, cursor: "pointer", width: "100%", marginTop: "4px" },
    cancelBtn: { background: "transparent", color: COLORS.muted, border: `1px solid ${COLORS.border}`, borderRadius: "12px", padding: "13px", fontSize: "15px", cursor: "pointer", width: "100%", marginTop: "8px" },
    empty: { textAlign: "center", color: COLORS.muted, padding: "60px 0", fontSize: "15px" },
  };

  return (
    <div style={s.wrap}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.logo}>
          <span style={s.logoAccent}>KBC</span> 資料ライブラリ
        </div>
        <button style={s.adminBtn} onClick={() => isAdmin ? setIsAdmin(false) : setShowLogin(true)}>
          {isAdmin ? "✓ 管理者モード" : "管理者ログイン"}
        </button>
      </div>

      <div style={s.body}>
        {/* Search */}
        <input
          style={s.searchBar}
          placeholder="🔍 資料を検索..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />

        {/* Categories */}
        <div style={s.catRow}>
          {categories.map(cat => (
            <button key={cat} style={s.catBtn(selectedCategory === cat)} onClick={() => setSelectedCategory(cat)}>
              {cat}
            </button>
          ))}
        </div>

        {/* Add button (admin only) */}
        {isAdmin && (
          <button style={s.addBtn} onClick={openAdd}>
            ＋ 新しい資料を追加
          </button>
        )}
        {isAdmin && (
          <button style={s.bulkBtn} onClick={() => { setBulkText(""); setBulkError(null); setShowBulk(true); }}>
            ＋ 複数まとめて追加
          </button>
        )}

        {/* Resource list */}
        {loading ? (
          <div style={s.empty}>読み込み中...</div>
        ) : fetchError ? (
          <div style={{ ...s.empty, color: COLORS.danger }}>
            エラーが発生しました：<br />{fetchError}
            <div style={{ marginTop: "12px" }}>
              <button style={s.editBtn} onClick={fetchResources}>再読み込み</button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>資料がありません</div>
        ) : (
          filtered.map(r => (
            <div key={r.id} style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={s.cardTag}>{r.category}</span>
                <span style={{ fontSize: "11px", color: COLORS.muted }}>
                  {new Date(r.created_at).toLocaleDateString("ja-JP")}
                </span>
              </div>
              <div style={s.cardTitle}>{r.title}</div>
              {r.description && <div style={s.cardDesc}>{r.description}</div>}
              <a href={r.url} target="_blank" rel="noreferrer" style={s.cardLink}>
                🔗 {r.url}
              </a>
              {isAdmin && (
                <div style={s.cardActions}>
                  <button style={s.editBtn} onClick={() => openEdit(r)}>編集</button>
                  <button style={s.delBtn} onClick={() => setDeleteConfirm(r.id)}>削除</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Login modal */}
      {showLogin && (
        <div style={s.overlay} onClick={() => setShowLogin(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>管理者ログイン</div>
            <label style={s.label}>パスワード</label>
            <input
              style={{ ...s.input, borderColor: pwError ? COLORS.danger : COLORS.border }}
              type="password"
              value={pwInput}
              onChange={e => { setPwInput(e.target.value); setPwError(false); }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="パスワードを入力"
              autoFocus
            />
            {pwError && <div style={{ color: COLORS.danger, fontSize: "13px", marginTop: "-12px", marginBottom: "12px" }}>パスワードが違います</div>}
            <button style={s.saveBtn} onClick={handleLogin}>ログイン</button>
            <button style={s.cancelBtn} onClick={() => setShowLogin(false)}>キャンセル</button>
          </div>
        </div>
      )}

      {/* Add/Edit form modal */}
      {showForm && (
        <div style={s.overlay} onClick={() => setShowForm(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>{editTarget ? "資料を編集" : "資料を追加"}</div>
            <label style={s.label}>タイトル *</label>
            <input style={s.input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="例：支援計画シート" />
            <label style={s.label}>URL *</label>
            <input style={s.input} value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
            <label style={s.label}>カテゴリ *</label>
            <input style={s.input} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="例：就労支援・アセスメント" />
            <label style={s.label}>説明（任意）</label>
            <input style={s.input} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="資料の概要や使い方など" />
            <button style={{ ...s.saveBtn, opacity: (!form.title || !form.url || !form.category) ? 0.5 : 1 }} onClick={handleSave} disabled={saving || !form.title || !form.url || !form.category}>
              {saving ? "保存中..." : "保存する"}
            </button>
            <button style={s.cancelBtn} onClick={() => setShowForm(false)}>キャンセル</button>
          </div>
        </div>
      )}

      {/* Bulk add modal */}
      {showBulk && (
        <div style={s.overlay} onClick={() => setShowBulk(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>複数まとめて追加</div>
            <div style={s.hint}>
              1行に1件、以下の形式で入力してください（説明は省略可）：<br />
              <strong>タイトル | URL | カテゴリ | 説明</strong><br />
              例：支援計画シート | https://github.com/xxx/yyy | 就労支援・アセスメント | 面談時に使用
            </div>
            <textarea
              style={s.textarea}
              rows={10}
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={"支援計画シート | https://github.com/xxx/yyy | 就労支援・アセスメント | 面談時に使用\n認知行動療法まとめ | https://github.com/xxx/zzz | 心理教育資料"}
            />
            {bulkError && <div style={{ color: COLORS.danger, fontSize: "13px", marginBottom: "12px" }}>{bulkError}</div>}
            <button style={{ ...s.saveBtn, opacity: !bulkText.trim() ? 0.5 : 1 }} onClick={handleBulkSave} disabled={bulkSaving || !bulkText.trim()}>
              {bulkSaving ? "登録中..." : "まとめて登録する"}
            </button>
            <button style={s.cancelBtn} onClick={() => setShowBulk(false)}>キャンセル</button>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div style={s.overlay} onClick={() => setDeleteConfirm(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>本当に削除しますか？</div>
            <p style={{ color: COLORS.muted, fontSize: "14px", marginBottom: "20px" }}>この操作は元に戻せません。</p>
            <button style={{ ...s.saveBtn, background: COLORS.danger }} onClick={() => handleDelete(deleteConfirm)}>削除する</button>
            <button style={s.cancelBtn} onClick={() => setDeleteConfirm(null)}>キャンセル</button>
          </div>
        </div>
      )}
    </div>
  );
}
