"""
Automated unit test suite for JalMarg Flood Hazard Router backend.
"""

import sys
import os
import json
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "lambdas")))

import geohash_utils
import rekognition_validator
import dynamo_store
import ingest_report
import get_hazards
import calculate_route


class TestJalMargBackend(unittest.TestCase):
    def test_geohash_encoding(self):
        # Silk Board coordinates
        gh = geohash_utils.encode_geohash(12.9172, 77.6228, precision=5)
        self.assertEqual(len(gh), 5)
        self.assertTrue(gh.startswith("tdr"))

    def test_rekognition_validation(self):
        is_ver, conf, labels = rekognition_validator.validate_flood_evidence(None)
        self.assertTrue(is_ver)
        self.assertGreater(conf, 70.0)
        self.assertTrue(any("Water" in l or "Flood" in l for l in labels))

    def test_get_hazards_geojson(self):
        event = {"httpMethod": "GET", "queryStringParameters": {}}
        resp = get_hazards.lambda_handler(event, None)
        self.assertEqual(resp["statusCode"], 200)
        body = json.loads(resp["body"])
        self.assertEqual(body["type"], "FeatureCollection")
        self.assertGreaterEqual(len(body["features"]), 5)
        first_feat = body["features"][0]
        self.assertEqual(first_feat["geometry"]["type"], "Point")
        self.assertIn("severity", first_feat["properties"])

    def test_ingest_report_hazard(self):
        payload = {
            "title": "Severe underpass ponding at Sony Signal",
            "description": "Rainwater depth around 3.5ft, water up to exhaust pipes.",
            "severity": "CRITICAL",
            "latitude": 12.9360,
            "longitude": 77.6250,
            "locationName": "Sony World Crossing, Koramangala",
            "reporter": "Test Driver",
            "waterDepth": "IMPASSABLE_3_5FT"
        }
        event = {
            "httpMethod": "POST",
            "body": json.dumps(payload)
        }
        resp = ingest_report.lambda_handler(event, None)
        self.assertEqual(resp["statusCode"], 201)
        body = json.loads(resp["body"])
        self.assertIn("id", body)
        self.assertEqual(body["severity"], "CRITICAL")
        self.assertTrue(body["verified"])
        self.assertIn("expiresAt", body)
        self.assertGreater(body["expiresAt"], 0)

    def test_calculate_dual_route(self):
        # Route passing through flooded Silk Board corridor
        payload = {
            "start_lat": 12.9100,
            "start_lon": 77.6180,
            "dest_lat": 12.9750,
            "dest_lon": 77.6450
        }
        event = {
            "httpMethod": "POST",
            "body": json.dumps(payload)
        }
        resp = calculate_route.lambda_handler(event, None)
        self.assertEqual(resp["statusCode"], 200)
        body = json.loads(resp["body"])
        self.assertEqual(body["status"], "SUCCESS")
        comp = body["routeComparison"]
        self.assertIn("directRoute", comp)
        self.assertIn("safeDetourRoute", comp)
        self.assertGreater(len(comp["directRoute"]["polyline"]), 0)
        self.assertGreater(len(comp["safeDetourRoute"]["polyline"]), 0)
        self.assertIn("protectionTag", comp["safeDetourRoute"])


if __name__ == "__main__":
    unittest.main()
