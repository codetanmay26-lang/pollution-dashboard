import geopandas as gpd
from .load_data import load_roads, load_aqi

def compute_traffic_score():
    roads = load_roads()
    aqi = load_aqi()

    roads["weight"] = roads["highway"].map({
        "motorway": 3,
        "primary": 2,
        "secondary": 1
    }).fillna(0)

    # spatially attach roads to nearest station
    roads = roads.to_crs("EPSG:4326")
    stations = gpd.GeoDataFrame(
        aqi.drop_duplicates("station"),
        geometry=gpd.points_from_xy(aqi.longitude, aqi.latitude),
        crs="EPSG:4326"
    )

    joined = gpd.sjoin_nearest(stations, roads)
    score = joined.groupby("station")["weight"].sum()

    score = (score - score.min()) / (score.max() - score.min())
    return score.reset_index(name="traffic_score")
