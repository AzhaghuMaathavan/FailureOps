def normalize_parser_blocks(raw_blocks: list) -> list[dict]:
    """
    Converts raw nemotron-parse blocks into a normalized internal schema.
    
    Nemotron-parse returns:
    [
      [
        {
          "bbox": {"xmin": ..., "ymin": ..., "xmax": ..., "ymax": ...},
          "text": "...",
          "type": "Text" | "Table" | "List" | "Title" | etc
        }
      ]
    ]
    Sometimes it's a flat list, sometimes nested. We flatten and normalize.
    """
    normalized = []
    
    # Flatten if nested
    flat_blocks = []
    for item in raw_blocks:
        if isinstance(item, list):
            flat_blocks.extend(item)
        else:
            flat_blocks.append(item)
            
    for idx, block in enumerate(flat_blocks):
        # We don't try to parse tables into Row/Cell yet if the model just returns 'Table' with raw text.
        # We store what we have and preserve the bbox.
        normalized.append({
            "block_index": idx,
            "block_type": block.get("type", "Unknown"),
            "content": block.get("text", ""),
            "bbox": block.get("bbox", {}),
            "raw_metadata": block
        })
        
    return normalized
