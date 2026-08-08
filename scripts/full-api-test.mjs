/**
 * Full live API connectivity test for dashboard-relevant endpoints.
 * Target: Postman Production host. Safe reads + limited non-destructive writes.
 * Run: node scripts/full-api-test.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const BASE = 'https://api.tavola.business/api/v1'
const results = []

function loadEnvCreds() {
  const envPath = path.resolve('postman collection/TAVLA-API.postman_environment.json')
  const env = JSON.parse(fs.readFileSync(envPath, 'utf8'))
  const get = (k) => env.values.find((v) => v.key === k)?.value
  return {
    email: get('ownerEmail') || 'owner@example.com',
    password: get('ownerPassword') || 'SecurePass123!',
  }
}

async function req(method, urlPath, { token, body, formData, label, expectOk = true } = {}) {
  const url = urlPath.startsWith('http') ? urlPath : `${BASE}${urlPath}`
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  let payload
  if (formData) {
    payload = formData
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const started = Date.now()
  let status = 0
  let data = null
  let text = ''
  let error = null
  try {
    const res = await fetch(url, { method, headers, body: payload })
    status = res.status
    text = await res.text()
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { raw: text.slice(0, 200) }
    }
  } catch (e) {
    error = e.message
  }
  const ms = Date.now() - started
  const ok =
    !error &&
    (expectOk
      ? status >= 200 && status < 300 && (data?.success === true || data?.success === undefined || status === 204)
      : true)
  // Health endpoints don't use business envelope
  const healthOk = !error && status >= 200 && status < 300
  const pass = urlPath.includes('/health') ? healthOk : expectOk ? (status >= 200 && status < 300 && (status === 204 || data?.success !== false)) : status > 0

  const row = {
    label: label || `${method} ${urlPath}`,
    method,
    path: urlPath,
    status,
    ms,
    pass,
    code: data?.code || null,
    message: data?.message || error || null,
  }
  results.push(row)
  const mark = pass ? 'PASS' : 'FAIL'
  console.log(`${mark.padEnd(4)} ${String(status).padEnd(4)} ${method.padEnd(6)} ${urlPath} (${ms}ms)${row.message && !pass ? ' — ' + row.message : ''}`)
  return { ...row, data }
}

async function main() {
  const creds = loadEnvCreds()
  const altCreds = [
    creds,
    { email: 'owner@bellavista.demo', password: 'TavolaDemo#2026' },
  ]

  console.log(`\n=== Health (${BASE}) ===`)
  await req('GET', '/health', { label: 'Health' })
  await req('GET', '/health/liveness', { label: 'Liveness' })
  await req('GET', '/health/readiness', { label: 'Readiness' })

  console.log(`\n=== Auth ===`)
  let login = null
  for (const c of altCreds) {
    const r = await req('POST', '/auth/login', {
      body: {
        email: c.email,
        password: c.password,
        deviceName: 'Tavola Dashboard API Test',
        deviceType: 'web',
      },
      label: `Login (${c.email})`,
    })
    if (r.pass && r.data?.data?.accessToken) {
      login = r.data.data
      console.log(`     → logged in as ${c.email}`)
      break
    }
  }

  if (!login?.accessToken) {
    console.log('\nABORT: could not login. Remaining authenticated tests skipped.')
    writeReport()
    process.exit(1)
  }

  const token = login.accessToken
  const refreshToken = login.refreshToken

  await req('GET', '/auth/sessions', { token, label: 'List sessions' })
  await req('GET', '/users/me', { token, label: 'Get profile' })
  await req('GET', '/users/me/preferences', { token, label: 'Get preferences' })

  console.log(`\n=== Taxonomy ===`)
  await req('GET', '/cuisine-categories', { token, label: 'Cuisine categories' })
  await req('GET', '/occasion-categories', { token, label: 'Occasion categories' })

  console.log(`\n=== Restaurants / Branches ===`)
  const restaurants = await req('GET', '/restaurants?page=1&limit=20', { token, label: 'List restaurants' })
  const restaurantId =
    restaurants.data?.data?.items?.[0]?.restaurantId ||
    restaurants.data?.data?.[0]?.restaurantId ||
    null

  if (!restaurantId) {
    console.log('No restaurant found — branch/table/reservation scoped tests limited.')
  } else {
    console.log(`     → restaurantId=${restaurantId}`)
    await req('GET', `/restaurants/${restaurantId}`, { token, label: 'Get restaurant' })
    await req('GET', `/restaurants/${restaurantId}/settings`, { token, label: 'Restaurant settings' })
    await req('GET', `/restaurants/${restaurantId}/working-hours`, { token, label: 'Restaurant working hours' })
    await req('GET', `/restaurants/${restaurantId}/gallery`, { token, label: 'Restaurant gallery' })
    await req('GET', `/restaurants/${restaurantId}/cuisine-categories`, { token, label: 'Restaurant cuisines' })
    await req('GET', `/restaurants/${restaurantId}/occasion-categories`, { token, label: 'Restaurant occasions' })

    const branches = await req('GET', `/restaurants/${restaurantId}/branches?page=1&limit=20`, {
      token,
      label: 'List branches',
    })
    const branchId = branches.data?.data?.items?.[0]?.branchId || null

    if (branchId) {
      console.log(`     → branchId=${branchId}`)
      await req('GET', `/restaurants/${restaurantId}/branches/${branchId}`, {
        token,
        label: 'Get branch',
      })
      await req('GET', `/restaurants/${restaurantId}/branches/${branchId}/working-hours`, {
        token,
        label: 'Branch working hours',
      })

      console.log(`\n=== Floor Plans / Tables ===`)
      const fps = await req('GET', `/restaurants/${restaurantId}/branches/${branchId}/floor-plans`, {
        token,
        label: 'List floor plans',
      })
      const floorPlanId =
        fps.data?.data?.items?.[0]?.floorPlanId ||
        fps.data?.data?.[0]?.floorPlanId ||
        null

      const tables = await req('GET', `/restaurants/${restaurantId}/branches/${branchId}/tables?page=1&limit=20`, {
        token,
        label: 'List tables by branch',
      })
      const tableId = tables.data?.data?.items?.[0]?.tableId || null

      if (floorPlanId) {
        console.log(`     → floorPlanId=${floorPlanId}`)
        await req(
          'GET',
          `/restaurants/${restaurantId}/branches/${branchId}/floor-plans/${floorPlanId}/tables?page=1&limit=20`,
          { token, label: 'List tables by floor plan' },
        )
      }
      if (tableId) {
        console.log(`     → tableId=${tableId}`)
        await req('GET', `/tables/${tableId}`, { token, label: 'Get table' })
      }

      console.log(`\n=== Reservations (reads + soft probes) ===`)
      const start = new Date()
      start.setUTCDate(start.getUTCDate() + 7)
      start.setUTCHours(18, 0, 0, 0)
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
      await req(
        'GET',
        `/reservations/availability?branchId=${branchId}&reservationStartTime=${encodeURIComponent(start.toISOString())}&reservationEndTime=${encodeURIComponent(end.toISOString())}&partySize=2`,
        { token, label: 'Search availability' },
      )
      await req('GET', '/reservations?page=1&limit=20', { token, label: 'List my reservations' })

      // Notifications / Waitlist presence (GET or expected auth shapes)
      console.log(`\n=== Notifications / Waitlist presence ===`)
      await req('GET', '/notifications?page=1&limit=20&unread=false', {
        token,
        label: 'List notifications',
        expectOk: false,
      })
      // fix pass flag for 2xx
      if (results.at(-1).status >= 200 && results.at(-1).status < 300) results.at(-1).pass = true

      await req('GET', '/notifications/unread-count', {
        token,
        label: 'Unread notification count',
        expectOk: false,
      })
      if (results.at(-1).status >= 200 && results.at(-1).status < 300) results.at(-1).pass = true
    }
  }

  console.log(`\n=== Token refresh ===`)
  await req('POST', '/auth/refresh', {
    body: { refreshToken },
    label: 'Refresh session',
  })

  // Logout last so we don't kill token mid-run
  console.log(`\n=== Logout ===`)
  await req('POST', '/auth/logout', { token, label: 'Logout' })

  writeReport()
}

function writeReport() {
  const passed = results.filter((r) => r.pass).length
  const failed = results.filter((r) => !r.pass).length
  const lines = [
    '# FULL_API_TEST_REPORT.md',
    '',
    '> Live connectivity test of dashboard-relevant API endpoints against the Postman Production host.',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Base URL:** \`${BASE}\``,
    `**Result:** ${passed} passed / ${failed} failed / ${results.length} total`,
    '',
    '## Method',
    '',
    '1. Hit health endpoints (no auth).',
    '2. Login with Postman environment owner credentials (fallback demo email if needed).',
    '3. Exercise authenticated **read** paths used by the dashboard (restaurants, branches, floor plans, tables, reservations availability/list, users, taxonomy, notifications).',
    '4. Refresh token + logout.',
    '5. Skipped destructive DELETEs and create mutations on production data in this automated pass.',
    '',
    '## Results',
    '',
    '| Status | HTTP | Method | Path | ms | Message |',
    '|---|---:|---|---|---:|---|',
    ...results.map((r) => {
      const msg = (r.message || '').replace(/\|/g, '/').slice(0, 120)
      return `| ${r.pass ? 'PASS' : 'FAIL'} | ${r.status} | ${r.method} | \`${r.path}\` | ${r.ms} | ${msg} |`
    }),
    '',
    '## Dashboard wiring note',
    '',
    'This report tests the **backend**. Frontend `src/api/*` coverage is tracked in `docs/INTEGRATION_STATUS.md`.',
    'Endpoints that PASS here but are not yet called from UI pages are still available to wire.',
    '',
  ]
  const out = path.resolve('docs/FULL_API_TEST_REPORT.md')
  fs.writeFileSync(out, lines.join('\n'), 'utf8')
  console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===`)
  console.log(`Wrote ${out}`)
}

main().catch((e) => {
  console.error(e)
  writeReport()
  process.exit(1)
})
