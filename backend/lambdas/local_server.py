"""
Standalone zero-dependency local development server for JalMarg API.
Translates HTTP requests into AWS Lambda proxy events and routes to:
- ingest_report.lambda_handler
- get_hazards.lambda_handler
- calculate_route.lambda_handler
Runs on http://localhost:5000
"""

import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

import ingest_report
import get_hazards
import calculate_route
import dynamo_store
import geocode_service

PORT = 5000


class JalMargLambdaBridgeHandler(BaseHTTPRequestHandler):
    def _handle_request(self):
        parsed = urlparse(self.path)
        path = parsed.path
        raw_query = parse_qs(parsed.query)
        query_params = {k: v[0] if len(v) == 1 else v for k, v in raw_query.items()}

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else None

        headers_dict = {k: v for k, v in self.headers.items()}
        event = {
            "httpMethod": self.command,
            "path": path,
            "rawPath": path,
            "queryStringParameters": query_params,
            "headers": headers_dict,
            "body": body,
            "requestContext": {
                "http": {
                    "method": self.command,
                    "path": path
                }
            }
        }

        # Route matching
        if self.command == "OPTIONS":
            result = {
                "statusCode": 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
                    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
                },
                "body": json.dumps({"message": "CORS preflight OK"}),
            }
        elif path == "/health" or path == "/":
            result = {
                "statusCode": 200,
                "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
                "body": json.dumps({"service": "JalMarg Urban Flood API", "status": "healthy"}),
            }
        elif path in ("/hazards/photo", "/hazards/delete-photo"):
            # Delete photo from hazard while keeping report
            req_data = {}
            if body:
                try:
                    req_data = json.loads(body)
                except Exception:
                    req_data = {}
            h_id = req_data.get("id") or query_params.get("id")
            updated = dynamo_store.delete_hazard_photo(h_id) if h_id else None
            result = {
                "statusCode": 200 if updated else 404,
                "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
                "body": json.dumps(updated or {"error": "Hazard not found"}),
            }
        elif path == "/hazards":
            if self.command == "POST":
                result = ingest_report.lambda_handler(event, None)
            elif self.command == "DELETE":
                req_data = {}
                if body:
                    try:
                        req_data = json.loads(body)
                    except Exception:
                        req_data = {}
                h_id = req_data.get("id") or query_params.get("id")
                ok = dynamo_store.delete_hazard(h_id) if h_id else False
                result = {
                    "statusCode": 200 if ok else 404,
                    "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
                    "body": json.dumps({"deleted": ok, "id": h_id}),
                }
        elif path == "/geocode/autocomplete":
            query = query_params.get("text") or query_params.get("q") or ""
            data = geocode_service.handle_autocomplete(query)
            result = {
                "statusCode": 200,
                "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
                "body": json.dumps(data),
            }
        elif path == "/geocode/search":
            query = query_params.get("text") or query_params.get("q") or ""
            data = geocode_service.handle_search(query)
            status = 200 if data.get("success") else 400
            result = {
                "statusCode": status,
                "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
                "body": json.dumps(data),
            }
        elif path == "/route":
            result = calculate_route.lambda_handler(event, None)
        else:
            result = {
                "statusCode": 404,
                "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
                "body": json.dumps({"error": f"Route not found: {self.command} {path}"}),
            }

        status_code = result.get("statusCode", 500)
        res_headers = result.get("headers", {})
        res_body = result.get("body", "")

        try:
            self.send_response(status_code)
            for h_key, h_val in res_headers.items():
                self.send_header(h_key, h_val)
            self.end_headers()

            if isinstance(res_body, str):
                self.wfile.write(res_body.encode("utf-8"))
            elif isinstance(res_body, (dict, list)):
                self.wfile.write(json.dumps(res_body).encode("utf-8"))
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError, OSError):
            pass

    def do_GET(self):
        self._handle_request()

    def do_POST(self):
        self._handle_request()

    def do_DELETE(self):
        self._handle_request()

    def do_OPTIONS(self):
        self._handle_request()

    def log_message(self, format, *args):
        print(f"[JalMarg-API] {self.command} {self.path} -> {args[1]}")


def run():
    server = HTTPServer(("127.0.0.1", PORT), JalMargLambdaBridgeHandler)
    print("==================================================")
    print(" JalMarg Local Backend Server Running")
    print(f" URL: http://127.0.0.1:{PORT}")
    print(" Endpoints:")
    print("   GET  /health")
    print("   GET  /hazards")
    print("   POST /hazards")
    print("   POST /route")
    print("==================================================")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down local server.")
        server.server_close()


if __name__ == "__main__":
    run()
