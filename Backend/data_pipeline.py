import pandas as pd
import geopandas as gpd
import json
from shapely.geometry import shape
from shapely.validation import make_valid
import warnings
warnings.filterwarnings('ignore')

print("🗺️  WARD-LEVEL AQI PIPELINE (WITH NAME FIX)\n")

# ===========================
# 1. FIX WARD GEOMETRIES & NAMES
# ===========================
print("🔧 Loading and fixing ward data...")

with open('data/delhi_wards.geojson', 'r', encoding='utf-8') as f:
    ward_data = json.load(f)

fixed_features = []
for i, feature in enumerate(ward_data['features']):
    try:
        # Fix geometry
        geom = shape(feature['geometry'])
        fixed_geom = make_valid(geom)
        feature['geometry'] = fixed_geom.__geo_interface__
        
        # Fix name: use name if exists, otherwise use @id or create ward_ID
        props = feature['properties']
        if 'name' not in props or not props['name']:
            # Extract ID from @id (e.g., "relation/3538431" -> "Ward_3538431")
            osm_id = props.get('@id', f'ward_{i}')
            if '/' in osm_id:
                ward_id = osm_id.split('/')[-1]
            else:
                ward_id = str(i)
            props['name'] = f"Ward_{ward_id}"
        
        fixed_features.append(feature)
    except Exception as e:
        print(f"   ⚠️  Skipped invalid feature {i}: {e}")

wards = gpd.GeoDataFrame.from_features(fixed_features, crs="EPSG:4326")
wards['name'] = wards['name'].astype(str)

print(f"   ✅ Loaded {len(wards)} wards")
print(f"   ✅ All wards now have identifiers\n")

# ===========================
# 2. LOAD STATION DATA
# ===========================
aqi = pd.read_csv('data/aqi.csv')
aqi_stations = aqi.groupby(['location', 'lat', 'lon'], as_index=False).agg({
    'aqi_index': 'mean',
    'pm2_5': 'mean',
    'pm10': 'mean',
    'co': 'mean',
    'no2': 'mean'
}).rename(columns={'aqi_index': 'avg_AQI'})

stations = gpd.GeoDataFrame(
    aqi_stations,
    geometry=gpd.points_from_xy(aqi_stations['lon'], aqi_stations['lat']),
    crs="EPSG:4326"
)
print(f"✅ Loaded {len(stations)} monitoring stations")

# ===========================
# 3. ASSIGN NEAREST STATION
# ===========================
print("\n🔍 Assigning nearest station to each ward...")

wards['centroid'] = wards.geometry.centroid
wards['area_sqkm'] = wards.to_crs("EPSG:32643").geometry.area / 1e6

ward_centroids = gpd.GeoDataFrame(
    wards[['name', 'area_sqkm']],
    geometry=wards['centroid'],
    crs=wards.crs
).to_crs("EPSG:32643")

stations_proj = stations.to_crs("EPSG:32643")

ward_with_station = gpd.sjoin_nearest(
    ward_centroids,
    stations_proj[['location', 'geometry', 'avg_AQI', 'pm2_5', 'pm10', 'co', 'no2']],
    how='left',
    distance_col='distance_meters'
)

ward_with_station['distance_km'] = ward_with_station['distance_meters'] / 1000
print(f"   ✅ Assigned {len(ward_with_station)} wards to {ward_with_station['location'].nunique()} stations")

# ===========================
# 4. TRAFFIC SCORING
# ===========================
print("\n🚗 Calculating traffic scores...")

traffic = gpd.read_file('data/traffic.geojson').to_crs("EPSG:32643")
wards_proj = wards.to_crs("EPSG:32643")

ward_buffers = wards_proj.copy()
ward_buffers['geometry'] = ward_buffers.geometry.buffer(2000)

traffic_in_wards = gpd.sjoin(
    ward_buffers[['name', 'geometry']],
    traffic[['highway', 'geometry']],
    how='left',
    predicate='intersects'
)

road_weights = {
    'motorway': 3, 'motorway_link': 3, 'trunk': 3, 'trunk_link': 3,
    'primary': 2, 'primary_link': 2,
    'secondary': 1, 'secondary_link': 1, 'tertiary': 1
}
traffic_in_wards['weight'] = traffic_in_wards['highway'].map(road_weights).fillna(0)

ward_traffic = traffic_in_wards.groupby('name', as_index=False)['weight'].sum()
ward_traffic.columns = ['name', 'traffic_raw']
print(f"   ✅ Scored {len(ward_traffic)} wards")

# ===========================
# 5. INDUSTRIAL SCORING
# ===========================
print("\n🏭 Calculating industrial scores...")

industry = gpd.read_file('data/industry.geojson').to_crs("EPSG:32643")

industry_in_wards = gpd.sjoin(
    ward_buffers[['name', 'geometry']],
    industry[['geometry']],
    how='left',
    predicate='intersects'
)

ward_industrial = industry_in_wards.groupby('name', as_index=False).size()
ward_industrial.columns = ['name', 'industrial_count']
print(f"   ✅ Scored {len(ward_industrial)} wards")

# ===========================
# 6. MERGE & FINALIZE
# ===========================
print("\n🔗 Creating final dataset...")

final = ward_with_station.copy()
final = final.merge(ward_traffic, on='name', how='left')
final = final.merge(ward_industrial, on='name', how='left')
final = final.fillna(0)

# Normalize to percentages
final['vehicular_pct'] = (final['traffic_raw'] / final['traffic_raw'].max()) * 100 if final['traffic_raw'].max() > 0 else 0
final['industrial_pct'] = (final['industrial_count'] / final['industrial_count'].max()) * 100 if final['industrial_count'].max() > 0 else 0

# Select columns
final = final[['name', 'location', 'distance_km', 'area_sqkm',
               'avg_AQI', 'pm2_5', 'pm10', 'co', 'no2',
               'traffic_raw', 'industrial_count',
               'vehicular_pct', 'industrial_pct']]

# Sort by name
final = final.sort_values('name').reset_index(drop=True)

# Save
final.to_csv('data/ward_level_aqi_complete.csv', index=False)
print(f"💾 Saved: data/ward_level_aqi_complete.csv\n")

print("="*95)
print("📊 SAMPLE: First 15 Wards")
print("="*95)
print(final.head(15).to_string(index=False))

print("\n" + "="*95)
print("📈 STATISTICS")
print("="*95)
print(final[['distance_km', 'avg_AQI', 'pm2_5', 'traffic_raw', 'industrial_count',
             'vehicular_pct', 'industrial_pct']].describe().round(2))

print(f"\n✅ SUCCESS! Generated AQI data for {len(final)} Delhi wards")
print(f"   • Named wards: {len([n for n in final['name'] if not n.startswith('Ward_')])}")
print(f"   • Auto-named wards: {len([n for n in final['name'] if n.startswith('Ward_')])}")
