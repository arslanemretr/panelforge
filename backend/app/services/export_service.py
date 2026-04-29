from __future__ import annotations

from io import BytesIO, StringIO

import ezdxf
from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app.services.calculation_service import get_results


def build_csv(db: Session, project_id: int) -> bytes:
    results = get_results(db, project_id)
    buffer = StringIO()
    buffer.write("part_no,type,phase,cut_length_mm,hole_count,bend_count\n")
    for busbar in results.busbars:
        buffer.write(
            f"{busbar.part_no},{busbar.busbar_type},{busbar.phase},{busbar.cut_length_mm},{len(busbar.holes)},{len(busbar.bends)}\n"
        )
    return buffer.getvalue().encode("utf-8")


def build_excel(db: Session, project_id: int) -> bytes:
    results = get_results(db, project_id)
    workbook = Workbook()
    summary_sheet = workbook.active
    summary_sheet.title = "Ozet"
    summary_sheet.append(["Metrik", "Deger"])
    summary_sheet.append(["Ana Bakir", results.summary.main_busbar_count])
    summary_sheet.append(["Tali Bakir", results.summary.branch_busbar_count])
    summary_sheet.append(["Toplam Kesim Boyu", float(results.summary.total_cut_length_mm)])
    summary_sheet.append(["Toplam Delik", results.summary.total_hole_count])
    summary_sheet.append(["Toplam Bukum", results.summary.total_bend_count])

    busbar_sheet = workbook.create_sheet("Bakirlar")
    busbar_sheet.append(["Parca No", "Tip", "Faz", "Cihaz", "Olcu", "Kesim Boyu"])
    for busbar in results.busbars:
        busbar_sheet.append(
            [
                busbar.part_no,
                busbar.busbar_type,
                busbar.phase,
                busbar.connected_device_label,
                f"{busbar.width_mm}x{busbar.thickness_mm}",
                float(busbar.cut_length_mm),
            ]
        )

    output = BytesIO()
    workbook.save(output)
    return output.getvalue()


def build_pdf(db: Session, project_id: int) -> bytes:
    results = get_results(db, project_id)
    output = BytesIO()
    pdf = canvas.Canvas(output, pagesize=A4)
    width, height = A4
    y = height - 40

    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(40, y, f"PanelForge - Proje {project_id}")
    y -= 30
    pdf.setFont("Helvetica", 11)
    pdf.drawString(40, y, f"Ana bakir sayisi: {results.summary.main_busbar_count}")
    y -= 18
    pdf.drawString(40, y, f"Tali bakir sayisi: {results.summary.branch_busbar_count}")
    y -= 18
    pdf.drawString(40, y, f"Toplam kesim boyu: {results.summary.total_cut_length_mm} mm")
    y -= 28

    for busbar in results.busbars:
        pdf.drawString(
            40,
            y,
            f"{busbar.part_no} | {busbar.busbar_type} | {busbar.phase} | {busbar.cut_length_mm} mm",
        )
        y -= 18
        if y < 60:
            pdf.showPage()
            y = height - 40

    pdf.save()
    return output.getvalue()


def build_dxf(db: Session, project_id: int) -> bytes:
    results = get_results(db, project_id)
    document = ezdxf.new("R2010")
    modelspace = document.modelspace()

    for busbar in results.busbars:
        for segment in busbar.segments:
            layer = "BUSBAR_MAIN" if busbar.busbar_type == "main" else "BUSBAR_BRANCH"
            modelspace.add_line(
                (float(segment.start_x_mm), float(segment.start_y_mm)),
                (float(segment.end_x_mm), float(segment.end_y_mm)),
                dxfattribs={"layer": layer},
            )

    output = StringIO()
    document.write(output)
    return output.getvalue().encode("utf-8")
