"""PDF (reportlab) and CSV report generation for fleet profit and loads."""

import csv
import io
from datetime import date


def _money(v) -> str:
    try:
        return f"Rs. {float(v):,.0f}"
    except (TypeError, ValueError):
        return "-"


# ---------------------------------------------------------------- CSV --------


def vehicle_profit_csv(rows: list[dict]) -> bytes:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Vehicle", "Body", "Status", "Trips", "Total Rent", "Total Spend", "Total Profit", "Avg Profit"])
    for r in rows:
        w.writerow(
            [
                r.get("registration_number", ""),
                r.get("body_type", ""),
                r.get("status", ""),
                r.get("trips_count", 0),
                r.get("total_rent", 0),
                r.get("total_spend", 0),
                r.get("total_profit", 0),
                r.get("avg_profit", 0),
            ]
        )
    return buf.getvalue().encode("utf-8")


def loads_csv(loads: list[dict]) -> bytes:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Vehicle", "Route", "Status", "Start", "End", "Rent", "Spend", "Profit"])
    for l in loads:
        t = l.get("totals", {})
        w.writerow(
            [
                l.get("vehicle_registration", ""),
                l.get("route", ""),
                l.get("status", ""),
                l.get("start_date", ""),
                l.get("end_date", ""),
                t.get("total_rent", 0),
                t.get("spend", 0),
                t.get("profit", 0),
            ]
        )
    return buf.getvalue().encode("utf-8")


# ---------------------------------------------------------------- PDF --------


def fleet_report_pdf(owner: dict, kpis: dict, vehicle_profit: list[dict]) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=18 * mm
    )
    styles = getSampleStyleSheet()
    brand = colors.HexColor("#1d4ed8")
    title = styles["Title"]
    title.textColor = brand
    h2 = styles["Heading2"]
    h2.textColor = colors.HexColor("#0f172a")
    body = styles["BodyText"]

    elems = [
        Paragraph("Fleet Owner — Profit Report", title),
        Paragraph(
            f"Owner: {owner.get('name') or owner.get('mobile') or owner.get('email') or '—'} "
            f"&nbsp;&nbsp; Generated: {date.today().isoformat()}",
            body,
        ),
        Spacer(1, 8 * mm),
        Paragraph("This Month", h2),
    ]

    kpi_data = [
        ["Trips", "Rent", "Spend", "Profit", "All-time Profit"],
        [
            str(kpis.get("trips_this_month", 0)),
            _money(kpis.get("rent_this_month")),
            _money(kpis.get("spend_this_month")),
            _money(kpis.get("profit_this_month")),
            _money(kpis.get("profit_all_time")),
        ],
    ]
    kpi_table = Table(kpi_data, colWidths=[34 * mm] * 5)
    kpi_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), brand),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f1f5f9")]),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ]
        )
    )
    elems += [kpi_table, Spacer(1, 8 * mm), Paragraph(f"Profit by Vehicle ({len(vehicle_profit)})", h2)]

    pv_data = [["Vehicle", "Body", "Trips", "Rent", "Spend", "Profit"]]
    for v in vehicle_profit:
        pv_data.append(
            [
                v.get("registration_number", ""),
                (v.get("body_type") or "-"),
                str(v.get("trips_count", 0)),
                _money(v.get("total_rent")),
                _money(v.get("total_spend")),
                _money(v.get("total_profit")),
            ]
        )
    pv_table = Table(pv_data, colWidths=[34 * mm, 26 * mm, 18 * mm, 32 * mm, 32 * mm, 32 * mm])
    pv_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), brand),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("ALIGN", (2, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elems.append(pv_table)

    doc.build(elems)
    return buf.getvalue()
