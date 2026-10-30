(function () {
  "use strict";

  function complaintStats(csv) {
    if (typeof csv !== "string" || !csv.trim()) throw new Error("CSV keluhan kosong.");
    const lines = csv.trim().split(/\r?\n/);
    const columns = lines.shift().split(",");
    const expected = ["case_id", "customer_id", "channel", "received_at", "ack_at", "resolved_at", "notified_at", "closed_at"];
    if (columns.join(",") !== expected.join(",")) throw new Error("Header CSV tidak sesuai fixture workshop.");
    const ids = new Set();
    const cases = lines.map((line, index) => {
      const values = line.split(",");
      if (values.length !== expected.length) throw new Error(`Kolom CSV baris ${index + 2} tidak lengkap.`);
      const record = Object.fromEntries(columns.map((column, i) => [column, values[i]]));
      if (!/^DEMO-C\d{3}$/.test(record.case_id) || !/^SYN-C\d{3}$/.test(record.customer_id) || ids.has(record.case_id)) {
        throw new Error(`ID sintetis invalid atau duplikat pada baris ${index + 2}.`);
      }
      ids.add(record.case_id);
      const timestamps = expected.slice(3).map(column => {
        if (!/\+07:00$/.test(record[column])) throw new Error(`Timezone WIB diperlukan: ${record.case_id}.`);
        const time = Date.parse(record[column]);
        if (!Number.isFinite(time)) throw new Error(`Timestamp invalid: ${record.case_id}.`);
        return time;
      });
      if (timestamps.some((time, i) => i > 0 && time < timestamps[i - 1])) {
        throw new Error(`Urutan waktu tidak valid: ${record.case_id}.`);
      }
      return {
        ...record,
        ackMinutes: (timestamps[1] - timestamps[0]) / 60000,
        resolutionMinutes: (timestamps[2] - timestamps[0]) / 60000,
      };
    });
    if (!cases.length) throw new Error("CSV tidak memiliki kasus.");
    const onTime = cases.filter(record => record.ackMinutes <= 15).length;
    return {
      cases, total: cases.length, onTime,
      ackPercent: onTime / cases.length * 100,
      slow: cases.filter(record => record.resolutionMinutes > 120).length,
      resolutionTotal: cases.reduce((total, record) => total + record.resolutionMinutes, 0),
    };
  }

  function slaDecision(elapsed, threshold, closed, fraud) {
    if (!Number.isFinite(elapsed) || elapsed < 0 || ![90, 120].includes(threshold)) throw new Error("Input simulasi SLA tidak valid.");
    if (closed) return { tone: "", message: "Kasus sudah closed: tidak ada trigger SLA kasus aktif. Indikasi fraud baru tetap perlu review manusia terpisah." };
    if (fraud) return { tone: "urgent", message: "Segera eskalasi ke supervisor untuk review manusia. Jangan menunggu ambang SLA atau melakukan blokir otomatis." };
    if (elapsed >= threshold) return { tone: "escalate", message: `Wajib eskalasi: kasus aktif ${elapsed} menit sudah mencapai ambang >= ${threshold} menit.` };
    return { tone: "", message: `Belum wajib eskalasi SLA: ${elapsed} < ${threshold} menit. Ack tetap harus <= 15 menit sejak diterima.` };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { complaintStats, slaDecision };
    return;
  }

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const elements = (tag, className, value) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  };
  const files = window.WORKSHOP_CONTENT && window.WORKSHOP_CONTENT.files;
  const resourceError = $("#resource-error");
  if (!files || typeof files !== "object") resourceError.hidden = false;
  function resource(file) {
    if (!files || !Object.hasOwn(files, file) || typeof files[file] !== "string") {
      resourceError.textContent = `Bahan tidak tersedia: ${file}. Pastikan paket lengkap atau bangun ulang sesuai README.`;
      resourceError.hidden = false;
      return null;
    }
    return files[file];
  }

  let toastTimeout;
  function toast(message) {
    const element = $("#toast");
    clearTimeout(toastTimeout);
    element.textContent = message;
    element.hidden = false;
    toastTimeout = setTimeout(() => { element.hidden = true; }, 3500);
  }

  async function copyText(value, button) {
    if (typeof value !== "string" || !value) {
      toast("Tidak ada teks yang bisa disalin. Periksa kelengkapan paket.");
      return;
    }
    if (window.isSecureContext && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(value);
        const old = button.textContent;
        button.textContent = "Tersalin";
        setTimeout(() => { button.textContent = old; }, 1800);
        toast("Sudah tersalin. Paste di Copilot Chat atau terminal sesuai petunjuk.");
        return;
      } catch (error) {
        console.warn("Clipboard ditolak; gunakan dialog salin manual.", error.message);
      }
    }
    $("#manual-copy").value = value;
    $("#copy-dialog").showModal();
    $("#manual-copy").focus();
    $("#manual-copy").select();
  }

  function promptCards() {
    $$(".prompt-slot").forEach((slot, index) => {
      const source = resource(slot.dataset.file);
      if (source === null) {
        slot.append(elements("p", "callout amber", `Prompt tidak dapat dimuat: ${slot.dataset.file}`));
        return;
      }
      const card = elements("article", "prompt-card");
      const head = elements("div", "prompt-head");
      const title = elements("div");
      title.append(elements("strong", "", slot.dataset.label), elements("small", "", slot.dataset.file.replace("starter/", "")));
      const button = elements("button", "copy-button", "Salin prompt");
      button.type = "button";
      button.addEventListener("click", () => copyText(source, button));
      head.append(title, button);
      const pre = elements("pre", "", source);
      pre.id = `prompt-body-${index}`;
      pre.tabIndex = 0;
      pre.setAttribute("aria-label", slot.dataset.label);
      const foot = elements("div", "prompt-foot");
      const expand = elements("button", "quiet-button", "Tampilkan penuh");
      expand.type = "button";
      expand.setAttribute("aria-expanded", "false");
      expand.setAttribute("aria-controls", pre.id);
      expand.addEventListener("click", () => {
        const expanded = pre.classList.toggle("expanded");
        expand.setAttribute("aria-expanded", String(expanded));
        expand.textContent = expanded ? "Ringkas tampilan" : "Tampilkan penuh";
      });
      foot.append(elements("span", "", "Salin lengkap, paste di Copilot Chat mode Agent, lalu Enter."), expand);
      card.append(head, pre, foot);
      slot.append(card);
    });
    $$(".resource-slot").forEach(slot => {
      const source = resource(slot.dataset.file);
      if (source !== null) {
        const pre = elements("pre", "", source);
        pre.tabIndex = 0;
        slot.append(pre);
      }
    });
  }
  promptCards();
  $$("[data-copy-code]").forEach(button => button.addEventListener("click", () => {
    const code = button.closest(".code-card").querySelector("pre").textContent;
    copyText(code, button);
  }));
  $$("[data-close-dialog]").forEach(button => button.addEventListener("click", () => button.closest("dialog").close()));

  const milestones = ["setup", "data", "business", "architecture", "powerpoint", "minutes", "incident", "review"];
  const storageKey = "banking-skills-lab:v1";
  const completed = new Set();
  let facilitator = false;
  function storageWarning(message) {
    $("#storage-warning").textContent = message;
    $("#storage-warning").hidden = false;
  }
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const state = JSON.parse(saved);
      if (!state || !Array.isArray(state.completed) || !state.completed.every(id => milestones.includes(id)) || typeof state.facilitator !== "boolean") {
        throw new SyntaxError("Format progress tidak valid.");
      }
      state.completed.forEach(id => completed.add(id));
      facilitator = state.facilitator;
    }
  } catch (error) {
    if (!(error instanceof DOMException) && !(error instanceof SyntaxError)) throw error;
    console.warn("Progress tidak dapat dimuat.", error.message);
    storageWarning("Progress lokal tidak dapat dimuat. Sesi dimulai tanpa checkpoint; file hasil lab tidak berubah.");
  }
  function saveState() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ completed: [...completed], facilitator }));
    } catch (error) {
      if (!(error instanceof DOMException)) throw error;
      console.warn("Progress tidak dapat disimpan.", error.message);
      storageWarning("Browser memblokir penyimpanan progress. Checkpoint hanya bertahan selama halaman ini terbuka.");
    }
  }
  function updateProgress() {
    $("#progress-label").textContent = `${completed.size} dari ${milestones.length} checkpoint`;
    $("#workshop-progress").value = completed.size;
    $("#workshop-progress").textContent = `${completed.size} dari ${milestones.length}`;
    $$("[data-milestone]").forEach(input => { input.checked = completed.has(input.dataset.milestone); });
    $$("[data-check]").forEach(mark => {
      const checked = completed.has(mark.dataset.check);
      mark.textContent = checked ? "\u2713" : "";
      mark.setAttribute("aria-label", checked ? "Checkpoint ditandai" : "Belum ditandai");
    });
    $("#completion-card").hidden = completed.size !== milestones.length;
  }
  $$("[data-milestone]").forEach(input => input.addEventListener("change", () => {
    if (input.checked) completed.add(input.dataset.milestone);
    else completed.delete(input.dataset.milestone);
    updateProgress();
    saveState();
    toast(input.checked ? "Sudah ditandai. Ini hanya pengingat, bukan pengecekan otomatis." : "Tandanya sudah dihapus.");
  }));
  $("#reset-progress").addEventListener("click", () => $("#reset-dialog").showModal());
  $("#confirm-reset").addEventListener("click", () => {
    completed.clear();
    updateProgress();
    saveState();
    $("#reset-dialog").close();
    toast("Progress direset. File dan hasil lab Anda tidak dihapus.");
  });
  function showFacilitator() {
    $$(".facilitator-note").forEach(note => { note.hidden = !facilitator; });
    $("#facilitator-toggle").setAttribute("aria-pressed", String(facilitator));
    $("#enable-facilitator").textContent = facilitator ? "Sembunyikan catatan fasilitator" : "Tampilkan catatan fasilitator";
  }
  function toggleFacilitator() {
    facilitator = !facilitator;
    showFacilitator();
    saveState();
    toast(facilitator ? "Catatan fasilitator ditampilkan di setiap lab." : "Kembali ke tampilan peserta.");
  }
  $("#facilitator-toggle").addEventListener("click", toggleFacilitator);
  $("#enable-facilitator").addEventListener("click", toggleFacilitator);
  $("#print-guide").addEventListener("click", () => window.print());
  showFacilitator();
  updateProgress();

  const sections = $$(".page-section");
  let activeSection = "overview";
  let timerInterval = null;
  let timer = null;
  function timerLabels() {
    $$("[data-timer]").forEach(button => {
      const section = button.closest(".page-section");
      const seconds = timer && timer.section === section.id ? timer.remaining : Number(section.dataset.duration) * 60;
      const running = Boolean(timer && timer.section === section.id && timer.running);
      button.querySelector("[data-timer-label]").textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
      button.classList.toggle("running", running);
      button.setAttribute("aria-pressed", String(running));
      button.setAttribute("aria-label", running ? "Jeda timer bagian ini" : "Mulai timer bagian ini");
    });
  }
  $$("[data-timer]").forEach(button => button.addEventListener("click", () => {
    const section = button.closest(".page-section");
    if (!timer || timer.section !== section.id || timer.remaining === 0) timer = { section: section.id, remaining: Number(section.dataset.duration) * 60, running: false };
    if (timer.running) {
      timer.remaining = Math.max(0, Math.ceil((timer.deadline - Date.now()) / 1000));
      timer.running = false;
      clearInterval(timerInterval);
    } else {
      timer.running = true;
      timer.deadline = Date.now() + timer.remaining * 1000;
      timerInterval = setInterval(() => {
        timer.remaining = Math.max(0, Math.ceil((timer.deadline - Date.now()) / 1000));
        if (timer.remaining === 0) {
          timer.running = false;
          clearInterval(timerInterval);
          toast("Waktu bagian ini selesai. Review hasil sebelum lanjut.");
        }
        timerLabels();
      }, 250);
    }
    timerLabels();
  }));

  const mobile = window.matchMedia("(max-width: 760px)");
  const sidebar = $("#sidebar");
  const menuToggle = $("#menu-toggle");
  const closeMenu = elements("button", "icon-button mobile-only sidebar-close", "\u00d7");
  closeMenu.type = "button";
  closeMenu.setAttribute("aria-label", "Tutup navigasi");
  sidebar.prepend(closeMenu);
  function menu(open) {
    sidebar.classList.toggle("open", open && mobile.matches);
    menuToggle.setAttribute("aria-expanded", String(open && mobile.matches));
    sidebar.inert = mobile.matches && !open;
    if (mobile.matches && !open) sidebar.setAttribute("aria-hidden", "true");
    else sidebar.removeAttribute("aria-hidden");
  }
  menuToggle.addEventListener("click", () => {
    const open = !sidebar.classList.contains("open");
    menu(open);
    if (open) sidebar.querySelector('[aria-current="page"]').focus();
  });
  closeMenu.addEventListener("click", () => { menu(false); menuToggle.focus(); });
  mobile.addEventListener("change", () => menu(false));
  document.addEventListener("click", event => {
    if (mobile.matches && sidebar.classList.contains("open") && !sidebar.contains(event.target) && !menuToggle.contains(event.target)) menu(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && sidebar.classList.contains("open")) { menu(false); menuToggle.focus(); }
  });

  function route(initial) {
    let id = location.hash.slice(1) || "overview";
    if (!sections.some(section => section.id === id)) {
      id = "overview";
      history.replaceState(null, "", "#overview");
      toast("Bagian tidak ditemukan. Menampilkan Overview.");
    }
    sections.forEach(section => { section.hidden = section.id !== id; });
    $$("[data-nav]").forEach(link => {
      if (link.dataset.nav === id) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    const section = document.getElementById(id);
    $("#current-page").textContent = section.dataset.title;
    document.title = `${section.dataset.title} | Banking Skills Lab`;
    if (activeSection !== id) {
      clearInterval(timerInterval);
      timer = null;
    }
    activeSection = id;
    timerLabels();
    menu(false);
    if (!initial) $("#main").focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", () => route(false));
  window.addEventListener("load", () => {
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }, { once: true });
  route(true);

  $$('[role="tablist"]').forEach(tablist => {
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    function activate(tab) {
      tabs.forEach(item => {
        const selected = item === tab;
        item.setAttribute("aria-selected", String(selected));
        item.tabIndex = selected ? 0 : -1;
        document.getElementById(item.dataset.tab).hidden = !selected;
      });
    }
    tabs.forEach(tab => {
      tab.addEventListener("click", () => activate(tab));
      tab.addEventListener("keydown", event => {
        const index = tabs.indexOf(tab);
        let next;
        if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
        else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabs.length - 1;
        else return;
        event.preventDefault();
        activate(tabs[next]);
        tabs[next].focus();
      });
    });
  });

  const catalog = [
    { path: "starter/input/business-policy.md", title: "Aturan kerja contoh", category: "ATURAN LATIHAN", description: "Aturan versi 1.0: batas waktu layanan, pengecualian, dan kapan kasus boleh ditutup. Bukan kebijakan regulator.", extension: "MD" },
    { path: "starter/input/meeting-notes.md", title: "Catatan rapat", category: "CERITA BISNIS", description: "Apa yang dibahas, apa yang disepakati, dan apa yang belum diputuskan. PIC individu belum ditentukan.", extension: "MD" },
    { path: "starter/input/meeting-transcript.md", title: "Obrolan untuk demo notulen", category: "RAPAT REKAAN", description: "Rapat lanjutan 30 menit dengan keputusan, empat tugas, PIC rekaan, dan tenggat yang sudah disebutkan.", extension: "MD" },
    { path: "starter/input/incident-chronology.md", title: "Kronologi gangguan", category: "KEJADIAN REKAAN", description: "Catatan portal keluhan lambat: waktu kejadian, bukti contoh, dampak, dan tindak lanjut. Terpisah dari CSV 12 keluhan.", extension: "MD" },
    { path: "starter/input/complaints.csv", title: "12 kasus keluhan", category: "DATA CONTOH", description: "Waktu memakai WIB. Semua kasus di tabel lengkap dan investigasinya selesai. Data mentah ada di bawah tabel.", extension: "CSV" },
    { path: "starter/input/system-landscape.md", title: "Gambaran sistem", category: "ARSITEKTUR", description: "Cerita sistem rekaan: yang ada saat ini dan yang baru diusulkan. Bukan hasil membaca kode aplikasi nyata.", extension: "MD" },
    { path: "starter/input/openapi.yaml", title: "Contoh API", category: "CONTOH FORMAT API", description: "Hanya contoh spesifikasi. Tidak ada server yang berjalan atau koneksi ke bank.", extension: "YAML" },
    { path: "starter/input/issue-backlog.md", title: "Daftar tindak lanjut", category: "DRAFT DI LAPTOP", description: "DEMO-101 sampai 103 hanya nomor contoh, bukan GitHub Issue sungguhan.", extension: "MD" },
    { path: "starter/input/deck-brief.md", title: "Arahan presentasi", category: "BAHAN SLIDE", description: "Presentasi untuk siapa, pesan utamanya apa, dan keputusan apa yang dibutuhkan.", extension: "MD" },
    { path: "starter/input/deck-spec.json", title: "Format slide contoh", category: "UNTUK ALAT PEMBUAT PPTX", description: "Contoh format data yang bisa dibuat menjadi PowerPoint, bukan hasil live dari prompt peserta.", extension: "JSON" },
  ];
  let selectedFile = catalog[0];
  let stats;
  const csv = resource("starter/input/complaints.csv");
  if (csv !== null) {
    try {
      stats = complaintStats(csv);
      $('[data-metric="total"]').textContent = String(stats.total);
      $('[data-metric="ack"]').textContent = `${Number(stats.ackPercent.toFixed(1))}%`;
      $('[data-metric="ack-detail"]').textContent = `${stats.onTime} dari ${stats.total} - <= 15 menit`;
      $('[data-metric="slow"]').textContent = `${stats.slow} / ${stats.total}`;
    } catch (error) {
      resourceError.textContent = `Perhitungan CSV gagal: ${error.message}`;
      resourceError.hidden = false;
      $$("[data-metric]").forEach(metric => { metric.textContent = "Data invalid"; });
    }
  }
  function csvTable() {
    const container = $("#csv-preview");
    container.replaceChildren();
    if (!stats) {
      container.append(elements("p", "callout amber", "CSV tidak dapat dihitung. Periksa pesan kesalahan bahan."));
      return;
    }
    const table = elements("table");
    const caption = elements("caption", "sr-only", "Durasi dari 12 kasus sintetis, dalam menit");
    table.append(caption);
    const head = elements("thead");
    const header = elements("tr");
    ["Kasus", "Ack (min)", "Resolusi (min)", "Ack SLA"].forEach(label => {
      const cell = elements("th", "", label);
      cell.scope = "col";
      header.append(cell);
    });
    head.append(header);
    const body = elements("tbody");
    stats.cases.forEach(record => {
      const row = elements("tr");
      row.append(elements("td", "", record.case_id), elements("td", "", String(record.ackMinutes)), elements("td", "", String(record.resolutionMinutes)));
      const status = elements("td");
      status.append(elements("span", record.ackMinutes <= 15 ? "badge-ok" : "badge-warn", record.ackMinutes <= 15 ? "Tepat waktu" : "Terlambat"));
      row.append(status);
      body.append(row);
    });
    table.append(head, body);
    container.append(table);
  }
  csvTable();
  function selectFile(file) {
    selectedFile = file;
    $("#file-category").textContent = file.category;
    $("#file-title").textContent = file.path.split("/").pop();
    $("#file-description").textContent = file.description;
    const source = resource(file.path);
    $("#file-preview-text").textContent = source === null ? "File tidak tersedia. Periksa kelengkapan paket." : source;
    $("#copy-file").disabled = source === null;
    $("#download-file").disabled = source === null;
    $("#csv-preview").hidden = file.extension !== "CSV";
    $$(".file-button").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.path === file.path)));
  }
  function fileList() {
    const query = $("#file-search").value.trim().toLowerCase();
    const matching = catalog.filter(file => `${file.title} ${file.path} ${file.category}`.toLowerCase().includes(query));
    const list = $("#file-list");
    list.replaceChildren();
    $("#file-empty").hidden = matching.length > 0;
    matching.forEach(file => {
      const button = elements("button", "file-button");
      button.type = "button";
      button.dataset.path = file.path;
      button.setAttribute("aria-pressed", String(selectedFile.path === file.path));
      button.setAttribute("aria-controls", "file-preview-text");
      const label = elements("span");
      label.append(elements("strong", "", file.title), elements("small", "", file.path.split("/").pop()));
      button.append(elements("span", "file-extension", file.extension), label);
      button.addEventListener("click", () => selectFile(file));
      list.append(button);
    });
  }
  $("#file-search").addEventListener("input", fileList);
  $("#copy-file").addEventListener("click", () => copyText(resource(selectedFile.path), $("#copy-file")));
  $("#download-file").addEventListener("click", () => {
    const source = resource(selectedFile.path);
    if (source === null) return;
    const url = URL.createObjectURL(new Blob([source], { type: "text/plain;charset=utf-8" }));
    const link = elements("a");
    link.href = url;
    link.download = selectedFile.path.split("/").pop();
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast(`Download dimulai: ${selectedFile.path.split("/").pop()}`);
  });
  fileList();
  selectFile(selectedFile);

  function updateSla() {
    const elapsed = Number($("#elapsed").value);
    const threshold = Number($("#sla-version").value);
    $("#elapsed-value").textContent = String(elapsed);
    const result = slaDecision(elapsed, threshold, $("#case-closed").checked, $("#case-fraud").checked);
    $("#sla-result").textContent = result.message;
    $("#sla-result").className = `sla-result ${result.tone}`;
  }
  ["#elapsed", "#sla-version", "#case-closed", "#case-fraud"].forEach(selector => $(selector).addEventListener("input", updateSla));
  updateSla();

  $$("[data-zoom]").forEach(button => button.addEventListener("click", () => {
    $("#large-diagram").src = button.dataset.zoom;
    $("#large-diagram").alt = button.dataset.zoomTitle;
    $("#diagram-dialog-title").textContent = button.dataset.zoomTitle;
    $("#diagram-dialog").showModal();
  }));
  const diagramNames = {
    "architecture-context": { title: "C4 Context", alt: "C4 Context: nasabah dan staf memakai sistem keluhan yang berinteraksi dengan simulator core read-only dan notification stub." },
    "architecture-containers": { title: "C4 Container / as-is", alt: "C4 Container as-is: WEB ke gateway ke service, dengan metadata DB, core simulator GET status, notification stub retry manual, dan audit store. Tidak ada scheduler atau outbox." },
    sequence: { title: "Sequence / receipt sebelum close", alt: "Urutan konseptual membuat kasus, menyimpan audit, lookup status read-only, mengirim hasil, gagal dan retry manual, lalu close setelah receipt sukses." },
  };
  $$("[data-architecture-diagram]").forEach(button => button.addEventListener("click", () => {
    const key = button.dataset.architectureDiagram;
    const diagram = diagramNames[key];
    $$("[data-architecture-diagram]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    $("#architecture-diagram").src = `examples/diagrams/${key}.svg`;
    $("#architecture-diagram").alt = diagram.alt;
    $("#architecture-diagram-title").textContent = diagram.title;
    $("#architecture-zoom").dataset.zoom = `examples/diagrams/${key}.svg`;
    $("#architecture-zoom").dataset.zoomTitle = diagram.title;
  }));

  let slideIndex = 0;
  const specText = resource("starter/input/deck-spec.json");
  let deck;
  if (specText !== null) {
    try {
      deck = JSON.parse(specText);
      if (!Array.isArray(deck.slides) || deck.slides.length !== 8) throw new SyntaxError("Deck harus memiliki 8 slide.");
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      resourceError.textContent = `Spesifikasi deck invalid: ${error.message}`;
      resourceError.hidden = false;
    }
  }
  function previewSlide() {
    if (!deck) {
      $("#slide-preview").textContent = "Preview deck tidak tersedia. Periksa kelengkapan bahan.";
      $("#previous-slide").disabled = true;
      $("#next-slide").disabled = true;
      return;
    }
    const slide = deck.slides[slideIndex];
    const preview = $("#slide-preview");
    preview.replaceChildren();
    preview.append(elements("div", "slide-brand", "BANK NUSA DEMO / EXECUTIVE BRIEF"), elements("h3", "", slide.title));
    const body = elements("div", "slide-body");
    if (slide.kind === "title") body.append(elements("div", "slide-subtitle", slide.subtitle));
    else if (slide.kind === "bullets") {
      const list = elements("ul", "slide-bullets");
      slide.bullets.forEach(bullet => list.append(elements("li", "", bullet)));
      body.append(list);
    } else if (slide.kind === "metrics") {
      const metrics = elements("div", "slide-metrics");
      slide.metrics.forEach(metric => {
        const card = elements("div", "slide-metric");
        card.append(elements("strong", "", metric.value), elements("span", "", metric.label), elements("small", "", metric.detail));
        metrics.append(card);
      });
      body.append(metrics);
    } else if (slide.kind === "diagram") {
      const image = elements("img");
      image.src = `examples/diagrams/${slide.diagramKey}.svg`;
      image.alt = `Diagram contoh: ${slide.title}`;
      body.append(image);
    } else if (slide.kind === "table") {
      const table = elements("table");
      const head = elements("thead");
      const headers = elements("tr");
      slide.headers.forEach(label => {
        const cell = elements("th", "", label);
        cell.scope = "col";
        headers.append(cell);
      });
      head.append(headers);
      const tbody = elements("tbody");
      slide.rows.forEach(row => {
        const tr = elements("tr");
        row.forEach(cell => tr.append(elements("td", "", cell)));
        tbody.append(tr);
      });
      table.append(head, tbody);
      body.append(table);
    }
    preview.append(body, elements("footer", "", `SINTETIS / BUKAN PRODUKSI - Sumber: ${slide.sources.join(" | ")}`));
    $("#slide-counter").textContent = `${slideIndex + 1} / ${deck.slides.length}`;
    $("#previous-slide").disabled = slideIndex === 0;
    $("#next-slide").disabled = slideIndex === deck.slides.length - 1;
  }
  $("#previous-slide").addEventListener("click", () => { if (slideIndex > 0) slideIndex--; previewSlide(); });
  $("#next-slide").addEventListener("click", () => { if (deck && slideIndex < deck.slides.length - 1) slideIndex++; previewSlide(); });
  previewSlide();
})();
