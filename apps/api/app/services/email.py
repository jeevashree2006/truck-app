"""Email delivery.

Tried in order:
  0) Google Apps Script relay (if GAS_WEBHOOK_URL is set) — sends from your own Gmail
     over HTTPS, so it works on hosts that block SMTP (Render etc.).
  1) SMTP via Python's stdlib `smtplib` (e.g. Gmail + App Password) — FREE, no extra deps.
  2) SendGrid API (if SENDGRID_API_KEY is set).
  3) Console log fallback (dev) — so the flow works with zero setup.
"""

import asyncio
import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger("fleet.email")


def _send_smtp_sync(to: str, subject: str, html: str, text: str | None) -> None:
    """Blocking SMTP send (run via asyncio.to_thread). Raises on failure."""
    from_addr = settings.smtp_user or settings.email_from
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.email_from_name} <{from_addr}>"
    msg["To"] = to
    msg.attach(MIMEText(text or _strip(html), "plain"))
    msg.attach(MIMEText(html, "html"))

    context = ssl.create_default_context()
    if settings.smtp_port == 465:
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=context, timeout=15) as server:
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(from_addr, [to], msg.as_string())
    else:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            server.starttls(context=context)
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(from_addr, [to], msg.as_string())


async def send_email(to: str, subject: str, html: str, text: str | None = None) -> bool:
    # 0) Google Apps Script relay — sends from your OWN Gmail over HTTPS, so it works on
    #    hosts that block SMTP (Render). Preferred when GAS_WEBHOOK_URL is set.
    if settings.gas_webhook_url:
        try:
            import httpx

            payload = {"to": to, "subject": subject, "html": html, "text": text or _strip(html)}
            if settings.gas_shared_secret:
                payload["secret"] = settings.gas_shared_secret
            async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
                resp = await client.post(settings.gas_webhook_url, json=payload)
            if 200 <= resp.status_code < 300 and "OK" in resp.text:
                return True
            logger.error("Apps Script email failed: HTTP %s — %s", resp.status_code, resp.text[:200])
        except Exception:  # noqa: BLE001
            logger.exception("Apps Script email send failed; trying next method")

    # 1) SMTP (Gmail etc.) — free, stdlib only.
    if settings.smtp_user and settings.smtp_password:
        try:
            await asyncio.to_thread(_send_smtp_sync, to, subject, html, text)
            return True
        except Exception:  # noqa: BLE001
            logger.exception("SMTP send failed; trying next method")

    # 2) SendGrid API.
    if settings.sendgrid_api_key:
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Content, Email, Mail, To

            message = Mail(
                from_email=Email(settings.email_from, settings.email_from_name),
                to_emails=To(to),
                subject=subject,
                html_content=Content("text/html", html),
            )
            if text:
                message.add_content(Content("text/plain", text))
            response = SendGridAPIClient(settings.sendgrid_api_key).send(message)
            return 200 <= response.status_code < 300
        except Exception:  # noqa: BLE001
            logger.exception("SendGrid send failed; falling back to log")

    # 3) Console fallback (dev).
    logger.info("[DEV EMAIL] to=%s subject=%s\n%s", to, subject, text or _strip(html))
    return True


async def send_sms(to: str, body: str) -> bool:
    """Send an SMS via the first configured provider (Twilio → MSG91 → generic).

    With no provider configured, log to stdout and succeed (dev mode) — the OTP is
    still real and server-verified; it's just shown via the API's dev_code.
    """
    if not settings.has_sms_provider:
        logger.info("[DEV SMS] to=%s | %s", to, body)
        return True

    import httpx

    # The numeric OTP, extracted from the message body.
    code = "".join(ch for ch in body if ch.isdigit())[:8]

    try:
        # ---- Fast2SMS (India; OTP route needs no DLT template) ----
        if settings.fast2sms_api_key:
            mobile = to.lstrip("+")
            if mobile.startswith("91") and len(mobile) > 10:
                mobile = mobile[2:]  # Fast2SMS expects the bare 10-digit number
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    "https://www.fast2sms.com/dev/bulkV2",
                    params={"authorization": settings.fast2sms_api_key, "route": "otp",
                            "variables_values": code, "numbers": mobile, "flash": "0"},
                )
            return 200 <= resp.status_code < 300 and '"return":true' in resp.text.replace(" ", "")

        # ---- Twilio ----
        if settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_from:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json",
                    auth=(settings.twilio_account_sid, settings.twilio_auth_token),
                    data={"To": to if to.startswith("+") else f"+91{to}", "From": settings.twilio_from, "Body": body},
                )
            return 200 <= resp.status_code < 300

        # ---- MSG91 (DLT flow; expects an OTP variable in the approved template) ----
        if settings.msg91_auth_key:
            mobile = to if to.startswith("91") or to.startswith("+") else f"91{to}"
            code = "".join(ch for ch in body if ch.isdigit())[:8]
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    "https://control.msg91.com/api/v5/flow/",
                    headers={"authkey": settings.msg91_auth_key, "Content-Type": "application/json"},
                    json={"flow_id": settings.msg91_flow_id, "sender": settings.msg91_sender,
                          "recipients": [{"mobiles": mobile.lstrip("+"), "OTP": code}]},
                )
            return 200 <= resp.status_code < 300

        # ---- Generic provider ----
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                settings.sms_api_url,
                headers={"authkey": settings.sms_api_key},
                json={"sender": settings.sms_sender, "to": to, "message": body},
            )
        return 200 <= resp.status_code < 300
    except Exception:  # noqa: BLE001
        logger.exception("SMS send failed; falling back to log")
        logger.info("[FALLBACK SMS] to=%s | %s", to, body)
        return False


async def send_otp(channel: str, target: str, code: str) -> bool:
    """Dispatch an OTP over the right channel ('email' or 'sms')."""
    if channel == "sms":
        return await send_sms(
            target,
            f"{settings.email_from_name}: Your login code is {code}. "
            f"Valid {settings.otp_expire_minutes} min.",
        )
    return await send_otp_email(target, code)


async def send_otp_email(to: str, code: str) -> bool:
    subject = f"{settings.email_from_name}: Your login code is {code}"
    html = f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#0f172a">Your Fleet Owner login code</h2>
      <p style="color:#475569">Enter this code to sign in. It expires in
         {settings.otp_expire_minutes} minutes.</p>
      <div style="font-size:34px;font-weight:700;letter-spacing:10px;
                  background:#f1f5f9;border-radius:14px;padding:18px;text-align:center;
                  color:#1d4ed8">{code}</div>
      <p style="color:#94a3b8;font-size:12px;margin-top:20px">
         If you didn't request this, you can safely ignore this email.</p>
    </div>"""
    text = f"Your Fleet Owner login code is {code}. It expires in {settings.otp_expire_minutes} minutes."
    return await send_email(to, subject, html, text)


def _strip(html: str) -> str:
    import re

    return re.sub(r"<[^>]+>", "", html).strip()
