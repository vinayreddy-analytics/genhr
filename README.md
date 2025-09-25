# GenHR – AI-Powered Hiring Platform

GenHR is a full-stack hiring platform that removes traditional CV screening.  
It uses **AI-led conversational interviews** and **semantic skill matching** to help recruiters find the right candidates faster.

---

## 🚀 Features
- Candidate signup with profile + interview flow
- AI-powered chat interview (Python + LLMs)
- Recruiter job posting & candidate matching
- MongoDB data storage with JWT authentication
- Full-stack: Next.js (frontend) + Express/Node.js (backend) + Python AI microservice

---

## 🛠️ Tech Stack
- **Frontend**: Next.js, Tailwind CSS, Framer Motion  
- **Backend**: Node.js, Express.js, JWT  
- **Database**: MongoDB  
- **AI Service**: Python, SentenceTransformers, OpenAI GPT-4o-mini  

---

## ⚙️ Run Locally

### Backend
```bash
cd backend
npm install
npm run dev

## frontend
cd pages
npm install
npm run dev

## ai-service
cd ai-service
pip install -r requirements.txt
python app.py


