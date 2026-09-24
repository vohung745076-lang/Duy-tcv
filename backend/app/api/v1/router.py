from fastapi import APIRouter
from app.api.v1.endpoints import jobs, candidates, evaluations, overrides, analytics, monthly_reports

api_router = APIRouter()

api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
api_router.include_router(candidates.router, prefix="/candidates", tags=["Candidates"])
api_router.include_router(evaluations.router, prefix="/evaluations", tags=["Evaluations"])
api_router.include_router(overrides.router, prefix="/overrides", tags=["Overrides"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(monthly_reports.router, prefix="/monthly", tags=["Monthly Reports & Approval"])
