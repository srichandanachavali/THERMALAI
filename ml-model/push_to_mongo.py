import pandas as pd
from pymongo import MongoClient
from dotenv import dotenv_values
import os
import sys

# Load env from backend folder
env_path = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
config = dotenv_values(env_path)

MONGO_URI = config.get('MONGO_URI')

if not MONGO_URI:
    print("❌ MONGO_URI not found!")
    sys.exit(1)

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client['thermalai']
collection = db['reactor_readings']

# Load CSV
df = pd.read_csv('data/reactor_data.csv')
records = df.to_dict('records')

# Clear old data and insert fresh
collection.delete_many({})
collection.insert_many(records)

print(f"✅ Pushed {len(records)} records to MongoDB!")
print(f"Database: thermalai")
print(f"Collection: reactor_readings")