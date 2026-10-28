"""Payment & Checkout Controller (US 06.1).

Handles digital admission pass checkout, VietQR code generation, and client polling for order status.
"""

from fastapi import APIRouter, Depends, status

from app.core.dependencies import get_payment_service
from app.schemas.payment_schema import (
    CheckoutCreateRequest,
    CheckoutCreateResponse,
    OrderStatusResponse,
)
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/api/v1/payments", tags=["Payment & Checkout"])


@router.post(
    "/create-checkout",
    response_model=CheckoutCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_checkout_order(
    payload: CheckoutCreateRequest,
    payment_service: PaymentService = Depends(get_payment_service),
) -> CheckoutCreateResponse:
    """Create a digital admission checkout order and generate VietQR or Card checkout payload (TSK-06.1.1)."""
    return await payment_service.create_checkout_order(payload=payload)


@router.get(
    "/order/{order_id}/status",
    response_model=OrderStatusResponse,
    status_code=status.HTTP_200_OK,
)
def get_order_status(
    order_id: str,
    payment_service: PaymentService = Depends(get_payment_service),
) -> OrderStatusResponse:
    """Query order status for client-side interval polling (TSK-06.1.2)."""
    return payment_service.get_order_status(order_id=order_id)


@router.post(
    "/order/{order_id}/simulate-success",
    response_model=OrderStatusResponse,
    status_code=status.HTTP_200_OK,
)
def simulate_payment_success(
    order_id: str,
    payment_service: PaymentService = Depends(get_payment_service),
) -> OrderStatusResponse:
    """Simulate payment success for developer testing and interactive demo."""
    return payment_service.simulate_payment_success(order_id=order_id)
