"""RAG Parsing Subsystem: Multi-format document parser adapters."""
from app.services.csv_parser import parse_csv_to_blocks
from app.services.docx_parser import parse_docx_to_blocks
from app.services.json_parser import parse_json_to_blocks
from app.services.markdown_parser import parse_markdown_to_blocks
from app.services.pptx_parser import parse_pptx_to_blocks
from app.services.txt_parser import parse_txt_to_blocks
from app.services.xlsx_parser import parse_xlsx_to_blocks

__all__ = [
    "parse_csv_to_blocks",
    "parse_docx_to_blocks",
    "parse_json_to_blocks",
    "parse_markdown_to_blocks",
    "parse_pptx_to_blocks",
    "parse_txt_to_blocks",
    "parse_xlsx_to_blocks",
]
