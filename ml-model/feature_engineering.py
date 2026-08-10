import sys

import numpy as np
import pandas as pd

# Windows cp1252 console crashes on emoji in print() — force UTF-8 output.
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except (AttributeError, ValueError):
    pass

# Load raw data (sorted per reactor so rolling windows are time-ordered).
df = pd.read_csv('data/reactor_data.csv')
df = df.sort_values(['reactor_id', 'timestamp']).reset_index(drop=True)

ROLLING_WINDOW = 10
g = df.groupby('reactor_id')

# ---- BASE SENSORS (10) are already columns on the raw CSV ----

# ---- ROLLING STATISTICS (20-reading source, 10-reading feature window) ----
# temp_rolling_avg / pressure_rolling_avg: existing rolling means.
df['temp_rolling_avg'] = g['temperature'].transform(
    lambda x: x.rolling(window=ROLLING_WINDOW, min_periods=1).mean()
).round(3)
df['pressure_rolling_avg'] = g['pressure'].transform(
    lambda x: x.rolling(window=ROLLING_WINDOW, min_periods=1).mean()
).round(3)
# temp_rolling_std — temperature variance is an instability indicator.
df['temp_rolling_std'] = g['temperature'].transform(
    lambda x: x.rolling(window=ROLLING_WINDOW, min_periods=1).std()
).round(3).fillna(0.0)
# cooling_rolling_min — worst cooling seen in the last 10 readings.
df['cooling_rolling_min'] = g['cooling_efficiency'].transform(
    lambda x: x.rolling(window=ROLLING_WINDOW, min_periods=1).min()
).round(3)

# ---- PHYSICS-DERIVED FEATURES ----
# temp_acceleration: rate of rate of change.
df['temp_acceleration'] = g['temp_rate_of_change'].transform(
    lambda x: x.diff().fillna(0)
).round(4)

# cooling_danger: high when cooling fails AND temp is high.
df['cooling_danger'] = (
    (1 - df['cooling_efficiency']) * df['temperature']
).round(3)

# heat_removal_proxy: approximated heat-removal capacity (kW).
df['heat_removal_proxy'] = (
    df['flow_rate'] * df['cooling_efficiency'] * 0.012
).round(3)

# runaway_proximity_nitration: 0 -> 1 as temp nears the nitration runaway band.
df['runaway_proximity_nitration'] = (
    (df['temperature'] - 130.0) / 20.0
).clip(lower=0.0).round(4)

# pressure_temp_ratio: abnormal if temp drops but pressure doesn't (gas buildup).
df['pressure_temp_ratio'] = (
    df['pressure'] / df['temperature'].clip(lower=1.0)
).round(4)

# ph_deviation: distance from neutral — corrosive / reactive conditions.
df['ph_deviation'] = (df['ph_level'] - 7.0).abs().round(3)

# gas_risk: normalized gas concentration (0 = safe, 1 = abort threshold).
df['gas_risk'] = (df['gas_concentration'] / 500.0).clip(upper=1.0).round(4)

# material_criticality: binary flag for tank boundary conditions.
df['material_criticality'] = (
    (df['material_level'] < 10) | (df['material_level'] > 92)
).astype(int)

df.to_csv('data/reactor_data_enriched.csv', index=False)

print("Feature engineering complete (v2.0).")
print(f"Raw columns (base sensors): {len(df.columns)}")
print(f"Total columns incl label: {len(df.columns)}")
print("\nLabel distribution:")
print(df['label'].value_counts().to_dict())
print(f"\nSaved to data/reactor_data_enriched.csv")
