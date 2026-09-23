const fs = require('fs');
const data = JSON.parse(
  fs.readFileSync('D:/Tavola/postman/_staff_inventory_raw.json', 'utf8'),
);

function classify(r) {
  const roleRaw = (r.requiredRole || '').trim();
  const role = roleRaw.toLowerCase();
  const path = r.path.toLowerCase();
  const name = r.name.toLowerCase();
  const top = r.topFolder || '';
  const coll = r.collection;

  // Entire Platform Back Office collection is out of restaurant-dashboard scope.
  if (coll === 'Platform-Back-Office') return 'platform-admin';
  if (path.includes('/platform-admin')) return 'platform-admin';
  if (top.startsWith('06 -') || top.startsWith('22 -')) return 'platform-admin';
  if (
    /^(platform admin|platformadmin)\b/i.test(roleRaw) ||
    roleRaw.startsWith('PlatformAdmin')
  ) {
    return 'platform-admin';
  }
  if (name === 'login platform admin') return 'platform-admin';

  // Customer API folder + customer auth flows.
  if (coll === 'TAVLA-API' && top.startsWith('02 -')) return 'customer-only';
  if (path.includes('/auth/customer')) return 'customer-only';
  if (
    name.includes('login customer') ||
    name.includes('register customer') ||
    name.includes('customer password')
  ) {
    return 'customer-only';
  }
  // Public discovery (mobile/customer browse).
  if (top.startsWith('07 -')) return 'customer-only';

  // Docs anomaly: staff-inbox named, but Required Role says Customer.
  if (name.includes('staff inbox')) return 'staff';

  if (role.startsWith('customer') && !role.includes('employee')) {
    return 'customer-only';
  }

  if (
    role.includes('restaurant owner') ||
    role.includes('employee') ||
    role.includes('organization')
  ) {
    return 'staff';
  }
  if (role.startsWith('authenticated')) return 'staff';

  if (top.startsWith('00 -') && role === 'public') {
    if (name.includes('customer') || path.includes('/auth/customer')) {
      return 'customer-only';
    }
    if (name.includes('platform') || path.includes('platform-admin')) {
      return 'platform-admin';
    }
    return 'staff';
  }

  if (top.startsWith('25 -') || top.startsWith('26 -')) return 'staff';

  if (top.match(/^(08|09|10|11|12|13|14|15|16|17|18|19|21|23) -/)) {
    if (role === 'public') return 'customer-only';
    return 'staff';
  }

  if (role === 'public') return 'customer-only';
  return 'other';
}

function domainOf(r) {
  const top = r.topFolder || '';
  const path = r.path.toLowerCase();

  if (r.collection === 'Platform-Back-Office') return 'Platform Administration';
  if (path.includes('/platform-admin') && !top.startsWith('00 -')) {
    // Keep platform-admin login under Auth folder mapping.
    if (top.startsWith('22 -')) return 'Subscriptions (Platform)';
    if (top.startsWith('06 -')) return 'Platform Administration';
  }

  // Prefer Postman top-level folder (authoritative capability grouping).
  if (top.startsWith('00 -')) return 'Auth';
  if (top.startsWith('08 -')) return 'Reservations';
  if (top.startsWith('09 -')) return 'Waitlist';
  if (top.startsWith('10 -')) return 'Reviews';
  if (top.startsWith('11 -')) return 'Offers';
  if (top.startsWith('12 -')) return 'Menu';
  if (top.startsWith('13 -')) return 'Messaging';
  if (top.startsWith('14 -')) return 'Analytics';
  if (top.startsWith('15 -')) return 'Restaurants';
  if (top.startsWith('16 -')) return 'Branches';
  if (top.startsWith('17 -')) return 'Floor Plans';
  if (top.startsWith('18 -')) return 'Tables';
  if (top.startsWith('19 -') || top.startsWith('20 -')) return 'Employees';
  if (top.startsWith('21 -')) return 'Organizations';
  if (top.startsWith('23 -')) return 'Notifications';
  if (top.startsWith('25 -')) return 'Health';
  if (top.startsWith('22 -')) return 'Subscriptions (Platform)';
  if (top.startsWith('07 -')) return 'Discovery (Public)';
  if (top.startsWith('02 -')) return 'Customer Profile';
  if (top.startsWith('06 -')) return 'Platform Administration';
  if (top.startsWith('26 -')) return 'Utilities';

  if (path.includes('/auth')) return 'Auth';
  if (path.includes('reservation')) return 'Reservations';
  if (path.includes('waitlist')) return 'Waitlist';
  if (path.includes('review')) return 'Reviews';
  if (path.includes('offer')) return 'Offers';
  if (path.includes('/menu')) return 'Menu';
  if (path.includes('messag') || path.includes('conversation')) return 'Messaging';
  if (path.includes('analytics')) return 'Analytics';
  if (path.includes('floor-plan')) return 'Floor Plans';
  if (path.includes('/tables')) return 'Tables';
  if (path.includes('/employees')) return 'Employees';
  if (path.includes('/branches')) return 'Branches';
  if (path.includes('/organizations') || path.includes('/organization')) {
    return 'Organizations';
  }
  if (path.includes('notification')) return 'Notifications';
  if (path.includes('health')) return 'Health';
  if (path.includes('platform-admin')) return 'Platform Administration';
  if (path.includes('/restaurants')) return 'Restaurants';
  return 'Other';
}

function esc(s) {
  return String(s || '—').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

const classified = data.endpoints.map((r) => ({
  ...r,
  scope: classify(r),
  domain: domainOf(r),
}));

const byScope = {
  staff: [],
  'customer-only': [],
  'platform-admin': [],
  other: [],
};
for (const r of classified) byScope[r.scope].push(r);

const domains = [
  'Auth',
  'Reservations',
  'Waitlist',
  'Reviews',
  'Offers',
  'Menu',
  'Messaging',
  'Analytics',
  'Restaurants',
  'Branches',
  'Floor Plans',
  'Tables',
  'Employees',
  'Organizations',
  'Notifications',
  'Health',
];

const md = [];
md.push('# Postman Staff / Owner / Employee Endpoint Inventory');
md.push('');
md.push('Sources:');
md.push(
  `- \`postman/TAVLA-API.postman_collection.json\` (${data.summary.apiCount} requests)`,
);
md.push(
  `- \`postman/TAVLA-Platform-Back-Office.postman_collection.json\` (${data.summary.pboCount} requests)`,
);
md.push('');
md.push('## Summary counts');
md.push('');
md.push('| Scope | Count |');
md.push('|-------|------:|');
md.push(
  `| Restaurant dashboard (staff/owner/employee) | ${byScope.staff.length} |`,
);
md.push(
  `| Out of scope — customer-only | ${byScope['customer-only'].length} |`,
);
md.push(
  `| Out of scope — platform-admin-only | ${byScope['platform-admin'].length} |`,
);
md.push(`| Other / unclassified | ${byScope.other.length} |`);
md.push(`| **Total** | **${classified.length}** |`);
md.push('');

md.push('## Empty folders (TAVLA-API)');
md.push('');
for (const f of data.summary.emptyFolders.api) {
  md.push(`- **${f.folder}** — ${f.description}`);
}
md.push('');
md.push('_Platform Back Office: no empty folders._');
md.push('');
md.push('---');
md.push('');
md.push('# Restaurant dashboard scope (staff / owner / employee)');
md.push('');
md.push(
  'Includes: Required Role containing Restaurant Owner/Admin, Employee, Authenticated dual-actor shared endpoints, Customer|Employee dual routes (employee can call), and staff-relevant public Auth (login / refresh / forgot / reset). Excludes customer registration/login/API, public Discovery, and all platform-admin routes.',
);
md.push('');

for (const d of domains) {
  const items = byScope.staff.filter((r) => r.domain === d);
  md.push(`## ${d}`);
  md.push('');
  if (!items.length) {
    md.push(
      '_No staff-relevant endpoints in this domain (empty/redirect folder only)._',
    );
    md.push('');
    continue;
  }
  const byFolder = {};
  for (const r of items) {
    const f = r.fullFolder || r.topFolder;
    (byFolder[f] = byFolder[f] || []).push(r);
  }
  for (const [folder, rs] of Object.entries(byFolder)) {
    md.push(`### Folder: ${folder}`);
    md.push('');
    md.push('| METHOD | Path template | Request name | Required Role |');
    md.push('|--------|---------------|--------------|---------------|');
    for (const r of rs) {
      md.push(
        `| ${r.method} | \`${r.path}\` | ${esc(r.name)} | ${esc(r.requiredRole)} |`,
      );
    }
    md.push('');
  }
}

const extraStaff = byScope.staff.filter((r) => !domains.includes(r.domain));
if (extraStaff.length) {
  md.push('## Additional staff-relevant (outside named domains)');
  md.push('');
  md.push(
    '| METHOD | Path template | Folder | Request name | Required Role | Domain |',
  );
  md.push(
    '|--------|---------------|--------|--------------|---------------|--------|',
  );
  for (const r of extraStaff) {
    md.push(
      `| ${r.method} | \`${r.path}\` | ${esc(r.fullFolder || r.topFolder)} | ${esc(r.name)} | ${esc(r.requiredRole)} | ${r.domain} |`,
    );
  }
  md.push('');
}

md.push('---');
md.push('');
md.push('# Out of restaurant dashboard scope');
md.push('');
md.push('## Customer-only');
md.push('');

const custByDomain = {};
for (const r of byScope['customer-only']) {
  (custByDomain[r.domain] = custByDomain[r.domain] || []).push(r);
}
for (const d of Object.keys(custByDomain).sort()) {
  const rs = custByDomain[d];
  md.push(`### ${d} (${rs.length})`);
  md.push('');
  md.push(
    '| METHOD | Path template | Folder | Request name | Required Role |',
  );
  md.push(
    '|--------|---------------|--------|--------------|---------------|',
  );
  for (const r of rs) {
    md.push(
      `| ${r.method} | \`${r.path}\` | ${esc(r.fullFolder || r.topFolder)} | ${esc(r.name)} | ${esc((r.requiredRole || '—').slice(0, 100))} |`,
    );
  }
  md.push('');
}

md.push('## Platform-admin-only');
md.push('');

const platByKey = {};
for (const r of byScope['platform-admin']) {
  const key = `${r.collection} — ${r.domain}`;
  (platByKey[key] = platByKey[key] || []).push(r);
}
for (const d of Object.keys(platByKey).sort()) {
  const rs = platByKey[d];
  md.push(`### ${d} (${rs.length})`);
  md.push('');
  md.push(
    '| METHOD | Path template | Folder | Request name | Required Role |',
  );
  md.push(
    '|--------|---------------|--------|--------------|---------------|',
  );
  for (const r of rs) {
    md.push(
      `| ${r.method} | \`${r.path}\` | ${esc(r.fullFolder || r.topFolder)} | ${esc(r.name)} | ${esc((r.requiredRole || '—').slice(0, 100))} |`,
    );
  }
  md.push('');
}

if (byScope.other.length) {
  md.push('## Other / unclassified');
  md.push('');
  md.push(
    '| METHOD | Path template | Folder | Request name | Required Role |',
  );
  md.push(
    '|--------|---------------|--------|--------------|---------------|',
  );
  for (const r of byScope.other) {
    md.push(
      `| ${r.method} | \`${r.path}\` | ${esc(r.fullFolder || r.topFolder)} | ${esc(r.name)} | ${esc(r.requiredRole)} |`,
    );
  }
  md.push('');
}

const staffRoles = {};
for (const r of byScope.staff) {
  const k = r.requiredRole || '(none)';
  staffRoles[k] = (staffRoles[k] || 0) + 1;
}
md.push('---');
md.push('');
md.push('## Staff-scope Required Role histogram');
md.push('');
md.push('| Required Role | Count |');
md.push('|---------------|------:|');
for (const [k, v] of Object.entries(staffRoles).sort((a, b) => b[1] - a[1])) {
  md.push(`| ${esc(k)} | ${v} |`);
}
md.push('');

fs.writeFileSync(
  'D:/Tavola/postman/_staff_dashboard_inventory.md',
  md.join('\n'),
);
fs.writeFileSync(
  'D:/Tavola/postman/_staff_classified.json',
  JSON.stringify(
    {
      staff: byScope.staff,
      customerOnly: byScope['customer-only'],
      platformAdmin: byScope['platform-admin'],
      other: byScope.other,
      staffRoles,
      counts: {
        staff: byScope.staff.length,
        customerOnly: byScope['customer-only'].length,
        platformAdmin: byScope['platform-admin'].length,
        other: byScope.other.length,
      },
    },
    null,
    2,
  ),
);

console.log(
  JSON.stringify(
    {
      counts: {
        staff: byScope.staff.length,
        customerOnly: byScope['customer-only'].length,
        platformAdmin: byScope['platform-admin'].length,
        other: byScope.other.length,
      },
      staffByDomain: Object.fromEntries(
        domains.map((d) => [
          d,
          byScope.staff.filter((r) => r.domain === d).length,
        ]),
      ),
      extra: extraStaff.map((r) => `${r.domain}: ${r.method} ${r.path}`),
      staffRoles,
    },
    null,
    2,
  ),
);
