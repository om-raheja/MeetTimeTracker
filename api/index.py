from fastapi import FastAPI, UploadFile, File, Form
from google import genai
from google.genai import types
from google.genai.types import GenerateContentConfig
import os
from pydantic import BaseModel
import psycopg2
from typing import Literal

class ResultItem(BaseModel):
    swimmers: list[str]
    place: int
    time: str

class RaceResult(BaseModel):
    race: Literal[
        "200 MR", "200 Free", "200 IM", 
        "50 Free", "100 Fly", "100 Freestyle",
        "500 Free", "200 FR", "100 Back",
        "100 Breast", "400 FR"
    ]
    results: list[ResultItem]

if os.path.exists(".env.local"):
    import dotenv
    dotenv.load_dotenv(".env.local", override=True)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

client = genai.Client(
    api_key=GEMINI_API_KEY,
)

conn = psycopg2.connect(
    os.environ.get("DB_URL")
)

cur = conn.cursor()

### Create FastAPI instance with custom docs and openapi url
app = FastAPI(docs_url="/api/py/docs", openapi_url="/api/py/openapi.json")

@app.get("/api/py/helloFastApi")
def hello_fast_api():
    return {"message": "Hello from FastAPI"}

@app.post("/api/py/scan")
async def scan(
    image: UploadFile = File(...),
    requestId: str = Form("unknown")  
):
    if not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400, 
            detail="File must be an image (JPEG, PNG, etc.)"
        )

    image_bytes = await image.read()

    response = client.models.generate_content(
        model="gemini-2.5-flash", 
        contents=[
            types.Part.from_bytes(
              data=image_bytes,
              mime_type='image/jpeg',
            ),
            """
            I care about the swimmers on the right hand side only. 
            Extract the Event, Swimmer Names, Place, and Time. 

            FORMAT REQUIREMENTS:
            1. Return a JSON array where each object has:
               - "race": event name 
               - "results": an array of objects (likely 3, but sometimes less than), each with:
                 * "swimmers": array of swimmer names. There **will be 4 swimmers** if 200 MR (Medley Relay), 200 FR (Free Relay), or 400 FR. Otherwise, **only one**.
                 * "place": number
                 * "time": string. Be careful when extracting this information!
            2. Group all entries for the same event together under one "race" key
            3. If there are multiple swimmers in an event, they should be separate objects in the results array

            Example format:
            [
              {
                "race": "50 Free",
                "results": [
                  {"swimmers": ["John Doe"], "place": 1, "time": "21.45"},
                  {"swimmers": ["Jane Smith"], "place": 2, "time": "22.10"}
                ]
              }
            ]
            """
        ],
        config=GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=list[RaceResult]
        ),
    )

    cur.execute(
        "INSERT INTO gemini_request (requestId, image, response) VALUES (%s, %s, %s)",
        (requestId, image_bytes, response.text)
    )
    conn.commit()

    return response.parsed
