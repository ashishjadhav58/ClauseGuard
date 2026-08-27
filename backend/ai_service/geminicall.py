import google.generativeai as genai
import os, json
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel(os.getenv("MODEL"))


CLASSIFICATION_PROMPT = """You are a legal clause risk analyzer. Given the following text from a terms of service, contract, or agreement, identify individual clauses and classify each one.

For each clause found, return:
- clause_text: the exact clause text (trimmed, not the whole document)
- risk_level: "high", "medium", or "low"
- category: one of "auto-renewal", "data-sharing", "liability-waiver", "arbitration", "termination", "payment", "other"
- explanation: a plain-language, one-sentence explanation of what this means for the user

Only flag clauses that are actually notable (skip boilerplate like headers/definitions unless they contain risk).

Return ONLY a valid JSON array, no markdown formatting, no extra text. Example format:
[{"clause_text": "...", "risk_level": "high", "category": "auto-renewal", "explanation": "..."}]

Text to analyze:
"""

def Classfier_text(text : str) -> list:
    response = model.generate_content(CLASSIFICATION_PROMPT+text)
    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw)