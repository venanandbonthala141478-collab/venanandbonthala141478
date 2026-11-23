/* ===== Smart Library Portal ===== */
const STORAGE_KEY = "libraryPortalBooks_v1";
const FINE_PER_DAY = 2; // Rs. per overdue day

const DEFAULT_BOOKS = [
  { id: 1, title: "Introduction to Algorithms", author: "Thomas H. Cormen", category: "Computer Science", issuedTo: null, dueDate: null },
  { id: 2, title: "Python Crash Course", author: "Eric Matthes", category: "Computer Science", issuedTo: null, dueDate: null },
  { id: 3, title: "Database System Concepts", author: "Silberschatz", category: "Computer Science", issuedTo: null, dueDate: null },
  { id: 4, title: "Higher Engineering Mathematics", author: "B. S. Grewal", category: "Mathematics", issuedTo: null, dueDate: null },
  { id: 5, title: "Linear Algebra and Its Applications", author: "Gilbert Strang", category: "Mathematics", issuedTo: null, dueDate: null },
  { id: 6, title: "Digital Electronics", author: "Morris Mano", category: "Electronics", issuedTo: null, dueDate: null },
  { id: 7, title: "The Alchemist", author: "Paulo Coelho", category: "Literature", issuedTo: null, dueDate: null },
  { id: 8, title: "Wings of Fire", author: "A. P. J. Abdul Kalam", category: "Literature", issuedTo: null, dueDate: null },
  { id: 9, title: "A Brief History of Time", author: "Stephen Hawking", category: "Science", issuedTo: null, dueDate: null },
  { id: 10, title: "Machine Learning Basics", author: "Tom Mitchell", category: "Computer Science", issuedTo: null, dueDate: null }
];

const TIPS = {
  "Computer Science": "Practice by coding along while reading. Revise one chapter daily and solve 2 problems from it.",
  "Mathematics": "Solve examples with pen and paper. Do not skip steps; revise formulas every weekend.",
  "Electronics": "Draw the circuit diagrams yourself and verify truth tables to remember them.",
  "Literature": "Read 20 pages a day and write a 3-line summary after each chapter.",
  "Science": "Connect each concept to a real-life example and note down questions to research."
};

let books = [];
let selectedBookId = null;

/* ---------- Storage ---------- */
function loadBooks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    books = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_BOOKS));
  } catch (e) {
    books = JSON.parse(JSON.stringify(DEFAULT_BOOKS));
  }
}
function saveBooks() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(books)); } catch (e) { /* storage unavailable */ }
}
function resetData() {
  if (!confirm("Reset all data to demo books?")) return;
  books = JSON.parse(JSON.stringify(DEFAULT_BOOKS));
  saveBooks();
  refreshAll();
}

/* ---------- Helpers ---------- */
function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function overdueDays(book) {
  if (!book.dueDate) return 0;
  const diff = Math.floor((todayStart() - new Date(book.dueDate)) / 86400000);
  return diff > 0 ? diff : 0;
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- Navigation ---------- */
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === id));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.page === id));
  if (id === "dashboard") renderDashboard();
  if (id === "catalog") renderCatalog();
  window.scrollTo(0, 0);
}
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => showPage(btn.dataset.page));
});

/* ---------- Catalog ---------- */
function categories() {
  return [...new Set(books.map(b => b.category))].sort();
}
function fillCategoryFilters() {
  const filter = document.getElementById("categoryFilter");
  const current = filter.value || "All";
  filter.innerHTML = '<option value="All">All Categories</option>' +
    categories().map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  filter.value = categories().includes(current) ? current : "All";

  const sug = document.getElementById("suggestCategory");
  sug.innerHTML = categories().map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

function renderCatalog() {
  const q = document.getElementById("searchBox").value.trim().toLowerCase();
  const cat = document.getElementById("categoryFilter").value;
  const status = document.getElementById("statusFilter").value;

  const result = books.filter(b => {
    const matchText = b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
    const matchCat = cat === "All" || b.category === cat;
    const isIssued = !!b.issuedTo;
    const matchStatus = status === "All" || (status === "Issued" ? isIssued : !isIssued);
    return matchText && matchCat && matchStatus;
  });

  const list = document.getElementById("bookList");
  list.innerHTML = result.map(b => {
    const issued = !!b.issuedTo;
    const late = overdueDays(b);
    return `
      <div class="book">
        <h4>${escapeHtml(b.title)}</h4>
        <span class="meta">by ${escapeHtml(b.author)}</span>
        <span class="meta">${escapeHtml(b.category)}</span>
        <span class="badge ${issued ? "out" : "ok"}">${issued ? "Issued" : "Available"}</span>
        ${issued ? `<span class="meta">To: ${escapeHtml(b.issuedTo)} · Due: ${formatDate(b.dueDate)}${late ? ` · <b style="color:#d9534f">${late} day(s) late</b>` : ""}</span>` : ""}
        ${issued
          ? `<button class="secondary" onclick="returnBook(${b.id})">Return Book</button>`
          : `<button class="primary" onclick="openIssue(${b.id})">Issue Book</button>`}
      </div>`;
  }).join("");

  document.getElementById("noResult").classList.toggle("hidden", result.length > 0);
}
["searchBox", "categoryFilter", "statusFilter"].forEach(id => {
  document.getElementById(id).addEventListener("input", renderCatalog);
});

/* ---------- Issue / Return ---------- */
function openIssue(id) {
  selectedBookId = id;
  const b = books.find(x => x.id === id);
  document.getElementById("modalBook").textContent = `${b.title} — ${b.author}`;
  document.getElementById("studentName").value = "";
  document.getElementById("issueDays").value = 7;
  setMsg("modalMsg", "", "");
  document.getElementById("modal").classList.remove("hidden");
}
function closeModal() {
  document.getElementById("modal").classList.add("hidden");
}
document.getElementById("confirmIssue").addEventListener("click", () => {
  const name = document.getElementById("studentName").value.trim();
  const days = parseInt(document.getElementById("issueDays").value, 10);

  if (!name) return setMsg("modalMsg", "Please enter the student name.", "error");
  if (!/^[A-Za-z .'-]{2,}$/.test(name)) return setMsg("modalMsg", "Name should contain letters only (min 2).", "error");
  if (isNaN(days) || days < 1 || days > 30) return setMsg("modalMsg", "Days must be between 1 and 30.", "error");

  const book = books.find(b => b.id === selectedBookId);
  if (!book || book.issuedTo) return setMsg("modalMsg", "This book is already issued.", "error");

  book.issuedTo = name;
  book.dueDate = addDays(todayStart(), days).toISOString();
  saveBooks();
  closeModal();
  refreshAll();
});

function returnBook(id) {
  const book = books.find(b => b.id === id);
  if (!book) return;
  const late = overdueDays(book);
  const fine = late * FINE_PER_DAY;
  book.issuedTo = null;
  book.dueDate = null;
  saveBooks();
  refreshAll();
  alert(late > 0
    ? `Book returned. It was ${late} day(s) late. Fine: Rs. ${fine}`
    : "Book returned on time. No fine.");
}

/* ---------- Add Book ---------- */
document.getElementById("addForm").addEventListener("submit", e => {
  e.preventDefault();
  const title = document.getElementById("bTitle").value.trim();
  const author = document.getElementById("bAuthor").value.trim();
  const category = document.getElementById("bCategory").value;

  if (!title || !author) return setMsg("addMsg", "Title and author are required.", "error");
  if (title.length < 2 || author.length < 2) return setMsg("addMsg", "Please enter at least 2 characters.", "error");
  const duplicate = books.some(b => b.title.toLowerCase() === title.toLowerCase() && b.author.toLowerCase() === author.toLowerCase());
  if (duplicate) return setMsg("addMsg", "This book already exists in the catalog.", "error");

  const nextId = books.length ? Math.max(...books.map(b => b.id)) + 1 : 1;
  books.push({ id: nextId, title, author, category, issuedTo: null, dueDate: null });
  saveBooks();
  e.target.reset();
  setMsg("addMsg", `"${title}" added successfully.`, "success");
  refreshAll();
});

/* ---------- Dashboard ---------- */
function renderDashboard() {
  const issued = books.filter(b => b.issuedTo);
  const overdue = issued.filter(b => overdueDays(b) > 0);
  document.getElementById("sTotal").textContent = books.length;
  document.getElementById("sIssued").textContent = issued.length;
  document.getElementById("sAvail").textContent = books.length - issued.length;
  document.getElementById("sOverdue").textContent = overdue.length;

  const tbody = document.getElementById("issuedTable");
  tbody.innerHTML = issued.length
    ? issued.map(b => {
        const late = overdueDays(b);
        return `<tr>
          <td>${escapeHtml(b.title)}</td>
          <td>${escapeHtml(b.issuedTo)}</td>
          <td>${formatDate(b.dueDate)}</td>
          <td>${late ? `<span class="badge out">Overdue ${late}d</span>` : `<span class="badge ok">On time</span>`}</td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="4" class="muted">No books are currently issued.</td></tr>`;
}

/* ---------- Reading suggestions ---------- */
function makeSuggestion() {
  const cat = document.getElementById("suggestCategory").value;
  const out = document.getElementById("suggestOut");
  const avail = books.filter(b => b.category === cat && !b.issuedTo);
  const tip = TIPS[cat] || "Set a fixed daily reading time and take short notes while reading.";

  out.innerHTML = `
    <h3>Recommended in ${escapeHtml(cat)}</h3>
    ${avail.length
      ? "<ul>" + avail.map(b => `<li><b>${escapeHtml(b.title)}</b> — ${escapeHtml(b.author)}</li>`).join("") + "</ul>"
      : "<p class='muted'>All books in this category are currently issued.</p>"}
    <h3>Study Tip</h3>
    <p>${escapeHtml(tip)}</p>`;
  out.classList.remove("hidden");
}

/* ---------- Common ---------- */
function setMsg(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = "msg" + (type ? " " + type : "");
}
function refreshAll() {
  fillCategoryFilters();
  renderCatalog();
  renderDashboard();
}

loadBooks();
refreshAll();
