import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const TELELEAD_KEY = process.env.TELELEAD_KEY;
const TELELEAD_UID = process.env.TELELEAD_UID;

if (!TELELEAD_KEY || !TELELEAD_UID) {
  console.error('❌ Missing TELELEAD_KEY or TELELEAD_UID in .env');
  process.exit(1);
}

app.use(helmet());
app.use(morgan('dev'));

// CORS
const allowed = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
  })
);

app.use(express.json({ limit: '1mb' }));

// static
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// helper: client IP
function getClientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (xf) return xf.split(',')[0].trim();
  return req.socket?.remoteAddress || '';
}

// all required fields
const REQUIRED_FIELDS = [
  'first_name','last_name','phone_number','email','state','zip_code','ip_address',
  'already_represented','hospitalized_treated','auto_accident_in_last_1_year',
  'date_of_accident','was_the_accident_your_fault','police_report','insurance','dob',
  'language','source_url','injury_type','accident_vehicle','opt-in','jornaya',
  'trusted_form','describe_what_happened','address','city','were_you_injured',
  'property_damage','middle_name','gender','marital_status','received_treatment',
  'still_treated','last_treated','ambulance','uninsured_motorist_coverage',
  'at_fault_driver_ins','insurance_policy_','police_report_number',
  'origninal_lead_submit_date','accident_state','certificate_id'
];

const required = v => v !== undefined && v !== null && String(v).trim() !== '';

// Lead submit proxy
app.post('/api/lead', async (req, res) => {
  try {
    const data = { ...(req.body || {}) };

    // Auto-fill IP if blank
    if (!required(data['ip_address'])) data['ip_address'] = getClientIp(req);

    // Normalize a few fields
    if (data.state) data.state = String(data.state).toUpperCase();
    if (data.accident_state) data.accident_state = String(data.accident_state).toUpperCase();
    if (data.phone_number) data.phone_number = String(data.phone_number).replace(/[^\d+]/g, '');

    // Check missing
    const missing = REQUIRED_FIELDS.filter(f => !required(data[f]));
    if (missing.length) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields',
        missing
      });
    }

    const baseUrl = 'https://api.telelead.com/tcpanel/tcpanel/leadpost';
    const params = { key: TELELEAD_KEY, uid: TELELEAD_UID, ...data };

    const response = await axios.get(baseUrl, { params, timeout: 20000 });

    // TeleLead returns plain text (e.g., "Success\n")
    const payload = typeof response.data === 'string'
      ? response.data.trim()
      : response.data;

    return res.json({ ok: true, telelead_status: response.status, message: payload });
  } catch (err) {
    console.error('TeleLead error:', err.message);
    return res.status(502).json({
      ok: false,
      error: 'Failed to send lead to TeleLead',
      detail: err.response?.data || err.message
    });
  }
});

// health
app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
