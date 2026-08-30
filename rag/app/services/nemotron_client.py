import httpx
import base64
import json
import re
from app.core.config import settings

def fix_json_array(json_str: str) -> list:
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        pass
        
    # Attempt to fix truncated JSON array of objects
    # It usually looks like: [[{"bbox":..., "text":...}, {"bbox":..., "tex
    
    # Let's extract all complete objects using regex
    # Each object is inside {}
    objects = []
    
    # We can match everything that looks like a valid dict: {"bbox": {...}, "text": "...", "type": "..."}
    # But since text can contain arbitrary characters, a simple regex is hard.
    
    # Better approach: find the last occurrence of '}' that is at the same depth.
    # But actually, Nemotron returns an array of arrays of objects: [[ {..}, {..} ]]
    # Let's just strip trailing characters until we hit a '}' and then append ']]'
    
    # We will incrementally remove from the right until it parses
    temp_str = json_str
    while len(temp_str) > 10:
        last_brace = temp_str.rfind('}')
        if last_brace == -1:
            break
        temp_str = temp_str[:last_brace+1]
        
        # Try appending closing brackets
        for suffix in [']', ']]', ']]]']:
            try:
                return json.loads(temp_str + suffix)
            except:
                pass
                
        # If it still fails, the last '}' might belong to "bbox": {} and the "text" part was truncated.
        # So we cut off the last '}' and try again.
        temp_str = temp_str[:-1]
        
    return []

def parse_page_image(image_path: str) -> dict:
    """Sends a page image to Nemotron Parse and returns the structured JSON output."""
    api_key = settings.get_api_key('PARSE')
    if not api_key:
        return {"raw_response": {}, "blocks": []}

    try:
        with open(image_path, "rb") as f:
            b64_img = base64.b64encode(f.read()).decode("utf-8")
            
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "nvidia/nemotron-parse",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_img}"}}
                    ]
                }
            ],
            "max_tokens": 8192
        }
        
        resp = httpx.post(
            f"{settings.NVIDIA_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
            timeout=120.0
        )
        resp.raise_for_status()
        data = resp.json()
        
        # Extract the markdown_bbox arguments
        tool_calls = data["choices"][0]["message"].get("tool_calls", [])
        for tc in tool_calls:
            if tc["function"]["name"] == "markdown_bbox":
                args_str = tc["function"]["arguments"]
                parsed_args = fix_json_array(args_str)
                return {"raw_response": data, "blocks": parsed_args}
    except Exception as e:
        pass
        
    return {"raw_response": {}, "blocks": []}

