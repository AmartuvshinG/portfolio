"""
Resume previews — page 1 of each PDF in public/resume/, rendered to webp.

    pip install pymupdf        (Pillow is the other dependency)
    python scripts/resume-previews.py

Re-run whenever a resume PDF is replaced: the Signal panels show these as the
card art for the two resume channels, so a stale preview would advertise a
resume that no longer matches the file it links to.

Rendered at 2x so the sheet stays sharp when the open panel shows it large.
"""

from pathlib import Path

import pymupdf
from PIL import Image

RESUMES = Path(__file__).resolve().parent.parent / "public" / "resume"

for pdf in sorted(RESUMES.glob("*.pdf")):
    doc = pymupdf.open(pdf)
    pix = doc[0].get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False)
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    out = pdf.with_name(f"{pdf.stem}-preview.webp")
    img.save(out, "WEBP", quality=82)
    print(f"  ok {out.name}  {img.width}x{img.height}")
