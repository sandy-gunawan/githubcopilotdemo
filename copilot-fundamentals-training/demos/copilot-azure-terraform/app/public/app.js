(function () {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  let complaints = [], selected = null, loadNumber = 0;
  function notice(message, error = false) {
    const box = $("#notice");
    box.textContent = message;
    box.className = error ? "notice error" : "notice";
    box.setAttribute("role", error ? "alert" : "status");
    box.hidden = false;
  }
  function formError(selector, message) {
    $(selector).textContent = message;
    $(selector).hidden = !message;
  }
  async function api(url, options = {}) {
    const response = await fetch(url, options);
    const type = response.headers.get("content-type") || "";
    if (!type.includes("application/json")) throw new Error("Respons server tidak dikenali. Periksa terminal aplikasi.");
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error?.message || `Permintaan gagal (${response.status}).`);
      error.fields = data.error?.fields;
      throw error;
    }
    return data;
  }
  function render() {
    $("#metric-total").textContent = String(complaints.length);
    for (const [selector, status] of [["#metric-new", "Baru"], ["#metric-active", "Diproses"], ["#metric-done", "Selesai"]]) {
      $(selector).textContent = String(complaints.filter(item => item.status === status).length);
    }
    const query = $("#search").value.trim().toLocaleLowerCase("id-ID");
    const status = $("#status-filter").value;
    const channel = $("#channel-filter").value;
    const rows = complaints.filter(item => (!status || item.status === status) && (!channel || item.channel === channel) &&
      [item.id, item.title, item.customerLabel].some(value => value.toLocaleLowerCase("id-ID").includes(query)));
    $("#result-count").textContent = `${rows.length} dari ${complaints.length} keluhan ditampilkan. Ringkasan di atas mencakup semua data.`;
    const tbody = $("#cases");
    tbody.replaceChildren();
    for (const item of rows) {
      const row = el("tr");
      const title = el("td");
      const button = el("button", undefined, "case-link");
      button.type = "button";
      button.setAttribute("aria-label", `Buka ${item.id}: ${item.title}`);
      button.append(el("span", item.id, "case-id"), el("span", item.title));
      button.addEventListener("click", () => openDetail(item.id));
      title.append(button);
      row.append(title, el("td", item.customerLabel), el("td", item.channel));
      const priority = el("td");
      priority.append(el("span", item.priority, "badge " + ({ Tinggi: "high", Sedang: "medium", Rendah: "low" }[item.priority])));
      const state = el("td");
      state.append(el("span", item.status, "badge " + ({ Baru: "new", Diproses: "active", Selesai: "done" }[item.status])));
      row.append(priority, state, el("td", `${item.attachments.length} file`));
      tbody.append(row);
    }
    $("#empty").hidden = rows.length > 0;
  }
  async function reload() {
    const number = ++loadNumber;
    $("#refresh").disabled = true;
    try {
      const data = await api("/api/complaints");
      if (number !== loadNumber) return;
      complaints = data.complaints;
      render();
    } catch (error) {
      $("#result-count").textContent = "Gagal memuat ulang. Data yang sudah tampil mungkin belum terbaru.";
      notice(error.message, true);
      throw error;
    } finally {
      if (number === loadNumber) $("#refresh").disabled = false;
    }
  }
  function resetFilters() {
    $("#search").value = "";
    $("#status-filter").value = "";
    $("#channel-filter").value = "";
    render();
  }
  for (const selector of ["#search", "#status-filter", "#channel-filter"]) $(selector).addEventListener("input", render);
  $("#reset-filter").addEventListener("click", resetFilters);
  $("#empty-reset").addEventListener("click", resetFilters);
  $("#refresh").addEventListener("click", () => reload().catch(error => console.error("Refresh failed:", error.message)));
  document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => button.closest("dialog").close()));
  $("#new-case").addEventListener("click", () => {
    $("#create-form").reset();
    formError("#create-error", "");
    document.querySelectorAll("[data-error]").forEach(node => { node.textContent = ""; });
    $("#create-dialog").showModal();
  });
  $("#create-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    formError("#create-error", "");
    document.querySelectorAll("[data-error]").forEach(node => { node.textContent = ""; });
    try {
      const body = Object.fromEntries(new FormData(form).entries());
      const result = await api("/api/complaints", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      $("#create-dialog").close();
      resetFilters();
      await reload();
      notice(`Keluhan ${result.complaint.id} tersimpan di laptop. Tidak ada data dikirim ke Azure.`);
    } catch (error) {
      formError("#create-error", error.message);
      for (const [key, value] of Object.entries(error.fields || {})) {
        const target = document.querySelector(`[data-error="${CSS.escape(key)}"]`);
        if (target) target.textContent = value;
      }
      if (!$("#create-dialog").open) notice(error.message, true);
    } finally { button.disabled = false; }
  });
  function renderDetail(item) {
    selected = item.id;
    $("#detail-id").textContent = item.id;
    $("#detail-title").textContent = item.title;
    $("#detail-description").textContent = item.description;
    $("#detail-status").value = item.status;
    $("#detail-meta").replaceChildren();
    for (const [label, value] of [["Label dummy", item.customerLabel], ["Kanal", item.channel], ["Kategori", item.category], ["Prioritas", item.priority]]) {
      const group = el("div");
      group.append(el("dt", label), el("dd", value));
      $("#detail-meta").append(group);
    }
    const list = $("#attachment-list");
    list.replaceChildren();
    if (!item.attachments.length) list.append(el("li", "Belum ada lampiran dummy."));
    for (const file of item.attachments) {
      const node = el("li");
      const link = el("a", file.name);
      link.href = `/api/complaints/${encodeURIComponent(item.id)}/attachments/${encodeURIComponent(file.id)}`;
      link.setAttribute("download", "");
      node.append(link, el("small", `${Math.ceil(file.size / 1024)} KB - download sebagai lampiran`));
      list.append(node);
    }
  }
  async function openDetail(id) {
    try {
      const data = await api(`/api/complaints/${encodeURIComponent(id)}`);
      formError("#detail-error", "");
      $("#upload-form").reset();
      renderDetail(data.complaint);
      $("#detail-dialog").showModal();
    } catch (error) { notice(error.message, true); }
  }
  $("#status-form").addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    formError("#detail-error", "");
    try {
      const result = await api(`/api/complaints/${encodeURIComponent(selected)}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: $("#detail-status").value }),
      });
      renderDetail(result.complaint);
      await reload();
      notice(`Status ${result.complaint.id} tersimpan: ${result.complaint.status}.`);
    } catch (error) { formError("#detail-error", error.message); }
    finally { button.disabled = false; }
  });
  $("#upload-form").addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    const file = $("#attachment-file").files[0];
    formError("#detail-error", "");
    if (!file) { formError("#detail-error", "Pilih file dummy terlebih dahulu."); return; }
    if (file.size > 2 * 1024 * 1024) { formError("#detail-error", "File terlalu besar. Batas lampiran 2 MB."); return; }
    button.disabled = true;
    try {
      const data = new FormData();
      data.append("file", file);
      const result = await api(`/api/complaints/${encodeURIComponent(selected)}/attachments`, { method: "POST", body: data });
      renderDetail(result.complaint);
      $("#upload-form").reset();
      await reload();
      notice("Lampiran dummy tersimpan lokal, di luar folder publik.");
    } catch (error) { formError("#detail-error", error.message); }
    finally { button.disabled = false; }
  });
  api("/health").then(data => {
    if (data.status !== "ok") throw new Error("Server belum siap.");
    $("#health").textContent = "Server lokal siap - JSON lokal";
  }).catch(error => { $("#health").textContent = "Health check gagal"; $("#health").classList.add("failed"); notice(error.message, true); });
  reload().catch(error => console.error("Initial data load failed:", error.message));
})();
