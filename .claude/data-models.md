# ThermalAI — Data Models

## MongoDB Collections

### reactors
Schema: `backend/models/Reactor.js`

```javascript
{
  reactor_id:          String   // required — "A", "B", "C", "D", "E"
  temperature:         Number   // °C
  pressure:            Number   // bar
  reaction_rate:       Number   // 0.0–1.0
  cooling_efficiency:  Number   // 0.0–1.0
  temp_rate_of_change: Number   // °C per cycle
  risk_score:          Number   // 0–100 (ensemble: RF*0.4 + LSTM*0.6)
  status:              String   // enum: "SAFE" | "WARNING" | "CRITICAL"
  timestamp:           Date     // default: Date.now
}
```

Extra fields added by reactorController (not in schema, stored with document):
- `rf_score` — Random Forest score only
- `lstm_score` — LSTM score only
- `lstm_confidence` — LSTM confidence %
- `lstm_prediction` — LSTM label: SAFE/WARNING/CRITICAL
- `minutes_to_critical` — ETA float
- `time_message` — human-readable ETA string
- `time_urgency` — SAFE/CAUTION/WARNING/CRITICAL

**Query patterns**:
- Latest per reactor: `Reactor.findOne({ reactor_id }).sort({ timestamp: -1 })`
- History: `Reactor.find({ reactor_id }).sort({ timestamp: -1 }).limit(50)`
- All latest: aggregate or find all then group by reactor_id

---

### alerts
Schema: `backend/models/Alert.js`

```javascript
{
  reactor_id:  String   // required
  alert_type:  String   // enum: "WARNING" | "CRITICAL"
  risk_score:  Number   // 0–100
  temperature: Number
  pressure:    Number
  message:     String
  resolved:    Boolean  // default: false
  timestamp:   Date
}
```

**Query patterns**:
- All alerts: `Alert.find().sort({ timestamp: -1 }).limit(50)`
- Resolve: `Alert.findByIdAndUpdate(id, { resolved: true }, { new: true })`

---

### users
Schema: `backend/models/User.js`

```javascript
{
  username:  String   // required, unique
  password:  String   // required, bcrypt-hashed (pre-save hook)
  role:      String   // enum: "operator" | "admin", default: "operator"
  name:      String
  createdAt: Date     // default: Date.now
}
```

Instance methods:
- `user.comparePassword(candidate)` → Promise<boolean> (uses bcrypt.compare)

Seeded on first startup by `seedDefaultUsers()` in `authController.js`:
- `admin` / `admin123` / role: admin / name: "Plant Administrator"
- `operator` / `op123` / role: operator / name: "Plant Operator"

---

### Plant Configuration (hardcoded in backend)
Not a MongoDB collection — defined in `backend/Plant.js` or inline in `plantRoutes.js`.

```javascript
{
  plant_id:    String   // "PLANT_ALPHA" | "PLANT_BETA" | "PLANT_GAMMA"
  name:        String   // "Alpha Chemical Works"
  location:    String
  city:        String   // "Hyderabad" | "Mumbai" | "Chennai"
  state:       String
  type:        String   // "Chemical" | "Pharma" | "Refinery"
  reactors:    [String] // ["A","B"] | ["C","D"] | ["E"]
  established: Number   // year
}
```

| plant_id | name | city | reactors |
|---------|------|------|---------|
| PLANT_ALPHA | Alpha Chemical Works | Hyderabad | A, B |
| PLANT_BETA | Beta Pharma Industries | Mumbai | C, D |
| PLANT_GAMMA | Gamma Refinery Ltd | Chennai | E |

---

## CSV Data Files (ML training)

### ml-model/data/reactor_data.csv (raw — 8 columns)
```
reactor_id, timestamp, temperature, pressure, reaction_rate,
cooling_efficiency, temp_rate_of_change, label
```

### ml-model/data/reactor_data_enriched.csv (feature-engineered — 13 columns)
Adds: temp_rolling_avg, pressure_rolling_avg, temp_acceleration,
pressure_temp_ratio, cooling_danger

### ml-model/data/lstm/ (numpy arrays for LSTM training)
- `X_train.npy`, `X_val.npy`, `X_test.npy` — shape: (N, 10, 10)
- `y_train.npy`, `y_val.npy`, `y_test.npy` — one-hot encoded labels
