"""
AEGIS X — Firebase Push Notification Service (FCM)
Sends push notifications via Firebase Cloud Messaging REST v1 API
"""
import logging
import httpx
from typing import Optional, List

from app.config import settings

logger = logging.getLogger(__name__)


class FCMService:
    """
    Firebase Cloud Messaging service.
    Uses the legacy server key HTTP API for simplicity (no service account needed).
    """

    FCM_LEGACY_URL = "https://fcm.googleapis.com/fcm/send"
    FCM_V1_URL = "https://fcm.googleapis.com/v1/projects/{project}/messages:send"

    def __init__(self):
        self.server_key = settings.FIREBASE_FCM_SERVER_KEY
        self.project_id = settings.FIREBASE_PROJECT_ID

    @property
    def is_configured(self) -> bool:
        return bool(self.server_key)

    async def send_to_token(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[dict] = None,
        icon: str = "/favicon.svg",
        badge: str = "1",
    ) -> bool:
        """Send a push notification to a specific FCM device token."""
        if not self.is_configured:
            logger.warning("FCM not configured — skipping push notification")
            return False

        payload = {
            "to": token,
            "notification": {
                "title": title,
                "body": body,
                "icon": icon,
                "badge": badge,
                "sound": "default",
                "click_action": "FLUTTER_NOTIFICATION_CLICK",
            },
            "data": data or {},
            "priority": "high",
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    self.FCM_LEGACY_URL,
                    json=payload,
                    headers={
                        "Authorization": f"key={self.server_key}",
                        "Content-Type": "application/json",
                    },
                )
                result = resp.json()
                success = result.get("success", 0) > 0
                if success:
                    logger.info(f"✅ FCM sent to token: {token[:20]}...")
                else:
                    logger.warning(f"FCM failed: {result}")
                return success
        except Exception as e:
            logger.error(f"FCM send failed: {e}")
            return False

    async def send_to_topic(
        self,
        topic: str,
        title: str,
        body: str,
        data: Optional[dict] = None,
    ) -> bool:
        """Send a push notification to an FCM topic (e.g. 'all', 'responders', 'admins')."""
        if not self.is_configured:
            logger.warning("FCM not configured — skipping topic notification")
            return False

        payload = {
            "to": f"/topics/{topic}",
            "notification": {
                "title": title,
                "body": body,
                "icon": "/favicon.svg",
                "sound": "default",
            },
            "data": data or {},
            "priority": "high",
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    self.FCM_LEGACY_URL,
                    json=payload,
                    headers={
                        "Authorization": f"key={self.server_key}",
                        "Content-Type": "application/json",
                    },
                )
                result = resp.json()
                logger.info(f"✅ FCM topic '{topic}' message sent: {result}")
                return True
        except Exception as e:
            logger.error(f"FCM topic send failed: {e}")
            return False

    async def send_broadcast(
        self,
        title: str,
        body: str,
        severity: str = "Info",
        incident_id: Optional[int] = None,
    ) -> bool:
        """
        Broadcast an emergency alert to all AEGIS X users via 'all' topic.
        """
        data = {
            "type": "broadcast",
            "severity": severity,
        }
        if incident_id:
            data["incident_id"] = str(incident_id)

        return await self.send_to_topic(
            topic="aegis_all",
            title=title,
            body=body,
            data=data,
        )

    async def send_sos_alert(
        self,
        responder_tokens: List[str],
        incident_id: int,
        location_name: str,
        incident_type: str,
    ) -> int:
        """
        Send an SOS alert to a list of responder FCM tokens.
        Returns count of successful sends.
        """
        success_count = 0
        for token in responder_tokens:
            ok = await self.send_to_token(
                token=token,
                title=f"🚨 SOS Alert — {incident_type}",
                body=f"Emergency at {location_name}. Immediate response required.",
                data={
                    "type": "sos",
                    "incident_id": str(incident_id),
                    "incident_type": incident_type,
                    "location": location_name,
                },
            )
            if ok:
                success_count += 1
        logger.info(f"SOS alert sent to {success_count}/{len(responder_tokens)} responders")
        return success_count


fcm_service = FCMService()
