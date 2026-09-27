from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.router import fast_router
from app.routers import health, trend, resume, company, case_study, question_bank, interview, auth, portal, admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: warm up Laya model or router
    print(f"[{settings.APP_NAME}] Initializing services...")
    fast_router.load()
    yield
    print(f"[{settings.APP_NAME}] Shutting down...")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers for Phase 1, Phase 2 & Phase 3
app.include_router(health.router)
app.include_router(trend.router)
app.include_router(resume.router)
app.include_router(company.router)
app.include_router(case_study.router)
app.include_router(question_bank.router)
app.include_router(interview.router)
app.include_router(auth.router)
app.include_router(portal.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "phase": "Phase 4 (Institutional: Auth + Resume Portal + TPO Analytics)",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
