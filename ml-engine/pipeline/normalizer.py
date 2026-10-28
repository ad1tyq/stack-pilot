import json
import os
from typing import List, Set


class TechNormalizer:
    def __init__(self, ontology_path: str = "data/tech_ontology.json"):
        if not os.path.isabs(ontology_path):
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            candidate = os.path.join(base_dir, ontology_path)
            if os.path.exists(candidate):
                ontology_path = candidate

        with open(ontology_path, "r", encoding="utf-8") as f:
            self.ontology = json.load(f)

        self.reverse_map = {}
        for canonical, aliases in self.ontology.items():
            canonical_clean = canonical.lower().strip()
            self.reverse_map[canonical_clean] = canonical_clean
            for alias in aliases:
                self.reverse_map[alias.lower().strip()] = canonical_clean

    def normalize_single(self, token: str) -> str | None:
        token_clean = token.lower().strip()
        return self.reverse_map.get(token_clean, token_clean if token_clean in self.ontology else None)

    def normalize(self, raw_tokens: List[str]) -> List[str]:
        cleaned: Set[str] = set()
        for token in raw_tokens:
            normalized = self.normalize_single(token)
            if normalized:
                cleaned.add(normalized)
        return sorted(list(cleaned))
