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
import geocode_service


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

    def test_calculate_route_jakkur_yelahanka(self):
        payload = {
            "start_lat": 13.0784,
            "start_lon": 77.6070,
            "dest_lat": 13.1007,
            "dest_lon": 77.5963,
            "origin_query": "Jakkur",
            "origin_name": "Jakkur, Bengaluru",
            "origin_address": "Jakkur Aerodrome & Lake Corridor, Bengaluru, Karnataka 560064",
            "dest_query": "Yelahanka",
            "dest_name": "Yelahanka, Bengaluru",
            "dest_address": "Yelahanka Old Town / Satellite Town, Bengaluru, Karnataka 560064",
        }
        event = {"httpMethod": "POST", "body": json.dumps(payload)}
        resp = calculate_route.lambda_handler(event, None)
        self.assertEqual(resp["statusCode"], 200)
        body = json.loads(resp["body"])
        comp = body["routeComparison"]
        self.assertEqual(comp["origin"]["label"], "Jakkur, Bengaluru")
        self.assertEqual(comp["destination"]["label"], "Yelahanka, Bengaluru")
        self.assertEqual(comp["corridorName"], "Jakkur → Yelahanka")
        self.assertAlmostEqual(comp["origin"]["latitude"], 13.0784, places=3)
        self.assertAlmostEqual(comp["destination"]["latitude"], 13.1007, places=3)

    def test_delete_hazard_photo(self):
        # Ingest a hazard with photo
        payload = {
            "title": "Photo Deletion Test Hazard",
            "description": "Puddle with image",
            "severity": "LOW",
            "latitude": 13.0784,
            "longitude": 77.6070,
            "locationName": "Jakkur Road",
            "imageUrl": "https://example.com/test-photo.jpg",
        }
        created = dynamo_store.save_hazard(payload)
        h_id = created["id"]
        self.assertEqual(created["imageUrl"], "https://example.com/test-photo.jpg")

        # Delete photo
        updated = dynamo_store.delete_hazard_photo(h_id)
        self.assertIsNotNone(updated)
        self.assertEqual(updated["imageUrl"], "")
        self.assertEqual(updated["id"], h_id)
        self.assertEqual(updated["title"], "Photo Deletion Test Hazard")

        # Clean up
        dynamo_store.delete_hazard(h_id)

    def test_delete_hazard_report(self):
        payload = {
            "title": "Temporary Hazard to Delete",
            "description": "Will be removed",
            "severity": "LOW",
            "latitude": 13.1007,
            "longitude": 77.5963,
            "locationName": "Yelahanka Bypass",
        }
        created = dynamo_store.save_hazard(payload)
        h_id = created["id"]
        self.assertIsNotNone(dynamo_store.get_hazard_by_id(h_id))

        deleted = dynamo_store.delete_hazard(h_id)
        self.assertTrue(deleted)
        self.assertIsNone(dynamo_store.get_hazard_by_id(h_id))

    def test_calculate_route_jalahalli_majestic(self):
        # 1. Jalahalli Cross -> Majestic (West/Central)
        payload = {
            "start_lat": 13.0398,
            "start_lon": 77.5184,
            "dest_lat": 12.9779,
            "dest_lon": 77.5724,
            "origin_query": "Jalahalli Cross",
            "dest_query": "Majestic",
        }
        event = {"httpMethod": "POST", "body": json.dumps(payload)}
        resp = calculate_route.lambda_handler(event, None)
        self.assertEqual(resp["statusCode"], 200)
        body = json.loads(resp["body"])
        comp = body["routeComparison"]
        self.assertGreater(len(comp["directRoute"]["polyline"]), 10)
        self.assertGreater(comp["directRoute"]["distanceKm"], 8.0)
        self.assertGreater(comp["directRoute"]["etaMinutes"], 10)
        self.assertIn("protectionTag", comp["safeDetourRoute"])

    def test_calculate_route_whitefield_ecity(self):
        # 3. Whitefield -> Electronic City (East/South)
        payload = {
            "start_lat": 12.9698,
            "start_lon": 77.7499,
            "dest_lat": 12.8452,
            "dest_lon": 77.6602,
            "origin_query": "Whitefield",
            "dest_query": "Electronic City",
        }
        event = {"httpMethod": "POST", "body": json.dumps(payload)}
        resp = calculate_route.lambda_handler(event, None)
        self.assertEqual(resp["statusCode"], 200)
        body = json.loads(resp["body"])
        comp = body["routeComparison"]
        self.assertGreater(len(comp["directRoute"]["polyline"]), 10)
        self.assertGreater(comp["directRoute"]["distanceKm"], 18.0)
        self.assertGreater(comp["directRoute"]["etaMinutes"], 20)

    def test_calculate_route_kengeri_hebbal(self):
        # 4. Kengeri -> Hebbal (West/North)
        payload = {
            "start_lat": 12.9081,
            "start_lon": 77.4852,
            "dest_lat": 13.0358,
            "dest_lon": 77.5970,
            "origin_query": "Kengeri",
            "dest_query": "Hebbal",
        }
        event = {"httpMethod": "POST", "body": json.dumps(payload)}
        resp = calculate_route.lambda_handler(event, None)
        self.assertEqual(resp["statusCode"], 200)
        body = json.loads(resp["body"])
        comp = body["routeComparison"]
        self.assertGreater(len(comp["directRoute"]["polyline"]), 10)
        self.assertGreater(comp["directRoute"]["distanceKm"], 18.0)
        self.assertGreater(comp["directRoute"]["etaMinutes"], 20)

    def test_calculate_route_btm_yeshwanthpur(self):
        # 5. BTM Layout -> Yeshwanthpur (South/Northwest)
        payload = {
            "start_lat": 12.9166,
            "start_lon": 77.6101,
            "dest_lat": 13.0238,
            "dest_lon": 77.5529,
            "origin_query": "BTM Layout",
            "dest_query": "Yeshwanthpur",
        }
        event = {"httpMethod": "POST", "body": json.dumps(payload)}
        resp = calculate_route.lambda_handler(event, None)
        self.assertEqual(resp["statusCode"], 200)
        body = json.loads(resp["body"])
        comp = body["routeComparison"]
        self.assertGreater(len(comp["directRoute"]["polyline"]), 10)
        self.assertGreater(comp["directRoute"]["distanceKm"], 15.0)
        self.assertGreater(comp["directRoute"]["etaMinutes"], 18)

    def test_geocode_search_resolves_locations(self):
        # Test resolving valid localities across all regions
        for query in ["Jalahalli Cross", "Majestic", "Jakkur", "Whitefield", "Kengeri", "BTM Layout", "Devanahalli"]:
            event = {"httpMethod": "GET", "queryStringParameters": {"text": query}}
            resp = geocode_service.lambda_handler(event, None)
            self.assertEqual(resp["statusCode"], 200)
            body = json.loads(resp["body"])
            self.assertTrue(body.get("found"))
            self.assertIn("latitude", body)
            self.assertIn("longitude", body)
            self.assertTrue(12.7 <= body["latitude"] <= 13.35)
            self.assertTrue(77.3 <= body["longitude"] <= 77.9)

    def test_geocode_rejects_unknown_location(self):
        # Unknown non-existent location must return 404 / clear error, never silently substitute
        event = {"httpMethod": "GET", "queryStringParameters": {"text": "NonExistentFictionalGalaxyPlace999"}}
        resp = geocode_service.lambda_handler(event, None)
        self.assertEqual(resp["statusCode"], 404)
        body = json.loads(resp["body"])
        self.assertFalse(body.get("found"))
        self.assertIn("error", body)
        self.assertIn("Cannot resolve location", body["error"])

    def test_geocode_rejects_out_of_bounds_coords(self):
        # Coordinates outside Bengaluru must be rejected
        event = {"httpMethod": "GET", "queryStringParameters": {"text": "0.0, 0.0"}}
        resp = geocode_service.lambda_handler(event, None)
        self.assertEqual(resp["statusCode"], 400)
        body = json.loads(resp["body"])
        self.assertIn("outside Bengaluru", body["error"])

    def test_calculate_route_rejects_failed_routing(self):
        # Impossible coordinates in the middle of Indian Ocean with no road network
        payload = {
            "start_lat": 0.0,
            "start_lon": 0.0,
            "dest_lat": 0.001,
            "dest_lon": 0.001,
            "origin_name": "Ocean Point A",
            "dest_name": "Ocean Point B",
        }
        event = {"httpMethod": "POST", "body": json.dumps(payload)}
        resp = calculate_route.lambda_handler(event, None)
        # Should return 502 with clear ROUTING_FAILED error rather than fabricated routes
        self.assertIn(resp["statusCode"], [502, 400])
        body = json.loads(resp["body"])
        self.assertTrue("error" in body or "ROUTING_FAILED" in str(body))


if __name__ == "__main__":
    unittest.main()

