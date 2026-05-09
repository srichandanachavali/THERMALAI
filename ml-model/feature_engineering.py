import pandas as pd
import numpy as np

# Load raw data
df = pd.read_csv('data/reactor_data.csv')

# Sort by reactor and timestamp
df = df.sort_values(['reactor_id', 'timestamp']).reset_index(drop=True)

print("Adding smart features...")

# Feature 1 — Rolling average temperature (last 5 readings)
df['temp_rolling_avg'] = df.groupby('reactor_id')['temperature'].transform(
    lambda x: x.rolling(window=5, min_periods=1).mean()
).round(2)

# Feature 2 — Rolling average pressure
df['pressure_rolling_avg'] = df.groupby('reactor_id')['pressure'].transform(
    lambda x: x.rolling(window=5, min_periods=1).mean()
).round(2)

# Feature 3 — Temperature acceleration (rate of rate of change)
df['temp_acceleration'] = df.groupby('reactor_id')['temp_rate_of_change'].transform(
    lambda x: x.diff().fillna(0)
).round(3)

# Feature 4 — Pressure to temperature ratio
df['pressure_temp_ratio'] = (df['pressure'] / df['temperature']).round(4)

# Feature 5 — Cooling danger score
# Low cooling + high temp = danger
df['cooling_danger'] = ((1 - df['cooling_efficiency']) * df['temperature']).round(2)

# Save enriched dataset
df.to_csv('data/reactor_data_enriched.csv', index=False)

print("✅ Feature engineering complete!")
print(f"Original features: 8")
print(f"New total features: {len(df.columns)}")
print(f"\nNew features added:")
print("  - temp_rolling_avg")
print("  - pressure_rolling_avg") 
print("  - temp_acceleration")
print("  - pressure_temp_ratio")
print("  - cooling_danger")
print(f"\nSample enriched data:")
print(df[['reactor_id', 'temperature', 'temp_rolling_avg', 
          'cooling_danger', 'label']].head(10))