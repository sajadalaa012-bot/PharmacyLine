import os
import shutil
import uuid
from fastapi import FastAPI, APIRouter, Depends, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager

from database import engine, get_db, Base, DATA_DIR
from models import Category, Product, Order, OrderItem
from schemas import CategoryOut, ProductUpdate, ProductOut, OrderCreate, OrderOut, ProductCreate, CategoryCreate, CategoryUpdate
from seed import seed_database
from auth import require_auth, verify_credentials, issue_token

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Uploaded images live on the persistent volume and are served at /media.
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# The compiled Next.js static export (produced by `next build`).
STATIC_DIR = os.environ.get(
    "STATIC_DIR", os.path.normpath(os.path.join(BASE_DIR, "..", "frontend", "out"))
)


# ── Lifespan: create tables & seed on startup ───────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE orders ADD COLUMN discount FLOAT DEFAULT 0.0"))
            conn.commit()
    except Exception:
        pass

    # Existing orders predate the approval workflow — treat them as approved.
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE orders ADD COLUMN status VARCHAR(20) DEFAULT 'approved'"))
            conn.commit()
    except Exception:
        pass

    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        seed_database(db)
    finally:
        db.close()
    yield


# ── App ──────────────────────────────────────────────────────────────

app = FastAPI(title="POS API", version="1.0.0", lifespan=lifespan)

# Same-origin in production, so CORS is only needed for local dev where the
# Next dev server runs on :3000. Configurable via CORS_ORIGINS (comma-separated).
_origins = os.environ.get(
    "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Public routes (no auth) ──────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/login")
def login(payload: LoginRequest):
    """Exchange admin email + password for a bearer token."""
    if not verify_credentials(payload.email, payload.password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    return {"token": issue_token()}


# ── Public storefront routes (no auth) ───────────────────────────────

@app.get("/api/products", response_model=list[CategoryOut])
def get_products(db: Session = Depends(get_db)):
    """Return all products grouped by category. Public — storefront browsing."""
    categories = (
        db.query(Category)
        .order_by(Category.display_order)
        .all()
    )
    return categories


@app.post("/api/orders", response_model=OrderOut, status_code=201)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    """Save a new order with items and notes. Public — storefront checkout."""
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item.")

    order = Order(
        notes=payload.notes,
        discount=payload.discount,
        grand_total=payload.grand_total,
        status=payload.status,
    )
    db.add(order)
    db.flush()

    for item in payload.items:
        order_item = OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            product_code=item.product_code,
            product_name=item.product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            subtotal=item.subtotal,
            is_free=item.is_free,
        )
        db.add(order_item)

    db.commit()
    db.refresh(order)
    return order


# ── Protected admin routes — every endpoint below requires a valid token ───

api = APIRouter(dependencies=[Depends(require_auth)])


@api.get("/api/orders", response_model=list[OrderOut])
def get_orders(db: Session = Depends(get_db)):
    """Retrieve all orders ordered by creation date."""
    orders = db.query(Order).order_by(Order.created_at.desc()).all()
    return orders


@api.get("/api/orders/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    """Retrieve a single order by ID."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    return order


@api.put("/api/orders/{order_id}", response_model=OrderOut)
def update_order(order_id: int, payload: OrderCreate, db: Session = Depends(get_db)):
    """Replace an order's items, discount, notes, and status (admin review/approval)."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item.")

    order.notes = payload.notes
    order.discount = payload.discount
    order.grand_total = payload.grand_total
    order.status = payload.status

    db.query(OrderItem).filter(OrderItem.order_id == order.id).delete()
    for item in payload.items:
        db.add(OrderItem(order_id=order.id, **item.model_dump()))

    db.commit()
    db.expire_all()
    order = db.query(Order).filter(Order.id == order_id).first()
    return order


@api.delete("/api/orders/{order_id}", status_code=204)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    """Delete an order and its line items."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    db.query(OrderItem).filter(OrderItem.order_id == order.id).delete()
    db.delete(order)
    db.commit()
    return


@api.put("/api/products/{product_id}", response_model=ProductOut)
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)):
    """Update a product's details in the database."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    # Check if updated code is already taken by another product
    if payload.code != product.code:
        existing = db.query(Product).filter(Product.code == payload.code).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Product code '{payload.code}' is already in use.")

    product.name = payload.name
    product.code = payload.code
    product.price = payload.price
    product.image_url = payload.image_url
    product.category_id = payload.category_id

    db.commit()
    db.refresh(product)
    return product


@api.post("/api/products", response_model=ProductOut, status_code=201)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    """Create a new product."""
    existing = db.query(Product).filter(Product.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Product code '{payload.code}' already exists.")

    product = Product(
        name=payload.name,
        code=payload.code,
        price=payload.price,
        image_url=payload.image_url,
        category_id=payload.category_id
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@api.delete("/api/products/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    """Delete a product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    db.delete(product)
    db.commit()
    return


@api.post("/api/categories", response_model=CategoryOut, status_code=201)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    """Create a new category."""
    existing = db.query(Category).filter(Category.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Category name '{payload.name}' already exists.")

    # Get highest display_order if none provided
    display_order = payload.display_order
    if not display_order:
        max_order = db.query(Category).order_by(Category.display_order.desc()).first()
        display_order = (max_order.display_order + 1) if max_order else 1

    category = Category(
        name=payload.name,
        display_order=display_order
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@api.put("/api/categories/{category_id}", response_model=CategoryOut)
def update_category(category_id: int, payload: CategoryUpdate, db: Session = Depends(get_db)):
    """Update a category's name and display order."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")

    category.name = payload.name
    category.display_order = payload.display_order
    db.commit()
    db.refresh(category)
    return category


@api.delete("/api/categories/{category_id}", status_code=204)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    """Delete an empty category."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")

    if category.products:
        raise HTTPException(status_code=400, detail="Cannot delete category containing products.")

    db.delete(category)
    db.commit()
    return


@api.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    """Upload an image file to the persistent uploads directory."""
    filename = file.filename or ""
    safe_filename = "".join([c for c in filename if c.isalpha() or c.isdigit() or c in "._-"]).strip()
    if not safe_filename:
        safe_filename = "image.jpg"

    # Prefix a random token so uploads never overwrite each other.
    unique_name = f"{uuid.uuid4().hex[:8]}_{safe_filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"image_url": f"/media/{unique_name}"}


app.include_router(api)


# ── Static assets ────────────────────────────────────────────────────
# Uploaded images (persistent volume), then the compiled frontend.
# Mounted last so /api/* routes always take precedence.

app.mount("/media", StaticFiles(directory=UPLOAD_DIR), name="media")

if os.path.isdir(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
