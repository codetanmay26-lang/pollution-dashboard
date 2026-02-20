import geopandas as gpd
from .load_data import load_industry, load_aqi

def compute_industrial_score():
    industry = load_industry()
    aqi = load_aqi()

    stations = gpd.GeoDataFrame(
        aqi.drop_duplicates("station"),
        geometry=gpd.points_from_xy(aqi.longitude, aqi.latitude),
        crs="EPSG:4326"
    )

    joined = gpd.sjoin_nearest(stations, industry)
    score = joined.groupby("station").size()

    score = (score - score.min()) / (score.max() - score.min())
    return score.reset_index(name="industrial_score")
