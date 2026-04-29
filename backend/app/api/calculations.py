from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import db_session
from app.schemas.calculation import CalculationResponse, CalculationResults, ValidationResult
from app.services.calculation_service import calculate_project, get_results
from app.services.validation_service import validate_project

router = APIRouter(tags=["calculations"])


@router.post("/projects/{project_id}/validate", response_model=ValidationResult)
def validate(project_id: int, db: Session = Depends(db_session)) -> ValidationResult:
    return validate_project(db, project_id)


@router.post("/projects/{project_id}/calculate", response_model=CalculationResponse)
def calculate(project_id: int, db: Session = Depends(db_session)) -> CalculationResponse:
    return calculate_project(db, project_id)


@router.get("/projects/{project_id}/results", response_model=CalculationResults)
def results(project_id: int, db: Session = Depends(db_session)) -> CalculationResults:
    return get_results(db, project_id)
