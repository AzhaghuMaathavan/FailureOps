"""Write the Aurora foundation PDFs with known facts (stdlib only)."""
from pathlib import Path

FACTS = {
    "engineering_report.pdf": "Deployment failures increased from 8% to 18%.",
    "customer_feedback.pdf": "Complaints related to onboarding increased significantly.",
    "project_plan.pdf": "Release deadline remains June 30.",
}


def _escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def write_pdf(path: Path, body: str) -> None:
    stream = f"BT /F1 12 Tf 72 720 Td ({_escape(body)}) Tj ET".encode("latin-1", "replace")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{index} 0 obj\n".encode() + obj + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    for offset in offsets[1:]:
        out += f"{offset:010d} 00000 n \n".encode()
    out += (
        f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(bytes(out))


def main() -> None:
    root = Path(__file__).resolve().parent / "data" / "aurora"
    for name, fact in FACTS.items():
        write_pdf(root / name, fact)
        print(f"wrote {root / name}")


if __name__ == "__main__":
    main()
