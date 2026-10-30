import argparse
import json


def find_duplicates(settings_path: str) -> list[dict]:
    """Return repeated entries sharing the same keys and command."""
    with open(settings_path, encoding="utf-8-sig") as settings_file:
        settings = json.load(settings_file)

    if not isinstance(settings, dict):
        raise ValueError("Settings must be a JSON object.")

    seen = set()
    duplicates = []
    for section in ("actions", "keybindings"):
        entries = settings.get(section, [])
        if not isinstance(entries, list):
            raise ValueError(f'"{section}" must be an array.')
        for entry in entries:
            if not isinstance(entry, dict):
                raise ValueError(f'Each entry in "{section}" must be an object.')
            if "keys" not in entry or "command" not in entry:
                continue
            signature = json.dumps(
                [entry["keys"], entry["command"]], sort_keys=True
            )
            if signature in seen:
                duplicates.append(entry)
            else:
                seen.add(signature)
    return duplicates


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Find keybindings sharing both keys and command."
    )
    parser.add_argument("--path", required=True, help="Path to a settings JSON file.")
    args = parser.parse_args()
    try:
        duplicates = find_duplicates(args.path)
    except (OSError, ValueError) as error:
        parser.exit(1, f"Error: {error}\n")

    if duplicates:
        print("Duplicate keybindings:")
        print(json.dumps(duplicates, indent=2))
    else:
        print("No duplicate keybindings found.")


if __name__ == "__main__":
    main()
