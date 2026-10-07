from fastapi import FastAPI

app = FastAPI(title="AI-DJ-Studio")

@app.get("/")
def home():
    return {"message":"Fastapi is working"}