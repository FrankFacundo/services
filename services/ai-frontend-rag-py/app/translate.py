import json
import os

from constants import LANGUAGE


class Translate:
    def __init__(self):
        self.lang_path = "app/resources/lang"
        self.language = LANGUAGE
        self.lang_file_path = os.path.join(self.lang_path, f"{self.language}.json")
        self.translations = Translate.load_translations(
            lang_file_path=self.lang_file_path
        )

    @staticmethod
    def load_translations(lang_file_path):
        with open(lang_file_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def translate(self, key):
        return self.translations.get(key)
