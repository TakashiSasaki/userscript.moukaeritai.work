
import json
import sys
import os

try:
    from jsonschema import validate
    from jsonschema.exceptions import ValidationError
except ImportError:
    print("Error: jsonschema is not installed. Please install it using:")
    print("pip install jsonschema")
    sys.exit(1)

def validate_json(schema_path, data_path):
    """
This script validates a JSON data file against a specified JSON schema file.

Usage:
    python validate_schema.py <path_to_schema.json> <path_to_data.json>

Arguments:
    <path_to_schema.json>   : The file path to the JSON schema.
    <path_to_data.json>     : The file path to the JSON data to be validated.

Prerequisites:
    - Python 3
    - The 'jsonschema' library: Install using 'pip install jsonschema'

Example:
    python validate_schema.py youtube.com/data-format/data-format-v2.schema.json youtube.com/data-format/example.json
"""

try:
    from jsonschema import validate
    from jsonschema.exceptions import ValidationError
except ImportError:
    print("Error: jsonschema is not installed. Please install it using:")
    print("pip install jsonschema")
    sys.exit(1)

def validate_json(schema_path, data_path):
    """
    Validates a JSON data file against a JSON schema file.
    """
    if not os.path.exists(schema_path):
        print(f"Error: Schema file not found at '{schema_path}'")
        sys.exit(1)
        
    if not os.path.exists(data_path):
        print(f"Error: Data file not found at '{data_path}'")
        sys.exit(1)

    try:
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema = json.load(f)
        
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        validate(instance=data, schema=schema)
        print(f"Validation successful: '{data_path}' conforms to '{schema_path}'")
        return True

    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from '{e.doc}': {e.msg}")
    except ValidationError as e:
        print(f"Validation Error in '{data_path}':")
        print(f"  - Message: {e.message}")
        print(f"  - Path: instance/{'/'.join(map(str, e.path))}")
        print(f"  - Validator: {e.validator} = {e.validator_value}")
        print(f"  - Schema Path: {e.schema_path}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        
    return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__) # Print the docstring as usage
        sys.exit(1)
        
    schema_file = sys.argv[1]
    data_file = sys.argv[2]
    
    if not validate_json(schema_file, data_file):
        sys.exit(1)
