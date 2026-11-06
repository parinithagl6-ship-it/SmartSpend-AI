import { useState, useEffect } from "react";
import "./App.css";

import {
  LayoutDashboard,
  ArrowLeftRight,
  ChartNoAxesCombined,
  Target,
  Bot,
  Settings,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Plus,
  Trash2,
  LogOut,
  User,
  Utensils,
  ShoppingBag,
  Car,
  GraduationCap,
  Sparkles,
  Save,
  Gauge,
  FileText,
  Bell,
  Download,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const formatMoney = (amount) =>
  "₹" + Number(amount || 0).toLocaleString("en-IN");

const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Food & Groceries",
  "Transport",
  "Shopping",
  "Education",
  "Entertainment",
  "Health",
  "Housing",
  "Other",
];

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function App() {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [activePage, setActivePage] = useState("Dashboard");
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      text: "Hello! I'm SmartSpend AI. I can see your real income and expenses. Ask me anything, for example: 'Where am I overspending?'",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    category: "Auto",
    amount: "",
    type: "expense",
    date: today(),
  });

  // Demo login state
  const [loggedIn, setLoggedIn] = useState(
    localStorage.getItem("smartspend_logged_in") === "true"
  );
  const [loginName, setLoginName] = useState(
    localStorage.getItem("smartspend_name") || ""
  );
  const [loginEmail, setLoginEmail] = useState(
    localStorage.getItem("smartspend_email") || ""
  );
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Goals form
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalSaved, setGoalSaved] = useState("");

  // Budget form
  const [budgetCategory, setBudgetCategory] = useState("Food & Dining");
  const [budgetLimit, setBudgetLimit] = useState("");

  // Settings
  const [profileName, setProfileName] = useState(
    localStorage.getItem("smartspend_name") || "Parinitha"
  );
  const [profileEmail, setProfileEmail] = useState(
    localStorage.getItem("smartspend_email") || ""
  );
  const [currency, setCurrency] = useState("INR");
  const [settingsMessage, setSettingsMessage] = useState("");

  // ---------- LOADERS ----------
  const loadTransactions = async () => {
    try {
      const response = await fetch(`${API}/api/transactions`);
      if (!response.ok) throw new Error("Could not load transactions");
      const data = await response.json();
      setTransactions(
        data.map((item) => ({
          ...item,
          name: item.description || item.name || "Transaction",
        }))
      );
    } catch (error) {
      console.error("Transaction loading error:", error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const loadBudgets = async () => {
    try {
      const response = await fetch(`${API}/api/budgets`);
      if (response.ok) setBudgets(await response.json());
    } catch (error) {
      console.error("Budget loading error:", error);
    }
  };

  const loadGoals = async () => {
    try {
      const response = await fetch(`${API}/api/goals`);
      if (response.ok) setGoals(await response.json());
    } catch (error) {
      console.error("Goals loading error:", error);
    }
  };

 const refreshAll = async () => {
  await Promise.all([
    loadTransactions(),
    loadBudgets(),
    loadGoals(),
  ]);
};

  useEffect(() => {
    loadTransactions();
    loadBudgets();
    loadGoals();
  }, []);

  // ---------- CALCULATIONS ----------
  const totalIncome = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalExpenses = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalBalance = totalIncome - totalExpenses;

  const savingsRate =
    totalIncome > 0 ? Math.round((totalBalance / totalIncome) * 100) : 0;

  const monthlyData = Object.values(
    transactions.reduce((result, item) => {
      const key = (item.date || "").slice(0, 7) || "Unknown";
      const date = new Date(`${key}-01`);
      const label = Number.isNaN(date.getTime())
        ? "Unknown"
        : date.toLocaleString("en-IN", { month: "short", year: "2-digit" });

      if (!result[key]) {
        result[key] = { key, month: label, income: 0, expenses: 0 };
      }
      if (item.type === "income") result[key].income += Number(item.amount);
      else result[key].expenses += Number(item.amount);
      return result;
    }, {})
  ).sort((a, b) => a.key.localeCompare(b.key));
  
const dailyData = Object.values(
  transactions.reduce((result, item) => {
    const key = item.date || "Unknown";

    if (!result[key]) {
      result[key] = {
        date: key,
        income: 0,
        expenses: 0,
      };
    }

    if (item.type === "income") {
      result[key].income += Number(item.amount);
    } else {
      result[key].expenses += Number(item.amount);
    }

    return result;
  }, {})
).sort((a, b) => a.date.localeCompare(b.date)).map((item) => ({
  ...item,
  day: item.date === "Unknown"
    ? "Unknown"
    : new Date(`${item.date}T00:00:00`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
}));

  const categoryData = Object.values(
    transactions
      .filter((item) => item.type === "expense")
      .reduce((result, item) => {
        const category = item.category || "Other";
        if (!result[category]) result[category] = { category, amount: 0 };
        result[category].amount += Number(item.amount);
        return result;
      }, {})
  ).sort((a, b) => b.amount - a.amount);

  const topCategory = categoryData[0];
  const alertBudgets = budgets.filter((b) => b.status !== "ok");

  const filteredTransactions = transactions.filter((item) => {
    const search = searchTerm.toLowerCase();
    return (
      (item.name || "").toLowerCase().includes(search) ||
      (item.category || "").toLowerCase().includes(search) ||
      (item.type || "").toLowerCase().includes(search)
    );
  });

  // ---------- TRANSACTIONS ----------
  const handleAddTransaction = async (event) => {
    event.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.amount ||
      Number(formData.amount) <= 0
    ) {
      alert("Please enter valid transaction details.");
      return;
    }

    const newTransaction = {
      description: formData.name.trim(),
      category: formData.category === "Auto" ? "" : formData.category,
      amount: Number(formData.amount),
      type: formData.type,
      date: formData.date || today(),
    };

    try {
      const response = await fetch(`${API}/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTransaction),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save transaction");

      await refreshAll();

      setFormData({
        name: "",
        category: "Auto",
        amount: "",
        type: "expense",
        date: today(),
      });
      setShowForm(false);

      if (newTransaction.category === "") {
        alert(`Saved! Category chosen by ${data.categorySource}: ${data.category}`);
      } else {
        alert("Transaction added successfully!");
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;

    try {
      const response = await fetch(`${API}/api/transactions/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Delete failed");
      await refreshAll();
    } catch (error) {
      alert(error.message);
    }
  };

  // ---------- AI CHAT ----------
  const sendChat = async (rawMessage) => {
    const message = rawMessage.trim();
    if (!message || chatLoading) return;

    setChatMessages((previous) => [...previous, { role: "user", text: message }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch(`${API}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI response failed");

      setChatMessages((previous) => [
        ...previous,
        { role: "assistant", text: data.reply || "Please try asking another question." },
      ]);
    } catch (error) {
      console.error("AI error:", error);
      setChatMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: "Sorry, I couldn't respond right now. Please check that the backend is running.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = (event) => {
    event.preventDefault();
    sendChat(chatInput);
  };

  // ---------- AI ANALYSIS ----------
  const runAnalysis = async () => {
    setReportLoading(true);
    try {
      const response = await fetch(`${API}/api/ai/analysis`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");
      setReport(data);
    } catch (error) {
      alert("Could not run analysis: " + error.message);
    } finally {
      setReportLoading(false);
    }
  };

  // ---------- BUDGETS ----------
  const handleSaveBudget = async (event) => {
    event.preventDefault();
    if (Number(budgetLimit) <= 0) {
      alert("Enter a valid monthly limit.");
      return;
    }
    try {
      const response = await fetch(`${API}/api/budgets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: budgetCategory, limit: Number(budgetLimit) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save budget");
      setBudgets(data);
      setBudgetLimit("");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteBudget = async (category) => {
    if (!window.confirm(`Delete the budget for ${category}?`)) return;
    await fetch(`${API}/api/budgets/${encodeURIComponent(category)}`, {
      method: "DELETE",
    });
    loadBudgets();
  };

  // ---------- GOALS (SQLite) ----------
  const handleAddGoal = async (event) => {
    event.preventDefault();

    if (!goalName.trim() || Number(goalTarget) <= 0 || Number(goalSaved) < 0) {
      alert("Enter a valid goal name and target amount.");
      return;
    }

    try {
      const response = await fetch(`${API}/api/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: goalName.trim(),
          target: Number(goalTarget),
          saved: Number(goalSaved || 0),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save goal");

      setGoalName("");
      setGoalTarget("");
      setGoalSaved("");
      loadGoals();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteGoal = async (id) => {
    if (!window.confirm("Delete this savings goal?")) return;
    await fetch(`${API}/api/goals/${id}`, { method: "DELETE" });
    loadGoals();
  };

  const handleGoalChange = (id, amount) => {
    setGoals((previous) =>
      previous.map((goal) =>
        goal.id === id ? { ...goal, saved: amount === "" ? "" : Number(amount) } : goal
      )
    );
  };

  const handleGoalSave = async (id, amount) => {
  const value = Number(amount);

  if (!Number.isFinite(value) || value < 0) return;

  try {
    const response = await fetch(`${API}/api/goals/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saved: value }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not update goal");
    }

    await loadGoals();
  } catch (error) {
    alert(error.message);
  }
};
  // ---------- LOGIN / SETTINGS ----------
  const handleLogin = (event) => {
    event.preventDefault();

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError("Please enter your email and password.");
      return;
    }

    const name = loginName.trim() || loginEmail.split("@")[0];
    localStorage.setItem("smartspend_logged_in", "true");
    localStorage.setItem("smartspend_name", name);
    localStorage.setItem("smartspend_email", loginEmail);

    setProfileName(name);
    setProfileEmail(loginEmail);
    setLoggedIn(true);
    setLoginError("");
  };

  const handleLogout = () => {
    localStorage.removeItem("smartspend_logged_in");
    setLoggedIn(false);
    setActivePage("Dashboard");
    setLoginPassword("");
  };

  const handleSaveSettings = (event) => {
    event.preventDefault();
    localStorage.setItem("smartspend_name", profileName);
    localStorage.setItem("smartspend_email", profileEmail);
    setLoginName(profileName);
    setLoginEmail(profileEmail);
    setSettingsMessage("Settings saved successfully!");
    setTimeout(() => setSettingsMessage(""), 3000);
  };

  const handleSeedData = async () => {
    if (!window.confirm("Add 3 months of sample transactions for the demo?")) return;
    await fetch(`${API}/api/demo/seed`, { method: "POST" });
    await refreshAll();
    setSettingsMessage("Sample data added! Check the Dashboard.");
    setTimeout(() => setSettingsMessage(""), 4000);
  };

  const handleClearData = async () => {
    if (!window.confirm("Delete ALL transactions? This cannot be undone.")) return;
    await fetch(`${API}/api/demo/clear`, { method: "POST" });
    await refreshAll();
    setReport(null);
    setSettingsMessage("All transactions cleared.");
    setTimeout(() => setSettingsMessage(""), 4000);
  };

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Transactions", icon: ArrowLeftRight },
    { name: "Analytics", icon: ChartNoAxesCombined },
    { name: "Budgets", icon: Gauge },
    { name: "Savings Goals", icon: Target },
    { name: "Reports", icon: FileText },
    { name: "AI Assistant", icon: Bot },
  ];

  const getTransactionIcon = (category) => {
    if (category?.includes("Food")) return Utensils;
    if (category === "Transport") return Car;
    if (category === "Education") return GraduationCap;
    if (category === "Shopping") return ShoppingBag;
    return Wallet;
  };

  // ---------- LOGIN SCREEN ----------
  if (!loggedIn) {
    return (
      <div className="app-container" style={styles.loginBackground}>
        <form onSubmit={handleLogin} style={styles.loginCard}>
          <div style={styles.loginIcon}>
            <Wallet size={30} />
          </div>

          <h1 style={{ marginBottom: 5 }}>
            SmartSpend<span style={{ color: "#A78BFA" }}> AI</span>
          </h1>

          <p style={{ color: "#9CA3AF", marginBottom: 25 }}>
            Sign in to manage your money
          </p>

          <label style={styles.label}>Your Name</label>
          <input
            style={styles.input}
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
            placeholder="Enter your name"
          />

          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />

          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            placeholder="Enter any password for this demo"
            required
          />

          {loginError && <p style={{ color: "#F87171" }}>{loginError}</p>}

          <button type="submit" style={styles.primaryButton}>
            Login
          </button>

          <p style={styles.smallNote}>
            Demo login: enter your name, email and any password.
          </p>
        </form>
      </div>
    );
  }

  // ---------- MAIN APP ----------
  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Wallet size={23} />
          </div>
          <div>
            <h2>
              SmartSpend<span> AI</span>
            </h2>
            <small>SMART MONEY. SMART LIFE.</small>
          </div>
        </div>

        <div className="menu-label">MAIN MENU</div>

        <nav className="navigation">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={`nav-item ${activePage === item.name ? "active" : ""}`}
                key={item.name}
                onClick={() => setActivePage(item.name)}
              >
                <Icon size={19} />
                <span>{item.name}</span>
                {item.name === "Budgets" && alertBudgets.length > 0 && (
                  <span style={styles.badge}>{alertBudgets.length}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button
            className={`nav-item ${activePage === "Settings" ? "active" : ""}`}
            onClick={() => setActivePage("Settings")}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>

          <div className="profile">
            <div className="avatar">
              {(profileName || "P").charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{profileName || "User"}</strong>
              <small>Personal Account</small>
            </div>
          </div>

          <button className="nav-item" onClick={handleLogout}>
            <LogOut size={19} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="welcome-text">WELCOME BACK 👋</p>
            <h1>{activePage}</h1>
            <p className="subtitle">Manage and understand your money.</p>

            <button
              className="add-transaction-button"
              onClick={() => {
                setActivePage("Dashboard");
                setShowForm(true);
              }}
            >
              <Plus size={17} /> Add Transaction
            </button>
          </div>

          <div className="top-actions">
            <div className="top-avatar">
              {(profileName || "P").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* ADD TRANSACTION FORM */}
        {showForm && (
          <div className="form-overlay">
            <form className="transaction-form" onSubmit={handleAddTransaction}>
              <div className="form-heading">
                <h2>Add Transaction</h2>
                <button
                  type="button"
                  className="close-form"
                  onClick={() => setShowForm(false)}
                >
                  ×
                </button>
              </div>

              <label>Transaction Type</label>
              <select
  value={formData.type}
  onChange={(e) =>
    setFormData((prev) => ({
      ...prev,
      type: e.target.value,
      category: "Auto",
    }))
  }
>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>

              <label>Description</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Example: Swiggy dinner"
                required
              />

               <label>Category</label>

<input
  list="transaction-categories"
  value={formData.category}
  onChange={(e) =>
    setFormData({ ...formData, category: e.target.value })
  }
  placeholder="Select or type your own category"
  required
/>

<datalist id="transaction-categories">
  {(
    formData.type === "income"
      ? ["Auto", "Salary", "Part-time Work", "Scholarship", "Freelancing", "Business", "Gift", "Other"]
      : [...EXPENSE_CATEGORIES, "Auto"]
  ).map((category) => (
    <option key={category} value={category} />
  ))}
</datalist>
              <label>Amount (₹)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Enter amount"
                required
              />

              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />

              <button type="submit" className="submit-transaction">
                Save Transaction
              </button>
            </form>
          </div>
        )}

        {/* ---------------- DASHBOARD ---------------- */}
        {activePage === "Dashboard" && (
          <div className="dashboard-content">
            {alertBudgets.length > 0 && (
              <AlertList budgets={alertBudgets} onClick={() => setActivePage("Budgets")} />
            )}

            <section className="summary-grid">
              <div className="summary-card balance-card">
                <div className="card-heading">
                  <span>Total Balance</span>
                  <div className="summary-icon purple"><Wallet size={20} /></div>
                </div>
                <h2>{formatMoney(totalBalance)}</h2>
                <p className="positive">Your available balance</p>
              </div>

              <div className="summary-card">
                <div className="card-heading">
                  <span>Total Income</span>
                  <div className="summary-icon green"><TrendingUp size={20} /></div>
                </div>
                <h2>{formatMoney(totalIncome)}</h2>
                <p className="positive">Money received</p>
              </div>

              <div className="summary-card">
                <div className="card-heading">
                  <span>Total Expenses</span>
                  <div className="summary-icon red"><TrendingDown size={20} /></div>
                </div>
                <h2>{formatMoney(totalExpenses)}</h2>
                <p className="negative">Money spent</p>
              </div>

              <div className="summary-card">
                <div className="card-heading">
                  <span>Savings Rate</span>
                  <div className="summary-icon blue"><PiggyBank size={20} /></div>
                </div>
                <h2>{savingsRate}%</h2>
                <p className="positive">Current savings rate</p>
              </div>
            </section>

            <section className="dashboard-grid">
              <div className="panel chart-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Income & Expenses</h3>
                    <p>Based on your saved transactions</p>
                  </div>
                </div>

                <div className="chart-area">
                  {monthlyData.length === 0 ? (
                    <p>Add transactions to see your chart.</p>
                  ) : (
                    
<ResponsiveContainer width="100%" height="100%">
  <LineChart data={dailyData}>
    <CartesianGrid stroke="#293044" strokeDasharray="4 4" />
    <XAxis dataKey="day" stroke="#8992A8" />
    <YAxis
      stroke="#8992A8"
      tickFormatter={(value) => `₹${value}`}
    />
    <Tooltip formatter={(value) => formatMoney(value)} />
    <Legend />
    <Line
      type="monotone"
      dataKey="income"
      name="Income"
      stroke="#A78BFA"
      strokeWidth={3}
      dot={{ r: 4 }}
      activeDot={{ r: 7 }}
    />
    <Line
      type="monotone"
      dataKey="expenses"
      name="Expenses"
      stroke="#36CFA5"
      strokeWidth={3}
      dot={{ r: 4 }}
      activeDot={{ r: 7 }}
    />
  </LineChart>
</ResponsiveContainer>

                  )}
                </div>
              </div>

              <div className="panel ai-panel">
                <div className="ai-title">
                  <div className="ai-icon"><Sparkles size={21} /></div>
                  <div>
                    <h3>Smart AI Insights</h3>
                    <p>Your personal savings coach</p>
                  </div>
                </div>
                <div className="insight-content">
                  <span className="insight-tag">YOUR DATA</span>
                  {topCategory ? (
                    <>
                      <h3>
                        Your biggest expense is {topCategory.category} (
                        {formatMoney(topCategory.amount)})
                      </h3>
                      <p>
                        That is {totalExpenses > 0 ? Math.round((topCategory.amount / totalExpenses) * 100) : 0}% of
                        everything you spent. Set a budget for it to stay in control.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3>Add transactions to get insights</h3>
                      <p>Or go to Settings and load sample data for the demo.</p>
                    </>
                  )}
                  <button
                    style={{ ...styles.primaryButton, width: "100%" }}
                    onClick={() => {
                      setActivePage("Reports");
                      runAnalysis();
                    }}
                  >
                    <Sparkles size={16} /> Get full AI analysis
                  </button>
                </div>
              </div>
            </section>

            <section className="panel transactions-panel">
              <div className="panel-heading">
                <div>
                  <h3>Recent Transactions</h3>
                  <p>Your latest financial activity</p>
                </div>
                <button
                  className="add-transaction-button"
                  onClick={() => setActivePage("Transactions")}
                >
                  View All
                </button>
              </div>

              <TransactionList
                transactions={transactions.slice(0, 5)}
                loading={loadingTransactions}
                onDelete={handleDeleteTransaction}
                getIcon={getTransactionIcon}
              />
            </section>
          </div>
        )}

        {/* ---------------- TRANSACTIONS ---------------- */}
        {activePage === "Transactions" && (
          <section className="panel transactions-panel">
            <div className="panel-heading">
              <div>
                <h3>All Transactions</h3>
                <p>Search and manage your saved transactions</p>
              </div>
              <button className="add-transaction-button" onClick={() => setShowForm(true)}>
                <Plus size={16} /> Add New
              </button>
            </div>

            <input
              style={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by description, category or type..."
            />

            <TransactionList
              transactions={filteredTransactions}
              loading={loadingTransactions}
              onDelete={handleDeleteTransaction}
              getIcon={getTransactionIcon}
            />

            <p style={styles.smallNote}>Total transactions: {transactions.length}</p>
          </section>
        )}

        {/* ---------------- ANALYTICS ---------------- */}
        {activePage === "Analytics" && (
          <div className="dashboard-content">
            <section className="summary-grid">
              <div className="summary-card">
                <span>Total Income</span>
                <h2>{formatMoney(totalIncome)}</h2>
              </div>
              <div className="summary-card">
                <span>Total Expenses</span>
                <h2>{formatMoney(totalExpenses)}</h2>
              </div>
              <div className="summary-card">
                <span>Net Balance</span>
                <h2>{formatMoney(totalBalance)}</h2>
              </div>
              <div className="summary-card">
                <span>Savings Rate</span>
                <h2>{savingsRate}%</h2>
              </div>
            </section>

            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h3>Monthly Income vs Expenses</h3>
                  <p>Calculated from your saved transactions</p>
                </div>
              </div>
              <div style={{ width: "100%", height: 300 }}>
                {monthlyData.length === 0 ? (
                  <p>Add transactions to view analytics.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid stroke="#293044" strokeDasharray="4 4" />
                      <XAxis dataKey="month" stroke="#8992A8" />
                      <YAxis stroke="#8992A8" />
                      <Tooltip formatter={(value) => formatMoney(value)} />
                      <Bar dataKey="income" fill="#A78BFA" name="Income" />
                      <Bar dataKey="expenses" fill="#36CFA5" name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h3>Expenses by Category</h3>
                  <p>See where your money is being spent</p>
                </div>
              </div>
              <div style={{ width: "100%", height: 320 }}>
                {categoryData.length === 0 ? (
                  <p>No expense data available yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical">
                      <CartesianGrid stroke="#293044" strokeDasharray="4 4" />
                      <XAxis type="number" stroke="#8992A8" />
                      <YAxis type="category" dataKey="category" width={120} stroke="#8992A8" />
                      <Tooltip formatter={(value) => formatMoney(value)} />
                      <Bar dataKey="amount" fill="#A78BFA" name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ---------------- BUDGETS ---------------- */}
        {activePage === "Budgets" && (
          <div className="dashboard-content">
            {alertBudgets.length > 0 && <AlertList budgets={alertBudgets} />}

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3><Gauge size={20} /> Set a Monthly Budget</h3>
                  <p>You get alerts at 80% and when you exceed the limit</p>
                </div>
              </div>

              <form onSubmit={handleSaveBudget} style={styles.goalForm}>
                <label style={styles.label}>Category</label>
                <select
                  style={styles.input}
                  value={budgetCategory}
                  onChange={(e) => setBudgetCategory(e.target.value)}
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>

                <label style={styles.label}>Monthly Limit (₹)</label>
                <input
                  style={styles.input}
                  type="number"
                  min="1"
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                  placeholder="Example: 5000"
                  required
                />

                <button style={styles.primaryButton} type="submit">
                  <Save size={16} /> Save Budget
                </button>
              </form>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <h3>This Month's Budgets</h3>
              </div>

              {budgets.length === 0 ? (
                <p>No budgets yet. Create your first budget above.</p>
              ) : (
                budgets.map((b) => (
                  <div key={b.category} style={styles.goalCard}>
                    <div style={styles.goalHeader}>
                      <div>
                        <h3>{b.category}</h3>
                        <p>
                          {formatMoney(b.spent)} spent of {formatMoney(b.limit)}
                        </p>
                      </div>
                      <button
                        className="delete-transaction"
                        onClick={() => handleDeleteBudget(b.category)}
                        title="Delete budget"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                    <div style={styles.progressBackground}>
                      <div
                        style={{
                          ...styles.progressFill,
                          width: `${Math.min(100, b.percent)}%`,
                          background:
                            b.status === "exceeded" ? "#FF8190" : b.status === "warning" ? "#F5B94A" : "#36CFA5",
                        }}
                      />
                    </div>
                    <p>
                      {b.percent}% used
                      {b.status === "exceeded" && " - Budget exceeded!"}
                      {b.status === "warning" && " - Almost at your limit"}
                    </p>
                  </div>
                ))
              )}
            </section>
          </div>
        )}

        {/* ---------------- SAVINGS GOALS ---------------- */}
        {activePage === "Savings Goals" && (
          <div className="dashboard-content">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3><Target size={20} /> Create a Savings Goal</h3>
                  <p>Plan what you want to save for (saved in the database)</p>
                </div>
              </div>

              <form onSubmit={handleAddGoal} style={styles.goalForm}>
                <label style={styles.label}>Goal Name</label>
                <input
                  style={styles.input}
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="Example: New Laptop"
                  required
                />

                <label style={styles.label}>Target Amount (₹)</label>
                <input
                  style={styles.input}
                  type="number"
                  min="1"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  placeholder="Example: 50000"
                  required
                />

                <label style={styles.label}>Already Saved (₹)</label>
                <input
                  style={styles.input}
                  type="number"
                  min="0"
                  value={goalSaved}
                  onChange={(e) => setGoalSaved(e.target.value)}
                  placeholder="Example: 5000"
                />

                <button style={styles.primaryButton} type="submit">
                  <Plus size={16} /> Create Goal
                </button>
              </form>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <h3>Your Savings Goals</h3>
              </div>

              {goals.length === 0 ? (
                <p>No savings goals yet. Create your first goal above.</p>
              ) : (
                goals.map((goal) => {
                  const progress = Math.min(
                    100,
                    Math.round((Number(goal.saved || 0) / goal.target) * 100)
                  );

                  return (
                    <div key={goal.id} style={styles.goalCard}>
                      <div style={styles.goalHeader}>
                        <div>
                          <h3>{goal.name}</h3>
                          <p>
                            {formatMoney(goal.saved)} saved of {formatMoney(goal.target)}
                          </p>
                        </div>
                        <button
                          className="delete-transaction"
                          onClick={() => handleDeleteGoal(goal.id)}
                          title="Delete goal"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>

                      <div style={styles.progressBackground}>
                        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
                      </div>

                      <p>{progress}% completed</p>

                      <label style={styles.label}>Update saved amount (₹)</label>
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        value={goal.saved}
                        onChange={(e) => handleGoalChange(goal.id, e.target.value)}
                        onBlur={(e) => handleGoalSave(goal.id, e.target.value)}
                      />

                      {progress >= 100 && (
                        <p style={{ color: "#36CFA5" }}>Congratulations! Goal completed.</p>
                      )}
                    </div>
                  );
                })
              )}
            </section>
          </div>
        )}

        {/* ---------------- REPORTS ---------------- */}
        {activePage === "Reports" && (
          <div className="dashboard-content">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3><Sparkles size={20} /> AI Spending Analysis</h3>
                  <p>Gemini AI reads your real transactions and finds problem areas</p>
                </div>
                <button
                  className="add-transaction-button"
                  style={{ marginTop: 0 }}
                  onClick={runAnalysis}
                  disabled={reportLoading}
                >
                  {reportLoading ? "Analyzing..." : "Analyze My Spending"}
                </button>
              </div>

              {report && (
                <div style={{ marginTop: 20 }}>
                  <div style={styles.scoreRow}>
                    <div
                      style={{
                        ...styles.scoreCircle,
                        borderColor:
                          report.score >= 70 ? "#36CFA5" : report.score >= 40 ? "#F5B94A" : "#FF8190",
                      }}
                    >
                      {report.score}
                    </div>
                    <div>
                      <h3>Financial Health Score</h3>
                      <p style={styles.smallNote}>
                        Out of 100, based on savings rate, spending balance and budgets
                      </p>
                      {report.topCategory && (
                        <p>
                          Top spending: <strong>{report.topCategory.category}</strong> (
                          {formatMoney(report.topCategory.total)})
                        </p>
                      )}
                    </div>
                  </div>
                  <p style={styles.analysisText}>{report.analysis}</p>
                  {!report.aiUsed && (
                    <p style={styles.smallNote}>
                      Gemini was unavailable, so the backup analysis was used.
                    </p>
                  )}
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Monthly Report</h3>
                  <p>Income, expenses and savings month by month</p>
                </div>
                <a
                  href={`${API}/api/export/csv`}
                  className="add-transaction-button"
                  style={{ marginTop: 0, textDecoration: "none" }}
                >
                  <Download size={16} /> Export CSV
                </a>
              </div>

              {monthlyData.length === 0 ? (
                <p>No data yet.</p>
              ) : (
                <div style={{ overflowX: "auto", marginTop: 15 }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Month</th>
                        <th style={styles.th}>Income</th>
                        <th style={styles.th}>Expenses</th>
                        <th style={styles.th}>Savings</th>
                        <th style={styles.th}>Savings Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...monthlyData].reverse().map((m) => {
                        const saved = m.income - m.expenses;
                        const rate = m.income > 0 ? Math.round((saved / m.income) * 100) : 0;
                        return (
                          <tr key={m.key}>
                            <td style={styles.td}>{m.month}</td>
                            <td style={{ ...styles.td, color: "#40d9ad" }}>{formatMoney(m.income)}</td>
                            <td style={{ ...styles.td, color: "#ff8190" }}>{formatMoney(m.expenses)}</td>
                            <td style={styles.td}>{formatMoney(saved)}</td>
                            <td style={styles.td}>{rate}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ---------------- AI ASSISTANT ---------------- */}
        {activePage === "AI Assistant" && (
          <section className="panel chat-panel">
            <div className="panel-heading">
              <div>
                <h3><Bot size={20} /> SmartSpend AI Assistant</h3>
                <p>Answers using your real income, expenses and budgets</p>
              </div>
              <span className="period-label">Gemini AI</span>
            </div>

            <div style={styles.chipRow}>
              {[
                "Where am I overspending?",
                "How can I save more money?",
                "Am I within my budget?",
                "Give me a monthly saving plan",
              ].map((q) => (
                <button
                  key={q}
                  style={styles.chip}
                  onClick={() => sendChat(q)}
                  disabled={chatLoading}
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="chat-messages">
              {chatMessages.map((message, index) => (
                <div key={index} className={`chat-message ${message.role}`}>
                  <strong>{message.role === "user" ? "You" : "SmartSpend AI"}</strong>
                  <p>{message.text}</p>
                </div>
              ))}

              {chatLoading && (
                <div className="chat-message assistant">
                  <strong>SmartSpend AI</strong>
                  <p>Thinking...</p>
                </div>
              )}
            </div>

            <form className="chat-form" onSubmit={handleSendMessage}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about saving, budgeting, expenses..."
                disabled={chatLoading}
              />
              <button type="submit" disabled={chatLoading || !chatInput.trim()}>
                Send
              </button>
            </form>
          </section>
        )}

        {/* ---------------- SETTINGS ---------------- */}
        {activePage === "Settings" && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3><Settings size={20} /> Account Settings</h3>
                <p>Update your personal account details</p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} style={styles.settingsForm}>
              <div style={styles.settingsIcon}>
                <User size={30} />
              </div>

              <label style={styles.label}>Full Name</label>
              <input
                style={styles.input}
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
              />

              <label style={styles.label}>Email Address</label>
              <input
                style={styles.input}
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                required
              />

              <label style={styles.label}>Currency</label>
              <select
                style={styles.input}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="INR">Indian Rupee (₹)</option>
              </select>

              <button style={styles.primaryButton} type="submit">
                <Save size={16} /> Save Settings
              </button>

              {settingsMessage && <p style={{ color: "#36CFA5" }}>{settingsMessage}</p>}
            </form>

            <div style={styles.logoutArea}>
              <h3>Demo Data</h3>
              <p style={styles.smallNote}>
                Load 3 months of realistic sample transactions for your presentation.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                <button style={styles.primaryButton} onClick={handleSeedData}>
                  <Plus size={16} /> Load Sample Data
                </button>
                <button style={styles.logoutButton} onClick={handleClearData}>
                  <Trash2 size={16} /> Clear All Transactions
                </button>
              </div>
            </div>

            <div style={styles.logoutArea}>
              <h3>Account</h3>
              <p>Sign out of your SmartSpend AI demo account.</p>
              <button style={styles.logoutButton} onClick={handleLogout}>
                <LogOut size={17} /> Logout
              </button>
            </div>
          </section>
        )}

        <footer className="footer">
          SmartSpend AI · Your money, understood better.
        </footer>
      </main>
    </div>
  );
}

// Budget alert banners
function AlertList({ budgets, onClick }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {budgets.map((b) => (
        <div
          key={b.category}
          onClick={onClick}
          style={{
            ...styles.alert,
            borderColor: b.status === "exceeded" ? "#FF8190" : "#F5B94A",
            background: b.status === "exceeded" ? "#49303e" : "#4a3f25",
            cursor: onClick ? "pointer" : "default",
          }}
        >
          <Bell size={18} />
          <span>
            {b.status === "exceeded"
              ? `Budget exceeded: ${b.category} - spent ${formatMoney(b.spent)} of ${formatMoney(b.limit)}`
              : `Warning: ${b.category} is at ${b.percent}% of its ${formatMoney(b.limit)} budget`}
          </span>
        </div>
      ))}
    </div>
  );
}

// Reusable transaction list
function TransactionList({ transactions, loading, onDelete, getIcon }) {
  if (loading) return <p>Loading transactions...</p>;

  if (transactions.length === 0) {
    return <p>No transactions found. Add a transaction to get started.</p>;
  }

  return (
    <div className="transaction-list">
      {transactions.map((transaction) => {
        const Icon = getIcon(transaction.category);

        return (
          <div className="transaction-row" key={transaction.id}>
            <div className={`transaction-icon ${transaction.type}`}>
              <Icon size={19} />
            </div>

            <div className="transaction-info">
              <strong>
                {transaction.description || transaction.name || "Transaction"}
              </strong>
              <small>{transaction.category || "Other"}</small>
            </div>

            <span className="transaction-date">{transaction.date}</span>

            <strong
              className={
                transaction.type === "income" ? "amount-income" : "amount-expense"
              }
            >
              {transaction.type === "income" ? "+" : "-"}
              {formatMoney(transaction.amount)}
            </strong>

            <button
              className="delete-transaction"
              onClick={() => onDelete(transaction.id)}
              title="Delete transaction"
            >
              <Trash2 size={17} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  loginBackground: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loginCard: {
    width: "100%",
    maxWidth: 420,
    padding: 32,
    borderRadius: 18,
    background: "#171D30",
    border: "1px solid #30384E",
    color: "white",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  loginIcon: {
    width: 58,
    height: 58,
    borderRadius: 15,
    background: "#6D55C7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  label: {
    display: "block",
    color: "#C4C9D6",
    marginTop: 12,
    marginBottom: 5,
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 8,
    border: "1px solid #3A435B",
    background: "#20263A",
    color: "white",
    boxSizing: "border-box",
  },
  primaryButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "12px 18px",
    marginTop: 15,
    border: "none",
    borderRadius: 8,
    background: "#8065E8",
    color: "white",
    fontWeight: 600,
    cursor: "pointer",
  },
  smallNote: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 12,
  },
  searchInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: 13,
    margin: "15px 0",
    border: "1px solid #3A435B",
    borderRadius: 8,
    background: "#20263A",
    color: "white",
  },
  goalForm: {
    maxWidth: 500,
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  goalCard: {
    padding: 18,
    marginTop: 15,
    border: "1px solid #343D54",
    borderRadius: 12,
    background: "#20263A",
  },
  goalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  progressBackground: {
    height: 10,
    width: "100%",
    background: "#39415A",
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 15,
  },
  progressFill: {
    height: "100%",
    background: "#36CFA5",
    borderRadius: 20,
  },
  settingsForm: {
    maxWidth: 500,
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  settingsIcon: {
    width: 60,
    height: 60,
    borderRadius: "50%",
    background: "#343052",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  logoutArea: {
    borderTop: "1px solid #343D54",
    marginTop: 30,
    paddingTop: 20,
  },
  logoutButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    marginTop: 15,
    border: "1px solid #E36B75",
    borderRadius: 8,
    background: "transparent",
    color: "#F28B94",
    cursor: "pointer",
  },
  badge: {
    marginLeft: "auto",
    background: "#FF6B81",
    color: "white",
    borderRadius: 10,
    padding: "2px 7px",
    fontSize: 10,
    fontWeight: 700,
  },
  alert: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 15px",
    marginBottom: 10,
    border: "1px solid",
    borderRadius: 10,
    fontSize: 13,
    color: "white",
  },
  scoreRow: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
  },
  scoreCircle: {
    width: 90,
    height: 90,
    borderRadius: "50%",
    border: "6px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 30,
    fontWeight: 800,
    flexShrink: 0,
  },
  analysisText: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.8,
    fontSize: 13,
    marginTop: 20,
    padding: 16,
    borderRadius: 10,
    background: "#20263A",
    color: "#E4E7F2",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    color: "#8992A8",
    borderBottom: "1px solid #343D54",
    fontWeight: 600,
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #2D344C",
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 18,
  },
  chip: {
    padding: "8px 13px",
    borderRadius: 20,
    border: "1px solid #51427D",
    background: "#252044",
    color: "#C0ADFF",
    fontSize: 12,
    cursor: "pointer",
  },
};

export default App;