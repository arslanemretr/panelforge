from __future__ import annotations

from sqlalchemy.orm import Session, selectinload

from app.db import models
from app.schemas.calculation import ValidationResult


def validate_project(db: Session, project_id: int) -> ValidationResult:
    project = db.get(models.Project, project_id)
    if not project:
        return ValidationResult(can_calculate=False, missing_fields=["Proje bulunamadi"])

    missing_fields: list[str] = []
    warnings: list[str] = []

    panel = (
        db.query(models.Panel)
        .filter(models.Panel.project_id == project_id)
        .one_or_none()
    )
    copper = (
        db.query(models.CopperSettings)
        .filter(models.CopperSettings.project_id == project_id)
        .one_or_none()
    )
    placements = (
        db.query(models.ProjectDevice)
        .options(
            selectinload(models.ProjectDevice.device).selectinload(models.Device.terminals),
        )
        .filter(models.ProjectDevice.project_id == project_id)
        .all()
    )
    project_panels = (
        db.query(models.ProjectPanel)
        .filter(models.ProjectPanel.project_id == project_id)
        .order_by(models.ProjectPanel.seq.asc(), models.ProjectPanel.id.asc())
        .all()
    )

    if not panel:
        missing_fields.append("Pano olculeri girilmedi")
    else:
        if not panel.mounting_plate_width_mm or not panel.mounting_plate_height_mm:
            missing_fields.append("Montaj alani tanimlanmadi")
        if not panel.phase_system:
            missing_fields.append("Faz siralamasi tanimlanmadi")

    if not placements:
        missing_fields.append("Cihazlar yerlestirilmedi")
    else:
        for placement in placements:
            if not placement.device.terminals:
                missing_fields.append(f"Terminal olculeri yok: {placement.label}")
            if len(project_panels) > 1 and placement.project_panel_id is None:
                warnings.append(f"Kabin secimi eksik: {placement.label} ilk kabin referansi ile hesaplanacak")

    if not copper:
        missing_fields.append("Bakir ayarlari girilmedi")
    else:
        if not copper.main_width_mm or not copper.main_thickness_mm:
            missing_fields.append("Ana bakir olcusu eksik")
        if not copper.branch_width_mm or not copper.branch_thickness_mm:
            missing_fields.append("Tali bakir olcusu eksik")
        if not copper.bend_inner_radius_mm:
            missing_fields.append("Bukum yaricapi eksik")
        if not copper.default_hole_diameter_mm:
            missing_fields.append("Delik capi eksik")
        # Bilgi amaçlı uyarılar — hesaplamayı engellemez
        if not copper.busbar_length_mm:
            warnings.append("Ana bara boyu tanimlanmadi — varsayilan 1000 mm kullanilacak")
        if not copper.busbar_clearance_mm:
            warnings.append("Ana bara bogaz mesafesi tanimlanmadi — bogaz kontrolu atlanacak")
        if not copper.min_hole_hole_distance_mm:
            warnings.append("Min. delik-delik mesafesi tanimlanmadi — delik araligi kontrolu atlanacak")

    return ValidationResult(
        can_calculate=not missing_fields,
        missing_fields=sorted(set(missing_fields)),
        warnings=warnings,
    )
