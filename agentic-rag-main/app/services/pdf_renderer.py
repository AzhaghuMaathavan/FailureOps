import os
import fitz  # PyMuPDF

def render_pdf_pages(file_path: str, output_dir: str) -> list[str]:
    """Renders all pages of a PDF to images and returns a list of image paths."""
    os.makedirs(output_dir, exist_ok=True)
    doc = fitz.open(file_path)
    image_paths = []
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        # 150 DPI is usually sufficient for nemotron-parse
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        img_path = os.path.join(output_dir, f"page_{page_num}.png")
        pix.save(img_path)
        image_paths.append(img_path)
        
    return image_paths
