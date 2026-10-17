// ==================== ذخیره‌سازی داده ====================
const STORAGE_KEY = 'accounting_app_data';

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('خطا در خواندن داده', e);
    }
  }
  return {
    persons: [],
    goods: [],
    purchases: [],
    invoices: [],
    nextId: { person: 1, good: 1, purchase: 1, invoice: 1 }
  };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let db = loadData();

// مرتب‌سازی الفبایی (پشتیبانی از فارسی)
function sortByName(arr) {
  return [...arr].sort((a, b) => a.name.localeCompare(b.name, 'fa'));
}

// ==================== تب‌ها ====================
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
    refreshCurrentTab(tab.dataset.tab);
  });
});

function refreshCurrentTab(tabName) {
  if (tabName === 'dashboard') renderDashboard();
  else if (tabName === 'persons') renderPersons();
  else if (tabName === 'goods') renderGoods();
  else if (tabName === 'purchases') renderPurchases();
  else if (tabName === 'invoice') {
    renderInvoicesList();
    // تنظیم تاریخ امروز
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoice-date').value = today;
  }
  else if (tabName === 'reports') renderReports();
}

// ==================== داشبورد ====================
function renderDashboard() {
  document.getElementById('stat-persons').textContent = db.persons.length;
  document.getElementById('stat-goods').textContent = db.goods.length;
  document.getElementById('stat-purchases').textContent = db.purchases.length;

  const total = db.purchases.reduce((sum, p) => sum + (p.total || 0), 0);
  document.getElementById('stat-total').textContent = formatNumber(total) + ' ریال';

  const recent = [...db.purchases].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  const container = document.getElementById('recent-purchases');
  if (recent.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>هنوز خریدی ثبت نشده است</p></div>';
    return;
  }
  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>تاریخ</th>
          <th>شخص</th>
          <th>تعداد اقلام</th>
          <th>مبلغ کل</th>
        </tr>
      </thead>
      <tbody>
        ${recent.map(p => {
          const person = db.persons.find(x => x.id === p.personId);
          return `
            <tr>
              <td>${formatDate(p.date)}</td>
              <td>${person ? person.name : '—'}</td>
              <td>${p.items?.length || 0}</td>
              <td>${formatNumber(p.total)} ریال</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

// ==================== اشخاص ====================
function renderPersons(filter = '') {
  let list = sortByName(db.persons);
  if (filter) {
    const f = filter.trim().toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(f) || (p.phone && p.phone.includes(f)));
  }

  const container = document.getElementById('persons-list');
  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>شخصی یافت نشد</p></div>';
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>نام</th>
          <th>تلفن</th>
          <th>آدرس</th>
          <th>عملیات</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(p => `
          <tr>
            <td>${p.name}</td>
            <td>${p.phone || '—'}</td>
            <td>${p.address || '—'}</td>
            <td>
              <button class="btn btn-outline btn-sm" onclick="editPerson(${p.id})">ویرایش</button>
              <button class="btn btn-danger btn-sm" onclick="deletePerson(${p.id})">حذف</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function filterPersons() {
  renderPersons(document.getElementById('person-search').value);
}

function openPersonModal(id = null) {
  document.getElementById('person-modal').classList.add('show');
  if (id) {
    const p = db.persons.find(x => x.id === id);
    document.getElementById('person-modal-title').textContent = 'ویرایش شخص';
    document.getElementById('person-id').value = p.id;
    document.getElementById('person-name').value = p.name;
    document.getElementById('person-phone').value = p.phone || '';
    document.getElementById('person-address').value = p.address || '';
  } else {
    document.getElementById('person-modal-title').textContent = 'افزودن شخص';
    document.getElementById('person-id').value = '';
    document.getElementById('person-name').value = '';
    document.getElementById('person-phone').value = '';
    document.getElementById('person-address').value = '';
  }
}

function closePersonModal() {
  document.getElementById('person-modal').classList.remove('show');
}

function savePerson() {
  const id = document.getElementById('person-id').value;
  const name = document.getElementById('person-name').value.trim();
  if (!name) {
    alert('نام شخص الزامی است');
    return;
  }

  if (id) {
    const p = db.persons.find(x => x.id === Number(id));
    p.name = name;
    p.phone = document.getElementById('person-phone').value.trim();
    p.address = document.getElementById('person-address').value.trim();
  } else {
    db.persons.push({
      id: db.nextId.person++,
      name,
      phone: document.getElementById('person-phone').value.trim(),
      address: document.getElementById('person-address').value.trim()
    });
  }
  // مرتب‌سازی الفبایی
  db.persons = sortByName(db.persons);
  saveData(db);
  closePersonModal();
  renderPersons(document.getElementById('person-search').value);
  renderDashboard();
}

function editPerson(id) {
  openPersonModal(id);
}

function deletePerson(id) {
  if (!confirm('آیا از حذف این شخص مطمئن هستید؟')) return;
  db.persons = db.persons.filter(p => p.id !== id);
  saveData(db);
  renderPersons(document.getElementById('person-search').value);
  renderDashboard();
}

// ==================== کالاها ====================
function renderGoods(filter = '') {
  let list = sortByName(db.goods);
  if (filter) {
    const f = filter.trim().toLowerCase();
    list = list.filter(g => g.name.toLowerCase().includes(f));
  }

  const container = document.getElementById('goods-list');
  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>کالایی یافت نشد</p></div>';
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>نام کالا</th>
          <th>واحد</th>
          <th>قیمت پیش‌فرض</th>
          <th>عملیات</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(g => `
          <tr>
            <td>${g.name}</td>
            <td>${g.unit || '—'}</td>
            <td>${formatNumber(g.price || 0)} ریال</td>
            <td>
              <button class="btn btn-outline btn-sm" onclick="editGood(${g.id})">ویرایش</button>
              <button class="btn btn-danger btn-sm" onclick="deleteGood(${g.id})">حذف</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function filterGoods() {
  renderGoods(document.getElementById('good-search').value);
}

function openGoodModal(id = null) {
  document.getElementById('good-modal').classList.add('show');
  if (id) {
    const g = db.goods.find(x => x.id === id);
    document.getElementById('good-modal-title').textContent = 'ویرایش کالا';
    document.getElementById('good-id').value = g.id;
    document.getElementById('good-name').value = g.name;
    document.getElementById('good-unit').value = g.unit || '';
    document.getElementById('good-price').value = g.price || '';
  } else {
    document.getElementById('good-modal-title').textContent = 'افزودن کالا';
    document.getElementById('good-id').value = '';
    document.getElementById('good-name').value = '';
    document.getElementById('good-unit').value = '';
    document.getElementById('good-price').value = '';
  }
}

function closeGoodModal() {
  document.getElementById('good-modal').classList.remove('show');
}

function saveGood() {
  const id = document.getElementById('good-id').value;
  const name = document.getElementById('good-name').value.trim();
  if (!name) {
    alert('نام کالا الزامی است');
    return;
  }

  if (id) {
    const g = db.goods.find(x => x.id === Number(id));
    g.name = name;
    g.unit = document.getElementById('good-unit').value.trim();
    g.price = Number(document.getElementById('good-price').value) || 0;
  } else {
    db.goods.push({
      id: db.nextId.good++,
      name,
      unit: document.getElementById('good-unit').value.trim(),
      price: Number(document.getElementById('good-price').value) || 0
    });
  }
  db.goods = sortByName(db.goods);
  saveData(db);
  closeGoodModal();
  renderGoods(document.getElementById('good-search').value);
  renderDashboard();
}

function editGood(id) {
  openGoodModal(id);
}

function deleteGood(id) {
  if (!confirm('آیا از حذف این کالا مطمئن هستید؟')) return;
  db.goods = db.goods.filter(g => g.id !== id);
  saveData(db);
  renderGoods(document.getElementById('good-search').value);
  renderDashboard();
}

// ==================== خریدها ====================
function renderPurchases(filter = '') {
  let list = [...db.purchases].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (filter) {
    const f = filter.trim().toLowerCase();
    list = list.filter(p => {
      const person = db.persons.find(x => x.id === p.personId);
      return (person && person.name.toLowerCase().includes(f)) ||
             (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(f));
    });
  }

  const container = document.getElementById('purchases-list');
  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>خریدی یافت نشد</p></div>';
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>شماره فاکتور</th>
          <th>تاریخ</th>
          <th>شخص</th>
          <th>تعداد اقلام</th>
          <th>مبلغ کل</th>
          <th>عملیات</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(p => {
          const person = db.persons.find(x => x.id === p.personId);
          return `
            <tr>
              <td>${p.invoiceNumber || '—'}</td>
              <td>${formatDate(p.date)}</td>
              <td>${person ? person.name : '—'}</td>
              <td>${p.items?.length || 0}</td>
              <td>${formatNumber(p.total)} ریال</td>
              <td>
                <button class="btn btn-outline btn-sm" onclick="openEditInvoice(${p.id})">ویرایش</button>
                <button class="btn btn-danger btn-sm" onclick="deletePurchase(${p.id})">حذف</button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function filterPurchases() {
  renderPurchases(document.getElementById('purchase-search').value);
}

function viewPurchase(id) {
  const p = db.purchases.find(x => x.id === id);
  if (!p) return;
  const person = db.persons.find(x => x.id === p.personId);
  let details = `فاکتور: ${p.invoiceNumber || '—'}\nتاریخ: ${formatDate(p.date)}\nشخص: ${person ? person.name : '—'}\n\nاقلام:\n`;
  (p.items || []).forEach(item => {
    const good = db.goods.find(g => g.id === item.goodId);
    details += `• ${good ? good.name : 'کالای حذف‌شده'} × ${item.qty} = ${formatNumber(item.qty * item.price)} ریال\n`;
  });
  details += `\nجمع کل: ${formatNumber(p.total)} ریال`;
  alert(details);
}

function deletePurchase(id) {
  if (!confirm('آیا از حذف این خرید مطمئن هستید؟')) return;
  db.purchases = db.purchases.filter(p => p.id !== id);
  saveData(db);
  renderPurchases(document.getElementById('purchase-search')?.value || '');
  renderDashboard();
  renderInvoicesList();
  const currentPersonId = document.getElementById('invoice-person-id')?.value;
  if (currentPersonId) {
    renderPersonInvoices(currentPersonId);
  }
}

// ==================== فاکتور (تب جدید) ====================
let invoiceItems = []; // اقلام موقت فاکتور جاری

// --- جستجوی شخص (جستجوی الفبایی) ---
function showPersonDropdown() {
  const dropdown = document.getElementById('person-dropdown');
  dropdown.classList.add('show');
  filterPersonDropdown();
}

function filterPersonDropdown() {
  const query = document.getElementById('invoice-person-search').value.trim().toLowerCase();
  const dropdown = document.getElementById('person-dropdown');
  let list = sortByName(db.persons);

  if (query) {
    list = list.filter(p => p.name.toLowerCase().includes(query) || (p.phone && p.phone.includes(query)));
  }

  if (list.length === 0) {
    dropdown.innerHTML = '<div class="dropdown-empty">شخصی یافت نشد</div>';
    return;
  }

  dropdown.innerHTML = list.map(p => `
    <div class="dropdown-item" onclick="selectPerson(${p.id}, '${escapeHtml(p.name)}')">
      ${p.name}
      ${p.phone ? `<div class="meta">${p.phone}</div>` : ''}
    </div>
  `).join('');
}

function selectPerson(id, name) {
  document.getElementById('invoice-person-id').value = id;
  document.getElementById('invoice-person-search').value = name;
  document.getElementById('person-dropdown').classList.remove('show');
  // نمایش فاکتورهای این شخص
  renderPersonInvoices(id);
}

// --- جستجوی کالا (جستجوی الفبایی) ---
function showGoodDropdown() {
  const dropdown = document.getElementById('good-dropdown');
  dropdown.classList.add('show');
  filterGoodDropdown();
}

function filterGoodDropdown() {
  const query = document.getElementById('invoice-good-search').value.trim().toLowerCase();
  const dropdown = document.getElementById('good-dropdown');
  let list = sortByName(db.goods);

  if (query) {
    list = list.filter(g => g.name.toLowerCase().includes(query));
  }

  if (list.length === 0) {
    dropdown.innerHTML = '<div class="dropdown-empty">کالایی یافت نشد</div>';
    return;
  }

  dropdown.innerHTML = list.map(g => `
    <div class="dropdown-item" onclick="addGoodToInvoice(${g.id})">
      ${g.name}
      <div class="meta">${g.unit || ''} — ${formatNumber(g.price || 0)} ریال</div>
    </div>
  `).join('');
}

function addGoodToInvoice(goodId) {
  const good = db.goods.find(g => g.id === goodId);
  if (!good) return;

  // اگر قبلاً اضافه شده، تعداد را افزایش بده
  const existing = invoiceItems.find(i => i.goodId === goodId);
  if (existing) {
    existing.qty += 1;
  } else {
    invoiceItems.push({
      goodId: good.id,
      name: good.name,
      qty: 1,
      price: good.price || 0
    });
  }

  document.getElementById('invoice-good-search').value = '';
  document.getElementById('good-dropdown').classList.remove('show');
  renderInvoiceItems();
}

function renderInvoiceItems() {
  const tbody = document.getElementById('invoice-items-body');
  if (invoiceItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#64748b;">هنوز کالایی اضافه نشده</td></tr>';
    document.getElementById('invoice-total').textContent = '۰';
    return;
  }

  let total = 0;
  tbody.innerHTML = invoiceItems.map((item, idx) => {
    const lineTotal = item.qty * item.price;
    total += lineTotal;
    return `
      <tr>
        <td>${item.name}</td>
        <td><input type="number" min="1" value="${item.qty}" onchange="updateItemQty(${idx}, this.value)"></td>
        <td><input type="number" min="0" value="${item.price}" onchange="updateItemPrice(${idx}, this.value)"></td>
        <td>${formatNumber(lineTotal)}</td>
        <td><button class="btn btn-danger btn-sm" onclick="removeInvoiceItem(${idx})">حذف</button></td>
      </tr>
    `;
  }).join('');

  document.getElementById('invoice-total').textContent = formatNumber(total);
}

function updateItemQty(idx, val) {
  invoiceItems[idx].qty = Math.max(1, Number(val) || 1);
  renderInvoiceItems();
}

function updateItemPrice(idx, val) {
  invoiceItems[idx].price = Math.max(0, Number(val) || 0);
  renderInvoiceItems();
}

function removeInvoiceItem(idx) {
  invoiceItems.splice(idx, 1);
  renderInvoiceItems();
}

function saveInvoice() {
  const personId = Number(document.getElementById('invoice-person-id').value);
  if (!personId) {
    alert('لطفاً شخص را انتخاب کنید');
    return;
  }
  if (invoiceItems.length === 0) {
    alert('حداقل یک کالا اضافه کنید');
    return;
  }

  const date = document.getElementById('invoice-date').value || new Date().toISOString().split('T')[0];
  const invoiceNumber = document.getElementById('invoice-number').value.trim();
  const total = invoiceItems.reduce((sum, i) => sum + i.qty * i.price, 0);

  const purchase = {
    id: db.nextId.purchase++,
    personId,
    date,
    invoiceNumber,
    items: invoiceItems.map(i => ({
      goodId: i.goodId,
      qty: i.qty,
      price: i.price
    })),
    total
  };

  db.purchases.push(purchase);
  saveData(db);

  alert('فاکتور با موفقیت ثبت شد');
  // نگه داشتن شخص انتخاب‌شده و نمایش فاکتورهایش
  const selectedPersonId = personId;
  const selectedPersonName = document.getElementById('invoice-person-search').value;
  clearInvoice();
  // بازگرداندن شخص انتخاب‌شده
  document.getElementById('invoice-person-id').value = selectedPersonId;
  document.getElementById('invoice-person-search').value = selectedPersonName;
  renderPersonInvoices(selectedPersonId);
  renderInvoicesList();
  renderDashboard();
}

function clearInvoice() {
  invoiceItems = [];
  document.getElementById('invoice-person-id').value = '';
  document.getElementById('invoice-person-search').value = '';
  document.getElementById('invoice-number').value = '';
  document.getElementById('invoice-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('person-invoices-section').style.display = 'none';
  renderInvoiceItems();
}

function renderInvoicesList() {
  const list = [...db.purchases].sort((a, b) => new Date(b.date) - new Date(a.date));
  const container = document.getElementById('invoices-list');

  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>فاکتوری ثبت نشده است</p></div>';
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>شماره</th>
          <th>تاریخ</th>
          <th>شخص</th>
          <th>مبلغ</th>
          <th>عملیات</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(p => {
          const person = db.persons.find(x => x.id === p.personId);
          return `
            <tr class="clickable-row" onclick="openEditInvoice(${p.id})">
              <td>${p.invoiceNumber || '#' + p.id}</td>
              <td>${formatDate(p.date)}</td>
              <td>${person ? person.name : '—'}</td>
              <td>${formatNumber(p.total)} ریال</td>
              <td>
                <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); openEditInvoice(${p.id})">ویرایش</button>
                <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deletePurchase(${p.id})">حذف</button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

// نمایش فاکتورهای یک شخص خاص
function renderPersonInvoices(personId) {
  const section = document.getElementById('person-invoices-section');
  const container = document.getElementById('person-invoices-list');
  const list = db.purchases
    .filter(p => p.personId === Number(personId))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (list.length === 0) {
    section.style.display = 'block';
    container.innerHTML = '<div class="empty-state"><p>این شخص هنوز فاکتوری ندارد</p></div>';
    return;
  }

  section.style.display = 'block';
  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>شماره</th>
          <th>تاریخ</th>
          <th>تعداد اقلام</th>
          <th>مبلغ</th>
          <th>عملیات</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(p => `
          <tr class="clickable-row" onclick="openEditInvoice(${p.id})">
            <td>${p.invoiceNumber || '#' + p.id}</td>
            <td>${formatDate(p.date)}</td>
            <td>${p.items?.length || 0}</td>
            <td>${formatNumber(p.total)} ریال</td>
            <td>
              <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); openEditInvoice(${p.id})">ویرایش</button>
              <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deletePurchase(${p.id})">حذف</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ==================== ویرایش فاکتور ====================
let editInvoiceItems = [];

function openEditInvoice(id) {
  const purchase = db.purchases.find(p => p.id === id);
  if (!purchase) return;

  document.getElementById('edit-invoice-id').value = purchase.id;

  // شخص
  const person = db.persons.find(x => x.id === purchase.personId);
  document.getElementById('edit-invoice-person-id').value = purchase.personId;
  document.getElementById('edit-invoice-person-search').value = person ? person.name : '';

  // تاریخ و شماره
  document.getElementById('edit-invoice-date').value = purchase.date || '';
  document.getElementById('edit-invoice-number').value = purchase.invoiceNumber || '';

  // اقلام
  editInvoiceItems = (purchase.items || []).map(item => {
    const good = db.goods.find(g => g.id === item.goodId);
    return {
      goodId: item.goodId,
      name: good ? good.name : 'کالای حذف‌شده',
      qty: item.qty,
      price: item.price
    };
  });

  renderEditInvoiceItems();
  document.getElementById('edit-invoice-modal').classList.add('show');
}

function closeEditInvoiceModal() {
  document.getElementById('edit-invoice-modal').classList.remove('show');
  editInvoiceItems = [];
}

// --- جستجوی شخص در مودال ویرایش ---
function showEditPersonDropdown() {
  document.getElementById('edit-person-dropdown').classList.add('show');
  filterEditPersonDropdown();
}

function filterEditPersonDropdown() {
  const query = document.getElementById('edit-invoice-person-search').value.trim().toLowerCase();
  const dropdown = document.getElementById('edit-person-dropdown');
  let list = sortByName(db.persons);

  if (query) {
    list = list.filter(p => p.name.toLowerCase().includes(query) || (p.phone && p.phone.includes(query)));
  }

  if (list.length === 0) {
    dropdown.innerHTML = '<div class="dropdown-empty">شخصی یافت نشد</div>';
    return;
  }

  dropdown.innerHTML = list.map(p => `
    <div class="dropdown-item" onclick="selectEditPerson(${p.id}, '${escapeHtml(p.name)}')">
      ${p.name}
      ${p.phone ? `<div class="meta">${p.phone}</div>` : ''}
    </div>
  `).join('');
}

function selectEditPerson(id, name) {
  document.getElementById('edit-invoice-person-id').value = id;
  document.getElementById('edit-invoice-person-search').value = name;
  document.getElementById('edit-person-dropdown').classList.remove('show');
}

// --- جستجوی کالا در مودال ویرایش ---
function showEditGoodDropdown() {
  document.getElementById('edit-good-dropdown').classList.add('show');
  filterEditGoodDropdown();
}

function filterEditGoodDropdown() {
  const query = document.getElementById('edit-invoice-good-search').value.trim().toLowerCase();
  const dropdown = document.getElementById('edit-good-dropdown');
  let list = sortByName(db.goods);

  if (query) {
    list = list.filter(g => g.name.toLowerCase().includes(query));
  }

  if (list.length === 0) {
    dropdown.innerHTML = '<div class="dropdown-empty">کالایی یافت نشد</div>';
    return;
  }

  dropdown.innerHTML = list.map(g => `
    <div class="dropdown-item" onclick="addGoodToEditInvoice(${g.id})">
      ${g.name}
      <div class="meta">${g.unit || ''} — ${formatNumber(g.price || 0)} ریال</div>
    </div>
  `).join('');
}

function addGoodToEditInvoice(goodId) {
  const good = db.goods.find(g => g.id === goodId);
  if (!good) return;

  const existing = editInvoiceItems.find(i => i.goodId === goodId);
  if (existing) {
    existing.qty += 1;
  } else {
    editInvoiceItems.push({
      goodId: good.id,
      name: good.name,
      qty: 1,
      price: good.price || 0
    });
  }

  document.getElementById('edit-invoice-good-search').value = '';
  document.getElementById('edit-good-dropdown').classList.remove('show');
  renderEditInvoiceItems();
}

function renderEditInvoiceItems() {
  const tbody = document.getElementById('edit-invoice-items-body');
  if (editInvoiceItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#64748b;">هنوز کالایی اضافه نشده</td></tr>';
    document.getElementById('edit-invoice-total').textContent = '۰';
    return;
  }

  let total = 0;
  tbody.innerHTML = editInvoiceItems.map((item, idx) => {
    const lineTotal = item.qty * item.price;
    total += lineTotal;
    return `
      <tr>
        <td>
          <div class="searchable-select" style="min-width:140px;">
            <input type="text" value="${escapeHtmlAttr(item.name)}" 
                   onfocus="showRowGoodDropdown(${idx})" 
                   oninput="filterRowGoodDropdown(${idx}, this.value)"
                   autocomplete="off"
                   style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-family:inherit;font-size:0.9rem;">
            <div class="dropdown-list" id="row-good-dropdown-${idx}"></div>
          </div>
        </td>
        <td><input type="number" min="0.01" step="any" value="${item.qty}" onchange="updateEditItemQty(${idx}, this.value)"></td>
        <td><input type="number" min="0" value="${item.price}" onchange="updateEditItemPrice(${idx}, this.value)"></td>
        <td>${formatNumber(lineTotal)}</td>
        <td><button class="btn btn-danger btn-sm" onclick="removeEditInvoiceItem(${idx})">حذف</button></td>
      </tr>
    `;
  }).join('');

  document.getElementById('edit-invoice-total').textContent = formatNumber(total);
}

function escapeHtmlAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// تغییر کالا در هر ردیف با جستجوی کشویی
function showRowGoodDropdown(idx) {
  // بستن بقیه
  document.querySelectorAll('[id^="row-good-dropdown-"]').forEach(el => el.classList.remove('show'));
  const dropdown = document.getElementById(`row-good-dropdown-${idx}`);
  if (dropdown) {
    dropdown.classList.add('show');
    filterRowGoodDropdown(idx, editInvoiceItems[idx].name);
  }
}

function filterRowGoodDropdown(idx, query) {
  const dropdown = document.getElementById(`row-good-dropdown-${idx}`);
  if (!dropdown) return;
  let list = sortByName(db.goods);
  const q = (query || '').trim().toLowerCase();
  if (q) {
    list = list.filter(g => g.name.toLowerCase().includes(q));
  }
  if (list.length === 0) {
    dropdown.innerHTML = '<div class="dropdown-empty">کالایی یافت نشد</div>';
    return;
  }
  dropdown.innerHTML = list.map(g => `
    <div class="dropdown-item" onclick="selectRowGood(${idx}, ${g.id}, '${escapeHtml(g.name)}', ${g.price || 0})">
      ${g.name}
      <div class="meta">${g.unit || ''} — ${formatNumber(g.price || 0)} ریال</div>
    </div>
  `).join('');
}

function selectRowGood(idx, goodId, name, price) {
  editInvoiceItems[idx].goodId = goodId;
  editInvoiceItems[idx].name = name;
  // قیمت را فقط اگر هنوز صفر است تغییر بده
  if (!editInvoiceItems[idx].price) {
    editInvoiceItems[idx].price = price;
  }
  document.getElementById(`row-good-dropdown-${idx}`).classList.remove('show');
  renderEditInvoiceItems();
}

function updateEditItemQty(idx, val) {
  editInvoiceItems[idx].qty = Math.max(0.01, Number(val) || 0.01);
  renderEditInvoiceItems();
}

function updateEditItemPrice(idx, val) {
  editInvoiceItems[idx].price = Math.max(0, Number(val) || 0);
  renderEditInvoiceItems();
}

function removeEditInvoiceItem(idx) {
  editInvoiceItems.splice(idx, 1);
  renderEditInvoiceItems();
}

function saveEditedInvoice() {
  const id = Number(document.getElementById('edit-invoice-id').value);
  const personId = Number(document.getElementById('edit-invoice-person-id').value);

  if (!personId) {
    alert('لطفاً شخص را انتخاب کنید');
    return;
  }
  if (editInvoiceItems.length === 0) {
    alert('حداقل یک کالا اضافه کنید');
    return;
  }

  const purchase = db.purchases.find(p => p.id === id);
  if (!purchase) return;

  purchase.personId = personId;
  purchase.date = document.getElementById('edit-invoice-date').value || purchase.date;
  purchase.invoiceNumber = document.getElementById('edit-invoice-number').value.trim();
  purchase.items = editInvoiceItems.map(i => ({
    goodId: i.goodId,
    qty: i.qty,
    price: i.price
  }));
  purchase.total = editInvoiceItems.reduce((sum, i) => sum + i.qty * i.price, 0);

  saveData(db);
  closeEditInvoiceModal();
  alert('فاکتور با موفقیت ویرایش شد');

  // رفرش لیست‌ها
  renderInvoicesList();
  const currentPersonId = document.getElementById('invoice-person-id').value;
  if (currentPersonId) {
    renderPersonInvoices(currentPersonId);
  }
  renderDashboard();
  if (document.getElementById('purchases').classList.contains('active')) {
    renderPurchases(document.getElementById('purchase-search')?.value || '');
  }
}

// ==================== گزارش‌ها ====================
function renderReports() {
  // بر اساس شخص
  const byPerson = {};
  db.purchases.forEach(p => {
    if (!byPerson[p.personId]) byPerson[p.personId] = 0;
    byPerson[p.personId] += p.total || 0;
  });

  const personReport = Object.entries(byPerson)
    .map(([pid, total]) => {
      const person = db.persons.find(x => x.id === Number(pid));
      return { name: person ? person.name : 'نامشخص', total };
    })
    .sort((a, b) => b.total - a.total);

  document.getElementById('report-by-person').innerHTML = personReport.length
    ? `<ul style="list-style:none;padding:0;">${personReport.map(r => `<li style="padding:6px 0;border-bottom:1px solid #eee;">${r.name}: <strong>${formatNumber(r.total)}</strong> ریال</li>`).join('')}</ul>`
    : '<p style="color:#64748b;">داده‌ای وجود ندارد</p>';

  // بر اساس کالا
  const byGood = {};
  db.purchases.forEach(p => {
    (p.items || []).forEach(item => {
      if (!byGood[item.goodId]) byGood[item.goodId] = { qty: 0, total: 0 };
      byGood[item.goodId].qty += item.qty;
      byGood[item.goodId].total += item.qty * item.price;
    });
  });

  const goodReport = Object.entries(byGood)
    .map(([gid, data]) => {
      const good = db.goods.find(x => x.id === Number(gid));
      return { name: good ? good.name : 'نامشخص', ...data };
    })
    .sort((a, b) => b.total - a.total);

  document.getElementById('report-by-good').innerHTML = goodReport.length
    ? `<ul style="list-style:none;padding:0;">${goodReport.map(r => `<li style="padding:6px 0;border-bottom:1px solid #eee;">${r.name}: ${r.qty} عدد — <strong>${formatNumber(r.total)}</strong> ریال</li>`).join('')}</ul>`
    : '<p style="color:#64748b;">داده‌ای وجود ندارد</p>';
}

// ==================== ابزارها ====================
function formatNumber(n) {
  return Number(n || 0).toLocaleString('fa-IR');
}

function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('fa-IR');
  } catch {
    return d;
  }
}

function escapeHtml(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// بستن دراپ‌داون با کلیک بیرون
document.addEventListener('click', (e) => {
  if (!e.target.closest('#person-select-wrapper')) {
    document.getElementById('person-dropdown')?.classList.remove('show');
  }
  if (!e.target.closest('#good-select-wrapper')) {
    document.getElementById('good-dropdown')?.classList.remove('show');
  }
  if (!e.target.closest('#edit-person-select-wrapper')) {
    document.getElementById('edit-person-dropdown')?.classList.remove('show');
  }
  if (!e.target.closest('#edit-good-select-wrapper')) {
    document.getElementById('edit-good-dropdown')?.classList.remove('show');
  }
  // بستن دراپ‌داون‌های ردیفی کالا
  if (!e.target.closest('[id^="row-good-dropdown-"]') && !e.target.closest('.searchable-select')) {
    document.querySelectorAll('[id^="row-good-dropdown-"]').forEach(el => el.classList.remove('show'));
  }
});

// خروجی / ورود داده
function exportData() {
  const dataStr = JSON.stringify(db, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'accounting_backup_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importData() {
  document.getElementById('import-file').click();
}

function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported.persons && imported.goods && imported.purchases) {
        db = imported;
        // اطمینان از مرتب‌سازی الفبایی
        db.persons = sortByName(db.persons || []);
        db.goods = sortByName(db.goods || []);
        saveData(db);
        alert('داده با موفقیت وارد شد');
        renderDashboard();
        renderPersons();
        renderGoods();
        renderPurchases();
        renderInvoicesList();
      } else {
        alert('فایل معتبر نیست');
      }
    } catch {
      alert('خطا در خواندن فایل');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// راه‌اندازی اولیه
document.addEventListener('DOMContentLoaded', () => {
  // مرتب‌سازی اولیه
  db.persons = sortByName(db.persons);
  db.goods = sortByName(db.goods);
  saveData(db);
  renderDashboard();
});
