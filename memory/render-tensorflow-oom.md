---
name: render-tensorflow-oom
description: Full tensorflow (~500 MB) OOMs Render free-tier builds; ML service must use tensorflow-cpu or lazy alternatives
metadata:
  type: project
---

Full `tensorflow` (~500 MB with GPU deps) exhausts Render's free-tier build memory,
causing the ML API container to OOM on startup or during the build step.

**Why:** Render free tier allocates limited RAM for builds. Full tensorflow pulls GPU
libraries that are never used (no GPU available on free tier). The model files (lstm_model.h5)
are Keras/TF format but can be served with `tensorflow-cpu` which is ~200 MB smaller.

**How to apply:** When modifying `ml-model/requirements.txt`, always use `tensorflow-cpu`
(not `tensorflow`) and pin a specific version (e.g. `tensorflow-cpu==2.15.0`).
Never add `tensorflow` (full package) back without a paid Render plan.
See `context/known-issues.md` issue #1 for full fix options.
