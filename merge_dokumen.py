"""
=====================================================
  MERGE PDF & GAMBAR (JPG, PNG, dll)
  Susunan dokumen bisa diatur sesuai kebutuhan
=====================================================
Cara pakai:
  1. Jalankan: python merge_dokumen.py
  2. Ikuti menu interaktif untuk mengatur urutan file
  3. Tekan Enter untuk merge

Atau gunakan mode konfigurasi di bagian bawah file ini.
"""

import os
import sys
from pathlib import Path

try:
    from pypdf import PdfWriter, PdfReader
except ImportError:
    try:
        from PyPDF2 import PdfWriter, PdfReader
    except ImportError:
        print("ERROR: Install pypdf dulu: pip install pypdf")
        sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("ERROR: Install Pillow dulu: pip install Pillow")
    sys.exit(1)


# ============================================================
#  KONFIGURASI MANUAL (opsional)
#  Isi list di bawah ini untuk langsung merge tanpa menu.
#  Kosongkan list (FILES_URUTAN = []) untuk pakai menu interaktif.
# ============================================================
FILES_URUTAN = [
    # Contoh — hapus atau edit sesuai kebutuhan:
    # r"Surat Permohonan Bantuan Biaya Kuliah - Asep Trisna Setiawan.pdf",
    # r"Kartu Studi Mahasiswa (KSM) Semester II Tahun Akademik 20252026.pdf",
    # r"Surat Keterangan Mahasiswa Aktif.pdf",
    # r"Laporan Kemajuan Studi (Transkrip Nilai).pdf",
    # r"Surat Keterangan Biaya Penyelenggaraan Pendidikan (BPP).pdf",
    # r"RAB- RENCANA ANGGARAN BIAYA-ASEP TRISNA SETIAWAN.pdf",
    # r"a473d862-0f39-4793-960a-3b0b15f7e173.pdf",
    # r"ktm-33224308.jpg",
]

OUTPUT_FILE = "HASIL_MERGE.pdf"
# ============================================================


SUPPORTED_IMAGE = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".webp"}
SUPPORTED_PDF   = {".pdf"}
SUPPORTED_ALL   = SUPPORTED_PDF | SUPPORTED_IMAGE


def scan_folder(folder: str) -> list[str]:
    """Scan folder dan kembalikan file PDF/gambar yang ditemukan."""
    items = []
    for f in sorted(Path(folder).iterdir()):
        if f.is_file() and f.suffix.lower() in SUPPORTED_ALL:
            items.append(f.name)
    return items


def image_to_pdf_page(image_path: str, writer: PdfWriter) -> None:
    """Konversi gambar → halaman PDF dan tambahkan ke writer."""
    img = Image.open(image_path).convert("RGB")
    
    # Ukuran A4 dalam poin (1 inci = 72 poin)
    a4_w, a4_h = 595, 842
    
    # Hitung rasio agar gambar pas di A4 dengan margin 20pt
    max_w, max_h = a4_w - 40, a4_h - 40
    img_w, img_h = img.size
    ratio = min(max_w / img_w, max_h / img_h)
    new_w, new_h = int(img_w * ratio), int(img_h * ratio)
    img = img.resize((new_w, new_h), Image.LANCZOS)
    
    # Simpan ke buffer sementara
    import io
    buf = io.BytesIO()
    img.save(buf, format="PDF", resolution=150)
    buf.seek(0)
    
    reader = PdfReader(buf)
    for page in reader.pages:
        writer.add_page(page)


def merge_files(file_list: list[str], output: str, base_dir: str = ".") -> None:
    """Merge semua file dalam urutan yang diberikan ke satu PDF."""
    writer = PdfWriter()
    total_pages = 0

    print(f"\n{'='*55}")
    print(f"  Memulai proses merge → {output}")
    print(f"{'='*55}")

    for i, nama_file in enumerate(file_list, 1):
        path = os.path.join(base_dir, nama_file)
        if not os.path.isfile(path):
            print(f"  [{i}] ⚠  File tidak ditemukan: {nama_file}  (dilewati)")
            continue

        ext = Path(path).suffix.lower()
        try:
            if ext in SUPPORTED_PDF:
                reader = PdfReader(path)
                n = len(reader.pages)
                for page in reader.pages:
                    writer.add_page(page)
                print(f"  [{i}] ✔  PDF  | {n:>3} hal | {nama_file}")
                total_pages += n
            elif ext in SUPPORTED_IMAGE:
                before = len(writer.pages)
                image_to_pdf_page(path, writer)
                n = len(writer.pages) - before
                print(f"  [{i}] ✔  IMG  | {n:>3} hal | {nama_file}")
                total_pages += n
            else:
                print(f"  [{i}] ⚠  Format tidak didukung: {nama_file}  (dilewati)")
        except Exception as e:
            print(f"  [{i}] ✘  ERROR pada {nama_file}: {e}")

    if len(writer.pages) == 0:
        print("\n  Tidak ada halaman yang berhasil diproses. Merge dibatalkan.")
        return

    output_path = os.path.join(base_dir, output)
    with open(output_path, "wb") as f:
        writer.write(f)

    print(f"\n{'='*55}")
    print(f"  ✅ Selesai! Total: {total_pages} halaman")
    print(f"  📄 Disimpan ke: {output_path}")
    print(f"{'='*55}\n")


# ──────────────────────────────────────────────────
#  MENU INTERAKTIF
# ──────────────────────────────────────────────────

def tampilkan_daftar(urutan: list[str]) -> None:
    print("\n  Urutan dokumen saat ini:")
    if not urutan:
        print("    (kosong)")
    for i, f in enumerate(urutan, 1):
        print(f"    {i:>2}. {f}")


def menu_interaktif(base_dir: str) -> tuple[list[str], str]:
    semua_file = scan_folder(base_dir)
    urutan: list[str] = []
    output = OUTPUT_FILE

    print("\n" + "="*55)
    print("   MERGE PDF & GAMBAR — Menu Interaktif")
    print("="*55)

    while True:
        tampilkan_daftar(urutan)
        print(f"\n  Output: {output}")
        print("""
  Pilihan:
    [a] Tambah semua file dari folder (otomatis)
    [t] Tambah file satu per satu
    [u] Ubah urutan (pindah posisi)
    [h] Hapus file dari urutan
    [o] Ganti nama output
    [m] MULAI MERGE
    [q] Keluar
""")
        pilihan = input("  > Pilih: ").strip().lower()

        if pilihan == "q":
            print("  Keluar.")
            sys.exit(0)

        elif pilihan == "a":
            if not semua_file:
                print("  Tidak ada file PDF/gambar di folder ini.")
            else:
                print("\n  File yang tersedia:")
                for i, f in enumerate(semua_file, 1):
                    print(f"    {i:>2}. {f}")
                urutan = list(semua_file)
                print("  Semua file ditambahkan ke urutan.")

        elif pilihan == "t":
            if not semua_file:
                print("  Tidak ada file PDF/gambar di folder ini.")
                continue
            print("\n  File yang tersedia:")
            for i, f in enumerate(semua_file, 1):
                print(f"    {i:>2}. {f}")
            inp = input("  Masukkan nomor file (pisah koma, misal: 1,3,2): ").strip()
            try:
                nomor = [int(x.strip()) for x in inp.split(",")]
                for n in nomor:
                    f = semua_file[n - 1]
                    if f not in urutan:
                        urutan.append(f)
                        print(f"  Ditambahkan: {f}")
                    else:
                        print(f"  Sudah ada: {f}")
            except (ValueError, IndexError):
                print("  Input tidak valid.")

        elif pilihan == "u":
            if len(urutan) < 2:
                print("  Minimal 2 file untuk mengubah urutan.")
                continue
            tampilkan_daftar(urutan)
            try:
                dari = int(input("  Pindah dari posisi: ").strip()) - 1
                ke   = int(input("  Ke posisi: ").strip()) - 1
                if 0 <= dari < len(urutan) and 0 <= ke < len(urutan):
                    item = urutan.pop(dari)
                    urutan.insert(ke, item)
                    print(f"  '{item}' dipindah ke posisi {ke+1}.")
                else:
                    print("  Posisi di luar jangkauan.")
            except ValueError:
                print("  Input tidak valid.")

        elif pilihan == "h":
            if not urutan:
                print("  Urutan masih kosong.")
                continue
            tampilkan_daftar(urutan)
            try:
                n = int(input("  Hapus posisi nomor: ").strip()) - 1
                if 0 <= n < len(urutan):
                    print(f"  Dihapus: {urutan.pop(n)}")
                else:
                    print("  Posisi di luar jangkauan.")
            except ValueError:
                print("  Input tidak valid.")

        elif pilihan == "o":
            baru = input(f"  Nama output (sekarang: {output}): ").strip()
            if baru:
                if not baru.lower().endswith(".pdf"):
                    baru += ".pdf"
                output = baru
                print(f"  Output diubah ke: {output}")

        elif pilihan == "m":
            if not urutan:
                print("  Urutan masih kosong! Tambahkan file terlebih dahulu.")
            else:
                return urutan, output

        else:
            print("  Pilihan tidak dikenal.")


# ──────────────────────────────────────────────────
#  ENTRY POINT
# ──────────────────────────────────────────────────

if __name__ == "__main__":
    # Direktori kerja = lokasi script ini
    base_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(base_dir)

    if FILES_URUTAN:
        # Mode konfigurasi manual
        merge_files(FILES_URUTAN, OUTPUT_FILE, base_dir)
    else:
        # Mode menu interaktif
        urutan, output = menu_interaktif(base_dir)
        merge_files(urutan, output, base_dir)
