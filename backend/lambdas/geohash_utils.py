"""
Lightweight zero-dependency geohash implementation for geospatial indexing in DynamoDB.
"""

BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"
BITS = [16, 8, 4, 2, 1]


def encode_geohash(latitude: float, longitude: float, precision: int = 5) -> str:
    """
    Encodes lat/lon into standard base32 geohash of given precision.
    Precision 5 covers ~4.9km x 4.9km urban grid.
    """
    lat_interval = [-90.0, 90.0]
    lon_interval = [-180.0, 180.0]
    geohash = []
    bits = 0
    ch = 0
    even = True

    while len(geohash) < precision:
        if even:
            mid = (lon_interval[0] + lon_interval[1]) / 2.0
            if longitude > mid:
                ch |= BITS[bits]
                lon_interval[0] = mid
            else:
                lon_interval[1] = mid
        else:
            mid = (lat_interval[0] + lat_interval[1]) / 2.0
            if latitude > mid:
                ch |= BITS[bits]
                lat_interval[0] = mid
            else:
                lat_interval[1] = mid

        even = not even
        if bits < 4:
            bits += 1
        else:
            geohash.append(BASE32[ch])
            bits = 0
            ch = 0

    return "".join(geohash)
