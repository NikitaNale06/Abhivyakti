from typing import Dict


STATIC_TRANSLATIONS: Dict[str, Dict[str, str]] = {
    "A": {"en": "A", "hi": "अ", "ta": "அ", "te": "అ", "bn": "অ"},
    "B": {"en": "B", "hi": "ब", "ta": "ப", "te": "బ", "bn": "ব"},
    "C": {"en": "C", "hi": "क", "ta": "க", "te": "క", "bn": "ক"},
    "D": {"en": "D", "hi": "ड", "ta": "ட", "te": "డ", "bn": "ড"},
    "E": {"en": "E", "hi": "ए", "ta": "எ", "te": "ఎ", "bn": "এ"},
    "F": {"en": "F", "hi": "फ", "ta": "ஃ", "te": "ఫ", "bn": "ফ"},
    "G": {"en": "G", "hi": "ग", "ta": "க", "te": "గ", "bn": "গ"},
    "H": {"en": "H", "hi": "ह", "ta": "ஹ", "te": "హ", "bn": "হ"},
    "1": {"en": "1", "hi": "१", "ta": "௧", "te": "౧", "bn": "১"},
    "2": {"en": "2", "hi": "२", "ta": "௨", "te": "౨", "bn": "২"},
    "3": {"en": "3", "hi": "३", "ta": "௩", "te": "౩", "bn": "৩"},
    "0": {"en": "0", "hi": "०", "ta": "0", "te": "౦", "bn": "০"},
}


def translate_label(label: str, lang: str) -> str:
    entry = STATIC_TRANSLATIONS.get(label.upper())
    if not entry:
        return label
    return entry.get(lang, entry.get("en", label))


SUPPORTED_LANGUAGES = [
    {"code": "en", "name": "English", "native": "English"},
    {"code": "hi", "name": "Hindi", "native": "हिन्दी"},
    {"code": "ta", "name": "Tamil", "native": "தமிழ்"},
    {"code": "te", "name": "Telugu", "native": "తెలుగు"},
    {"code": "bn", "name": "Bengali", "native": "বাংলা"},
]