async function runTests() {
  console.log('--- STARTING CLINIC QUEUE MANAGEMENT SYSTEM COMPREHENSIVE TEST SUITE ---');

  const BASE_URL = 'http://localhost:3000';
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Booking Metadata
    const bookingMetaRes = await fetch(`${BASE_URL}/api/booking`);
    const bookingMeta = await bookingMetaRes.json();
    assert(bookingMetaRes.status === 200, 'GET /api/booking returns 200 OK');
    assert(bookingMeta.clinic?.name === 'Aapka Clinic', 'Clinic name is "Aapka Clinic"');
    assert(Array.isArray(bookingMeta.doctors) && bookingMeta.doctors.length >= 2, 'At least 2 active doctors available');

    const doctorId = bookingMeta.doctors[0].id;

    // 2. Public Patient Token Booking (Screen 1)
    const bookRes = await fetch(`${BASE_URL}/api/booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctor_id: doctorId,
        patient_name: 'Suresh Sharma',
        mobile: '9876543299',
        gender: 'Male',
        age: 38,
        day: 'today',
      }),
    });
    const bookData = await bookRes.json();
    assert(bookRes.status === 200, 'POST /api/booking creates token with 200 OK');
    assert(Boolean(bookData.token?.token_display), `Generated token display: ${bookData.token?.token_display}`);
    assert(bookData.token?.patient_name === 'Suresh Sharma', 'Patient name matches');
    const bookedTokenId = bookData.token.id;

    // 3. Token Confirmation and Live Queue Data (Screen 2 & Screen 3)
    const tokenRes = await fetch(`${BASE_URL}/api/tokens/${bookedTokenId}`);
    const tokenDetails = await tokenRes.json();
    assert(tokenRes.status === 200, 'GET /api/tokens/:id returns 200 OK');
    assert(tokenDetails.token?.id === bookedTokenId, 'Token ID matches');
    assert(tokenDetails.queue_state !== undefined, 'Queue state (ahead count, estimated time) is computed');

    // 4. Waiting Room TV Display (Screen 9)
    const tvRes = await fetch(`${BASE_URL}/api/queue/tv?doctor_id=${doctorId}`);
    const tvData = await tvRes.json();
    assert(tvRes.status === 200, 'GET /api/queue/tv returns 200 OK');
    assert(tvData.clinic?.name !== undefined, 'TV screen payload has clinic name');
    assert(Array.isArray(tvData.upcoming_tokens), 'TV screen has upcoming tokens array');

    // 5. Staff Auth (Screen 12)
    // Send OTP
    const sendOtpRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876543210' }), // Malik mobile
    });
    const sendOtpData = await sendOtpRes.json();
    assert(sendOtpRes.status === 200 && sendOtpData.success, 'POST /api/auth/send-otp sends OTP');

    // Verify OTP & Get Session Cookie
    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876543210', otp: '1234' }),
    });
    const verifyData = await verifyRes.json();
    assert(verifyRes.status === 200 && verifyData.role === 'malik', 'POST /api/auth/verify-otp verifies OTP for Malik');

    const setCookieHeader = verifyRes.headers.get('set-cookie');
    assert(Boolean(setCookieHeader && setCookieHeader.includes('clinic_session')), 'Session cookie clinic_session issued');
    const sessionCookie = setCookieHeader ? setCookieHeader.split(';')[0] : '';

    // 6. Reception Queue Table (Screen 4)
    const receptionRes = await fetch(`${BASE_URL}/api/reception/tokens`, {
      headers: { Cookie: sessionCookie },
    });
    const receptionData = await receptionRes.json();
    assert(receptionRes.status === 200, 'GET /api/reception/tokens authorized with session');
    assert(Array.isArray(receptionData.tokens) && receptionData.tokens.length > 0, `Reception tokens loaded: ${receptionData.tokens?.length}`);
    assert(receptionData.stats?.total > 0, `Total tokens count: ${receptionData.stats?.total}`);

    // Mark Arrived
    const markRes = await fetch(`${BASE_URL}/api/reception/tokens`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ tokenId: bookedTokenId, status: 'arrived' }),
    });
    assert(markRes.status === 200, 'PATCH /api/reception/tokens marks token as arrived');

    // 7. Walk-in Registration (Screen 5)
    const walkinRes = await fetch(`${BASE_URL}/api/reception/walk-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({
        patient_name: 'Anjali Gupta',
        mobile: '9876543288',
        doctor_id: doctorId,
        gender: 'Female',
        age: 26,
      }),
    });
    const walkinData = await walkinRes.json();
    assert(walkinRes.status === 200 && walkinData.success, `Walk-in token issued: ${walkinData.token?.token_display}`);
    assert(walkinData.token?.status === 'arrived', 'Walk-in is automatically marked arrived');

    // 8. Patient Search (Screen 6)
    const searchRes = await fetch(`${BASE_URL}/api/reception/search?q=Suresh`, {
      headers: { Cookie: sessionCookie },
    });
    const searchData = await searchRes.json();
    assert(searchRes.status === 200, 'GET /api/reception/search returns 200');
    assert(searchData.patients?.some(p => p.full_name.includes('Suresh')), 'Found patient "Suresh" in database search');

    // 9. Doctor Panel: NEXT PATIENT Call (Screen 7)
    const nextPatientRes = await fetch(`${BASE_URL}/api/doctor/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ action: 'NEXT', doctor_id: doctorId }),
    });
    const nextPatientData = await nextPatientRes.json();
    assert(nextPatientRes.status === 200 && nextPatientData.success, `Doctor called next patient: ${nextPatientData.message}`);

    // Verify TV screen picks up active call
    const tvAfterCall = await (await fetch(`${BASE_URL}/api/queue/tv?doctor_id=${doctorId}`)).json();
    assert(Boolean(tvAfterCall.active_token), `TV Screen now serving: ${tvAfterCall.active_token?.token_display}`);

    // 10. Record Consultation & Prescription (Screen 8)
    const patId = tokenDetails.token.patient_id;
    const saveConsRes = await fetch(`${BASE_URL}/api/doctor/patient/${patId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({
        doctor_id: doctorId,
        symptoms: 'Mild fever and dry cough',
        diagnosis: 'Acute Viral Pharyngitis',
        doctor_notes: 'Vitals stable. BP 120/80.',
        advice: 'Steam inhalation and drink warm fluids.',
        prescriptions: [
          { medicine_name: 'Tab Paracetamol 650mg', dosage: '1 tablet', frequency: 'TDS', duration: '3 days', instructions: 'After meals' },
        ],
      }),
    });
    const saveConsData = await saveConsRes.json();
    assert(saveConsRes.status === 200 && saveConsData.success, 'Recorded clinical consultation notes and prescription');

    // Verify history retrieval
    const historyRes = await fetch(`${BASE_URL}/api/doctor/patient/${patId}`, {
      headers: { Cookie: sessionCookie },
    });
    const historyData = await historyRes.json();
    assert(historyData.consultations?.length > 0, `Clinical history retrieved: ${historyData.consultations?.length} visits`);
    assert(historyData.consultations[0]?.prescriptions?.length > 0, 'Prescriptions properly linked in clinical timeline');

    // 11. Daily Operations Report & CSV Export (Screen 10)
    const reportRes = await fetch(`${BASE_URL}/api/owner/reports`, {
      headers: { Cookie: sessionCookie },
    });
    const reportData = await reportRes.json();
    assert(reportRes.status === 200, 'GET /api/owner/reports returns genuine database metrics');
    assert(reportData.today_metrics?.total_tokens > 0, `Today tokens in report: ${reportData.today_metrics?.total_tokens}`);
    assert(Array.isArray(reportData.weekly_trend) && reportData.weekly_trend.length === 7, '7-day trend array has 7 days');

    const csvRes = await fetch(`${BASE_URL}/api/owner/reports?export=csv`, {
      headers: { Cookie: sessionCookie },
    });
    const csvText = await csvRes.text();
    assert(csvRes.status === 200 && csvText.startsWith('Token,Date,Patient ID'), 'CSV report exported with proper headers');

    // 12. Clinic Settings (Screen 11)
    const settingsRes = await fetch(`${BASE_URL}/api/owner/settings`, {
      headers: { Cookie: sessionCookie },
    });
    const settingsData = await settingsRes.json();
    assert(settingsRes.status === 200, 'GET /api/owner/settings returns 200');
    assert(settingsData.settings?.daily_token_limit !== undefined, 'Settings daily token limit loaded');

    // 13. Public HTML Pages Rendering
    const pages = ['/', '/tv', '/login', '/privacy', '/terms'];
    for (const p of pages) {
      const pageRes = await fetch(`${BASE_URL}${p}`);
      assert(pageRes.status === 200, `Page ${p} renders HTTP 200 HTML`);
    }

    console.log(`\n========================================`);
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);
  } catch (err) {
    console.error('Test suite failed with unexpected error:', err);
  }
}

runTests();
