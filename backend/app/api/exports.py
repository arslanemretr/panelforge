from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.dependencies import db_session
from app.services.export_service import build_csv, build_dxf, build_excel, build_pdf

router = APIRouter(tags=["exports"])


@router.get("/projects/{project_id}/export/csv")
def export_csv(project_id: int, db: Session = Depends(db_session)) -> Response:
    return Response(
        content=build_csv(db, project_id),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="project-{project_id}-busbars.csv"'},
    )


@router.get("/projects/{project_id}/export/excel")
def export_excel(project_id: int, db: Session = Depends(db_session)) -> Response:
    return Response(
        content=build_excel(db, project_id),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="project-{project_id}.xlsx"'},
    )


@router.get("/projects/{project_id}/export/pdf")
def export_pdf(project_id: int, db: Session = Depends(db_session)) -> Response:
    return Response(
        content=build_pdf(db, project_id),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="project-{project_id}.pdf"'},
    )


@router.get("/projects/{project_id}/export/dxf")
def export_dxf(project_id: int, db: Session = Depends(db_session)) -> Response:
    return Response(
        content=build_dxf(db, project_id),
        media_type="application/dxf",
        headers={"Content-Disposition": f'attachment; filename="project-{project_id}.dxf"'},
    )
