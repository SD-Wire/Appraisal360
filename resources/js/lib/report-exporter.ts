// resources/js/lib/report-exporter.ts
import * as XLSX from "xlsx";

export interface ReportMeta {
    title: string;
    subtitle?: string;
    date?: string;
    cycleName?: string;
    filterInfo?: string;
    staffName?: string;
    staffTitle?: string;
    staffEmployeeNo?: string;
    department?: string;
    branch?: string;
    orientation?: "landscape" | "portrait";
}

export interface ReportColumn {
    header: string;
    key: string;
    width?: number; // approx chars for Excel / px for PDF
    align?: "left" | "center" | "right";
}

/**
 * Clean, letterhead-formatted PDF Export / Print Utility.
 * Opens an isolated print window with Progressive Credit branding, headers, metadata, and clean table layout.
 */
export function exportReportToPdf(
    meta: ReportMeta,
    tableHtml: string,
    customStyles: string = ""
) {
    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) {
        alert("Please allow popups to export the PDF report.");
        return;
    }

    const orientation = meta.orientation || "landscape";
    const dateStr = meta.date || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${meta.title} - Progressive Credit</title>
    <style>
        @page {
            size: A4 ${orientation};
            margin: 10mm 12mm 12mm 12mm;
        }
        @media print {
            body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .no-print {
                display: none !important;
            }
            table {
                page-break-inside: auto;
            }
            tr {
                page-break-inside: avoid;
                page-break-after: auto;
            }
            thead {
                display: table-header-group;
            }
            tfoot {
                display: table-footer-group;
            }
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        body {
            color: #111827;
            background-color: #FFFFFF;
            padding: 15px 20px;
            font-size: 11px;
            line-height: 1.3;
        }
        .header-container {
            border-bottom: 3px solid #EA580C;
            padding-bottom: 10px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .company-title {
            font-size: 18px;
            font-weight: 800;
            color: #EA580C;
            letter-spacing: -0.5px;
            text-transform: uppercase;
        }
        .report-title {
            font-size: 13px;
            font-weight: 700;
            color: #15803D;
            margin-top: 2px;
        }
        .report-subtitle {
            font-size: 11px;
            color: #4B5563;
            margin-top: 1px;
        }
        .meta-box {
            text-align: right;
            font-size: 10px;
            color: #4B5563;
        }
        .meta-box strong {
            color: #111827;
        }
        .badge-pill {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: 700;
            color: #FFFFFF;
        }
        .bg-green { background-color: #15803D !important; }
        .bg-orange { background-color: #EA580C !important; }
        .bg-navy { background-color: #1E3A5F !important; }
        .bg-amber { background-color: #D97706 !important; }
        .bg-red { background-color: #DC2626 !important; }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            margin-bottom: 12px;
            font-size: 10.5px;
        }
        th, td {
            border: 1px solid #D1D5DB;
            padding: 5px 7px;
            vertical-align: middle;
        }
        th {
            background-color: #F0FDF4 !important;
            font-weight: 700;
            color: #15803D;
            text-align: left;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .font-bold { font-weight: 700; }
        .font-semibold { font-weight: 600; }
        .bg-gray-50 { background-color: #F9FAFB !important; }
        .bg-gray-100 { background-color: #F3F4F6 !important; }
        .bg-green-light { background-color: #F0FDF4 !important; }
        .bg-orange-light { background-color: #FFF7ED !important; }

        .footer {
            margin-top: 20px;
            padding-top: 8px;
            border-top: 2px solid #15803D;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #6B7280;
        }
        ${customStyles}
    </style>
</head>
<body>
    <div class="header-container">
        <div style="display: flex; align-items: center; gap: 14px;">
            <img src="/images/logo.png" alt="Progressive Credit" style="height: 48px; width: auto; object-fit: contain;" />
            <div>
                <div class="company-title">Progressive Credit Limited</div>
                <div class="report-title">${meta.title}</div>
                ${meta.subtitle ? `<div class="report-subtitle">${meta.subtitle}</div>` : ""}
                ${meta.filterInfo ? `<div style="font-size: 10px; color: #15803D; font-weight: 600; margin-top: 2px;">Filter: <strong>${meta.filterInfo}</strong></div>` : ""}
            </div>
        </div>
        <div class="meta-box">
            <div>Date Generated: <strong>${dateStr}</strong></div>
            ${meta.cycleName ? `<div>Cycle: <strong style="color: #15803D;">${meta.cycleName}</strong></div>` : ""}
            ${meta.staffName ? `<div>Staff Name: <strong style="color: #EA580C;">${meta.staffName}</strong> ${meta.staffEmployeeNo ? `(${meta.staffEmployeeNo})` : ""}</div>` : ""}
            ${meta.staffTitle ? `<div>Role: <strong>${meta.staffTitle}</strong></div>` : ""}
            ${meta.department || meta.branch ? `<div>Unit: <strong>${[meta.department, meta.branch].filter(Boolean).join(" / ")}</strong></div>` : ""}
        </div>
    </div>

    <div class="content-body">
        ${tableHtml}
    </div>

    <div class="footer">
        <div style="color: #EA580C; font-weight: 700;">Appraise360 Performance Management System • Progressive Credit Limited</div>
        <div style="color: #15803D; font-weight: 600;">Confidential Internal Performance Report • Page 1</div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 300);
        };
    </script>
</body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
}

/**
 * Excel (.xlsx) Export Utility using SheetJS with metadata, headers, column widths.
 */
export function exportReportToExcel(
    meta: ReportMeta,
    headers: string[],
    rows: (string | number | null | undefined)[][],
    fileName: string
) {
    const wb = XLSX.utils.book_new();

    const dateStr = meta.date || new Date().toLocaleDateString("en-GB");

    // Title & Header metadata rows
    const sheetData: any[][] = [
        ["PROGRESSIVE CREDIT LIMITED"],
        [meta.title.toUpperCase()],
        meta.subtitle ? [meta.subtitle] : [],
        [
            `Date: ${dateStr}`,
            meta.cycleName ? `Cycle: ${meta.cycleName}` : "",
            meta.filterInfo ? `Filter: ${meta.filterInfo}` : "",
        ].filter(Boolean),
        meta.staffName
            ? [
                  `Staff: ${meta.staffName}`,
                  meta.staffEmployeeNo ? `Emp No: ${meta.staffEmployeeNo}` : "",
                  meta.staffTitle ? `Role: ${meta.staffTitle}` : "",
                  meta.department ? `Dept: ${meta.department}` : "",
                  meta.branch ? `Branch: ${meta.branch}` : "",
              ].filter(Boolean)
            : [],
        [], // empty spacer row
        headers, // Table header row
        ...rows, // Data rows
    ].filter((r) => r.length > 0);

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Auto-fit column widths based on header and data length
    const colWidths = headers.map((h, i) => {
        let maxLen = h.length;
        rows.forEach((row) => {
            const cellVal = row[i] !== null && row[i] !== undefined ? String(row[i]) : "";
            if (cellVal.length > maxLen) {
                maxLen = Math.min(cellVal.length, 50);
            }
        });
        return { wch: Math.max(maxLen + 3, 12) };
    });

    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Report");

    const cleanFileName = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
    XLSX.writeFile(wb, cleanFileName);
}
