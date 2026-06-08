# SmartTrafficPrediction
🚦 Smart Traffic Monitoring & Prediction System

Sistem pemantauan lalu lintas berbasis CCTV + Computer Vision + Data Analytics yang menampilkan kondisi lalu lintas real-time, historis, serta prediksi 1 jam ke depan, dilengkapi public map dan admin dashboard.

Project ini dirancang untuk:

Analisis kepadatan lalu lintas perkotaan

Decision support system (routing & warning)

Demonstrasi penerapan Big Data & AI dalam transportasi

📌 Fitur Utama 🌍 Public Map

Peta interaktif berbasis Leaflet

Marker CCTV dengan status lalu lintas (Normal / Waspada / Padat)

Routing dengan TomTom Traffic API

ETA & jarak rute

Prediksi 1 jam ke depan saat routing

📊 Traffic Analytics

Perbandingan Now vs Usual

Now: data kendaraan real-time

Usual: rata-rata kendaraan pada jam yang sama selama 7 hari terakhir

Grafik Traffic Stability & Volatility

Deteksi kondisi Normal / Waspada / Unusual

🔮 Traffic Prediction (1 Hour Ahead)

Prediksi berbasis:

Pola historis

Tren jam serupa

Volatilitas lalu lintas

Output:

Label (Diperkirakan Lancar / Berpotensi Padat / Berpotensi Macet)

Confidence level (LOW / MEDIUM / HIGH)

Persentase perubahan

🛠️ Admin Dashboard

Manajemen CCTV (Add / Edit)

Live vehicle counting (YOLO-based)

Snapshot monitoring

Activity trend (30m, 1h, 6h, 12h, 24h)

Statistik kendaraan (Total / Mobil / Motor)

🧠 Arsitektur Sistem CCTV Stream ↓ Computer Vision (YOLO) ↓ Vehicle Count (per interval) ↓ Database (Traffic Logs) ↓ API Backend (Flask/FastAPI) ↓ Frontend (React)

🧪 Tech Stack Frontend

React.js

Leaflet + React-Leaflet

Recharts

Tailwind CSS

Axios

Backend

Python (Flask / FastAPI)

OpenCV

YOLO (Vehicle Detection)

REST API

Database

PostgreSQL / MySQL / SQLite

Traffic logs (time-series)

External API

TomTom Routing & Traffic API

🔗 API Endpoint Utama CCTV & Traffic GET /api/cctv_status GET /api/traffic-history/{location_id}?range=1h GET /api/now-vs-usual/{location_id}

Prediction GET /api/predict-next-hour/{location_id}

Response contoh:

{ "now": 12, "predicted": 11, "label": "Diperkirakan Lancar", "status": "SMOOTH", "change_percent": -8.3, "confidence": "HIGH", "note": "Prediksi berbasis pola historis dan tren jam serupa" }

📈 Logika Now vs Usual

Now

Diambil dari hasil vehicle detection terbaru (real-time)

Usual

Rata-rata kendaraan:

Jam yang sama

Dalam rentang 7 hari terakhir

Digunakan untuk:

Deteksi anomali

Penentuan status Normal / Waspada

⚠️ Logika Status “Waspada”

Status Waspada muncul jika:

Now > Usual + threshold

Contoh:

Now = 16

Usual = 12

Kenaikan signifikan → Waspada

Tujuan:

Memberi early warning sebelum macet

Bukan kondisi macet penuh, tapi di atas pola normal

🧭 Routing Decision Logic ETA (menit) Status ≤ 12 Direkomendasikan 13–20 Perlu Pertimbangan

20 Tidak Disarankan

Ditambah:

Prediksi 1 jam ke depan

Rekomendasi sistem otomatis

🗂️ Struktur Project (Simplified) /frontend ├── src/ │ ├── pages/ │ │ ├── PublicMap.jsx │ │ └── Admin.jsx │ ├── components/ │ └── utils/ └── package.json

/backend ├── app.py ├── routes/ ├── models/ ├── services/ │ ├── prediction.py │ └── traffic_analysis.py └── requirements.txt

🚀 Cara Menjalankan Backend pip install -r requirements.txt python app.py

Frontend npm install npm start

🎯 Use Case

Smart City Traffic Management

Academic Research (Big Data / AI)

Traffic Decision Support System

Portfolio Project (Computer Vision + Data)
