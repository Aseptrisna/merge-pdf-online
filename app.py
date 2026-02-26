"""
PDF & Image Merger - Web App
Flask Backend
"""

import os
import io
import uuid
import time
import shutil
from pathlib import Path
from datetime import datetime
from flask import (
    Flask, render_template, request, jsonify,
    send_file, abort, after_this_request, Response, url_for
)

try:
    from pypdf import PdfWriter, PdfReader
except ImportError:
    from PyPDF2 import PdfWriter, PdfReader

from PIL import Image

# ── Config ──────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent
UPLOAD_DIR  = BASE_DIR / "uploads"
RESULT_DIR  = BASE_DIR / "results"
MAX_MB      = 50          # maks ukuran file per upload (MB)
SESSION_TTL = 3600        # hapus file lama setelah 1 jam (detik)

UPLOAD_DIR.mkdir(exist_ok=True)
RESULT_DIR.mkdir(exist_ok=True)

SUPPORTED_IMAGE = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".webp"}
SUPPORTED_PDF   = {".pdf"}
SUPPORTED_ALL   = SUPPORTED_PDF | SUPPORTED_IMAGE

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_MB * 1024 * 1024


# ── Helpers ─────────────────────────────────────────────

def cleanup_old_files():
    """Hapus file upload/result yang sudah lebih dari SESSION_TTL detik."""
    now = time.time()
    for folder in [UPLOAD_DIR, RESULT_DIR]:
        for f in folder.iterdir():
            if f.is_file() and (now - f.stat().st_mtime) > SESSION_TTL:
                f.unlink(missing_ok=True)
            elif f.is_dir() and (now - f.stat().st_mtime) > SESSION_TTL:
                shutil.rmtree(f, ignore_errors=True)


def image_to_pdf_pages(image_path: Path, writer: PdfWriter):
    """Konversi gambar menjadi halaman PDF dan tambahkan ke writer."""
    img = Image.open(image_path).convert("RGB")
    a4_w, a4_h = 595, 842
    max_w, max_h = a4_w - 40, a4_h - 40
    img_w, img_h = img.size
    ratio = min(max_w / img_w, max_h / img_h)
    img = img.resize((int(img_w * ratio), int(img_h * ratio)), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="PDF", resolution=150)
    buf.seek(0)
    reader = PdfReader(buf)
    for page in reader.pages:
        writer.add_page(page)


# ── Routes ──────────────────────────────────────────────

@app.route("/google28fd1950508192a3.html")
def google_verify():
    return render_template("google28fd1950508192a3.html")


@app.route("/")
def index():
    cleanup_old_files()
    return render_template("index.html")


@app.route("/sitemap.xml")
def sitemap():
    """Sitemap untuk Google Search Console."""
    base = request.url_root.rstrip("/")
    today = datetime.utcnow().strftime("%Y-%m-%d")
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>{base}/</loc>
    <lastmod>{today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="id" href="{base}/"/>
  </url>
</urlset>"""
    return Response(xml, mimetype="application/xml")


@app.route("/robots.txt")
def robots():
    """robots.txt untuk crawler."""
    base = request.url_root.rstrip("/")
    txt = f"""User-agent: *
Allow: /
Disallow: /uploads/
Disallow: /results/

Sitemap: {base}/sitemap.xml
"""
    return Response(txt, mimetype="text/plain")


@app.route("/upload", methods=["POST"])
def upload():
    """Upload satu atau lebih file. Return daftar file_id & nama."""
    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "Tidak ada file yang dikirim."}), 400

    session_id = request.form.get("session_id") or str(uuid.uuid4())
    session_dir = UPLOAD_DIR / session_id
    session_dir.mkdir(exist_ok=True)

    uploaded = []
    for f in files:
        ext = Path(f.filename).suffix.lower()
        if ext not in SUPPORTED_ALL:
            continue
        file_id  = str(uuid.uuid4())
        dest     = session_dir / f"{file_id}{ext}"
        f.save(dest)
        uploaded.append({
            "file_id":   file_id,
            "filename":  f.filename,
            "ext":       ext,
            "is_image":  ext in SUPPORTED_IMAGE,
        })

    if not uploaded:
        return jsonify({"error": "Format file tidak didukung."}), 400

    return jsonify({"session_id": session_id, "files": uploaded})


@app.route("/merge", methods=["POST"])
def merge():
    """Merge file sesuai urutan yang dikirim. Return URL download."""
    data = request.get_json()
    session_id  = data.get("session_id")
    order       = data.get("order", [])   # list of {file_id, filename}
    output_name = data.get("output_name", "HASIL_MERGE").strip() or "HASIL_MERGE"

    if not session_id or not order:
        return jsonify({"error": "Data tidak lengkap."}), 400

    session_dir = UPLOAD_DIR / session_id
    if not session_dir.exists():
        return jsonify({"error": "Sesi tidak ditemukan. Silakan upload ulang."}), 404

    writer      = PdfWriter()
    total_pages = 0
    log         = []

    for item in order:
        file_id = item.get("file_id")
        fname   = item.get("filename", "")
        ext     = Path(fname).suffix.lower()

        # Cari file di folder sesi
        candidates = list(session_dir.glob(f"{file_id}*"))
        if not candidates:
            log.append({"name": fname, "status": "error", "msg": "File tidak ditemukan"})
            continue

        path = candidates[0]
        ext  = path.suffix.lower()

        try:
            if ext in SUPPORTED_PDF:
                reader = PdfReader(str(path))
                n = len(reader.pages)
                for page in reader.pages:
                    writer.add_page(page)
                log.append({"name": fname, "status": "ok", "pages": n})
                total_pages += n
            elif ext in SUPPORTED_IMAGE:
                before = len(writer.pages)
                image_to_pdf_pages(path, writer)
                n = len(writer.pages) - before
                log.append({"name": fname, "status": "ok", "pages": n})
                total_pages += n
        except Exception as e:
            log.append({"name": fname, "status": "error", "msg": str(e)})

    if len(writer.pages) == 0:
        return jsonify({"error": "Tidak ada halaman yang berhasil diproses.", "log": log}), 400

    # Simpan hasil
    if not output_name.lower().endswith(".pdf"):
        output_name += ".pdf"
    result_id   = str(uuid.uuid4())
    result_path = RESULT_DIR / f"{result_id}.pdf"

    with open(result_path, "wb") as f:
        writer.write(f)

    return jsonify({
        "result_id":   result_id,
        "output_name": output_name,
        "total_pages": total_pages,
        "log":         log,
    })


@app.route("/download/<result_id>")
def download(result_id):
    """Download file hasil merge."""
    # Validasi: hanya alphanum + dash
    if not all(c in "0123456789abcdef-" for c in result_id):
        abort(400)

    result_path = RESULT_DIR / f"{result_id}.pdf"
    if not result_path.exists():
        abort(404)

    output_name = request.args.get("name", "HASIL_MERGE.pdf")
    if not output_name.lower().endswith(".pdf"):
        output_name += ".pdf"

    return send_file(
        result_path,
        as_attachment=True,
        download_name=output_name,
        mimetype="application/pdf",
    )


# ── Error Handlers ───────────────────────────────

@app.errorhandler(404)
def not_found(e):
    if request.accept_mimetypes.accept_json and not request.accept_mimetypes.accept_html:
        return jsonify({"error": "Halaman tidak ditemukan."}), 404
    return render_template("error.html", code=404,
                           title="Halaman Tidak Ditemukan",
                           message="Maaf, halaman yang kamu cari tidak ada atau sudah dihapus."), 404


@app.errorhandler(500)
def server_error(e):
    if request.accept_mimetypes.accept_json and not request.accept_mimetypes.accept_html:
        return jsonify({"error": "Terjadi kesalahan server."}), 500
    return render_template("error.html", code=500,
                           title="Kesalahan Server",
                           message="Terjadi kesalahan di server. Silakan coba beberapa saat lagi."), 500


@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": f"File terlalu besar. Maksimum {MAX_MB} MB per file."}), 413


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", 8080)))
    args = parser.parse_args()
    print(f"  ➜  http://localhost:{args.port}")
    app.run(debug=False, host="0.0.0.0", port=args.port)
