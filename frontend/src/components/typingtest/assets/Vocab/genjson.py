import json

input_file = 'words.txt'
output_file = 'words.json'

with open(input_file, 'r', encoding='utf-8') as f:
    lines = [line.strip() for line in f if line.strip()]

json_dict = {str(i): {"key": word, "val": word} for i, word in enumerate(lines)}

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(json_dict, f, ensure_ascii=False, indent=2)

print(f"Файл {output_file} успешно создан с {len(lines)} элементами.")
