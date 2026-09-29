/**
 * E-Paayos Official Documentation Report & Export Utility
 * Generates official, corporate-grade printable reports (Save as PDF / Print) and CSV exports.
 */

function escapeHtml(str) {
  if (str === null || str === undefined) return '—'
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatCurrency(amount) {
  const n = Number(amount || 0)
  try {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 2,
    }).format(n)
  } catch {
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
  }
}

/**
 * Open official documentation print/PDF window
 */
export function printOfficialDocument({
  systemName = 'E-PAAYOS REPAIR & SERVICES SYSTEM',
  systemTagline = 'Automotive & Electronics Service Management Platform',
  docTitle = 'OPERATIONS & PERFORMANCE AUDIT REPORT',
  docSubtitle = 'Official Management & Analytics Documentation',
  docCode = `DOC-${Date.now().toString(36).toUpperCase()}`,
  periodLabel = 'All Time',
  entity = {
    name: 'E-Paayos Administration',
    role: 'System Administrator',
    contact: '',
    address: '',
    extra: '',
  },
  kpis = [],
  sections = [],
  ledger = {
    title: 'Master Service & Transaction Ledger',
    subtitle: 'Itemized breakdown of all matching service requests and transactions',
    headers: [],
    rows: [],
    totals: null,
  },
  signOff = {
    preparedBy: 'Administrator',
    preparedRole: 'Operations In-Charge',
    verifiedBy: 'System Auditor / Manager',
    verifiedRole: 'Authorized Signatory',
    notes: 'This document is an official system-generated record from E-Paayos. All records, timestamps, and financial figures are certified true and accurate as of generation date.',
  },
}) {
  const now = new Date()
  const generatedDateStr = now.toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const generatedTimeStr = now.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  // Render KPI cards HTML
  const kpisHtml = kpis.length
    ? `
    <div class="kpi-grid">
      ${kpis
        .map(
          (k) => `
        <div class="kpi-box">
          <div class="kpi-label">${escapeHtml(k.label)}</div>
          <div class="kpi-value">${escapeHtml(k.value)}</div>
          ${k.helper ? `<div class="kpi-helper">${escapeHtml(k.helper)}</div>` : ''}
        </div>
      `
        )
        .join('')}
    </div>
  `
    : ''

  // Render Summary Sections (Tables like Top Services, Staff Performance, Status distribution)
  const sectionsHtml = sections
    .map((sec) => {
      const tableHeaders = (sec.headers || []).map((h) => `<th>${escapeHtml(h)}</th>`).join('')
      const tableRows = (sec.rows || [])
        .map(
          (row) => `
        <tr>
          ${row.map((cell, idx) => `<td class="${sec.aligns?.[idx] || ''}">${escapeHtml(cell)}</td>`).join('')}
        </tr>
      `
        )
        .join('')

      return `
      <div class="doc-section no-break">
        <div class="section-header">
          <h3 class="section-title">${escapeHtml(sec.title)}</h3>
          ${sec.subtitle ? `<p class="section-subtitle">${escapeHtml(sec.subtitle)}</p>` : ''}
        </div>
        <div class="table-container">
          <table class="report-table">
            <thead>
              <tr>${tableHeaders}</tr>
            </thead>
            <tbody>
              ${tableRows || '<tr><td colspan="100%" class="text-center text-muted">No records available</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `
    })
    .join('')

  // Render Master Ledger Table
  const ledgerHeadersHtml = (ledger.headers || []).map((h) => `<th>${escapeHtml(h)}</th>`).join('')
  const ledgerRowsHtml = (ledger.rows || [])
    .map(
      (row, rIdx) => `
      <tr>
        ${row
          .map((cell, cIdx) => {
            const isStatus = ledger.statusColIdx === cIdx
            const isAmount = ledger.amountColIdxs?.includes(cIdx)
            const alignClass = isAmount ? 'text-right' : ledger.aligns?.[cIdx] || ''
            if (isStatus) {
              const statusStr = String(cell || '').toLowerCase()
              let badgeClass = 'badge-default'
              if (statusStr.includes('completed') || statusStr.includes('fixed') || statusStr.includes('paid')) badgeClass = 'badge-success'
              else if (statusStr.includes('working') || statusStr.includes('confirmed')) badgeClass = 'badge-primary'
              else if (statusStr.includes('pending') || statusStr.includes('unpaid')) badgeClass = 'badge-warning'
              else if (statusStr.includes('cancel') || statusStr.includes('reject')) badgeClass = 'badge-danger'
              return `<td class="${alignClass}"><span class="badge ${badgeClass}">${escapeHtml(cell)}</span></td>`
            }
            return `<td class="${alignClass}">${escapeHtml(cell)}</td>`
          })
          .join('')}
      </tr>
    `
    )
    .join('')

  const ledgerTotalsHtml = ledger.totals
    ? `
    <tfoot class="table-footer">
      <tr>
        ${ledger.totals.map((t, idx) => `<td class="${ledger.aligns?.[idx] || (idx === 0 ? 'font-bold' : '')}">${escapeHtml(t)}</td>`).join('')}
      </tr>
    </tfoot>
  `
    : ''

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(docTitle)} - ${escapeHtml(docCode)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background-color: #ffffff;
      font-size: 11px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .report-wrapper {
      max-width: 1000px;
      margin: 0 auto;
      padding: 16px 20px;
      background: #ffffff;
    }
    
    /* Top Official Letterhead */
    .letterhead {
      border-bottom: 2.5px solid #081F5C;
      padding-bottom: 12px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .brand-title {
      font-size: 16px;
      font-weight: 900;
      color: #081F5C;
      letter-spacing: 0.5px;
      margin: 0;
      text-transform: uppercase;
    }
    .brand-subtitle {
      font-size: 10px;
      color: #475569;
      margin: 2px 0 0 0;
      font-weight: 500;
    }
    .doc-badge-block {
      text-align: right;
    }
    .doc-code-pill {
      display: inline-block;
      background: #081F5C;
      color: #ffffff;
      font-size: 9px;
      font-weight: 800;
      padding: 3px 8px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .doc-date {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 3px;
    }

    /* Document Title Banner */
    .title-banner {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #081F5C;
      padding: 10px 14px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .report-heading {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .report-subheading {
      font-size: 10px;
      color: #64748b;
      margin: 2px 0 0 0;
    }
    .meta-item {
      font-size: 10px;
      color: #334155;
    }
    .meta-item strong {
      color: #081F5C;
    }

    /* Entity / Context Meta Grid */
    .entity-box {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      margin-bottom: 14px;
      font-size: 10px;
    }
    .entity-col p {
      margin: 2px 0;
      color: #334155;
    }
    .entity-col strong {
      color: #0f172a;
      font-weight: 700;
    }

    /* Executive KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .kpi-box {
      border: 1px solid #081F5C;
      background: #f8fafc;
      padding: 8px 10px;
      text-align: left;
    }
    .kpi-label {
      font-size: 9px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .kpi-value {
      font-size: 15px;
      font-weight: 900;
      color: #081F5C;
      margin-top: 3px;
    }
    .kpi-helper {
      font-size: 8.5px;
      color: #64748b;
      margin-top: 2px;
    }

    /* Section & Tables */
    .doc-section {
      margin-bottom: 14px;
    }
    .section-header {
      margin-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      color: #081F5C;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .section-subtitle {
      font-size: 9px;
      color: #64748b;
      margin: 1px 0 0 0;
    }
    .table-container {
      width: 100%;
      overflow-x: auto;
    }
    .report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
    }
    .report-table th {
      background-color: #081F5C;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 5px 6px;
      border: 1px solid #081F5C;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .report-table td {
      padding: 5px 6px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
      vertical-align: middle;
    }
    .report-table tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .report-table tfoot td {
      background-color: #f1f5f9;
      font-weight: 800;
      color: #081F5C;
      border-top: 2px solid #081F5C;
      padding: 6px;
    }

    /* Alignment & Badges */
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .text-muted { color: #64748b; }

    .badge {
      display: inline-block;
      padding: 1.5px 5px;
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      border: 1px solid transparent;
    }
    .badge-success { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
    .badge-primary { background: #dbeafe; color: #1e40af; border-color: #bfdbfe; }
    .badge-warning { background: #fef3c7; color: #92400e; border-color: #fde68a; }
    .badge-danger  { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
    .badge-default { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }

    /* Sign-off & Certification Block */
    .signoff-block {
      margin-top: 22px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 14px;
    }
    .certification-text {
      font-size: 8.5px;
      color: #64748b;
      font-style: italic;
      margin-bottom: 16px;
      line-height: 1.4;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 30px;
    }
    .sig-box {
      border-top: 1px solid #334155;
      padding-top: 4px;
      width: 80%;
    }
    .sig-name {
      font-size: 10px;
      font-weight: 800;
      color: #0f172a;
    }
    .sig-role {
      font-size: 9px;
      color: #64748b;
    }
    .sig-date {
      font-size: 8.5px;
      color: #94a3b8;
      margin-top: 2px;
    }

    /* Print Controls Bar for interactive preview */
    .print-bar {
      background: #081F5C;
      color: #ffffff;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      border-radius: 4px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }
    .print-btn {
      background: #ffffff;
      color: #081F5C;
      border: none;
      font-weight: 800;
      font-size: 11px;
      padding: 6px 14px;
      cursor: pointer;
      border-radius: 2px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .print-btn:hover {
      background: #f1f5f9;
    }

    /* Page-break helpers */
    .no-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .page-break {
      page-break-before: always;
      break-before: page;
    }

    @media print {
      .print-bar {
        display: none !important;
      }
      .report-wrapper {
        padding: 0;
        max-width: 100%;
      }
      body {
        font-size: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="report-wrapper">
    <!-- Top Interactive Print / Save as PDF Bar -->
    <div class="print-bar">
      <div>
        <strong style="font-size: 12px;">E-Paayos Official Report Generator</strong>
        <span style="font-size: 10px; opacity: 0.85; margin-left: 8px;">(Ready to Print or Save as PDF)</span>
      </div>
      <button class="print-btn" onclick="window.print()">
        🖨️ Print / Save as PDF
      </button>
    </div>

    <!-- Official Letterhead -->
    <div class="letterhead">
      <div>
        <h1 class="brand-title">${escapeHtml(systemName)}</h1>
        <p class="brand-subtitle">${escapeHtml(systemTagline)}</p>
      </div>
      <div class="doc-badge-block">
        <div class="doc-code-pill">${escapeHtml(docCode)}</div>
        <div class="doc-date">Generated: ${escapeHtml(generatedDateStr)} at ${escapeHtml(generatedTimeStr)}</div>
      </div>
    </div>

    <!-- Title & Scope Banner -->
    <div class="title-banner">
      <div>
        <h2 class="report-heading">${escapeHtml(docTitle)}</h2>
        <p class="report-subheading">${escapeHtml(docSubtitle)}</p>
      </div>
      <div class="meta-item">
        <strong>Reporting Scope:</strong> ${escapeHtml(periodLabel)}
      </div>
    </div>

    <!-- Entity & Scope Details -->
    <div class="entity-box">
      <div class="entity-col">
        <p><strong>Prepared For:</strong> ${escapeHtml(entity.name || 'E-Paayos Partner')}</p>
        <p><strong>Designation / Role:</strong> ${escapeHtml(entity.role || 'Service Management')}</p>
        ${entity.contact ? `<p><strong>Contact / Phone:</strong> ${escapeHtml(entity.contact)}</p>` : ''}
      </div>
      <div class="entity-col">
        ${entity.address ? `<p><strong>Location / Address:</strong> ${escapeHtml(entity.address)}</p>` : ''}
        <p><strong>Report Document ID:</strong> ${escapeHtml(docCode)}</p>
        <p><strong>Status Scope:</strong> ${escapeHtml(entity.extra || 'Complete System Transactions & Operations')}</p>
      </div>
    </div>

    <!-- KPI Executive Summary -->
    ${kpisHtml}

    <!-- Analytic / Performance Sub-Sections -->
    ${sectionsHtml}

    <!-- Master Transaction Ledger -->
    <div class="doc-section">
      <div class="section-header">
        <h3 class="section-title">${escapeHtml(ledger.title || 'Master Service & Transaction Ledger')}</h3>
        <p class="section-subtitle">${escapeHtml(ledger.subtitle || 'All matching records under the selected period')}</p>
      </div>
      <div class="table-container">
        <table class="report-table">
          <thead>
            <tr>${ledgerHeadersHtml}</tr>
          </thead>
          <tbody>
            ${ledgerRowsHtml || '<tr><td colspan="100%" class="text-center text-muted" style="padding: 12px;">No transactions found for the selected period.</td></tr>'}
          </tbody>
          ${ledgerTotalsHtml}
        </table>
      </div>
    </div>

    <!-- Official Sign-off & Certification Footer -->
    <div class="signoff-block no-break">
      <p class="certification-text">
        ${escapeHtml(signOff.notes || '')}
      </p>
      <div class="signatures-grid">
        <div>
          <div class="sig-box">
            <div class="sig-name">${escapeHtml(signOff.preparedBy || 'Operations Lead')}</div>
            <div class="sig-role">${escapeHtml(signOff.preparedRole || 'Prepared By')}</div>
            <div class="sig-date">Date Signed: ${escapeHtml(generatedDateStr)}</div>
          </div>
        </div>
        <div>
          <div class="sig-box">
            <div class="sig-name">${escapeHtml(signOff.verifiedBy || 'Authorized Manager')}</div>
            <div class="sig-role">${escapeHtml(signOff.verifiedRole || 'Verified & Certified Correct')}</div>
            <div class="sig-date">Date Signed: ${escapeHtml(generatedDateStr)}</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      // Small timeout to ensure font and styles render before print dialog
      setTimeout(function() {
        window.focus();
        window.print();
      }, 350);
    };
  </script>
</body>
</html>
`

  const printWindow = window.open('', '_blank', 'width=950,height=1000')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  } else {
    // Popup was blocked: fallback to hidden iframe
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow.document
    doc.open()
    doc.write(html)
    doc.close()
    setTimeout(() => {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      setTimeout(() => document.body.removeChild(iframe), 2000)
    }, 400)
  }
}

/**
 * Universal CSV Exporter
 */
export function exportReportToCSV({ filename = 'E-Paayos_Report.csv', headers = [], rows = [] }) {
  if (!rows || rows.length === 0) {
    return false
  }

  const csvRows = [
    headers.map((h) => `"${String(h || '').replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          if (cell === null || cell === undefined) return '""'
          if (typeof cell === 'number') return cell
          return `"${String(cell).replace(/"/g, '""')}"`
        })
        .join(',')
    ),
  ]

  const csvContent = '\uFEFF' + csvRows.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  return true
}
