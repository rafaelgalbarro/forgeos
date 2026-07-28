export const PRINT_STYLES = `
  @page {
    margin: 18mm 16mm;
    size: A4;
  }

  * {
    box-sizing: border-box;
  }

  html, body {
    margin: 0;
    padding: 0;
    background: #f8f9fb;
    color: #111827;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 11pt;
    line-height: 1.55;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-doc {
    max-width: 210mm;
    margin: 0 auto;
    background: #ffffff;
  }

  .cover {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 48px 56px;
    page-break-after: always;
    background: linear-gradient(160deg, #f0fdf4 0%, #ffffff 45%, #f8fafc 100%);
    border-bottom: 4px solid #84cc16;
  }

  .cover-brand {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #65a30d;
    margin-bottom: 32px;
  }

  .cover h1 {
    font-size: 32pt;
    line-height: 1.15;
    margin: 0 0 16px;
    color: #0f172a;
  }

  .cover-meta {
    font-family: system-ui, sans-serif;
    font-size: 10pt;
    color: #64748b;
    margin-top: 24px;
  }

  .cover-meta p {
    margin: 4px 0;
  }

  .cover-score {
    margin-top: 32px;
    padding: 16px 20px;
    border-left: 4px solid #84cc16;
    background: rgba(132, 204, 22, 0.08);
    font-family: system-ui, sans-serif;
  }

  .cover-score strong {
    display: block;
    font-size: 22pt;
    color: #0f172a;
  }

  .toc {
    padding: 40px 56px;
    page-break-after: always;
  }

  .toc h2 {
    font-family: system-ui, sans-serif;
    font-size: 14pt;
    margin: 0 0 20px;
    color: #0f172a;
  }

  .toc ol {
    margin: 0;
    padding-left: 24px;
    font-family: system-ui, sans-serif;
    font-size: 11pt;
  }

  .toc li {
    margin-bottom: 8px;
  }

  .toc a {
    color: #334155;
    text-decoration: none;
  }

  .section {
    padding: 32px 56px;
    page-break-inside: avoid;
  }

  .section + .section {
    border-top: 1px solid #e2e8f0;
  }

  .section-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 16px;
  }

  .section-num {
    font-family: system-ui, sans-serif;
    font-size: 10pt;
    font-weight: 700;
    color: #84cc16;
    min-width: 28px;
  }

  .section h2 {
    font-family: system-ui, sans-serif;
    font-size: 14pt;
    margin: 0;
    color: #0f172a;
  }

  .section-body {
    white-space: pre-wrap;
    color: #334155;
  }

  .pending {
    color: #94a3b8;
    font-style: italic;
  }

  .footer {
    padding: 24px 56px 40px;
    font-family: system-ui, sans-serif;
    font-size: 9pt;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
    page-break-before: always;
  }

  .no-print {
    display: block;
  }

  @media print {
    html, body {
      background: #ffffff;
    }

    .print-doc {
      max-width: none;
      box-shadow: none;
    }

    .no-print {
      display: none !important;
    }

    .cover {
      min-height: auto;
      padding-top: 80px;
      padding-bottom: 80px;
    }

    a {
      color: inherit;
      text-decoration: none;
    }
  }
`;
