import pandas as pd

df = pd.read_csv('data/reactor_data.csv')

print('=== DATA VALIDATION ===')
print(f'Total rows: {len(df)}')
print(f'Missing values: {df.isnull().sum().sum()}')
print(f'Columns: {list(df.columns)}')
print(f'Labels: {df["label"].value_counts().to_dict()}')
print(f'Reactors: {df["reactor_id"].unique()}')
print(f'Duplicate rows: {df.duplicated().sum()}')
print('=== ALL GOOD ===')