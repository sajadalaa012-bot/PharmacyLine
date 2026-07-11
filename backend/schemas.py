from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ── Product & Category ──────────────────────────────────────────────

class ProductOut(BaseModel):
    id: int
    name: str
    code: str
    price: float
    image_url: str
    category_id: int

    model_config = {"from_attributes": True}


class ProductUpdate(BaseModel):
    name: str
    code: str
    price: float
    image_url: str
    category_id: int


class ProductCreate(BaseModel):
    name: str
    code: str
    price: float
    image_url: str
    category_id: int


class CategoryCreate(BaseModel):
    name: str
    display_order: Optional[int] = 0


class CategoryUpdate(BaseModel):
    name: str
    display_order: int


class CategoryOut(BaseModel):
    id: int
    name: str
    display_order: int
    products: list[ProductOut]

    model_config = {"from_attributes": True}



# ── Order ────────────────────────────────────────────────────────────

class OrderItemCreate(BaseModel):
    product_id: int
    product_code: str
    product_name: str
    quantity: int
    unit_price: float
    subtotal: float
    is_free: bool = False


class OrderCreate(BaseModel):
    notes: str = ""
    discount: float = 0.0
    grand_total: float
    status: str = "pending"
    items: list[OrderItemCreate]


class OrderItemOut(BaseModel):
    id: int
    product_id: int
    product_code: str
    product_name: str
    quantity: int
    unit_price: float
    subtotal: float
    is_free: bool

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: int
    created_at: datetime
    notes: str
    discount: float
    grand_total: float
    status: str
    items: list[OrderItemOut]

    model_config = {"from_attributes": True}
