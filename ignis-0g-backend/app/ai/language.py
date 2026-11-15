import re


def notice_language(question: str) -> str:
    """Choose the locale of server-written notices. The model handles generated prose."""
    if re.search(r"[әғқңөұүһі]|\b(?:сәлем|не\s+туралы|туралы|дегеніміз|айтып\s+бер)\b", question, re.I):
        return "kk"
    return "ru" if not question or re.search(r"[а-яё]", question, re.I) else "en"
