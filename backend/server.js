import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Database from "better-sqlite3";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database
const db = new Database("smartspend.db");
db.pragma("journal_mode = WAL");
console.log(
  db.pragma("table_info(transactions)").map(column => column.name)
);
db.exec(`
 CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL
);
  CREATE TABLE IF NOT EXISTS budgets (
    category TEXT PRIMARY KEY,
    limit_amount REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    target REAL NOT NULL,
    saved REAL NOT NULL DEFAULT 0
  );
`);

console.log("SQLite database connected.");

// Helpers
function getTransactions() {
  return db.prepare(
    "SELECT * FROM transactions ORDER BY date DESC, id DESC"
  ).all();
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getBudgetData() {
  const budgets = db.prepare("SELECT * FROM budgets").all();

  const spending = db.prepare(`
    SELECT category, SUM(amount) AS spent
    FROM transactions
    WHERE type = 'expense' AND substr(date, 1, 7) = ?
    GROUP BY category
  `).all(getCurrentMonth());

  return budgets.map((budget) => {
    const match = spending.find(
      (item) => item.category === budget.category
    );

    const spent = Number(match?.spent || 0);
    const limit = Number(budget.limit_amount);
    const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;

    return {
      category: budget.category,
      spent,
      limit,
      percent,
      status: percent >= 100 ? "exceeded" : percent >= 80 ? "warning" : "ok",
    };
  });
}

function fallbackCategory(description) {
  const value = description.toLowerCase();

  if (/food|restaurant|swiggy|zomato|grocery|groceries|hotel|cafe|lunch|dinner/.test(value)) return "Food & Dining";
  if (/bus|metro|uber|ola|auto|petrol|fuel|train|travel/.test(value)) return "Transport";
  if (/shirt|dress|shopping|amazon|flipkart|purchase/.test(value)) return "Shopping";
  if (/college|school|course|book|fee|education/.test(value)) return "Education";
  if (/movie|game|music|netflix|entertainment/.test(value)) return "Entertainment";
  if (/doctor|medicine|hospital|health/.test(value)) return "Health";
  if (/rent|house|electricity|water/.test(value)) return "Housing";
  if (/salary|income|wage/.test(value)) return "Salary";

  return "Other";
}

// Gemini AI
async function askGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing from backend/.env");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Gemini API request failed");
  }

  return data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("") || "I couldn't generate a response.";
}

async function chooseCategory(description) {
  const allowedCategories = [
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

  try {
    const answer = await askGemini(`
Choose exactly one category for this transaction: "${description}".
Allowed categories: ${allowedCategories.join(", ")}.
Return only the category name.
`);

    const selected = allowedCategories.find(
      (category) => category.toLowerCase() === answer.trim().toLowerCase()
    );

    if (selected) {
      return { category: selected, source: "Gemini AI" };
    }
  } catch (error) {
    console.log("Gemini category fallback:", error.message);
  }

  return {
    category: fallbackCategory(description),
    source: "automatic fallback",
  };
}

// Basic test route
app.get("/", (req, res) => {
  res.json({
    message: "SmartSpend AI backend is running!",
    status: "success",
  });
});

// TRANSACTIONS
app.get("/api/transactions", (req, res) => {
  res.json(getTransactions());
});


app.post("/api/transactions", async (req, res) => {
  try {
    const { description, category, amount, type, date } = req.body;

    if (
      !description?.trim() ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({
        error: "Enter a valid description and amount.",
      });
    }

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({
        error: "Transaction type must be income or expense.",
      });
    }

    let finalCategory = category?.trim();
    let categorySource = "Manual";

    // Run AI when Auto is selected or category is empty
    if (!finalCategory || finalCategory.toLowerCase() === "auto") {
      const result = await chooseCategory(description);
      finalCategory = result.category;
      categorySource = "AI";
    }

    const result = db.prepare(`
      INSERT INTO transactions
      (name, description, category, amount, type, date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      description.trim(),
      description.trim(),
      finalCategory,
      Number(amount),
      type,
      date || new Date().toISOString().slice(0, 10)
    );

    res.status(201).json({
      id: result.lastInsertRowid,
      category: finalCategory,
      categorySource,
      message: "Transaction saved successfully.",
    });
  } catch (error) {
    console.error("Transaction error:", error);
    res.status(500).json({ error: "Could not save transaction." });
  }
});

app.delete("/api/transactions/:id", (req, res) => {
  const result = db.prepare(
    "DELETE FROM transactions WHERE id = ?"
  ).run(Number(req.params.id));

  if (!result.changes) {
    return res.status(404).json({ error: "Transaction not found." });
  }

  res.json({ message: "Transaction deleted." });
});

// BUDGETS
app.get("/api/budgets", (req, res) => {
  res.json(getBudgetData());
});

app.put("/api/budgets", (req, res) => {
  const { category, limit } = req.body;

  if (!category || !Number.isFinite(Number(limit)) || Number(limit) <= 0) {
    return res.status(400).json({
      error: "Enter a valid category and budget.",
    });
  }

  db.prepare(`
    INSERT INTO budgets (category, limit_amount)
    VALUES (?, ?)
    ON CONFLICT(category)
    DO UPDATE SET limit_amount = excluded.limit_amount
  `).run(category, Number(limit));

  res.json(getBudgetData());
});

app.delete("/api/budgets/:category", (req, res) => {
  db.prepare(
    "DELETE FROM budgets WHERE category = ?"
  ).run(req.params.category);

  res.json(getBudgetData());
});

// SAVINGS GOALS
app.get("/api/goals", (req, res) => {
  const goals = db.prepare(
    "SELECT * FROM goals ORDER BY id DESC"
  ).all();

  res.json(goals);
});

app.post("/api/goals", (req, res) => {
  const { name, target, saved = 0 } = req.body;

  if (
    !name?.trim() ||
    !Number.isFinite(Number(target)) ||
    Number(target) <= 0 ||
    !Number.isFinite(Number(saved)) ||
    Number(saved) < 0
  ) {
    return res.status(400).json({
      error: "Enter valid savings goal details.",
    });
  }

  const result = db.prepare(`
    INSERT INTO goals (name, target, saved)
    VALUES (?, ?, ?)
  `).run(name.trim(), Number(target), Number(saved));

  res.status(201).json({
    id: result.lastInsertRowid,
    message: "Goal created.",
  });
});

app.put("/api/goals/:id", (req, res) => {
  const saved = Number(req.body.saved);

  if (!Number.isFinite(saved) || saved < 0) {
    return res.status(400).json({
      error: "Enter a valid saved amount.",
    });
  }

  const result = db.prepare(
    "UPDATE goals SET saved = ? WHERE id = ?"
  ).run(saved, Number(req.params.id));

  if (!result.changes) {
    return res.status(404).json({ error: "Goal not found." });
  }

  res.json({ message: "Goal updated." });
});

app.delete("/api/goals/:id", (req, res) => {
  db.prepare(
    "DELETE FROM goals WHERE id = ?"
  ).run(Number(req.params.id));

  res.json({ message: "Goal deleted." });
});

// AI CHAT
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        error: "Please enter a message.",
      });
    }

    const transactions = getTransactions();
    const budgets = getBudgetData();

  const prompt = `
You are SmartSpend AI, a personal finance assistant for users in India.

IMPORTANT RULES:
1. Every money amount must use ₹ before the number. Never use $, USD, or dollars.
2. Explain everything in simple English.
3. Give practical and realistic saving suggestions.
4. Use only the financial data provided.
5. Never invent income, expenses, or savings.
6. Do not assume the remaining balance is actual savings.
7. Explain that unrecorded expenses may affect the balance.
8. Give a clear monthly saving plan when asked.
9. Keep answers short and easy to understand.
10. Never recommend a specific savings amount unless the user's complete expenses are known.
11. If expenses are incomplete, first ask the user to record all expenses.
12. Do not create a monthly budget using incomplete financial data.
13. Clearly label any hypothetical example as an example, not a personal recommendation.

FINANCIAL DATA:

Transactions:
${JSON.stringify(transactions)}

Budgets:
${JSON.stringify(budgets)}

User question: ${message}
`;
    const reply = await askGemini(prompt);
    res.json({ reply });
  } catch (error) {
    console.error("Gemini chat error:", error);
    res.status(500).json({
      error: error.message || "AI chat failed.",
    });
  }
});

// AI ANALYSIS
app.get("/api/ai/analysis", async (req, res) => {
  try {
    const transactions = getTransactions();
    const expenses = transactions.filter(
      (item) => item.type === "expense"
    );

    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const totalExpenses = expenses.reduce(
      (sum, item) => sum + Number(item.amount), 0
    );

    const categoryTotals = {};

    for (const item of expenses) {
      categoryTotals[item.category] =
        (categoryTotals[item.category] || 0) + Number(item.amount);
    }

    const topCategory = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])[0];

    const savings = income - totalExpenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    const score = Math.max(
      0,
      Math.min(100, Math.round(income > 0 ? 50 + savingsRate / 2 : 30))
    );

    try {
      const analysis = await askGemini(`
Analyze these personal finance figures in simple English.
Give spending observations and 3 practical ways to save money.
Income: ₹${income}
Expenses: ₹${totalExpenses}
Savings: ₹${savings}
Category totals: ${JSON.stringify(categoryTotals)}
`);

      return res.json({
        score,
        topCategory: topCategory
          ? { category: topCategory[0], total: topCategory[1] }
          : null,
        analysis,
        aiUsed: true,
      });
    } catch (aiError) {
      console.error("AI analysis fallback:", aiError.message);

      return res.json({
        score,
        topCategory: topCategory
          ? { category: topCategory[0], total: topCategory[1] }
          : null,
        analysis: `Your income is ₹${income}, expenses are ₹${totalExpenses}, and balance is ₹${savings}. Review your largest spending category and set a monthly budget.`,
        aiUsed: false,
      });
    }
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({ error: "Could not generate analysis." });
  }
});

// DEMO DATA
app.post("/api/demo/seed", (req, res) => {
  const insert = db.prepare(`
    INSERT INTO transactions
   (name, description, category, amount, type, date)
  VALUES (?, ?, ?, ?, ?, ?)
  `);

  const samples = [
    ["Monthly salary", "Salary", 30000, "income", "2026-09-01"],
    ["Grocery shopping", "Food & Groceries", 2500, "expense", "2026-09-05"],
    ["Bus and metro", "Transport", 1200, "expense", "2026-09-10"],
    ["College books", "Education", 1800, "expense", "2026-09-15"],
    ["Monthly salary", "Salary", 30000, "income", "2026-10-01"],
    ["Restaurant dinner", "Food & Dining", 1800, "expense", "2026-10-05"],
    ["Shopping", "Shopping", 3200, "expense", "2026-10-12"],
    ["Bus pass", "Transport", 1000, "expense", "2026-10-18"],
    ["Monthly salary", "Salary", 32000, "income", "2026-11-01"],
    ["Food and groceries", "Food & Groceries", 2800, "expense", "2026-11-03"],
    ["Auto travel", "Transport", 900, "expense", "2026-11-04"],
  ];

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insert.run(item[0], item[0], item[1], item[2], item[3], item[4]);
    }
  });

  insertMany(samples);
  res.json({ message: "Sample transactions added." });
});

app.post("/api/demo/clear", (req, res) => {
  db.prepare("DELETE FROM transactions").run();
  res.json({ message: "Transactions cleared." });
});

// CSV EXPORT
app.get("/api/export/csv", (req, res) => {
  const transactions = getTransactions();

  const escapeCSV = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const rows = [
    ["Date", "Description", "Category", "Type", "Amount"],
    ...transactions.map((item) => [
      item.date,
      item.description,
      item.category,
      item.type,
      item.amount,
    ]),
  ];

  const csv = rows
    .map((row) => row.map(escapeCSV).join(","))
    .join("\n");

  res.header("Content-Type", "text/csv");
  res.attachment("smartspend-transactions.csv");
  res.send(csv);
});

// Start server
app.listen(PORT, () => {
  console.log(`SmartSpend AI backend running at http://localhost:${PORT}`);
});