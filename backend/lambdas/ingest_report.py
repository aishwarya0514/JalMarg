"""
Lambda 1: Ingest Citizen Flood Hazard Report
Extracts report data, validates image via Amazon Rekognition, calculates Geohash,
and writes to DynamoDB with 3-hour TTL.
"""

import json
import os
import time
import uuid
import base64
from datetime import datetime, timezone
from typing import Dict, Any

import geohash_utils
import rekognition_validator
import dynamo_store

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json",
}

BUCKET_NAME = os.environ.get("BUCKET_NAME", "jalmarg-evidence-local")


def upload_image_to_s3(image_b64: str, hazard_id: str) -> str:
    """Uploads base64 image to S3 or returns data URL / placeholder."""
    if not image_b64:
        return "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80"

    try:
        # Strip header if data URI
        cleaned = image_b64
        if "base64," in image_b64:
            cleaned = image_b64.split("base64,")[1]
        img_bytes = base64.b64decode(cleaned)

        import boto3
        s3 = boto3.client("s3")
        key = f"evidence/{hazard_id}.jpg"
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=key,
            Body=img_bytes,
            ContentType="image/jpeg"
        )
        region = os.environ.get("AWS_REGION", "ap-south-1")
        return f"https://{BUCKET_NAME}.s3.{region}.amazonaws.com/{key}"
    except Exception:
        # Fallback to direct base64 data uri for local offline testing
        if image_b64.startswith("data:image"):
            return image_b64
        return f"data:image/jpeg;base64,{image_b64}"


def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    method = (event.get("httpMethod") or "GET").upper()
    if method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "CORS OK"}),
        }

    raw_body = event.get("body")
    payload = json.loads(raw_body) if isinstance(raw_body, str) else (raw_body or {})

    # Validate essential coordinates
    try:
        lat = float(payload.get("latitude"))
        lon = float(payload.get("longitude"))
    except (TypeError, ValueError):
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": "Valid latitude and longitude are required."}),
        }

    title = str(payload.get("title", "")).strip() or "Waterlogging Hazard Reported"
    note = str(payload.get("note", payload.get("description", ""))).strip()
    severity = str(payload.get("severity", "MEDIUM")).upper()
    if severity not in ("CRITICAL", "MEDIUM", "LOW"):
        severity = "MEDIUM"

    water_depth = payload.get("waterDepth")
    if not water_depth:
        water_depth = {
            "CRITICAL": "IMPASSABLE_3_TO_4FT",
            "MEDIUM": "KNEE_DEEP_2FT",
            "LOW": "ANKLE_DEEP_0_8FT"
        }.get(severity, "KNEE_DEEP_2FT")

    depth_cm = int(payload.get("depthCm", 60 if severity == "MEDIUM" else (120 if severity == "CRITICAL" else 25)))

    # Process evidence image & Rekognition verification
    image_b64 = payload.get("imageBase64", "")
    img_bytes = None
    if image_b64:
        try:
            cleaned = image_b64.split("base64,")[1] if "base64," in image_b64 else image_b64
            img_bytes = base64.b64decode(cleaned)
        except Exception:
            img_bytes = None

    is_verified, confidence, detected_labels = rekognition_validator.validate_flood_evidence(img_bytes)

    hazard_id = f"haz-{uuid.uuid4().hex[:8]}"
    image_url = upload_image_to_s3(image_b64, hazard_id)

    # Calculate Geohash-5
    gh = geohash_utils.encode_geohash(lat, lon, precision=5)

    now_epoch = int(time.time())
    expires_at = now_epoch + 10800  # 3 Hours TTL

    now_iso = datetime.now(timezone.utc).isoformat()

    hazard_record = {
        "id": hazard_id,
        "title": title,
        "description": note or f"Active {severity.lower()} waterlogging reported at this location.",
        "severity": severity,
        "waterDepth": water_depth,
        "depthCm": depth_cm,
        "status": "ACTIVE",
        "latitude": lat,
        "longitude": lon,
        "locationName": str(payload.get("locationName", f"Coordinates ({round(lat, 4)}, {round(lon, 4)})")).strip(),
        "landmark": str(payload.get("landmark", "")).strip(),
        "verified": is_verified,
        "verificationSource": "AWS_REKOGNITION_CV" if is_verified else "UNVERIFIED_CITIZEN",
        "verificationConfidence": confidence,
        "detectedLabels": detected_labels,
        "imageUrl": image_url,
        "reportedAt": now_iso,
        "expiresAt": expires_at,
        "reporter": str(payload.get("reporter", "Community Reporter")).strip(),
        "geohash": gh,
    }

    dynamo_store.save_hazard(hazard_record)

    return {
        "statusCode": 201,
        "headers": CORS_HEADERS,
        "body": json.dumps(hazard_record),
    }
