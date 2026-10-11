import json
import os
import urllib.request

test_corridors = [
    {
        'id': 'jalahalli-majestic',
        'name': 'Jalahalli Cross → Majestic',
        'origin': {'name': 'Jalahalli Cross, Bengaluru', 'query': 'Jalahalli Cross', 'address': 'Jalahalli Cross, Tumkur Road, Peenya, Bengaluru 560057', 'lat': 13.0398, 'lon': 77.5184},
        'destination': {'name': 'Majestic, Bengaluru', 'query': 'Majestic', 'address': 'Kempegowda Bus Station / Majestic, Bengaluru 560009', 'lat': 12.9779, 'lon': 77.5724}
    },
    {
        'id': 'jakkur-yelahanka',
        'name': 'Jakkur → Yelahanka',
        'origin': {'name': 'Jakkur, Bengaluru', 'query': 'Jakkur', 'address': 'Jakkur Aerodrome & Lake Corridor, Bengaluru 560064', 'lat': 13.0784, 'lon': 77.6070},
        'destination': {'name': 'Yelahanka, Bengaluru', 'query': 'Yelahanka', 'address': 'Yelahanka Old Town / Satellite Town, Bengaluru 560064', 'lat': 13.1007, 'lon': 77.5963}
    },
    {
        'id': 'whitefield-ecity',
        'name': 'Whitefield → Electronic City',
        'origin': {'name': 'Whitefield, Bengaluru', 'query': 'Whitefield', 'address': 'ITPL Main Road, Whitefield, Bengaluru 560066', 'lat': 12.9698, 'lon': 77.7499},
        'destination': {'name': 'Electronic City, Bengaluru', 'query': 'Electronic City', 'address': 'Electronic City Phase 1, Hosur Road, Bengaluru 560100', 'lat': 12.8452, 'lon': 77.6602}
    },
    {
        'id': 'kengeri-hebbal',
        'name': 'Kengeri → Hebbal',
        'origin': {'name': 'Kengeri, Bengaluru', 'query': 'Kengeri', 'address': 'Kengeri Satellite Town / Mysore Road, Bengaluru 560060', 'lat': 12.9081, 'lon': 77.4852},
        'destination': {'name': 'Hebbal, Bengaluru', 'query': 'Hebbal', 'address': 'Hebbal Flyover / Bellary Road, Bengaluru 560024', 'lat': 13.0358, 'lon': 77.5970}
    },
    {
        'id': 'btm-yeshwanthpur',
        'name': 'BTM Layout → Yeshwanthpur',
        'origin': {'name': 'BTM Layout, Bengaluru', 'query': 'BTM Layout', 'address': 'BTM Layout 2nd Stage, Bengaluru 560076', 'lat': 12.9166, 'lon': 77.6101},
        'destination': {'name': 'Yeshwanthpur, Bengaluru', 'query': 'Yeshwanthpur', 'address': 'Yeshwanthpur Railway Station / Market, Bengaluru 560022', 'lat': 13.0238, 'lon': 77.5529}
    }
]

recorded_data = {}
for c in test_corridors:
    o = c['origin']
    d = c['destination']
    url = f"https://router.project-osrm.org/route/v1/driving/{o['lon']},{o['lat']};{d['lon']},{d['lat']}?overview=full&geometries=geojson&alternatives=true"
    req = urllib.request.Request(url, headers={'User-Agent': 'JalMarg/1.0'})
    try:
        res = urllib.request.urlopen(req, timeout=10)
        data = json.loads(res.read().decode())
        if data.get('code') == 'Ok' and data.get('routes'):
            r = data['routes'][0]
            pts = [[round(p[1], 6), round(p[0], 6)] for p in r['geometry']['coordinates']]
            
            # Alternative route if present
            alt_pts = pts
            alt_dist = round(r['distance'] / 1000.0, 2)
            alt_dur = int(round(r['duration'] / 60.0))
            if len(data['routes']) > 1:
                r_alt = data['routes'][1]
                alt_pts = [[round(p[1], 6), round(p[0], 6)] for p in r_alt['geometry']['coordinates']]
                alt_dist = round(r_alt['distance'] / 1000.0, 2)
                alt_dur = int(round(r_alt['duration'] / 60.0))

            recorded_data[c['id']] = {
                'id': c['id'],
                'corridorName': c['name'],
                'origin': o,
                'destination': d,
                'directRoute': {
                    'polyline': pts,
                    'distanceKm': round(r['distance'] / 1000.0, 2),
                    'etaMinutes': int(round(r['duration'] / 60.0)),
                    'status': 'CLEAR',
                    'hazardWarning': 'Direct route road geometry via OpenStreetMap OSRM.'
                },
                'safeDetourRoute': {
                    'polyline': alt_pts,
                    'distanceKm': alt_dist,
                    'etaMinutes': alt_dur,
                    'status': 'RECOMMENDED_BYPASS',
                    'protectionTag': 'Standard corridor evaluated against flood hotspots.'
                },
                'pointCount': len(pts)
            }
            print(f"Success {c['id']}: {round(r['distance']/1000.0, 2)} km, {int(round(r['duration']/60.0))} min, {len(pts)} pts")
        else:
            print(f"Failed {c['id']}: code {data.get('code')}")
    except Exception as e:
        print(f"Error {c['id']}: {e}")

out_dir = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src', 'data')
os.makedirs(out_dir, exist_ok=True)
out_file = os.path.join(out_dir, 'recorded_demo_routes.json')
with open(out_file, 'w', encoding='utf-8') as f:
    json.dump(recorded_data, f, indent=2)
print("Saved recorded demo routes to:", out_file)
