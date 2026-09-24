from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import sys
from pathlib import Path

# Thêm đường dẫn vào sys.path để import app modules
sys.path.append(str(Path(__file__).resolve().parent))
sys.path.append(str(Path(__file__).resolve().parent / "app"))

from config import STATIC_DIR
from app.database import init_db
from app.routers.admin_poi_router import router as admin_poi_router
from app.routers.admin_qr_router import router as admin_qr_router
from app.routers.visitor_poi_router import router as visitor_poi_router
from app.routers.visitor_map_router import router as visitor_map_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi tạo CSDL khi ứng dụng khởi động
    init_db()
    print("Database SQLite (WAL Mode) initialized successfully.")
    yield

app = FastAPI(
    title="Smart Museum Audio Guide & Navigation POC",
    description="Backend API phục vụ tự động hóa thuyết minh đa ngôn ngữ, QR code và bản đồ bảo tàng.",
    version="1.0.0",
    lifespan=lifespan
)

# Cấu hình CORS để Frontend tương tác thông suốt
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount thư mục static phục vụ file âm thanh (.mp3), ảnh QR (.png) và hình ảnh hiện vật
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Đăng ký các Router Admin
app.include_router(admin_poi_router)
app.include_router(admin_qr_router)

# Đăng ký các Router Khách Tham Quan (Visitor)
app.include_router(visitor_poi_router)
app.include_router(visitor_map_router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Smart Museum Audio Guide POC Backend",
        "database": "SQLite (WAL Mode)"
    }

@app.get("/api/config")
def get_app_config():
    from config import get_frontend_base_url
    return {
        "frontend_base_url": get_frontend_base_url()
    }

