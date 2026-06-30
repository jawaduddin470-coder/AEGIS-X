"""
AEGIS X — Cloudinary Media Service
Handles image/video upload, transformation, and signed URL generation
"""
import base64
import hashlib
import time
import logging
import httpx
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


class CloudinaryService:
    """
    Cloudinary media management service.
    Uses the Cloudinary REST API directly (no SDK dependency issues).
    """

    def __init__(self):
        self.cloud_name = settings.CLOUDINARY_CLOUD_NAME
        self.api_key = settings.CLOUDINARY_API_KEY
        self.api_secret = settings.CLOUDINARY_API_SECRET
        self.upload_url = f"https://api.cloudinary.com/v1_1/{self.cloud_name}"

    @property
    def is_configured(self) -> bool:
        return bool(self.cloud_name and self.api_key and self.api_secret)

    def _generate_signature(self, params: dict) -> str:
        """Generate a SHA1 signature for authenticated Cloudinary requests."""
        sorted_params = "&".join(
            f"{k}={v}" for k, v in sorted(params.items())
        )
        to_sign = sorted_params + self.api_secret
        return hashlib.sha1(to_sign.encode("utf-8")).hexdigest()

    async def upload_image(
        self,
        file_bytes: bytes,
        filename: str,
        folder: str = "aegis-x/incidents",
        resource_type: str = "image",
    ) -> dict:
        """
        Upload a file (image/video/audio) to Cloudinary.
        Returns: { url, secure_url, public_id, width, height, format, bytes }
        """
        if not self.is_configured:
            logger.warning("Cloudinary not configured — returning placeholder URL")
            return {
                "secure_url": f"https://res.cloudinary.com/demo/image/upload/sample.jpg",
                "public_id": "demo/sample",
                "url": f"https://res.cloudinary.com/demo/image/upload/sample.jpg",
            }

        timestamp = int(time.time())
        params = {
            "folder": folder,
            "timestamp": timestamp,
        }
        signature = self._generate_signature(params)

        # Encode file to base64 data URI
        encoded = base64.b64encode(file_bytes).decode("utf-8")
        ext = filename.split(".")[-1] if "." in filename else "jpg"
        data_uri = f"data:{resource_type}/{ext};base64,{encoded}"

        payload = {
            "file": data_uri,
            "api_key": self.api_key,
            "timestamp": timestamp,
            "signature": signature,
            "folder": folder,
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{self.upload_url}/{resource_type}/upload",
                    data=payload,
                )
                resp.raise_for_status()
                result = resp.json()
                logger.info(f"✅ Cloudinary upload successful: {result.get('public_id')}")
                return result
        except Exception as e:
            logger.error(f"Cloudinary upload failed: {e}")
            raise ValueError(f"Upload failed: {e}")

    async def delete_asset(self, public_id: str, resource_type: str = "image") -> bool:
        """Delete an asset from Cloudinary by public_id."""
        if not self.is_configured:
            return False
        timestamp = int(time.time())
        params = {"public_id": public_id, "timestamp": timestamp}
        signature = self._generate_signature(params)
        payload = {
            "public_id": public_id,
            "api_key": self.api_key,
            "timestamp": timestamp,
            "signature": signature,
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{self.upload_url}/{resource_type}/destroy",
                    data=payload,
                )
                result = resp.json()
                return result.get("result") == "ok"
        except Exception as e:
            logger.error(f"Cloudinary delete failed: {e}")
            return False

    def get_optimized_url(
        self,
        public_id: str,
        width: int = 800,
        quality: str = "auto",
        format: str = "auto",
    ) -> str:
        """Generate a Cloudinary transformation URL for an existing asset."""
        return (
            f"https://res.cloudinary.com/{self.cloud_name}/image/upload"
            f"/w_{width},q_{quality},f_{format}/{public_id}"
        )


cloudinary_service = CloudinaryService()
