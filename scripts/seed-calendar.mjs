/**
 * Seed ownership reservations for Calendar daily / weekly / monthly views.
 *
 * Creates Online bookings for the signed-in demo owner (they appear on
 * GET /reservations). Spreads density across today, this week, and this month.
 *
 * Run:
 *   node scripts/seed-calendar.mjs
 *
 * Env (optional):
 *   TAVOLA_API_BASE=https://api.tavola.business/api/v1
 *   TAVOLA_EMAIL=owner@bellavista.demo
 *   TAVOLA_PASSWORD=TavolaDemo#2026
 *   TAVOLA_REFRESH_TOKEN=<refresh>   # unlock AUTH_TOO_MANY_SESSIONS via logout-all
 */
import { randomUUID } from 'node:crypto'

const BASE = (process.env.TAVOLA_API_BASE || 'https://api.tavola.business/api/v1').replace(
  /\/+$/,
  '',
)
const EMAIL = process.env.TAVOLA_EMAIL || 'owner@bellavista.demo'
const PASSWORD = process.env.TAVOLA_PASSWORD || 'TavolaDemo#2026'

async function api(method, path, { token, body, idempotencyKey } = {}) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text.slice(0, 240) }
  }
  return { ok: res.ok, status: res.status, json }
}

function dateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function atLocal(dateKeyStr, hour, minute = 0) {
  const [y, m, d] = dateKeyStr.split('-').map(Number)
  const start = new Date(y, m - 1, d, hour, minute, 0, 0)
  const end = new Date(start.getTime() + 90 * 60 * 1000)
  return { start: start.toISOString(), end: end.toISOString() }
}

function addDays(dateKeyStr, delta) {
  const [y, m, d] = dateKeyStr.split('-').map(Number)
  const date = new Date(y, m - 1, d, 12, 0, 0, 0)
  date.setDate(date.getDate() + delta)
  return dateKey(date)
}

/** Build a varied booking plan so heatmaps look intentional. */
function buildPlan(today) {
  /** @type {{ date: string, hour: number, guests: number, note: string }[]} */
  const slots = []

  // Today — dense evening service
  for (const hour of [12, 13, 18, 19, 19, 20, 21]) {
    slots.push({
      date: today,
      hour,
      guests: hour >= 18 ? 4 : 2,
      note: `Seed · today ${hour}:00`,
    })
  }

  // Rest of this week — mixed density
  const weekPattern = [
    { offset: 1, hours: [13, 19] },
    { offset: 2, hours: [18, 19, 20, 21] }, // busy
    { offset: 3, hours: [12] },
    { offset: 4, hours: [18, 20] },
    { offset: 5, hours: [19, 20, 21] },
    { offset: 6, hours: [14, 18] },
  ]
  for (const day of weekPattern) {
    for (const hour of day.hours) {
      slots.push({
        date: addDays(today, day.offset),
        hour,
        guests: 2 + (hour % 3),
        note: `Seed · week +${day.offset}d ${hour}:00`,
      })
    }
  }

  // Later this month — spaced days with one peak weekend
  for (const offset of [8, 10, 12, 14, 16, 18, 21]) {
    const hours = offset === 14 ? [12, 13, 18, 19, 20] : offset % 3 === 0 ? [19, 20] : [18]
    for (const hour of hours) {
      slots.push({
        date: addDays(today, offset),
        hour,
        guests: 2,
        note: `Seed · month +${offset}d ${hour}:00`,
      })
    }
  }

  return slots
}

async function loginWithRecovery() {
  const loginBody = {
    email: EMAIL,
    password: PASSWORD,
    deviceName: 'Tavola Calendar Seed',
    deviceType: 'web',
  }

  let login = await api('POST', '/auth/login', { body: loginBody })
  if (login.ok && login.json?.data?.accessToken) {
    return login.json.data
  }

  if (login.json?.code !== 'AUTH_TOO_MANY_SESSIONS') {
    throw new Error(
      `Login failed (${login.status}): ${login.json?.code || login.json?.message || 'unknown'}`,
    )
  }

  const refresh =
    process.env.TAVOLA_REFRESH_TOKEN ||
    process.env.TAVOLA_REFRESH ||
    null
  if (!refresh) {
    throw new Error(
      'AUTH_TOO_MANY_SESSIONS: open Settings → Sign out all devices, or set TAVOLA_REFRESH_TOKEN and re-run.',
    )
  }

  console.log('… too many sessions; refreshing + logout-all')
  const refreshed = await api('POST', '/auth/refresh', {
    body: { refreshToken: refresh },
  })
  const access = refreshed.json?.data?.accessToken
  if (!refreshed.ok || !access) {
    throw new Error('Could not refresh session to clear lockout.')
  }

  await api('POST', '/auth/logout-all', { token: access })
  login = await api('POST', '/auth/login', { body: loginBody })
  if (!login.ok || !login.json?.data?.accessToken) {
    throw new Error(
      `Login retry failed (${login.status}): ${login.json?.code || login.json?.message}`,
    )
  }
  return login.json.data
}

async function main() {
  console.log(`\nSeed calendar bookings → ${BASE}`)
  console.log(`Account: ${EMAIL}\n`)

  const session = await loginWithRecovery()
  const token = session.accessToken
  console.log('✓ logged in')

  try {
    const restaurants = await api('GET', '/restaurants?page=1&limit=5', { token })
    const restaurantId = restaurants.json?.data?.items?.[0]?.restaurantId
    if (!restaurantId) throw new Error('No restaurant found for this account.')

    const branches = await api(
      'GET',
      `/restaurants/${restaurantId}/branches?page=1&limit=5`,
      { token },
    )
    const branchId = branches.json?.data?.items?.[0]?.branchId
    if (!branchId) throw new Error('No branch found.')

    const tablesRes = await api(
      'GET',
      `/restaurants/${restaurantId}/branches/${branchId}/tables?page=1&limit=50`,
      { token },
    )
    const tables = tablesRes.json?.data?.items ?? []
    if (tables.length === 0) throw new Error('No tables found to book.')

    console.log(`✓ restaurant=${restaurantId}`)
    console.log(`✓ branch=${branchId}`)
    console.log(`✓ tables=${tables.length}`)

    const today = dateKey(new Date())
    const now = Date.now()
    const plan = buildPlan(today).filter((slot) => {
      const { start } = atLocal(slot.date, slot.hour)
      return new Date(start).getTime() > now + 15 * 60 * 1000
    })
    console.log(`\nCreating ${plan.length} seed reservations (future slots only)…`)

    let created = 0
    let skipped = 0
    let approved = 0
    let tableCursor = 0

    for (const slot of plan) {
      // Prefer availability when the API returns candidates; else round-robin tables.
      const avail = await api(
        'GET',
        `/reservations/availability?restaurantId=${restaurantId}&branchId=${branchId}&date=${slot.date}&partySize=${slot.guests}&page=1&limit=20`,
        { token },
      )
      const available =
        (Array.isArray(avail.json?.data)
          ? avail.json.data
          : avail.json?.data?.items) ?? []
      const openTables = available.filter((t) => t.isAvailable !== false)
      const table =
        openTables[tableCursor % Math.max(openTables.length, 1)] ||
        tables[tableCursor % tables.length]
      tableCursor += 1

      const tableId = table.tableId
      if (!tableId) {
        skipped += 1
        continue
      }

      const { start, end } = atLocal(slot.date, slot.hour)
      const create = await api('POST', '/reservations', {
        token,
        idempotencyKey: randomUUID(),
        body: {
          branchId,
          tableId,
          reservationStartTime: start,
          reservationEndTime: end,
          guests: slot.guests,
          notes: slot.note,
        },
      })

      if (!create.ok) {
        skipped += 1
        const code = create.json?.code || create.status
        const detail =
          create.json?.errors?.[0]?.message ||
          create.json?.message ||
          ''
        console.log(
          `  · skip ${slot.date} ${String(slot.hour).padStart(2, '0')}:00 (${code}${detail ? ` — ${detail}` : ''})`,
        )
        continue
      }

      created += 1
      const reservationId = create.json?.data?.reservationId
      console.log(
        `  ✓ ${slot.date} ${String(slot.hour).padStart(2, '0')}:00 → ${reservationId?.slice(0, 8)}…`,
      )

      // Approve about half so the calendar shows mixed statuses (best-effort).
      if (reservationId && created % 2 === 0) {
        const appr = await api('POST', `/reservations/${reservationId}/approve`, {
          token,
          idempotencyKey: randomUUID(),
        })
        if (appr.ok) {
          approved += 1
        } else if (created === 2) {
          console.log(
            `  · approve skipped (${appr.json?.code || appr.status}) — continuing without status mix`,
          )
        }
      }
    }

    console.log(`\nDone. created=${created} approved=${approved} skipped=${skipped}`)
    console.log('Open the dashboard Calendar (daily / weekly / monthly) to review.\n')
  } finally {
    await api('POST', '/auth/logout', { token })
    console.log('✓ logged out seed session')
  }
}

main().catch((err) => {
  console.error(`\nSeed failed: ${err.message}\n`)
  process.exit(1)
})
