"""
Lambda 2: Get Active Flood Hazards
Returns GeoJSON FeatureCollection of active, non-expired waterlogging hazards.
"""

import json
from typing import Dict, Any
import dynamo_store

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Content-Type": "application/json",
}


def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    method = (event.get("httpMethod") or "GET").upper()
    if method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "CORS OK"}),
        }

    query_params = event.get("queryStringParameters") or {}
    include_expired = query_params.get("include_expired", "").lower() in ("true", "1")

    hazards = dynamo_store.get_all_hazards(include_expired=include_expired)

    # Format standard GeoJSON FeatureCollection
    features = []
    for h in hazards:
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [h["longitude"], h["latitude"]],
            },
            "properties": {
                "id": h["id"],
                "title": h["title"],
                "description": h["description"],
                "severity": h["severity"],
                "waterDepth": h.get("waterDepth"),
                "depthCm": h.get("depthCm"),
                "status": h.get("status", "ACTIVE"),
                "locationName": h.get("locationName"),
                "landmark": h.get("landmark"),
                "verified": h.get("verified", False),
                "verificationConfidence": h.get("verificationConfidence"),
                "detectedLabels": h.get("detectedLabels", []),
                "imageUrl": h.get("imageUrl"),
                "reportedAt": h.get("reportedAt"),
                "expiresAt": h.get("expiresAt"),
                "reporter": h.get("reporter"),
            },
        }
        features.append(feature)

    response_payload = {
        "type": "FeatureCollection",
        "features": features,
        "hazards": hazards,
        "count": len(hazards),
    }

    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps(response_payload),
    }
