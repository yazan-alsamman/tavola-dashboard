/**
 * Dashboard endpoint connectivity probe against production API.
 * Run: node scripts/probe-dashboard-api.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const BASE = 'https://api.tavola.business/api/v1'
const results = []

async function req(method, urlPath, { token, body, label } = {}) {
  const url = urlPath.startsWith('http') ? urlPath : `${BASE}${urlPath}`
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  let payload
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const started = Date.now()
  let status = 0
  let data = null
  let error = null
  try {
    const res = await fetch(url, { method, headers, body: payload })
    status = res.status
    const text = await res.text()
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { raw: text.slice(0, 200) }
    }
  } catch (e) {
    error = e.message
  }
  const ms = Date.now() - started
  const health = urlPath.includes('/health')
  const pass = health
    ? !error && status >= 200 && status < 300
    : !error &&
      status >= 200 &&
      status < 300 &&
      (status === 204 || data?.success !== false)

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
  console.log(
    `${(pass ? 'PASS' : 'FAIL').padEnd(4)} ${String(status).padEnd(4)} ${method.padEnd(6)} ${label || urlPath}${!pass && row.message ? ' — ' + row.message : ''}`,
  )
  return { ...row, data }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function range30d() {
  const to = new Date()
  const from = new Date(to)
  from.setUTCDate(from.getUTCDate() - 30)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

async function main() {
  console.log(`\nBase: ${BASE}\n`)

  await req('GET', '/health', { label: 'Health' })
  await req('GET', '/health/liveness', { label: 'Liveness' })
  await req('GET', '/health/readiness', { label: 'Readiness' })

  const login = await req('POST', '/auth/login', {
    label: 'Login',
    body: {
      email: 'owner@bellavista.demo',
      password: 'TavolaDemo#2026',
      deviceName: 'Tavola Dashboard Probe',
      deviceType: 'web',
    },
  })
  const token = login.data?.data?.accessToken
  if (!token) {
    console.log('\nABORT: login failed')
    write()
    process.exit(1)
  }

  await req('GET', '/auth/sessions', { token, label: 'Auth sessions' })
  await req('GET', '/users/me', { token, label: 'Users me' })
  await req('GET', '/users/me/preferences', { token, label: 'User preferences' })
  await req('GET', '/cuisine-categories', { token, label: 'Cuisine categories' })
  await req('GET', '/occasion-categories', { token, label: 'Occasion categories' })
  await req('GET', '/notifications?page=1&limit=20', {
    token,
    label: 'Notifications list',
  })
  await req('GET', '/notifications/unread-count', {
    token,
    label: 'Notifications unread',
  })
  await req('GET', '/organizations/subscription', {
    token,
    label: 'Org subscription',
  })
  await req('GET', '/organizations/subscription/usage', {
    token,
    label: 'Org usage',
  })

  const restaurants = await req('GET', '/restaurants?page=1&limit=20', {
    token,
    label: 'List restaurants',
  })
  const restaurantId =
    restaurants.data?.data?.items?.[0]?.restaurantId ||
    restaurants.data?.data?.[0]?.restaurantId ||
    null
  if (!restaurantId) {
    console.log('No restaurant — skipping scoped probes')
    write()
    process.exit(1)
  }
  console.log(`     restaurantId=${restaurantId}`)

  await req('GET', `/restaurants/${restaurantId}`, { token, label: 'Get restaurant' })
  await req('GET', `/restaurants/${restaurantId}/settings`, {
    token,
    label: 'Restaurant settings',
  })
  await req('GET', `/restaurants/${restaurantId}/working-hours`, {
    token,
    label: 'Restaurant hours',
  })
  await req('GET', `/restaurants/${restaurantId}/gallery`, {
    token,
    label: 'Restaurant gallery',
  })

  const branches = await req(
    'GET',
    `/restaurants/${restaurantId}/branches?page=1&limit=20`,
    { token, label: 'List branches' },
  )
  const branchId = branches.data?.data?.items?.[0]?.branchId || null
  console.log(`     branchId=${branchId}`)

  if (branchId) {
    await req('GET', `/restaurants/${restaurantId}/branches/${branchId}`, {
      token,
      label: 'Get branch',
    })
    await req(
      'GET',
      `/restaurants/${restaurantId}/branches/${branchId}/working-hours`,
      { token, label: 'Branch hours' },
    )
    await req(
      'GET',
      `/restaurants/${restaurantId}/branches/${branchId}/floor-plans`,
      { token, label: 'Floor plans' },
    )
    await req(
      'GET',
      `/restaurants/${restaurantId}/branches/${branchId}/tables?page=1&limit=20`,
      { token, label: 'Tables by branch' },
    )
    await req(
      'GET',
      `/reservations/availability?restaurantId=${restaurantId}&branchId=${branchId}&date=${todayIso()}&partySize=2&page=1&limit=20`,
      { token, label: 'Reservation availability' },
    )
  }

  await req('GET', '/reservations?page=1&limit=20', {
    token,
    label: 'List my reservations',
  })

  // Reviews (page that failed in UI)
  await req(
    'GET',
    `/restaurants/${restaurantId}/reviews?page=1&limit=20`,
    { token, label: 'Restaurant reviews list' },
  )
  await req(
    'GET',
    `/restaurants/${restaurantId}/analytics/reviews-summary`,
    { token, label: 'Reviews summary analytics' },
  )

  // Offers
  await req('GET', `/restaurants/${restaurantId}/offers?page=1&limit=20`, {
    token,
    label: 'Offers list',
  })

  // Menus
  await req('GET', `/restaurants/${restaurantId}/menus`, {
    token,
    label: 'Menus list',
  })
  await req('GET', `/restaurants/${restaurantId}/menus/default`, {
    token,
    label: 'Default menu',
  })

  // Messaging
  await req(
    'GET',
    `/restaurants/${restaurantId}/conversations?limit=20`,
    { token, label: 'Messaging inbox' },
  )

  // Analytics
  const { from, to } = range30d()
  await req(
    'GET',
    `/restaurants/${restaurantId}/analytics/reservations/summary?from=${from}&to=${to}`,
    { token, label: 'Analytics reservation summary' },
  )
  await req(
    'GET',
    `/restaurants/${restaurantId}/analytics/customers?from=${from}&to=${to}`,
    { token, label: 'Analytics customers' },
  )
  await req(
    'GET',
    `/restaurants/${restaurantId}/analytics/waitlist?from=${from}&to=${to}`,
    { token, label: 'Analytics waitlist' },
  )
  if (branchId) {
    await req(
      'GET',
      `/restaurants/${restaurantId}/analytics/branches/${branchId}/reservations/trends?from=${from}&to=${to}`,
      { token, label: 'Analytics branch trends' },
    )
    await req(
      'GET',
      `/restaurants/${restaurantId}/analytics/branches/${branchId}/peak-hours?from=${from}&to=${to}`,
      { token, label: 'Analytics peak hours' },
    )
  }
  await req(
    'GET',
    `/organization/analytics/reservations/summary?from=${from}&to=${to}`,
    { token, label: 'Org analytics reservation summary' },
  )

  await req('POST', '/auth/logout', { token, label: 'Logout' })
  write()
}

function write() {
  const passed = results.filter((r) => r.pass).length
  const failed = results.filter((r) => !r.pass).length
  const out = path.resolve('docs/DASHBOARD_ENDPOINT_PROBE.md')
  const lines = [
    '# Dashboard Endpoint Probe',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Base URL:** \`${BASE}\``,
    `**Result:** ${passed} passed / ${failed} failed / ${results.length} total`,
    '',
    '| Status | HTTP | Label | Path | Message |',
    '|---|---:|---|---|---|',
    ...results.map((r) => {
      const msg = (r.message || '').replace(/\|/g, '/').slice(0, 140)
      return `| ${r.pass ? 'PASS' : 'FAIL'} | ${r.status} | ${r.label} | \`${r.path}\` | ${msg} |`
    }),
    '',
  ]
  fs.writeFileSync(out, lines.join('\n'), 'utf8')
  console.log(`\n=== ${passed} passed, ${failed} failed ===`)
  console.log(`Wrote ${out}`)
  if (failed > 0) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  write()
  process.exit(1)
})
