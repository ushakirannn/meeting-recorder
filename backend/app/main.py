from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routes.audio import router as audio_router
from app.routes.meetings import router as meetings_router
from app.services.database import init_db

app = FastAPI(
    title="AI Meeting Recorder API",
    description="Upload meeting audio, get structured notes back",
    version="1.0.0",
)

# CORS: allow all origins for MVP (mobile app calls from device)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch unhandled exceptions so CORS headers are still added."""
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
    )


# Initialize database on startup
init_db()

app.include_router(audio_router)
app.include_router(meetings_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
