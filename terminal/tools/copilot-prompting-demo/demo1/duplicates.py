def find_duplicates(items: list[str]) -> list[str]:
    seen: set[str] = set()
    repeated: set[str] = set()
    duplicates: list[str] = []

    for item in items:
        if item in seen:
            if item not in repeated:
                duplicates.append(item)
                repeated.add(item)
        else:
            seen.add(item)

    return duplicates
