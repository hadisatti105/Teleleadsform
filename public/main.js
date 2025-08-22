const form = document.getElementById('leadForm');
const resultEl = document.getElementById('result');
const spinner = document.getElementById('spinner');
const submitBtn = document.getElementById('submitBtn');

// serialize FormData to object (preserves keys like "opt-in")
function formToObject(formEl) {
  const data = {};
  const fd = new FormData(formEl);
  for (const [k, v] of fd.entries()) data[k] = typeof v === 'string' ? v.trim() : v;
  return data;
}

function showLoading(isLoading) {
  if (!spinner) return;
  spinner.style.display = isLoading ? 'inline-block' : 'none';
  submitBtn.disabled = isLoading;
}

// Prefill helpers
(function prefillDefaults() {
  const src = document.querySelector('[name="source_url"]');
  if (src && !src.value) src.value = window.location.href;

  const orig = document.querySelector('[name="origninal_lead_submit_date"]');
  if (orig && !orig.value) {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    orig.value = `${yyyy}-${mm}-${dd}`;
  }
})();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  resultEl.innerHTML = '';
  showLoading(true);

  try {
    // built-in browser validation
    if (!form.checkValidity()) {
      form.reportValidity();
      showLoading(false);
      return;
    }

    const payload = formToObject(form);

    // auto uppercase state codes
    if (payload.state) payload.state = payload.state.toUpperCase();
    if (payload.accident_state) payload.accident_state = payload.accident_state.toUpperCase();

    // basic phone cleanup
    if (payload.phone_number) {
      payload.phone_number = payload.phone_number.replace(/[^\d+]/g, '');
    }

    // If police_report is "No" or "Unsure" and number empty, put "N/A"
    if ((payload.police_report === 'No' || payload.police_report === 'Unsure') && !payload.police_report_number) {
      payload.police_report_number = 'N/A';
    }

    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();

    if (!res.ok || !json.ok) {
      const missing = json.missing ? `<br><strong>Missing:</strong> ${json.missing.join(', ')}` : '';
      throw new Error(`${json.error || 'Submission failed.'}${missing}`);
    }

    resultEl.innerHTML = `
      <div class="alert alert-success">
        <strong>Success!</strong> ${json.message}
      </div>
    `;

    form.reset();
    // re-fill defaults
    document.querySelector('[name="source_url"]').value = window.location.href;
    const orig = document.querySelector('[name="origninal_lead_submit_date"]');
    if (orig) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      orig.value = `${yyyy}-${mm}-${dd}`;
    }
  } catch (err) {
    resultEl.innerHTML = `
      <div class="alert alert-danger">
        <strong>Submission failed.</strong><br/>
        ${escapeHtml(err.message)}
      </div>
    `;
  } finally {
    showLoading(false);
  }
});

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
