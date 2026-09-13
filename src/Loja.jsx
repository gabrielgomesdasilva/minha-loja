import { useState, useEffect } from "react";
import { Lock, Plus, ShoppingBag, X, Package, ArrowLeft, Trash2 } from "lucide-react";
import { db, auth } from "./firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
  getDoc,
  query,
  orderBy,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

const currency = (n) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export default function Loja() {
  const [view, setView] = useState("loja");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [storeName, setStoreName] = useState("Sua Loja");
  const [logoClicks, setLogoClicks] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsOwner(!!user);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (window.location.search.includes("dono")) {
      setView("acesso");
    }
  }, []);

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    (async () => {
      const ref = doc(db, "config", "store");
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().name) setStoreName(snap.data().name);
    })();
  }, []);

  const saveStoreName = async (name) => {
    setStoreName(name);
    await setDoc(doc(db, "config", "store"), { name });
  };

  const addProduct = async (product) => {
    await addDoc(collection(db, "products"), { ...product, createdAt: Date.now() });
  };

  const removeProduct = async (id) => {
    await deleteDoc(doc(db, "products", id));
  };

  const placeOrder = async (buyer) => {
    const order = {
      items: cart,
      total: cartTotal,
      buyer,
      status: "novo",
      createdAt: Date.now(),
      date: new Date().toLocaleString("pt-BR"),
    };
    await addDoc(collection(db, "orders"), order);
    setCart([]);
    setView("confirmado");
  };

  const updateOrderStatus = async (id, status) => {
    await updateDoc(doc(db, "orders", id), { status });
  };

  const addToCart = (product) => {
    setCart((c) => {
      const found = c.find((i) => i.id === product.id);
      if (found) return c.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      return [...c, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id) => setCart((c) => c.filter((i) => i.id !== id));
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const handleLogoClick = () => {
    if (isOwner) {
      setView("loja");
      return;
    }
    const now = Date.now();
    const recent = [...logoClicks, now].filter((t) => now - t < 1500);
    setLogoClicks(recent);
    if (recent.length >= 5) {
      setLogoClicks([]);
      setView("acesso");
    }
  };

  const tryLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setLoginError("");
      setView("dono");
    } catch (e) {
      setLoginError("E-mail ou senha incorretos.");
    }
  };

  const logout = async () => {
    await signOut(auth);
    setView("loja");
  };

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; font-family: 'Inter', sans-serif; }
        .display { font-family: 'Fraunces', serif; }
        button { cursor: pointer; font-family: 'Inter', sans-serif; }
      `}</style>

      <header style={styles.header}>
        <button onClick={handleLogoClick} className="display" style={styles.logo}>
          {storeName}
        </button>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button style={styles.iconBtn} onClick={() => setView("carrinho")}>
            <ShoppingBag size={18} color="#EDEDED" />
            {cart.length > 0 && <span style={styles.badge}>{cart.reduce((s, i) => s + i.qty, 0)}</span>}
          </button>
          {isOwner && (
            <button style={styles.iconBtn} onClick={() => setView("pedidos")}>
              <Package size={18} color="#EDEDED" />
            </button>
          )}
        </div>
      </header>

      <main style={styles.main}>
        {view === "loja" && <StoreFront products={products} onAdd={addToCart} />}

        {view === "carrinho" && (
          <Cart
            cart={cart}
            total={cartTotal}
            onRemove={removeFromCart}
            onBack={() => setView("loja")}
            onOrder={placeOrder}
          />
        )}

        {view === "confirmado" && (
          <div style={styles.centerBox}>
            <h2 className="display" style={{ fontSize: 28, marginBottom: 8 }}>Pedido enviado</h2>
            <p style={{ color: "#A8A8B0", marginBottom: 24 }}>
              O dono da loja vai entrar em contato pra combinar a entrega.
            </p>
            <button style={styles.primaryBtn} onClick={() => setView("loja")}>Voltar pra loja</button>
          </div>
        )}

        {view === "acesso" && (
          <div style={styles.centerBox}>
            <h2 className="display" style={{ fontSize: 24, marginBottom: 16 }}>Acesso do dono</h2>
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && tryLogin()}
              style={{ ...styles.input, marginTop: 10 }}
            />
            {loginError && <p style={{ color: "#E8918C", fontSize: 13, marginTop: 8 }}>{loginError}</p>}
            <button style={{ ...styles.primaryBtn, marginTop: 16 }} onClick={tryLogin}>Entrar</button>
            <button style={{ ...styles.linkBtn, marginTop: 10 }} onClick={() => setView("loja")}>Voltar</button>
          </div>
        )}

        {view === "dono" && isOwner && (
          <OwnerPanel
            products={products}
            storeName={storeName}
            onSaveName={saveStoreName}
            onAddProduct={addProduct}
            onRemoveProduct={removeProduct}
            onGoOrders={() => setView("pedidos")}
            onLogout={logout}
          />
        )}

        {view === "pedidos" && isOwner && (
          <OrdersPanel orders={orders} onUpdateStatus={updateOrderStatus} onBack={() => setView("dono")} />
        )}
      </main>
    </div>
  );
}

function StoreFront({ products, onAdd }) {
  if (products.length === 0) {
    return (
      <div style={styles.emptyState}>
        <h2 className="display" style={{ fontSize: 26, marginBottom: 10 }}>A loja ainda não tem produtos</h2>
        <p style={{ color: "#A8A8B0", maxWidth: 380, lineHeight: 1.6 }}>
          Clique 5 vezes rápido no nome da loja pra entrar como dono e cadastrar o primeiro produto.
        </p>
      </div>
    );
  }

  const semCategoria = "Outros";
  const grupos = {};
  products.forEach((p) => {
    const cat = p.category && p.category.trim() ? p.category.trim() : semCategoria;
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(p);
  });

  return (
    <div>
      {Object.keys(grupos).map((categoria) => (
        <div key={categoria} style={{ marginBottom: 40 }}>
          <h2 className="display" style={{ fontSize: 22, marginBottom: 16 }}>{categoria}</h2>
          <div style={styles.grid}>
            {grupos[categoria].map((p) => (
              <div key={p.id} style={styles.card}>
                <div style={styles.cardImg}>
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} style={styles.cardImgTag} />
                  ) : (
                    <span style={{ fontSize: 32, opacity: 0.35 }}>📦</span>
                  )}
                </div>
                <div style={{ padding: "14px 16px 16px" }}>
                  <h3 className="display" style={{ fontSize: 17, marginBottom: 4 }}>{p.name}</h3>
                  <p style={{ color: "#8A8A93", fontSize: 13.5, marginBottom: 10, lineHeight: 1.5 }}>{p.description}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{currency(p.price)}</span>
                    <button style={styles.smallBtn} onClick={() => onAdd(p)}>Adicionar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Cart({ cart, total, onRemove, onBack, onOrder }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const canSubmit = cart.length > 0 && name && contact;

  return (
    <div style={{ maxWidth: 460, margin: "0 auto" }}>
      <button style={styles.linkBtn} onClick={onBack}>
        <ArrowLeft size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
        Continuar comprando
      </button>
      <h2 className="display" style={{ fontSize: 24, margin: "16px 0" }}>Seu carrinho</h2>
      {cart.length === 0 ? (
        <p style={{ color: "#8A8A93" }}>Carrinho vazio.</p>
      ) : (
        <>
          {cart.map((i) => (
            <div key={i.id} style={styles.cartRow}>
              <div>
                <p style={{ fontSize: 14.5 }}>{i.name}</p>
                <p style={{ fontSize: 12.5, color: "#8A8A93" }}>{i.qty} × {currency(i.price)}</p>
              </div>
              <button style={styles.iconBtnSmall} onClick={() => onRemove(i.id)}>
                <Trash2 size={15} color="#8A8A93" />
              </button>
            </div>
          ))}
          <div style={styles.totalRow}><span>Total</span><span style={{ fontWeight: 600 }}>{currency(total)}</span></div>
          <h3 className="display" style={{ fontSize: 17, margin: "24px 0 10px" }}>Dados para entrega</h3>
          <input style={styles.input} placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
          <input style={{ ...styles.input, marginTop: 10 }} placeholder="WhatsApp ou contato" value={contact} onChange={(e) => setContact(e.target.value)} />
          <textarea style={{ ...styles.input, marginTop: 10, minHeight: 70, resize: "vertical" }} placeholder="Endereço de entrega" value={address} onChange={(e) => setAddress(e.target.value)} />
          <button style={{ ...styles.primaryBtn, width: "100%", marginTop: 16, opacity: canSubmit ? 1 : 0.5 }} disabled={!canSubmit} onClick={() => onOrder({ name, contact, address })}>
            Finalizar pedido
          </button>
        </>
      )}
    </div>
  );
}

function OwnerPanel({ products, storeName, onSaveName, onAddProduct, onRemoveProduct, onGoOrders, onLogout }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("");
  const [editingName, setEditingName] = useState(storeName);

  const submit = () => {
    if (!name || !price) return;
    onAddProduct({ name, price: parseFloat(price), description, imageUrl, category });
    setName(""); setPrice(""); setDescription(""); setImageUrl(""); setCategory("");
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 className="display" style={{ fontSize: 24 }}>Painel do dono</h2>
        <div style={{ display: "flex", gap: 14 }}>
          <button style={styles.linkBtn} onClick={onGoOrders}>Ver pedidos →</button>
          <button style={styles.linkBtn} onClick={onLogout}>Sair</button>
        </div>
      </div>

      <label style={styles.label}>Nome da loja</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input style={{ ...styles.input, flex: 1 }} value={editingName} onChange={(e) => setEditingName(e.target.value)} />
        <button style={styles.smallBtn} onClick={() => onSaveName(editingName)}>Salvar</button>
      </div>

      <h3 className="display" style={{ fontSize: 17, marginBottom: 10 }}>Adicionar produto</h3>
      <input style={styles.input} placeholder="Nome do produto" value={name} onChange={(e) => setName(e.target.value)} />
      <input style={{ ...styles.input, marginTop: 10 }} placeholder="Preço (ex: 49.90)" value={price} onChange={(e) => setPrice(e.target.value)} />
      <textarea style={{ ...styles.input, marginTop: 10, minHeight: 60, resize: "vertical" }} placeholder="Descrição curta" value={description} onChange={(e) => setDescription(e.target.value)} />
      <input style={{ ...styles.input, marginTop: 10 }} placeholder="Link da imagem (ex: https://...)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
      <input style={{ ...styles.input, marginTop: 10 }} placeholder="Categoria (ex: Camisetas, Calças)" value={category} onChange={(e) => setCategory(e.target.value)} />
      <button style={{ ...styles.primaryBtn, marginTop: 12 }} onClick={submit}>
        <Plus size={15} style={{ verticalAlign: "middle", marginRight: 4 }} />
        Adicionar produto
      </button>

      <h3 className="display" style={{ fontSize: 17, margin: "28px 0 10px" }}>Produtos cadastrados ({products.length})</h3>
      {products.length === 0 && <p style={{ color: "#8A8A93", fontSize: 14 }}>Nenhum produto ainda.</p>}
      {products.map((p) => (
        <div key={p.id} style={styles.cartRow}>
          <div>
            <p style={{ fontSize: 14.5 }}>{p.name}</p>
            <p style={{ fontSize: 12.5, color: "#8A8A93" }}>{currency(p.price)}</p>
          </div>
          <button style={styles.iconBtnSmall} onClick={() => onRemoveProduct(p.id)}>
            <X size={15} color="#8A8A93" />
          </button>
        </div>
      ))}
    </div>
  );
}

function OrdersPanel({ orders, onUpdateStatus, onBack }) {
  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <button style={styles.linkBtn} onClick={onBack}>
        <ArrowLeft size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
        Voltar ao painel
      </button>
      <h2 className="display" style={{ fontSize: 24, margin: "16px 0" }}>Pedidos ({orders.length})</h2>
      {orders.length === 0 && <p style={{ color: "#8A8A93" }}>Nenhum pedido ainda.</p>}
      {orders.map((o) => (
        <div key={o.id} style={styles.orderCard}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600, fontSize: 14.5 }}>{o.buyer.name}</span>
            <span style={{ fontSize: 12.5, color: "#8A8A93" }}>{o.date}</span>
          </div>
          <p style={{ fontSize: 13, color: "#A8A8B0", margin: "4px 0" }}>Contato: {o.buyer.contact}</p>
          {o.buyer.address && <p style={{ fontSize: 13, color: "#A8A8B0", marginBottom: 6 }}>Endereço: {o.buyer.address}</p>}
          <div style={{ fontSize: 13, color: "#EDEDED", margin: "8px 0" }}>
            {o.items.map((i, idx) => (
              <div key={idx}>{i.qty}× {i.name} — {currency(i.price * i.qty)}</div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontWeight: 600 }}>{currency(o.total)}</span>
            <select value={o.status} onChange={(e) => onUpdateStatus(o.id, e.target.value)} style={styles.select}>
              <option value="novo">Novo</option>
              <option value="combinado">Combinado</option>
              <option value="entregue">Entregue</option>
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#141416", color: "#EDEDED", padding: "0 0 60px", backgroundImage: "linear-gradient(rgba(20,20,22,0.88), rgba(20,20,22,0.97)), url('/fundo-gmstyle.jpg')", backgroundSize: "cover", backgroundPosition: "top center", backgroundAttachment: "fixed" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #232326", position: "sticky", top: 0, background: "#141416", zIndex: 10 },
  logo: { background: "none", border: "none", color: "#EDEDED", fontSize: 20, padding: 0 },
  iconBtn: { position: "relative", background: "#1F1F22", border: "1px solid #2A2A2E", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" },
  iconBtnSmall: { background: "none", border: "none", padding: 4 },
  badge: { position: "absolute", top: -5, right: -5, background: "#C9973E", color: "#141416", fontSize: 10, fontWeight: 700, borderRadius: 20, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" },
  main: { padding: "36px 24px", maxWidth: 1080, margin: "0 auto" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 },
  card: { background: "#1B1B1E", border: "1px solid #26262A", borderRadius: 10, overflow: "hidden" },
  cardImg: { height: 130, background: "#232326", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  cardImgTag: { width: "100%", height: "100%", objectFit: "cover" },
  emptyState: { textAlign: "center", padding: "80px 20px", display: "flex", flexDirection: "column", alignItems: "center" },
  centerBox: { maxWidth: 380, margin: "60px auto 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" },
  input: { width: "100%", background: "#1B1B1E", border: "1px solid #2A2A2E", borderRadius: 8, padding: "11px 13px", color: "#EDEDED", fontSize: 14, outline: "none" },
  primaryBtn: { background: "#C9973E", color: "#141416", border: "none", borderRadius: 8, padding: "11px 20px", fontSize: 14, fontWeight: 600 },
  smallBtn: { background: "#2A2A2E", color: "#EDEDED", border: "1px solid #34343A", borderRadius: 7, padding: "7px 12px", fontSize: 13 },
  linkBtn: { background: "none", border: "none", color: "#A8A8B0", fontSize: 13.5, padding: 0 },
  label: { fontSize: 12.5, color: "#8A8A93", marginBottom: 6, display: "block" },
  cartRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #232326" },
  totalRow: { display: "flex", justifyContent: "space-between", padding: "14px 0", fontSize: 15, borderTop: "1px solid #2A2A2E", marginTop: 6 },
  orderCard: { background: "#1B1B1E", border: "1px solid #26262A", borderRadius: 10, padding: 14, marginBottom: 12 },
  select: { background: "#232326", color: "#EDEDED", border: "1px solid #2A2A2E", borderRadius: 6, padding: "5px 8px", fontSize: 12.5 },
};