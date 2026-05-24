import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL", "").strip()
key = os.environ.get("SUPABASE_KEY", "").strip()

print(f"SUPABASE_INIT: url='{url}'")

if not url or not key:
    raise ValueError("Missing Supabase credentials")

supabase: Client = create_client(url, key)
