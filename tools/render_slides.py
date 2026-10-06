"""Render each local source PDF page to a sharp, web-ready WebP asset.

Only the rendered page images are written under docs/. Source PDFs stay outside
the published tree.
"""

from pathlib import Path
from tempfile import TemporaryDirectory
import subprocess
from PIL import Image
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'materials'
DEST = ROOT / 'docs' / 'assets' / 'slides'
POPPLER = Path(r'C:\Users\hsmai\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin\pdftoppm.exe')
if not POPPLER.exists():
    raise SystemExit('Poppler pdftoppm not found; set POPPLER in tools/render_slides.py')

FILES = [
    ('01', 'Session 1A class.pdf'),
    ('02', 'Session 1B class.pdf'),
    ('03', 'Session 2 class.pdf'),
    ('04', 'Session 4A class.pdf'),
]
for lecture, name in FILES:
    pdf = SOURCE / name
    count = len(PdfReader(str(pdf)).pages)
    target_dir = DEST / lecture
    target_dir.mkdir(parents=True, exist_ok=True)
    if len(list(target_dir.glob('*.webp'))) == count:
        print(f'{lecture}: {count} slide images already present')
        continue
    with TemporaryDirectory(prefix=f'lecture-{lecture}-') as tmp:
        prefix = Path(tmp) / 'slide'
        subprocess.run(
            [str(POPPLER), '-scale-to-x', '1600', '-scale-to-y', '-1', '-png',
             str(pdf), str(prefix)],
            check=True,
        )
        pages = sorted(Path(tmp).glob('slide-*.png'), key=lambda p: int(p.stem.rsplit('-', 1)[1]))
        if len(pages) != count:
            raise RuntimeError(f'{pdf.name}: expected {count} PNGs, got {len(pages)}')
        for page_number, png in enumerate(pages, start=1):
            with Image.open(png) as im:
                im.convert('RGB').save(
                    target_dir / f'{page_number:02d}.webp',
                    'WEBP', quality=88, method=5,
                )
    print(f'{lecture}: rendered {count} images')

