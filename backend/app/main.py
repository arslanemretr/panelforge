from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.calculations import router as calculations_router
from app.api.copper_definitions import router as copper_definitions_router
from app.api.copper_settings import router as copper_router
from app.api.device_connections import router as device_connections_router
from app.api.devices import router as devices_router
from app.api.exports import router as exports_router
from app.api.panel_definitions import router as panel_definitions_router
from app.api.panels import router as panels_router
from app.api.project_coppers import router as project_coppers_router
from app.api.project_devices import router as project_devices_router
from app.api.project_panels import router as project_panels_router
from app.api.projects import router as projects_router

app = FastAPI(title="PanelForge API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects_router, prefix="/api")
app.include_router(panels_router, prefix="/api")
app.include_router(devices_router, prefix="/api")
app.include_router(project_devices_router, prefix="/api")
app.include_router(device_connections_router, prefix="/api")
app.include_router(project_panels_router, prefix="/api")
app.include_router(project_coppers_router, prefix="/api")
app.include_router(copper_router, prefix="/api")
app.include_router(panel_definitions_router, prefix="/api")
app.include_router(copper_definitions_router, prefix="/api")
app.include_router(calculations_router, prefix="/api")
app.include_router(exports_router, prefix="/api")


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
