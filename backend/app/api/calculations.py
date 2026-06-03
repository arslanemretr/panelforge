from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import db_session, require_active_user, require_operator
from app.schemas.calculation import CalculationResponse, CalculationResults, ValidationResult
from app.services.calculation_service import calculate_project, get_results
from app.services.validation_service import validate_project

router = APIRouter(tags=["calculations"], dependencies=[Depends(require_active_user)])


@router.post("/projects/{project_id}/validate", response_model=ValidationResult, dependencies=[Depends(require_operator)])
def validate(project_id: int, db: Session = Depends(db_session)) -> ValidationResult:
    return validate_project(db, project_id)


@router.post("/projects/{project_id}/calculate", response_model=CalculationResponse, dependencies=[Depends(require_operator)])
def calculate(project_id: int, db: Session = Depends(db_session)) -> CalculationResponse:
    return calculate_project(db, project_id)


@router.get("/projects/{project_id}/results", response_model=CalculationResults)
def results(project_id: int, db: Session = Depends(db_session)) -> CalculationResults:
    return get_results(db, project_id)
