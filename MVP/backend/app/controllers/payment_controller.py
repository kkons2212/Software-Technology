"""Payment & Checkout Controller (US 06.1, US 06.2).

Handles digital admission pass checkout, VietQR code generation, client polling for order status,
and cryptographic webhook processing.
"""

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import HTMLResponse, RedirectResponse

from app.core.dependencies import get_payment_service
from app.schemas.payment_schema import (
    CheckoutCreateRequest,
    CheckoutCreateResponse,
    OrderStatusResponse,
    PayOSWebhookPayload,
    WebhookResponse,
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


@router.post(
    "/webhook",
    response_model=WebhookResponse,
    status_code=status.HTTP_200_OK,
)
def handle_payment_webhook(
    payload: PayOSWebhookPayload,
    payment_service: PaymentService = Depends(get_payment_service),
) -> WebhookResponse:
    """Secure webhook endpoint receiving payment confirmations from PayOS (TSK-06.2.1)."""
    return payment_service.process_payment_webhook(payload=payload)


@router.get("/paypal-checkout", response_class=HTMLResponse)
def paypal_sandbox_checkout_page(
    order_id: str = Query(
        ..., description="Order ID to simulate PayPal Sandbox payment"
    ),
) -> HTMLResponse:
    """Interactive PayPal Sandbox Mock Checkout Page for testing without live keys."""
    html_content = f"""<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PayPal Sandbox Checkout - Cu Chi Tunnels</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-100 min-h-screen flex items-center justify-center p-4 font-sans">
    <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8 border border-slate-200">
        <div class="flex items-center justify-between border-b pb-4">
            <div class="flex items-center gap-2">
                <span class="text-2xl font-black italic tracking-tighter text-[#003087]">Pay<span class="text-[#0079C1]">Pal</span></span>
                <span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Sandbox</span>
            </div>
            <span class="text-xs text-slate-400">Test Mode</span>
        </div>
        <div class="my-6">
            <h2 class="text-lg font-bold text-slate-900">Xác nhận thanh toán</h2>
            <p class="text-xs text-slate-500 mt-1">Dịch vụ Thuyết minh Âm thanh Đa ngôn ngữ (24h Pass)</p>
            <div class="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 text-sm">
                <div class="flex justify-between text-slate-600">
                    <span>Mã đơn hàng:</span>
                    <span class="font-mono font-semibold text-slate-900">{order_id}</span>
                </div>
                <div class="flex justify-between text-slate-600">
                    <span>Số tiền:</span>
                    <span class="font-bold text-slate-900">50.000 đ (~$2.00 USD)</span>
                </div>
                <div class="flex justify-between text-slate-600">
                    <span>Cổng thanh toán:</span>
                    <span class="text-blue-600 font-medium">PayPal Sandbox</span>
                </div>
            </div>
        </div>
        <div class="space-y-3">
            <a href="/api/v1/payments/paypal/confirm-mock?order_id={order_id}"
               class="block w-full text-center bg-[#0070ba] hover:bg-[#005ea6] text-white font-semibold py-3 px-4 rounded-xl shadow transition text-sm">
                Xác nhận thanh toán PayPal Sandbox (50.000 đ)
            </a>
            <a href="http://localhost:5173/tour"
               class="block w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 px-4 rounded-xl transition text-xs">
                Hủy bỏ và quay lại Tour
            </a>
        </div>
        <p class="text-[11px] text-center text-slate-400 mt-6">
            Môi trường PayPal Sandbox thử nghiệm. Không phát sinh giao dịch thực tế.
        </p>
    </div>
</body>
</html>"""
    return HTMLResponse(content=html_content)


@router.get("/paypal/confirm-mock")
def confirm_paypal_mock_payment(
    order_id: str = Query(...),
    payment_service: PaymentService = Depends(get_payment_service),
) -> RedirectResponse:
    """Process mock confirmation and redirect back to visitor tour."""
    payment_service.simulate_payment_success(order_id=order_id)
    return RedirectResponse(
        url=f"http://localhost:5173/tour?payment_success=true&order_id={order_id}",
        status_code=status.HTTP_302_FOUND,
    )


@router.get("/paypal/capture", response_model=OrderStatusResponse)
@router.post("/order/{order_id}/paypal-capture", response_model=OrderStatusResponse)
async def capture_paypal_payment(
    order_id: str,
    paypal_order_id: str | None = None,
    payment_service: PaymentService = Depends(get_payment_service),
) -> OrderStatusResponse:
    """Capture PayPal Sandbox order (TSK-06.1.1)."""
    return await payment_service.capture_paypal_order(
        order_id=order_id,
        paypal_order_id=paypal_order_id,
    )
