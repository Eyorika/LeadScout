document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // 1. Navigation Logic (Tabs)
    // ---------------------------------------------------------
    const tabAdd = document.getElementById('tab-add');
    const tabList = document.getElementById('tab-list');
    const viewAdd = document.getElementById('view-add');
    const viewList = document.getElementById('view-list');

    tabAdd.addEventListener('click', () => {
        tabAdd.classList.add('active');
        tabList.classList.remove('active');
        viewAdd.classList.add('active');
        viewList.classList.remove('active');
    });

    tabList.addEventListener('click', () => {
        tabList.classList.add('active');
        tabAdd.classList.remove('active');
        viewList.classList.add('active');
        viewAdd.classList.remove('active');
        loadLeads(); // Refresh list when tab is opened
    });

    // ---------------------------------------------------------
    // 2. Scrape Logic (On Open)
    // ---------------------------------------------------------
    const nameInput = document.getElementById('input-name');
    const roleInput = document.getElementById('input-role');
    const companyInput = document.getElementById('input-company');
    const urlInput = document.getElementById('input-url');

    // Query active tab and send message
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "SCRAPE_PAGE" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log("Could not trigger content script. Maybe this is a chrome:// page?");
                }
                if (response) {
                    nameInput.value = response.name || "";
                    roleInput.value = response.role || "";
                    companyInput.value = response.company || "";
                    urlInput.value = response.url || "";
                } else {
                    // Fallback if no script is running (first install issue),
                    // just fill URL
                    urlInput.value = tabs[0].url;
                }
            });
            // Also execute script programmatically if it wasn't there
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['content_script.js']
            });
        }
    });

    // ---------------------------------------------------------
    // 3. Save Lead Logic
    // ---------------------------------------------------------
    const btnSave = document.getElementById('btn-save');
    const statusMsg = document.getElementById('status-msg');

    btnSave.addEventListener('click', () => {
        const lead = {
            id: Date.now().toString(),
            name: nameInput.value,
            role: roleInput.value,
            company: companyInput.value,
            url: urlInput.value,
            date: new Date().toLocaleDateString()
        };

        if (!lead.name) {
            statusMsg.textContent = "Please enter a name.";
            statusMsg.style.color = "#ef4444";
            return;
        }

        chrome.storage.local.get(['leads'], (result) => {
            const leads = result.leads || [];
            leads.push(lead);
            chrome.storage.local.set({ leads: leads }, () => {
                statusMsg.textContent = "Saved!";
                statusMsg.style.color = "#4ade80";

                // Clear inputs (optional) - keeping them might be better
                setTimeout(() => statusMsg.textContent = "", 2000);
            });
        });
    });

    // ---------------------------------------------------------
    // 4. List View Logic
    // ---------------------------------------------------------
    const leadsContainer = document.getElementById('leads-container');
    const btnClear = document.getElementById('btn-clear');
    const btnExport = document.getElementById('btn-export');

    function loadLeads() {
        chrome.storage.local.get(['leads'], (result) => {
            const leads = result.leads || [];
            renderLeads(leads);
        });
    }

    function renderLeads(leads) {
        leadsContainer.innerHTML = '';
        if (leads.length === 0) {
            leadsContainer.innerHTML = '<div class="empty-state">No leads saved yet.</div>';
            return;
        }

        leads.forEach(lead => {
            const div = document.createElement('div');
            div.className = 'lead-item';
            div.innerHTML = `
                <div class="lead-info">
                    <h3>${lead.name}</h3>
                    <p>${lead.role ? lead.role + ' at ' : ''}${lead.company}</p>
                    <p><a href="${lead.url}" target="_blank" style="color:#60a5fa">Link</a> • ${lead.date}</p>
                </div>
                <div class="lead-actions">
                    <button data-id="${lead.id}">🗑️</button>
                </div>
            `;
            // Delete handler
            div.querySelector('button').addEventListener('click', (e) => {
                deleteLead(lead.id);
            });
            leadsContainer.appendChild(div);
        });
    }

    function deleteLead(id) {
        chrome.storage.local.get(['leads'], (result) => {
            const leads = result.leads || [];
            const newLeads = leads.filter(l => l.id !== id);
            chrome.storage.local.set({ leads: newLeads }, () => {
                loadLeads();
            });
        });
    }

    btnClear.addEventListener('click', () => {
        if (confirm("Are you sure you want to delete ALL leads?")) {
            chrome.storage.local.set({ leads: [] }, () => {
                loadLeads();
            });
        }
    });

    // ---------------------------------------------------------
    // 5. Export Logic
    // ---------------------------------------------------------
    btnExport.addEventListener('click', () => {
        chrome.storage.local.get(['leads'], (result) => {
            const leads = result.leads || [];
            if (leads.length === 0) {
                alert("No leads to export.");
                return;
            }

            const headers = ["Name", "Role", "Company", "URL", "Date"];
            const csvRows = [headers.join(',')];

            leads.forEach(lead => {
                const row = [
                    `"${lead.name}"`,
                    `"${lead.role}"`,
                    `"${lead.company}"`,
                    `"${lead.url}"`,
                    `"${lead.date}"`
                ];
                csvRows.push(row.join(','));
            });

            const csvString = csvRows.join('\n');
            const blob = new Blob([csvString], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);

            // To download from popup, we can use chrome.downloads or a hidden link
            // Using hidden link method which works well in popups
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'leads.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    });
});
