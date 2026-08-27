from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import json
from ai_service.geminicall import Classfier_text

app = FastAPI()

class user(BaseModel):
    username : str
    password : str
    fullname : str

db : list[user] = []

class AnalyzeRequest(BaseModel):
    text: str

class Clause(BaseModel):
    clause_text: str
    risk_level: str
    category: str
    explanation: str

class AnalyzeResponse(BaseModel):
    clauses: List[Clause]

@app.get("/")
def root():
    return{"message":"Backend is running"}

@app.post("/signup")
def signup(item : user):
    db.append(item)
    return{"messgae":"Added successfully"}

@app.get("/get/{username}")
def get(username : str):
    for i in db:
        if i.username == username:
            return{"data":i}
    return{"message":"not found"}

@app.put("/update/{username}")
def update(username:str,fullname:str,password:str):
    for i in db:
            if i.username == username:
                i.fullname = fullname
                i.password = password
                return(i)
    return{"message":"not found"}

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest):
    try:
        clauses_raw = Classfier_text(request.text)
        return {"clauses": clauses_raw}
    except json.JSONDecodeError:
        return {"clauses": []}
