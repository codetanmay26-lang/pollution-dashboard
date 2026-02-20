import pandas as pd
import geopandas as gpd

BASE = "data/"

def load_aqi():
    return pd.read_csv(BASE + "aqi.csv")

def load_roads():
    return gpd.read_file(BASE + "traffic.geojson")

def load_industry():
    return gpd.read_file(BASE + "industry.geojson")
