# 📄 PDF Merger Indonesia

> **Gabungkan PDF & Gambar menjadi satu file PDF — Online, Gratis, Cepat, Mudah.**  
> Atur urutan dokumen sesuka hati dengan drag & drop. Tanpa install, tanpa daftar.

---

## ✨ Fitur

| Fitur | Keterangan |
|---|---|
| 📂 Upload Mudah | Drag & drop atau klik pilih file |
| 🔄 Atur Urutan | Seret baris untuk mengubah urutan dokumen |
| 🖼️ Support Gambar | JPG, PNG, BMP, GIF, TIFF, WEBP otomatis dikonversi ke PDF |
| ✏️ Nama Output | Bisa custom nama file hasil merge |
| 📋 Log Proses | Tampilkan status setiap file saat diproses |
| ⬇️ Download Langsung | Unduh hasil PDF setelah merge selesai |
| 🔒 Auto-Cleanup | File dihapus otomatis dari server setelah 1 jam |
| ☕ Donasi DANA | Tombol donasi terintegrasi untuk mendukung layanan |
| 🔍 SEO Siap | Meta tags, Schema JSON-LD, sitemap.xml, robots.txt |

---

## 🗂️ Struktur Project

```
MERGE/
├── app.py                  ← Flask backend (routes, merge logic)
├── merge_dokumen.py        ← Script CLI standalone (tanpa web)
├── requirements.txt        ← Python dependencies
├── Procfile                ← Konfigurasi deploy (Heroku / Railway)
│
├── templates/
│   └── index.html          ← Halaman utama UI (Jinja2 template)
│
├── static/
│   ├── css/
│   │   └── style.css       ← Stylesheet modern
│   ├── js/
│   │   └── main.js         ← Logic frontend (upload, sort, merge)
│   └── img/
│       ├── favicon.svg     ← Ikon tab browser
│       └── og-banner.png   ← Thumbnail Open Graph (WhatsApp, FB)
│
├── uploads/                ← Temp: file yang diupload user (auto-delete)
└── results/                ← Temp: file hasil merge (auto-delete)
```

---

## 🚀 Cara Jalankan Lokal

### 1. Clone / Download project

```bash
cd /path/to/MERGE
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Jalankan server

```bash
python app.py
```

### 4. Buka browser

```
http://localhost:5000
```

---

## ☁️ Deploy ke Server

### 🟣 Railway / Render / Heroku

Project sudah siap deploy. Cukup push ke Git:

```bash
git init
git add .
git commit -m "Initial commit"
# Hubungkan ke Railway / Render / Heroku via dashboard
```

`Procfile` sudah tersedia:

```
web: gunicorn app:app --workers 2 --bind 0.0.0.0:$PORT --timeout 120
```

### 🟠 VPS Ubuntu + Nginx (Lengkap)

Panduan lengkap ada di bagian [Deploy Ubuntu + Nginx](#-deploy-ubuntu--nginx-panduan-lengkap) di bawah.

### 🐳 Docker *(opsional)*

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["gunicorn", "app:app", "--workers", "2", "--bind", "0.0.0.0:8080"]
```

```bash
docker build -t pdf-merger .
docker run -p 80:8080 pdf-merger
```

---

## 🔧 Konfigurasi

Edit variabel berikut di `app.py` sesuai kebutuhan:

```python
MAX_MB      = 50      # Ukuran maksimum file upload (MB)
SESSION_TTL = 3600    # Waktu simpan file di server (detik) — default 1 jam
```

---

## 🛠️ Teknologi yang Digunakan

| Komponen | Library / Tools |
|---|---|
| Backend | [Flask](https://flask.palletsprojects.com/) 3.x |
| PDF Processing | [pypdf](https://pypdf.readthedocs.io/) 4.x |
| Image Processing | [Pillow](https://pillow.readthedocs.io/) 10.x |
| Production Server | [Gunicorn](https://gunicorn.org/) |
| Frontend Drag & Drop | [SortableJS](https://sortablejs.github.io/Sortable/) |
| Icons | [Font Awesome](https://fontawesome.com/) 6 |

---

## 📋 Format File yang Didukung

| Tipe | Ekstensi |
|---|---|
| Dokumen | `.pdf` |
| Gambar | `.jpg` `.jpeg` `.png` `.bmp` `.gif` `.tiff` `.tif` `.webp` |

---

## 🔍 SEO

Website ini sudah dilengkapi optimasi mesin pencari:

- ✅ **Meta tags** lengkap (title, description, keywords)
- ✅ **Open Graph** — preview thumbnail di WhatsApp & Facebook
- ✅ **Twitter Card** — preview di Twitter/X
- ✅ **Schema.org JSON-LD** — `WebApplication` + `FAQPage` (Rich Result Google)
- ✅ **sitemap.xml** — `https://yourdomain.com/sitemap.xml`
- ✅ **robots.txt** — `https://yourdomain.com/robots.txt`
- ✅ **Konten SEO** — Cara pakai, FAQ, format file, keyword cloud

### Setelah Deploy — Daftarkan ke Google:

1. Buka [Google Search Console](https://search.google.com/search-console)
2. Tambahkan domain Anda
3. Submit sitemap: `https://yourdomain.com/sitemap.xml`
4. Klik **Request Indexing** pada URL utama

---

## 💡 Penggunaan CLI (Tanpa Web)

Tersedia juga script `merge_dokumen.py` untuk digunakan langsung via terminal:

```bash
python merge_dokumen.py
```

Atau edit konfigurasi manual di dalam file:

```python
FILES_URUTAN = [
    "dokumen1.pdf",
    "foto-ktp.jpg",
    "dokumen2.pdf",
]
OUTPUT_FILE = "HASIL_MERGE.pdf"
```

---

## ☕ Donasi

Jika proyek ini bermanfaat, traktir satu kopi ya! 🙏

| | |
|---|---|
| **Platform** | DANA |
| **Nomor** | 0822-8319-8216 |
| **Atas Nama** | Asep Trisna Setiawan |

---

## 🐧 Deploy Ubuntu + Nginx (Panduan Lengkap)

Panduan ini menggunakan **Ubuntu 22.04 LTS**, **Python 3.12**, **Gunicorn**, dan **Nginx** sebagai reverse proxy dengan domain dan HTTPS gratis via Certbot.

### Prasyarat
- VPS Ubuntu 22.04 dengan akses root/sudo
- Domain sudah diarahkan ke IP VPS (DNS A record)

---

### 1. Update sistem & install dependencies

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx git
```

---

### 2. Upload project ke server

```bash
# Dari lokal — copy via SCP
scp -r /path/to/MERGE user@IP_SERVER:/var/www/pdf-merger

# ATAU clone dari GitHub
cd /var/www
sudo git clone https://github.com/USERNAME/pdf-merger.git
sudo chown -R $USER:$USER /var/www/pdf-merger
```

---

### 3. Buat virtual environment & install package

```bash
cd /var/www/pdf-merger
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
```

---

### 4. Buat systemd service (agar otomatis berjalan)

```bash
sudo nano /etc/systemd/system/pdf-merger.service
```

Isi dengan:

```ini
[Unit]
Description=PDF Merger - Gunicorn App
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/pdf-merger
Environment="PATH=/var/www/pdf-merger/venv/bin"
ExecStart=/var/www/pdf-merger/venv/bin/gunicorn \
          --workers 3 \
          --bind 127.0.0.1:8080 \
          --timeout 120 \
          --access-logfile /var/log/pdf-merger/access.log \
          --error-logfile /var/log/pdf-merger/error.log \
          app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Buat folder log
sudo mkdir -p /var/log/pdf-merger
sudo chown www-data:www-data /var/log/pdf-merger

# Set kepemilikan folder project
sudo chown -R www-data:www-data /var/www/pdf-merger

# Aktifkan & jalankan service
sudo systemctl daemon-reload
sudo systemctl enable pdf-merger
sudo systemctl start pdf-merger

# Cek status
sudo systemctl status pdf-merger
```

---

### 5. Konfigurasi Nginx

```bash
sudo nano /etc/nginx/sites-available/pdf-merger
```

Isi dengan (ganti `yourdomain.com`):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Ukuran upload maksimum (sesuaikan dengan MAX_MB di app.py)
    client_max_body_size 55M;

    # Logging
    access_log /var/log/nginx/pdf-merger-access.log;
    error_log  /var/log/nginx/pdf-merger-error.log;

    # Static files langsung dari Nginx (lebih cepat)
    location /static/ {
        alias /var/www/pdf-merger/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Teruskan semua request ke Gunicorn
    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
```

```bash
# Aktifkan konfigurasi
sudo ln -s /etc/nginx/sites-available/pdf-merger /etc/nginx/sites-enabled/

# Test konfigurasi Nginx
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

### 6. HTTPS gratis dengan Certbot (SSL)

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Ikuti instruksi — Certbot akan otomatis mengupdate konfigurasi Nginx dengan HTTPS.  
Sertifikat diperbarui otomatis setiap 90 hari.

```bash
# Test auto-renewal
sudo certbot renew --dry-run
```

---

### 7. Perintah berguna setelah deploy

```bash
# Cek status aplikasi
sudo systemctl status pdf-merger

# Restart aplikasi (setelah update kode)
sudo systemctl restart pdf-merger

# Lihat log error
sudo journalctl -u pdf-merger -f

# Lihat log Nginx
sudo tail -f /var/log/nginx/pdf-merger-error.log

# Update kode dari GitHub
cd /var/www/pdf-merger
sudo git pull
source venv/bin/activate
pip install -r requirements.txt
deactivate
sudo systemctl restart pdf-merger
```

---

### ✅ Checklist Deploy

- [ ] Domain diarahkan ke IP VPS (DNS sudah propagasi)
- [ ] Service `pdf-merger` berjalan (`systemctl status pdf-merger`)
- [ ] Nginx aktif dan konfigurasi valid (`nginx -t`)
- [ ] HTTPS aktif via Certbot
- [ ] Daftarkan sitemap ke [Google Search Console](https://search.google.com/search-console): `https://yourdomain.com/sitemap.xml`

---

## 📄 Lisensi

Proyek ini dibuat untuk keperluan pribadi dan pendidikan.  
Bebas digunakan dan dimodifikasi sesuai kebutuhan.

---

<p align="center">
  Dibuat dengan ❤️ untuk kemudahan bersama &nbsp;·&nbsp; PDF Merger Indonesia &copy; 2025
</p>
