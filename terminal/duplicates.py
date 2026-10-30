def find_duplicates(items: list[str]) -> list[str]:
    seen: set[str] = set()
    reported: set[str] = set()
    duplicates: list[str] = []

    for item in items:
        if item in seen and item not in reported:
            duplicates.append(item)
            reported.add(item)
        seen.add(item)

    return duplicates
