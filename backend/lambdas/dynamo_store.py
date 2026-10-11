"""
Persistence store for JalMarg flood hazards.
Supports DynamoDB with TTL and zero-dependency in-memory cache seeded with urban hotspots.
"""

import os
import json
import time
from decimal import Decimal
from typing import Dict, Any, List, Optional

TABLE_NAME = os.environ.get("TABLE_NAME", "JalMarg_Hazards_local")
FORCE_MOCK = os.environ.get("MOCK_STORAGE", "").lower() in ("true", "1", "yes")

_MEMORY_HAZARDS: Dict[str, Dict[str, Any]] = {}


def _load_seeds():
    """Loads seed hotspots from seed_data.json into memory store with active TTL."""
    seed_file = os.path.join(os.path.dirname(__file__), "seed_data.json")
    now_epoch = int(time.time())
    if os.path.exists(seed_file):
        try:
            with open(seed_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data:
                    item_copy = dict(item)
                    # Keep seed data actively non-expired for demo/testing
                    item_copy["expiresAt"] = now_epoch + 10800
                    _MEMORY_HAZARDS[item_copy["id"]] = item_copy
        except Exception as e:
            print(f"[Warning] Failed to load seed_data.json: {e}")


_load_seeds()


def _get_dynamodb_table():
    if FORCE_MOCK:
        return None
    try:
        import boto3
        dynamodb = boto3.resource("dynamodb")
        table = dynamodb.Table(TABLE_NAME)
        _ = table.table_status
        return table
    except Exception:
        return None


def _decimal_to_native(obj: Any) -> Any:
    if isinstance(obj, list):
        return [_decimal_to_native(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: _decimal_to_native(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    return obj


def save_hazard(hazard: Dict[str, Any]) -> Dict[str, Any]:
    """Saves a hazard record to DynamoDB and memory cache."""
    if not hazard.get("id"):
        import uuid
        hazard["id"] = f"haz-{uuid.uuid4().hex[:8]}"
    # Ensure standard PK / SK for DynamoDB
    item = dict(hazard)
    item["PK"] = "HAZARD"
    item["SK"] = hazard["id"]

    table = _get_dynamodb_table()
    if table:
        try:
            ddb_item = json.loads(json.dumps(item), parse_float=Decimal)
            table.put_item(Item=ddb_item)
        except Exception as e:
            print(f"[Warning] DynamoDB put_item failed: {e}. Falling back to memory store.")

    _MEMORY_HAZARDS[hazard["id"]] = hazard
    return hazard


def get_all_hazards(include_expired: bool = False) -> List[Dict[str, Any]]:
    """Retrieves all active non-expired hazards."""
    now_epoch = int(time.time())
    items: List[Dict[str, Any]] = []

    table = _get_dynamodb_table()
    if table:
        try:
            resp = table.scan(Limit=100)
            items = [_decimal_to_native(i) for i in resp.get("Items", [])]
        except Exception as e:
            items = list(_MEMORY_HAZARDS.values())
    else:
        items = list(_MEMORY_HAZARDS.values())

    results = []
    for h in items:
        # Check TTL
        exp = int(h.get("expiresAt", 0))
        if not include_expired and exp > 0 and exp < now_epoch - 3600:
            continue
        results.append(h)

    # Sort critical first, then newest
    def sort_key(item):
        sev_rank = {"CRITICAL": 3, "MEDIUM": 2, "LOW": 1}.get(item.get("severity", "LOW"), 0)
        return (sev_rank, item.get("reportedAt", ""))

    results.sort(key=sort_key, reverse=True)
    return results


def get_hazard_by_id(hazard_id: str) -> Optional[Dict[str, Any]]:
    """Gets single hazard by ID."""
    table = _get_dynamodb_table()
    if table:
        try:
            resp = table.get_item(Key={"PK": "HAZARD", "SK": hazard_id})
            item = resp.get("Item")
            if item:
                return _decimal_to_native(item)
        except Exception:
            pass

    return _MEMORY_HAZARDS.get(hazard_id)


def delete_hazard_photo(hazard_id: str) -> Optional[Dict[str, Any]]:
    """Removes photo from a hazard record while preserving all other hazard details."""
    table = _get_dynamodb_table()
    if table:
        try:
            table.update_item(
                Key={"PK": "HAZARD", "SK": hazard_id},
                UpdateExpression="SET imageUrl = :val",
                ExpressionAttributeValues={":val": ""},
            )
        except Exception as e:
            print(f"[Warning] DynamoDB photo update failed: {e}")

    if hazard_id in _MEMORY_HAZARDS:
        _MEMORY_HAZARDS[hazard_id]["imageUrl"] = ""
        return _MEMORY_HAZARDS[hazard_id]
    return None


def delete_hazard(hazard_id: str) -> bool:
    """Deletes an entire hazard record."""
    table = _get_dynamodb_table()
    if table:
        try:
            table.delete_item(Key={"PK": "HAZARD", "SK": hazard_id})
        except Exception as e:
            print(f"[Warning] DynamoDB delete failed: {e}")

    if hazard_id in _MEMORY_HAZARDS:
        del _MEMORY_HAZARDS[hazard_id]
        return True
    return False

