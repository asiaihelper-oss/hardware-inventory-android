const STORAGE_KEYS = {
  employees: "hardware_inventory_employees_v1",
  assets: "hardware_inventory_assets_v1",
  assignments: "hardware_inventory_assignments_v1",
  history: "hardware_inventory_history_v1"
};

const state = {
  employees: load(STORAGE_KEYS.employees),
  assets: load(STORAGE_KEYS.assets),
  assignments: load(STORAGE_KEYS.assignments),
  history: load(STORAGE_KEYS.history)
};

const pageMeta = {
  dashboard: ["Dashboard", "Overview of your hardware inventory"],
  employees: ["Employees", "Manage employees and assigned assets"],
  assets: ["Assets", "Track all hardware equipment and asset codes"],
  assignments: ["Assignments", "Issue, return, or transfer hardware assets"],
  history: ["History", "Complete asset movement and accountability log"]
};

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function saveAll() {
  localStorage.setItem(STORAGE_KEYS.employees, JSON.stringify(state.employees));
  localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(state.assets));
  localStorage.setItem(STORAGE_KEYS.assignments, JSON.stringify(state.assignments));
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function statusClass(status = "") {
  return status.toLowerCase().replaceAll(" ", "-")
    .replace("under-repair", "repair")
    .replace("for-replacement", "replacement");
}

function employeeById(id) {
  return state.employees.find(e => e.id === id);
}

function assetById(id) {
  return state.assets.find(a => a.id === id);
}

function activeAssignmentForAsset(assetId) {
  return state.assignments.find(a => a.assetId === assetId && a.status === "Active");
}

function renderAll() {
  renderDashboard();
  renderEmployees();
  renderAssets();
  renderAssignmentOptions();
  renderCurrentAssignments();
  renderHistory();
}

function renderDashboard() {
  document.getElementById("statTotalAssets").textContent = state.assets.length;
  document.getElementById("statAvailable").textContent = state.assets.filter(a => a.status === "Available").length;
  document.getElementById("statAssigned").textContent = state.assets.filter(a => a.status === "Assigned").length;
  document.getElementById("statRepair").textContent = state.assets.filter(a => a.status === "Under Repair").length;
  document.getElementById("statEmployees").textContent = state.employees.filter(e => e.status === "Active").length;

  const recent = [...state.history]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  const activity = document.getElementById("recentActivity");
  activity.innerHTML = recent.length
    ? recent.map(item => `
      <div class="activity-item">
        <strong>${escapeHtml(item.action)}: ${escapeHtml(item.assetCode)}</strong>
        <small>${escapeHtml(item.employeeName || "No employee")} · ${formatDate(item.date)}</small>
      </div>
    `).join("")
    : '<div class="empty-state">No activity yet.</div>';

  const statuses = ["Available", "Assigned", "Under Repair", "For Replacement", "Lost", "Disposed"];
  document.getElementById("statusSummary").innerHTML = statuses.map(status => `
    <div class="status-row">
      <span><span class="badge ${statusClass(status)}">${status}</span></span>
      <span>${state.assets.filter(a => a.status === status).length}</span>
    </div>
  `).join("");
}

function renderEmployees() {
  const search = document.getElementById("employeeSearch").value.trim().toLowerCase();
  const rows = state.employees
    .filter(e => [e.code, e.name, e.department, e.position, e.status]
      .join(" ").toLowerCase().includes(search))
    .sort((a, b) => a.name.localeCompare(b.name));

  document.getElementById("employeesTableBody").innerHTML = rows.length
    ? rows.map(e => {
        const assignedCount = state.assignments.filter(a => a.employeeId === e.id && a.status === "Active").length;
        return `
          <tr>
            <td><strong>${escapeHtml(e.code)}</strong></td>
            <td>${escapeHtml(e.name)}</td>
            <td>${escapeHtml(e.department)}</td>
            <td>${escapeHtml(e.position)}</td>
            <td><span class="badge ${statusClass(e.status)}">${escapeHtml(e.status)}</span></td>
            <td>${assignedCount}</td>
            <td>
              <div class="actions">
                <button class="action-btn" onclick="editEmployee('${e.id}')">Edit</button>
                <button class="action-btn" onclick="deleteEmployee('${e.id}')">Delete</button>
              </div>
            </td>
          </tr>
        `;
      }).join("")
    : '<tr><td colspan="7" class="empty-state">No employees found.</td></tr>';
}

function renderAssets() {
  const search = document.getElementById("assetSearch").value.trim().toLowerCase();
  const filter = document.getElementById("assetStatusFilter").value;

  const rows = state.assets
    .filter(a => !filter || a.status === filter)
    .filter(a => [a.code, a.category, a.description, a.brand, a.model, a.serial, a.status]
      .join(" ").toLowerCase().includes(search))
    .sort((a, b) => a.code.localeCompare(b.code));

  document.getElementById("assetsTableBody").innerHTML = rows.length
    ? rows.map(a => {
        const active = activeAssignmentForAsset(a.id);
        const employee = active ? employeeById(active.employeeId) : null;
        return `
          <tr>
            <td><strong>${escapeHtml(a.code)}</strong></td>
            <td>${escapeHtml(a.category)}</td>
            <td>${escapeHtml(a.description)}</td>
            <td>${escapeHtml([a.brand, a.model].filter(Boolean).join(" / ") || "—")}</td>
            <td>${escapeHtml(a.serial || "—")}</td>
            <td><span class="badge ${statusClass(a.status)}">${escapeHtml(a.status)}</span></td>
            <td>${escapeHtml(employee?.name || "—")}</td>
            <td>
              <div class="actions">
                <button class="action-btn" onclick="editAsset('${a.id}')">Edit</button>
                <button class="action-btn" onclick="deleteAsset('${a.id}')">Delete</button>
              </div>
            </td>
          </tr>
        `;
      }).join("")
    : '<tr><td colspan="8" class="empty-state">No assets found.</td></tr>';
}

function renderAssignmentOptions() {
  const activeEmployees = state.employees.filter(e => e.status === "Active");
  const availableAssets = state.assets.filter(a => a.status === "Available");

  document.getElementById("assignEmployee").innerHTML =
    '<option value="">Select employee</option>' +
    activeEmployees.map(e => `<option value="${e.id}">${escapeHtml(e.code)} — ${escapeHtml(e.name)}</option>`).join("");

  document.getElementById("assignAsset").innerHTML =
    '<option value="">Select asset</option>' +
    availableAssets.map(a => `<option value="${a.id}">${escapeHtml(a.code)} — ${escapeHtml(a.description)}</option>`).join("");

  document.getElementById("transferEmployee").innerHTML =
    '<option value="">Select employee</option>' +
    activeEmployees.map(e => `<option value="${e.id}">${escapeHtml(e.code)} — ${escapeHtml(e.name)}</option>`).join("");
}

function renderCurrentAssignments() {
  const active = state.assignments
    .filter(a => a.status === "Active")
    .sort((a, b) => new Date(b.assignedDate) - new Date(a.assignedDate));

  document.getElementById("currentAssignments").innerHTML = active.length
    ? active.map(a => {
        const employee = employeeById(a.employeeId);
        const asset = assetById(a.assetId);
        if (!employee || !asset) return "";
        return `
          <div class="assignment-card">
            <h4>${escapeHtml(asset.code)} — ${escapeHtml(asset.description)}</h4>
            <p><strong>Assigned to:</strong> ${escapeHtml(employee.name)}</p>
            <p><strong>Department:</strong> ${escapeHtml(employee.department)}</p>
            <p><strong>Date:</strong> ${formatDate(a.assignedDate)}</p>
            <p><strong>Condition:</strong> ${escapeHtml(a.conditionOut)}</p>
            <div class="actions">
              <button class="action-btn" onclick="openReturn('${a.id}')">Return</button>
              <button class="action-btn" onclick="openTransfer('${a.id}')">Transfer</button>
            </div>
          </div>
        `;
      }).join("")
    : '<div class="empty-state">No currently assigned assets.</div>';
}

function renderHistory() {
  const search = document.getElementById("historySearch").value.trim().toLowerCase();
  const rows = [...state.history]
    .filter(h => [h.action, h.assetCode, h.employeeName, h.handledBy, h.condition, h.remarks]
      .join(" ").toLowerCase().includes(search))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  document.getElementById("historyTableBody").innerHTML = rows.length
    ? rows.map(h => `
      <tr>
        <td>${formatDate(h.date)}</td>
        <td><strong>${escapeHtml(h.action)}</strong></td>
        <td>${escapeHtml(h.assetCode)}</td>
        <td>${escapeHtml(h.employeeName || "—")}</td>
        <td>${escapeHtml(h.handledBy || "—")}</td>
        <td>${escapeHtml(h.condition || "—")}</td>
        <td>${escapeHtml(h.remarks || "—")}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="7" class="empty-state">No history records found.</td></tr>';
}

function addHistory(record) {
  state.history.push({
    id: uid("HIS"),
    createdAt: new Date().toISOString(),
    ...record
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openEmployeeModal(employee = null) {
  document.getElementById("employeeModalTitle").textContent = employee ? "Edit Employee" : "Add Employee";
  document.getElementById("employeeRecordId").value = employee?.id || "";
  document.getElementById("employeeCode").value = employee?.code || "";
  document.getElementById("employeeName").value = employee?.name || "";
  document.getElementById("employeeDepartment").value = employee?.department || "";
  document.getElementById("employeePosition").value = employee?.position || "";
  document.getElementById("employeeContact").value = employee?.contact || "";
  document.getElementById("employeeEmail").value = employee?.email || "";
  document.getElementById("employeeStatus").value = employee?.status || "Active";
  document.getElementById("employeeRemarks").value = employee?.remarks || "";
  document.getElementById("employeeModal").showModal();
}

window.editEmployee = id => openEmployeeModal(employeeById(id));

window.deleteEmployee = id => {
  const hasActiveAssets = state.assignments.some(a => a.employeeId === id && a.status === "Active");
  if (hasActiveAssets) return alert("This employee still has assigned assets. Return or transfer them first.");
  if (!confirm("Delete this employee record?")) return;
  state.employees = state.employees.filter(e => e.id !== id);
  saveAll();
  renderAll();
  showToast("Employee deleted");
};

function openAssetModal(asset = null) {
  document.getElementById("assetModalTitle").textContent = asset ? "Edit Asset" : "Add Asset";
  document.getElementById("assetRecordId").value = asset?.id || "";
  document.getElementById("assetCode").value = asset?.code || "";
  document.getElementById("assetCategory").value = asset?.category || "Laptop";
  document.getElementById("assetDescription").value = asset?.description || "";
  document.getElementById("assetBrand").value = asset?.brand || "";
  document.getElementById("assetModel").value = asset?.model || "";
  document.getElementById("assetSerial").value = asset?.serial || "";
  document.getElementById("assetPurchaseDate").value = asset?.purchaseDate || "";
  document.getElementById("assetPurchaseCost").value = asset?.purchaseCost || "";
  document.getElementById("assetSupplier").value = asset?.supplier || "";
  document.getElementById("assetWarranty").value = asset?.warranty || "";
  document.getElementById("assetLocation").value = asset?.location || "";
  document.getElementById("assetCondition").value = asset?.condition || "Good";
  document.getElementById("assetStatus").value = asset?.status === "Assigned" ? "Available" : (asset?.status || "Available");
  document.getElementById("assetSpecifications").value = asset?.specifications || "";
  document.getElementById("assetRemarks").value = asset?.remarks || "";
  document.getElementById("assetStatus").disabled = asset?.status === "Assigned";
  document.getElementById("assetModal").showModal();
}

window.editAsset = id => openAssetModal(assetById(id));

window.deleteAsset = id => {
  const isAssigned = !!activeAssignmentForAsset(id);
  if (isAssigned) return alert("This asset is currently assigned. Return it first.");
  if (!confirm("Delete this asset record?")) return;
  state.assets = state.assets.filter(a => a.id !== id);
  saveAll();
  renderAll();
  showToast("Asset deleted");
};

window.openReturn = assignmentId => {
  document.getElementById("returnAssignmentId").value = assignmentId;
  document.getElementById("returnDate").value = today();
  document.getElementById("receivedBy").value = "";
  document.getElementById("conditionReturned").value = "Good";
  document.getElementById("returnAssetStatus").value = "Available";
  document.getElementById("returnRemarks").value = "";
  document.getElementById("returnModal").showModal();
};

window.openTransfer = assignmentId => {
  const current = state.assignments.find(a => a.id === assignmentId);
  document.getElementById("transferAssignmentId").value = assignmentId;
  document.getElementById("transferDate").value = today();
  document.getElementById("transferredBy").value = "";
  document.getElementById("transferCondition").value = "Good";
  document.getElementById("transferRemarks").value = "";
  [...document.getElementById("transferEmployee").options].forEach(opt => {
    opt.disabled = opt.value === current?.employeeId;
  });
  document.getElementById("transferModal").showModal();
};

function exportCsv(filename, rows) {
  if (!rows.length) return alert("There is no data to export.");
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(row => headers.map(h => {
      const value = row[h] ?? "";
      return `"${String(value).replaceAll('"', '""')}"`;
    }).join(","))
  ].join("\n");

  const csvContent = "\ufeff" + csv;
  if (window.Android && typeof window.Android.saveCsv === "function") {
    window.Android.saveCsv(csvContent, filename);
    showToast("CSV saved to Downloads");
    return;
  }
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    const page = btn.dataset.page;
    document.getElementById(`${page}Page`).classList.add("active");
    document.getElementById("pageTitle").textContent = pageMeta[page][0];
    document.getElementById("pageSubtitle").textContent = pageMeta[page][1];
  });
});

document.querySelectorAll(".close-modal").forEach(btn => {
  btn.addEventListener("click", () => btn.closest("dialog").close());
});

document.getElementById("addEmployeeBtn").addEventListener("click", () => openEmployeeModal());
document.getElementById("addAssetBtn").addEventListener("click", () => openAssetModal());

document.getElementById("employeeForm").addEventListener("submit", event => {
  event.preventDefault();
  const id = document.getElementById("employeeRecordId").value;
  const code = document.getElementById("employeeCode").value.trim();
  const duplicate = state.employees.some(e => e.code.toLowerCase() === code.toLowerCase() && e.id !== id);
  if (duplicate) return alert("Employee ID already exists.");

  const record = {
    id: id || uid("EMP"),
    code,
    name: document.getElementById("employeeName").value.trim(),
    department: document.getElementById("employeeDepartment").value.trim(),
    position: document.getElementById("employeePosition").value.trim(),
    contact: document.getElementById("employeeContact").value.trim(),
    email: document.getElementById("employeeEmail").value.trim(),
    status: document.getElementById("employeeStatus").value,
    remarks: document.getElementById("employeeRemarks").value.trim()
  };

  if (id) {
    state.employees = state.employees.map(e => e.id === id ? record : e);
  } else {
    state.employees.push(record);
  }

  saveAll();
  renderAll();
  document.getElementById("employeeModal").close();
  showToast(id ? "Employee updated" : "Employee added");
});

document.getElementById("assetForm").addEventListener("submit", event => {
  event.preventDefault();
  const id = document.getElementById("assetRecordId").value;
  const code = document.getElementById("assetCode").value.trim();
  const duplicateCode = state.assets.some(a => a.code.toLowerCase() === code.toLowerCase() && a.id !== id);
  if (duplicateCode) return alert("Asset code already exists.");

  const existing = id ? assetById(id) : null;
  const record = {
    id: id || uid("AST"),
    code,
    category: document.getElementById("assetCategory").value,
    description: document.getElementById("assetDescription").value.trim(),
    brand: document.getElementById("assetBrand").value.trim(),
    model: document.getElementById("assetModel").value.trim(),
    serial: document.getElementById("assetSerial").value.trim(),
    purchaseDate: document.getElementById("assetPurchaseDate").value,
    purchaseCost: document.getElementById("assetPurchaseCost").value,
    supplier: document.getElementById("assetSupplier").value.trim(),
    warranty: document.getElementById("assetWarranty").value,
    location: document.getElementById("assetLocation").value.trim(),
    condition: document.getElementById("assetCondition").value,
    status: existing?.status === "Assigned" ? "Assigned" : document.getElementById("assetStatus").value,
    specifications: document.getElementById("assetSpecifications").value.trim(),
    remarks: document.getElementById("assetRemarks").value.trim()
  };

  if (id) {
    state.assets = state.assets.map(a => a.id === id ? record : a);
  } else {
    state.assets.push(record);
    addHistory({
      date: today(),
      action: "Asset Added",
      assetCode: record.code,
      employeeName: "",
      handledBy: "",
      condition: record.condition,
      remarks: record.remarks
    });
  }

  saveAll();
  renderAll();
  document.getElementById("assetModal").close();
  document.getElementById("assetStatus").disabled = false;
  showToast(id ? "Asset updated" : "Asset added");
});

document.getElementById("assignmentForm").addEventListener("submit", event => {
  event.preventDefault();
  const employeeId = document.getElementById("assignEmployee").value;
  const assetId = document.getElementById("assignAsset").value;
  const employee = employeeById(employeeId);
  const asset = assetById(assetId);
  if (!employee || !asset) return;
  if (asset.status !== "Available") return alert("This asset is no longer available.");

  const record = {
    id: uid("ASN"),
    employeeId,
    assetId,
    assignedDate: document.getElementById("assignDate").value,
    returnedDate: "",
    assignedBy: document.getElementById("assignedBy").value.trim(),
    conditionOut: document.getElementById("conditionOut").value,
    conditionReturned: "",
    status: "Active",
    remarks: document.getElementById("assignmentRemarks").value.trim()
  };

  state.assignments.push(record);
  asset.status = "Assigned";

  addHistory({
    date: record.assignedDate,
    action: "Assigned",
    assetCode: asset.code,
    employeeName: employee.name,
    handledBy: record.assignedBy,
    condition: record.conditionOut,
    remarks: record.remarks
  });

  saveAll();
  renderAll();
  event.target.reset();
  document.getElementById("assignDate").value = today();
  showToast("Asset assigned");
});

document.getElementById("returnForm").addEventListener("submit", event => {
  event.preventDefault();
  const assignment = state.assignments.find(a => a.id === document.getElementById("returnAssignmentId").value);
  if (!assignment) return;

  const employee = employeeById(assignment.employeeId);
  const asset = assetById(assignment.assetId);
  assignment.status = "Returned";
  assignment.returnedDate = document.getElementById("returnDate").value;
  assignment.conditionReturned = document.getElementById("conditionReturned").value;
  asset.status = document.getElementById("returnAssetStatus").value;
  asset.condition = assignment.conditionReturned;

  addHistory({
    date: assignment.returnedDate,
    action: "Returned",
    assetCode: asset.code,
    employeeName: employee?.name || "",
    handledBy: document.getElementById("receivedBy").value.trim(),
    condition: assignment.conditionReturned,
    remarks: document.getElementById("returnRemarks").value.trim()
  });

  saveAll();
  renderAll();
  document.getElementById("returnModal").close();
  showToast("Asset returned");
});

document.getElementById("transferForm").addEventListener("submit", event => {
  event.preventDefault();
  const oldAssignment = state.assignments.find(a => a.id === document.getElementById("transferAssignmentId").value);
  const newEmployeeId = document.getElementById("transferEmployee").value;
  if (!oldAssignment || !newEmployeeId) return;

  const asset = assetById(oldAssignment.assetId);
  const oldEmployee = employeeById(oldAssignment.employeeId);
  const newEmployee = employeeById(newEmployeeId);
  const transferDate = document.getElementById("transferDate").value;
  const handledBy = document.getElementById("transferredBy").value.trim();
  const condition = document.getElementById("transferCondition").value;
  const remarks = document.getElementById("transferRemarks").value.trim();

  oldAssignment.status = "Transferred";
  oldAssignment.returnedDate = transferDate;
  oldAssignment.conditionReturned = condition;

  state.assignments.push({
    id: uid("ASN"),
    employeeId: newEmployeeId,
    assetId: asset.id,
    assignedDate: transferDate,
    returnedDate: "",
    assignedBy: handledBy,
    conditionOut: condition,
    conditionReturned: "",
    status: "Active",
    remarks
  });

  addHistory({
    date: transferDate,
    action: "Transferred",
    assetCode: asset.code,
    employeeName: `${oldEmployee?.name || "Unknown"} → ${newEmployee?.name || "Unknown"}`,
    handledBy,
    condition,
    remarks
  });

  saveAll();
  renderAll();
  document.getElementById("transferModal").close();
  showToast("Asset transferred");
});

document.getElementById("employeeSearch").addEventListener("input", renderEmployees);
document.getElementById("assetSearch").addEventListener("input", renderAssets);
document.getElementById("assetStatusFilter").addEventListener("change", renderAssets);
document.getElementById("historySearch").addEventListener("input", renderHistory);

document.getElementById("exportEmployeesBtn").addEventListener("click", () => {
  const rows = state.employees.map(e => ({
    "Employee ID": e.code,
    "Full Name": e.name,
    "Department": e.department,
    "Position": e.position,
    "Contact Number": e.contact,
    "Email": e.email,
    "Employment Status": e.status,
    "Remarks": e.remarks
  }));
  exportCsv(`employees_${today()}.csv`, rows);
});

document.getElementById("exportAssetsBtn").addEventListener("click", () => {
  const rows = state.assets.map(a => {
    const active = activeAssignmentForAsset(a.id);
    const employee = active ? employeeById(active.employeeId) : null;
    return {
      "Asset Code": a.code,
      "Category": a.category,
      "Description": a.description,
      "Brand": a.brand,
      "Model": a.model,
      "Serial Number": a.serial,
      "Specifications": a.specifications,
      "Purchase Date": a.purchaseDate,
      "Purchase Cost": a.purchaseCost,
      "Supplier": a.supplier,
      "Warranty Expiration": a.warranty,
      "Location": a.location,
      "Condition": a.condition,
      "Status": a.status,
      "Assigned Employee": employee?.name || "",
      "Department": employee?.department || "",
      "Remarks": a.remarks
    };
  });
  exportCsv(`assets_${today()}.csv`, rows);
});

document.getElementById("exportHistoryBtn").addEventListener("click", () => {
  const rows = state.history.map(h => ({
    "Date": h.date,
    "Action": h.action,
    "Asset Code": h.assetCode,
    "Employee": h.employeeName,
    "Handled By": h.handledBy,
    "Condition": h.condition,
    "Remarks": h.remarks
  }));
  exportCsv(`asset_history_${today()}.csv`, rows);
});

document.getElementById("loadSampleBtn").addEventListener("click", () => {
  if ((state.employees.length || state.assets.length) && !confirm("Add sample data to your existing records?")) return;

  const employee1 = { id: uid("EMP"), code: "EMP-001", name: "Juan Dela Cruz", department: "IT Department", position: "IT Support", contact: "", email: "", status: "Active", remarks: "" };
  const employee2 = { id: uid("EMP"), code: "EMP-002", name: "Maria Santos", department: "Accounting", position: "Accounting Staff", contact: "", email: "", status: "Active", remarks: "" };
  const asset1 = { id: uid("AST"), code: "IT-LAP-001", category: "Laptop", description: "Office Laptop", brand: "Lenovo", model: "ThinkPad E14", serial: "SN-001-EXAMPLE", purchaseDate: today(), purchaseCost: "45000", supplier: "Sample Supplier", warranty: "", location: "Head Office", condition: "Good", status: "Available", specifications: "Intel Core i5, 16GB RAM, 512GB SSD", remarks: "" };
  const asset2 = { id: uid("AST"), code: "IT-MON-001", category: "Monitor", description: "24-inch Monitor", brand: "LG", model: "24MP400", serial: "SN-002-EXAMPLE", purchaseDate: today(), purchaseCost: "8500", supplier: "Sample Supplier", warranty: "", location: "Head Office", condition: "Excellent", status: "Available", specifications: "24-inch IPS Full HD", remarks: "" };

  state.employees.push(employee1, employee2);
  state.assets.push(asset1, asset2);
  [asset1, asset2].forEach(a => addHistory({
    date: today(), action: "Asset Added", assetCode: a.code, employeeName: "", handledBy: "System", condition: a.condition, remarks: "Sample data"
  }));

  saveAll();
  renderAll();
  showToast("Sample data added");
});

document.getElementById("clearDataBtn").addEventListener("click", () => {
  if (!confirm("This will permanently clear all locally saved records. Continue?")) return;
  state.employees = [];
  state.assets = [];
  state.assignments = [];
  state.history = [];
  saveAll();
  renderAll();
  showToast("All data cleared");
});

document.getElementById("currentDate").textContent = new Date().toLocaleDateString("en-PH", {
  weekday: "long", year: "numeric", month: "long", day: "numeric"
});
document.getElementById("assignDate").value = today();
renderAll();
